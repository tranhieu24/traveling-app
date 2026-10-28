# Đối chiếu yêu cầu backend với báo cáo

Đầu vào đã đọc: source E:/Project_ReactNaTive/traveling-app, báo cáo Bao_Cao_Phan_Tich_Thiet_Ke_Traveling_App.docx, bản đánh giá Danh_gia_Traveling_App.md ngày 27/10/2026. Nội dung Word được trích từ document.xml để đối chiếu UC001–UC041 và BR-01–05; không sửa báo cáo hay frontend. Các đường dẫn backend hiện tính từ `traveling-app-backend` ở thư mục gốc; thay đổi cấu trúc được ghi tại [CONSOLIDATION.md](CONSOLIDATION.md).

## Những phát hiện trước khi cải thiện backend

| Phát hiện | Bằng chứng trong source trước cải thiện | Xử lý trong backend chính |
|---|---|---|
| Tạo booking ghi confirmed và payment succeeded | repositories/booking.repository.ts chứa INSERT confirmed/succeeded trong createBookingWithTransaction | Booking pending riêng; payment qua init + verified event/configured simulation. |
| Hủy ghi payment refunded trực tiếp | cancelBooking UPDATE payments không kiểm tra lịch sử thành công | Refund ledger với requested/decision/dispatch/callback; payment succeeded giữ làm lịch sử. |
| Người chưa ở vẫn review | review.repository.ts INSERT trực tiếp; validator chỉ rating/comment | Kiểm tra completed cùng guest/listing + trigger DB + unique user/listing hiện có. |
| Ngày chỉ regex, guest một số nơi không int | validators/schemas.ts | Ngày thật/UTC/quá khứ/thứ tự/365 đêm; số nguyên và sức chứa. |
| Không có luồng completed/admin | routes không có admin router hoặc transition completed | Admin middleware, API complete sau checkout/trả đủ và DB guard. |
| PDF chỉ confirmed; mobile mở URL không header | booking.controller.ts và BookingDetailScreen.tsx | Giữ endpoint bảo vệ; đủ lịch sử succeeded được tải; guide token trên web/Expo51, chưa sửa mobile. |
| Thiếu room type/query validation và nhiều API không pagination | listingFilterSchema, interaction.controller.ts | Bộ lọc hoàn thiện và metadata root thống nhất cho collection phân trang. |
| Chỉ một payment/booking; không coupon, audit/RLS trong SQL source | database/schema.sql | Migration nhiều payment, coupon locking, refund/audit/webhook; RLS/grants đề xuất. Chưa kết luận cấu hình Supabase thực tế. |

## Quy tắc nghiệp vụ

| Báo cáo | Backend chính | Bằng chứng/giới hạn |
|---|---|---|
| BR-01 checkout sau checkin; giờ 14:00/12:00 | Kiểm tra chuỗi ngày thật, không quá khứ, tối đa 365 đêm; giữ giờ listing | Tests ngày; quy ước lịch UTC cần frontend hiển thị đúng. |
| BR-02 sức chứa | Kiểm tra server ở quote/create và lọc search | Test quá capacity; không giảm guest âm thầm. |
| BR-03 full hoặc $30 | paymentPlan full/deposit, nhiều payment, paid/refunded/net/balance | Deposit=min($30,total); test cọc + balance. Live gateway chưa nghiệm thu. |
| BR-04 tổng giá | nightlyRate, roomSubtotal, fees, discount, tax, tripTotal | Search có ngày và quote server. Thuế mặc định 0; cần chủ sản phẩm xác định thuế. |
| BR-05 chỉ completed review | Kiểm tra guest/listing completed ở repository và DB | Test API, bypass SQL và duplicate concurrent. Một lifetime review/user/listing. |

## Use case khách hàng UC001–UC020

| UC | Backend/phạm vi liên quan | Kết quả/việc frontend còn làm |
|---|---|---|
| 001 | requireAuth, current session error codes | Splash/session restore và listener do frontend; chưa test thiết bị. |
| 002,014 | Giữ Supabase Auth, /auth/me | OTP/social/email verification phụ thuộc cấu hình Supabase; không xây password store. |
| 003 | GET categories + category filter | API active categories; UI giữ bên frontend. |
| 004 | q/city/country/region | Search SQL hỗ trợ; frontend bổ sung input và state. |
| 005 | Cặp ngày và loại lịch trùng/hold hết hạn | Chọn lịch tùy ý thuộc frontend; chưa có endpoint lịch kín riêng. |
| 006 | guests nguyên dương/sức chứa | Tổng guests; adults/children chưa có lưu riêng. |
| 007 | Search + pagination + pricing có cặp ngày | Frontend hiển thị total và load trang. |
| 008 | roomType/propertyType/minPrice/maxPrice | Bộ lọc server + validation quan hệ min/max. |
| 009 | bedrooms/beds/bathrooms/all amenities | SQL và validation; frontend bổ sung controls. |
| 010,011 | Listing detail/photos/amenities | Giữ API; admin quản lý photos/amenity relations. |
| 012 | List reviews phân trang | Review hợp lệ; biểu đồ breakdown sao riêng chưa triển khai. |
| 013 | Listing description/coordinates | Map UI do frontend, không tích hợp bản đồ trong đợt backend này. |
| 015 | Supabase logout phía client, cache/session guide | Admin có endpoint logout; guest logout tiếp tục SDK Supabase. |
| 016 | PATCH /auth/me fullName/avatar/phone | Guest đổi email qua Supabase flow; admin email sync qua admin API. |
| 017 | Supabase password methods | Không có backend mật khẩu mới; UI đổi/reset password chưa làm. |
| 018 | Favorites scoped user, pagination/toggle serialized | Frontend đồng bộ cache; toggle không idempotent. |
| 019 | quote/pending/hold/coupon/paymentPlan | Transaction/exclusion và concurrent test; frontend chuyển flow. |
| 020 | PaymentIntent test adapter + receipt token | Chưa giao dịch nhà cung cấp thật/thiết bị; chưa gửi email. |

## Admin UC021–UC041

Mọi route /api/v1/admin/* dùng requireAuth + requireAdmin; role/account status do DB quyết định.

| UC | API/triển khai |
|---|---|
| 021 | Supabase sign-in ở client + GET /admin/session xác minh quyền backend. |
| 022 | POST /admin/logout; Supabase global signout + tokens_valid_after + audit. |
| 023 | POST /admin/listings; photos và amenityIds trong transaction, active host/admin. |
| 024 | PATCH /admin/listings/{id}; relation lists thay nguyên tập, audit. |
| 025 | DELETE /admin/listings/{id} là soft deactivate. |
| 026 | GET /admin/listings?q=&isActive=&page=&limit= và detail. |
| 027 | POST /admin/categories. |
| 028 | PATCH /admin/categories/{id}. |
| 029 | DELETE /admin/categories/{id}; CATEGORY_IN_USE nếu đang liên kết listing. |
| 030 | GET /admin/categories?q=&isActive=&page=&limit=. |
| 031 | PATCH /admin/customers/{id}; trường hồ sơ/email, không sửa role/admin. |
| 032 | PATCH /admin/customers/{id}/status; local block, ban/session revoke sync, retry /auth-sync. Cần xác minh migration auth hosted. |
| 033 | GET /admin/customers?q= (tên/email/phone), status active/blocked, pagination. |
| 034 | GET /admin/bookings?q= (code/phone/email/title), status và detail. |
| 035 | PATCH /admin/bookings/{id}/confirm; đã có payment xác minh và hold còn hạn, không bịa payment. |
| 036 | cancel/complete booking, list refund, decision approve/reject, process refund + verified webhook; chưa có refund live. |
| 037 | POST /admin/coupons; thời gian, tỷ lệ, trần, min subtotal, scope, global/per-user quota. |
| 038 | PATCH /admin/coupons/{id}; validate sau merge, không hạ quota dưới used_count. |
| 039 | DELETE /admin/coupons/{id} ngừng coupon, giữ lịch sử. |
| 040 | GET /admin/coupons?q=&status=active/inactive/upcoming/expired/exhausted&isActive=&page=&limit=. |
| 041 | GET /admin/reports/revenue và .xlsx, khoảng ngày inclusive UTC, succeeded gross − succeeded refunds, nhóm provider/mô phỏng; scope test_and_mock_only. |

## Các yêu cầu không được coi là đã nghiệm thu

Cấu hình RLS/grants/ban/session của Supabase đang hoạt động; giao dịch Stripe test đầu cuối và callback qua Internet; live payment/refund; email delivery; UI/admin portal; OTP/social providers; adults/children riêng; bản đồ; phân bố sao; Redis/CDN/auto-scaling; hiệu năng <1.5s/50.000 người dùng/uptime 99.9%; hóa đơn thuế điện tử theo pháp luật.

Báo cáo đề cập microservices/bcrypt; theo phạm vi được yêu cầu, vẫn giữ Express monolith và Supabase Auth, không tự thêm password store. PDF hiện là chứng từ payment test/mock, không chứng minh hóa đơn thuế hợp lệ.

