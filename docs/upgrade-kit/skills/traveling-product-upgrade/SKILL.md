---
name: traveling-product-upgrade
description: Cải thiện nghiệp vụ và trải nghiệm đặt chỗ trong repository Traveling App Expo/Express/Supabase. Dùng cho checkout, booking, thanh toán, hủy-hoàn tiền, hỗ trợ và admin; không dùng để xây một website thay thế hoặc mở rộng sang vé máy bay/tour.
---

# Nâng cấp nghiệp vụ Traveling App

Đọc [prompt chung](../../../TRAVELING_APP_UPGRADE_PROMPT.md) để biết mã yêu cầu và phạm vi giai đoạn được chọn. Khi làm toàn bộ bản nâng cấp, ghi tiến độ theo mã yêu cầu trong prompt; khi chỉ sửa một nghiệp vụ, chỉ đọc phần liên quan.

## Đặc điểm repository cần giữ

- Mobile ở `traveling-app-mobile`; backend ở `traveling-app-backend`; schema/migration ở `database`.
- Khách, host và admin là vai trò hiện có; chưa suy ra có portal host đầy đủ chỉ từ enum role.
- Booking: pending → confirmed/cancelled/expired; confirmed → completed/cancelled. Đọc code hiện tại để xác minh chuyển trạng thái cụ thể.
- Cọc/trả đủ và ledger refund đã có. Server quyết định giá và mức thanh toán; không biến thao tác admin thành cách tạo payment succeeded.
- Mô hình một listing là một đơn vị đặt chỗ. Không thêm tồn nhiều phòng nếu giai đoạn không yêu cầu.
- Database hosted không được coi là fixture. `database/seed.sql` là legacy, không chạy lại để sửa ảnh hay bổ sung tài khoản test.

## Thiết kế theo quyết định của người dùng

Với mỗi màn thay đổi, xác định người dùng cần biết gì, quyết định gì và bước tiếp theo khi thành công/thất bại. Ít nhất có loading, empty, error và retry phù hợp; không tạo màn trung gian chỉ để tăng số bước.

Checkout cần thống nhất lựa chọn phòng, ngày, khách, thông tin liên hệ, yêu cầu đặc biệt, giá chi tiết, chính sách và số tiền thu ngay. Không bắt khách nhập lại dữ liệu đã có hợp lệ. Thông tin liên hệ cần thiết phải được server kiểm tra và có mô hình lưu trữ rõ ràng.

Sau đặt phòng, trình bày các trạng thái booking, payment và refund tách biệt bằng nhãn dễ hiểu. Ví dụ đơn đã xác nhận nhưng mới trả cọc phải thể hiện cả số còn thiếu và hạn trả, không gọi chung là đã trả đủ.

Chính sách cọc/hủy cần cấu hình và chụp tại thời điểm đặt. Nếu chưa được chốt chính sách mới, giữ giá trị hiện có làm mặc định, ghi rõ ý nghĩa và cho cấu hình; không tự phát minh mức phạt hoặc hạn hoàn tiền để quảng cáo.

Điều kiện theo thời gian phải dùng múi giờ được quy định rõ. Giữ tương thích quy ước UTC hiện tại cho tới khi có thiết kế chuyển đổi sang múi giờ nơi lưu trú; không đổi cách hiển thị rồi âm thầm đổi điều kiện backend.

## Quy tắc triển khai

1. Xác minh lỗi với fixture hoặc log an toàn; phân biệt lỗi code với provider chưa cấu hình. Ảnh consent Google không đủ để kết luận lỗi callback.
2. Thiết kế hợp đồng API và dữ liệu tối thiểu trước khi nối UI. Tái sử dụng schema, kiểm tra quyền và cơ chế transaction hiện có.
3. Khi thêm trường snapshot, xử lý booking cũ không có trường đó. Khi thay đổi cách tính tiền, dùng đơn vị tiền nhỏ nhất và kiểm tra tổng; không tính từ chuỗi đã định dạng.
4. Hỗ trợ gửi yêu cầu gắn booking là MVP hợp lý cho Inbox. Chỉ gọi là chat realtime khi đã có cơ chế realtime, thứ tự tin, quyền xem và trạng thái kết nối.
5. Email/thông báo cần tác vụ bền vững và khóa chống gửi trùng theo sự kiện. Ghi trạng thái retry/failed; không cần thêm hạ tầng hàng đợi riêng nếu bảng outbox và worker hiện có đủ dùng.
6. Job hết hạn phải được lên lịch ở môi trường chạy, có báo cáo lần chạy/lỗi. Không coi việc có endpoint/CLI là đã vận hành cron.
7. Kiểm tra limiter trước webhook và cấu hình reverse proxy; không vô hiệu hóa xác thực chữ ký hoặc rate limit toàn hệ thống để giải quyết một lỗi tạm.
8. Chuẩn hóa nhãn tiếng Việt cho phần thay đổi, component và token giao diện dùng lại được. Không viết lại tất cả CSS hoặc toàn bộ màn admin khi chỉ sửa một dialog.

## Những sửa đổi đặc biệt cần kiểm tra

- Callback social phải điều hướng theo hồ sơ server, không tự gán role. Quên mật khẩu và đổi mật khẩu là hai luồng khác nhau.
- Điểm review theo tiêu chí phải có dữ liệu được thu thập thật. Với MVP chỉ có overall rating, trả và hiển thị overall rating.
- Danh sách review dùng phân trang; thống kê dùng truy vấn tổng hợp, không tải toàn bộ dữ liệu lên máy khách để tính.
- Chỉ chuyển completed khi đủ điều kiện thời gian và thanh toán; quyền quyết định ở server dù UI đã ẩn nút.
- Nếu thêm đổi lịch, phải kiểm tra lại lịch/giá trong transaction và giữ lịch sử; không chỉ cập nhật ngày ở client.

## Bàn giao

Mỗi thay đổi cần có ví dụ trước/sau, đường đi trên UI, tác động API/database và ca kiểm tra rủi ro. Chạy các kiểm tra liên quan trong prompt chung. Phân biệt test stub, database fixture và provider thật; không đánh dấu nghiệm thu provider thật bằng unit test.
