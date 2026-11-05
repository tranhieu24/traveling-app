import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../preferences/ui';
import React,{useEffect,useRef,useState} from 'react';
import { ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getCapturedRecoveryCallback } from '../config/auth';
import { createPasswordRecovery } from '../services/passwordRecovery';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
const recovery=createPasswordRecovery(supabase.auth);
export function ForgotPasswordScreen(){
  useUiPreferences();return <RecoveryForm/>;}
export function ResetPasswordScreen(){
  useUiPreferences();return <RecoveryForm reset/>;}
function RecoveryForm({reset=false}:{reset?:boolean}) {
  useUiPreferences();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{signOut}=useAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[done,setDone]=useState(false);
  const lock=useRef(false),urlRef=useRef<string|null>(null);
  useEffect(()=>{
    if(!reset)return;let alive=true;
    const open=async()=>{setBusy(true);try{
      if(!urlRef.current)urlRef.current=getCapturedRecoveryCallback()||(Platform.OS==='web'?window.location.href:await Linking.getInitialURL());
      if(Platform.OS==='web')window.history.replaceState({},'',window.location.pathname);
      if(!urlRef.current)throw new Error('Thiếu liên kết khôi phục. Vui lòng gửi yêu cầu mới.');
      await recovery.open(urlRef.current);if(alive)setReady(true);
    }catch(e){if(alive)setNotice(e instanceof Error?e.message:'Không mở được liên kết.');}finally{if(alive)setBusy(false);}};
    void open();return()=>{alive=false;};
  },[reset]);
  const submit=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setNotice('');try{
    if(reset){if(!ready)throw new Error('Vui lòng mở liên kết khôi phục hợp lệ.');if(password!==confirm)throw new Error('Hai mật khẩu chưa khớp.');const result=await recovery.update(password);if(!result.signedOut)await signOut();setPassword('');setConfirm('');setReady(false);setDone(true);setNotice('Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.');}
    else {setNotice(await recovery.request(email));setDone(true);}
  }catch(e){setNotice(e instanceof Error?e.message:'Chưa hoàn tất. Vui lòng thử lại.');}finally{lock.current=false;setBusy(false);}};
  return <SafeAreaView style={uiStyle({flex:1,backgroundColor:'#fff'})}><KeyboardAvoidingView style={uiStyle({flex:1})} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={uiStyle(s.page)}>
    <Text style={uiTextStyle(s.title)}>{reset ? uiText('Đặt lại mật khẩu') : uiText('Quên mật khẩu')}</Text>
    {!done&&(!reset?<><Text style={uiTextStyle(undefined)}>{uiText("Nhập email tài khoản để yêu cầu liên kết khôi phục.")}</Text><TextInput accessibilityLabel={uiText("Email khôi phục")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={uiStyle(s.input)} editable={!busy}/></>:ready?<><Text style={uiTextStyle(undefined)}>{uiText("Mật khẩu mới từ 8 đến 128 ký tự.")}</Text><TextInput accessibilityLabel={uiText("Mật khẩu mới")} secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} maxLength={128} style={uiStyle(s.input)} editable={!busy}/><TextInput accessibilityLabel={uiText("Nhập lại mật khẩu mới")} secureTextEntry value={confirm} onChangeText={setConfirm} maxLength={128} style={uiStyle(s.input)} editable={!busy}/></>:null)}
    {busy&&<ActivityIndicator/>}{!!notice&&<Text accessibilityRole="alert" style={uiTextStyle(undefined)}>{uiText(notice)}</Text>}
    {!done&&(!reset||ready)&&<Pressable disabled={busy} style={uiStyle(s.button)} onPress={()=>void submit()}><Text style={uiTextStyle(s.white)}>{reset ? uiText('Lưu mật khẩu mới') : uiText('Gửi liên kết khôi phục')}</Text></Pressable>}
    {reset&&!ready&&!busy&&!done&&<Pressable style={uiStyle(s.link)} onPress={()=>nav.replace('ForgotPassword')}><Text style={uiTextStyle(undefined)}>{uiText("Gửi liên kết mới")}</Text></Pressable>}
    <Pressable disabled={busy} style={uiStyle(s.link)} onPress={()=>nav.replace('Login')}><Text style={uiTextStyle(undefined)}>{uiText("Quay lại đăng nhập")}</Text></Pressable>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const s=StyleSheet.create({page:{padding:24,gap:18,width:'100%',maxWidth:520,alignSelf:'center',paddingTop:50},title:{fontSize:25,fontWeight:'700'},input:{borderWidth:1,borderColor:'#DCE5EA',borderRadius:10,minHeight:48,padding:12,fontSize:16},button:{minHeight:48,padding:12,borderRadius:10,backgroundColor:'#008A9A',alignItems:'center',justifyContent:'center'},white:{color:'#fff',fontWeight:'600'},link:{minHeight:44,justifyContent:'center'}});
