import { z } from 'zod';
import { isDate, validateStay } from '../domain/booking';
export const uuidParams = z.object({ id: z.string().uuid() });
export const receiptParams = z.object({ bookingId: z.string().uuid() });
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(50).default(12) });
export const notificationListSchema = paginationSchema.extend({ unreadOnly: z.enum(['true', 'false']).default('false').transform(value => value === 'true') }).strict();
export const notificationReadAllSchema = z.object({ before: z.string().datetime({ offset: true }).optional() }).strict();
export const notificationReadSchema = z.object({}).strict();
export const supportStatusSchema=z.object({status:z.enum(['open','waiting_guest','resolved'])}).strict();
export const supportReplySchema=z.object({body:z.string().trim().min(1).max(3000),requestId:z.string().uuid()}).strict();
export const supportCreateSchema=supportReplySchema.extend({bookingId:z.string().uuid(),subject:z.string().trim().min(3).max(150)}).strict();
export const supportListSchema=paginationSchema.extend({bookingId:z.string().uuid().optional(),status:supportStatusSchema.shape.status.optional()});
export const arrivalGuideSchema=z.object({instructions:z.string().trim().min(10).max(5000),contact:z.string().trim().max(300).default(''),revision:z.number().int().nonnegative()}).strict();
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
export const checkoutContactSchema = z.object({fullName:z.string().trim().min(2).max(100),email:z.string().trim().email().max(255),phone:z.string().trim().regex(/^[+()0-9 .-]{7,30}$/).optional()}).strict();
export const createBookingSchema = stay.extend({ requestId:z.string().uuid().optional(), expectedTotalCents:z.number().int().nonnegative().optional(), checkout:z.object({contact:checkoutContactSchema,policyVersion:z.string().max(50),accepted:z.literal(true)}).strict().optional(), specialRequests: z.string().max(500).optional(), paymentPlan: z.enum(['full','deposit']).default('full'),
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
export const adminQuerySchema = paginationSchema.extend({q:z.string().trim().max(200).optional(),status:z.string().max(30).optional(),isActive:z.enum(['true','false']).optional(),categoryId:z.string().uuid().optional(),city:z.string().trim().min(1).max(100).optional()});
export const categorySchema = z.object({name:z.string().trim().min(1).max(50),slug:z.string().regex(/^[a-z0-9-]{1,50}$/),iconName:z.string().min(1).max(50),description:z.string().max(1000).nullable().optional(),isActive:z.boolean().default(true)}).strict();
export const categoryPatchSchema = categorySchema.partial().strict();
const httpsUrl=z.string().url().max(2000).refine(value=>new URL(value).protocol==='https:','HTTPS URL required');
export const approvedListingMediaContextSchema=z.object({
  sourcePageUrl:httpsUrl,provider:z.string().trim().min(1).max(120),creator:z.string().trim().min(1).max(200),
  licenseName:z.string().trim().min(1).max(200),licenseUrl:httpsUrl,attributionText:z.string().trim().min(1).max(1000),
  contextLevel:z.literal('verified_property'),contextEvidence:z.string().trim().min(1).max(2000),usageStatus:z.literal('approved'),
  approvedFor:z.literal('property_listing').default('property_listing'),role:z.enum(['cover','bedroom','bathroom','common_area','exterior','view','amenity','other']),
  altText:z.string().trim().min(1).max(255),width:z.number().int().positive().max(20000).optional(),height:z.number().int().positive().max(20000).optional(),
  checkedAt:z.string().datetime({offset:true}),
}).strict();
export const listingSourceAuditSchema=z.object({
  sourcePageUrl:httpsUrl,mediaUsageStatus:z.enum(['approved','needs_review','blocked']),contextEvidence:z.string().trim().min(1).max(2000),
  reviewNotes:z.string().trim().max(2000).nullable().optional(),checkedAt:z.string().datetime({offset:true}).optional(),
}).strict();
export const listingSchema = z.object({
  hostId:z.string().uuid(),categoryId:z.string().uuid(),title:z.string().trim().min(1).max(255),description:z.string().max(10000).nullable().optional(),
  propertyType:z.string().min(1).max(50),roomType:z.enum(['entire_place','private_room','dormitory']),address:z.string().max(255).nullable().optional(),
  city:z.string().min(1).max(100),country:z.string().min(1).max(100),region:z.string().min(1).max(50),
  latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional(),
  pricePerNight:nonnegative.positive(),cleaningFee:nonnegative.default(0),serviceFee:nonnegative.default(0),maxGuests:z.number().int().min(1).max(1000),
  bedrooms:z.number().int().min(0).max(1000),beds:z.number().int().min(0).max(1000),bathrooms:z.number().int().min(0).max(1000),
  checkInTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('14:00'),checkOutTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('12:00'),isActive:z.boolean().default(true),
  amenityIds:z.array(z.string().uuid()).max(50).optional(),
  photos:z.array(z.object({photoUrl:httpsUrl,caption:z.string().max(255).optional(),isCover:z.boolean().default(false),mediaContext:approvedListingMediaContextSchema.optional()}).strict()).max(30).refine(v=>v.filter(p=>p.isCover).length<=1,'Only one cover photo').optional(),
  sourceAudit:listingSourceAuditSchema.optional(),
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
