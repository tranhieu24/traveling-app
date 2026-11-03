import React,{useEffect,useRef,useState} from 'react';
import { ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation,useRoute,RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { sendSupport,supportLabels,SupportTicket,SupportDetail,SupportStatus,Page } from '../services/guestSupport';
import { paymentErrorMessage } from '../services/bookingPayment';
import { RootStackParamList } from '../types';
import { theme } from '../theme/tokens';

export function SupportCenter({admin=false,bookingId,embedded=false}:{admin?:boolean;bookingId?:string;embedded?:boolean}) {
  const {user,isLoading:authLoading}=useAuth(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),cache=useQueryClient();
  const [selected,setSelected]=useState<string|null>(null),[page,setPage]=useState(1),[messagePage,setMessagePage]=useState(1),[subject,setSubject]=useState(''),[body,setBody]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const lock=useRef(false);const base=admin?'/admin/support-tickets':'/support-tickets';
  const allowed=!!user&&(!admin||user.role==='admin');
  useEffect(()=>{setSelected(null);setSubject('');setBody('');setNotice('');setPage(1);setMessagePage(1);},[user?.id,bookingId,admin]);
  const list=useQuery<{items:SupportTicket[];pagination:Page}>({queryKey:['support',user?.id,admin,bookingId,page],enabled:allowed,queryFn:async({signal})=>{const {data}=await apiClient.get(base,{signal,params:{page,limit:12,bookingId}});if(!data.success)throw new Error('Chưa tải được hỗ trợ.');return {items:data.data,pagination:data.pagination};}});
  const detail=useQuery<SupportDetail>({queryKey:['support_detail',user?.id,admin,selected,messagePage],enabled:allowed&&!!selected,queryFn:async({signal})=>{const {data}=await apiClient.get(base+'/'+selected,{signal,params:{page:messagePage,limit:20}});if(!data.success)throw new Error('Chưa tải được nội dung.');return data.data;}});
  const refresh=async()=>{await cache.invalidateQueries({queryKey:['support',user?.id]});await cache.invalidateQueries({queryKey:['support_detail',user?.id]});};
  const submit=async(status?:SupportStatus)=>{
    if(lock.current||!user||!allowed)return;lock.current=true;setBusy(true);setNotice('');
    try {
      if(status&&selected&&admin)await apiClient.patch(base+'/'+selected+'/status',{status});
      else {
        if(!body.trim()||body.trim().length>3000)throw new Error('Nhập nội dung từ 1 đến 3000 ký tự.');
        if(!selected&&(!bookingId||subject.trim().length<3))throw new Error('Chọn đơn và nhập tiêu đề ít nhất 3 ký tự.');
        const result=await sendSupport(user.id,selected?base+'/'+selected+'/messages':base,selected?{body:body.trim()}:{bookingId,subject:subject.trim(),body:body.trim()});
        if(!selected){setSelected(result.id);setMessagePage(1);}else if(detail.data)setMessagePage(Math.ceil((detail.data.pagination.total+1)/20));
        setBody('');setSubject('');
      }
      setNotice('Đã lưu yêu cầu trên hệ thống.');await refresh();
    }catch(e){setNotice(paymentErrorMessage(e));}finally{lock.current=false;setBusy(false);}
  };
  const button=(title:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled||busy} onPress={onPress} style={[s.button,(disabled||busy)&&{opacity:0.5}]}><Text style={s.buttonText}>{title}</Text></Pressable>;
  return <SafeAreaView style={s.screen} edges={['top','left','right']}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
    {!embedded&&button('Quay lại',()=>{if(nav.canGoBack())nav.goBack();else if(admin)nav.navigate('AdminPortal');else nav.navigate('MainTabs');})}
    <Text accessibilityRole="header" style={s.title}>{admin?'Quản lý yêu cầu hỗ trợ':'Hỗ trợ chuyến đi'}</Text>
    <Text style={s.muted}>Yêu cầu gắn với đơn đặt phòng. Đây là hộp thư hỗ trợ, không phải chat trực tiếp.</Text>
    {authLoading?<ActivityIndicator/>:!allowed?<><Text>{admin?'Bạn cần tài khoản quản trị.':'Đăng nhập để xem yêu cầu của bạn.'}</Text>{button('Đăng nhập',()=>{if(admin)nav.navigate('AdminLogin');else nav.navigate('Login');})}</>:<>
      {selected?<>
        {button('Danh sách yêu cầu',()=>{setSelected(null);setMessagePage(1);setBody('');setNotice('');})}
        {detail.isLoading?<ActivityIndicator/>:detail.isError?<><Text>Chưa tải được yêu cầu hoặc bạn không còn quyền xem.</Text>{button('Thử lại',()=>void detail.refetch())}</>:detail.data&&<>
          <Text style={s.heading}>{detail.data.ticket.subject}</Text><Text>{detail.data.ticket.booking_code} · {supportLabels[detail.data.ticket.status]}</Text>
          {detail.data.messages.map(m=><View key={m.id} style={[s.card,m.author_role==='admin'&&{backgroundColor:theme.colors.primarySoft}]}><Text style={{fontWeight:'700'}}>{m.author_role==='admin'?'Bộ phận hỗ trợ':'Khách đặt phòng'}</Text><Text selectable>{m.body}</Text><Text style={s.muted}>{new Date(m.created_at).toLocaleString('vi-VN')}</Text></View>)}
          <View style={s.row}>{button('Tin trước',()=>setMessagePage(p=>p-1),messagePage<=1)}<Text>Trang {messagePage}/{Math.max(1,detail.data.pagination.totalPages)}</Text>{button('Tin sau',()=>setMessagePage(p=>p+1),messagePage>=detail.data.pagination.totalPages)}</View>
          {admin&&<View style={s.row}>{button('Đánh dấu đã xử lý',()=>void submit('resolved'))}{button('Mở lại',()=>void submit('open'))}</View>}
          <Text style={s.heading}>Phản hồi</Text><TextInput accessibilityLabel="Nội dung phản hồi" multiline maxLength={3000} style={[s.input,s.body]} value={body} onChangeText={setBody} editable={!busy}/>{button('Gửi phản hồi',()=>void submit(),!body.trim())}
        </>}
      </>:<>
        {list.isLoading?<ActivityIndicator/>:list.isError?<><Text>Chưa tải được danh sách yêu cầu.</Text>{button('Thử lại',()=>void list.refetch())}</>:<>
          {!list.data?.items.length&&<Text>Chưa có yêu cầu hỗ trợ.</Text>}
          {list.data?.items.map(t=><Pressable key={t.id} style={s.card} onPress={()=>{setSelected(t.id);setMessagePage(1);setBody('');setNotice('');}}><Text style={s.heading}>{t.subject}</Text><Text>{t.booking_code} · {t.listing_title}</Text><Text>{supportLabels[t.status]}</Text></Pressable>)}
          <View style={s.row}>{button('Trang trước',()=>setPage(p=>p-1),page<=1)}<Text>Trang {page}</Text>{button('Trang sau',()=>setPage(p=>p+1),page>=(list.data?.pagination.totalPages||1))}</View>
        </>}
        {!admin&&(bookingId?<><Text style={s.heading}>Tạo yêu cầu cho đơn này</Text><TextInput accessibilityLabel="Tiêu đề yêu cầu" placeholder="Ví dụ: Cần hướng dẫn nhận phòng" maxLength={150} style={s.input} value={subject} onChangeText={setSubject} editable={!busy}/><TextInput accessibilityLabel="Nội dung yêu cầu" placeholder="Mô tả vấn đề cần hỗ trợ" multiline maxLength={3000} style={[s.input,s.body]} value={body} onChangeText={setBody} editable={!busy}/>{button('Gửi yêu cầu',()=>void submit(),subject.trim().length<3||!body.trim())}</>:button('Chọn đơn cần hỗ trợ',()=>nav.navigate('MainTabs',{screen:'BookingsTab'})))}
      </>}
      {busy&&<ActivityIndicator/>}{!!notice&&<Text accessibilityRole="alert">{notice}</Text>}{button('Cập nhật hộp thư',()=>void refresh())}
    </>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function SupportScreen(){const route=useRoute<RouteProp<RootStackParamList,'Support'>>();return <SupportCenter bookingId={route.params?.bookingId}/>;}
export function AdminSupportScreen(){return <SupportCenter admin/>;}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff'},content:{width:'100%',maxWidth:800,alignSelf:'center',padding:20,gap:14,paddingBottom:40},title:{fontSize:24,fontWeight:'700',color:theme.colors.ink},heading:{fontSize:16,fontWeight:'600'},muted:{fontSize:12,lineHeight:19,color:theme.colors.muted},card:{padding:16,borderRadius:12,backgroundColor:theme.colors.background,gap:8},input:{borderWidth:1,borderColor:theme.colors.border,borderRadius:10,padding:12,minHeight:48,fontSize:16},body:{minHeight:120,textAlignVertical:'top'},button:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:8,backgroundColor:theme.colors.primarySoft},buttonText:{color:theme.colors.primary,fontWeight:'600'},row:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center'}});
