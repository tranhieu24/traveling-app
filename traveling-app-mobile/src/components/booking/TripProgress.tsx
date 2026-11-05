import { uiLocale, useUiPreferences, uiText, uiTextStyle, uiStyle } from '../../preferences/ui';

import React from 'react';
import { ActivityIndicator,Pressable,Text,View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getTrip } from '../../services/guestSupport';
import { formatPaymentMoney } from '../../utils/paymentSummary';
import { theme } from '../../theme/tokens';
const labels:Record<string,string>={booking_created:'Đã tạo đơn',payment_received:'Đã ghi nhận thanh toán',booking_cancelled:'Đã hủy đơn',stay_completed:'Đã hoàn tất chuyến đi',refund_requested:'Đã yêu cầu hoàn tiền',refund_received:'Đã xác nhận hoàn tiền'};
export function TripProgress({bookingId}:{bookingId:string}) {
  useUiPreferences();
  const {user}=useAuth();
  const query=useQuery({queryKey:['trip',bookingId,user?.id],enabled:!!user,queryFn:({signal})=>getTrip(bookingId,signal)});
  if(query.isLoading)return <ActivityIndicator accessibilityLabel={uiText("Đang tải tiến trình chuyến đi")}/>;
  if(query.isError)return <View><Text style={uiTextStyle(undefined)}>{uiText("Chưa tải được tiến trình chuyến đi.")}</Text><Pressable style={uiStyle({minHeight:44,justifyContent:'center'})} onPress={()=>void query.refetch()}><Text style={uiTextStyle(undefined)}>{uiText("Thử lại")}</Text></Pressable></View>;
  const trip=query.data;if(!trip)return null;
  return <View style={uiStyle({padding:16,gap:12,borderRadius:16,backgroundColor:theme.colors.background,marginVertical:16})}>
    <Text style={uiTextStyle({fontSize:18,fontWeight:'700'})}>{uiText("Chuyến đi của bạn")}</Text>
    {trip.events.map((event,i)=><View key={event.kind+event.at+i} style={uiStyle({gap:4})}><Text style={uiTextStyle(undefined)}>{uiText(labels[event.kind]||'Cập nhật đơn')}{event.amount!==undefined ? uiText(' · '+formatPaymentMoney(event.amount, 'USD', uiLocale())) : uiText('')}</Text><Text style={uiTextStyle({fontSize:12,color:theme.colors.muted})}>{uiText(new Date(event.at).toLocaleString(uiLocale(),{timeZone:'UTC'}))}{uiText(" UTC")}</Text></View>)}
    {Number(trip.balanceDue)>0&&['pending','confirmed'].includes(trip.status)&&<Text style={uiTextStyle(undefined)}>{uiText("Còn phải trả: ")}{uiText(formatPaymentMoney(trip.balanceDue, 'USD', uiLocale()))}{uiText(". ")}{uiText(trip.balanceDeadlineDescription)}</Text>}
    {trip.policy&&<><Text style={uiTextStyle({fontWeight:'700'})}>{uiText("Chính sách đã lưu khi đặt")}</Text><Text style={uiTextStyle(undefined)}>{uiText(trip.policy.cancellation)}</Text><Text style={uiTextStyle(undefined)}>{uiText(trip.policy.payment)}</Text></>}
    <Text style={uiTextStyle({fontWeight:'700'})}>{uiText("Hướng dẫn nhận phòng")}</Text>
    {trip.arrivalGuide?<><Text selectable style={uiTextStyle(undefined)}>{uiText(trip.arrivalGuide.instructions)}</Text>{!!trip.arrivalGuide.contact&&<Text selectable style={uiTextStyle(undefined)}>{uiText("Liên hệ do quản trị cung cấp: ")}{uiText(trip.arrivalGuide.contact)}</Text>}<Text style={uiTextStyle({fontSize:12,color:theme.colors.muted})}>{uiText("Cập nhật ")}{uiText(new Date(trip.arrivalGuide.updated_at).toLocaleString(uiLocale()))}</Text></>:<Text style={uiTextStyle(undefined)}>{trip.guideStatus==='not_published' ? uiText('Quản trị chưa cung cấp hướng dẫn. Bạn có thể gửi yêu cầu hỗ trợ cho đơn này.') : uiText('Hướng dẫn chỉ hiển thị cho đơn đã xác nhận hoặc hoàn tất.')}</Text>}
    <Pressable style={uiStyle({minHeight:44,justifyContent:'center'})} onPress={()=>void query.refetch()}><Text style={uiTextStyle({color:theme.colors.primary})}>{uiText("Cập nhật tiến trình")}</Text></Pressable>
  </View>;
}
