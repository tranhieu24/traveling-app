import axios from 'axios';
<<<<<<< HEAD
import type { InternalAxiosRequestConfig } from 'axios';
=======
import Constants from 'expo-constants';
>>>>>>> backup/code-cua-toi
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const AUTH_TOKEN_KEY = 'traveling_auth_token';

<<<<<<< HEAD
type GuestRetryConfig = InternalAxiosRequestConfig & { _retryAsGuest?: boolean };

const isPublicDiscoveryRequest = (config: GuestRetryConfig): boolean =>
  config.method?.toLowerCase() === 'get' &&
  /^\/(?:categories|amenities|destinations|listings(?:\/[^/]+(?:\/reviews)?)?)$/.test(
    (config.url || '').split('?')[0]
  );

// Bắt buộc: Web dùng localhost, Mobile thật mới dùng IP LAN 192.168.1.166
=======
// Web uses localhost; physical devices use the LAN URL configured in app.json.
>>>>>>> backup/code-cua-toi
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
      const token = (config as GuestRetryConfig)._retryAsGuest
        ? null
        : await storage.getItem(AUTH_TOKEN_KEY);
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

<<<<<<< HEAD
// An expired saved session must not prevent anonymous discovery.
// Retry only public reads, once, without credentials. Protected calls keep 401.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const config = error.config as GuestRetryConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retryAsGuest ||
      !isPublicDiscoveryRequest(config)
    ) {
      return Promise.reject(error);
    }

    config._retryAsGuest = true;
    config.headers.delete('Authorization');
    return apiClient.request(config);
  }
);

export default apiClient;
=======
export default apiClient;
>>>>>>> backup/code-cua-toi
