# Bàn giao Giai đoạn 2 — đọc trước khi tiếp tục

Cập nhật: 04/11/2026 (Asia/Bangkok). Không tự commit/push/deploy, chạy seed, sửa `.env` hoặc áp migration lên database dùng chung.

## Đã triển khai trong source

- HELP-01 và TRIP-01: migration 006, API/repository, UI khách/admin, quyền chủ booking/admin và arrival guide có revision.
- POLICY-01: migration 007, cấu hình `BOOKING_DEPOSIT_USD`/`CANCELLATION_CUTOFF_DAYS`, snapshot theo booking và UI hiển thị chính sách.
- AUTH-02: forgot/reset password, allowlisted recovery callback, chống callback lặp và xử lý link không hợp lệ.
- NOTIFY-01: migration 008, outbox có event key unique, trạng thái/retry/backoff, webhook adapter và CLI `notifications:dispatch`. Event đã nối vào tạo booking, payment succeeded, cancel/refund requested và refund succeeded.
- Email mặc định disabled. Chưa có provider thật nên không tuyên bố email đã gửi.

## Bằng chứng hiện tại

- `npm run typecheck` backend: đạt.
- `npm run build` backend: đạt.
- `npx tsc --noEmit` mobile: đạt.
- `node --test scripts/*.test.cjs` mobile: 68/68 đạt.
- Expo export web/iOS/Android vào `dist/phase2-check`: đạt (artifact bị ignore, có thể tạo lại).
- OpenAPI/Postman/API reference: sinh và validate 71 operation bằng `node dist/scripts/generate-api-docs.js`.
- Backend integration trước NOTIFY: 42/42 đạt. Sau NOTIFY đã thêm test dedup/failure/provider-confirmed delivery nhưng chưa chạy được: hai lần `npm run test:isolated` dừng trước test do Node 24/Windows báo `uv_os_get_passwd ENOMEM`. Phải chạy lại trên máy/phiên đủ bộ nhớ.

## Việc tiếp theo cụ thể

1. Chạy lại backend integration và sửa mọi lỗi thực tế nếu có.
2. Kiểm tra thủ công trên web + development build: support, trip guide, policy, forgot/reset.
3. Backup staging rồi áp lần lượt migration chưa có trong 005–008; không chạy seed.
4. Cấu hình Supabase recovery redirect/email template và test link thật, gồm link hết hạn.
5. Chọn/configure email relay webhook, chạy worker bằng scheduler, test dedup/retry; giữ disabled nếu chưa có provider.
6. Nghiệm thu OAuth/Stripe test thật và UI thiết bị. Sau đó mới kết thúc Giai đoạn 2.
7. Giai đoạn 3 còn AI-01/AI-02; Giai đoạn 4 còn OPS-01, hồi quy, Postman/OpenAPI và bàn giao cuối.

## Lưu ý Git

`docs/TEAM_ONBOARDING.md` đang bị xóa trong worktree từ trước lượt NOTIFY; coi là thay đổi của người dùng, không tự khôi phục hay commit cùng. Pull trên máy khác chỉ nhận file đã commit/push; không commit `.env`, `node_modules`, `dist` hoặc fixture database.

## Cập nhật tiền đề Giai đoạn 3 — dữ liệu thật và Việt hóa

- Đã Việt hóa sâu giao diện mobile, gồm màn hình đặt chỗ/thanh toán/tài khoản/tìm kiếm/đánh giá, nhãn trợ năng, thông báo lỗi từ `services`/`utils`, trạng thái hoàn tiền và toàn bộ nội dung FAQ.
- Đã sửa chuỗi tiếng Việt lỗi mã hóa ở màn hình đánh giá và nút đăng nhập mạng xã hội.
- Bằng chứng sau thay đổi: `npx tsc --noEmit` đạt; 68/68 test mobile đạt; backend `npm run build` đạt.
- Đã tạo `database/migrations/009_real_homestay_catalog.sql` để bổ sung 35 hồ sơ property/hạng phòng thật bằng ID cố định, kèm bảng provenance `listing_source_audits`. Tất cả listing mới được để `is_active = false`; migration không chèn ảnh `needs_review`/`blocked`.
- Chủ project xác nhận migration 009 đã chạy thành công trên Supabase ngày 04/11/2026. Chưa có truy vấn đối soát từ agent trong phiên này; cần giữ kết quả SQL/backup của môi trường làm bằng chứng rollout.
- Đã chuẩn bị migration 010 để chặn kích hoạt listing có provenance khi chưa có source audit `approved` và cover `verified_property`/`approved`. Migration 010 chưa được áp dụng. Người tiếp tục vẫn phải xác minh giá, phí, tọa độ, sức chứa và quyền sử dụng ảnh trước khi kích hoạt từng listing.
