import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { createPreferenceStore } from './model';

export const preferences = createPreferenceStore(AsyncStorage, () => Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
