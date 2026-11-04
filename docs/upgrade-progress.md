# Tiến độ nâng cấp

Cập nhật ngày 04/11/2026 (Asia/Bangkok). Giai đoạn 0–1 đã có source; Giai đoạn 2 đã triển khai local và đang chờ rollout/kiểm thử dịch vụ thật.

| Hạng mục | Trạng thái |
| --- | --- |
| Giai đoạn 0 | Hoàn thành audit và thiết kế |
| Giai đoạn 1 | Checkout/payment/review/media đã triển khai; provider và UI thiết bị thật chưa nghiệm thu đầy đủ |
| POLICY-01 | Cọc và hạn hủy cấu hình server, snapshot bất biến theo booking; migration 007 |
| TRIP-01 | Timeline chuyến đi và hướng dẫn nhận phòng riêng tư do admin nhập; migration 006 |
| HELP-01 | Ticket gắn booking, phân quyền khách/admin, reply và trạng thái; migration 006 |
| AUTH-02 | Gửi link khôi phục, callback recovery riêng, đặt mật khẩu và xử lý link lỗi/hết hạn |
| NOTIFY-01 | Outbox transaction, dedup, retry/backoff và webhook adapter; migration 008. Mặc định disabled, chưa gửi email thật |
| Giai đoạn 3 | Chưa làm AI-01/AI-02 |
| Giai đoạn 4 | Chưa hoàn tất OPS-01, provider thật và nghiệm thu hồi quy |

Kết quả mới nhất: backend typecheck/build đạt; OpenAPI validate 71 operation; mobile TypeScript, export web/iOS/Android và **68/68** test đạt. Backend integration trước NOTIFY đạt **42/42**; lượt hiện tại chưa chạy lại được vì Node/Windows lỗi `uv_os_get_passwd ENOMEM` trước khi test bắt đầu. Không coi đây là bằng chứng email/OAuth/Stripe thật.

## Tiền đề Giai đoạn 3 cập nhật 04/11/2026

- Việt hóa mobile đã mở rộng đến các chuỗi động trong `services`, `utils`, trạng thái thanh toán/hoàn tiền, FAQ và nhãn trợ năng; 68/68 test mobile vẫn đạt.
- Hồ sơ ảnh thật của các cơ sở được theo dõi tại `docs/real-property-media-audit.md`.
- Migration 009 bổ sung 35 hồ sơ property/hạng phòng thật đã được chủ project xác nhận chạy thành công trên Supabase ngày 04/11/2026. Các hồ sơ vẫn `is_active = false` và không có ảnh `needs_review`/`blocked` trong `listing_photos`; agent chưa tự đối soát database đích.
- Migration 010 đã được chuẩn bị nhưng chưa áp dụng: database sẽ từ chối bật listing có provenance nếu source audit chưa `approved` hoặc chưa có cover `verified_property`/`approved`, và ngăn làm mất điều kiện này sau khi listing đã công khai.
