import { Router } from 'express';
import { bookingController as b } from '../controllers/booking.controller';
import { requireAuth,optionalAuth } from '../middlewares/auth.middleware';
import { validate as v } from '../middlewares/validate.middleware';
import * as s from '../validators/schemas';
import { paymentRepository as p } from '../repositories/payment.repository';
import { sendSuccess } from '../types';
const router=Router();
router.post('/bookings/quote',optionalAuth,v(s.bookingQuoteSchema),b.quote);
router.post('/bookings',requireAuth,v(s.createBookingSchema),b.create);
router.get('/bookings',requireAuth,v(s.bookingListSchema,'query'),b.getMyBookings);
router.get('/bookings/:id',requireAuth,v(s.uuidParams,'params'),b.getBookingDetail);
router.patch('/bookings/:id/cancel',requireAuth,v(s.uuidParams,'params'),v(s.cancelSchema),b.cancelBooking);
router.get('/payments/:bookingId/receipt',requireAuth,v(s.receiptParams,'params'),b.downloadReceipt);
router.post('/bookings/:id/payments',requireAuth,v(s.uuidParams,'params'),v(s.paymentSchema),async(req:any,res,next)=>{
  try {res.setHeader('Cache-Control','no-store');return sendSuccess(res,await p.initiate(req.params.id,req.user.id,req.body.plan,req.get('Idempotency-Key')),201);}catch(e){next(e);}
});
router.post('/payments/:id/simulate',requireAuth,v(s.uuidParams,'params'),v(s.simulateSchema),async(req:any,res,next)=>{
  try{return sendSuccess(res,await p.simulate(req.params.id,req.user.id,req.body.outcome));}catch(e){next(e);}
});
router.post('/bookings/:id/refunds',requireAuth,v(s.uuidParams,'params'),v(s.reasonSchema),async(req:any,res,next)=>{
  try{return sendSuccess(res,await p.requestRefund(req.params.id,req.user.id,req.body.reason),201);}catch(e){next(e);}
});
export default router;
