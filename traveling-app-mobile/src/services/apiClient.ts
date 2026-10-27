import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Xác định URL của Backend API
// - Trên Android Emulator: 10.0.2.2
// - Trên iOS Simulator hoặc web: localhost
// - Hoặc lấy từ app.json extra
const getBaseUrl = () => {
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl) return extraUrl;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }
  return 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor chèn JWT Token từ SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('traveling_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Could not retrieve auth token from SecureStore:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('traveling_auth_token');
      } catch (e) {
        console.warn('Error clearing auth token on 401:', e);
      }
    }
    return Promise.reject(error);
  }
);
