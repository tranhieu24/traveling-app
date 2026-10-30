import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Globe, MapPin, Search, X } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useFilterStore } from '../store/useFilterStore';
import {
  ANYWHERE,
  SearchDestination,
  searchDateLabel,
  validateSearch,
  validateSearchDates,
} from '../utils/search';
import { addIsoDays, isoToday } from '../utils/checkout';
import { fetchDestinations } from '../services/search';
import { DateRangeCalendar } from '../components/search/DateRangeCalendar';
import { Counter, CYAN, searchStyles as shared } from '../components/search/SearchControls';

const regions: { destination: SearchDestination; image?: number }[] = [
  { destination: ANYWHERE, image: require('../../assets/search/region-anywhere.png') },
  {
    destination: { kind: 'region', label: 'Europe', value: 'Europe' },
    image: require('../../assets/search/region-europe.png'),
  },
  {
    destination: { kind: 'region', label: 'Asia', value: 'Asia' },
    image: require('../../assets/search/region-asia.png'),
  },
  { destination: { kind: 'region', label: 'North America', value: 'North America' } },
];
export const SearchSheetScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SearchSheet'>>();
  const state = useFilterStore();
  const [step, setStep] = useState<'where' | 'when' | 'who'>(route.params?.step || 'where');
  const [destination, setDestination] = useState<SearchDestination | null>(state.destination);
  const [query, setQuery] = useState(
    state.destination.kind === 'city' || state.destination.kind === 'country'
      ? state.destination.label
      : ''
  );
  const [debounced, setDebounced] = useState('');
  const [checkIn, setCheckIn] = useState(state.checkInDate);
  const [checkOut, setCheckOut] = useState(state.checkOutDate);
  const [anytime, setAnytime] = useState(!state.checkInDate);
  const [adults, setAdults] = useState(state.adults),
    [children, setChildren] = useState(state.children);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const suggestions = useQuery({
    queryKey: ['destinations', debounced],
    queryFn: ({ signal }) => fetchDestinations(debounced, signal),
    enabled: step === 'where' && !destination && !!debounced,
    staleTime: 60000,
    retry: 1,
  });
  const choose = (choice: SearchDestination) => {
    setDestination(choice);
    setQuery(choice.kind === 'city' || choice.kind === 'country' ? choice.label : '');
    setError('');
    setStep('when');
  };
  const close = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'SearchTab' } }],
        });
  const clear = () => {
    setDestination(ANYWHERE);
    setQuery('');
    setCheckIn(null);
    setCheckOut(null);
    setAnytime(true);
    setAdults(0);
    setChildren(0);
    setError('');
    setStep('where');
  };
  const next = () => {
    try {
      if (!anytime && (!checkIn || !checkOut))
        throw new Error('Choose both a check-in and a check-out date, or select Anytime.');
      validateSearchDates(checkIn, checkOut);
      setError('');
      setStep('who');
    } catch (failure) {
      setError((failure as Error).message);
    }
  };
  const criteria = {
    destination: destination!,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    adults,
    children,
  };
  let disabled = !anytime && (!checkIn || !checkOut);
  try {
    validateSearch(criteria);
  } catch {
    disabled = true;
  }
  const search = () => {
    try {
      state.setSearch(criteria);
      // A destination search spans categories; category browsing remains on Explore.
      state.setSelectedCategory(null);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'SearchTab' } }],
      });
    } catch (failure) {
      setError((failure as Error).message);
    }
  };
  const summary = (label: string, value: string, target: 'where' | 'when' | 'who') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}`}
      onPress={() => {
        setStep(target);
        setError('');
      }}
      style={s.summary}
    >
      <Text style={shared.muted}>{label}</Text>
      <Text numberOfLines={1} style={s.summaryValue}>
        {value}
      </Text>
    </Pressable>
  );
  const nights =
    checkIn && checkOut ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000) : 1;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
      <KeyboardAvoidingView
        style={s.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={close}
            style={s.close}
          >
            <X size={21} color="#7F8790" />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {step !== 'where' ? (
            summary('Location', destination?.label || 'Choose destination', 'where')
          ) : (
            <View style={s.card}>
              <Text style={shared.title}>Where to?</Text>
              <View style={s.inputRow}>
                <Search size={21} color="#30343A" />
                <TextInput
                  accessibilityLabel="Search city or country"
                  placeholder="Search city or country"
                  placeholderTextColor="#A6ADB6"
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    setDestination(null);
                    setError('');
                  }}
                  style={s.input}
                  maxLength={100}
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>
              {!destination && !!query.trim() && (
                <View style={s.suggestions}>
                  {debounced !== query.trim() || suggestions.isFetching ? (
                    <ActivityIndicator color={CYAN} style={{ padding: 16 }} />
                  ) : suggestions.isError ? (
                    <Pressable accessibilityRole="button" onPress={() => suggestions.refetch()}>
                      <Text style={shared.error}>Unable to load destinations. Tap to retry.</Text>
                    </Pressable>
                  ) : suggestions.data?.length ? (
                    suggestions.data.map((choice) => (
                      <Pressable
                        key={`${choice.kind}:${choice.label}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose ${choice.label}`}
                        onPress={() => choose(choice)}
                        style={s.suggestion}
                      >
                        <MapPin size={18} color={CYAN} />
                        <Text style={[shared.text, { flex: 1 }]}>{choice.label}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={shared.muted}>
                      No destinations found. Try another city or country, or choose a region below.
                    </Text>
                  )}
                </View>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.regions}
              >
                {regions.map(({ destination: choice, image }) => (
                  <Pressable
                    key={choice.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${choice.label}`}
                    accessibilityState={{ selected: destination?.label === choice.label }}
                    aria-selected={destination?.label === choice.label}
                    onPress={() => choose(choice)}
                    style={s.region}
                  >
                    <View
                      style={[
                        s.regionImage,
                        destination?.label === choice.label && {
                          borderColor: CYAN,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      {image ? (
                        <Image source={image} style={s.image} />
                      ) : (
                        <Globe size={42} color={CYAN} />
                      )}
                    </View>
                    <Text style={s.regionLabel}>{choice.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {step !== 'when' ? (
            summary(
              step === 'where' ? 'When' : 'Dates',
              checkIn && checkOut ? searchDateLabel(checkIn, checkOut) : 'Add time',
              'when'
            )
          ) : (
            <View style={s.card}>
              <Text style={shared.title}>When staying</Text>
              <View style={s.segment}>
                {['Choose dates', 'Anytime'].map((label, index) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    aria-pressed={anytime === !!index}
                    accessibilityState={{ selected: anytime === !!index }}
                    onPress={() => {
                      setAnytime(!!index);
                      setError('');
                      if (index) {
                        setCheckIn(null);
                        setCheckOut(null);
                      }
                    }}
                    style={[s.segmentButton, anytime === !!index && { backgroundColor: CYAN }]}
                  >
                    <Text
                      style={[
                        shared.text,
                        anytime === !!index && { color: 'white', fontWeight: '600' },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {anytime ? (
                <Text style={[shared.muted, { paddingVertical: 24 }]}>
                  Flexible dates? Browse all available stays and choose dates before booking.
                </Text>
              ) : (
                <>
                  <DateRangeCalendar
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChange={(start, end) => {
                      setCheckIn(start);
                      setCheckOut(end);
                    }}
                    onError={setError}
                  />
                  <View style={s.duration}>
                    <Text style={shared.text}>
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </Text>
                    <Counter
                      label="nights"
                      value={nights}
                      minimum={1}
                      maximum={365}
                      onChange={(value) => {
                        const start = checkIn || isoToday();
                        setCheckIn(start);
                        setCheckOut(addIsoDays(start, value));
                        setError('');
                      }}
                    />
                  </View>
                </>
              )}
              <View style={s.nextRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAnytime(true);
                    setCheckIn(null);
                    setCheckOut(null);
                    setError('');
                    setStep('who');
                  }}
                >
                  <Text style={shared.clear}>Skip</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={next} style={shared.action}>
                  <Text style={shared.actionText}>Next</Text>
                </Pressable>
              </View>
            </View>
          )}
          {step !== 'who' ? (
            summary(
              'Guests',
              adults + children ? `${adults + children} guests` : 'Add guests',
              'who'
            )
          ) : (
            <View style={s.card}>
              <Text style={shared.title}>How many guests?</Text>
              <View style={s.guestRow}>
                <Text style={shared.text}>Adults</Text>
                <Counter
                  label="adults"
                  value={adults}
                  maximum={1000 - children}
                  onChange={setAdults}
                />
              </View>
              <View style={s.guestRow}>
                <Text style={shared.text}>Children</Text>
                <Counter
                  label="children"
                  value={children}
                  maximum={1000 - adults}
                  onChange={setChildren}
                />
              </View>
              {adults === 0 && (
                <Text style={[shared.muted, { fontSize: 12, marginTop: 8 }]}>
                  Include at least one adult to search.
                </Text>
              )}
            </View>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={shared.error}>
              {error}
            </Text>
          )}
        </ScrollView>
        <View style={s.footerOuter}>
          <View style={[shared.footer, s.footer]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search choices"
              onPress={clear}
            >
              <Text style={shared.clear}>Clear all</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search accommodations"
              disabled={disabled}
              accessibilityState={{ disabled }}
              onPress={search}
              style={[shared.action, disabled && { opacity: 0.45 }]}
            >
              <Search size={20} color="white" />
              <Text style={shared.actionText}>Search</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' },
  top: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
    gap: 18,
  },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#D7DADE',
    borderRadius: 11,
    backgroundColor: 'white',
  },
  summary: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#D7DADE',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  summaryValue: { flex: 1, textAlign: 'right', fontSize: 14, color: '#30343A' },
  inputRow: {
    borderWidth: 1,
    borderColor: '#BBC1C9',
    borderRadius: 6,
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 12, color: '#30343A', minWidth: 0 },
  suggestions: { paddingTop: 12 },
  suggestion: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
    paddingVertical: 12,
  },
  regions: { paddingTop: 24, gap: 18, paddingBottom: 2 },
  region: { width: 120 },
  regionImage: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EDFAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E5EA',
  },
  image: { width: '100%', height: '100%' },
  regionLabel: { fontSize: 15, color: '#676C74', marginTop: 10 },
  segment: {
    flexDirection: 'row',
    padding: 2,
    backgroundColor: '#F2F3F5',
    borderRadius: 7,
    marginBottom: 25,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingBottom: 8,
    gap: 8,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EDEFF2',
    marginTop: 18,
    paddingTop: 18,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    gap: 12,
  },
  footerOuter: { borderTopWidth: 1, borderTopColor: '#F1F2F4' },
  footer: { width: '100%', maxWidth: 460, alignSelf: 'center', borderTopWidth: 0 },
});
