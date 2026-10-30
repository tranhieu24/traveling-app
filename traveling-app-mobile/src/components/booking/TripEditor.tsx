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
  const monthTitle = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check your trip details.'); return; }
    pending.current = true;
    setSaving(true);
    try { await onApply(draft); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update your trip. Please try again.'); }
    finally { pending.current = false; setSaving(false); }
  };

  return (
    <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={() => { if (!pending.current) onClose(); }}>
      <View style={styles.overlay}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{shownMode === 'dates' ? 'Edit dates' : 'Edit guests'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close trip editor" disabled={saving} onPress={onClose} style={styles.iconButton}><X size={22} color="#33383D" /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            {shownMode === 'dates' ? (
              <>
                <View style={styles.dateFields}>
                  {(['in', 'out'] as const).map((field) => (
                    <Pressable key={field} accessibilityRole="button" accessibilityLabel={field === 'in' ? 'Choose check-in date' : 'Choose check-out date'} disabled={saving} onPress={() => setActiveDate(field)} style={[styles.dateField, activeDate === field && styles.activeDate]}>
                      <Text style={styles.muted}>{field === 'in' ? 'Check-in' : 'Check-out'}</Text>
                      <Text style={styles.dateText}>{(field === 'in' ? draft.checkInDate : draft.checkOutDate) || 'Select date'}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.calendarHint}>Select your {activeDate === 'in' ? 'check-in' : 'check-out'} date.</Text>
                <View style={styles.monthRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={saving || month <= isoToday().slice(0, 7)} onPress={() => moveMonth(-1)} style={[styles.iconButton, month <= isoToday().slice(0, 7) && styles.disabled]}><ChevronLeft size={22} color="#33383D" /></Pressable>
                  <Text style={styles.monthTitle}>{monthTitle}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={saving} onPress={() => moveMonth(1)} style={styles.iconButton}><ChevronRight size={22} color="#33383D" /></Pressable>
                </View>
                <View style={styles.calendar}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <View key={`week-${index}`} style={styles.dayCell}><Text style={styles.weekday}>{label}</Text></View>)}
                  {cells.map((date, index) => {
                    if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                    const selected = date === draft.checkInDate || date === draft.checkOutDate;
                    const between = !!draft.checkOutDate && date > draft.checkInDate && date < draft.checkOutDate;
                    const disabled = saving || date < isoToday() || (activeDate === 'out' && date > addIsoDays(draft.checkInDate, 365));
                    return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`Select ${date}`} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => chooseDate(date)} style={[styles.dayCell, between && styles.inRange, selected && styles.selectedDay]}><Text style={[styles.dayText, disabled && styles.pastDay, selected && styles.selectedDayText]}>{Number(date.slice(-2))}</Text></Pressable>;
                  })}
                </View>
                {!!draft.checkOutDate && <Text style={styles.rangeLabel}>{formatTripDates(draft.checkInDate, draft.checkOutDate)}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.capacity}>This place allows up to {maxGuests} {maxGuests === 1 ? 'guest' : 'guests'}.</Text>
                {(['adults', 'children'] as const).map((field) => {
                  const minimum = field === 'adults' ? 1 : 0;
                  const minusDisabled = saving || draft[field] <= minimum;
                  const plusDisabled = saving || draft.adults + draft.children >= maxGuests;
                  return <View key={field} style={styles.guestRow}>
                    <View style={styles.guestCopy}><Text style={styles.guestTitle}>{field === 'adults' ? 'Adults' : 'Children'}</Text><Text style={styles.muted}>{field === 'adults' ? 'At least one adult' : 'Included in the total guests'}</Text></View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${field === 'adults' ? 'adult' : 'child'}`} disabled={minusDisabled} onPress={() => setDraft((current) => ({ ...current, [field]: current[field] - 1 }))} style={[styles.counterButton, minusDisabled && styles.disabled]}><Minus size={17} color="#4B5563" /></Pressable>
                    <Text style={styles.counterValue}>{draft[field]}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${field === 'adults' ? 'adult' : 'child'}`} disabled={plusDisabled} onPress={() => setDraft((current) => ({ ...current, [field]: current[field] + 1 }))} style={[styles.counterButton, plusDisabled && styles.disabled]}><Plus size={17} color="#4B5563" /></Pressable>
                  </View>;
                })}
              </>
            )}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" accessibilityLabel="Save trip changes" disabled={saving} onPress={save} style={[styles.saveButton, saving && styles.disabled]}>{saving && <ActivityIndicator size="small" color="#FFFFFF" />}<Text style={styles.saveLabel}>{saving ? 'Checking availability...' : 'Save'}</Text></Pressable>
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
