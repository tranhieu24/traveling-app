import type { NavigatorScreenParams } from '@react-navigation/native';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone_number?: string;
  role: 'guest' | 'host' | 'admin';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface MediaContext {contextLevel:'verified_property'|'illustrative';sourcePageUrl:string;creator:string;licenseName:string;licenseUrl:string;attributionText:string;altText:string;caption?:string}
export interface ListingPhoto {
  media_context?: MediaContext | null;
  id: string;
  listing_id: string;
  photo_url: string;
  caption?: string;
  display_order: number;
  is_cover: boolean;
}

export type RoomType = 'entire_place' | 'private_room' | 'dormitory';
export interface ListingPricing { currency: string; nightlyRate: number; roomSubtotal: number; cleaningFee: number; serviceFee: number; discountAmount: number; taxRate: number; taxAmount: number; tripTotal: number; totalNights: number }

export interface Listing {
  photo_context?: MediaContext | null;
  id: string;
  title: string;
  description?: string | null;
  property_type: string;
  room_type: string;
  address?: string;
  city: string;
  state_province?: string;
  country: string;
  region: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  price_per_night: number | string;
  cleaning_fee: number | string;
  service_fee: number | string;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating_avg: number | string;
  review_count: number;
  category_name?: string;
  category_slug?: string;
  cover_photo?: string;
  photos?: ListingPhoto[];
  amenities?: Amenity[];
  host_name?: string;
  host_avatar?: string;
  is_favorite?: boolean;
  nightly_rate?: number;
  currency?: string;
  pricing?: ListingPricing | null;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  cleanliness_rating?: number;
  accuracy_rating?: number;
  checkin_rating?: number;
  communication_rating?: number;
  location_rating?: number;
  value_rating?: number;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
}

export type PaymentPlan = 'full' | 'deposit' | 'balance';

export interface BookingPayment {
  id: string;
  booking_id?: string;
  idempotency_key?: string;
  expires_at?: string;
  requested_plan?: 'full' | 'deposit' | 'balance';
  amount: number | string;
  currency?: string;
  payment_status: 'pending' | 'succeeded' | 'failed' | 'timed_out' | 'refunded';
  payment_method?: string;
  provider?: string;
  provider_payment_id?: string | null;
  transaction_reference?: string | null;
  paid_at?: string | null;
  created_at?: string;
  is_simulated?: boolean;
}

export interface BookingRefund {
  id: string;
  payment_id: string;
  booking_id: string;
  amount: number | string;
  status: 'requested' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'rejected';
  reason: string;
  decision_reason?: string | null;
  provider_refund_id?: string | null;
  succeeded_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Booking {
  photo_context?: MediaContext | null;
  server_time?: string;
  contact_snapshot?: {fullName:string;email:string;phone?:string} | null;
  policy_snapshot?: CheckoutPolicy | null;
  policy_accepted_at?: string | null;
  id: string;
  booking_code: string;
  guest_id?: string;
  host_name?: string;
  host_phone?: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  listing_id: string;
  listing_title: string;
  listing_city: string;
  listing_country: string;
  property_type: string;
  cover_photo?: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  number_of_guests: number;
  base_price_total: number | string;
  tax_amount?: number | string;
  discount_amount?: number | string;
  cleaning_fee: number | string;
  service_fee: number | string;
  total_price: number | string;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired';
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'refunded' | 'failed';
  payments?: BookingPayment[];
  refunds?: BookingRefund[];
  payment_plan?: 'full' | 'deposit';
  payment_due_at?: string | null;
  amount_paid?: number | string;
  amount_refunded?: number | string;
  balance_due?: number | string;
  special_requests?: string;
  transaction_reference?: string;
  payment_method?: string;
  mock_card_last4?: string;
  paid_at?: string;
  created_at: string;
}

export interface CheckoutPolicy { version:string; currency:string; depositAmount:number; cancellationCutoffDays?:number; timezone:string; cancellation:string; payment:string; hold:string }
export interface BookingQuote {
  photoContext?: MediaContext | null;
  policy?: CheckoutPolicy;
  serverTime?: string;
  currency?: string;
  taxAmount?: number;
  taxRate?: number;
  discountAmount?: number;
  adults?: number;
  children?: number;
  listingId: string;
  title: string;
  city: string;
  coverPhoto?: string;
  pricePerNight: number;
  totalNights: number;
  basePriceTotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  maxGuests: number;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  AuthCallback: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Support: { bookingId?: string } | undefined;
  AdminSupport: undefined;
  CreateAccount: undefined;
  Login: undefined;
  AdminLogin: undefined;
  AdminPortal: { section?: import('./admin').AdminSection } | undefined;
  Register: undefined;
  Settings: undefined;
  Notifications: undefined;
  HelpCenter: { articleId?:string } | undefined;
  PaymentsPayouts: { tab?: 'payments' | 'payouts' } | undefined;
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  ListingDetail: {
    listingId: string;
    openBooking?: boolean;
    trip?: { checkInDate: string; checkOutDate: string; adults: number; children: number };
  };
  SearchSheet: { step?: 'where' | 'when' | 'who' } | undefined;
  FilterSheet: undefined;
  SearchResults: undefined;
  OrderReview: { quote: BookingQuote };
  Payment: { bookingId: string; plan?: PaymentPlan };
  BookingSuccess: { bookingId: string; bookingCode?: string };
  BookingDetail: { bookingId: string };
  AllReviews: { listingId: string; ratingAvg?: number; reviewCount?: number; listingTitle?: string };
  WriteReview: { listingId: string; listingTitle?: string };
};

export type BottomTabParamList = {
  SearchTab: undefined;
  FavoritesTab: undefined;
  BookingsTab: undefined;
  InboxTab: undefined;
  ProfileTab: undefined;
};
