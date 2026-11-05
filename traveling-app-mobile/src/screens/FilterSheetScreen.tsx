import { useUiPreferences, uiStyle, uiText, uiTextStyle, uiColor } from '../preferences/ui';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { useFilterStore } from '../store/useFilterStore';
import { apiClient } from '../services/apiClient';
import { Amenity } from '../types';
import { formatAmenityName } from '../utils/listingDetail';
import { AdvancedFilters, EMPTY_ADVANCED, ROOM_TYPES, validateAdvanced } from '../utils/search';
import {
  Checkbox,
  Counter,
  CYAN,
  searchStyles as shared,
} from '../components/search/SearchControls';
import { PriceRangeSlider } from '../components/search/PriceRangeSlider';

export const FilterSheetScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dismiss = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'SearchTab' } }],
        });
  const state = useFilterStore();
  const [draft, setDraft] = useState<AdvancedFilters>(() => ({
    propertyType: state.propertyType,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    bedrooms: state.bedrooms,
    beds: state.beds,
    bathrooms: state.bathrooms,
    roomTypes: [...state.roomTypes],
    selectedAmenities: [...state.selectedAmenities],
  }));
  const [minimum, setMinimum] = useState(state.minPrice?.toString() || ''),
    [maximum, setMaximum] = useState(state.maxPrice?.toString() || '');
  const [error, setError] = useState('');
  const amenities = useQuery<Amenity[]>({
    queryKey: ['amenities'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get('/amenities', { signal });
      if (!Array.isArray(res.data.data)) throw new Error('Không thể tải tiện nghi.');
      return res.data.data;
    },
  });
  const prices = {
    minPrice: minimum.trim() ? Number(minimum) : null,
    maxPrice: maximum.trim() ? Number(maximum) : null,
  };
  const clear = () => {
    setDraft({ ...EMPTY_ADVANCED });
    setMinimum('');
    setMaximum('');
    setError('');
  };
  const apply = () => {
    try {
      const next = { ...draft, ...prices };
      validateAdvanced(next);
      state.setAdvancedFilters(next);
      dismiss();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };
  return (
    <View style={uiStyle(s.overlay)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiText("Dismiss filters")}
        onPress={dismiss}
        style={uiStyle(StyleSheet.absoluteFill)}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={uiStyle(s.sheet)}
      >
        <View style={uiStyle(s.header)}>
          <Text style={uiTextStyle(s.headerTitle)}>{uiText("Bộ lọc")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Đóng bộ lọc")}
            onPress={dismiss}
            style={uiStyle(s.close)}
          >
            <X size={20} color={uiColor("#8D949D")} />
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={uiStyle(s.content)}
        >
          {!!draft.propertyType&&<View style={uiStyle(s.section)}>
            <Text style={uiTextStyle(shared.heading)}>{uiText("Loại chỗ ở: ")}{uiText(draft.propertyType)}</Text>
            <Pressable accessibilityRole="button" onPress={()=>setDraft(current=>({...current,propertyType:null}))}><Text style={uiTextStyle(shared.clear)}>{uiText("Bỏ điều kiện loại chỗ ở")}</Text></Pressable>
          </View>}
          <View style={uiStyle(s.section)}>
            <Text style={uiTextStyle(shared.heading)}>{uiText("Khoảng giá")}</Text>
            <Text style={uiTextStyle([shared.muted, { fontSize: 12, marginTop: -8, marginBottom: 15 }])}>{uiText("Nightly price in USD, before taxes and fees")}</Text>
            <PriceRangeSlider
              minimum={prices.minPrice}
              maximum={prices.maxPrice}
              onChange={(low, high) => {
                setMinimum(String(low));
                setMaximum(String(high));
                setError('');
              }}
            />
            <View style={uiStyle(s.priceRow)}>
              {(['Minimum', 'Maximum'] as const).map((label, index) => (
                <React.Fragment key={label}>
                  {index === 1 && <Text style={uiTextStyle(shared.muted)}>{uiText('\u2014')}</Text>}
                  <View style={uiStyle(s.priceBox)}>
                    <Text style={uiTextStyle(s.priceLabel)}>{uiText(label)}</Text>
                    <View style={uiStyle(s.inputRow)}>
                      <Text style={uiTextStyle(shared.text)}>{uiText("US$")}</Text>
                      <TextInput
                        accessibilityLabel={uiText(`${label} nightly price`)}
                        keyboardType="decimal-pad"
                        value={index ? maximum : minimum}
                        onChangeText={index ? setMaximum : setMinimum}
                        placeholder={index ? uiText('250') : uiText('10')}
                        placeholderTextColor={uiColor("#A2A8B0")}
                        style={uiStyle(s.input)}
                      />
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
          <View style={uiStyle(s.section)}>
            <Text style={uiTextStyle(shared.heading)}>{uiText("Loại chỗ ở")}</Text>
            {ROOM_TYPES.map((type) => (
              <Checkbox
                key={type.value}
                label={uiText(type.title)}
                description={uiText(type.description)}
                checked={draft.roomTypes.includes(type.value)}
                onPress={() =>
                  setDraft((value) => ({
                    ...value,
                    roomTypes: value.roomTypes.includes(type.value)
                      ? value.roomTypes.filter((item) => item !== type.value)
                      : [...value.roomTypes, type.value],
                  }))
                }
              />
            ))}
          </View>
          <View style={uiStyle(s.section)}>
            <Text style={uiTextStyle(shared.heading)}>{uiText("Phòng và giường")}</Text>
            {(['bedrooms', 'beds', 'bathrooms'] as const).map((key) => (
              <View key={key} style={uiStyle(s.countRow)}>
                <Text style={uiTextStyle(shared.text)}>{uiText(key[0].toUpperCase() + key.slice(1))}</Text>
                <Counter
                  label={uiText(key)}
                  value={draft[key] ?? 0}
                  any
                  onChange={(value) => setDraft((old) => ({ ...old, [key]: value || null }))}
                />
              </View>
            ))}
          </View>
          <View style={uiStyle([s.section, { borderBottomWidth: 0 }])}>
            <Text style={uiTextStyle(shared.heading)}>{uiText("Tiện nghi")}</Text>
            <Text style={uiTextStyle([shared.muted, { fontSize: 12 }])}>{uiText("Chỗ ở phải có đầy đủ các tiện nghi được chọn.")}</Text>
            {amenities.isLoading ? (
              <ActivityIndicator color={uiColor(CYAN)} style={uiStyle({ padding: 24 })} />
            ) : amenities.isError ? (
              <Pressable accessibilityRole="button" onPress={() => amenities.refetch()}>
                <Text style={uiTextStyle(shared.error)}>{uiText("Không thể tải tiện nghi. Chạm để thử lại.")}</Text>
              </Pressable>
            ) : (
              amenities.data?.map((amenity) => (
                <Checkbox
                  key={amenity.id}
                  label={uiText(formatAmenityName(amenity.name))}
                  checked={draft.selectedAmenities.includes(amenity.id)}
                  onPress={() =>
                    setDraft((old) => ({
                      ...old,
                      selectedAmenities: old.selectedAmenities.includes(amenity.id)
                        ? old.selectedAmenities.filter((id) => id !== amenity.id)
                        : [...old.selectedAmenities, amenity.id],
                    }))
                  }
                />
              ))
            )}
          </View>
          {!!error && (
            <Text accessibilityRole="alert" style={uiTextStyle(shared.error)}>
              {uiText(error)}
            </Text>
          )}
        </ScrollView>
        <SafeAreaView edges={['bottom']}>
          <View style={uiStyle(shared.footer)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={uiText("Clear advanced filters")}
              onPress={clear}
            >
              <Text style={uiTextStyle(shared.clear)}>{uiText("Xóa tất cả")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={apply} style={uiStyle(shared.action)}>
              <Text style={uiTextStyle(shared.actionText)}>{uiText("Xem kết quả")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,28,35,0.3)', justifyContent: 'flex-end' },
  sheet: {
    height: '78%',
    maxHeight: 800,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  header: {
    height: 66,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#30343A', fontSize: 18, fontWeight: '600' },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  section: { paddingVertical: 25, borderBottomWidth: 1, borderBottomColor: '#ECEEF1' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceBox: { flex: 1, borderWidth: 1, borderColor: '#9FA6AF', borderRadius: 6, padding: 10 },
  priceLabel: { color: '#979EA8', fontSize: 12, marginBottom: 3 },
  inputRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  input: { flex: 1, minWidth: 0, color: '#30343A', fontSize: 15, paddingVertical: 3 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    gap: 10,
  },
});
