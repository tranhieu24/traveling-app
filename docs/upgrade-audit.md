# Kiểm chứng nâng cấp — Giai đoạn 0

Ngày 03/11/2026. Phạm vi: Giai đoạn 0 và 1 trong TRAVELING_APP_UPGRADE_PROMPT.md. Không chạy seed hoặc thay đổi database hosted. Các URL trong seed không chứng minh dữ liệu live giống seed.

| Mã | Bằng chứng trước thay đổi | Quyết định Giai đoạn 1 |
| --- | --- | --- |
| AUTH-01 | AuthCallbackScreen và SocialSignInButtons luôn reset MainTabs; email login phân vai trò. Ảnh Google consent chưa cho biết lỗi cuối cùng. | Đồng nhất điều hướng theo hồ sơ, bảo vệ xử lý callback/retry, thông báo lỗi theo bước. Không kết luận đã sửa dashboard/provider thật. |
| BOOK-01 | OrderReview chỉ gửi listing/ngày/khách/plan; không có liên hệ, xác nhận chính sách hay kiểm tra giá thay đổi. | Checkout liên hệ, yêu cầu đặc biệt, chính sách server; snapshot và khóa chống tạo trùng khi retry. Giữ tương thích request cũ. |
| BOOK-02 | payment_due_at có trong API; UI chưa có đồng hồ gắn thời gian server. | serverTime, đếm ngược tham khảo, chặn bằng backend, tiếp tục hoặc đặt lại. |
| PAY-01 | initiateGateway tạo PaymentIntent test; bookingPayment từ chối non-mock. | Stripe Payment Element web và PaymentSheet native; không coi SDK success là booking confirmed. Giữ idempotency, kiểm tra webhook hữu hạn. |
| REVIEW-01 | ReviewRepository alias overall rating thành sáu tiêu chí không được thu thập. | Overall rating duy nhất; bỏ alias khỏi API. |
| REVIEW-02 | fetchAllListingReviews tải mọi trang rồi tính thống kê. | API thống kê tổng hợp, infinite query, tải thêm 12 review. |
| MEDIA-01 | database/seed.sql dùng picsum.photos/seed cho 15 listing. Không có ảnh property do chủ sở hữu cung cấp. | Catalog có provenance, ảnh địa điểm minh họa có nhãn; script dry-run/apply/restore riêng. Không tự thay dữ liệu hosted. |
| UX-01 | Nhiều nhãn tiếng Anh, màu/spacing lặp lại. | Tokens dùng chung, các bước checkout/thanh toán/review và nhãn hành trình tiếng Việt; hồi quy kích thước 360px. |
| AUTH-02, POLICY-01, TRIP-01, NOTIFY-01, HELP-01 | Đã xác định trong prompt; phụ thuộc workflow/chính sách riêng. | Giữ ở Giai đoạn 2; không tự thêm chính sách phạt hoặc hotline. |
| AI-01, AI-02 | Chưa có provider hay luồng AI. | Giữ ở Giai đoạn 3 theo yêu cầu lượt này. |
| OPS-01 | Job expiry có CLI, chưa xác minh scheduler deployment. | Ghi phụ thuộc vận hành; kiểm tra expiry và webhook khi thay luồng chính, không tự deploy job. |
| EXT-01 | Listing là một đơn vị tồn. | Không đổi mô hình kinh doanh. |

## Giới hạn bằng chứng

- Test nền và kết quả sau thay đổi ghi trong upgrade-acceptance.md, không lấy kết quả lịch sử làm kết quả mới.
- Google/Meta consent thật phải do người dùng hoàn tất. Không tự đọc session/cookie của người dùng.
- Stripe test cần publishable test key, secret test key và webhook forwarding cùng tài khoản. Không tự bật live.
- Ảnh nội thất của các listing seed chưa có bằng chứng là property thật. Ảnh địa điểm chỉ được duyệt để minh họa địa điểm, không xác minh cơ sở lưu trú.
