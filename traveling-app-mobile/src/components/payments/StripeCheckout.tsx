import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { initStripe, initPaymentSheet, presentPaymentSheet, handleURLCallback } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { AUTH_SCHEME } from '../../config/auth';
import { prepareStripeCheckout, verifyStripeCheckout } from '../../services/stripeCheckout';
import { paymentErrorMessage } from '../../services/bookingPayment';
import { Button } from '../common/Button';
import type { Booking, PaymentPlan } from '../../types';

export interface StripeCheckoutProps { bookingId:string; plan:PaymentPlan; publishableKey:string; onComplete:(booking:Booking)=>void; onBusy?:(busy:boolean)=>void }
export function StripeCheckout({bookingId,plan,publishableKey,onComplete,onBusy}:StripeCheckoutProps) {
  useUiPreferences();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const pending=useRef(false),paymentId=useRef<string | undefined>(undefined);
  const run=async(checkOnly=false)=>{
    if(pending.current)return;
    pending.current=true;setBusy(true);onBusy?.(true);setMessage('');
    const listener=Linking.addEventListener('url',({url})=>{void handleURLCallback(url);});
    try {
      if(!publishableKey.startsWith('pk_test_'))throw new Error('Cần publishable key của Stripe test.');
      if(!checkOnly){
        const attempt=await prepareStripeCheckout(bookingId,plan);paymentId.current=attempt.payment.id;
        if(attempt.payment.payment_status!=='succeeded'){
          if(!attempt.clientSecret)throw new Error('Phiên thanh toán chưa sẵn sàng. Kiểm tra trạng thái và thử lại.');
          await initStripe({publishableKey,urlScheme:AUTH_SCHEME});
          const init=await initPaymentSheet({merchantDisplayName:'Traveling App — Test',paymentIntentClientSecret:attempt.clientSecret,returnURL:`${AUTH_SCHEME}://bookings/${bookingId}/pay`,allowsDelayedPaymentMethods:false});
          if(init.error)throw new Error('Không mở được biểu mẫu Stripe. Vui lòng thử lại.');
          const result=await presentPaymentSheet();
          if(result.error){if(result.error.code==='Canceled'){setMessage('Bạn đã đóng thanh toán. Đơn vẫn giữ trạng thái từ server.');return;}throw new Error('Stripe chưa xác nhận được thẻ. Kiểm tra thông tin và thử lại.');}
        }
      }
      const booking=await verifyStripeCheckout(bookingId,paymentId.current,plan);
      if(booking)onComplete(booking);else setMessage('Đang chờ webhook xác nhận. Không cần thanh toán lại; hãy kiểm tra trạng thái sau ít giây.');
    }catch(error){setMessage(paymentErrorMessage(error));}
    finally{listener.remove();pending.current=false;setBusy(false);onBusy?.(false);}
  };
  return <View style={uiStyle({gap:12,paddingVertical:16})}><Text style={uiTextStyle(undefined)}>{uiText("Stripe test — dùng thẻ thử nghiệm; không có giao dịch live.")}</Text><Button title={busy ? uiText('Đang kiểm tra...') : uiText('Mở thanh toán Stripe test')} disabled={busy} onPress={()=>void run()} />{busy&&<ActivityIndicator/>}{!!message&&<Text accessibilityRole="alert" style={uiTextStyle(undefined)}>{uiText(message)}</Text>}<Pressable disabled={busy} style={uiStyle({minHeight:44,justifyContent:'center'})} onPress={()=>void run(true)}><Text style={uiTextStyle({color:'#008A9A'})}>{uiText("Kiểm tra xác nhận từ server")}</Text></Pressable></View>;
}
