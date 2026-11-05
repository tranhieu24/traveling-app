import { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { preferences } from './store';
import { translate } from './translations';

export function useUiPreferences() { return useSyncExternalStore(preferences.subscribe, preferences.getSnapshot, preferences.getSnapshot); }
export function uiLocale() { return preferences.getSnapshot().language === 'en' ? 'en-US' : 'vi-VN'; }
export function uiText<T>(value: T): T {
  return (typeof value === 'string' ? translate(value, preferences.getSnapshot().language) : value) as T;
}
export function uiColor<T>(value: T, property = 'color'): T {
  if (!preferences.getSnapshot().isDark || typeof value !== 'string' || !/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(value)) return value;
  let hex = value.slice(1);
  if (hex.length === 3) hex = hex.split('').map(letter => letter + letter).join('');
  const [r, g, b] = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const maximum = Math.max(r, g, b), minimum = Math.min(r, g, b), light = (r + g + b) / 3;
  let result: string = value;
  if (/border|separator/i.test(property)) {
    if (maximum - minimum < 45 && light > 140) result = '#304451';
  } else if (/background/i.test(property)) {
    if (minimum > 200) result = maximum - minimum > 15 ? r > g + 15 && r > b + 10 ? '#3D222C' : g > r + 10 && g > b + 5 ? '#17392D' : b > r + 10 && b > g + 10 ? '#232D4A' : '#15333D' : minimum >= 250 ? '#172630' : '#111F29';
  } else if (/color|tint|stroke|fill/i.test(property)) {
    if (maximum - minimum < 70 && light < 100) result = '#EDF3F7';
    else if (maximum - minimum < 70 && light < 205) result = '#A8BBC7';
    else if (r < 35 && g > 80 && b > 80 && Math.abs(g - b) < 40) result = '#5DD9E7';
    else if (r > 140 && g < 110 && b < 135) result = '#FF9BA5';
    else if (r < 75 && g > 95 && b < 100) result = '#79D6A7';
    else if (r > 120 && g > 80 && g < 160 && b < 90) result = '#F0C36F';
  }
  return result as T;
}
export function uiStyle<T>(style: T): T {
  if (!preferences.getSnapshot().isDark || !style) return style;
  if (typeof style === 'function') return ((...args: unknown[]) => uiStyle((style as (...args: unknown[]) => unknown)(...args))) as T;
  if (Array.isArray(style)) return style.map(uiStyle) as T;
  if (typeof style === 'number') return uiStyle(StyleSheet.flatten(style as never)) as T;
  if (typeof style !== 'object') return style;
  const result = { ...style } as Record<string, unknown>;
  for (const key of Object.keys(result)) if (/color$/i.test(key)) result[key] = uiColor(result[key], key);
  return result as T;
}
export function uiTextStyle<T>(style: T): T {
  return (preferences.getSnapshot().isDark ? [{ color: '#EDF3F7' }, uiStyle(style)] : style) as T;
}
const classVariants: Record<string, string> = {
  'bg-white': 'dark:bg-[#172630]', 'bg-gray-50': 'dark:bg-[#111F29]', 'bg-gray-100': 'dark:bg-[#233744]',
  'bg-gray-200': 'dark:bg-[#304451]', 'bg-dark-bg': 'dark:bg-[#111F29]', 'bg-dark': 'dark:bg-[#233744]',
  'bg-cyan-50': 'dark:bg-[#15333D]', 'bg-cyan-100': 'dark:bg-[#1B4551]', 'bg-primary-50': 'dark:bg-[#15333D]',
  'bg-emerald-50': 'dark:bg-[#153A2B]', 'bg-amber-50': 'dark:bg-[#3B321D]', 'bg-red-50': 'dark:bg-[#3D222C]',
  'text-dark': 'dark:text-[#EDF3F7]', 'text-gray-900': 'dark:text-[#EDF3F7]', 'text-gray-800': 'dark:text-[#EDF3F7]',
  'text-gray-700': 'dark:text-[#D5E0E7]', 'text-gray-600': 'dark:text-[#A8BBC7]', 'text-gray-500': 'dark:text-[#A8BBC7]',
  'text-gray-400': 'dark:text-[#92A9B7]', 'text-dark-muted': 'dark:text-[#A8BBC7]',
  'border-gray-100': 'dark:border-[#304451]', 'border-gray-200': 'dark:border-[#304451]', 'border-gray-300': 'dark:border-[#405967]',
  'border-dark-border': 'dark:border-[#304451]', 'bg-[#FFFFFF]': 'dark:bg-[#172630]', 'bg-[#F8FAFC]': 'dark:bg-[#111F29]',
};
export function uiClasses<T>(value: T): T {
  if (typeof value !== 'string') return value;
  const additions = value.split(/\s+/).map(token => classVariants[token]).filter(Boolean);
  return (value + (additions.length ? ' ' + additions.join(' ') : '')) as T;
}
