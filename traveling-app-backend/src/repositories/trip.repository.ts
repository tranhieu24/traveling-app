import { pool } from '../config/database';
import { transaction } from '../services/transaction';
import { AppError } from '../types';
import { bookingRepository,audit } from './booking.repository';

export const tripRepository={
  async detail(id:string,userId:string,admin:boolean) {
    const b=await bookingRepository.getBookingDetail(id,userId,admin);
    if(!b || (!admin&&b.guest_id!==userId))throw new AppError('Không tìm thấy chuyến đi.',404,'BOOKING_NOT_FOUND');
    const guide=admin||['confirmed','completed'].includes(b.booking_status)
      ?(await pool.query('SELECT instructions,contact,revision,updated_at FROM booking_arrival_guides WHERE booking_id=$1',[id])).rows[0]||null:null;
    const events:{kind:string;at:string;status?:string;amount?:string|number}[]=[{kind:'booking_created',at:b.created_at}];
    for(const p of b.payments||[])if(p.payment_status==='succeeded'&&p.paid_at)events.push({kind:'payment_received',at:p.paid_at,amount:p.amount});
    if(b.cancelled_at)events.push({kind:'booking_cancelled',at:b.cancelled_at});
    if(b.completed_at)events.push({kind:'stay_completed',at:b.completed_at});
    for(const r of b.refunds||[]){if(r.created_at)events.push({kind:'refund_requested',at:r.created_at,amount:r.amount,status:r.status});if(r.succeeded_at)events.push({kind:'refund_received',at:r.succeeded_at,amount:r.amount,status:'succeeded'});}
    events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
    return {bookingId:id,status:b.booking_status,timezone:'UTC',events,arrivalGuide:guide,
      guideStatus:guide?'published':['confirmed','completed'].includes(b.booking_status)?'not_published':'unavailable',
      policy:b.policy_snapshot||null,balanceDue:b.balance_due,
      balanceDeadlineDescription:'Phải thanh toán đủ trước khi hoàn tất chuyến đi. Chưa có hạn thu số dư riêng được cấu hình.'};
  },
  async saveGuide(id:string,actor:string,data:{instructions:string;contact:string;revision:number}) {
    return transaction(async c=>{
      const b=(await c.query('SELECT booking_status FROM bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!b)throw new AppError('Không tìm thấy đơn.',404,'BOOKING_NOT_FOUND');
      if(b.booking_status!=='confirmed')throw new AppError('Chỉ cung cấp hướng dẫn cho đơn đã xác nhận.',409,'GUIDE_UNAVAILABLE');
      const before=(await c.query('SELECT * FROM booking_arrival_guides WHERE booking_id=$1',[id])).rows[0];
      if((before?.revision||0)!==data.revision)throw new AppError('Hướng dẫn đã được thay đổi. Tải lại trước khi lưu.',409,'GUIDE_CHANGED');
      const after=(await c.query(`INSERT INTO booking_arrival_guides(booking_id,instructions,contact,updated_by) VALUES($1,$2,$3,$4)
       ON CONFLICT(booking_id) DO UPDATE SET instructions=$2,contact=$3,updated_by=$4,revision=booking_arrival_guides.revision+1,updated_at=now() RETURNING *`,[id,data.instructions,data.contact,actor])).rows[0];
      await audit(c,actor,'booking.arrival_guide','booking',id,before||null,after);return after;
    });
  }
};
