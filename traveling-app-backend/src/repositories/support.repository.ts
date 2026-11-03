import { pool } from '../config/database';
import { transaction } from '../services/transaction';
import { AppError } from '../types';
import { audit } from './booking.repository';

const selectTicket=`SELECT t.*,b.booking_code,l.title listing_title FROM support_tickets t
 JOIN bookings b ON b.id=t.booking_id JOIN listings l ON l.id=b.listing_id`;
const missing=()=>new AppError('Không tìm thấy yêu cầu hỗ trợ.',404,'SUPPORT_NOT_FOUND');
export const supportRepository={
  async list(userId:string,admin:boolean,q:{page:number;limit:number;bookingId?:string;status?:string}) {
    const args=[userId,admin,q.bookingId||null,q.status||null];
    const where=' WHERE (t.guest_id=$1 OR $2) AND ($3::uuid IS NULL OR t.booking_id=$3) AND ($4::text IS NULL OR t.status=$4)';
    const total=(await pool.query('SELECT count(*)::int n FROM support_tickets t'+where,args)).rows[0].n;
    const items=(await pool.query(selectTicket+where+' ORDER BY t.updated_at DESC,t.id LIMIT $5 OFFSET $6',[...args,q.limit,(q.page-1)*q.limit])).rows;
    return {items,pagination:{page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)}};
  },
  async detail(id:string,userId:string,admin:boolean,page:number,limit:number) {
    const ticket=(await pool.query(selectTicket+' WHERE t.id=$1 AND (t.guest_id=$2 OR $3)',[id,userId,admin])).rows[0];
    if(!ticket)throw missing();
    const total=(await pool.query('SELECT count(*)::int n FROM support_messages WHERE ticket_id=$1',[id])).rows[0].n;
    const messages=(await pool.query('SELECT id,ticket_id,author_role,body,created_at FROM support_messages WHERE ticket_id=$1 ORDER BY created_at,id LIMIT $2 OFFSET $3',[id,limit,(page-1)*limit])).rows;
    return {ticket,messages,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}};
  },
  async create(userId:string,data:{bookingId:string;subject:string;body:string;requestId:string}) {
    return transaction(async c=>{
      // Serialize request identity across bookings as well as repeated taps.
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[userId+':support:'+data.requestId]);
      const booking=(await c.query('SELECT id FROM bookings WHERE id=$1 AND guest_id=$2 FOR SHARE',[data.bookingId,userId])).rows[0];
      if(!booking)throw new AppError('Không tìm thấy đơn đặt phòng của bạn.',404,'BOOKING_NOT_FOUND');
      const previous=(await c.query('SELECT * FROM support_tickets WHERE guest_id=$1 AND client_request_id=$2',[userId,data.requestId])).rows[0];
      if(previous){
        const first=(await c.query('SELECT body FROM support_messages WHERE ticket_id=$1 AND author_id=$2 AND client_request_id=$3',[previous.id,userId,data.requestId])).rows[0];
        if(previous.booking_id!==data.bookingId||previous.subject!==data.subject||first?.body!==data.body)throw new AppError('Mã gửi đã được dùng cho nội dung khác.',409,'SUPPORT_REQUEST_CONFLICT');
        return previous;
      }
      const ticket=(await c.query('INSERT INTO support_tickets(booking_id,guest_id,subject,client_request_id) VALUES($1,$2,$3,$4) RETURNING *',[data.bookingId,userId,data.subject,data.requestId])).rows[0];
      await c.query("INSERT INTO support_messages(ticket_id,author_id,author_role,body,client_request_id) VALUES($1,$2,'guest',$3,$4)",[ticket.id,userId,data.body,data.requestId]);
      return ticket;
    });
  },
  async reply(id:string,userId:string,admin:boolean,data:{body:string;requestId:string}) {
    return transaction(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[userId+':support:'+data.requestId]);
      const ticket=(await c.query('SELECT * FROM support_tickets WHERE id=$1 AND (guest_id=$2 OR $3) FOR UPDATE',[id,userId,admin])).rows[0];
      if(!ticket)throw missing();
      const previous=(await c.query('SELECT * FROM support_messages WHERE author_id=$1 AND client_request_id=$2',[userId,data.requestId])).rows[0];
      if(previous){if(previous.ticket_id!==id||previous.body!==data.body)throw new AppError('Mã gửi đã được dùng cho nội dung khác.',409,'SUPPORT_REQUEST_CONFLICT');return previous;}
      const role=admin?'admin':'guest';
      const message=(await c.query('INSERT INTO support_messages(ticket_id,author_id,author_role,body,client_request_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,userId,role,data.body,data.requestId])).rows[0];
      await c.query('UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1',[id,admin?'waiting_guest':'open']);
      if(admin)await audit(c,userId,'support.reply','support_ticket',id,null,{messageId:message.id});
      return message;
    });
  },
  async status(id:string,actor:string,status:string) {
    return transaction(async c=>{
      const before=(await c.query('SELECT * FROM support_tickets WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!before)throw missing();
      const after=(await c.query('UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[id,status])).rows[0];
      await audit(c,actor,'support.status','support_ticket',id,{status:before.status},{status});return after;
    });
  }
};
