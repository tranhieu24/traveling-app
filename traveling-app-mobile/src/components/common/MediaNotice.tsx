import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { MediaContext } from '../../types';

export function MediaNotice({context,compact=false}:{context?:MediaContext|null;compact?:boolean}) {
  if(!context)return null;
  return <View style={{paddingVertical:compact?4:12,gap:6}}>
    {context.contextLevel==='illustrative'&&<Text style={{fontSize:compact?10:12,lineHeight:compact?15:19,color:'#617483'}}>Ảnh địa điểm minh họa{!compact?' — chưa xác minh ảnh thực tế của chỗ ở.':''}</Text>}
    {!compact&&<><Text style={{fontSize:11,lineHeight:17,color:'#617483'}}>{context.attributionText}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(context.sourcePageUrl).catch(()=>{})} style={{minHeight:44,justifyContent:'center'}}><Text style={{fontSize:12,color:'#008A9A'}}>Xem nguồn ảnh</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(context.licenseUrl).catch(()=>{})} style={{minHeight:44,justifyContent:'center'}}><Text style={{fontSize:12,color:'#008A9A'}}>Giấy phép {context.licenseName}</Text></Pressable></View></>}
  </View>;
}
