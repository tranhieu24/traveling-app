import { useUiPreferences, uiColor, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bath,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Dumbbell,
  Flower2,
  MapPin,
  Shirt,
  Snowflake,
  Trees,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
} from 'lucide-react-native';
import type { Amenity, Listing } from '../../types';
import { formatAmenityName, groupAmenities, listingAddress, listingTime } from '../../utils/listingDetail';
import { ListingImage } from './ListingPhotoGallery';

export type ListingPanel = 'facilities' | 'policies' | 'description' | null;
export const AmenityIcon = ({ amenity }: { amenity: Amenity }) => {
  useUiPreferences();
  const icons: Record<string, typeof Wifi> = {
    wifi: Wifi,
    utensils: Utensils,
    dumbbell: Dumbbell,
    waves: Waves,
    trees: Trees,
    flower: Flower2,
    'washing-machine': WashingMachine,
    wind: Wind,
    shirt: Shirt,
    bath: Bath,
    'hair-dryer': Wind,
    snowflake: Snowflake,
  };
  const Icon = icons[amenity.icon] || CheckCircle2;
  return <Icon size={18} color={uiColor("#7A828C")} strokeWidth={1.7} />;
};
export const ListingStats = ({ listing }: { listing: Listing }) => { useUiPreferences(); return ((
  <View style={uiStyle(s.stats)}>
    {[
      `${listing.max_guests} ${listing.max_guests === 1 ? "Khách" : "Số khách"}`,
      listing.bedrooms === 0
        ? 'Studio'
        : `${listing.bedrooms} phòng ngủ`,
      `${listing.beds} giường`,
      `${listing.bathrooms} phòng tắm`,
    ].map((text) => (
      <Text key={text} style={uiTextStyle(s.stat)}>
        {uiText(text)}
      </Text>
    ))}
  </View>
)); };
export const HouseRules = ({ listing }: { listing: Listing }) => { useUiPreferences(); return ((
  <View style={uiStyle(s.rules)}>
    <Text style={uiTextStyle(s.ruleTitle)}>{uiText("Nội quy chỗ ở")}</Text>
    <View style={uiStyle(s.ruleRow)}>
      <Clock3 size={15} color={uiColor("#8C939D")} />
      <Text style={uiTextStyle(s.ruleText)}>{uiText("Giờ nhận phòng sớm nhất: ")}{uiText(listingTime(listing.check_in_time))}</Text>
    </View>
    <View style={uiStyle(s.ruleRow)}>
      <Clock3 size={15} color={uiColor("#8C939D")} />
      <Text style={uiTextStyle(s.ruleText)}>{uiText("Giờ trả phòng muộn nhất: ")}{uiText(listingTime(listing.check_out_time))}</Text>
    </View>
  </View>
)); };
export const CheckinPolicy = ({ listing }: { listing: Listing }) => {
  useUiPreferences();
  const checkIn = listingTime(listing.check_in_time),
    checkOut = listingTime(listing.check_out_time);
  return (
    <Text style={uiTextStyle(s.policy)}>
      {checkIn === 'Chờ xác nhận' || checkOut === 'Chờ xác nhận' ? uiText('Vui lòng xác nhận lịch nhận và trả phòng với chủ nhà trước chuyến đi.') : uiText(`Nhận phòng từ ${checkIn} và trả phòng trước ${checkOut}. Vui lòng xác nhận lịch đến với chủ nhà trước chuyến đi.`)}
    </Text>
  );
};

export const ListingDetailPanels = ({
  panel,
  listing,
  descriptionPhoto,
  onClose,
  onMap,
}: {
  panel: ListingPanel;
  listing: Listing;
  descriptionPhoto?: string;
  onClose: () => void;
  onMap: () => void;
}) => { useUiPreferences(); return ((
  <Modal visible={!!panel} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'bottom']} style={uiStyle(s.screen)}>
      <View style={uiStyle(s.frame)}>
        <View style={uiStyle(s.header)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Quay lại chi tiết chỗ ở")}
            onPress={onClose}
            style={uiStyle(s.back)}
          >
            <ChevronLeft size={26} color={uiColor("#969DA7")} />
          </Pressable>
          <Text accessibilityRole="header" style={uiTextStyle(s.headerTitle)}>
            {panel === 'facilities' ? uiText('Tiện nghi và dịch vụ') : panel === 'policies' ? uiText("Chính sách") : uiText("Mô tả")}
          </Text>
          <View style={uiStyle(s.back)} />
        </View>
        <ScrollView contentContainerStyle={uiStyle(s.content)}>
          {panel === 'facilities' ? (
            <>
              <Text style={uiTextStyle(s.title)}>{uiText("Tiện nghi")}</Text>
              <ListingStats listing={listing} />
              {!listing.amenities?.length && (
                <Text style={uiTextStyle(s.policy)}>{uiText("Chỗ ở này chưa liệt kê tiện nghi.")}</Text>
              )}
              {groupAmenities(listing.amenities || []).map(([label, amenities]) => (
                <View key={label} style={uiStyle(s.group)}>
                  <Text style={uiTextStyle(s.groupTitle)}>{uiText(label)}</Text>
                  {amenities.map((amenity) => (
                    <View key={amenity.id} style={uiStyle(s.amenity)}>
                      <AmenityIcon amenity={amenity} />
                      <Text style={uiTextStyle(s.amenityText)}>{uiText(formatAmenityName(amenity.name))}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : panel === 'policies' ? (
            <>
              <Text style={uiTextStyle(s.title)}>{uiText("Chính sách")}</Text>
              <HouseRules listing={listing} />
              <Text style={uiTextStyle(s.groupTitle)}>{uiText("Điều kiện nhận phòng")}</Text>
              <CheckinPolicy listing={listing} />
              <Text style={uiTextStyle([s.groupTitle, { marginTop: 24 }])}>{uiText("Giới hạn số khách")}</Text>
              <Text style={uiTextStyle(s.policy)}>{uiText("Chỗ ở này phục vụ tối đa ")}{uiText(listing.max_guests)}{uiText(" khách.")}</Text>
            </>
          ) : (
            <>
              <View style={uiStyle(s.descriptionPhoto)}>
                <ListingImage url={descriptionPhoto} />
              </View>
              <Text style={uiTextStyle(s.description)}>
                {uiText(listing.description?.trim() || "Cơ sở chưa cung cấp mô tả cho chỗ ở này.")}
              </Text>
              <View style={uiStyle(s.location)}>
                <MapPin size={18} color={uiColor("#00B8CE")} />
                <Text style={uiTextStyle(s.address)}>{uiText(listingAddress(listing) || 'Chưa cung cấp địa chỉ')}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={uiText("Mở chỗ ở trong Google Maps")}
                  onPress={onMap}
                >
                  <Text style={uiTextStyle(s.link)}>{uiText("Mở bản đồ")}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>
)); };
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F2F5' },
  frame: { flex: 1, backgroundColor: 'white', width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: {
    minHeight: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 38, height: 42, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, color: '#59616D', fontWeight: '600' },
  content: { padding: 20, paddingTop: 16, paddingBottom: 32 },
  title: { color: '#303740', fontSize: 25, fontWeight: '700', marginBottom: 24 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginBottom: 15 },
  stat: { color: '#8A929D', fontSize: 12, lineHeight: 20 },
  group: { marginTop: 18 },
  groupTitle: {
    color: '#59616D',
    fontSize: 14,
    lineHeight: 23,
    fontWeight: '600',
    marginBottom: 8,
  },
  amenity: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 53,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF1F4',
  },
  amenityText: { color: '#737D89', fontSize: 15, lineHeight: 22 },
  rules: { backgroundColor: '#F8F9FB', padding: 14, marginBottom: 18 },
  ruleTitle: { fontSize: 13, color: '#737C88', fontWeight: '600', marginBottom: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 4 },
  ruleText: { color: '#8A939E', fontSize: 12, lineHeight: 19, flex: 1 },
  policy: { color: '#929AA5', fontSize: 12, lineHeight: 21 },
  descriptionPhoto: {
    width: '100%',
    aspectRatio: 1.65,
    marginBottom: 24,
    borderRadius: 4,
    overflow: 'hidden',
  },
  description: { color: '#8A929D', fontSize: 13, lineHeight: 23 },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 35,
    paddingBottom: 20,
  },
  address: { color: '#75808C', fontSize: 13, lineHeight: 22, flex: 1 },
  link: { color: '#00AFC5', fontSize: 12, textDecorationLine: 'underline' },
});
