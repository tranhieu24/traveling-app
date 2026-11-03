# Tiến độ nâng cấp

Phạm vi: Giai đoạn 0 → Giai đoạn 1. Cập nhật ngày 03/11/2026. Chưa triển khai AI/Giai đoạn 2–4.

| Hạng mục | Trạng thái |
| --- | --- |
| Giai đoạn 0: audit và thiết kế | Đã hoàn thành tài liệu và hợp đồng dữ liệu |
| AUTH-01 | Callback chống lặp, điều hướng theo role, chặn iframe; đạt test local, chưa nghiệm thu Google/Facebook thật |
| BOOK-01 / BOOK-02 | Checkout liên hệ/chính sách/snapshot/idempotency; đồng hồ theo server; đơn đã cọc không bị hold cũ chặn trả số dư. Đạt fixture, cần rollout migration 005 và UI thiết bị |
| PAY-01 | Adapter Stripe web/native test; xác nhận server, retry và chờ webhook; đạt fixture, chưa có giao dịch Stripe account đầu cuối |
| REVIEW-01 / REVIEW-02 | Bỏ tiêu chí suy diễn; summary riêng và tải thêm 12 review/trang. Đạt kiểm thử local |
| MEDIA-01 | 15 ảnh địa điểm có nguồn/license, preview, import/restore có bảo vệ. Chưa thay database dùng chung; 0 property đã xác minh; còn thiếu gallery ảnh thật |
| UX-01 | Việt hóa nhiều nhãn luồng chính, ngày/tiền, token dùng chung, form tránh bàn phím và fixture web rộng/360px. Chưa nghiệm thu tương tác/native; nội dung phụ còn tiếng Anh |

Backend: **40/40** test; mobile: **61/61** test. Đây là kiểm thử có stub provider, không xác nhận OAuth hoặc thanh toán thật.

Giai đoạn 1 có bản triển khai local để review; chưa đánh dấu nghiệm thu toàn bộ khi thiếu provider thật, ảnh property và kiểm tra giao diện tương tác. Đọc [nghiệm thu](upgrade-acceptance.md) và [cách chạy](upgrade-runbook.md).
