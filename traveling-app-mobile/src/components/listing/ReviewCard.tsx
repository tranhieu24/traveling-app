import { uiLocale, useUiPreferences, uiText, uiStyle, uiColor, uiTextStyle } from '../../preferences/ui';

import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Star, UserRound } from 'lucide-react-native';
import type { Review } from '../../types';
import { reviewDate } from '../../utils/listingDetail';

export const ReviewStars = ({ rating, size = 12 }: { rating: number; size?: number }) => { useUiPreferences(); return ((
  <View accessibilityLabel={uiText(`${rating} trên 5 sao`)} style={uiStyle(s.stars)}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        strokeWidth={1}
        color={uiColor(star <= rating ? '#EAC44C' : '#E1E5EA')}
        fill={uiColor(star <= rating ? '#EAC44C' : '#E1E5EA')}
      />
    ))}
  </View>
)); };
export const ReviewCard = ({
  review,
  compact = false,
  onPress,
}: {
  review: Review;
  compact?: boolean;
  onPress?: () => void;
}) => {
  useUiPreferences();
  const [failedAvatar, setFailedAvatar] = useState(false);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? uiText(`Đọc đánh giá của ${review.user_name || 'Khách'}`) : uiText(undefined)}
      onPress={onPress}
      style={uiStyle([s.card, compact && s.compact])}
    >
      <View style={uiStyle(s.heading)}>
        {review.user_avatar && !failedAvatar ? (
          <Image
            source={{ uri: review.user_avatar }}
            onError={() => setFailedAvatar(true)}
            style={uiStyle(s.avatar)}
          />
        ) : (
          <View style={uiStyle(s.avatarFallback)}>
            <UserRound size={17} color={uiColor("#00A4BA")} />
          </View>
        )}
        <View style={uiStyle(s.person)}>
          <Text style={uiTextStyle(s.name)} numberOfLines={1}>
            {uiText(review.user_name || "Khách")}
          </Text>
          <Text style={uiTextStyle(s.date)}>{uiText(reviewDate(review.created_at, uiLocale()))}</Text>
        </View>
        <ReviewStars rating={Number(review.rating)} size={compact ? 10 : 12} />
      </View>
      <Text style={uiTextStyle(s.comment)} numberOfLines={compact ? 3 : undefined}>
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
