import { useUiPreferences, uiStyle } from '../../preferences/ui';
/**
 * SkeletonLoader — Animated shimmer placeholders for listing cards.
 *
 * Uses React Native's `Animated` API instead of the Tailwind `animate-pulse`
 * class which does not work on react-native-web.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonBox: React.FC<{ style?: object }> = ({ style }) => {
  useUiPreferences();
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

  return <Animated.View style={uiStyle([styles.box, style, { opacity }])} />;
};

export const SkeletonCard: React.FC = () => {
  useUiPreferences();
  return (
    <View style={uiStyle(styles.card)}>
      {/* Image placeholder */}
      <SkeletonBox style={uiStyle(styles.image)} />
      {/* Title and rating */}
      <View style={uiStyle(styles.row)}>
        <SkeletonBox style={uiStyle(styles.lineHalf)} />
        <SkeletonBox style={uiStyle(styles.lineSmall)} />
      </View>
      <View style={uiStyle(styles.row)}>
        <SkeletonBox style={uiStyle(styles.lineQuarter)} />
        <SkeletonBox style={uiStyle(styles.lineSmall)} />
      </View>
    </View>
  );
};

export const SkeletonListingList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  useUiPreferences();
  return (
    <View style={uiStyle(styles.listContainer)}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 26,
  },
  box: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 1.08,
    borderRadius: 7,
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
  lineQuarter: {
    width: '25%',
    height: 12,
  },
});
