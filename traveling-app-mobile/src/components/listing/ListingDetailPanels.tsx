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
import { groupAmenities, listingAddress, listingTime } from '../../utils/listingDetail';
import { ListingImage } from './ListingPhotoGallery';

export type ListingPanel = 'facilities' | 'policies' | 'description' | null;
export const AmenityIcon = ({ amenity }: { amenity: Amenity }) => {
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
  return <Icon size={18} color="#7A828C" strokeWidth={1.7} />;
};
export const ListingStats = ({ listing }: { listing: Listing }) => (
  <View style={s.stats}>
    {[
      `${listing.max_guests} ${listing.max_guests === 1 ? 'Guest' : 'Guests'}`,
      listing.bedrooms === 0
        ? 'Studio'
        : `${listing.bedrooms} ${listing.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`,
      `${listing.beds} ${listing.beds === 1 ? 'bed' : 'beds'}`,
      `${listing.bathrooms} ${listing.bathrooms === 1 ? 'bath' : 'baths'}`,
    ].map((text) => (
      <Text key={text} style={s.stat}>
        {text}
      </Text>
    ))}
  </View>
);
export const HouseRules = ({ listing }: { listing: Listing }) => (
  <View style={s.rules}>
    <Text style={s.ruleTitle}>House rules</Text>
    <View style={s.ruleRow}>
      <Clock3 size={15} color="#8C939D" />
      <Text style={s.ruleText}>Earliest check-in time: {listingTime(listing.check_in_time)}</Text>
    </View>
    <View style={s.ruleRow}>
      <Clock3 size={15} color="#8C939D" />
      <Text style={s.ruleText}>Latest check-out time: {listingTime(listing.check_out_time)}</Text>
    </View>
  </View>
);
export const CheckinPolicy = ({ listing }: { listing: Listing }) => {
  const checkIn = listingTime(listing.check_in_time),
    checkOut = listingTime(listing.check_out_time);
  return (
    <Text style={s.policy}>
      {checkIn === 'To be confirmed' || checkOut === 'To be confirmed'
        ? 'Please confirm check-in and check-out arrangements with your host before you travel.'
        : `Check-in from ${checkIn} and check-out by ${checkOut}. Please confirm arrival arrangements with your host before you travel.`}
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
}) => (
  <Modal visible={!!panel} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'bottom']} style={s.screen}>
      <View style={s.frame}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to room details"
            onPress={onClose}
            style={s.back}
          >
            <ChevronLeft size={26} color="#969DA7" />
          </Pressable>
          <Text accessibilityRole="header" style={s.headerTitle}>
            {panel === 'facilities'
              ? 'Facilities & services'
              : panel === 'policies'
                ? 'Policies'
                : 'Description'}
          </Text>
          <View style={s.back} />
        </View>
        <ScrollView contentContainerStyle={s.content}>
          {panel === 'facilities' ? (
            <>
              <Text style={s.title}>Facilities</Text>
              <ListingStats listing={listing} />
              {!listing.amenities?.length && (
                <Text style={s.policy}>No facilities have been listed for this stay.</Text>
              )}
              {groupAmenities(listing.amenities || []).map(([label, amenities]) => (
                <View key={label} style={s.group}>
                  <Text style={s.groupTitle}>{label}</Text>
                  {amenities.map((amenity) => (
                    <View key={amenity.id} style={s.amenity}>
                      <AmenityIcon amenity={amenity} />
                      <Text style={s.amenityText}>{amenity.name}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : panel === 'policies' ? (
            <>
              <Text style={s.title}>Policies</Text>
              <HouseRules listing={listing} />
              <Text style={s.groupTitle}>Checkin policies</Text>
              <CheckinPolicy listing={listing} />
              <Text style={[s.groupTitle, { marginTop: 24 }]}>Guest limit</Text>
              <Text style={s.policy}>
                This stay accommodates up to {listing.max_guests}{' '}
                {listing.max_guests === 1 ? 'guest' : 'guests'}.
              </Text>
            </>
          ) : (
            <>
              <View style={s.descriptionPhoto}>
                <ListingImage url={descriptionPhoto} />
              </View>
              <Text style={s.description}>
                {listing.description?.trim() || 'No description has been provided for this stay.'}
              </Text>
              <View style={s.location}>
                <MapPin size={18} color="#00B8CE" />
                <Text style={s.address}>{listingAddress(listing) || 'Location not provided'}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open room in Google Maps"
                  onPress={onMap}
                >
                  <Text style={s.link}>Open map</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>
);
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
