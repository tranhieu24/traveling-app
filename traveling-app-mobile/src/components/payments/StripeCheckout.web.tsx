import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js';
import { prepareStripeCheckout, verifyStripeCheckout, type StripeAttempt } from '../../services/stripeCheckout';
import { paymentErrorMessage } from '../../services/bookingPayment';
import { Button } from '../common/Button';
import type { StripeCheckoutProps } from './StripeCheckout';

export function StripeCheckout({bookingId,plan,publishableKey,onComplete,onBusy}:StripeCheckoutProps) {
  useUiPreferences();
  const host=useRef<HTMLDivElement>(null),stripe=useRef<Stripe | null>(null),elements=useRef<StripeElements | null>(null),element=useRef<StripePaymentElement | null>(null),attempt=useRef<StripeAttempt | null>(null),pending=useRef(false);
  const [busy,setBusy]=useState(false),[ready,setReady]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>()=>{element.current?.destroy();},[]);
  const verify=async()=>{const booking=await verifyStripeCheckout(bookingId,attempt.current?.payment.id,plan);if(booking)onComplete(booking);else setMessage('Đang chờ webhook xác nhận. Không cần thanh toán lại; hãy kiểm tra trạng thái sau ít giây.');};
  const run=async(checkOnly=false)=>{
    if(pending.current)return;pending.current=true;setBusy(true);onBusy?.(true);setMessage('');
    try{
      if(checkOnly){await verify();return;}
      if(!ready){
        if(!publishableKey.startsWith('pk_test_'))throw new Error('Cần publishable key của Stripe test.');
        const next=await prepareStripeCheckout(bookingId,plan);attempt.current=next;
        if(next.payment.payment_status==='succeeded'){await verify();return;}
        if(!next.clientSecret)throw new Error('Phiên thanh toán chưa sẵn sàng. Kiểm tra trạng thái và thử lại.');
        stripe.current=await loadStripe(publishableKey);
        if(!stripe.current || !host.current)throw new Error('Không tải được Stripe. Kiểm tra mạng và thử lại.');
        elements.current=stripe.current.elements({clientSecret:next.clientSecret,locale:'vi'});
        element.current?.destroy();element.current=elements.current.create('payment');element.current.mount(host.current);
        element.current.on('ready',()=>setReady(true));
        element.current.on('loaderror',()=>{setMessage('Không tải được biểu mẫu thẻ. Bạn có thể thử mở lại.');setReady(false);});
      }else{
        if(!stripe.current||!elements.current)throw new Error('Vui lòng mở lại biểu mẫu thẻ.');
        const result=await stripe.current.confirmPayment({elements:elements.current,confirmParams:{return_url:`${window.location.origin}/bookings/${bookingId}/pay`},redirect:'if_required'});
        if(result.error)throw new Error('Stripe chưa xác nhận được thẻ. Kiểm tra thông tin hoặc dùng thẻ test khác.');
        await verify();
      }
    }catch(error){setMessage(paymentErrorMessage(error));}
    finally{pending.current=false;setBusy(false);onBusy?.(false);}
  };
  return <View style={uiStyle({gap:12,paddingVertical:16})}><Text style={uiTextStyle(undefined)}>{uiText("Stripe test — nhập thẻ thử nghiệm trong biểu mẫu bảo mật của Stripe.")}</Text><div ref={host} style={uiStyle({minHeight:ready?220:0})}/><Button title={busy ? uiText('Đang xử lý...') : ready ? uiText('Xác nhận thanh toán test') : uiText('Nhập thẻ Stripe test')} disabled={busy} onPress={()=>void run()}/>{busy&&<ActivityIndicator/>}{!!message&&<Text accessibilityRole="alert" style={uiTextStyle(undefined)}>{uiText(message)}</Text>}<Pressable disabled={busy} onPress={()=>void run(true)} style={uiStyle({minHeight:44,justifyContent:'center'})}><Text style={uiTextStyle({color:'#008A9A'})}>{uiText("Kiểm tra xác nhận từ server")}</Text></Pressable></View>;
}
