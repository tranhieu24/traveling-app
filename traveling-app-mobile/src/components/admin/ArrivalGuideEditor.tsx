import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';
import React,{useEffect,useRef,useState} from 'react';
import { ActivityIndicator,Text,TextInput,View } from 'react-native';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { getTrip } from '../../services/guestSupport';
import { apiClient } from '../../services/apiClient';
import { adminError } from '../../utils/admin';
import { AdminButton,a } from './AdminUI';
export function ArrivalGuideEditor({bookingId,userId,editable}:{bookingId:string;userId:string;editable:boolean}) {
  useUiPreferences();
  const cache=useQueryClient();
  const query=useQuery({queryKey:['trip',bookingId,userId],queryFn:({signal})=>getTrip(bookingId,signal),retry:false});
  const [instructions,setInstructions]=useState(''),[contact,setContact]=useState(''),[revision,setRevision]=useState(0),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');const lock=useRef(false);
  useEffect(()=>{if(query.data&&!dirty){setInstructions(query.data.arrivalGuide?.instructions||'');setContact(query.data.arrivalGuide?.contact||'');setRevision(query.data.arrivalGuide?.revision||0);}},[query.data,dirty]);
  const save=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setNotice('');try{const {data}=await apiClient.put(`/admin/bookings/${bookingId}/arrival-guide`,{instructions:instructions.trim(),contact:contact.trim(),revision});if(!data.success)throw new Error('Chưa lưu được hướng dẫn.');setRevision(data.data.revision);await query.refetch();setDirty(false);await cache.invalidateQueries({queryKey:['trip',bookingId]});setNotice('Đã lưu. Chủ đơn đủ điều kiện có thể xem hướng dẫn.');}catch(e){setNotice(adminError(e));}finally{lock.current=false;setBusy(false);}};
  return <View style={uiStyle({gap:10,marginTop:16})}><Text style={uiTextStyle(a.modalTitle)}>{uiText("Hướng dẫn nhận phòng")}</Text><Text style={uiTextStyle(a.muted)}>{uiText("Chỉ nhập thông tin do cơ sở cung cấp và đã kiểm tra. Không hiển thị ở trang phòng công khai.")}</Text>
    {query.isLoading?<ActivityIndicator/>:query.isError?<><Text style={uiTextStyle(undefined)}>{uiText(adminError(query.error))}</Text><AdminButton title={uiText("Tải lại")} onPress={()=>void query.refetch()}/></>:<>
      <TextInput accessibilityLabel={uiText("Hướng dẫn nhận phòng")} value={instructions} onChangeText={v=>{setInstructions(v);setDirty(true);}} maxLength={5000} multiline editable={editable&&!busy} style={uiStyle({borderWidth:1,borderColor:'#DCE5EA',padding:12,minHeight:120,textAlignVertical:'top',borderRadius:8})}/>
      <TextInput accessibilityLabel={uiText("Liên hệ nhận phòng")} placeholder={uiText("Liên hệ đã được cơ sở xác nhận (không bắt buộc)")} value={contact} onChangeText={v=>{setContact(v);setDirty(true);}} maxLength={300} editable={editable&&!busy} style={uiStyle({borderWidth:1,borderColor:'#DCE5EA',padding:12,minHeight:48,borderRadius:8})}/>
      {editable?<><AdminButton title={busy ? uiText('Đang lưu...') : uiText('Lưu hướng dẫn')} disabled={busy||instructions.trim().length<10} onPress={()=>void save()}/><AdminButton title={uiText("Bỏ bản sửa và tải lại")} variant="secondary" disabled={busy} onPress={()=>{setDirty(false);void query.refetch();}}/></>:<Text style={uiTextStyle(a.muted)}>{uiText("Chỉ sửa hướng dẫn khi đơn đã xác nhận.")}</Text>}
    </>}{!!notice&&<Text accessibilityRole="alert" style={uiTextStyle(undefined)}>{uiText(notice)}</Text>}
  </View>;
}
