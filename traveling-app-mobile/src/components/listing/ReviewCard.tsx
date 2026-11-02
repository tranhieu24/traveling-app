import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Star, UserRound } from 'lucide-react-native';
import type { Review } from '../../types';
import { reviewDate } from '../../utils/listingDetail';

export const ReviewStars = ({ rating, size = 12 }: { rating: number; size?: number }) => (
  <View accessibilityLabel={`${rating} out of 5 stars`} style={s.stars}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        strokeWidth={1}
        color={star <= rating ? '#EAC44C' : '#E1E5EA'}
        fill={star <= rating ? '#EAC44C' : '#E1E5EA'}
      />
    ))}
  </View>
);
export const ReviewCard = ({
  review,
  compact = false,
  onPress,
}: {
  review: Review;
  compact?: boolean;
  onPress?: () => void;
}) => {
  const [failedAvatar, setFailedAvatar] = useState(false);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Read review by ${review.user_name || 'Guest'}` : undefined}
      onPress={onPress}
      style={[s.card, compact && s.compact]}
    >
      <View style={s.heading}>
        {review.user_avatar && !failedAvatar ? (
          <Image
            source={{ uri: review.user_avatar }}
            onError={() => setFailedAvatar(true)}
            style={s.avatar}
          />
        ) : (
          <View style={s.avatarFallback}>
            <UserRound size={17} color="#00A4BA" />
          </View>
        )}
        <View style={s.person}>
          <Text style={s.name} numberOfLines={1}>
            {review.user_name || 'Guest'}
          </Text>
          <Text style={s.date}>{reviewDate(review.created_at)}</Text>
        </View>
        <ReviewStars rating={Number(review.rating)} size={compact ? 10 : 12} />
      </View>
      <Text style={s.comment} numberOfLines={compact ? 3 : undefined}>
        {review.comment}
      </Text>
    </Pressable>
  );
};
const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#ECEEF2',
    borderRadius: 6,
    padding: 13,
    backgroundColor: 'white',
    marginBottom: 14,
  },
  compact: { width: 275, marginBottom: 0, minHeight: 122 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ECF8FA' },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5F8FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  person: { flex: 1, minWidth: 0 },
  name: { color: '#626B76', fontSize: 11, fontWeight: '600', lineHeight: 17 },
  date: { color: '#A0A7B1', fontSize: 10, lineHeight: 16 },
  stars: { flexDirection: 'row', gap: 1 },
  comment: { color: '#868E98', fontSize: 12, lineHeight: 20, marginTop: 11 },
});
