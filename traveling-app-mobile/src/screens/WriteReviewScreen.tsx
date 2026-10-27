import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';

export const WriteReviewScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'WriteReview'>>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { listingId, listingTitle } = route.params;
  const { user } = useAuth();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to submit a review.');
      return;
    }
    if (comment.trim().length < 5) {
      Alert.alert('Too Short', 'Review comment must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/listings/${listingId}/reviews`, {
        rating,
        comment: comment.trim(),
      });

      if (res.data.success) {
        Alert.alert('Review Submitted', 'Thank you for your feedback!', [
          {
            text: 'OK',
            onPress: () => {
              queryClient.invalidateQueries({ queryKey: ['listing_detail', listingId] });
              queryClient.invalidateQueries({ queryKey: ['listing_reviews', listingId] });
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Submission Error', err.response?.data?.error?.message || 'Could not submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Write a Review" />

      <ScrollView className="flex-1 p-5">
        <Text className="text-base font-bold text-dark mb-1">
          {listingTitle}
        </Text>
        <Text className="text-xs text-dark-muted mb-6">
          How was your stay? Rate your overall experience.
        </Text>

        {/* Star Rating Selector */}
        <View className="flex-row items-center justify-center space-x-3 py-4 mb-6 bg-gray-50 rounded-2xl border border-gray-100">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              className="p-1"
            >
              <Star
                size={36}
                color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                fill={star <= rating ? '#F59E0B' : 'none'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Review Comment Input */}
        <Text className="text-xs font-semibold text-dark mb-2 uppercase">
          Your Feedback
        </Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience, what you loved most, and tips for future guests..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          className="border border-gray-200 rounded-2xl p-4 text-xs text-dark bg-gray-50 h-36 mb-6"
        />

        <Button
          title="Submit Review"
          onPress={handleSubmit}
          loading={isSubmitting}
          variant="primary"
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
};
