/**
 * SkeletonLoader — Animated shimmer placeholders for listing cards.
 *
 * Uses React Native's `Animated` API instead of the Tailwind `animate-pulse`
 * class which does not work on react-native-web.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonBox: React.FC<{ style?: object }> = ({ style }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: false, // native driver not supported on react-native-web
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false, // native driver not supported on react-native-web
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.box, style, { opacity }]} />;
};

export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Image placeholder */}
      <SkeletonBox style={styles.image} />
      {/* Location + rating row */}
      <View style={styles.row}>
        <SkeletonBox style={styles.lineHalf} />
        <SkeletonBox style={styles.lineSmall} />
      </View>
      {/* Title */}
      <SkeletonBox style={styles.lineThreeQuarter} />
      {/* Price */}
      <SkeletonBox style={styles.lineQuarter} />
    </View>
  );
};

export const SkeletonListingList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
  },
  box: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lineHalf: {
    width: '50%',
    height: 14,
  },
  lineSmall: {
    width: 48,
    height: 14,
  },
  lineThreeQuarter: {
    width: '75%',
    height: 12,
    marginBottom: 12,
  },
  lineQuarter: {
    width: '25%',
    height: 18,
  },
});
