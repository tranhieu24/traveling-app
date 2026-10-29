import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';

export const CYAN = '#00BCD4';
export const Counter = ({
  label,
  value,
  onChange,
  minimum = 0,
  maximum = 1000,
  any = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  minimum?: number;
  maximum?: number;
  any?: boolean;
}) => (
  <View style={s.counter}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Decrease ${label}`}
      hitSlop={6}
      disabled={value <= minimum}
      onPress={() => onChange(value - 1)}
      style={[s.circle, value <= minimum && s.disabled]}
    >
      <Minus size={18} color="#8B9097" />
    </Pressable>
    <Text accessibilityLabel={`${label}: ${any && value === 0 ? 'Any' : value}`} style={s.number}>
      {any && value === 0 ? 'Any' : value}
    </Text>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Increase ${label}`}
      hitSlop={6}
      disabled={value >= maximum}
      onPress={() => onChange(value + 1)}
      style={[s.circle, value >= maximum && s.disabled]}
    >
      <Plus size={18} color="#8B9097" />
    </Pressable>
  </View>
);
export const Checkbox = ({
  label,
  description,
  checked,
  onPress,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={label}
    accessibilityState={{ checked }}
    aria-checked={checked}
    onPress={onPress}
    style={s.checkRow}
  >
    <View style={{ flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      {description && <Text style={s.description}>{description}</Text>}
    </View>
    <View style={[s.box, checked && { borderColor: CYAN, backgroundColor: CYAN }]}>
      {checked && <Check color="white" size={16} />}
    </View>
  </Pressable>
);
export const searchStyles = StyleSheet.create({
  title: { fontSize: 25, fontWeight: '700', color: '#26282B', marginBottom: 22 },
  heading: { fontSize: 20, fontWeight: '700', color: '#26282B', marginBottom: 16 },
  text: { fontSize: 15, color: '#30343A' },
  muted: { fontSize: 14, color: '#969BA3', lineHeight: 21 },
  error: { color: '#BD3346', fontSize: 13, lineHeight: 19, marginTop: 10 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  action: {
    minHeight: 48,
    paddingHorizontal: 28,
    backgroundColor: CYAN,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  actionText: { fontSize: 16, fontWeight: '600', color: 'white' },
  clear: { fontSize: 15, color: '#30343A', textDecorationLine: 'underline' },
});
const s = StyleSheet.create({
  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C9CDD1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { width: 28, textAlign: 'center', color: '#30343A', fontSize: 16 },
  disabled: { opacity: 0.35 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 13 },
  label: { fontSize: 16, color: '#30343A' },
  description: { fontSize: 13, color: '#93979F', lineHeight: 20, marginTop: 7 },
  box: {
    width: 23,
    height: 23,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#A7ADB5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
