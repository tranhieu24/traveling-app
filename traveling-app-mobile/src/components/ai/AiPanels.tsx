import { uiLocale, useUiPreferences, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';

import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import axios from 'axios';
import {useAuth} from '../../context/AuthContext';
import {RootStackParamList} from '../../types';
import {aiSearch,aiHelp,AiFilters,AiSearchResult,AiHelpResult} from '../../services/ai';
import {ListingCard} from '../common/ListingCard';

function useAiRequest<T>() {
  const {user,token}=useAuth();
  const [result,setResult]=useState<T|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>{pending.current?.abort();pending.current=null;setResult(null);setError('');setBusy(false);return()=>{pending.current?.abort();pending.current=null;};},[user?.id,token]);
  const run=async(fn:(signal:AbortSignal)=>Promise<T>)=>{
    if(pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');setResult(null);
    try{const data=await fn(controller.signal);if(!controller.signal.aborted)setResult(data);}
    catch(err){if(!controller.signal.aborted)setError(axios.isAxiosError(err)?err.response?.data?.error?.message||'Không kết nối được. Hãy thử lại hoặc tiếp tục thủ công.':'Không xử lý được yêu cầu. Hãy thử lại.');}
    finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
  };
  return {result,busy,error,run,clear:()=>{pending.current?.abort();pending.current=null;setResult(null);setError('');setBusy(false);}};
}
function Action({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}) {
  useUiPreferences();
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={uiStyle([s.button,disabled&&{opacity:0.5}])}><Text style={uiTextStyle(s.buttonText)}>{uiText(title)}</Text></Pressable>;
}
export function AiSearchPanel({onApply}:{onApply:(filters:AiFilters)=>void}) {
  useUiPreferences();
  const [message,setMessage]=useState('');const {result,busy,error,run,clear}=useAiRequest<AiSearchResult>();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const filters=result?.filters;
  return <View style={uiStyle(s.panel)}>
    <Text accessibilityRole="header" style={uiTextStyle(s.title)}>{uiText("Tìm chỗ ở với AI")}</Text>
    <Text style={uiTextStyle(s.muted)}>{uiText("Mô tả điểm đến, ngày, số khách và ngân sách USD mỗi đêm. Không nhập thông tin cá nhân.")}</Text>
    <TextInput accessibilityLabel={uiText("Nhu cầu tìm chỗ ở bằng AI")} placeholder={uiText("Homestay Đà Lạt, 2 khách, cuối tuần này, dưới 100 USD/đêm, có chỗ đỗ xe")} multiline maxLength={800} value={message} onChangeText={value=>{setMessage(value);clear();}} editable={!busy} style={uiStyle(s.input)}/>
    <Action title={busy ? uiText('Đang hiểu yêu cầu…') : uiText('Gợi ý bộ lọc')} disabled={busy||message.trim().length<3} onPress={()=>void run(signal=>aiSearch(message,signal))}/>
    {busy&&<ActivityIndicator accessibilityLabel={uiText("Đang xử lý tìm kiếm AI")}/>}
    {!!error&&<Text accessibilityRole="alert" style={uiTextStyle(s.error)}>{uiText(error)}</Text>}
    {result&&<View style={uiStyle(s.results)}>
      <Text accessibilityLiveRegion="polite" style={uiTextStyle(s.body)}>{uiText(result.message)}</Text>
      {result.questions.map(q=><Text key={q} style={uiTextStyle(s.body)}>{uiText("• ")}{uiText(q)}</Text>)}
      {result.notes.map(note=><Text key={note} style={uiTextStyle(s.muted)}>{uiText(note)}</Text>)}
      {filters&&<View style={uiStyle(s.chips)}>
        {[filters.city,filters.propertyType,filters.checkIn&&`${filters.checkIn} → ${filters.checkOut}`,filters.guests&&`${filters.guests} khách`,filters.maxPrice!=null&&`Tối đa ${filters.maxPrice} USD/đêm`,filters.amenityIds.length>0&&`${filters.amenityIds.length} tiện nghi bắt buộc`].filter(Boolean).map(label=><Text key={String(label)} style={uiTextStyle(s.chip)}>{uiText(label)}</Text>)}
      </View>}
      {result.ready&&filters&&<>
        <Action title={uiText("Xem và sửa bộ lọc này")} onPress={()=>onApply(filters)}/>
        <Text style={uiTextStyle(s.muted)}>{uiText("Có ")}{uiText(result.total)}{uiText(" chỗ ở phù hợp. Giá/phòng trống lấy lúc ")}{uiText(new Date(result.fetchedAt).toLocaleTimeString(uiLocale()))}{uiText("; cần báo giá lại trước khi đặt.")}</Text>
        {result.items.map(item=><ListingCard key={item.id} listing={item} onPress={()=>{onApply(filters);nav.navigate('ListingDetail',{listingId:item.id});}}/>)}
      </>}
    </View>}
    <Text style={uiTextStyle(s.muted)}>{uiText("Bạn luôn có thể dùng các mục địa điểm, ngày và số khách bên dưới để tìm thủ công.")}</Text>
  </View>;
}
export function AiHelpPanel({bookingId,onArticle}:{bookingId?:string;onArticle?:(id:string)=>void}) {
  useUiPreferences();
  const [message,setMessage]=useState('');const {result,busy,error,run,clear}=useAiRequest<AiHelpResult>();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(()=>{clear();setMessage('');},[bookingId]);
  return <View style={uiStyle(s.panel)}>
    <Text accessibilityRole="header" style={uiTextStyle(s.title)}>{bookingId ? uiText('Giải thích trạng thái đơn') : uiText('Trợ giúp với AI')}</Text>
    <Text style={uiTextStyle(s.muted)}>{bookingId ? uiText('Đọc số liệu mới nhất của đơn này. Mọi thao tác thanh toán/hủy do bạn xác nhận ở màn giao dịch.') : uiText('AI tìm bài trợ giúp phù hợp; câu trả lời trích từ FAQ của app. Không nhập mật khẩu hoặc thông tin cá nhân.')}</Text>
    {!bookingId&&<TextInput accessibilityLabel={uiText("Câu hỏi cho trợ giúp AI")} placeholder={uiText("Hủy đặt chỗ có được hoàn tiền không?")} multiline value={message} maxLength={800} editable={!busy} onChangeText={value=>{setMessage(value);clear();}} style={uiStyle(s.input)}/>}
    <Action title={busy ? uiText('Đang lấy thông tin…') : bookingId ? uiText('Xem trạng thái và số tiền') : uiText('Tìm câu trả lời')} disabled={busy||(!bookingId&&message.trim().length<3)} onPress={()=>void run(signal=>aiHelp(bookingId?'Trạng thái thanh toán và hoàn tiền của đơn này':message,bookingId,signal))}/>
    {busy&&<ActivityIndicator/>}
    {!!error&&<Text accessibilityRole="alert" style={uiTextStyle(s.error)}>{uiText(error)}</Text>}
    {result&&<View style={uiStyle(s.results)}>
      <Text style={uiTextStyle(s.muted)}>{result.mode==='data' ? uiText('Dữ liệu trực tiếp từ hệ thống') : result.mode==='ai' ? uiText('AI chọn bài — nội dung từ FAQ') : uiText('Tra cứu FAQ dự phòng')}</Text>
      {!!result.reason&&<Text style={uiTextStyle(s.muted)}>{uiText(result.reason)}</Text>}
      <Text accessibilityLiveRegion="polite" style={uiTextStyle(s.body)}>{uiText(result.answer)}</Text>
      {result.sourceRefs.map(ref=><Action key={ref.type+ref.id} title={uiText(ref.title)} onPress={()=>{
        if(ref.type==='booking')nav.navigate('BookingDetail',{bookingId:ref.id});
        else if(ref.type==='listing')nav.navigate('ListingDetail',{listingId:ref.id});
        else if(onArticle)onArticle(ref.id);else nav.navigate('HelpCenter',{articleId:ref.id});
      }} />)}
      <Text style={uiTextStyle(s.muted)}>{uiText("Cập nhật: ")}{uiText(new Date(result.fetchedAt).toLocaleString(uiLocale()))}</Text>
      <Action title={uiText("Mở hỗ trợ")} onPress={()=>bookingId?nav.navigate('Support',{bookingId}):nav.navigate('MainTabs',{screen:'BookingsTab'})}/>
    </View>}
  </View>;
}
const s=StyleSheet.create({
  panel:{padding:16,gap:12,borderWidth:1,borderColor:'#C4E8EA',backgroundColor:'#F0FBFC',borderRadius:16,marginVertical:12},
  title:{fontSize:18,fontWeight:'700',color:'#243F48'},muted:{fontSize:12,lineHeight:19,color:'#526C76'},body:{fontSize:14,lineHeight:22,color:'#243F48'},
  input:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#BCCED3',borderRadius:10,padding:12,minHeight:82,textAlignVertical:'top',fontSize:14,color:'#243F48'},
  button:{padding:12,minHeight:44,borderRadius:9,backgroundColor:'#007C8A',alignItems:'center'},buttonText:{fontSize:14,fontWeight:'600',color:'#FFF'},
  error:{color:'#B3261E',fontSize:13},results:{gap:12},chips:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{padding:7,borderRadius:8,backgroundColor:'#D9F1F3',color:'#24444C',fontSize:12},
});
