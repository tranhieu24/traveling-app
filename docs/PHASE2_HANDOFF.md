# Bàn giao Giai đoạn 2 — đọc trước khi tiếp tục

Cập nhật: 03/11/2026 (Asia/Bangkok). Người dùng yêu cầu tiếp tục Giai đoạn 2 và luôn có bàn giao nếu hết ngân sách token. File này được cập nhật theo checkpoint; không coi mục đang làm là đã hoàn thành.

## Phạm vi và quyết định

- Làm POLICY-01, TRIP-01, NOTIFY-01, HELP-01, AUTH-02 trong `TRAVELING_APP_UPGRADE_PROMPT.md` và skill `upgrade-kit/skills/traveling-product-upgrade/SKILL.md`.
- Giữ Expo/Express/PostgreSQL/Supabase, USD, một listing là một đơn vị đặt chỗ. Backend quyết định quyền, tiền và trạng thái.
- Giai đoạn 1 đã có source nhưng chưa commit tại lúc bắt đầu; giữ mọi thay đổi hiện có. Kết quả lịch sử: backend 40/40, mobile 61/61, export 3 nền tảng. Không coi đó là kết quả Giai đoạn 2.
- Người dùng đã tạm dừng việc tìm/thay ảnh. Không tiếp tục việc đó trong Giai đoạn 2. Khi được tiếp tục: làm cả cảnh quan và chỗ ở demo, được đổi tên/mô tả để khớp bộ ảnh có nguồn.
- Không tự commit/push/deploy, chạy seed, sửa `.env`, dashboard provider hoặc áp migration lên database dùng chung. Thử trên PostgreSQL tạm.

## Checkpoint hiện tại

Đang kiểm kê source và thiết kế Giai đoạn 2. Chưa có migration hoặc tính năng Giai đoạn 2 được nghiệm thu.

| Mã | Trạng thái |
| --- | --- |
| HELP-01 | Cần làm ticket gắn booking, quyền chủ đơn/admin, nội dung/reply/trạng thái và UI khách/admin |
| TRIP-01 | Cần timeline và hướng dẫn nhận phòng do admin cung cấp, không bịa liên hệ hoặc giờ thực tế |
| POLICY-01 | Cần cấu hình chính sách và thực thi theo snapshot; không chỉ sửa lời mô tả |
| NOTIFY-01 | Cần outbox bền vững/dedup/retry, adapter email và trạng thái chưa cấu hình minh bạch |
| AUTH-02 | Cần forgot/reset password, callback recovery riêng và kiểm thử link hết hạn |

## Chạy trên máy khác

1. Pull nhánh có cả code và file bàn giao đã được người sở hữu commit/push. **Pull không lấy được file chưa commit/untracked trên máy cũ.** Không đưa `.env`, node_modules, dist hay fixture database vào commit.
2. `npm ci` riêng trong backend và mobile. Tự cấu hình `.env` theo mẫu bằng secrets của môi trường được phép sử dụng; không gửi secrets qua tài liệu bàn giao.
3. Đọc prompt, skill, `upgrade-progress.md`, `upgrade-runbook.md` và checkpoint trong file này. `git status --short` trước khi sửa.
4. Migration đã có 001–005; chưa có bằng chứng 005 đã được áp ở Supabase của người dùng. Không chạy lại migration cũ đã áp.
5. Backend: `npm run typecheck`, `npm run build`, `npm run docs:generate`, `npm run test:isolated` (DB tạm, Auth/Stripe stub).
6. Mobile: `npx tsc --noEmit`; `node --test scripts/*.test.cjs`; `npx expo export --platform all --output-dir dist/upgrade-check`.

## Lưu ý môi trường và bằng chứng

- Không cần tệp trong `dist` để tiếp tục code; chúng chỉ là kết quả/scratch có thể tạo lại.
- PowerShell khi pipe Python có tiếng Việt phải đặt `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`; đọc file bằng UTF-8.
- Test isolated trên Windows có thể cần quyền chạy PostgreSQL nhúng ngoài sandbox. Không đổi sang database thật để né lỗi quyền.
- OAuth/Stripe thật, email thật và UI thiết bị cần nghiệm thu riêng; fixture/build không thay thế bằng chứng đó.
- Cập nhật file này trước khi kết thúc mỗi checkpoint: file thay đổi, test thực chạy, lỗi đang mở và việc tiếp theo cụ thể.
