# Tích hợp frontend

Source frontend không được sửa trong đợt này. Các ví dụ sau là hướng dẫn cho thành viên phụ trách frontend; chưa được chạy trên thiết bị. Chi tiết đủ 56 operation nằm trong [API_REFERENCE](API_REFERENCE.md) và [OpenAPI](openapi.json).

## Thay đổi bắt buộc

| Vị trí/luồng hiện có | Frontend cần thực hiện |
|---|---|
| `AuthContext` / `apiClient` | Lấy access token từ session Supabase hiện tại; theo dõi SIGNED_IN/TOKEN_REFRESHED/SIGNED_OUT, không giữ một bản token tách rời bị cũ. |
| `ListingDetailScreen` | Bắt buộc người dùng chọn ngày, xác nhận số khách. Không tự sinh ngày hay dùng Math.min để giảm số khách. |
| `SearchResults` / filter store | Gửi đầy đủ bộ lọc, cặp ngày, tải các trang theo metadata. minPrice/maxPrice là giá **mỗi đêm**. |
| `OrderReviewScreen` | Hiển thị breakdown server, chọn full/deposit; tạo booking trước, khởi tạo payment riêng. |
| `BookingSuccessScreen` | Chỉ thông báo xác nhận khi GET booking trả confirmed và số đã trả đúng. Mock phải hiện rõ “Mô phỏng”; không khẳng định đã gửi email. |
| `BookingDetailScreen` | Tải PDF bằng request có Bearer token; trạng thái cancellation/refund lấy từ API, không tự báo đã hoàn tiền. |
| `WriteReviewScreen` | Chỉ mời review sau completed; xử lý REVIEW_NOT_ELIGIBLE và REVIEW_ALREADY_EXISTS dù UI đã kiểm tra. |
| Query cache | Key chứa user ID cho booking/favorites/receipt; xóa dữ liệu riêng khi đổi tài khoản/đăng xuất. |

URL cũ giữ nguyên. Các thay đổi hành vi cần chuyển đổi:

1. `POST /api/v1/bookings` trả `{booking: pending, payment: null}`, không còn thanh toán succeeded ngay.
2. Thêm `POST /api/v1/bookings/{id}/payments` với `Idempotency-Key`. Không dùng paymentMethod/mockCardLast4 cũ để xác nhận tiền.
3. Hủy trả `{booking, refunds, message}`; refund ban đầu là requested. Không giả định payment_status=refunded ngay sau hủy.
4. `GET /bookings`, `/favorites`, review/search và admin list trả array tại `data`, cùng root `pagination`. page mặc định 1, limit 12, tối đa 50. Hai API lookup categories/amenities vẫn trả array, không phân trang.
5. Booking có thêm expired; payment có timed_out; trạng thái thanh toán tổng hợp có partially_paid.
6. Token gửi kèm public optional-auth mà sai/hết hạn/bị khóa sẽ bị từ chối; muốn duyệt hoàn toàn ẩn danh thì bỏ header.

## Supabase và refresh token

Đăng ký/đăng nhập/OTP/social/đổi mật khẩu tiếp tục dùng SDK Supabase theo cấu hình project. Backend không lưu mật khẩu. signUp không có session khi email cần xác minh thì hiển thị bước xác minh, không coi đã đăng nhập.

```ts
apiClient.interceptors.request.use(async config => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = 'Bearer ' + session.access_token;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});
```

Listener onAuthStateChange cập nhật user/session trong context và invalidate/xóa cache thích hợp. Với 401 TOKEN_EXPIRED/INVALID_TOKEN: refresh qua SDK một lần, dùng cơ chế single-flight cho các request đồng thời, rồi retry request tối đa một lần với token mới. POST thanh toán phải giữ nguyên Idempotency-Key. Với SESSION_REVOKED: yêu cầu đăng nhập lại; với ACCOUNT_BLOCKED/FORBIDDEN (403): không retry refresh vô hạn. Không đưa service_role key vào mobile. Lấy base URL từ cấu hình môi trường; dùng HTTPS khi triển khai.

Supabase JWT đã phát hành có thể còn hiệu lực đến exp dù logout/ban; backend kiểm tra trạng thái tài khoản và tokens_valid_after để từ chối các JWT cũ. Xem [Supabase sessions](https://supabase.com/docs/guides/auth/sessions), [signOut](https://supabase.com/docs/reference/javascript/auth-signout).

## Tìm kiếm, ngày và giá

```http
GET /api/v1/listings?q=Da%20Nang&region=Asia&country=Vietnam&categoryId=<uuid>&roomType=entire_place&propertyType=Apartment&minPrice=0&maxPrice=150&guests=2&bedrooms=1&beds=2&bathrooms=1&amenityIds=<uuid>,<uuid>&checkIn=2099-01-10&checkOut=2099-01-12&page=1&limit=12&sortBy=price_asc
```

Các bộ lọc là tùy chọn; listing phải có **tất cả** amenityIds. q tìm title/city/country/address. Giá và thứ tự price_asc/desc theo đêm. Metadata: `{page,limit,total,totalPages}`; hết kết quả là array rỗng, totalPages có thể bằng 0. Không suy ra đang tải từ data rỗng; xử lý loading/error/empty riêng.

Ngày truyền là chuỗi lịch thật YYYY-MM-DD, không chuyển qua giờ địa phương rồi toISOString làm lệch ngày. Quy ước backend hiện tại: ngày UTC; check-in >= UTC hôm nay, checkout > check-in, tối đa 365 đêm. Cả cặp ngày phải có hoặc cùng bỏ. number_of_guests là tổng khách, nguyên dương, không vượt sức chứa. Người lớn/trẻ em chưa có breakdown riêng.

Có ngày: mỗi kết quả có `pricing` (nightlyRate, roomSubtotal, cleaningFee, serviceFee, discountAmount, taxAmount, taxRate, tripTotal, currency, totalNights). Không có ngày: pricing=null, không tự lấy price_per_night làm giá cả chuyến. Search không áp coupon; gọi quote để biết giá coupon và giá trước đặt.

```json
{
  "listingId": "11111111-1111-4111-8111-111111111111",
  "checkInDate": "2099-01-10",
  "checkOutDate": "2099-01-12",
  "guests": 2,
  "couponCode": "SUMMER"
}
```

Gửi body trên đến POST /bookings/quote; coupon cần token. Quote không giữ lịch/không giữ lượt coupon. Khi tạo booking server tính lại trong transaction. Frontend không gửi/không tự quyết định totalPrice. Alias cũ pricePerNight/basePriceTotal/totalPrice của quote vẫn có, nhưng ưu tiên nightlyRate/roomSubtotal/tripTotal.

Công thức USD: roomSubtotal = nightlyRate × nights; coupon giảm trên roomSubtotal, giới hạn maxDiscount; tax = round((roomSubtotal + cleaningFee + serviceFee − discount) × TAX_RATE, 2); tripTotal là tổng sau giảm và thuế. TAX_RATE=0 nghĩa chưa cấu hình thuế, taxAmount=0, không quảng cáo đã gồm một sắc thuế chưa được xác định. Cột numeric từ PostgreSQL có thể là string; chuyển bằng Number để hiển thị, không dùng cho xác nhận thanh toán.

## Booking và payment

1. POST /bookings với dữ liệu chuyến và paymentPlan=full hoặc deposit. Trả booking pending, payment_due_at; hold mặc định 15 phút. Coupon được giữ lượt khi booking được tạo, kể cả về sau hủy/hết hạn; không hoàn lại lượt để tránh sử dụng lại vô hạn.
2. POST /bookings/{id}/payments body `{"plan":"deposit"}` hoặc full; header `Idempotency-Key: <uuid được giữ cho đúng lần thử>`. deposit thu min(30 USD, tổng đơn) và chỉ dùng lần đầu cho booking deposit; full thu toàn bộ còn nợ; balance thu phần còn lại sau cọc.
3. Với stripe_test, chuyển clientSecret cho SDK Stripe trên mobile/web để nhập/xác nhận thẻ. Backend không nhận PAN/CVC. Publishable test key do cấu hình frontend cung cấp; không lấy secret key từ backend.
4. Chờ webhook: poll GET booking có backoff hữu hạn, cho phép mở lại màn chi tiết khi webhook chậm. SDK báo success không thay thế xác nhận server. Webhook xác minh và đủ ngưỡng trả trước mới chuyển pending → confirmed.
5. Sau cọc hiển thị amount_paid và balance_due; gọi payment plan=balance khi trả nốt. Không cho hoàn tất chuyến khi chưa trả đủ.
6. Mất mạng/502 khi init: giữ nguyên key/plan, gọi lại cùng request. Không phát sinh key mới chỉ vì timeout. PAYMENT_IN_PROGRESS nghĩa có attempt đang mở; khôi phục attempt cũ. failed/timed_out cho phép lần thử mới bằng key mới.
7. PAYMENT_MODE=mock chỉ dùng API /payments/{paymentId}/simulate để demo, màn hình hiện rõ mô phỏng. disabled trả 503 PAYMENTS_DISABLED.

amount_paid là tổng giao dịch succeeded, amount_refunded chỉ cộng refund succeeded, net_paid = paid − refunded. balance_due = total − net_paid, tối thiểu 0; đơn cancelled/expired có balance_due=0. payments/refunds là lịch sử đầy đủ; không suy trạng thái chỉ từ lần giao dịch gần nhất.

pending → confirmed/cancelled/expired; confirmed → completed/cancelled. Hủy confirmed phải trước ngày check-in UTC. completed chỉ do admin sau checkout UTC và đã trả đủ. Không có endpoint cho khách tự đánh dấu completed. Nếu tiền đến sau hủy/expiry: giữ booking cancelled/expired và tạo yêu cầu refund, không giành lại lịch.

Hoàn tiền: requested → approved/rejected; approved → processing; processing → succeeded/failed. failed có thể thử đối soát lại. Không hiện “đã hoàn tiền” ở requested/approved/processing/failed; chỉ succeeded mới giảm doanh thu và số tiền thực nhận.

## PDF có xác thực

Endpoint cũ `GET /api/v1/payments/{bookingId}/receipt` vẫn dùng **booking ID**. Chủ booking/admin được tải khi từng có payment succeeded, kể cả chuyến completed hoặc cancelled/expired/đã refund. Host không được tải hóa đơn của khách. 409 RECEIPT_UNAVAILABLE khi chưa có lịch sử trả tiền. Không dùng Linking.openURL trực tiếp với URL API và không gắn access token vào query.

Web:

```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error('Sign in required');
const r = await fetch(API_BASE_URL + '/payments/' + bookingId + '/receipt', {
  headers: { Authorization: 'Bearer ' + session.access_token }
});
if (!r.ok) throw await r.json();
const objectUrl = URL.createObjectURL(await r.blob());
const a = document.createElement('a');
a.href = objectUrl;
a.download = 'receipt-' + bookingId + '.pdf';
a.click();
setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
```

Mobile hiện dùng Expo 51. Thành viên frontend cài phiên bản tương thích bằng `npx expo install expo-file-system expo-sharing` (chưa được cài/chỉnh trong source frontend ở đây). Ví dụ API FileSystem của SDK 51:

```ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { data: { session } } = await supabase.auth.getSession();
if (!session || !FileSystem.cacheDirectory) throw new Error('Session/storage unavailable');
const file = FileSystem.cacheDirectory + 'receipt-' + bookingId + '.pdf';
try {
  const result = await FileSystem.downloadAsync(
    API_BASE_URL + '/payments/' + bookingId + '/receipt',
    file,
    { headers: { Authorization: 'Bearer ' + session.access_token } }
  );
  if (result.status !== 200) throw new Error('Receipt download failed: ' + result.status);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' });
  }
} finally {
  await FileSystem.deleteAsync(file, { idempotent: true });
}
```

Xử lý 401 bằng refresh + tải lại một lần trước khi báo lỗi. Khi SDK Expo được nâng cấp, kiểm tra API tương ứng; ví dụ không dành cho module FileSystem mới của SDK 58. Tham chiếu [source Expo SDK51 FileSystem](https://github.com/expo/expo/blob/sdk-51/packages/expo-file-system/src/FileSystem.ts), [Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/). PDF thực tế được kiểm thử tải bytes ở backend; ví dụ mobile/web chưa được chạy trên app.

## Admin cho frontend

Admin vẫn đăng nhập bằng Supabase; GET /admin/session xác minh quyền, POST /admin/logout thu hồi phiên. Không đưa role từ UI vào request để xin quyền. CRUD chỗ ở/danh mục/coupon, khách, booking, duyệt refund, reports và Excel xem từng operation trong API_REFERENCE.

DELETE listing/coupon là ngừng hoạt động. Category đang liên kết listing trả CATEGORY_IN_USE. PATCH listing amenityIds/photos thay toàn bộ tập tương ứng. Trạng thái tài khoản cập nhật cục bộ ngay; 202 auth_sync_pending=true nghĩa đồng bộ Supabase chưa xong, hiển thị trạng thái này và cho retry /auth-sync.

Báo cáo là sổ giao dịch **test/mock**, có gross/refunds/net và provider riêng; API chưa hỗ trợ live revenue. Tải Excel cũng phải dùng request có admin token, cùng cách tải blob/PDF.
