import { z } from 'zod';

export const listingFilterSchema = z.object({
  categoryId: z.string().uuid().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  guests: z.coerce.number().min(1).optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  beds: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  amenityIds: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
  sortBy: z.enum(['recommended', 'price_asc', 'price_desc', 'rating']).default('recommended'),
});

export const bookingQuoteSchema = z.object({
  listingId: z.string().uuid('Invalid listing UUID'),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  guests: z.number().int().min(1),
});

export const createBookingSchema = z.object({
  listingId: z.string().uuid('Invalid listing UUID'),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  guests: z.number().int().min(1),
  specialRequests: z.string().max(500).optional(),
  paymentMethod: z.string().max(50).default('mock_credit_card'),
  mockCardLast4: z.string().length(4).default('4242'),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Review must be at least 5 characters').max(1000),
  // Các trường phụ trợ nếu có client cũ gửi kèm thì không bị lỗi validate
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  accuracyRating: z.number().int().min(1).max(5).optional(),
  checkinRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
});

export const toggleFavoriteSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  phoneNumber: z.string().max(30).optional(),
});
