import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiClient, API_BASE_URL } from './apiClient';
import { storage } from '../utils/storage';

export const downloadBookingReceipt = async (bookingId: string, bookingCode: string): Promise<void> => {
  const filename = `Receipt-${bookingCode.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || bookingId}.pdf`;
  const endpoint = `/payments/${encodeURIComponent(bookingId)}/receipt`;
  if (Platform.OS === 'web') {
    try {
      const response = await apiClient.get<Blob>(endpoint, { responseType: 'blob', timeout: 20000 });
      if (!response.data.size || !String(response.headers['content-type'] || response.data.type).includes('application/pdf')) {
        throw new Error('Máy chủ không trả về biên lai PDF. Vui lòng thử lại.');
      }
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      try { link.click(); }
      finally {
        link.remove();
        // Let the browser finish starting the download before releasing its URL.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      return;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) throw new Error('Vui lòng đăng nhập lại để tải biên lai.');
        if (error.response?.data instanceof Blob) {
          const body = await error.response.data.text();
          let message: string | undefined;
          try { message = JSON.parse(body)?.error?.message; } catch { /* Use the default message below. */ }
          throw new Error(message || 'Không thể tải biên lai. Vui lòng thử lại.');
        }
      }
      throw error;
    }
  }

  const token = await storage.getItem('traveling_auth_token');
  if (!token) throw new Error('Vui lòng đăng nhập lại để tải biên lai.');
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    throw new Error('Thiết bị này không hỗ trợ lưu hoặc chia sẻ tệp PDF.');
  }
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    const file = await FileSystem.downloadAsync(`${API_BASE_URL}${endpoint}`, fileUri, { headers: { Authorization: `Bearer ${token}` } });
    if (file.status !== 200) throw new Error(file.status === 401 ? 'Vui lòng đăng nhập lại để tải biên lai.' : 'Không thể tải biên lai. Vui lòng thử lại.');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Lưu biên lai thanh toán' });
  } finally {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }
};
