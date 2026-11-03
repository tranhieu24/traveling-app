import React from 'react';
import { ActivityIndicator,Pressable,Text,View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { getTrip } from '../../services/guestSupport';
import { formatPaymentMoney } from '../../utils/paymentSummary';
import { theme } from '../../theme/tokens';
const labels:Record<string,string>={booking_created:'Đã tạo đơn',payment_received:'Đã ghi nhận thanh toán',booking_cancelled:'Đã hủy đơn',stay_completed:'Đã hoàn tất chuyến đi',refund_requested:'Đã yêu cầu hoàn tiền',refund_received:'Đã xác nhận hoàn tiền'};
export function TripProgress({bookingId}:{bookingId:string}) {
  const {user}=useAuth();
  const query=useQuery({queryKey:['trip',bookingId,user?.id],enabled:!!user,queryFn:({signal})=>getTrip(bookingId,signal)});
  if(query.isLoading)return <ActivityIndicator accessibilityLabel="Đang tải tiến trình chuyến đi"/>;
  if(query.isError)return <View><Text>Chưa tải được tiến trình chuyến đi.</Text><Pressable style={{minHeight:44,justifyContent:'center'}} onPress={()=>void query.refetch()}><Text>Thử lại</Text></Pressable></View>;
  const trip=query.data;if(!trip)return null;
  return <View style={{padding:16,gap:12,borderRadius:16,backgroundColor:theme.colors.background,marginVertical:16}}>
    <Text style={{fontSize:18,fontWeight:'700'}}>Chuyến đi của bạn</Text>
    {trip.events.map((event,i)=><View key={event.kind+event.at+i} style={{gap:4}}><Text>{labels[event.kind]||'Cập nhật đơn'}{event.amount!==undefined?' · '+formatPaymentMoney(event.amount):''}</Text><Text style={{fontSize:12,color:theme.colors.muted}}>{new Date(event.at).toLocaleString('vi-VN',{timeZone:'UTC'})} UTC</Text></View>)}
    {Number(trip.balanceDue)>0&&['pending','confirmed'].includes(trip.status)&&<Text>Còn phải trả: {formatPaymentMoney(trip.balanceDue)}. {trip.balanceDeadlineDescription}</Text>}
    {trip.policy&&<><Text style={{fontWeight:'700'}}>Chính sách đã lưu khi đặt</Text><Text>{trip.policy.cancellation}</Text><Text>{trip.policy.payment}</Text></>}
    <Text style={{fontWeight:'700'}}>Hướng dẫn nhận phòng</Text>
    {trip.arrivalGuide?<><Text selectable>{trip.arrivalGuide.instructions}</Text>{!!trip.arrivalGuide.contact&&<Text selectable>Liên hệ do quản trị cung cấp: {trip.arrivalGuide.contact}</Text>}<Text style={{fontSize:12,color:theme.colors.muted}}>Cập nhật {new Date(trip.arrivalGuide.updated_at).toLocaleString('vi-VN')}</Text></>:<Text>{trip.guideStatus==='not_published'?'Quản trị chưa cung cấp hướng dẫn. Bạn có thể gửi yêu cầu hỗ trợ cho đơn này.':'Hướng dẫn chỉ hiển thị cho đơn đã xác nhận hoặc hoàn tất.'}</Text>}
    <Pressable style={{minHeight:44,justifyContent:'center'}} onPress={()=>void query.refetch()}><Text style={{color:theme.colors.primary}}>Cập nhật tiến trình</Text></Pressable>
  </View>;
}
