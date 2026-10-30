import type { Booking, User } from './index';

export type AdminSection =
  | 'overview'
  | 'listings'
  | 'categories'
  | 'customers'
  | 'bookings'
  | 'refunds'
  | 'coupons'
  | 'revenue';
export type AdminResource = Exclude<AdminSection, 'overview' | 'revenue'>;
export interface AdminRecord {
  id: string;
  [key: string]: any;
}
export interface AdminPage {
  items: AdminRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export interface AdminFilters {
  q?: string;
  status?: string;
  isActive?: string;
  categoryId?: string;
  city?: string;
  page?: number;
  limit?: number;
}
export interface RevenueDay {
  day: string;
  provider: string;
  is_simulated: boolean;
  gross_payments: number | string;
  refunds: number | string;
  net_revenue: number | string;
  successful_transactions: number | string;
  successful_refunds: number | string;
}
export interface RevenueReport {
  from: string;
  to: string;
  timezone: string;
  currency: string;
  scope: string;
  gross_payments: number | string;
  refunds: number | string;
  net_revenue: number | string;
  items: RevenueDay[];
}
export type AdminBooking = Booking & {
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  net_paid?: number | string;
};
export type AdminUser = User & {
  account_status?: 'active' | 'blocked';
  auth_sync_pending?: boolean;
};
