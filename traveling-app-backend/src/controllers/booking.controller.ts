import { Response,NextFunction } from 'express';
import { AuthenticatedRequest,sendSuccess,AppError } from '../types';
import { bookingRepository } from '../repositories/booking.repository';
import { pdfService } from '../services/pdf.service';
export class BookingController {
  async quote(req:AuthenticatedRequest,res:Response,next:NextFunction) {
    try { const b=req.body; return sendSuccess(res,await bookingRepository.quoteBooking(b.listingId,b.checkInDate,b.checkOutDate,b.guests,b.couponCode,req.user?.id)); } catch(e){next(e);}
  }
  async create(req:AuthenticatedRequest,res:Response,next:NextFunction) {
    try {return sendSuccess(res,await bookingRepository.createBookingWithTransaction({...req.body,guestId:req.user!.id}),201);}catch(e){next(e);}
  }
  async getMyBookings(req:AuthenticatedRequest,res:Response,next:NextFunction) {
    try { const q=req.query as any; const {items,...pagination}=await bookingRepository.getUserBookings(req.user!.id,q.status,q.page,q.limit);return sendSuccess(res,items,200,pagination);}catch(e){next(e);}
  }
  async getBookingDetail(req:AuthenticatedRequest,res:Response,next:NextFunction) {
    try {const b=await bookingRepository.getBookingDetail(req.params.id,req.user!.id,req.user!.role==='admin');if(!b)throw new AppError('Booking not found',404,'BOOKING_NOT_FOUND');return sendSuccess(res,b);}catch(e){next(e);}
  }
  async cancelBooking(req:AuthenticatedRequest,res:Response,next:NextFunction) {
    try {return sendSuccess(res,await bookingRepository.cancelBooking(req.params.id,req.user!.id,req.body.reason));}catch(e){next(e);}
  }
  async downloadReceipt(req:AuthenticatedRequest,res:Response,next:NextFunction) {
    try {
      const b=await bookingRepository.getBookingDetail(req.params.bookingId,req.user!.id,req.user!.role==='admin');
      if(!b || (b.guest_id!==req.user!.id && req.user!.role!=='admin')) throw new AppError('Receipt not found',404,'BOOKING_NOT_FOUND');
      if(!b.payments.some((p:any)=>p.payment_status==='succeeded')) throw new AppError('No successful payment in booking history',409,'RECEIPT_UNAVAILABLE');
      pdfService.generateReceipt(res,b);
    } catch(e){next(e);}
  }
}
export const bookingController=new BookingController();
