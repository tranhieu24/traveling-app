# API reference

Generated from backend Zod request validators and the operation registry. Base URL: `http://localhost:5000`. Use HTTPS for staging. Types are in [openapi.json](openapi.json); business rules and frontend examples are in [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md).

Request bodies below are examples. Required fields/defaults/ranges are defined by the linked schema. Pagination: `data` is an array; root `pagination={page,limit,total,totalPages}`; page starts at 1, limit 1–50 (default 12), page <=100000. Category/amenity arrays do not paginate. Decimal database columns may be strings.

Protected APIs: `Authorization: Bearer <current Supabase access token>`. Missing token `AUTH_REQUIRED` (401), invalid `INVALID_TOKEN` (401), expired `TOKEN_EXPIRED` (401), revoked `SESSION_REVOKED` (401), blocked `ACCOUNT_BLOCKED` (403), ordinary user on admin API `FORBIDDEN` (403). Supplied token on optional-auth routes is validated. Common: 400 `VALIDATION_ERROR`, 409 `DUPLICATE_ENTRY`/`CONSTRAINT_VIOLATION`/`RETRY_TRANSACTION`, 429 `RATE_LIMIT_EXCEEDED`, 500 `INTERNAL_SERVER_ERROR`. Dependency errors 502/503 appear per endpoint. Error envelope: `{"success":false,"error":{"code":"...","message":"...","details":[]}}`. 404 masks ownership failures.


## GET /api/v1/auth/me

Đọc hồ sơ phiên hiện tại

Permission: **authenticated**. Đọc hồ sơ phiên hiện tại

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "guest@example.test",
    "full_name": "Traveler",
    "role": "guest",
    "account_status": "active"
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/auth/me

Cập nhật hồ sơ của chính mình

Permission: **authenticated**. Cập nhật hồ sơ của chính mình

Request schema: `ProfilePatch` in OpenAPI.

```json
{
  "fullName": "Traveler Updated"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "guest@example.test",
    "full_name": "Traveler",
    "role": "guest",
    "account_status": "active"
  }
}
```

Endpoint error codes: `VALIDATION_ERROR`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/categories

Danh mục đang hoạt động

Permission: **public**. Danh mục đang hoạt động

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Beach",
      "slug": "beach",
      "icon_name": "sun",
      "is_active": true
    }
  ]
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 404, 409, 429, 500.

## GET /api/v1/amenities

Danh sách tiện nghi

Permission: **public**. Danh sách tiện nghi

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "WiFi",
      "icon": "wifi",
      "category": "Facilities"
    }
  ]
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 404, 409, 429, 500.

## GET /api/v1/listings

Tìm kiếm chỗ ở và giá toàn chuyến khi có cặp ngày

Permission: **optional**. q matches title/city/country/address; all amenities are required. minPrice/maxPrice and price sorting use nightly USD. checkIn/checkOut must be supplied together. Optional Bearer token personalizes favorites; an invalid/blocked supplied token is rejected. pricing=null without dates; otherwise server pricing includes fees, configured tax, no coupon.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `categoryId` | no | `{"type":"string","format":"uuid"}` |
| query | `q` | no | `{"type":"string","minLength":1,"maxLength":200}` |
| query | `region` | no | `{"type":"string","minLength":1,"maxLength":100}` |
| query | `city` | no | `{"type":"string","minLength":1,"maxLength":100}` |
| query | `country` | no | `{"type":"string","minLength":1,"maxLength":100}` |
| query | `propertyType` | no | `{"type":"string","minLength":1,"maxLength":50}` |
| query | `roomType` | no | `{"type":"string","enum":["entire_place","private_room","dormitory"]}` |
| query | `minPrice` | no | `{"type":"number","minimum":0}` |
| query | `maxPrice` | no | `{"type":"number","minimum":0}` |
| query | `guests` | no | `{"type":"integer","minimum":1,"maximum":1000}` |
| query | `bedrooms` | no | `{"type":"integer","minimum":0,"maximum":1000}` |
| query | `beds` | no | `{"type":"integer","minimum":0,"maximum":1000}` |
| query | `bathrooms` | no | `{"type":"integer","minimum":0,"maximum":1000}` |
| query | `amenityIds` | no | `{"allOf":[{"anyOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},{"type":"array","items":{"type":"string","format":"uuid"},"maxItems":50}]}` |
| query | `checkIn` | no | `{"type":"string"}` |
| query | `checkOut` | no | `{"type":"string"}` |
| query | `sortBy` | no | `{"type":"string","enum":["recommended","price_asc","price_desc","rating"],"default":"recommended"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "Beach Apartment",
      "city": "Da Nang",
      "country": "Vietnam",
      "region": "Asia",
      "room_type": "entire_place",
      "price_per_night": "100.00",
      "nightly_rate": 100,
      "max_guests": 4,
      "bedrooms": 2,
      "beds": 3,
      "bathrooms": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `VALIDATION_ERROR`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/listings/{id}

Chi tiết chỗ ở đang hoạt động

Permission: **optional**. Chi tiết chỗ ở đang hoạt động

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Beach Apartment",
    "city": "Da Nang",
    "country": "Vietnam",
    "region": "Asia",
    "room_type": "entire_place",
    "price_per_night": "100.00",
    "nightly_rate": 100,
    "max_guests": 4,
    "bedrooms": 2,
    "beds": 3,
    "bathrooms": 1
  }
}
```

Endpoint error codes: `NOT_FOUND,VALIDATION_ERROR`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/listings/{id}/reviews

Danh sách đánh giá

Permission: **public**. Danh sách đánh giá

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "user_id": "11111111-1111-4111-8111-111111111111",
      "rating": 5,
      "comment": "A great stay",
      "user_name": "Traveler"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 404, 409, 429, 500.

## POST /api/v1/listings/{id}/reviews

Gửi đánh giá sau booking completed

Permission: **authenticated**. One lifetime review per (authenticated user, listing). A completed booking at that same listing is required; userId from body is never trusted. Legacy auxiliary ratings are accepted but not stored as separate metrics.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `ReviewRequest` in OpenAPI.

```json
{
  "rating": 5,
  "comment": "A great stay"
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "listing_id": "11111111-1111-4111-8111-111111111111",
    "user_id": "11111111-1111-4111-8111-111111111111",
    "rating": 5,
    "comment": "A great stay"
  }
}
```

Endpoint error codes: `REVIEW_NOT_ELIGIBLE,REVIEW_ALREADY_EXISTS`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/favorites

Yêu thích của chính mình

Permission: **authenticated**. Yêu thích của chính mình

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "Beach Apartment",
      "city": "Da Nang",
      "country": "Vietnam",
      "region": "Asia",
      "room_type": "entire_place",
      "price_per_night": "100.00",
      "nightly_rate": 100,
      "max_guests": 4,
      "bedrooms": 2,
      "beds": 3,
      "bathrooms": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/favorites/toggle

Bật/tắt yêu thích của chính mình

Permission: **authenticated**. Preserved legacy toggle. Not idempotent: after a lost response refetch favorites instead of blindly retrying.

Request schema: `FavoriteRequest` in OpenAPI.

```json
{
  "listingId": "11111111-1111-4111-8111-111111111111"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "listingId": "11111111-1111-4111-8111-111111111111",
    "isFavorite": true
  }
}
```

Endpoint error codes: `LISTING_NOT_FOUND`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/bookings/quote

Báo giá do server tính; không giữ lịch

Permission: **optional**. Real UTC calendar dates; check-in >= today, checkout after check-in, max 365 nights. Coupon quote requires token; discounts apply to room subtotal. USD amounts rounded in cents. A quote is not a reservation and does not consume coupon usage.

Request schema: `QuoteRequest` in OpenAPI.

```json
{
  "listingId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2099-01-10",
  "checkOutDate": "2099-01-12",
  "guests": 2
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "currency": "USD",
    "listingId": "11111111-1111-4111-8111-111111111111",
    "title": "Beach Apartment",
    "city": "Da Nang",
    "nightlyRate": 100,
    "totalNights": 2,
    "roomSubtotal": 200,
    "cleaningFee": 20,
    "serviceFee": 10,
    "discountAmount": 0,
    "taxRate": 0,
    "taxAmount": 0,
    "tripTotal": 230,
    "pricePerNight": 100,
    "basePriceTotal": 200,
    "totalPrice": 230,
    "checkInDate": "2099-01-10",
    "checkOutDate": "2099-01-12",
    "guests": 2,
    "maxGuests": 4,
    "quoteIsReservation": false
  }
}
```

Endpoint error codes: `INVALID_DATES,INVALID_GUESTS,MAX_GUESTS_EXCEEDED,LISTING_NOT_FOUND,DATES_UNAVAILABLE,COUPON_NOT_APPLICABLE,COUPON_USER_LIMIT,AUTH_REQUIRED`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/bookings

Tạo booking pending và giữ lịch có thời hạn

Permission: **authenticated**. Recomputes all prices under listing lock and reserves coupon usage atomically. Does not create a payment or confirm booking. Frontend totals/amounts are ignored. Legacy paymentMethod/mockCardLast4 are accepted but ignored. Return payment:null. Existing exclusion constraint remains the final concurrency guard.

Request schema: `CreateBookingRequest` in OpenAPI.

```json
{
  "listingId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2099-01-10",
  "checkOutDate": "2099-01-12",
  "guests": 2,
  "paymentPlan": "deposit"
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "11111111-1111-4111-8111-111111111111",
      "booking_code": "TRV-example",
      "guest_id": "11111111-1111-4111-8111-111111111111",
      "listing_id": "11111111-1111-4111-8111-111111111111",
      "check_in_date": "2099-01-10",
      "check_out_date": "2099-01-12",
      "total_nights": 2,
      "number_of_guests": 2,
      "price_per_night": "100.00",
      "total_price": "230.00",
      "booking_status": "pending",
      "payment_plan": "deposit",
      "amount_paid": "0.00",
      "balance_due": "230.00",
      "payment_status": "pending"
    },
    "payment": null
  }
}
```

Endpoint error codes: `DATES_ALREADY_BOOKED,MAX_GUESTS_EXCEEDED,COUPON_NOT_APPLICABLE,COUPON_USER_LIMIT,LISTING_NOT_AVAILABLE,INVALID_AMOUNT`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/bookings

Booking của khách hiện tại

Permission: **authenticated**. Booking của khách hiện tại

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `status` | no | `{"type":"string","enum":["all","pending","confirmed","cancelled","completed","expired"],"default":"all"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "booking_code": "TRV-example",
      "guest_id": "11111111-1111-4111-8111-111111111111",
      "listing_id": "11111111-1111-4111-8111-111111111111",
      "check_in_date": "2099-01-10",
      "check_out_date": "2099-01-12",
      "total_nights": 2,
      "number_of_guests": 2,
      "price_per_night": "100.00",
      "total_price": "230.00",
      "booking_status": "pending",
      "payment_plan": "deposit",
      "amount_paid": "0.00",
      "balance_due": "230.00",
      "payment_status": "pending"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/bookings/{id}

Chi tiết booking và lịch sử thanh toán/hoàn tiền

Permission: **authenticated**. Guest owner or listing host; admins can inspect all bookings. No duplicated booking rows when several payments exist. amount_paid is gross successful payments, amount_refunded is successful refunds, net_paid is their difference, balance_due is zero for cancelled/expired bookings.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "booking_code": "TRV-example",
    "guest_id": "11111111-1111-4111-8111-111111111111",
    "listing_id": "11111111-1111-4111-8111-111111111111",
    "check_in_date": "2099-01-10",
    "check_out_date": "2099-01-12",
    "total_nights": 2,
    "number_of_guests": 2,
    "price_per_night": "100.00",
    "total_price": "230.00",
    "booking_status": "pending",
    "payment_plan": "deposit",
    "amount_paid": "0.00",
    "balance_due": "230.00",
    "payment_status": "pending",
    "payments": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "booking_id": "11111111-1111-4111-8111-111111111111",
        "user_id": "11111111-1111-4111-8111-111111111111",
        "amount": "30.00",
        "currency": "USD",
        "payment_status": "pending",
        "provider": "mock",
        "is_simulated": true
      }
    ],
    "refunds": []
  }
}
```

Endpoint error codes: `BOOKING_NOT_FOUND`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/bookings/{id}/cancel

Hủy booking; tạo yêu cầu hoàn tiền khi đã trả

Permission: **authenticated**. Only guest owner. pending/confirmed can cancel; confirmed requires UTC check-in date still in the future. completed cannot cancel. Frees the booking schedule. No payment is rewritten refunded; successful payments create requested refunds, not success claims.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `CancelRequest` in OpenAPI.

```json
{
  "reason": "Plans changed"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "11111111-1111-4111-8111-111111111111",
      "booking_code": "TRV-example",
      "guest_id": "11111111-1111-4111-8111-111111111111",
      "listing_id": "11111111-1111-4111-8111-111111111111",
      "check_in_date": "2099-01-10",
      "check_out_date": "2099-01-12",
      "total_nights": 2,
      "number_of_guests": 2,
      "price_per_night": "100.00",
      "total_price": "230.00",
      "booking_status": "cancelled",
      "payment_plan": "deposit",
      "amount_paid": "0.00",
      "balance_due": "230.00",
      "payment_status": "pending"
    },
    "refunds": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "payment_id": "11111111-1111-4111-8111-111111111111",
        "booking_id": "11111111-1111-4111-8111-111111111111",
        "amount": "30.00",
        "status": "requested",
        "reason": "Plans changed"
      }
    ],
    "message": "Refunds require approval and provider confirmation."
  }
}
```

Endpoint error codes: `BOOKING_NOT_FOUND,INVALID_STATE_TRANSITION,CANCELLATION_WINDOW_CLOSED`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/payments/{bookingId}/receipt

Tải PDF hóa đơn bằng Bearer token

Permission: **authenticated**. Path parameter is a BOOKING ID. Only guest owner/admin, not listing host. At least one successful payment in history is required. Available after completed/cancelled/expired and after refunds too. Send Authorization header, download bytes; never put access token in URL. Cache-Control: private, no-store.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `bookingId` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

Binary `application/pdf`; Content-Disposition supplies filename; private/no-store.

Endpoint error codes: `BOOKING_NOT_FOUND,RECEIPT_UNAVAILABLE`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/bookings/{id}/payments

Khởi tạo một lần thanh toán; tiền do server quyết định

Permission: **authenticated**. Owner only. full collects remaining balance; deposit=min(USD30,total), only the first payment of a deposit booking; balance requires an existing payment. One pending attempt per booking. Retry exactly the same key/plan after 502/network timeout. Confirmation only follows verified webhook or explicit configured mock simulation. Stripe test returns clientSecret for client SDK.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |
| header | `Idempotency-Key` | yes | `{"type":"string","pattern":"^[A-Za-z0-9_-]{8,100}$"}` |

Request schema: `PaymentRequest` in OpenAPI.

```json
{
  "plan": "deposit"
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "11111111-1111-4111-8111-111111111111",
      "booking_id": "11111111-1111-4111-8111-111111111111",
      "user_id": "11111111-1111-4111-8111-111111111111",
      "amount": "30.00",
      "currency": "USD",
      "payment_status": "pending",
      "provider": "mock",
      "is_simulated": true
    },
    "clientSecret": null,
    "simulation": true
  }
}
```

Endpoint error codes: `IDEMPOTENCY_KEY_REQUIRED,IDEMPOTENCY_CONFLICT,PAYMENT_IN_PROGRESS,ALREADY_PAID,BOOKING_EXPIRED,INVALID_PAYMENT_PLAN,PAYMENTS_DISABLED,PROVIDER_MISMATCH,PROVIDER_AMOUNT_LIMIT,PROVIDER_UNAVAILABLE`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500, 502, 503.

## POST /api/v1/payments/{id}/simulate

Mô phỏng kết quả một payment trong chế độ mock

Permission: **authenticated**. Owner only, PAYMENT_MODE=mock and non-production. Is a labeled simulation, never a real gateway integration.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `SimulationRequest` in OpenAPI.

```json
{
  "outcome": "succeeded"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "paymentId": "11111111-1111-4111-8111-111111111111",
    "status": "succeeded"
  }
}
```

Endpoint error codes: `PAYMENT_NOT_FOUND,INVALID_STATE_TRANSITION`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/bookings/{id}/refunds

Yêu cầu hoàn tiền sau khi booking đã hủy/hết hạn

Permission: **authenticated**. Owner only; full refund for each successful payment, maximum one refund record per payment. Repeated requests return existing records, including rejected/failed decisions.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `Reason` in OpenAPI.

```json
{
  "reason": "Booking cancelled"
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "payment_id": "11111111-1111-4111-8111-111111111111",
      "booking_id": "11111111-1111-4111-8111-111111111111",
      "amount": "30.00",
      "status": "requested",
      "reason": "Plans changed"
    }
  ]
}
```

Endpoint error codes: `BOOKING_NOT_FOUND,INVALID_BOOKING_STATUS`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/session

Xác minh phiên Supabase của admin

Permission: **admin**. Sign in through Supabase Auth on client, then call this endpoint to verify backend admin permission. No backend password database. Requires public.users.role=admin and account_status=active (server checked).

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "guest@example.test",
    "full_name": "Traveler",
    "role": "admin",
    "account_status": "active"
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/logout

Đăng xuất admin và vô hiệu hóa JWT cũ tại backend

Permission: **admin**. Đăng xuất admin và vô hiệu hóa JWT cũ tại backend Requires public.users.role=admin and account_status=active (server checked).

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "signedOut": true
  }
}
```

Endpoint error codes: `AUTH_UNAVAILABLE,SESSION_REVOKED`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500, 503.

## GET /api/v1/admin/listings

Tìm kiếm quản trị: listings

Permission: **admin**. page/limit/q; isActive=true|false. Coupons also accept status=active|inactive|upcoming|expired|exhausted. Listings search title/city/country; categories search name/slug. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "title": "Beach Apartment",
      "city": "Da Nang",
      "country": "Vietnam",
      "region": "Asia",
      "room_type": "entire_place",
      "price_per_night": "100.00",
      "nightly_rate": 100,
      "max_guests": 4,
      "bedrooms": 2,
      "beds": 3,
      "bathrooms": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/listings/{id}

Chi tiết quản trị: listings

Permission: **admin**. Chi tiết quản trị: listings Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Beach Apartment",
    "city": "Da Nang",
    "country": "Vietnam",
    "region": "Asia",
    "room_type": "entire_place",
    "price_per_night": "100.00",
    "nightly_rate": 100,
    "max_guests": 4,
    "bedrooms": 2,
    "beds": 3,
    "bathrooms": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/listings

Tạo listings

Permission: **admin**. Tạo listings Requires public.users.role=admin and account_status=active (server checked).

Request schema: `ListingRequest` in OpenAPI.

```json
{
  "hostId": "11111111-1111-4111-8111-111111111111",
  "categoryId": "11111111-1111-4111-8111-111111111111",
  "title": "Beach Apartment",
  "propertyType": "Apartment",
  "roomType": "entire_place",
  "city": "Da Nang",
  "country": "Vietnam",
  "region": "Asia",
  "pricePerNight": 100,
  "cleaningFee": 20,
  "serviceFee": 10,
  "maxGuests": 4,
  "bedrooms": 2,
  "beds": 3,
  "bathrooms": 1,
  "amenityIds": [
    "11111111-1111-4111-8111-111111111111"
  ],
  "photos": [
    {
      "photoUrl": "https://example.test/photo.jpg",
      "isCover": true
    }
  ]
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Beach Apartment",
    "city": "Da Nang",
    "country": "Vietnam",
    "region": "Asia",
    "room_type": "entire_place",
    "price_per_night": "100.00",
    "nightly_rate": 100,
    "max_guests": 4,
    "bedrooms": 2,
    "beds": 3,
    "bathrooms": 1
  }
}
```

Endpoint error codes: `VALIDATION_ERROR,DUPLICATE_ENTRY,FOREIGN_KEY_VIOLATION,INVALID_HOST`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/listings/{id}

Cập nhật listings

Permission: **admin**. PATCH merges fields. Coupons cannot end before start or reduce maxUses below used_count. Listing amenityIds/photos replace their respective entire lists atomically. Audit log saved in the same transaction. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `ListingPatch` in OpenAPI.

```json
{
  "title": "Updated accommodation"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Beach Apartment",
    "city": "Da Nang",
    "country": "Vietnam",
    "region": "Asia",
    "room_type": "entire_place",
    "price_per_night": "100.00",
    "nightly_rate": 100,
    "max_guests": 4,
    "bedrooms": 2,
    "beds": 3,
    "bathrooms": 1
  }
}
```

Endpoint error codes: `VALIDATION_ERROR,DUPLICATE_ENTRY,INVALID_COUPON,INVALID_HOST`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## DELETE /api/v1/admin/listings/{id}

Ngừng hoạt động listings

Permission: **admin**. Soft deactivate; preserves all historical transactions and audit records. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Beach Apartment",
    "city": "Da Nang",
    "country": "Vietnam",
    "region": "Asia",
    "room_type": "entire_place",
    "price_per_night": "100.00",
    "nightly_rate": 100,
    "max_guests": 4,
    "bedrooms": 2,
    "beds": 3,
    "bathrooms": 1,
    "is_active": false
  }
}
```

Endpoint error codes: `NOT_FOUND,CATEGORY_IN_USE`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/categories

Tìm kiếm quản trị: categories

Permission: **admin**. page/limit/q; isActive=true|false. Coupons also accept status=active|inactive|upcoming|expired|exhausted. Listings search title/city/country; categories search name/slug. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "Beach",
      "slug": "beach",
      "icon_name": "sun",
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/categories/{id}

Chi tiết quản trị: categories

Permission: **admin**. Chi tiết quản trị: categories Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Beach",
    "slug": "beach",
    "icon_name": "sun",
    "is_active": true
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/categories

Tạo categories

Permission: **admin**. Tạo categories Requires public.users.role=admin and account_status=active (server checked).

Request schema: `CategoryRequest` in OpenAPI.

```json
{
  "name": "Beach",
  "slug": "beach",
  "iconName": "sun"
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Beach",
    "slug": "beach",
    "icon_name": "sun",
    "is_active": true
  }
}
```

Endpoint error codes: `VALIDATION_ERROR,DUPLICATE_ENTRY,FOREIGN_KEY_VIOLATION,INVALID_HOST`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/categories/{id}

Cập nhật categories

Permission: **admin**. PATCH merges fields. Coupons cannot end before start or reduce maxUses below used_count. Listing amenityIds/photos replace their respective entire lists atomically. Audit log saved in the same transaction. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `CategoryPatch` in OpenAPI.

```json
{
  "name": "Updated category"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Beach",
    "slug": "beach",
    "icon_name": "sun",
    "is_active": true
  }
}
```

Endpoint error codes: `VALIDATION_ERROR,DUPLICATE_ENTRY,INVALID_COUPON,INVALID_HOST`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## DELETE /api/v1/admin/categories/{id}

Ngừng hoạt động categories

Permission: **admin**. Soft deactivate; rejects if any listing still links to this category (including hidden listings). Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Beach",
    "slug": "beach",
    "icon_name": "sun",
    "is_active": false
  }
}
```

Endpoint error codes: `NOT_FOUND,CATEGORY_IN_USE`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/coupons

Tìm kiếm quản trị: coupons

Permission: **admin**. page/limit/q; isActive=true|false. Coupons also accept status=active|inactive|upcoming|expired|exhausted. Listings search title/city/country; categories search name/slug. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "code": "SUMMER",
      "discount_percent": "10.00",
      "starts_at": "2000-01-01T00:00:00Z",
      "ends_at": "2100-01-01T00:00:00Z",
      "max_uses": 100,
      "used_count": 0,
      "per_user_limit": 1,
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/coupons/{id}

Chi tiết quản trị: coupons

Permission: **admin**. Chi tiết quản trị: coupons Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "code": "SUMMER",
    "discount_percent": "10.00",
    "starts_at": "2000-01-01T00:00:00Z",
    "ends_at": "2100-01-01T00:00:00Z",
    "max_uses": 100,
    "used_count": 0,
    "per_user_limit": 1,
    "is_active": true
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/coupons

Tạo coupons

Permission: **admin**. Tạo coupons Requires public.users.role=admin and account_status=active (server checked).

Request schema: `CouponRequest` in OpenAPI.

```json
{
  "code": "SUMMER",
  "discountPercent": 10,
  "maxDiscount": 50,
  "minSubtotal": 100,
  "startsAt": "2000-01-01T00:00:00Z",
  "endsAt": "2100-01-01T00:00:00Z",
  "maxUses": 100,
  "perUserLimit": 1
}
```

Success HTTP 201.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "code": "SUMMER",
    "discount_percent": "10.00",
    "starts_at": "2000-01-01T00:00:00Z",
    "ends_at": "2100-01-01T00:00:00Z",
    "max_uses": 100,
    "used_count": 0,
    "per_user_limit": 1,
    "is_active": true
  }
}
```

Endpoint error codes: `VALIDATION_ERROR,DUPLICATE_ENTRY,FOREIGN_KEY_VIOLATION,INVALID_HOST`. HTTP responses: 201, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/coupons/{id}

Cập nhật coupons

Permission: **admin**. PATCH merges fields. Coupons cannot end before start or reduce maxUses below used_count. Listing amenityIds/photos replace their respective entire lists atomically. Audit log saved in the same transaction. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `CouponPatch` in OpenAPI.

```json
{
  "maxUses": 200
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "code": "SUMMER",
    "discount_percent": "10.00",
    "starts_at": "2000-01-01T00:00:00Z",
    "ends_at": "2100-01-01T00:00:00Z",
    "max_uses": 100,
    "used_count": 0,
    "per_user_limit": 1,
    "is_active": true
  }
}
```

Endpoint error codes: `VALIDATION_ERROR,DUPLICATE_ENTRY,INVALID_COUPON,INVALID_HOST`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## DELETE /api/v1/admin/coupons/{id}

Ngừng hoạt động coupons

Permission: **admin**. Soft deactivate; preserves all historical transactions and audit records. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "code": "SUMMER",
    "discount_percent": "10.00",
    "starts_at": "2000-01-01T00:00:00Z",
    "ends_at": "2100-01-01T00:00:00Z",
    "max_uses": 100,
    "used_count": 0,
    "per_user_limit": 1,
    "is_active": false
  }
}
```

Endpoint error codes: `NOT_FOUND,CATEGORY_IN_USE`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/customers

Tra cứu customers

Permission: **admin**. q searches full name/email/phone; status=active|blocked. Admin accounts excluded. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "guest@example.test",
      "full_name": "Traveler",
      "role": "guest",
      "account_status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/bookings

Tra cứu bookings

Permission: **admin**. q searches booking code/guest phone/email/accommodation title; status=pending|confirmed|cancelled|completed|expired. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "booking_code": "TRV-example",
      "guest_id": "11111111-1111-4111-8111-111111111111",
      "listing_id": "11111111-1111-4111-8111-111111111111",
      "check_in_date": "2099-01-10",
      "check_out_date": "2099-01-12",
      "total_nights": 2,
      "number_of_guests": 2,
      "price_per_night": "100.00",
      "total_price": "230.00",
      "booking_status": "pending",
      "payment_plan": "deposit",
      "amount_paid": "0.00",
      "balance_due": "230.00",
      "payment_status": "pending"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/refunds

Tra cứu refunds

Permission: **admin**. q searches reason/ID; status=requested|approved|processing|succeeded|failed|rejected. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "payment_id": "11111111-1111-4111-8111-111111111111",
      "booking_id": "11111111-1111-4111-8111-111111111111",
      "amount": "30.00",
      "status": "requested",
      "reason": "Plans changed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/audit-logs

Tra cứu audit-logs

Permission: **admin**. q searches action/entity type. Read-only; runtime cannot update/delete audit rows. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `page` | no | `{"type":"integer","minimum":1,"maximum":100000,"default":1}` |
| query | `limit` | no | `{"type":"integer","minimum":1,"maximum":50,"default":12}` |
| query | `q` | no | `{"type":"string","maxLength":200}` |
| query | `status` | no | `{"type":"string","maxLength":30}` |
| query | `isActive` | no | `{"type":"string","enum":["true","false"]}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "actor_id": "11111111-1111-4111-8111-111111111111",
      "action": "bookings.completed",
      "entity_type": "booking",
      "entity_id": "11111111-1111-4111-8111-111111111111"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/customers/{id}

Sửa hồ sơ khách; email đồng bộ qua Supabase Auth

Permission: **admin**. Cannot edit role/admin accounts. Local profile changes saved with audit. Email staged in desired_auth_email, then applied through Supabase admin API; auth_sync_pending means retry required. Admin is trusted to authorize email changes. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `CustomerPatch` in OpenAPI.

```json
{
  "fullName": "Customer Updated",
  "email": "customer@example.test"
}
```

Success HTTP 200 (or 202 when auth_sync_pending=true).

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "guest@example.test",
    "full_name": "Traveler",
    "role": "guest",
    "account_status": "active"
  }
}
```

Endpoint error codes: `NOT_FOUND,DUPLICATE_ENTRY`. HTTP responses: 200, 202, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/customers/{id}/status

Khóa/mở khách hàng, đồng bộ ban và thu hồi phiên

Permission: **admin**. Backend immediately checks local blocked status on every protected request. tokens_valid_after rejects old verified JWTs even after reactivation. Supabase ban and session revocation sync separately; 202 with auth_sync_pending=true means provider synchronization has not completed. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `AccountStatus` in OpenAPI.

```json
{
  "status": "blocked",
  "reason": "Account investigation"
}
```

Success HTTP 200 (or 202 when auth_sync_pending=true).

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "guest@example.test",
    "full_name": "Traveler",
    "role": "guest",
    "account_status": "blocked",
    "auth_sync_pending": false
  }
}
```

Endpoint error codes: `NOT_FOUND`. HTTP responses: 200, 202, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/customers/{id}/auth-sync

Thử lại đồng bộ Supabase cho khách

Permission: **admin**. Thử lại đồng bộ Supabase cho khách Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200 (or 202 when auth_sync_pending=true).

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "email": "guest@example.test",
    "full_name": "Traveler",
    "role": "guest",
    "account_status": "active",
    "auth_sync_pending": false
  }
}
```

Endpoint error codes: `NOT_FOUND`. HTTP responses: 200, 202, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/bookings/{id}

Chi tiết booking bất kỳ cho admin

Permission: **admin**. Chi tiết booking bất kỳ cho admin Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "booking_code": "TRV-example",
    "guest_id": "11111111-1111-4111-8111-111111111111",
    "listing_id": "11111111-1111-4111-8111-111111111111",
    "check_in_date": "2099-01-10",
    "check_out_date": "2099-01-12",
    "total_nights": 2,
    "number_of_guests": 2,
    "price_per_night": "100.00",
    "total_price": "230.00",
    "booking_status": "pending",
    "payment_plan": "deposit",
    "amount_paid": "0.00",
    "balance_due": "230.00",
    "payment_status": "pending",
    "payments": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "booking_id": "11111111-1111-4111-8111-111111111111",
        "user_id": "11111111-1111-4111-8111-111111111111",
        "amount": "30.00",
        "currency": "USD",
        "payment_status": "pending",
        "provider": "mock",
        "is_simulated": true
      }
    ],
    "refunds": []
  }
}
```

Endpoint error codes: `BOOKING_NOT_FOUND`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/bookings/{id}/confirm

Chuyển booking sang confirmed

Permission: **admin**. Requires pending, valid hold and verified paid threshold (full total or min($30,total) for deposit). Does not fabricate a payment. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "booking_code": "TRV-example",
    "guest_id": "11111111-1111-4111-8111-111111111111",
    "listing_id": "11111111-1111-4111-8111-111111111111",
    "check_in_date": "2099-01-10",
    "check_out_date": "2099-01-12",
    "total_nights": 2,
    "number_of_guests": 2,
    "price_per_night": "100.00",
    "total_price": "230.00",
    "booking_status": "confirmed",
    "payment_plan": "deposit",
    "amount_paid": "0.00",
    "balance_due": "230.00",
    "payment_status": "pending"
  }
}
```

Endpoint error codes: `BOOKING_NOT_FOUND,INVALID_STATE_TRANSITION,PAYMENT_REQUIRED,BOOKING_EXPIRED,STAY_NOT_ENDED`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/bookings/{id}/complete

Chuyển booking sang completed

Permission: **admin**. Requires confirmed, checkout <= UTC today and full verified net payment. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "booking_code": "TRV-example",
    "guest_id": "11111111-1111-4111-8111-111111111111",
    "listing_id": "11111111-1111-4111-8111-111111111111",
    "check_in_date": "2099-01-10",
    "check_out_date": "2099-01-12",
    "total_nights": 2,
    "number_of_guests": 2,
    "price_per_night": "100.00",
    "total_price": "230.00",
    "booking_status": "completed",
    "payment_plan": "deposit",
    "amount_paid": "0.00",
    "balance_due": "230.00",
    "payment_status": "pending"
  }
}
```

Endpoint error codes: `BOOKING_NOT_FOUND,INVALID_STATE_TRANSITION,PAYMENT_REQUIRED,BOOKING_EXPIRED,STAY_NOT_ENDED`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/bookings/{id}/cancel

Admin hủy booking theo chính sách

Permission: **admin**. Admin hủy booking theo chính sách Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `Reason` in OpenAPI.

```json
{
  "reason": "Approved customer cancellation"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "11111111-1111-4111-8111-111111111111",
      "booking_code": "TRV-example",
      "guest_id": "11111111-1111-4111-8111-111111111111",
      "listing_id": "11111111-1111-4111-8111-111111111111",
      "check_in_date": "2099-01-10",
      "check_out_date": "2099-01-12",
      "total_nights": 2,
      "number_of_guests": 2,
      "price_per_night": "100.00",
      "total_price": "230.00",
      "booking_status": "cancelled",
      "payment_plan": "deposit",
      "amount_paid": "0.00",
      "balance_due": "230.00",
      "payment_status": "pending"
    },
    "refunds": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "payment_id": "11111111-1111-4111-8111-111111111111",
        "booking_id": "11111111-1111-4111-8111-111111111111",
        "amount": "30.00",
        "status": "requested",
        "reason": "Plans changed"
      }
    ]
  }
}
```

Endpoint error codes: `INVALID_STATE_TRANSITION,CANCELLATION_WINDOW_CLOSED`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/jobs/expire-bookings

Chạy một batch hết hạn hold/payment (tối đa 500 booking)

Permission: **admin**. No background database changes enabled by default. Operator schedules this endpoint or reviewed CLI job at least once per minute. Confirmed deposit bookings do not expire when a balance attempt times out. Requires public.users.role=admin and account_status=active (server checked).

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "expired": 1,
    "paymentsTimedOut": 1
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## PATCH /api/v1/admin/refunds/{id}/decision

Duyệt/từ chối refund requested

Permission: **admin**. Duyệt/từ chối refund requested Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request schema: `RefundDecision` in OpenAPI.

```json
{
  "decision": "approve",
  "reason": "Eligible cancellation"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "payment_id": "11111111-1111-4111-8111-111111111111",
    "booking_id": "11111111-1111-4111-8111-111111111111",
    "amount": "30.00",
    "status": "approved",
    "reason": "Plans changed"
  }
}
```

Endpoint error codes: `REFUND_NOT_FOUND,INVALID_STATE_TRANSITION`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/admin/refunds/{id}/process

Gửi refund đã duyệt đến provider

Permission: **admin**. Only approved/failed/processing refunds. Stripe dispatch is idempotent by refund ID; timeout stays processing until reconciliation. Only signed refund webhook marks succeeded/failed. Explicit mock mode may simulate succeeded. Legacy mock history requires manual reconciliation. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| path | `id` | yes | `{"type":"string","format":"uuid"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "status": "processing",
    "providerRefundId": "re_test_example"
  }
}
```

Endpoint error codes: `REFUND_NOT_FOUND,INVALID_STATE_TRANSITION,INVALID_PAYMENT_STATUS,LEGACY_PAYMENT,PROVIDER_MISMATCH,PAYMENTS_DISABLED,PROVIDER_UNAVAILABLE`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500, 502, 503.

## GET /api/v1/admin/reports/revenue

Doanh thu gộp, refund và doanh thu ròng theo ngày UTC/provider

Permission: **admin**. Inclusive ordered range <=367 days. Gross from succeeded payment settlement date; refunds from succeeded refund settlement date. No booking total multiplication. Providers separated; this implementation supports test/mock only, not actual production revenue. A failed/pending refund does not reduce revenue. Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `from` | yes | `{"type":"string"}` |
| query | `to` | yes | `{"type":"string"}` |

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "from": "2026-10-27",
    "to": "2026-10-27",
    "timezone": "UTC",
    "currency": "USD",
    "scope": "test_and_mock_only",
    "gross_payments": "230.00",
    "refunds": "30.00",
    "net_revenue": "200.00",
    "items": [
      {
        "day": "2026-10-27",
        "provider": "mock",
        "is_simulated": true,
        "gross_payments": "230.00",
        "refunds": "30.00",
        "net_revenue": "200.00",
        "successful_transactions": 1,
        "successful_refunds": 1
      }
    ]
  }
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## GET /api/v1/admin/reports/revenue.xlsx

Xuất Excel doanh thu cùng công thức API JSON

Permission: **admin**. Xuất Excel doanh thu cùng công thức API JSON Requires public.users.role=admin and account_status=active (server checked).

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| query | `from` | yes | `{"type":"string"}` |
| query | `to` | yes | `{"type":"string"}` |

Request body: none.

Success HTTP 200.

Binary `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; Content-Disposition supplies filename; private/no-store.

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 401, 403, 404, 409, 429, 500.

## POST /api/v1/webhooks/mock

Webhook mô phỏng có HMAC timestamp

Permission: **public**. Only PAYMENT_MODE=mock, never production. Header t=unixSeconds,v1=hexHmacSHA256(timestamp + dot + rawJSON). ±300s tolerance. Transactional dedup by provider/event ID and payload hash. Duplicate returns {duplicate:true}.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| header | `X-Webhook-Signature` | yes | `{"type":"string"}` |

Request schema: `MockEvent` in OpenAPI.

```json
{
  "id": "event-example-01",
  "paymentId": "11111111-1111-4111-8111-111111111111",
  "type": "succeeded",
  "amount": 3000,
  "currency": "USD"
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "duplicate": false
  }
}
```

Endpoint error codes: `INVALID_WEBHOOK_SIGNATURE,INVALID_WEBHOOK,PAYMENT_MISMATCH,WEBHOOK_EVENT_CONFLICT`. HTTP responses: 200, 400, 404, 409, 429, 500.

## POST /api/v1/webhooks/stripe_test

Webhook Stripe test xác minh raw body qua SDK

Permission: **public**. Only stripe_test mode; live events rejected. SDK signature verification, 300s tolerance. payment_intent.succeeded/payment_failed/canceled and refund.created/updated/failed supported. Transactional dedup by provider/event ID. Subscribe to snapshot events in configured test account and reconcile missed/failed events.

| Location | Parameter | Required | Schema/default |
|---|---|---|---|
| header | `Stripe-Signature` | yes | `{"type":"string"}` |

Request schema: `Object` in OpenAPI.

```json
{
  "id": "evt_example",
  "type": "payment_intent.succeeded",
  "livemode": false,
  "data": {
    "object": {
      "id": "pi_example",
      "amount_received": 3000,
      "currency": "usd",
      "metadata": {
        "paymentId": "11111111-1111-4111-8111-111111111111"
      }
    }
  }
}
```

Success HTTP 200.

```json
{
  "success": true,
  "data": {
    "ignored": true
  }
}
```

Endpoint error codes: `INVALID_WEBHOOK_SIGNATURE,INVALID_WEBHOOK,PAYMENT_MISMATCH,REFUND_MISMATCH`. HTTP responses: 200, 400, 404, 409, 429, 500.

## GET /api/v1/health

Liveness API versioned

Permission: **public**. Liveness API versioned

Request body: none.

Success HTTP 200.

```json
{
  "success": true,
  "message": "Backend API server is operating normally",
  "timestamp": "2026-10-27T00:00:00Z"
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 404, 409, 429, 500.

## GET /health

Database readiness ngoài API prefix

Permission: **public**. Database readiness ngoài API prefix

Request body: none.

Success HTTP 200.

```json
{
  "status": "healthy",
  "timestamp": "2026-10-27T00:00:00Z",
  "database": "connected"
}
```

Endpoint error codes: `Common errors above`. HTTP responses: 200, 400, 404, 409, 429, 500, 503.
