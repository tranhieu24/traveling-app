import fs from 'fs';
import path from 'path';
import {zodToJsonSchema} from 'zod-to-json-schema';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as s from '../validators/schemas';

const out=path.resolve('../docs');
const id='11111111-1111-4111-8111-111111111111';
const ref=(name:string)=>({$ref:'#/components/schemas/'+name});
const object=(properties:any,required:string[]=[])=>({type:'object',properties,...(required.length?{required}:{})});
const text={type:'string'},uuid={type:'string',format:'uuid'},number={type:'number'},integer={type:'integer'},boolean={type:'boolean'};
const money={oneOf:[number,{type:'string',pattern:'^-?[0-9]+([.][0-9]{1,2})?$'}],description:'USD decimal. PostgreSQL numeric columns may be strings; quote pricing uses numbers.'};
const decimal={oneOf:[number,text]};
const schemas:any={};
for(const [name,schema]of Object.entries({
  ListingFilter:s.listingFilterSchema,PaginationQuery:s.paginationSchema,BookingListQuery:s.bookingListSchema,AdminQuery:s.adminQuerySchema,
  QuoteRequest:s.bookingQuoteSchema,CreateBookingRequest:s.createBookingSchema,ReviewRequest:s.createReviewSchema,FavoriteRequest:s.toggleFavoriteSchema,
  ProfilePatch:s.updateProfileSchema,PaymentRequest:s.paymentSchema,SimulationRequest:s.simulateSchema,Reason:s.reasonSchema,CancelRequest:s.cancelSchema,
  CategoryRequest:s.categorySchema,CategoryPatch:s.categoryPatchSchema,ListingRequest:s.listingSchema,ListingPatch:s.listingPatchSchema,
  CouponRequest:s.couponSchema,CouponPatch:s.couponPatchSchema,CustomerPatch:s.customerSchema,AccountStatus:s.accountStatusSchema,RefundDecision:s.refundDecisionSchema,ReportQuery:s.reportSchema,
}))schemas[name]=zodToJsonSchema(schema as any,{target:'openApi3',$refStrategy:'none'});
schemas.Error=object({success:{type:'boolean',enum:[false]},error:object({code:text,message:text,details:{type:'array',items:{type:'object',additionalProperties:true}}},['code','message'])},['success','error']);
schemas.Pagination=object({page:integer,limit:integer,total:integer,totalPages:integer},['page','limit','total','totalPages']);
schemas.User=object({id:uuid,email:text,full_name:text,avatar_url:{...text,nullable:true},phone_number:{...text,nullable:true},role:{type:'string',enum:['guest','host','admin']},account_status:{type:'string',enum:['active','blocked']},auth_sync_pending:boolean,auth_sync_error:{...text,nullable:true}});
schemas.Category=object({id:uuid,name:text,slug:text,icon_name:text,icon:text,description:{...text,nullable:true},is_active:boolean});
schemas.Amenity=object({id:uuid,name:text,icon_name:text,icon:text,group_name:text,category:text});
schemas.Pricing=object({currency:{type:'string',enum:['USD']},nightlyRate:number,roomSubtotal:number,cleaningFee:number,serviceFee:number,discountAmount:number,taxAmount:number,taxRate:number,tripTotal:number,totalNights:integer});
schemas.Quote={allOf:[ref('Pricing'),object({listingId:uuid,title:text,city:text,coverPhoto:{...text,nullable:true},checkInDate:{type:'string',format:'date'},checkOutDate:{type:'string',format:'date'},guests:integer,maxGuests:integer,pricePerNight:number,basePriceTotal:number,totalPrice:number,quoteIsReservation:{type:'boolean',enum:[false]}})]};
schemas.Listing=object({id:uuid,host_id:uuid,category_id:uuid,title:text,description:{...text,nullable:true},property_type:text,room_type:{type:'string',enum:['entire_place','private_room','dormitory']},address:text,city:text,country:text,region:text,latitude:{...decimal,nullable:true},longitude:{...decimal,nullable:true},price_per_night:money,nightly_rate:number,cleaning_fee:money,service_fee:money,max_guests:integer,bedrooms:integer,beds:integer,bathrooms:integer,rating_avg:money,review_count:integer,is_active:boolean,is_favorite:boolean,cover_photo:{...text,nullable:true},pricing:{allOf:[ref('Pricing')],nullable:true},photos:{type:'array',items:{type:'object'}},amenities:{type:'array',items:ref('Amenity')}});
schemas.Payment=object({id:uuid,booking_id:uuid,user_id:uuid,amount:money,currency:text,payment_status:{type:'string',enum:['pending','succeeded','failed','timed_out','refunded']},provider:{type:'string',enum:['mock','legacy_mock','stripe_test']},is_simulated:boolean,provider_payment_id:{...text,nullable:true},transaction_reference:{...text,nullable:true},paid_at:{type:'string',format:'date-time',nullable:true},expires_at:{type:'string',format:'date-time',nullable:true}});
schemas.Refund=object({id:uuid,payment_id:uuid,booking_id:uuid,amount:money,status:{type:'string',enum:['requested','approved','processing','succeeded','failed','rejected']},reason:text,decision_reason:{...text,nullable:true},provider_refund_id:{...text,nullable:true},succeeded_at:{type:'string',format:'date-time',nullable:true}});
schemas.Booking=object({id:uuid,booking_code:text,guest_id:uuid,listing_id:uuid,check_in_date:{type:'string',format:'date'},check_out_date:{type:'string',format:'date'},total_nights:integer,number_of_guests:integer,booking_status:{type:'string',enum:['pending','confirmed','cancelled','completed','expired']},payment_plan:{type:'string',enum:['full','deposit']},payment_due_at:{type:'string',format:'date-time',nullable:true},price_per_night:money,nightly_rate:money,base_price_total:money,cleaning_fee:money,service_fee:money,discount_amount:money,tax_rate:decimal,tax_amount:money,total_price:money,trip_total:money,amount_paid:money,amount_refunded:money,net_paid:money,balance_due:money,payment_status:{type:'string',enum:['pending','partially_paid','paid','refunded']},payments:{type:'array',items:ref('Payment')},refunds:{type:'array',items:ref('Refund')}});
schemas.BookingCreated=object({booking:ref('Booking'),payment:{type:'object',nullable:true,description:'Always null: initialize payment separately'}});
schemas.PaymentInitialized=object({payment:ref('Payment'),clientSecret:{type:'string',nullable:true,description:'Only pass to Stripe client SDK; never log or store in URL'},simulation:boolean});
schemas.Cancellation=object({booking:ref('Booking'),refunds:{type:'array',items:ref('Refund')},message:text});
schemas.Review=object({id:uuid,listing_id:uuid,user_id:uuid,rating:integer,comment:text,created_at:{type:'string',format:'date-time'},user_name:text,user_avatar:{...text,nullable:true}});
schemas.Coupon=object({id:uuid,code:text,discount_percent:money,max_discount:{...money,nullable:true},min_subtotal:money,starts_at:{type:'string',format:'date-time'},ends_at:{type:'string',format:'date-time'},max_uses:integer,used_count:integer,per_user_limit:integer,listing_id:{...uuid,nullable:true},category_id:{...uuid,nullable:true},is_active:boolean});
schemas.AuditLog=object({id:uuid,actor_id:uuid,action:text,entity_type:text,entity_id:uuid,before_data:{type:'object',nullable:true},after_data:{type:'object',nullable:true},created_at:{type:'string',format:'date-time'}});
schemas.Revenue=object({from:text,to:text,timezone:{type:'string',enum:['UTC']},currency:{type:'string',enum:['USD']},scope:{type:'string',enum:['test_and_mock_only']},gross_payments:money,refunds:money,net_revenue:money,items:{type:'array',items:object({day:text,provider:text,is_simulated:boolean,gross_payments:money,refunds:money,net_revenue:money,successful_transactions:integer,successful_refunds:integer})}});
schemas.Object={type:'object',additionalProperties:true};
schemas.MockEvent=object({id:{type:'string',minLength:1,maxLength:200},paymentId:uuid,type:{type:'string',enum:['succeeded','failed','timed_out']},amount:{type:'integer',minimum:0,description:'Integer cents; must exactly match the stored payment'},currency:{type:'string',enum:['USD']}},['id','paymentId','type','amount','currency']);
const paths:any={};const rows:any[]=[];
const errorLabels:any={400:'Invalid input/signature',401:'Missing, invalid, expired or revoked Supabase access token',403:'Account blocked or permission denied',404:'Resource unavailable or not owned',409:'Business conflict',413:'Body too large',429:'Rate limited',502:'Provider request unconfirmed; retry the same key/ID',503:'Dependency unavailable or payment mode disabled',500:'Unexpected server error'};
function add(method:string,url:string,title:string,permission:string,dataName='Object',example:any={},opts:any={}) {
  const full=opts.root?url:'/api/v1'+url,status=opts.status||200;
  const params:any[]=[];
  for(const name of full.matchAll(/\{([^}]+)\}/g))params.push({name:name[1],in:'path',required:true,schema:uuid,example:id});
  if(opts.query)for(const [name,schema]of Object.entries(schemas[opts.query].properties||{}))params.push({name,in:'query',required:(schemas[opts.query].required||[]).includes(name),schema,description:name==='minPrice'||name==='maxPrice'?'Nightly USD, not whole-trip total':name==='checkIn'||name==='checkOut'?'Both dates required together; real dates, UTC, no past check-in, max 365 nights':undefined});
  if(opts.key)params.push({name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',pattern:'^[A-Za-z0-9_-]{8,100}$'},example:'booking-payment-example-01'});
  if(opts.signature)params.push({name:opts.signature,in:'header',required:true,schema:text,description:'Computed from exact raw JSON bytes with timestamp; see FRONTEND_INTEGRATION.md and RUNBOOK.md'});
  const wrapped=opts.plain?example:{success:true,data:example,...(opts.list?{pagination:{page:1,limit:12,total:1,totalPages:1}}:{})};
  const dataSchema=(opts.list||opts.array)?{type:'array',items:ref(dataName)}:ref(dataName);
  const successSchema=opts.plain?{type:'object'}:object({success:{type:'boolean',enum:[true]},data:dataSchema,...(opts.list?{pagination:ref('Pagination')}:{})},['success','data']);
  const responses:any={[status]:{description:opts.binary?'Authenticated file download':title,content:{[opts.binary||'application/json']:opts.binary?{schema:{type:'string',format:'binary'}}:{schema:successSchema,example:wrapped}}}};
  const errs=[400,404,409,429,500,...(permission==='public'?[]:[401,403]),...(opts.extraStatuses||[])];
  for(const code of [...new Set(errs)])responses[code]={description:errorLabels[code],content:{'application/json':{schema:ref('Error'),example:{success:false,error:{code:code===401?'AUTH_REQUIRED':code===403?'FORBIDDEN':code===400?'VALIDATION_ERROR':code===409?(opts.errors||'INVALID_STATE_TRANSITION').split(',')[0]:'NOT_FOUND',message:errorLabels[code],details:[]}}}}};
  const operation:any={summary:title,operationId:method+'_'+full.replace(/[^a-zA-Z0-9]/g,'_'),tags:[url.startsWith('/admin')?'Admin':url.split('/')[1]||'Health'],description:opts.description||title,'x-permission':permission,'x-error-codes':opts.errors||'',security:permission==='public'?[]:permission==='optional'? [{},{bearerAuth:[]}]:[{bearerAuth:[]}],parameters:params,responses};
  if(opts.request)operation.requestBody={required:true,content:{'application/json':{schema:ref(opts.request),example:opts.body}}};
  if(permission==='admin')operation.description+=' Requires public.users.role=admin and account_status=active (server checked).';
  if(opts.extraSuccess)responses[202]={description:'Local update saved; Supabase synchronization pending, retry auth-sync',content:{'application/json':{schema:successSchema,example:{success:true,data:{id,auth_sync_pending:true}}}}};
  (paths[full]||={})[method.toLowerCase()]=operation;
  rows.push({method:method.toUpperCase(),url:full,title,permission,status,example:wrapped,...opts,operation});
}
const user={id,email:'guest@example.test',full_name:'Traveler',role:'guest',account_status:'active'};
const listing={id,title:'Beach Apartment',city:'Da Nang',country:'Vietnam',region:'Asia',room_type:'entire_place',price_per_night:'100.00',nightly_rate:100,max_guests:4,bedrooms:2,beds:3,bathrooms:1};
const quote={currency:'USD',listingId:id,title:'Beach Apartment',city:'Da Nang',nightlyRate:100,totalNights:2,roomSubtotal:200,cleaningFee:20,serviceFee:10,discountAmount:0,taxRate:0,taxAmount:0,tripTotal:230,pricePerNight:100,basePriceTotal:200,totalPrice:230,checkInDate:'2099-01-10',checkOutDate:'2099-01-12',guests:2,maxGuests:4,quoteIsReservation:false};
const stay={listingId:id,checkInDate:'2099-01-10',checkOutDate:'2099-01-12',guests:2};
const booking={id,booking_code:'TRV-example',guest_id:id,listing_id:id,check_in_date:'2099-01-10',check_out_date:'2099-01-12',total_nights:2,number_of_guests:2,price_per_night:'100.00',total_price:'230.00',booking_status:'pending',payment_plan:'deposit',amount_paid:'0.00',balance_due:'230.00',payment_status:'pending'};
const payment={id,booking_id:id,user_id:id,amount:'30.00',currency:'USD',payment_status:'pending',provider:'mock',is_simulated:true};
const refund={id,payment_id:id,booking_id:id,amount:'30.00',status:'requested',reason:'Plans changed'};
const category={id,name:'Beach',slug:'beach',icon_name:'sun',is_active:true};
const coupon={id,code:'SUMMER',discount_percent:'10.00',starts_at:'2000-01-01T00:00:00Z',ends_at:'2100-01-01T00:00:00Z',max_uses:100,used_count:0,per_user_limit:1,is_active:true};

add('get','/auth/me','Đọc hồ sơ phiên hiện tại','authenticated','User',user);
add('patch','/auth/me','Cập nhật hồ sơ của chính mình','authenticated','User',user,{request:'ProfilePatch',body:{fullName:'Traveler Updated'},errors:'VALIDATION_ERROR'});
add('get','/categories','Danh mục đang hoạt động','public','Category',[category],{list:false,array:true});
add('get','/amenities','Danh sách tiện nghi','public','Amenity',[{id,name:'WiFi',icon:'wifi',category:'Facilities'}],{array:true});
add('get','/listings','Tìm kiếm chỗ ở và giá toàn chuyến khi có cặp ngày','optional','Listing',[listing],{list:true,query:'ListingFilter',errors:'VALIDATION_ERROR',description:'q matches title/city/country/address; all amenities are required. minPrice/maxPrice and price sorting use nightly USD. checkIn/checkOut must be supplied together. Optional Bearer token personalizes favorites; an invalid/blocked supplied token is rejected. pricing=null without dates; otherwise server pricing includes fees, configured tax, no coupon.'});
add('get','/listings/{id}','Chi tiết chỗ ở đang hoạt động','optional','Listing',listing,{errors:'NOT_FOUND,VALIDATION_ERROR'});
add('get','/listings/{id}/reviews','Danh sách đánh giá','public','Review',[{id,user_id:id,rating:5,comment:'A great stay',user_name:'Traveler'}],{query:'PaginationQuery',list:true});
add('post','/listings/{id}/reviews','Gửi đánh giá sau booking completed','authenticated','Review',{id,listing_id:id,user_id:id,rating:5,comment:'A great stay'},{request:'ReviewRequest',body:{rating:5,comment:'A great stay'},status:201,errors:'REVIEW_NOT_ELIGIBLE,REVIEW_ALREADY_EXISTS',description:'One lifetime review per (authenticated user, listing). A completed booking at that same listing is required; userId from body is never trusted. Legacy auxiliary ratings are accepted but not stored as separate metrics.'});
add('get','/favorites','Yêu thích của chính mình','authenticated','Listing',[listing],{query:'PaginationQuery',list:true});
add('post','/favorites/toggle','Bật/tắt yêu thích của chính mình','authenticated','Object',{listingId:id,isFavorite:true},{request:'FavoriteRequest',body:{listingId:id},errors:'LISTING_NOT_FOUND',description:'Preserved legacy toggle. Not idempotent: after a lost response refetch favorites instead of blindly retrying.'});
add('post','/bookings/quote','Báo giá do server tính; không giữ lịch','optional','Quote',quote,{request:'QuoteRequest',body:stay,errors:'INVALID_DATES,INVALID_GUESTS,MAX_GUESTS_EXCEEDED,LISTING_NOT_FOUND,DATES_UNAVAILABLE,COUPON_NOT_APPLICABLE,COUPON_USER_LIMIT,AUTH_REQUIRED',description:'Real UTC calendar dates; check-in >= today, checkout after check-in, max 365 nights. Coupon quote requires token; discounts apply to room subtotal. USD amounts rounded in cents. A quote is not a reservation and does not consume coupon usage.'});
add('post','/bookings','Tạo booking pending và giữ lịch có thời hạn','authenticated','BookingCreated',{booking,payment:null},{request:'CreateBookingRequest',body:{...stay,paymentPlan:'deposit'},status:201,errors:'DATES_ALREADY_BOOKED,MAX_GUESTS_EXCEEDED,COUPON_NOT_APPLICABLE,COUPON_USER_LIMIT,LISTING_NOT_AVAILABLE,INVALID_AMOUNT',description:'Recomputes all prices under listing lock and reserves coupon usage atomically. Does not create a payment or confirm booking. Frontend totals/amounts are ignored. Legacy paymentMethod/mockCardLast4 are accepted but ignored. Return payment:null. Existing exclusion constraint remains the final concurrency guard.'});
add('get','/bookings','Booking của khách hiện tại','authenticated','Booking',[booking],{query:'BookingListQuery',list:true});
add('get','/bookings/{id}','Chi tiết booking và lịch sử thanh toán/hoàn tiền','authenticated','Booking',{...booking,payments:[payment],refunds:[]},{errors:'BOOKING_NOT_FOUND',description:'Guest owner or listing host; admins can inspect all bookings. No duplicated booking rows when several payments exist. amount_paid is gross successful payments, amount_refunded is successful refunds, net_paid is their difference, balance_due is zero for cancelled/expired bookings.'});
add('patch','/bookings/{id}/cancel','Hủy booking; tạo yêu cầu hoàn tiền khi đã trả','authenticated','Cancellation',{booking:{...booking,booking_status:'cancelled'},refunds:[refund],message:'Refunds require approval and provider confirmation.'},{request:'CancelRequest',body:{reason:'Plans changed'},errors:'BOOKING_NOT_FOUND,INVALID_STATE_TRANSITION,CANCELLATION_WINDOW_CLOSED',description:'Only guest owner. pending/confirmed can cancel; confirmed requires UTC check-in date still in the future. completed cannot cancel. Frees the booking schedule. No payment is rewritten refunded; successful payments create requested refunds, not success claims.'});
add('get','/payments/{bookingId}/receipt','Tải PDF hóa đơn bằng Bearer token','authenticated','Object',{}, {binary:'application/pdf',errors:'BOOKING_NOT_FOUND,RECEIPT_UNAVAILABLE',description:'Path parameter is a BOOKING ID. Only guest owner/admin, not listing host. At least one successful payment in history is required. Available after completed/cancelled/expired and after refunds too. Send Authorization header, download bytes; never put access token in URL. Cache-Control: private, no-store.'});
add('post','/bookings/{id}/payments','Khởi tạo một lần thanh toán; tiền do server quyết định','authenticated','PaymentInitialized',{payment,clientSecret:null,simulation:true},{request:'PaymentRequest',body:{plan:'deposit'},key:true,status:201,extraStatuses:[502,503],errors:'IDEMPOTENCY_KEY_REQUIRED,IDEMPOTENCY_CONFLICT,PAYMENT_IN_PROGRESS,ALREADY_PAID,BOOKING_EXPIRED,INVALID_PAYMENT_PLAN,PAYMENTS_DISABLED,PROVIDER_MISMATCH,PROVIDER_AMOUNT_LIMIT,PROVIDER_UNAVAILABLE',description:'Owner only. full collects remaining balance; deposit=min(USD30,total), only the first payment of a deposit booking; balance requires an existing payment. One pending attempt per booking. Retry exactly the same key/plan after 502/network timeout. Confirmation only follows verified webhook or explicit configured mock simulation. Stripe test returns clientSecret for client SDK.'});
add('post','/payments/{id}/simulate','Mô phỏng kết quả một payment trong chế độ mock','authenticated','Object',{paymentId:id,status:'succeeded'},{request:'SimulationRequest',body:{outcome:'succeeded'},errors:'PAYMENT_NOT_FOUND,INVALID_STATE_TRANSITION',description:'Owner only, PAYMENT_MODE=mock and non-production. Is a labeled simulation, never a real gateway integration.'});
add('post','/bookings/{id}/refunds','Yêu cầu hoàn tiền sau khi booking đã hủy/hết hạn','authenticated','Refund',[refund],{request:'Reason',body:{reason:'Booking cancelled'},array:true,status:201,errors:'BOOKING_NOT_FOUND,INVALID_BOOKING_STATUS',description:'Owner only; full refund for each successful payment, maximum one refund record per payment. Repeated requests return existing records, including rejected/failed decisions.'});
add('get','/admin/session','Xác minh phiên Supabase của admin','admin','User',{...user,role:'admin'},{description:'Sign in through Supabase Auth on client, then call this endpoint to verify backend admin permission. No backend password database.'});
add('post','/admin/logout','Đăng xuất admin và vô hiệu hóa JWT cũ tại backend','admin','Object',{signedOut:true},{extraStatuses:[503],errors:'AUTH_UNAVAILABLE,SESSION_REVOKED'});
const listingBody={hostId:id,categoryId:id,title:'Beach Apartment',propertyType:'Apartment',roomType:'entire_place',city:'Da Nang',country:'Vietnam',region:'Asia',pricePerNight:100,cleaningFee:20,serviceFee:10,maxGuests:4,bedrooms:2,beds:3,bathrooms:1,amenityIds:[id],photos:[{photoUrl:'https://example.test/photo.jpg',isCover:true}]};
const couponBody={code:'SUMMER',discountPercent:10,maxDiscount:50,minSubtotal:100,startsAt:'2000-01-01T00:00:00Z',endsAt:'2100-01-01T00:00:00Z',maxUses:100,perUserLimit:1};
for(const [resource,name,example,request,body,patch] of [
  ['listings','Listing',listing,'ListingRequest',listingBody,{title:'Updated accommodation'}],
  ['categories','Category',category,'CategoryRequest',{name:'Beach',slug:'beach',iconName:'sun'},{name:'Updated category'}],
  ['coupons','Coupon',coupon,'CouponRequest',couponBody,{maxUses:200}],
] as any[]) {
  add('get','/admin/'+resource,'Tìm kiếm quản trị: '+resource,'admin',name,[example],{list:true,query:'AdminQuery',description:'page/limit/q; isActive=true|false. Coupons also accept status=active|inactive|upcoming|expired|exhausted. Listings search title/city/country; categories search name/slug.'});
  add('get','/admin/'+resource+'/{id}','Chi tiết quản trị: '+resource,'admin',name,example);
  add('post','/admin/'+resource,'Tạo '+resource,'admin',name,example,{request,body,status:201,errors:'VALIDATION_ERROR,DUPLICATE_ENTRY,FOREIGN_KEY_VIOLATION,INVALID_HOST'});
  add('patch','/admin/'+resource+'/{id}','Cập nhật '+resource,'admin',name,example,{request:name+'Patch',body:patch,errors:'VALIDATION_ERROR,DUPLICATE_ENTRY,INVALID_COUPON,INVALID_HOST',description:'PATCH merges fields. Coupons cannot end before start or reduce maxUses below used_count. Listing amenityIds/photos replace their respective entire lists atomically. Audit log saved in the same transaction.'});
  add('delete','/admin/'+resource+'/{id}','Ngừng hoạt động '+resource,'admin',name,{...example,is_active:false},{errors:'NOT_FOUND,CATEGORY_IN_USE',description:resource==='categories'?'Soft deactivate; rejects if any listing still links to this category (including hidden listings).':'Soft deactivate; preserves all historical transactions and audit records.'});
}
for(const [resource,name,example,description] of [
  ['customers','User',user,'q searches full name/email/phone; status=active|blocked. Admin accounts excluded.'],
  ['bookings','Booking',booking,'q searches booking code/guest phone/email/accommodation title; status=pending|confirmed|cancelled|completed|expired.'],
  ['refunds','Refund',refund,'q searches reason/ID; status=requested|approved|processing|succeeded|failed|rejected.'],
  ['audit-logs','AuditLog',{id,actor_id:id,action:'bookings.completed',entity_type:'booking',entity_id:id},'q searches action/entity type. Read-only; runtime cannot update/delete audit rows.'],
] as any[])add('get','/admin/'+resource,'Tra cứu '+resource,'admin',name,[example],{query:'AdminQuery',list:true,description});
add('patch','/admin/customers/{id}','Sửa hồ sơ khách; email đồng bộ qua Supabase Auth','admin','User',user,{request:'CustomerPatch',body:{fullName:'Customer Updated',email:'customer@example.test'},extraSuccess:true,errors:'NOT_FOUND,DUPLICATE_ENTRY',description:'Cannot edit role/admin accounts. Local profile changes saved with audit. Email staged in desired_auth_email, then applied through Supabase admin API; auth_sync_pending means retry required. Admin is trusted to authorize email changes.'});
add('patch','/admin/customers/{id}/status','Khóa/mở khách hàng, đồng bộ ban và thu hồi phiên','admin','User',{...user,account_status:'blocked',auth_sync_pending:false},{request:'AccountStatus',body:{status:'blocked',reason:'Account investigation'},extraSuccess:true,errors:'NOT_FOUND',description:'Backend immediately checks local blocked status on every protected request. tokens_valid_after rejects old verified JWTs even after reactivation. Supabase ban and session revocation sync separately; 202 with auth_sync_pending=true means provider synchronization has not completed.'});
add('post','/admin/customers/{id}/auth-sync','Thử lại đồng bộ Supabase cho khách','admin','User',{...user,auth_sync_pending:false},{extraSuccess:true,errors:'NOT_FOUND'});
add('get','/admin/bookings/{id}','Chi tiết booking bất kỳ cho admin','admin','Booking',{...booking,payments:[payment],refunds:[]},{errors:'BOOKING_NOT_FOUND'});
for(const [route,target]of [['confirm','confirmed'],['complete','completed']])add('patch','/admin/bookings/{id}/'+route,'Chuyển booking sang '+target,'admin','Booking',{...booking,booking_status:target},{errors:'BOOKING_NOT_FOUND,INVALID_STATE_TRANSITION,PAYMENT_REQUIRED,BOOKING_EXPIRED,STAY_NOT_ENDED',description:target==='completed'?'Requires confirmed, checkout <= UTC today and full verified net payment.':'Requires pending, valid hold and verified paid threshold (full total or min($30,total) for deposit). Does not fabricate a payment.'});
add('patch','/admin/bookings/{id}/cancel','Admin hủy booking theo chính sách','admin','Cancellation',{booking:{...booking,booking_status:'cancelled'},refunds:[refund]},{request:'Reason',body:{reason:'Approved customer cancellation'},errors:'INVALID_STATE_TRANSITION,CANCELLATION_WINDOW_CLOSED'});
add('post','/admin/jobs/expire-bookings','Chạy một batch hết hạn hold/payment (tối đa 500 booking)','admin','Object',{expired:1,paymentsTimedOut:1},{description:'No background database changes enabled by default. Operator schedules this endpoint or reviewed CLI job at least once per minute. Confirmed deposit bookings do not expire when a balance attempt times out.'});
add('patch','/admin/refunds/{id}/decision','Duyệt/từ chối refund requested','admin','Refund',{...refund,status:'approved'},{request:'RefundDecision',body:{decision:'approve',reason:'Eligible cancellation'},errors:'REFUND_NOT_FOUND,INVALID_STATE_TRANSITION'});
add('post','/admin/refunds/{id}/process','Gửi refund đã duyệt đến provider','admin','Object',{id,status:'processing',providerRefundId:'re_test_example'},{extraStatuses:[502,503],errors:'REFUND_NOT_FOUND,INVALID_STATE_TRANSITION,INVALID_PAYMENT_STATUS,LEGACY_PAYMENT,PROVIDER_MISMATCH,PAYMENTS_DISABLED,PROVIDER_UNAVAILABLE',description:'Only approved/failed/processing refunds. Stripe dispatch is idempotent by refund ID; timeout stays processing until reconciliation. Only signed refund webhook marks succeeded/failed. Explicit mock mode may simulate succeeded. Legacy mock history requires manual reconciliation.'});
add('get','/admin/reports/revenue','Doanh thu gộp, refund và doanh thu ròng theo ngày UTC/provider','admin','Revenue',{from:'2026-10-27',to:'2026-10-27',timezone:'UTC',currency:'USD',scope:'test_and_mock_only',gross_payments:'230.00',refunds:'30.00',net_revenue:'200.00',items:[{day:'2026-10-27',provider:'mock',is_simulated:true,gross_payments:'230.00',refunds:'30.00',net_revenue:'200.00',successful_transactions:1,successful_refunds:1}]},{query:'ReportQuery',description:'Inclusive ordered range <=367 days. Gross from succeeded payment settlement date; refunds from succeeded refund settlement date. No booking total multiplication. Providers separated; this implementation supports test/mock only, not actual production revenue. A failed/pending refund does not reduce revenue.'});
add('get','/admin/reports/revenue.xlsx','Xuất Excel doanh thu cùng công thức API JSON','admin','Object',{}, {query:'ReportQuery',binary:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
add('post','/webhooks/mock','Webhook mô phỏng có HMAC timestamp','public','Object',{duplicate:false},{request:'MockEvent',body:{id:'event-example-01',paymentId:id,type:'succeeded',amount:3000,currency:'USD'},signature:'X-Webhook-Signature',errors:'INVALID_WEBHOOK_SIGNATURE,INVALID_WEBHOOK,PAYMENT_MISMATCH,WEBHOOK_EVENT_CONFLICT',description:'Only PAYMENT_MODE=mock, never production. Header t=unixSeconds,v1=hexHmacSHA256(timestamp + dot + rawJSON). ±300s tolerance. Transactional dedup by provider/event ID and payload hash. Duplicate returns {duplicate:true}.'});
add('post','/webhooks/stripe_test','Webhook Stripe test xác minh raw body qua SDK','public','Object',{ignored:true},{request:'Object',body:{id:'evt_example',type:'payment_intent.succeeded',livemode:false,data:{object:{id:'pi_example',amount_received:3000,currency:'usd',metadata:{paymentId:id}}}},signature:'Stripe-Signature',errors:'INVALID_WEBHOOK_SIGNATURE,INVALID_WEBHOOK,PAYMENT_MISMATCH,REFUND_MISMATCH',description:'Only stripe_test mode; live events rejected. SDK signature verification, 300s tolerance. payment_intent.succeeded/payment_failed/canceled and refund.created/updated/failed supported. Transactional dedup by provider/event ID. Subscribe to snapshot events in configured test account and reconcile missed/failed events.'});
add('get','/health','Liveness API versioned','public','Object',{success:true,message:'Backend API server is operating normally',timestamp:'2026-10-27T00:00:00Z'},{plain:true});
add('get','/health','Database readiness ngoài API prefix','public','Object',{status:'healthy',timestamp:'2026-10-27T00:00:00Z',database:'connected'},{root:true,plain:true,extraStatuses:[503]});

const spec:any={openapi:'3.0.3',info:{title:'Traveling App backend handoff',version:'2.0.0',description:'Express/TypeScript/PostgreSQL/Supabase Auth. UTC calendar dates. All amounts USD. Test/mock payment modes only. See FRONTEND_INTEGRATION.md.'},servers:[{url:'http://localhost:5000'}],components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'Supabase access JWT'}},schemas},paths};
function variableFor(url:string,name:string) {
  if(name==='bookingId')return 'bookingId';
  if(url.includes('/listings/'))return 'listingId';
  if(url.includes('/categories/'))return 'categoryId';
  if(url.includes('/coupons/'))return 'couponId';
  if(url.includes('/customers/'))return 'customerId';
  if(url.includes('/refunds/'))return 'refundId';
  if(url.includes('/payments/'))return 'paymentId';
  return 'bookingId';
}
function postmanBody(body:any):any {
  if(Array.isArray(body))return body.map(postmanBody);
  if(body&&typeof body==='object')return Object.fromEntries(Object.entries(body).map(([k,v])=>[k,
    k==='listingId'?'{{listingId}}':k==='hostId'?'{{hostId}}':k==='categoryId'?'{{categoryId}}':k==='paymentId'?'{{paymentId}}':
    k==='checkInDate'?'{{checkIn}}':k==='checkOutDate'?'{{checkOut}}':k==='amenityIds'?['{{amenityId}}']:postmanBody(v)]));
  return body;
}
const folders:any={};
for(const row of rows) {
  const group=row.operation.tags[0],params=row.operation.parameters;
  let endpoint=row.url.replace(/\{([^}]+)\}/g,(_m:string,n:string)=>'{{'+variableFor(row.url,n)+'}}');
  const requiredQuery=params.filter((p:any)=>p.in==='query'&&p.required);
  if(requiredQuery.length)endpoint+='?'+requiredQuery.map((p:any)=>p.name+'={{'+p.name+'}}').join('&');
  const header:any[]=[];
  if(row.request)header.push({key:'Content-Type',value:'application/json'});
  if(row.key)header.push({key:'Idempotency-Key',value:'{{idempotencyKey}}'});
  if(row.signature)header.push({key:row.signature,value:'{{'+(row.signature==='Stripe-Signature'?'stripeSignature':'mockWebhookSignature')+'}}'});
  const request:any={method:row.method,url:'{{baseUrl}}'+endpoint,header,description:row.operation.description+'\nErrors: '+row.operation['x-error-codes']};
  request.auth=row.permission==='public'?{type:'noauth'}:{type:'bearer',bearer:[{key:'token',value:row.permission==='admin'?'{{adminToken}}':'{{accessToken}}',type:'string'}]};
  if(row.request)request.body={mode:'raw',raw:JSON.stringify(postmanBody(row.body),null,2),options:{raw:{language:'json'}}};
  const tests=row.binary?
    ["pm.test('Authenticated file response', () => pm.expect(pm.response.code).to.eql(200));","pm.test('File content type', () => pm.expect(pm.response.headers.get('Content-Type')).to.include("+JSON.stringify(row.binary)+"));"]:
    ["pm.test('Success response', () => pm.expect([200,201,202]).to.include(pm.response.code));","const j=pm.response.json();","pm.test('Response envelope', () => pm.expect(j.success === true || j.status === 'healthy').to.eql(true));"];
  if(row.method==='POST'&&row.url==='/api/v1/bookings')tests.push("if (j.success) pm.environment.set('bookingId',j.data.booking.id);");
  if(row.key)tests.push("if(j.success) pm.environment.set('paymentId',j.data.payment.id);");
  const response=row.binary?[]:[{name:'Success example',originalRequest:request,status:'OK',code:row.status,header:[{key:'Content-Type',value:'application/json'}],body:JSON.stringify(row.example,null,2)}];
  (folders[group]||=[]).push({name:row.method+' '+row.url,request,response,event:[{listen:'test',script:{type:'text/javascript',exec:tests}}]});
}
const collection={info:{name:'Traveling App backend v2 (reviewed staging fixtures)',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',description:'Manual integration collection. Mutating operations need reviewed fixture IDs. No real credentials. Do not run the full collection against live customer data.'},
  event:[{listen:'prerequest',script:{type:'text/javascript',exec:[
    "if(!pm.environment.get('idempotencyKey')) pm.environment.set('idempotencyKey',pm.variables.replaceIn('{{$guid}}'));",
    "const day=(n)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);",
    "for(const [k,v] of Object.entries({checkIn:day(7),checkOut:day(9),from:day(0),to:day(0)})) if(!pm.environment.get(k)) pm.environment.set(k,v);",
  ]}}],item:Object.entries(folders).map(([name,item])=>({name,item}))};
const environment={name:'Traveling App local template (no secrets)',values:Object.entries({
  baseUrl:'http://localhost:5000',accessToken:'',adminToken:'',listingId:'',bookingId:'',paymentId:'',refundId:'',categoryId:'',couponId:'',customerId:'',hostId:'',amenityId:'',idempotencyKey:'',checkIn:'',checkOut:'',from:'',to:'',mockWebhookSignature:'',stripeSignature:'',
}).map(([key,value])=>({key,value,enabled:true,type:/Token|Signature/.test(key)?'secret':'default'})),_postman_variable_scope:'environment'};
const common='# API reference\n\nGenerated from backend Zod request validators and the operation registry. Base URL: §http://localhost:5000§. Use HTTPS for staging. Types are in [openapi.json](openapi.json); business rules and frontend examples are in [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).\n\nRequest bodies below are examples. Required fields/defaults/ranges are defined by the linked schema. Pagination: §data§ is an array; root §pagination={page,limit,total,totalPages}§; page starts at 1, limit 1–50 (default 12), page <=100000. Category/amenity arrays do not paginate. Decimal database columns may be strings.\n\nProtected APIs: §Authorization: Bearer <current Supabase access token>§. Missing token §AUTH_REQUIRED§ (401), invalid §INVALID_TOKEN§ (401), expired §TOKEN_EXPIRED§ (401), revoked §SESSION_REVOKED§ (401), blocked §ACCOUNT_BLOCKED§ (403), ordinary user on admin API §FORBIDDEN§ (403). Supplied token on optional-auth routes is validated. Common: 400 §VALIDATION_ERROR§, 409 §DUPLICATE_ENTRY§/§CONSTRAINT_VIOLATION§/§RETRY_TRANSACTION§, 429 §RATE_LIMIT_EXCEEDED§, 500 §INTERNAL_SERVER_ERROR§. Dependency errors 502/503 appear per endpoint. Error envelope: §{"success":false,"error":{"code":"...","message":"...","details":[]}}§. 404 masks ownership failures.\n\n';
let md=common;
for(const row of rows) {
  md+='\n## '+row.method+' '+row.url+'\n\n'+row.title+'\n\nPermission: **'+row.permission+'**. '+row.operation.description+'\n\n';
  if(row.operation.parameters.length) {
    md+='| Location | Parameter | Required | Schema/default |\n|---|---|---|---|\n';
    for(const p of row.operation.parameters)md+='| '+p.in+' | §'+p.name+'§ | '+(p.required?'yes':'no')+' | §'+JSON.stringify(p.schema).replace(/\|/g,'\\|')+'§ |\n';
    md+='\n';
  }
  if(row.request)md+='Request schema: §'+row.request+'§ in OpenAPI.\n\n§§§json\n'+JSON.stringify(row.body,null,2)+'\n§§§\n\n';
  else md+='Request body: none.\n\n';
  md+='Success HTTP '+row.status+(row.extraSuccess?' (or 202 when auth_sync_pending=true)':'')+'.\n\n';
  md+=row.binary?'Binary §'+row.binary+'§; Content-Disposition supplies filename; private/no-store.\n\n':'§§§json\n'+JSON.stringify(row.example,null,2)+'\n§§§\n\n';
  md+='Endpoint error codes: §'+(row.operation['x-error-codes']||'Common errors above')+'§. HTTP responses: '+Object.keys(row.operation.responses).join(', ')+'.\n';
}
async function generate(){
  fs.mkdirSync(out,{recursive:true});await SwaggerParser.validate(JSON.parse(JSON.stringify(spec)));
  for(const[name,data]of Object.entries({'openapi.json':spec,'postman.collection.json':collection,'postman.environment.json':environment}))fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(out,'API_REFERENCE.md'),md.replace(/§/g,String.fromCharCode(96)));
  console.log('Validated/generated '+rows.length+' API operations, Postman collection/environment, API reference.');
}
generate().catch(e=>{console.error(String(e.message||e).split('\n').slice(0,8).join('\n'));process.exitCode=1;});
