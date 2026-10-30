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
        throw new Error('The server did not return a PDF receipt. Please try again.');
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
        if (error.response?.status === 401) throw new Error('Please log in again to download your receipt.');
        if (error.response?.data instanceof Blob) {
          const body = await error.response.data.text();
          let message: string | undefined;
          try { message = JSON.parse(body)?.error?.message; } catch { /* Use the default message below. */ }
          throw new Error(message || 'Could not download your receipt. Please try again.');
        }
      }
      throw error;
    }
  }

  const token = await storage.getItem('traveling_auth_token');
  if (!token) throw new Error('Please log in again to download your receipt.');
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    throw new Error('Saving or sharing PDF files is not available on this device.');
  }
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    const file = await FileSystem.downloadAsync(`${API_BASE_URL}${endpoint}`, fileUri, { headers: { Authorization: `Bearer ${token}` } });
    if (file.status !== 200) throw new Error(file.status === 401 ? 'Please log in again to download your receipt.' : 'Could not download your receipt. Please try again.');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save your payment receipt' });
  } finally {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }
};
