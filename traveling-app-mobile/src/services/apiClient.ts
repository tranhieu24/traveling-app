import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const AUTH_TOKEN_KEY = 'traveling_auth_token';

// Web uses localhost; physical devices use the LAN URL configured in app.json.
const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api/v1';
  }
  const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (typeof configuredApiUrl !== 'string' || !configuredApiUrl) {
    throw new Error('Missing expo.extra.apiUrl in app.json');
  }

  return configuredApiUrl;
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor gắn Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem(AUTH_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[apiClient] Lỗi đọc token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
