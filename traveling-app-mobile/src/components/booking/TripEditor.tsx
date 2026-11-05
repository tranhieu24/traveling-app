import { uiLocale, useUiPreferences, uiStyle, uiTextStyle, uiText, uiColor } from '../../preferences/ui';

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react-native';
import { addIsoDays, formatTripDates, isIsoDate, isoToday, validateTrip } from '../../utils/checkout';

export interface TripDraft { checkInDate: string; checkOutDate: string; adults: number; children: number }
interface Props {
  mode: 'dates' | 'guests' | null;
  trip: TripDraft;
  maxGuests: number;
  onClose: () => void;
  onApply: (trip: TripDraft) => Promise<void>;
}

export const TripEditor: React.FC<Props> = ({ mode, trip, maxGuests, onClose, onApply }) => {
  useUiPreferences();
  const [draft, setDraft] = useState(trip);
  const [displayMode, setDisplayMode] = useState<'dates' | 'guests'>('dates');
  const shownMode = mode || displayMode;
  const [month, setMonth] = useState(trip.checkInDate.slice(0, 7));
  const [activeDate, setActiveDate] = useState<'in' | 'out'>('in');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    if (!mode) return;
    setDisplayMode(mode);
    setDraft(trip);
    setMonth((isIsoDate(trip.checkInDate) ? trip.checkInDate : isoToday()).slice(0, 7));
    setActiveDate('in');
    setError('');
  }, [mode, trip.checkInDate, trip.checkOutDate, trip.adults, trip.children]);

  const year = Number(month.slice(0, 4)), monthIndex = Number(month.slice(5)) - 1;
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? `${month}-${String(day).padStart(2, '0')}` : null;
  });
  const monthTitle = new Date(`${month}-01T00:00:00Z`).toLocaleDateString(uiLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const moveMonth = (offset: number) => setMonth(new Date(Date.UTC(year, monthIndex + offset, 1)).toISOString().slice(0, 7));
  const chooseDate = (date: string) => {
    setError('');
    if (activeDate === 'in' || date <= draft.checkInDate) {
      setDraft((current) => ({ ...current, checkInDate: date, checkOutDate: '' }));
      setActiveDate('out');
    } else setDraft((current) => ({ ...current, checkOutDate: date }));
  };
  const save = async () => {
    if (pending.current) return;
    setError('');
    try { validateTrip(draft.checkInDate, draft.checkOutDate, draft.adults, draft.children, maxGuests); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hãy kiểm tra thông tin chuyến đi.'); return; }
    pending.current = true;
    setSaving(true);
    try { await onApply(draft); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể cập nhật chuyến đi. Vui lòng thử lại.'); }
    finally { pending.current = false; setSaving(false); }
  };

  return (
    <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => { if (!pending.current) onClose(); }}>
      <View style={uiStyle(styles.overlay)}>
        <View style={uiStyle(styles.sheet)} accessibilityViewIsModal>
          <View style={uiStyle(styles.heading)}>
            <Text accessibilityRole="header" style={uiTextStyle(styles.title)}>{shownMode === 'dates' ? uiText('Chỉnh sửa ngày') : uiText('Chỉnh sửa số khách')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={uiText("Đóng trình chỉnh sửa chuyến đi")} disabled={saving} onPress={onClose} style={uiStyle(styles.iconButton)}><X size={22} color={uiColor("#33383D")} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={uiStyle(styles.body)}>
            {shownMode === 'dates' ? (
              <>
                <View style={uiStyle(styles.dateFields)}>
                  {(['in', 'out'] as const).map((field) => (
                    <Pressable key={field} accessibilityRole="button" accessibilityLabel={field === 'in' ? uiText('Chọn ngày nhận phòng') : uiText('Chọn ngày trả phòng')} disabled={saving} onPress={() => setActiveDate(field)} style={uiStyle([styles.dateField, activeDate === field && styles.activeDate])}>
                      <Text style={uiTextStyle(styles.muted)}>{field === 'in' ? uiText('Nhận phòng') : uiText('Trả phòng')}</Text>
                      <Text style={uiTextStyle(styles.dateText)}>{uiText((field === 'in' ? draft.checkInDate : draft.checkOutDate) || 'Chọn ngày')}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={uiTextStyle(styles.calendarHint)}>{uiText("Chọn ngày ")}{activeDate === 'in' ? uiText('nhận phòng') : uiText('trả phòng')}{uiText(".")}</Text>
                <View style={uiStyle(styles.monthRow)}>
                  <Pressable accessibilityRole="button" accessibilityLabel={uiText("Tháng trước")} disabled={saving || month <= isoToday().slice(0, 7)} onPress={() => moveMonth(-1)} style={uiStyle([styles.iconButton, month <= isoToday().slice(0, 7) && styles.disabled])}><ChevronLeft size={22} color={uiColor("#33383D")} /></Pressable>
                  <Text style={uiTextStyle(styles.monthTitle)}>{uiText(monthTitle)}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={uiText("Tháng sau")} disabled={saving} onPress={() => moveMonth(1)} style={uiStyle(styles.iconButton)}><ChevronRight size={22} color={uiColor("#33383D")} /></Pressable>
                </View>
                <View style={uiStyle(styles.calendar)}>
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label, index) => <View key={`week-${index}`} style={uiStyle(styles.dayCell)}><Text style={uiTextStyle(styles.weekday)}>{uiText(label)}</Text></View>)}
                  {cells.map((date, index) => {
                    if (!date) return <View key={`empty-${index}`} style={uiStyle(styles.dayCell)} />;
                    const selected = date === draft.checkInDate || date === draft.checkOutDate;
                    const between = !!draft.checkOutDate && date > draft.checkInDate && date < draft.checkOutDate;
                    const disabled = saving || date < isoToday() || (activeDate === 'out' && date > addIsoDays(draft.checkInDate, 365));
                    return <Pressable key={date} accessibilityRole="button" accessibilityLabel={uiText(`Chọn ngày ${date}`)} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => chooseDate(date)} style={uiStyle([styles.dayCell, between && styles.inRange, selected && styles.selectedDay])}><Text style={uiTextStyle([styles.dayText, disabled && styles.pastDay, selected && styles.selectedDayText])}>{uiText(Number(date.slice(-2)))}</Text></Pressable>;
                  })}
                </View>
                {!!draft.checkOutDate && <Text style={uiTextStyle(styles.rangeLabel)}>{uiText(formatTripDates(draft.checkInDate, draft.checkOutDate))}</Text>}
              </>
            ) : (
              <>
                <Text style={uiTextStyle(styles.capacity)}>{uiText("Chỗ ở này cho phép tối đa ")}{uiText(maxGuests)}{uiText(" khách.")}</Text>
                {(['adults', 'children'] as const).map((field) => {
                  const minimum = field === 'adults' ? 1 : 0;
                  const minusDisabled = saving || draft[field] <= minimum;
                  const plusDisabled = saving || draft.adults + draft.children >= maxGuests;
                  return <View key={field} style={uiStyle(styles.guestRow)}>
                    <View style={uiStyle(styles.guestCopy)}><Text style={uiTextStyle(styles.guestTitle)}>{field === 'adults' ? uiText("Người lớn") : uiText("Trẻ em")}</Text><Text style={uiTextStyle(styles.muted)}>{field === 'adults' ? uiText('Ít nhất một người lớn') : uiText('Được tính vào tổng số khách')}</Text></View>
                    <Pressable accessibilityRole="button" accessibilityLabel={uiText(`Giảm ${field === 'adults' ? 'người lớn' : 'trẻ em'}`)} disabled={minusDisabled} onPress={() => setDraft((current) => ({ ...current, [field]: current[field] - 1 }))} style={uiStyle([styles.counterButton, minusDisabled && styles.disabled])}><Minus size={17} color={uiColor("#4B5563")} /></Pressable>
                    <Text style={uiTextStyle(styles.counterValue)}>{uiText(draft[field])}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={uiText(`Tăng ${field === 'adults' ? 'người lớn' : 'trẻ em'}`)} disabled={plusDisabled} onPress={() => setDraft((current) => ({ ...current, [field]: current[field] + 1 }))} style={uiStyle([styles.counterButton, plusDisabled && styles.disabled])}><Plus size={17} color={uiColor("#4B5563")} /></Pressable>
                  </View>;
                })}
              </>
            )}
            {!!error && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(error)}</Text>}
          </ScrollView>
          <View style={uiStyle(styles.footer)}>
            <Pressable accessibilityRole="button" accessibilityLabel={uiText("Lưu thay đổi chuyến đi")} disabled={saving} onPress={save} style={uiStyle([styles.saveButton, saving && styles.disabled])}>{saving && <ActivityIndicator size="small" color={uiColor("#FFFFFF")} />}<Text style={uiTextStyle(styles.saveLabel)}>{saving ? uiText('Đang kiểm tra chỗ trống...') : uiText('Lưu')}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '92%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#24292D' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingBottom: 16 },
  dateFields: { flexDirection: 'row', gap: 12, marginTop: 8 },
  dateField: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10 },
  activeDate: { borderColor: '#00B8CE', backgroundColor: '#EFFCFD' },
  muted: { fontSize: 12, lineHeight: 19, color: '#7B8188' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#33383D', marginTop: 4 },
  calendarHint: { fontSize: 12, color: '#7B8188', marginTop: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  monthTitle: { fontSize: 16, fontWeight: '600', color: '#33383D' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', height: 40, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 12, color: '#9CA3AF' },
  dayText: { fontSize: 14, color: '#33383D' },
  pastDay: { color: '#CED2D8' },
  selectedDay: { backgroundColor: '#00B8CE', borderRadius: 20 },
  selectedDayText: { color: '#FFFFFF', fontWeight: '600' },
  inRange: { backgroundColor: '#E5F9FC' },
  rangeLabel: { textAlign: 'center', fontSize: 13, color: '#008B9D', marginTop: 14 },
  capacity: { fontSize: 13, lineHeight: 20, color: '#7B8188', marginVertical: 12 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  guestCopy: { flex: 1 },
  guestTitle: { fontSize: 15, fontWeight: '600', color: '#33383D', marginBottom: 3 },
  counterButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#BFC5CC', alignItems: 'center', justifyContent: 'center' },
  counterValue: { minWidth: 18, textAlign: 'center', fontSize: 15, color: '#33383D' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  saveButton: { minHeight: 48, backgroundColor: '#00B8CE', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  error: { color: '#C53D3D', fontSize: 13, lineHeight: 20, marginTop: 16 },
});
