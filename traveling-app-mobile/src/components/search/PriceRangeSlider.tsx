import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { CYAN } from './SearchControls';

// The text inputs accompanying this control also support precise keyboard entry.
export const PriceRangeSlider = ({
  minimum,
  maximum,
  onChange,
}: {
  minimum: number | null;
  maximum: number | null;
  onChange: (low: number, high: number) => void;
}) => {
  const [width, setWidth] = useState(1);
  const high = Number.isFinite(maximum) && maximum !== null ? maximum : Math.max(250, minimum || 0);
  const low = Number.isFinite(minimum) && minimum !== null ? minimum : Math.min(10, high);
  const floor = Math.min(10, low, high),
    ceiling = Math.max(250, low + 1, high);
  const current = useRef({ low, high, floor, ceiling, width, onChange });
  current.current = { low, high, floor, ceiling, width, onChange };
  const origin = useRef({ low, high });
  const responder = (which: 'low' | 'high') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        origin.current = { low: current.current.low, high: current.current.high };
      },
      onPanResponderMove: (_, gesture) => {
        const c = current.current,
          value = Math.round(
            origin.current[which] + (gesture.dx / c.width) * (c.ceiling - c.floor)
          );
        if (which === 'low')
          c.onChange(Math.max(c.floor, Math.min(value, origin.current.high)), origin.current.high);
        else
          c.onChange(origin.current.low, Math.min(c.ceiling, Math.max(value, origin.current.low)));
      },
    });
  const left = useRef(responder('low')).current,
    right = useRef(responder('high')).current;
  const percent = (value: number) =>
    `${Math.max(0, Math.min(100, ((value - floor) / (ceiling - floor)) * 100))}%` as `${number}%`;
  return (
    <View
      style={s.wrap}
      onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
    >
      <View style={s.rail} />
      <View
        style={[
          s.rail,
          { backgroundColor: CYAN, left: percent(low), right: percent(ceiling - high + floor) },
        ]}
      />
      <View
        {...left.panHandlers}
        accessible
        accessibilityLabel="Minimum price handle; use minimum price input for keyboard entry"
        style={[s.thumb, { left: percent(low) }]}
      />
      <View
        {...right.panHandlers}
        accessible
        accessibilityLabel="Maximum price handle; use maximum price input for keyboard entry"
        style={[s.thumb, { left: percent(high) }]}
      />
    </View>
  );
};
const s = StyleSheet.create({
  wrap: { height: 46, marginHorizontal: 13, justifyContent: 'center', marginBottom: 15 },
  rail: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#E8EAED' },
  thumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    marginLeft: -13,
    borderRadius: 13,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: CYAN,
  },
});
