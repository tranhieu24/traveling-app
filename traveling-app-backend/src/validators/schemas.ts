import { z } from 'zod';
import { isDate, validateStay } from '../domain/booking';
export const uuidParams = z.object({ id: z.string().uuid() });
export const receiptParams = z.object({ bookingId: z.string().uuid() });
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(50).default(12) });
const date = z.string().refine(isDate, 'A real YYYY-MM-DD date is required');
const nonnegative = z.number().finite().min(0).max(99999999.99).multipleOf(0.01);
export const destinationQuerySchema = z.object({ q: z.string().trim().min(1).max(100), limit: z.coerce.number().int().min(1).max(20).default(8) });
export const listingFilterSchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(), q: z.string().trim().min(1).max(200).optional(),
  region: z.string().trim().min(1).max(100).optional(), city: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(), propertyType: z.string().trim().min(1).max(50).optional(),
  roomType: z.enum(['entire_place','private_room','dormitory']).optional(),
  roomTypes: z.union([z.string(),z.array(z.string())]).transform(v => [...new Set(Array.isArray(v) ? v : v.split(','))]).pipe(z.array(z.enum(['entire_place','private_room','dormitory'])).max(3)).optional(),
  cityExact: z.enum(['true','false']).transform(v => v === 'true').optional(),
  minPrice: z.coerce.number().finite().min(0).optional(), maxPrice: z.coerce.number().finite().min(0).optional(),
  guests: z.coerce.number().int().min(1).max(1000).optional(),
  bedrooms: z.coerce.number().int().min(0).max(1000).optional(), beds: z.coerce.number().int().min(0).max(1000).optional(), bathrooms: z.coerce.number().int().min(0).max(1000).optional(),
  amenityIds: z.union([z.string(),z.array(z.string())]).transform(v => [...new Set((Array.isArray(v) ? v : v.split(',')))]).pipe(z.array(z.string().uuid()).max(50)).optional(),
  checkIn: date.optional(), checkOut: date.optional(), sortBy: z.enum(['recommended','price_asc','price_desc','rating']).default('recommended'),
}).superRefine((v,c) => {
  if (v.minPrice !== undefined && v.maxPrice !== undefined && v.minPrice > v.maxPrice) c.addIssue({code:'custom',path:['maxPrice'],message:'maxPrice must be >= minPrice (nightly USD)'});
  if (!!v.checkIn !== !!v.checkOut) c.addIssue({code:'custom',path:['checkOut'],message:'Supply both checkIn and checkOut'});
  if (v.checkIn && v.checkOut) try { validateStay(v.checkIn,v.checkOut,v.guests ?? 1); } catch(e: any) { c.addIssue({code:'custom',path:['checkIn'],message:e.message}); }
});
const stay = z.object({ listingId: z.string().uuid(), checkInDate: date, checkOutDate: date, guests: z.number().int().min(1).max(1000), couponCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{1,40}$/).optional() });
const checkStay = (v: z.infer<typeof stay>, c: z.RefinementCtx) => {
  try { validateStay(v.checkInDate,v.checkOutDate,v.guests); } catch(e: any) { c.addIssue({code:'custom',path:['checkInDate'],message:e.message}); }
};
export const bookingQuoteSchema = stay.superRefine(checkStay);
export const createBookingSchema = stay.extend({ specialRequests: z.string().max(500).optional(), paymentPlan: z.enum(['full','deposit']).default('full'),
  paymentMethod: z.string().max(50).optional(), mockCardLast4: z.string().regex(/^\d{4}$/).optional(),
}).superRefine(checkStay);
export const bookingListSchema = paginationSchema.extend({status: z.enum(['all','pending','confirmed','cancelled','completed','expired']).default('all')});
export const reasonSchema = z.object({reason:z.string().trim().min(3).max(500)});
export const cancelSchema = z.object({reason:z.string().trim().min(3).max(500).default('Cancelled by guest')});
export const paymentSchema = z.object({plan:z.enum(['full','deposit','balance']).default('full')});
export const simulateSchema = z.object({outcome:z.enum(['succeeded','failed','timed_out'])});
export const refundDecisionSchema = reasonSchema.extend({decision:z.enum(['approve','reject'])});
export const createReviewSchema = z.object({ rating:z.number().int().min(1).max(5), comment:z.string().trim().min(5).max(1000),
  cleanlinessRating:z.number().int().min(1).max(5).optional(), accuracyRating:z.number().int().min(1).max(5).optional(), checkinRating:z.number().int().min(1).max(5).optional(), communicationRating:z.number().int().min(1).max(5).optional(), locationRating:z.number().int().min(1).max(5).optional(), valueRating:z.number().int().min(1).max(5).optional() });
export const toggleFavoriteSchema = z.object({listingId:z.string().uuid()});
export const updateProfileSchema = z.object({fullName:z.string().trim().min(2).max(100).optional(),avatarUrl:z.string().url().max(2000).optional(),phoneNumber:z.string().max(30).optional()}).strict();
export const adminQuerySchema = paginationSchema.extend({q:z.string().trim().max(200).optional(),status:z.string().max(30).optional(),isActive:z.enum(['true','false']).optional()});
export const categorySchema = z.object({name:z.string().trim().min(1).max(50),slug:z.string().regex(/^[a-z0-9-]{1,50}$/),iconName:z.string().min(1).max(50),description:z.string().max(1000).nullable().optional(),isActive:z.boolean().default(true)}).strict();
export const categoryPatchSchema = categorySchema.partial().strict();
export const listingSchema = z.object({
  hostId:z.string().uuid(),categoryId:z.string().uuid(),title:z.string().trim().min(1).max(255),description:z.string().max(10000).nullable().optional(),
  propertyType:z.string().min(1).max(50),roomType:z.enum(['entire_place','private_room','dormitory']),address:z.string().max(255).nullable().optional(),
  city:z.string().min(1).max(100),country:z.string().min(1).max(100),region:z.string().min(1).max(50),
  latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional(),
  pricePerNight:nonnegative.positive(),cleaningFee:nonnegative.default(0),serviceFee:nonnegative.default(0),maxGuests:z.number().int().min(1).max(1000),
  bedrooms:z.number().int().min(0).max(1000),beds:z.number().int().min(0).max(1000),bathrooms:z.number().int().min(0).max(1000),
  checkInTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('14:00'),checkOutTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('12:00'),isActive:z.boolean().default(true),
  amenityIds:z.array(z.string().uuid()).max(50).optional(), photos:z.array(z.object({photoUrl:z.string().url().max(2000),caption:z.string().max(255).optional(),isCover:z.boolean().default(false)})).max(30).refine(v=>v.filter(p=>p.isCover).length<=1,'Only one cover photo').optional(),
}).strict();
export const listingPatchSchema = listingSchema.partial().strict();
export const customerSchema = updateProfileSchema.extend({email:z.string().email().max(255).optional()}).strict();
export const accountStatusSchema = reasonSchema.extend({status:z.enum(['active','blocked'])}).strict();
const coupon = z.object({code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{1,40}$/),discountPercent:z.number().min(0.01).max(100).multipleOf(0.01),maxDiscount:nonnegative.nullable().optional(),minSubtotal:nonnegative.default(0),
  startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),maxUses:z.number().int().positive().max(100000000),perUserLimit:z.number().int().positive().default(1),listingId:z.string().uuid().nullable().optional(),categoryId:z.string().uuid().nullable().optional(),isActive:z.boolean().default(true)}).strict();
export const couponSchema = coupon.refine(v=>Date.parse(v.endsAt)>Date.parse(v.startsAt),{path:['endsAt'],message:'endsAt must follow startsAt'});
export const couponPatchSchema = coupon.partial().strict();
export const reportSchema = z.object({from:date,to:date}).superRefine((v,c)=>{
  if (v.to<v.from || Date.parse(v.to)-Date.parse(v.from)>366*86400000) c.addIssue({code:'custom',path:['to'],message:'Inclusive date range must be ordered and <= 367 days'});
});
