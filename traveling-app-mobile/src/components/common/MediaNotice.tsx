import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { MediaContext } from '../../types';

export function MediaNotice({context,compact=false}:{context?:MediaContext|null;compact?:boolean}) {
  useUiPreferences();
  if(!context)return null;
  return <View style={uiStyle({paddingVertical:compact?4:12,gap:6})}>
    {context.contextLevel==='illustrative'&&<Text style={uiTextStyle({fontSize:compact?10:12,lineHeight:compact?15:19,color:'#617483'})}>{uiText("Ảnh địa điểm minh họa")}{!compact ? uiText(' — chưa xác minh ảnh thực tế của chỗ ở.') : uiText('')}</Text>}
    {!compact&&<><Text style={uiTextStyle({fontSize:11,lineHeight:17,color:'#617483'})}>{uiText(context.attributionText)}</Text><View style={uiStyle({flexDirection:'row',flexWrap:'wrap',gap:16})}><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(context.sourcePageUrl).catch(()=>{})} style={uiStyle({minHeight:44,justifyContent:'center'})}><Text style={uiTextStyle({fontSize:12,color:'#008A9A'})}>{uiText("Xem nguồn ảnh")}</Text></Pressable><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(context.licenseUrl).catch(()=>{})} style={uiStyle({minHeight:44,justifyContent:'center'})}><Text style={uiTextStyle({fontSize:12,color:'#008A9A'})}>{uiText("Giấy phép ")}{uiText(context.licenseName)}</Text></Pressable></View></>}
  </View>;
}
