# Thông báo trong ứng dụng

Áp dụng `database/migrations/015_inapp_notifications.sql` sau migration 008.
Migration thêm `read_at` và chỉ mục vào lịch sử sự kiện hiện có; chạy lại an toàn.
Không thay đổi trạng thái đặt phòng, thanh toán hay trạng thái gửi email.

Mở nút chuông trên Tìm kiếm, mục Thông báo trong Tài khoản hoặc tab Hộp thư.
Hộp thư gồm Thông báo và Yêu cầu hỗ trợ. Khách chưa đăng nhập thấy lời mời đăng
nhập, không gửi yêu cầu đọc dữ liệu riêng tư.

Các sự kiện tạo yêu cầu đặt phòng, ghi nhận thanh toán, hủy đơn, yêu cầu hoàn
tiền và hoàn tiền thành công đã được lưu cùng giao dịch nghiệp vụ. Danh sách
thông báo sử dụng các sự kiện này kể cả khi gửi email đang tắt hoặc thất bại.
Không tạo thông báo mẫu hay coi đơn đang chờ là đã xác nhận. Lịch sử cũ vẫn hiển thị.

API yêu cầu đăng nhập, chỉ đọc/sửa trạng thái đọc của chính người nhận:

- `GET /api/v1/notifications?page=1&limit=20&unreadOnly=false`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`, body `{}`
- `PATCH /api/v1/notifications/read-all`, body `{}` hoặc `{ "before": "ISO timestamp" }`

Mọi phản hồi dùng `private, no-store`; không trả địa chỉ email, lỗi nhà cung cấp
hay payload thô. Liên kết đơn chỉ có khi đơn thuộc người nhận. Đọc một thông báo
nhiều lần giữ nguyên thời điểm đọc đầu tiên. Đọc tất cả có mốc thời gian không
đánh dấu các sự kiện mới hơn. Người quản trị cũng không đọc thay thông báo của
người khác qua API này.

Frontend làm mới khi mở màn hình và mỗi 30 giây khi đang hoạt động, hỗ trợ kéo
để làm mới. Badge chuông/Hộp thư cùng cập nhật sau khi đọc. Cache tách theo tài
khoản; yêu cầu cập nhật bị hủy khi đổi phiên đăng nhập. Thông báo trong app hoạt
động độc lập với quyền thông báo hệ điều hành và worker gửi email.

Kiểm tra: `npm run test:notifications` trong backend và
`npm run test:notifications` trong mobile. Backend dùng PostgreSQL tạm, giả lập
xác thực và gửi email, không gửi email thật hay ghi dữ liệu vào Supabase.
