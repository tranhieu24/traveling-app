# Chạy bản nâng cấp Giai đoạn 1–2

Đọc cùng [RUNBOOK](RUNBOOK.md). Lượt triển khai source này không sửa Supabase, `.env`, dashboard OAuth hoặc URL ảnh live. Các lệnh dưới đây dành cho môi trường bạn chủ động chọn và có quyền cập nhật.

## Schema và rollout

Backend mới cần migration **001–008**. Chỉ áp các migration chưa có trên môi trường đích, đúng thứ tự, sau khi sao lưu và thử staging. Migration 006 thêm hỗ trợ/hướng dẫn nhận phòng, 007 thêm guard policy snapshot và 008 thêm notification outbox. Không chạy lại schema hoặc seed legacy.

Từ thư mục backend, khi biến môi trường shell trỏ đúng staging:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/005_checkout_context.sql
```

PowerShell không tự nạp `.env`. Có thể dùng SQL Editor của đúng project để chạy nguyên transaction. Dừng khi lỗi; không chạy lại migration đã thành công. Kiểm tra chỉ đọc:

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND (
  (table_name='bookings' AND column_name IN
    ('contact_snapshot','policy_snapshot','policy_accepted_at','client_request_id','request_fingerprint'))
  OR (table_name='listing_photos' AND column_name='media_context'))
ORDER BY table_name,column_name;
```

Kỳ vọng 6 dòng. Booking cũ có snapshot/acceptance null; không giả lập lịch sử đồng ý. Client cũ còn được chấp nhận với contact từ hồ sơ server và không ghi acceptance giả.

Rollout: backup → migration 005 → backend → mobile/web → health và demo. Quay lui ứng dụng có thể giữ cột additive. Trước khi xóa cột, phải export snapshot/provenance, quay lui mọi consumer rồi xem các constraint/index/cột được ghi cuối migration. Không xóa giao dịch để ép rollback.

## Chạy backend và mobile

Hai terminal riêng, giữ `.env` hiện có và chỉ bổ sung biến còn thiếu:

```powershell
cd E:\Project_ReactNaTive\traveling-app\traveling-app-backend
npm ci
npm run typecheck
npm run build
npm run dev
```

```powershell
cd E:\Project_ReactNaTive\traveling-app\traveling-app-mobile
npm ci
npm run web
```

Backend/mobile phải dùng cùng Supabase; điện thoại cần URL API truy cập được. OAuth native cần development build có scheme `travelingapp`, không nghiệm thu bằng Expo Go. Sau khi thêm Stripe native/plugin, rebuild development client trước `npm run start:dev-client`.

### Thanh toán

- Mock: dùng `PAYMENT_MODE=mock` và `MOCK_WEBHOOK_SECRET` theo cấu hình hiện tại trên development/test. UI ghi rõ mô phỏng, không thu tiền thật.
- Stripe test: backend dùng `PAYMENT_MODE=stripe_test`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` và biến mới **`STRIPE_PUBLISHABLE_KEY`** bắt đầu `pk_test_`, thuộc cùng môi trường test. Secret không đưa vào mobile.
- GET `/api/v1/payments/config` chỉ trả mode và publishable test key; thiếu key thì UI giải thích cổng chưa cấu hình.
- Forward webhook test tới `/api/v1/webhooks/stripe_test` như RUNBOOK. Test phải dùng PaymentIntent do app tạo; event ngẫu nhiên không chứng minh booking được thanh toán.
- Sau SDK, app kiểm tra payment/booking từ server. Webhook chậm hiện chờ và nút kiểm tra lại. Không tự confirmed chỉ dựa SDK; không bật live.

Tài liệu provider: [Stripe confirmPayment](https://docs.stripe.com/js/payment_intents/confirm_payment), [PaymentSheet React Native](https://docs.stripe.com/payments/accept-a-payment?platform=react-native&ui=payment-sheet).

### OAuth

Mở web trực tiếp trong trình duyệt, không trong iframe. Quản trị cấu hình Supabase phải cho phép callback đúng origin/port `/auth/callback`; native dùng scheme của build. Người dùng tự đăng nhập/consent. Không chia sẻ code/token/cookie trong log. Test Google, Facebook, hủy consent, Back, lỗi mạng khi lấy profile; guest vào màn khách, admin vào quản trị. Sửa callback local không thay cấu hình dashboard và chưa xác định nguyên nhân ảnh consent cũ.

## Bộ ảnh demo

Mở [preview ảnh](media-preview.html) và [catalog](media-catalog.json). Có 15 ảnh địa điểm, một ảnh/listing seed, **không phải ảnh phòng đã xác minh**. Catalog ghi nguồn/tác giả/giấy phép/ngữ cảnh và phạm vi dùng demo. Cần ảnh được chủ cơ sở xác nhận để dùng cho chỗ ở thật.

Từ thư mục backend, mặc định chỉ đọc:

```powershell
npm run media:catalog -- --target=local
```

`local` chỉ chấp nhận loopback. Với staging được phép truy cập, dùng `--target=<hostname chính xác trong DATABASE_URL>`; không đưa cả connection URL chứa mật khẩu vào lệnh/log. Script đọc `.env`, nên phải xác nhận target. Dry-run chỉ phản ánh database vừa chọn, không chứng minh live giống seed.

Sau khi review dry-run và có quyền thay dữ liệu target đó:

```powershell
npm run media:catalog -- --target=local --apply --allow-illustrative
```

Script xét đúng ID trong catalog, đối chiếu title/city/country/type, từ chối ảnh tùy chỉnh, báo `missing` nếu không có listing. Apply thay ảnh legacy từng listing trong transaction; snapshot lưu trước commit tại `dist/media-backups`. Giữ snapshot ở nơi backup phù hợp. Chỉ coi đã áp dụng khi có `Committed.`; snapshot được chuẩn bị chưa chứng minh commit. Chạy lại cùng catalog giữ ID ảnh, không nhân đôi.

Khôi phục bằng tên snapshot thực tế:

```powershell
npm run media:catalog -- --target=local --restore=dist/media-backups/TEN-SNAPSHOT.json
npm run media:catalog -- --target=local --restore=dist/media-backups/TEN-SNAPSHOT.json --apply
```

Restore từ chối nếu ảnh/caption/order/provenance đã đổi sau apply. Không sửa snapshot để vượt kiểm tra. `--catalog=...` chọn catalog đã review riêng. Ảnh phải đồng nhất ở Home/Search/Favorites, chi tiết, checkout, booking và admin. Chỉ bản ghi đã áp catalog có provenance mới; URL database cũ còn nguyên tới khi apply.

## Demo và kiểm tra

1. Đăng nhập khách; chọn chỗ ở/ngày tương lai/số khách. So tổng phí USD giữa báo giá và checkout.
2. Kiểm tra tên/email có sẵn; sửa liên hệ, nhập yêu cầu, đọc và đồng ý chính sách. Chưa đồng ý thì chưa đặt được.
3. Tạo đơn, thử lại khi mạng lỗi: cùng payload phải về cùng đơn. Nếu giá/chính sách đổi, phải xem và xác nhận báo giá mới.
4. Chọn cọc/trả đủ; quan sát giữ phòng. Mock: mô phỏng rồi xem chi tiết/chứng từ. Stripe test: riêng ca thành công, hủy, thẻ từ chối, webhook chậm.
5. Đơn confirmed đã cọc vẫn trả số dư sau hạn hold ban đầu. Đơn pending hết hạn phải kiểm tra trạng thái/đặt lại; không báo success giả.
6. Review tải trang đầu 12 mục rồi tải thêm; tổng số/biểu đồ lấy toàn bộ dữ liệu server, không có sáu điểm tiêu chí suy diễn.
7. Kiểm tra cùng listing trên các màn, nhãn minh họa/link tác giả/giấy phép; URL lỗi phải có fallback trung tính.
8. Web 360px và màn rộng; native mở bàn phím tại checkout, cuộn tới ô cuối/nút đặt; Back/resume khi thanh toán. Những ca tương tác này chưa có bằng chứng nghiệm thu trong lượt triển khai.

Kiểm thử từ hai thư mục tương ứng:

```powershell
# traveling-app-backend
npm run typecheck
npm run build
npm run docs:generate
npm run test:isolated
```

```powershell
# traveling-app-mobile
npx tsc --noEmit
node --test scripts/auth.test.cjs scripts/admin.test.cjs scripts/sdk.test.cjs scripts/native-ui.test.cjs scripts/upgrade.test.cjs
npx expo export --platform all --output-dir dist/upgrade-check
node scripts/render-upgrade-preview.cjs
```

Preview ở `traveling-app-mobile/dist/upgrade-preview/index.html`: HTML tĩnh từ component thật với fixture, khung rộng/360px. Không gọi API, nút không tương tác; không thay thế chạy app. AI chưa thuộc bản demo này.

## Email giao dịch (NOTIFY-01)

Mặc định `EMAIL_MODE=disabled`: event vẫn được ghi bền vững nhưng worker không claim và không ghi đã gửi. Để dùng provider/relay đã được phép, cấu hình `EMAIL_MODE=webhook`, URL HTTPS và secret theo `.env.example`. Chỉ HTTP 2xx có `messageId` hoặc `id` mới được ghi `sent`.

```powershell
npm run notifications:dispatch -- 25
```

Phải lên lịch lệnh trên ở môi trường chạy; việc có CLI chưa chứng minh cron đã hoạt động. Outbox retry exponential theo `EMAIL_MAX_ATTEMPTS`, không log secret. Theo dõi số lượng `pending/failed/sent`; không sửa trực tiếp thành `sent`.
