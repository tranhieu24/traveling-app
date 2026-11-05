import { uiLocale, useUiPreferences, uiStyle, uiTextStyle, uiText, uiColor } from '../../preferences/ui';

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { addIsoDays, isoToday } from '../../utils/checkout';
import { validateSearchDates } from '../../utils/search';
import { CYAN } from './SearchControls';

export const DateRangeCalendar = ({
  checkIn,
  checkOut,
  onChange,
  onError,
}: {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (start: string, end: string | null) => void;
  onError: (message: string) => void;
}) => {
  useUiPreferences();
  const today = isoToday();
  const [month, setMonth] = useState(
    () => (checkIn && checkIn >= today ? checkIn : today).slice(0, 7) + '-01'
  );
  const date = new Date(month + 'T00:00:00Z');
  const offset = (date.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const move = (amount: number) =>
    setMonth(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
        .toISOString()
        .slice(0, 10)
    );
  const select = (day: string) => {
    onError('');
    if (!checkIn || checkOut) {
      onChange(day, null);
      return;
    }
    try {
      validateSearchDates(checkIn, day);
      onChange(checkIn, day);
    } catch (error) {
      onError((error as Error).message);
    }
  };
  return (
    <View>
      <View style={uiStyle(s.monthRow)}>
        <Text style={uiTextStyle(s.month)}>
          {uiText(date.toLocaleDateString(uiLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("Tháng trước")}
          disabled={month.slice(0, 7) <= today.slice(0, 7)}
          onPress={() => move(-1)}
          style={uiStyle(s.arrow)}
        >
          <ChevronLeft color={uiColor("#737983")} size={21} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uiText("Tháng sau")}
          onPress={() => move(1)}
          style={uiStyle(s.arrow)}
        >
          <ChevronRight color={uiColor("#737983")} size={21} />
        </Pressable>
      </View>
      <View style={uiStyle(s.grid)}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
          <Text key={day} style={uiTextStyle(s.weekday)}>
            {uiText(day)}
          </Text>
        ))}
      </View>
      <View style={uiStyle(s.grid)}>
        {Array.from({ length: cells }, (_, index) => {
          const day = addIsoDays(month, index - offset),
            outside = day.slice(0, 7) !== month.slice(0, 7),
            disabled = day < today;
          const endpoint = day === checkIn || day === checkOut;
          const inside = !!checkIn && !!checkOut && day > checkIn && day < checkOut;
          return (
            <View key={day} style={uiStyle([s.cell, inside && { backgroundColor: '#E0F9FC' }])}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText(`Chọn ngày ${day}`)}
                accessibilityState={{ selected: endpoint, disabled }}
                aria-selected={endpoint}
                disabled={disabled}
                onPress={() => select(day)}
                style={uiStyle([s.day, endpoint && { backgroundColor: CYAN }])}
              >
                <Text
                  style={uiTextStyle([
                    s.dayText,
                    (outside || disabled) && { color: '#C6CBD1' },
                    endpoint && { color: 'white' },
                  ])}
                >
                  {uiText(Number(day.slice(8)))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={uiTextStyle(s.hint)}>
        {!checkIn || checkOut ? uiText('Chọn ngày nhận phòng') : uiText('Chọn ngày trả phòng sau ngày nhận phòng')}
      </Text>
    </View>
  );
};
const s = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  month: { flex: 1, fontSize: 22, fontWeight: '700', color: '#30343A' },
  arrow: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.285714%',
    fontSize: 12,
    color: CYAN,
    textAlign: 'center',
    paddingBottom: 12,
  },
  cell: { width: '14.285714%', alignItems: 'center', marginVertical: 2 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: '#30343A' },
  hint: { color: '#93979F', fontSize: 12, marginTop: 10 },
});
