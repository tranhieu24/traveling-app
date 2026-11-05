import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../preferences/ui';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SupportCenter } from './SupportScreen';
import { NotificationsScreen } from './NotificationsScreen';

export function InboxScreen() {
  useUiPreferences();
  const [section, setSection] = useState<'notifications' | 'support'>('notifications');
  return <SafeAreaView style={uiStyle(s.screen)} edges={['top', 'left', 'right']}>
    <View style={uiStyle(s.tabs)}>
      {(['notifications', 'support'] as const).map(value => <Pressable key={value} accessibilityRole="tab"
        accessibilityState={{ selected: section === value }} onPress={() => setSection(value)} style={uiStyle([s.tab, section === value && s.active])}>
        <Text style={uiTextStyle([s.label, section === value && s.activeLabel])}>{value === 'notifications' ? uiText('Thông báo') : uiText('Yêu cầu hỗ trợ')}</Text>
      </Pressable>)}
    </View>
    {section === 'notifications' ? <NotificationsScreen embedded /> : <SupportCenter embedded />}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' }, tabs: { flexDirection: 'row', gap: 6, marginHorizontal: 18, marginTop: 12, marginBottom: 4, padding: 5, backgroundColor: '#F1F6F7', borderRadius: 14 },
  tab: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, active: { backgroundColor: '#FFFFFF' },
  label: { fontSize: 13, fontWeight: '600', color: '#84959D' }, activeLabel: { color: '#008B9C' },
});
