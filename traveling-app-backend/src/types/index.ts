import { Request, Response } from 'express';

export type UserRole = 'guest' | 'host' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: UserRole;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// =============================================================================
// DATABASE ENTITIES (matching schema.sql)
// =============================================================================

export interface UserEntity {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  created_at: string;
}

export interface AmenityEntity {
  id: string;
  name: string;
  icon_name: string;
  group_name: string;
  created_at: string;
}

export type RoomType = 'entire_place' | 'private_room' | 'dormitory';

export interface ListingEntity {
  id: string;
  host_id: string;
  category_id: string;
  title: string;
  description?: string | null;
  property_type: string;
  room_type: RoomType;
  address?: string | null;
  city: string;
  country: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  price_per_night: number;
  cleaning_fee: number;
  service_fee: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  check_in_time: string;
  check_out_time: string;
  rating_avg: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingPhotoEntity {
  id: string;
  listing_id: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'timed_out' | 'refunded';

export interface BookingEntity {
  id: string;
  booking_code: string;
  guest_id: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  number_of_guests: number;
  price_per_night: number;
  cleaning_fee: number;
  service_fee: number;
  total_price: number;
  booking_status: BookingStatus;
  special_requests?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentEntity {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: PaymentStatus;
  transaction_reference?: string | null;
  mock_card_last4?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface ReviewEntity {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface FavoriteEntity {
  user_id: string;
  listing_id: string;
  created_at: string;
}

// =============================================================================
// API RESPONSE WRAPPERS
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any[];

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', details?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: ApiResponse['pagination']
) => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
  };
  if (pagination) {
    payload.pagination = pagination;
  }
  return res.status(statusCode).json(payload);
};
