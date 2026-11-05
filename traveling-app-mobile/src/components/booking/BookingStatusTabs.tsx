import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { uiStyle, uiText, uiTextStyle, useUiPreferences } from '../../preferences/ui';

export type BookingFilter = 'all' | 'confirmed' | 'pending' | 'cancelled';
const options: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'pending', label: 'Chờ thanh toán' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export function BookingStatusTabs({ selected, onChange }: { selected: BookingFilter; onChange: (status: BookingFilter) => void }) {
  useUiPreferences();
  return <View style={uiStyle(s.bar)}>
    {options.map(option => {
      const active = selected === option.key;
      return <Pressable key={option.key} cssInterop={false} accessibilityRole="tab"
        accessibilityLabel={uiText(option.label)} accessibilityState={{ selected: active }} aria-selected={active}
        onPress={() => onChange(option.key)} style={uiStyle([s.tab, active && s.activeTab])}>
        <Text style={uiTextStyle([s.label, active && s.activeLabel])}>{uiText(option.label)}</Text>
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, minHeight: 44, paddingHorizontal: 3, paddingVertical: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  activeTab: { backgroundColor: '#FFFFFF', borderColor: '#CBEAF0' },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  activeLabel: { fontWeight: '700', color: '#00BCD4' },
});
