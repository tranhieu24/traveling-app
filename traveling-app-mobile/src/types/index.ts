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

export interface ListingPhoto {
  id: string;
  listing_id: string;
  photo_url: string;
  caption?: string;
  display_order: number;
  is_cover: boolean;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  property_type: string;
  room_type: string;
  address?: string;
  city: string;
  state_province?: string;
  country: string;
  region: string;
  latitude?: number;
  longitude?: number;
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
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  cleanliness_rating: number;
  accuracy_rating: number;
  checkin_rating: number;
  communication_rating: number;
  location_rating: number;
  value_rating: number;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
}

export interface Booking {
  id: string;
  booking_code: string;
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
  cleaning_fee: number | string;
  service_fee: number | string;
  total_price: number | string;
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  special_requests?: string;
  transaction_reference?: string;
  payment_method?: string;
  mock_card_last4?: string;
  paid_at?: string;
  created_at: string;
}

export interface BookingQuote {
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
  CreateAccount: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  ListingDetail: { listingId: string };
  SearchSheet: undefined;
  FilterSheet: undefined;
  SearchResults: undefined;
  OrderReview: { quote: BookingQuote };
  BookingSuccess: { bookingId: string; bookingCode: string };
  BookingDetail: { bookingId: string };
  AllReviews: { listingId: string; ratingAvg: number; reviewCount: number };
  WriteReview: { listingId: string; listingTitle: string };
};

export type BottomTabParamList = {
  SearchTab: undefined;
  FavoritesTab: undefined;
  BookingsTab: undefined;
  InboxTab: undefined;
  ProfileTab: undefined;
};
