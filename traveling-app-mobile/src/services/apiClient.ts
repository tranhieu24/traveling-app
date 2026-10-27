import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const AUTH_TOKEN_KEY = 'traveling_auth_token';

// Bắt buộc: Web dùng localhost, Mobile thật mới dùng IP LAN 192.168.1.166
const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api/v1';
  }
  return 'http://192.168.1.166:5000/api/v1';
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