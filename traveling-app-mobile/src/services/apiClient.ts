import 'react-native-url-polyfill/auto';
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { resolveApiBaseUrl } from '../utils/apiUrl';
import { readAuthToken } from '../utils/authToken';


type GuestRetryConfig = InternalAxiosRequestConfig & { _retryAsGuest?: boolean };

const isPublicDiscoveryRequest = (config: GuestRetryConfig): boolean =>
  config.method?.toLowerCase() === 'get' &&
  /^\/(?:categories|amenities|destinations|listings(?:\/[^/]+(?:\/reviews)?)?)$/.test(
    (config.url || '').split('?')[0]
  );

// Resolve the native development backend from the same LAN host as Metro.
export const API_BASE_URL = resolveApiBaseUrl({
  platform: Platform.OS,
  development: __DEV__,
  override: process.env.EXPO_PUBLIC_API_URL,
  configuredUrl: Constants.expoConfig?.extra?.apiUrl,
  hostUri: Constants.expoConfig?.hostUri,
  webHostname: Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location?.hostname
    : undefined,
});

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
        : await readAuthToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (config.headers) {
        config.headers.delete('Authorization');
      }
    } catch {
      return Promise.reject(new Error('Could not read saved sign-in. Please enable site storage.'));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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