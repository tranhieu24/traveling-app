import { useUiPreferences, uiText, uiStyle, uiColor, uiTextStyle } from '../../preferences/ui';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { useUnreadNotifications } from '../../hooks/useNotifications';

export function NotificationBell() {
  useUiPreferences();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: count } = useUnreadNotifications();
  return <Pressable accessibilityRole="button" accessibilityLabel={count ? uiText(`Thông báo, ${count} chưa đọc`) : uiText('Mở thông báo')}
    style={uiStyle(s.button)} onPress={() => nav.navigate('Notifications')}>
    <Bell size={22} color={uiColor("#31454F")} strokeWidth={1.8} />
    {!!count && <View style={uiStyle(s.badge)}><Text style={uiTextStyle(s.count)}>{count > 99 ? uiText('99+') : uiText(count)}</Text></View>}
  </Pressable>;
}
const s = StyleSheet.create({
  button: { width: 44, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE9EC' },
  badge: { position: 'absolute', top: 1, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F06471', borderWidth: 1, borderColor: '#FFFFFF' },
  count: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
});
