import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'crypto';
import { ENV } from '../config/env';
import { AppError } from '../types';
import { cents } from '../domain/booking';

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY || 'sk_test_unconfigured', {timeout:10000,maxNetworkRetries:1});
export function ensurePaymentsEnabled() {
  if (ENV.PAYMENT_MODE==='disabled') throw new AppError('Payment provider is not configured',503,'PAYMENTS_DISABLED');
}
export function requireMock() {
  if (ENV.PAYMENT_MODE!=='mock' || ENV.NODE_ENV==='production') throw new AppError('Simulation unavailable',404,'NOT_FOUND');
}
export async function initiateGateway(payment: any) {
  if (payment.provider==='mock') {
    requireMock();
    return {providerPaymentId:'mock_'+payment.id,clientSecret:null,simulation:true};
  }
  if (ENV.PAYMENT_MODE!=='stripe_test' || payment.provider!=='stripe_test') throw new AppError('Provider mismatch',409,'PROVIDER_MISMATCH');
  if (cents(payment.amount)<50 || cents(payment.amount)>99999999) throw new AppError('Stripe test amount must be between $0.50 and $999,999.99',400,'PROVIDER_AMOUNT_LIMIT');
  const intent = payment.provider_payment_id
    ? await stripe.paymentIntents.retrieve(payment.provider_payment_id)
    : await stripe.paymentIntents.create({amount:cents(payment.amount),currency:'usd',allowed_payment_method_types:['card'],metadata:{paymentId:payment.id,bookingId:payment.booking_id}},{idempotencyKey:'payment:'+payment.id});
  if (intent.livemode || intent.amount!==cents(payment.amount) || intent.currency!=='usd') throw new AppError('Provider amount mismatch',409,'PAYMENT_MISMATCH');
  return {providerPaymentId:intent.id,clientSecret:intent.client_secret,simulation:false};
}
export function verifyMock(raw: Buffer, header: string | undefined) {
  requireMock();
  if (!ENV.MOCK_WEBHOOK_SECRET || !header) throw new AppError('Webhook signature required',400,'INVALID_WEBHOOK_SIGNATURE');
  const parts=header.split(',').map(x=>x.split('='));
  const timestamp=parts.find(x=>x[0]==='t')?.[1], signature=parts.find(x=>x[0]==='v1')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now()/1000-Number(timestamp))>300 || !signature || !/^[a-f0-9]{64}$/.test(signature)) throw new AppError('Invalid webhook signature or timestamp',400,'INVALID_WEBHOOK_SIGNATURE');
  const expected=createHmac('sha256',ENV.MOCK_WEBHOOK_SECRET).update(timestamp+'.').update(raw).digest();
  if (!timingSafeEqual(expected,Buffer.from(signature,'hex'))) throw new AppError('Invalid webhook signature',400,'INVALID_WEBHOOK_SIGNATURE');
}
