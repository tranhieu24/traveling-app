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
      <View style={s.monthRow}>
        <Text style={s.month}>
          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          disabled={month.slice(0, 7) <= today.slice(0, 7)}
          onPress={() => move(-1)}
          style={s.arrow}
        >
          <ChevronLeft color="#737983" size={21} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => move(1)}
          style={s.arrow}
        >
          <ChevronRight color="#737983" size={21} />
        </Pressable>
      </View>
      <View style={s.grid}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <Text key={day} style={s.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={s.grid}>
        {Array.from({ length: cells }, (_, index) => {
          const day = addIsoDays(month, index - offset),
            outside = day.slice(0, 7) !== month.slice(0, 7),
            disabled = day < today;
          const endpoint = day === checkIn || day === checkOut;
          const inside = !!checkIn && !!checkOut && day > checkIn && day < checkOut;
          return (
            <View key={day} style={[s.cell, inside && { backgroundColor: '#E0F9FC' }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${day}`}
                accessibilityState={{ selected: endpoint, disabled }}
                aria-selected={endpoint}
                disabled={disabled}
                onPress={() => select(day)}
                style={[s.day, endpoint && { backgroundColor: CYAN }]}
              >
                <Text
                  style={[
                    s.dayText,
                    (outside || disabled) && { color: '#C6CBD1' },
                    endpoint && { color: 'white' },
                  ]}
                >
                  {Number(day.slice(8))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={s.hint}>
        {!checkIn || checkOut ? 'Choose your check-in date' : 'Choose a later check-out date'}
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
