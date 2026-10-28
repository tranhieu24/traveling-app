import { Router,Response,NextFunction } from 'express';
import ExcelJS from 'exceljs';
import { AuthenticatedRequest,sendSuccess,AppError } from '../types';
import { requireAuth,requireAdmin } from '../middlewares/auth.middleware';
import { validate as v } from '../middlewares/validate.middleware';
import * as s from '../validators/schemas';
import { adminRepository as a } from '../repositories/admin.repository';
import { bookingRepository as b,audit } from '../repositories/booking.repository';
import { paymentRepository as p } from '../repositories/payment.repository';
import { reportRepository } from '../repositories/report.repository';
import { supabaseAdmin } from '../config/supabase';
import { transaction } from '../services/transaction';
const router=Router();
router.use(requireAuth,requireAdmin);
type Handler=(req:AuthenticatedRequest,res:Response)=>Promise<any>;
const handle=(fn:Handler)=>(req:AuthenticatedRequest,res:Response,next:NextFunction)=>Promise.resolve(fn(req,res)).catch(next);
router.get('/session',handle(async(req,res)=>sendSuccess(res,req.user)));
router.post('/logout',handle(async(req,res)=>{
  const token=req.headers.authorization!.split(' ')[1];
  const {error}=await supabaseAdmin.auth.admin.signOut(token,'global');
  if(error) throw new AppError('Supabase sign-out unavailable',503,'AUTH_UNAVAILABLE');
  await transaction(async c=>{
    await c.query('UPDATE users SET tokens_valid_after=now() WHERE id=$1',[req.user!.id]);
    await audit(c,req.user!.id,'admin.logout','user',req.user!.id,null,{scope:'global'});
  });
  return sendSuccess(res,{signedOut:true});
}));
for(const [resource,create,patch] of [
  ['listings',s.listingSchema,s.listingPatchSchema],
  ['categories',s.categorySchema,s.categoryPatchSchema],
  ['coupons',s.couponSchema,s.couponPatchSchema],
] as const) {
  router.get('/'+resource,v(s.adminQuerySchema,'query'),handle(async(req,res)=>{
    const result=await a.list(resource,req.query);return sendSuccess(res,result.items,200,result.pagination);
  }));
  router.get('/'+resource+'/:id',v(s.uuidParams,'params'),handle(async(req,res)=>sendSuccess(res,await a.get(resource,req.params.id))));
  router.post('/'+resource,v(create),handle(async(req,res)=>sendSuccess(res,await a.save(resource,undefined,req.body,req.user!.id),201)));
  router.patch('/'+resource+'/:id',v(s.uuidParams,'params'),v(patch),handle(async(req,res)=>sendSuccess(res,await a.save(resource,req.params.id,req.body,req.user!.id))));
  router.delete('/'+resource+'/:id',v(s.uuidParams,'params'),handle(async(req,res)=>sendSuccess(res,await a.deactivate(resource,req.params.id,req.user!.id))));
}
for(const resource of ['customers','bookings','refunds','audit-logs'] as const) {
  router.get('/'+resource,v(s.adminQuerySchema,'query'),handle(async(req,res)=>{
    const result=await a.list(resource,req.query);return sendSuccess(res,result.items,200,result.pagination);
  }));
}
router.patch('/customers/:id',v(s.uuidParams,'params'),v(s.customerSchema),handle(async(req,res)=>{
  const result=await a.updateCustomer(req.params.id,req.body,req.user!.id);return sendSuccess(res,result,result.auth_sync_pending?202:200);
}));
router.patch('/customers/:id/status',v(s.uuidParams,'params'),v(s.accountStatusSchema),handle(async(req,res)=>{
  const result=await a.setAccountStatus(req.params.id,req.body.status,req.body.reason,req.user!.id);return sendSuccess(res,result,result.auth_sync_pending?202:200);
}));
router.post('/customers/:id/auth-sync',v(s.uuidParams,'params'),handle(async(req,res)=>{
  const result=await a.syncCustomer(req.params.id,req.user!.id);return sendSuccess(res,result,result.auth_sync_pending?202:200);
}));
router.get('/bookings/:id',v(s.uuidParams,'params'),handle(async(req,res)=>{
  const booking=await b.getBookingDetail(req.params.id,req.user!.id,true);
  if(!booking) throw new AppError('Booking not found',404,'BOOKING_NOT_FOUND');
  return sendSuccess(res,booking);
}));
for(const target of ['confirmed','completed'] as const) {
  router.patch('/bookings/:id/'+(target==='confirmed'?'confirm':'complete'),v(s.uuidParams,'params'),handle(async(req,res)=>sendSuccess(res,await b.transitionBooking(req.params.id,req.user!.id,target))));
}
router.patch('/bookings/:id/cancel',v(s.uuidParams,'params'),v(s.reasonSchema),handle(async(req,res)=>sendSuccess(res,await b.cancelBooking(req.params.id,req.user!.id,req.body.reason,true))));
router.post('/jobs/expire-bookings',handle(async(req,res)=>{
  const result=await b.expirePending();
  await transaction(c=>audit(c,req.user!.id,'booking.expire_job','job',req.user!.id,null,result));
  return sendSuccess(res,result);
}));
router.patch('/refunds/:id/decision',v(s.uuidParams,'params'),v(s.refundDecisionSchema),handle(async(req,res)=>sendSuccess(res,await p.decideRefund(req.params.id,req.user!.id,req.body.decision,req.body.reason))));
router.post('/refunds/:id/process',v(s.uuidParams,'params'),handle(async(req,res)=>sendSuccess(res,await p.processRefund(req.params.id,req.user!.id))));
router.get('/reports/revenue',v(s.reportSchema,'query'),handle(async(req,res)=>sendSuccess(res,await reportRepository.revenue(req.query.from as string,req.query.to as string))));
router.get('/reports/revenue.xlsx',v(s.reportSchema,'query'),handle(async(req,res)=>{
  const report=await reportRepository.revenue(req.query.from as string,req.query.to as string);
  const workbook=new ExcelJS.Workbook();
  const sheet=workbook.addWorksheet('Revenue USD (TEST)');
  sheet.columns=[
    {header:'UTC day',key:'day',width:16},{header:'Provider',key:'provider',width:20},{header:'Simulated',key:'is_simulated',width:14},
    {header:'Gross USD',key:'gross_payments',width:18},{header:'Refunds USD',key:'refunds',width:18},{header:'Net USD',key:'net_revenue',width:18},
    {header:'Payments',key:'successful_transactions',width:14},{header:'Refunds count',key:'successful_refunds',width:16},
  ];
  for(const row of report.items) sheet.addRow({...row,gross_payments:Number(row.gross_payments),refunds:Number(row.refunds),net_revenue:Number(row.net_revenue)});
  sheet.getRow(1).font={bold:true};
  sheet.addRow({day:'TOTAL (TEST)',gross_payments:Number(report.gross_payments),refunds:Number(report.refunds),net_revenue:Number(report.net_revenue)});
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename="revenue-'+report.from+'-'+report.to+'.xlsx"');
  res.setHeader('Cache-Control','private, no-store');
  await transaction(c=>audit(c,req.user!.id,'revenue.export','report',req.user!.id,null,{from:report.from,to:report.to}));
  await workbook.xlsx.write(res);res.end();
}));
export default router;
