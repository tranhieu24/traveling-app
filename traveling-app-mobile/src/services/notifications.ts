import { apiClient } from './apiClient';
import { preferences } from '../preferences/store';

export type NotificationType = 'booking_created' | 'payment_received' | 'booking_cancelled' | 'refund_requested' | 'refund_succeeded';
export interface AppNotification {
  id: string; type: NotificationType; title: string; body: string;
  bookingId: string | null; createdAt: string; readAt: string | null;
}
export interface NotificationPage {
  items: AppNotification[]; unreadCount: number; fetchedAt: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export const notificationKeys = {
  list: (userId?: string) => ['notifications', userId] as const,
  count: (userId?: string) => ['notification-count', userId] as const,
};

export async function fetchNotifications(page: number, unreadOnly: boolean, signal?: AbortSignal): Promise<NotificationPage> {
  const { data } = await apiClient.get('/notifications', { params: { page, limit: 20, unreadOnly: String(unreadOnly) }, signal, headers: { 'Accept-Language': preferences.getSnapshot().language } });
  if (!data.success || !Array.isArray(data.data?.items) || !data.pagination) throw new Error('Chưa tải được thông báo.');
  return { ...data.data, pagination: data.pagination, fetchedAt: data.serverTime };
}
export async function fetchNotificationCount(signal?: AbortSignal): Promise<number> {
  const { data } = await apiClient.get('/notifications/unread-count', { signal });
  if (!data.success || !Number.isSafeInteger(data.data?.unreadCount) || data.data.unreadCount < 0) throw new Error('Chưa tải được số thông báo.');
  return data.data.unreadCount;
}
export async function readNotification(id: string, signal?: AbortSignal): Promise<{ unreadCount: number }> {
  const { data } = await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`, {}, { signal });
  if (!data.success) throw new Error('Chưa đánh dấu được thông báo.');
  return data.data;
}
export async function readAllNotifications(before?: string, signal?: AbortSignal): Promise<{ unreadCount: number }> {
  const { data } = await apiClient.patch('/notifications/read-all', before ? { before } : {}, { signal });
  if (!data.success) throw new Error('Chưa đánh dấu được các thông báo.');
  return data.data;
}

export function groupNotifications(items: AppNotification[], now = new Date()) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups = [
    { title: 'Hôm nay', data: [] as AppNotification[] },
    { title: 'Hôm qua', data: [] as AppNotification[] },
    { title: 'Trước đó', data: [] as AppNotification[] },
  ];
  for (const item of items) {
    const date = new Date(item.createdAt);
    groups[date >= today ? 0 : date >= yesterday ? 1 : 2].data.push(item);
  }
  return groups.filter(group => group.data.length);
}
