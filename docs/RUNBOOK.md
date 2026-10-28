# Chạy backend và áp dụng migration

## Tình trạng bàn giao

Backend chính giữ Express + TypeScript + PostgreSQL + Supabase Auth. Không có thay đổi được thực thi lên Supabase đang hoạt động. Kiểm thử tạo PostgreSQL cục bộ mới cho từng lần chạy, dùng profile Auth giả và stub lệnh gọi Stripe.

Các bước dưới đây do người quản trị xem xét và chủ động thực hiện. Không chạy toàn bộ schema trên database đang có dữ liệu.

## Cài và cấu hình

Môi trường đã dùng để kiểm thử: Windows, Node 24.11.0, PostgreSQL nhúng 18.4. Baseline ghi PostgreSQL 15+ nhưng chưa chạy lại toàn bộ trên PostgreSQL 15 hoặc Supabase hosted.

```powershell
cd E:\Project_ReactNaTive\traveling-app\traveling-app-backend
npm ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Giữ nguyên file `.env` hiện có trong backend chính. Đối chiếu `.env.example` để bổ sung hoặc điều chỉnh các biến cần thiết bằng cấu hình của môi trường **staging** đã chọn; không ghi đè toàn bộ file. File mẫu không có secrets. Với Supabase hosted, máy bạn không cần cài PostgreSQL server cục bộ; backend dùng `DATABASE_URL` để kết nối qua Internet.

- DATABASE_URL: kết nối pg qua tài khoản runtime chuyên dụng, không dùng credentials ở frontend.
- DATABASE_SSL=verify mặc định, kiểm tra chứng chỉ. Chỉ dùng disable với PostgreSQL cục bộ.
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: chỉ giữ ở server. Không đưa service_role hoặc DB URL vào mobile.
- PAYMENT_MODE=disabled mặc định; mock chỉ được dùng development/test và bị từ chối khi NODE_ENV=production.
- stripe_test yêu cầu sk_test_... và whsec_..., không chấp nhận live key.
- PAYMENT_HOLD_MINUTES: số nguyên 1–60, mặc định 15.
- TAX_RATE: 0–1, mặc định 0. Cần xác định chính sách thuế với chủ sản phẩm trước khi cấu hình.
- RECEIPT_FONT: đường dẫn TTF Unicode trên server. Backend thử Arial trên Windows/DejaVuSans trên Linux; triển khai cần cung cấp font có tiếng Việt.

Supabase trigger tạo public.users vẫn được giữ. Guest đăng nhập bằng Supabase SDK; backend chỉ xác minh token và đọc role/account_status từ PostgreSQL. Admin được DBA cấp role bằng quy trình nội bộ, không qua request cập nhật hồ sơ. Không tạo thêm bảng mật khẩu.

## Database đang tồn tại: thứ tự an toàn

1. Sao lưu và xác nhận quy trình restore. Thử trên một bản staging có cấu trúc/dữ liệu đại diện.
2. Chạy **read-only** `database/preflight.sql` và lưu kết quả nội bộ. Xem constraint names, RLS, grants, policies, trạng thái payment và các review cũ không đủ điều kiện.
3. Xem lần lượt migration 001–004. Các script có transaction; lỗi phải dừng, không bỏ qua lỗi giữa chừng.
4. Migration 001 chỉ được chuyển lịch sử thanh toán khi đã đối soát nguồn gốc mock. Nếu database thực tế từng có payment thật hoặc đã custom schema, phải điều chỉnh migration theo dữ liệu đó trước khi áp dụng.
5. Xem các policy/grant cũ: các policy cùng loại có thể OR với nhau. Script thêm policy không đủ chứng minh các policy trước đó an toàn. Đặc biệt kiểm tra role inheritance, table/function grants, owner và BYPASSRLS.
6. Migration 003 truy cập auth.sessions/auth.refresh_tokens để thu hồi phiên. Đây là phần phụ thuộc cấu trúc Supabase đang triển khai; kiểm tra tên cột, kiểu dữ liệu, quyền DBA và thử trên staging. Không chỉnh trực tiếp schema auth bằng suy đoán.
7. Chuyển backend cùng migration trong một cửa sổ triển khai có kiểm soát; backend cũ giả lập thanh toán không được ghi tiếp vào schema mới.

Ví dụ psql, sau khi tự xác nhận staging và dữ liệu lịch sử đúng là mock (các đường dẫn tính từ thư mục backend):

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/preflight.sql
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -c "SET traveling.approve_legacy_mock='yes';" -f ../database/migrations/001_backend_workflows.sql
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/002_rls_and_grants.sql
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/003_auth_sync.sql
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/004_state_guards.sql
```

Các lệnh trên chỉ là hướng dẫn, chưa được thực thi lên Supabase trong đợt gộp source. `psql` cần connection URL staging được người vận hành cung cấp qua biến môi trường; PowerShell không tự nạp `.env`. Nếu không cài `psql`, có thể chạy từng file SQL trong Supabase SQL Editor sau khi xem xét preflight và chọn đúng project. Với migration 001, chỉ khi đã xác nhận toàn bộ payment cũ là mô phỏng mới thêm `SET LOCAL traveling.approve_legacy_mock='yes';` ngay sau `BEGIN;` và chạy cả file trong cùng một lần. Dừng nếu có lỗi, không chạy lại migration đã thành công tùy ý.

| Script | Thay đổi/chú ý |
|---|---|
| 001 | account status, coupon/usage, booking snapshot giảm giá/thuế, payment nhiều lần, refund ledger, webhook dedup, audit, review eligibility. Existing payments được đánh dấu legacy_mock có sự xác nhận của operator. Giữ exclusion chống trùng lịch. |
| 002 | role traveling_backend NOLOGIN; RLS/policy backend và public discovery; thu hồi quyền trực tiếp anon/authenticated/PUBLIC với bảng nghiệp vụ. Không tự tạo tài khoản login/password. |
| 003 | tokens_valid_after và thông tin đồng bộ email/ban; SECURITY DEFINER revoke_customer_sessions chỉ backend được EXECUTE. Owner của function phải là DBA được tin cậy. |
| 004 | Chốt chuyển trạng thái, không completed trước checkout/chưa trả đủ, snapshot payment/refund bất biến và kiểm tra owner. |

DBA tạo LOGIN riêng bằng phương thức quản lý secrets của tổ chức rồi GRANT traveling_backend cho LOGIN đó. Tài khoản runtime cần có role hiệu lực: dùng INHERIT hoặc SET ROLE trong cấu hình kết nối. Không cấp role traveling_backend cho anon/authenticated/authenticator. Kiểm thử cục bộ chạy request SQL dưới SET ROLE traveling_backend và kiểm tra deny anon/authenticated, không dùng owner để chứng minh RLS.

Dự án Supabase mới: áp baseline public schema một lần, rồi migration 001–004; auth.users do Supabase quản lý. Fixture auth.users trong bộ test chỉ là stub dành cho test PostgreSQL, không phải schema Auth để cài lên Supabase. `database/seed.sql` là seed legacy được giữ nguyên: có các lệnh ghi trực tiếp Auth, payment và review, không tương thích mặc nhiên với các guard sau migration. Không chạy seed này sau migration hoặc trên database hiện hữu; cần xem xét riêng nếu muốn dùng trên database thử nghiệm có thể bỏ.

Migration không có down script phá dữ liệu: nhiều payment/refund không thể hạ an toàn về một payment/booking. Khi triển khai lỗi, dừng ghi và dùng quy trình khôi phục đã thử hoặc forward fix; không xóa giao dịch để ép rollback.

## Chạy và kiểm tra

```powershell
npm run typecheck
npm run build
npm start
```

GET /health kiểm tra kết nối database (503 nếu lỗi); GET /api/v1/health là liveness. Dùng reverse proxy HTTPS. Backend không tự migrate, seed, tự hoàn tiền hoặc tự chạy cron lúc khởi động.

Kiểm thử tách biệt:

```powershell
npm run test:isolated
npm run docs:generate
```

Dùng `npm run test:isolated` khi backend chính đã có `.env`. Wrapper tạo thư mục tạm ngoài project, dùng dependencies đã cài và chạy bộ test không kèm `.env`; không chuyển, xóa hoặc sửa file cấu hình của bạn. Bộ test bên trong vẫn từ chối nếu thấy `.env`, tự đặt URL PostgreSQL localhost ngẫu nhiên và thay Supabase/Stripe client trong tiến trình test. PostgreSQL nhúng được cung cấp qua dependency kiểm thử, không cần cài PostgreSQL server riêng. `.test-runs` chứa database và PDF/Excel fixture trong thư mục tạm; không commit/chia sẻ. Mỗi lần chạy tạo database mới, không sửa cluster của lần trước.

`docs/test-results.json` ghi từng nhóm test, thời gian và giới hạn stub. Wrapper chỉ sao chép kết quả mới về project sau khi kiểm thử thành công; lần thất bại không được coi là kết quả đã đạt. Runner kiểm tra bằng chứng mới và số lỗi, không chỉ tin exit code của thư viện PostgreSQL nhúng. Bằng chứng của đợt gộp cấu trúc nằm trong [CONSOLIDATION.md](CONSOLIDATION.md).

## Hết hạn và đối soát

Sau khi review target DB, operator lên lịch mỗi phút một trong hai cách:

- POST /api/v1/admin/jobs/expire-bookings bằng admin token qua hệ thống job có quản lý secrets;
- chạy CLI `npm run expire-bookings` với CONFIRM_EXPIRY_JOB=yes và cấu hình server đã review.

Mỗi batch khóa tối đa 500 booking bằng SKIP LOCKED. Chạy lại nhiều batch khi có backlog. Pending booking quá hạn → expired, pending payment quá hạn → timed_out. Booking đã confirmed nhờ cọc không bị hủy vì attempt trả số dư timeout. Tạo booking mới cũng dọn các hold hết hạn của listing đó trong transaction; quote/search bỏ các hold hết hạn.

Tiền thành công đến sau expiry/cancel vẫn được ghi vào ledger nhưng không khôi phục lịch: tạo refund requested để admin xử lý. Timeout HTTP gateway không đồng nghĩa thất bại; retry payment cùng Idempotency-Key/refund cùng ID. Pending/failed refund chưa trừ doanh thu. Không tạo refund mới để thử lại một lệnh chưa biết kết quả.

## Stripe test: phần đã chuẩn bị và phần còn phụ thuộc

Đã có adapter Stripe SDK 23.0.1: PaymentIntent USD theo cent, card, metadata liên kết payment/booking, key idempotent; refund theo PaymentIntent, full amount của từng giao dịch; webhook raw body + SDK signature ±300s, từ chối livemode, dedup trong cùng transaction cập nhật ledger.

Cần tài khoản Stripe test, quyền sử dụng của chủ dự án, test secret/publishable key, webhook signing secret và endpoint HTTPS nhận được callback. Cấu hình snapshot events:

- payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled;
- refund.created, refund.updated, refund.failed.

SDK đã khóa dùng Stripe API 2026-09-30.endive; tạo endpoint snapshot tương thích và kiểm tra lại khi nâng SDK. Dùng Stripe CLI của bạn để forward webhook tới `http://localhost:5000/api/v1/webhooks/stripe_test` trong thử nghiệm. Không dùng event trigger ngẫu nhiên để xác nhận booking: event phải mang metadata paymentId của payment do backend tạo.

Frontend cần tích hợp SDK Stripe test với clientSecret và poll backend. Chưa có giao dịch Stripe account đầu cuối; kiểm thử hiện tại stub request SDK và dùng SDK thật để tạo/xác minh chữ ký fixture. Chưa có đối soát tự động theo lịch với Stripe nếu webhook mất; operator phải kiểm tra pending/processing, resend event hoặc đối chiếu provider object bằng công cụ nhà cung cấp. Không tự ghi succeeded khi đối soát chưa xác minh.

Tham chiếu: [PaymentIntent](https://docs.stripe.com/api/payment_intents/create), [refund](https://docs.stripe.com/api/refunds/create), [webhook](https://docs.stripe.com/events/manage-webhook-endpoints).

## Đồng bộ tài khoản và audit

Khóa/mở tài khoản ghi trạng thái cục bộ + tokens_valid_after trước; middleware chặn ngay. Ban/email và thu hồi refresh sessions chạy sau; thất bại Supabase trả 202 auth_sync_pending=true, có endpoint /admin/customers/{id}/auth-sync để retry. Cần giám sát marker này; JWT stateless không thể thu hồi chỉ bằng sửa một nút UI. API app vẫn kiểm tra DB mỗi lần.

Audit lưu các thay đổi listing/category/coupon/customer, confirm/complete/cancel booking, quyết định/dispatch refund, logout admin và xuất báo cáo. Runtime có INSERT/SELECT, không UPDATE/DELETE audit. DBA/owner vẫn là chủ thể được tin cậy; đây không phải kho log bất biến ngoài hệ thống.

Chưa có dịch vụ gửi email và chưa gửi email nào. Thông báo email, OTP/social configuration, kiểm thử thiết bị, load test/uplink và cấu hình Supabase hosted thuộc các bước nghiệm thu riêng.

