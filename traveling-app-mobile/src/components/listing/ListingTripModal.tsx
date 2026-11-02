import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { TripDraft } from '../booking/TripEditor';
import { DateRangeCalendar } from '../search/DateRangeCalendar';
import { Counter } from '../search/SearchControls';
import { validateTrip } from '../../utils/checkout';
import { searchDateLabel } from '../../utils/search';

export const ListingTripModal = ({
  visible,
  trip,
  maxGuests,
  onClose,
  onApply,
}: {
  visible: boolean;
  trip: TripDraft;
  maxGuests: number;
  onClose: () => void;
  onApply: (draft: TripDraft) => Promise<void>;
}) => {
  const [draft, setDraft] = useState(trip),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    if (visible) {
      setDraft(trip);
      setError('');
    }
  }, [visible, trip.checkInDate, trip.checkOutDate, trip.adults, trip.children]);
  const save = async () => {
    if (pending.current) return;
    try {
      validateTrip(draft.checkInDate, draft.checkOutDate, draft.adults, draft.children, maxGuests);
    } catch (failure) {
      setError((failure as Error).message);
      return;
    }
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await onApply(draft);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not check these dates. Please try again.'
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <View style={s.overlay}>
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.heading}>
            <Text accessibilityRole="header" style={s.title}>
              Your trip
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close room trip selection"
              disabled={saving}
              onPress={onClose}
              style={s.close}
            >
              <X size={22} color="#8E98A5" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.label}>Choose your dates</Text>
            <Text style={s.dates}>
              {draft.checkInDate && draft.checkOutDate
                ? searchDateLabel(draft.checkInDate, draft.checkOutDate)
                : 'Select check-in and check-out'}
            </Text>
            <View pointerEvents={saving ? 'none' : 'auto'}>
              <DateRangeCalendar
                checkIn={draft.checkInDate || null}
                checkOut={draft.checkOutDate || null}
                onChange={(start, end) => {
                  setDraft((current) => ({
                    ...current,
                    checkInDate: start,
                    checkOutDate: end || '',
                  }));
                  setError('');
                }}
                onError={setError}
              />
            </View>
            <Text style={[s.label, { marginTop: 24 }]}>Guests</Text>
            <Text style={s.capacity}>
              Up to {maxGuests} {maxGuests === 1 ? 'guest' : 'guests'} for this stay.
            </Text>
            {(['adults', 'children'] as const).map((field) => (
              <View key={field} style={s.guest}>
                <Text style={s.guestTitle}>{field === 'adults' ? 'Adults' : 'Children'}</Text>
                <View pointerEvents={saving ? 'none' : 'auto'}>
                  <Counter
                    label={field}
                    value={draft[field]}
                    minimum={field === 'adults' ? 1 : 0}
                    maximum={Math.max(
                      0,
                      maxGuests - draft[field === 'adults' ? 'children' : 'adults']
                    )}
                    onChange={(value) => setDraft((current) => ({ ...current, [field]: value }))}
                  />
                </View>
              </View>
            ))}
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
          </ScrollView>
          <SafeAreaView edges={['bottom']}>
            <View style={s.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check room availability"
                disabled={saving}
                onPress={() => void save()}
                style={[s.apply, saving && { opacity: 0.6 }]}
              >
                {saving && <ActivityIndicator color="white" size="small" />}
                <Text style={s.applyText}>
                  {saving ? 'Checking availability...' : 'Check availability'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22,31,42,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '93%',
    backgroundColor: 'white',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingLeft: 20,
  },
  title: { color: '#34414F', fontSize: 20, fontWeight: '700' },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  label: { color: '#596675', fontSize: 14, fontWeight: '600', marginBottom: 7 },
  dates: { fontSize: 12, color: '#00A8BD', marginBottom: 16 },
  capacity: { color: '#929CA8', fontSize: 12, lineHeight: 20, marginBottom: 10 },
  guest: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  guestTitle: { color: '#697684', fontSize: 14 },
  footer: { padding: 18, borderTopWidth: 1, borderTopColor: '#EFF1F4' },
  apply: {
    minHeight: 47,
    backgroundColor: '#00B8CE',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  applyText: { color: 'white', fontSize: 14, fontWeight: '600' },
  error: { color: '#C44E5C', fontSize: 12, lineHeight: 19, marginTop: 12 },
});
