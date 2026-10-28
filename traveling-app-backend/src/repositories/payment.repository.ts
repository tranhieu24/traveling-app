import { createHash, randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { z } from 'zod';
import { pool } from '../config/database';
import { ENV } from '../config/env';
import { AppError } from '../types';
import { assertTransition,cents,money } from '../domain/booking';
import { transaction } from '../services/transaction';
import { ensurePaymentsEnabled, initiateGateway, requireMock, stripe, verifyMock } from '../services/gateway.service';
import { audit, requestRefunds } from './booking.repository';

export class PaymentRepository {
  async initiate(bookingId:string,userId:string,plan:string,key:string) {
    ensurePaymentsEnabled();
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(key||'')) throw new AppError('Idempotency-Key of 8-100 alphanumeric, underscore or dash characters required',400,'IDEMPOTENCY_KEY_REQUIRED');
    const payment = await transaction(async c => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[userId+':'+key]);
      const b=(await c.query('SELECT * FROM bookings WHERE id=$1 AND guest_id=$2 FOR UPDATE',[bookingId,userId])).rows[0];
      if (!b) throw new AppError('Booking not found',404,'BOOKING_NOT_FOUND');
      const previous=(await c.query('SELECT * FROM payments WHERE user_id=$1 AND idempotency_key=$2',[userId,key])).rows[0];
      if (previous) {
        if(previous.booking_id!==bookingId || previous.requested_plan!==plan) throw new AppError('Key already used for another request',409,'IDEMPOTENCY_CONFLICT');
        return previous;
      }
      if (!['pending','confirmed'].includes(b.booking_status)) throw new AppError('Booking cannot accept payments',409,'INVALID_BOOKING_STATUS');
      if (b.booking_status==='pending' && new Date(b.payment_due_at).getTime()<=Date.now()) throw new AppError('Booking hold expired',409,'BOOKING_EXPIRED');
      await c.query("UPDATE payments SET payment_status='timed_out',updated_at=now() WHERE booking_id=$1 AND payment_status='pending' AND expires_at<=now()",[bookingId]);
      const active=await c.query("SELECT id FROM payments WHERE booking_id=$1 AND payment_status='pending'",[bookingId]);
      if(active.rows.length) throw new AppError('Payment already pending; retry its original key',409,'PAYMENT_IN_PROGRESS');
      const paid=(await c.query("SELECT coalesce(sum(amount),0) paid FROM payments WHERE booking_id=$1 AND payment_status='succeeded'",[bookingId])).rows[0];
      const remaining=cents(b.total_price)-cents(paid.paid);
      if(remaining<=0) throw new AppError('Booking fully paid',409,'ALREADY_PAID');
      if(plan==='deposit' && (b.payment_plan!=='deposit' || cents(paid.paid)>0)) throw new AppError('Deposit is available only as the first payment of a deposit booking',409,'INVALID_PAYMENT_PLAN');
      if(plan==='balance' && cents(paid.paid)===0) throw new AppError('No deposit paid',409,'INVALID_PAYMENT_PLAN');
      const amount=plan==='deposit'?Math.min(3000,remaining):remaining;
      if(ENV.PAYMENT_MODE==='stripe_test' && (amount<50 || amount>99999999)) throw new AppError('Amount outside Stripe limits',400,'PROVIDER_AMOUNT_LIMIT');
      return (await c.query("INSERT INTO payments(booking_id,user_id,amount,currency,payment_method,provider,is_simulated,idempotency_key,requested_plan,expires_at) VALUES($1,$2,$3,'USD',$4::text,$4::text,$5,$6,$7,least(coalesce($8::timestamptz,now()+interval '15 minutes'),now()+interval '15 minutes')) RETURNING *",
        [bookingId,userId,money(amount),ENV.PAYMENT_MODE,ENV.PAYMENT_MODE==='mock',key,plan,b.payment_due_at])).rows[0];
    });
    if (payment.payment_status!=='pending' || new Date(payment.expires_at).getTime()<=Date.now()) return {payment,clientSecret:null,simulation:payment.is_simulated};
    try {
      const result=await initiateGateway(payment);
      await pool.query('UPDATE payments SET provider_payment_id=$2::text,transaction_reference=$2::text,updated_at=now() WHERE id=$1',[payment.id,result.providerPaymentId]);
      return {payment:{...payment,provider_payment_id:result.providerPaymentId,transaction_reference:result.providerPaymentId},clientSecret:result.clientSecret,simulation:result.simulation};
    } catch(e) {
      if(e instanceof AppError) throw e;
      // An HTTP timeout does not prove failure. Persist pending and retry the SAME idempotency key.
      throw new AppError('Provider request unconfirmed. Retry with the same Idempotency-Key',502,'PROVIDER_UNAVAILABLE');
    }
  }

  async applyPaymentEvent(c:PoolClient, provider:string, paymentId:string, target:string, amount:number, currency:string, providerId?:string) {
    const ref=(await c.query('SELECT booking_id FROM payments WHERE id=$1',[paymentId])).rows[0];
    if(!ref) throw new AppError('Unknown payment',404,'PAYMENT_NOT_FOUND');
    const b=(await c.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[ref.booking_id])).rows[0];
    const p=(await c.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE',[paymentId])).rows[0];
    if(p.provider!==provider || cents(p.amount)!==amount || p.currency.toLowerCase()!==currency.toLowerCase() || (p.provider_payment_id && providerId && p.provider_payment_id!==providerId)) throw new AppError('Provider, amount, currency or reference mismatch',409,'PAYMENT_MISMATCH');
    if(p.payment_status===target || p.payment_status==='succeeded') return {ignored:true};
    assertTransition('payment',p.payment_status,target);
    await c.query("UPDATE payments SET payment_status=$2::text,provider_payment_id=coalesce(provider_payment_id,$3::text),transaction_reference=coalesce(transaction_reference,$3::text),paid_at=CASE WHEN $2::text='succeeded' THEN now() ELSE paid_at END,updated_at=now() WHERE id=$1",[p.id,target,providerId||null]);
    if(target!=='succeeded') return {paymentId:p.id,status:target};
    if(b.booking_status==='pending' && new Date(b.payment_due_at).getTime()<=Date.now()) {
      await c.query("UPDATE bookings SET booking_status='expired' WHERE id=$1",[b.id]);
      b.booking_status='expired';
    }
    const paid=(await c.query("SELECT coalesce(sum(amount),0) paid FROM payments WHERE booking_id=$1 AND payment_status='succeeded'",[b.id])).rows[0];
    if(['cancelled','expired'].includes(b.booking_status)) {
      await requestRefunds(c,b.id,'Verified payment arrived after cancellation or expiry');
    } else if(cents(paid.paid)>cents(b.total_price)) {
      await c.query("INSERT INTO refunds(payment_id,booking_id,amount,reason) VALUES($1,$2,$3,'Excess late payment; requires approval') ON CONFLICT(payment_id) DO NOTHING",[p.id,b.id,p.amount]);
    } else {
      const required=b.payment_plan==='deposit'?Math.min(3000,cents(b.total_price)):cents(b.total_price);
      if(b.booking_status==='pending' && cents(paid.paid)>=required) await c.query("UPDATE bookings SET booking_status='confirmed',payment_due_at=NULL WHERE id=$1",[b.id]);
    }
    return {paymentId:p.id,status:target};
  }

  async applyRefundEvent(c:PoolClient, provider:string, refundId:string, target:string, amount:number,currency:string,providerRefundId:string,providerPaymentId?:string) {
    const ref=(await c.query('SELECT booking_id FROM refunds WHERE id=$1',[refundId])).rows[0];
    if(!ref) throw new AppError('Unknown refund',404,'REFUND_NOT_FOUND');
    await c.query('SELECT id FROM bookings WHERE id=$1 FOR UPDATE',[ref.booking_id]);
    const r=(await c.query('SELECT r.*,p.provider,p.currency,p.provider_payment_id FROM refunds r JOIN payments p ON p.id=r.payment_id WHERE r.id=$1 FOR UPDATE OF r',[refundId])).rows[0];
    if(r.provider!==provider || cents(r.amount)!==amount || currency.toLowerCase()!==r.currency.toLowerCase() || (r.provider_refund_id && r.provider_refund_id!==providerRefundId) || (providerPaymentId && r.provider_payment_id!==providerPaymentId)) throw new AppError('Refund verification mismatch',409,'REFUND_MISMATCH');
    if(r.status===target || r.status==='succeeded') return {ignored:true};
    if(!['processing','failed'].includes(r.status)) throw new AppError('Refund not approved/dispatched',409,'INVALID_STATE_TRANSITION');
    if(target!=='succeeded' && target!=='failed') return {ignored:true};
    await c.query("UPDATE refunds SET status=$2,provider_refund_id=$3,succeeded_at=CASE WHEN $2::text='succeeded' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1",[refundId,target,providerRefundId]);
    return {refundId,status:target};
  }

  async webhook(provider:string,raw:Buffer,signature:string|undefined) {
    if(!Buffer.isBuffer(raw)) throw new AppError('Raw webhook body required',400,'INVALID_WEBHOOK');
    let event:any;
    if(provider==='mock') {
      verifyMock(raw,signature);
      try { event=z.object({id:z.string().min(1).max(200),paymentId:z.string().uuid(),type:z.enum(['succeeded','failed','timed_out']),amount:z.number().int().nonnegative(),currency:z.literal('USD')}).parse(JSON.parse(raw.toString('utf8'))); }
      catch {throw new AppError('Invalid mock event',400,'INVALID_WEBHOOK');}
    } else {
      if(ENV.PAYMENT_MODE!=='stripe_test') throw new AppError('Stripe test unavailable',404,'NOT_FOUND');
      try {event=stripe.webhooks.constructEvent(raw,signature||'',ENV.STRIPE_WEBHOOK_SECRET,300);}
      catch {throw new AppError('Invalid Stripe signature',400,'INVALID_WEBHOOK_SIGNATURE');}
      if(event.livemode) throw new AppError('Live events refused',400,'INVALID_WEBHOOK');
    }
    const hash=createHash('sha256').update(raw).digest('hex');
    return transaction(async c=>{
      const insert=await c.query('INSERT INTO webhook_events(provider,event_id,payload_hash,event_type) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING event_id',[provider,event.id,hash,event.type]);
      if(!insert.rows.length) {
        const old=(await c.query('SELECT payload_hash FROM webhook_events WHERE provider=$1 AND event_id=$2',[provider,event.id])).rows[0];
        if(provider==='mock' && old.payload_hash!==hash) throw new AppError('Event ID reused with different content',409,'WEBHOOK_EVENT_CONFLICT');
        return {duplicate:true};
      }
      if(provider==='mock') return this.applyPaymentEvent(c,provider,event.paymentId,event.type,event.amount,event.currency,'mock_'+event.paymentId);
      const obj=event.data.object;
      if(obj.livemode) throw new AppError('Live object refused',400,'INVALID_WEBHOOK');
      if(['payment_intent.succeeded','payment_intent.payment_failed','payment_intent.canceled'].includes(event.type)) {
        const target=event.type==='payment_intent.succeeded'?'succeeded':event.type==='payment_intent.canceled'?'timed_out':'failed';
        const paymentId=z.string().uuid().parse(obj.metadata?.paymentId);
        return this.applyPaymentEvent(c,provider,paymentId,target,target==='succeeded'?obj.amount_received:obj.amount,obj.currency,obj.id);
      }
      if(['refund.created','refund.updated','refund.failed'].includes(event.type) && ['succeeded','failed','canceled'].includes(obj.status)) {
        return this.applyRefundEvent(c,provider,z.string().uuid().parse(obj.metadata?.refundId),obj.status==='succeeded'?'succeeded':'failed',obj.amount,obj.currency,obj.id,typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id);
      }
      return {ignored:true};
    });
  }

  async simulate(id:string,userId:string,outcome:string) {
    requireMock();
    const p=(await pool.query('SELECT * FROM payments WHERE id=$1 AND user_id=$2 AND provider=$3',[id,userId,'mock'])).rows[0];
    if(!p) throw new AppError('Payment not found',404,'PAYMENT_NOT_FOUND');
    return transaction(c=>this.applyPaymentEvent(c,'mock',id,outcome,cents(p.amount),'USD','mock_'+id));
  }

  async requestRefund(bookingId:string,userId:string,reason:string) {
    return transaction(async c=>{
      const b=(await c.query('SELECT * FROM bookings WHERE id=$1 AND guest_id=$2 FOR UPDATE',[bookingId,userId])).rows[0];
      if(!b) throw new AppError('Booking not found',404,'BOOKING_NOT_FOUND');
      if(!['cancelled','expired'].includes(b.booking_status)) throw new AppError('Cancel the booking before requesting a refund',409,'INVALID_BOOKING_STATUS');
      await requestRefunds(c,bookingId,reason);
      return (await c.query('SELECT * FROM refunds WHERE booking_id=$1 ORDER BY created_at,id',[bookingId])).rows;
    });
  }
  async decideRefund(id:string,actor:string,decision:string,reason:string) {
    return transaction(async c=>{
      const r=(await c.query('SELECT * FROM refunds WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!r) throw new AppError('Refund not found',404,'REFUND_NOT_FOUND');
      const target=decision==='approve'?'approved':'rejected';
      assertTransition('refund',r.status,target);
      const after=(await c.query('UPDATE refunds SET status=$2,decision_reason=$3,decided_by=$4,updated_at=now() WHERE id=$1 RETURNING *',[id,target,reason,actor])).rows[0];
      await audit(c,actor,'refund.'+target,'refund',id,r,after);
      return after;
    });
  }
  async processRefund(id:string,actor:string) {
    ensurePaymentsEnabled();
    const r=await transaction(async c=>{
      const before=(await c.query('SELECT r.*,p.provider,p.provider_payment_id,p.is_simulated,p.payment_status FROM refunds r JOIN payments p ON p.id=r.payment_id WHERE r.id=$1 FOR UPDATE OF r',[id])).rows[0];
      if(!before) throw new AppError('Refund not found',404,'REFUND_NOT_FOUND');
      if(before.payment_status!=='succeeded') throw new AppError('Only successful payments can be refunded',409,'INVALID_PAYMENT_STATUS');
      if(before.provider==='legacy_mock') throw new AppError('Historical mock transaction: manual reconciliation required',409,'LEGACY_PAYMENT');
      if(before.provider!==ENV.PAYMENT_MODE) throw new AppError('Provider mismatch',409,'PROVIDER_MISMATCH');
      if(before.status!=='processing') assertTransition('refund',before.status,'processing');
      await c.query("UPDATE refunds SET status='processing',updated_at=now() WHERE id=$1",[id]);
      await audit(c,actor,'refund.dispatch','refund',id,before,{status:'processing'});
      return before;
    });
    if(r.provider==='mock') {
      requireMock();
      return transaction(c=>this.applyRefundEvent(c,'mock',id,'succeeded',cents(r.amount),'USD','mock_refund_'+id,r.provider_payment_id));
    }
    try {
      const refund=r.provider_refund_id ? await stripe.refunds.retrieve(r.provider_refund_id) :
        await stripe.refunds.create({payment_intent:r.provider_payment_id,amount:cents(r.amount),metadata:{refundId:id},reason:'requested_by_customer'},{idempotencyKey:'refund:'+id});
      await pool.query('UPDATE refunds SET provider_refund_id=$2,updated_at=now() WHERE id=$1',[id,refund.id]);
      // Only signed webhook changes Stripe refund to succeeded/failed.
      return {id,status:'processing',providerRefundId:refund.id};
    } catch {
      throw new AppError('Refund dispatch unconfirmed. Reconcile or retry the same refund ID',502,'PROVIDER_UNAVAILABLE');
    }
  }
}
export const paymentRepository=new PaymentRepository();
