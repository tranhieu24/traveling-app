# Traveling Admin Portal

Giao diện được triển khai theo phần System Admin, UC021–UC041 trong
`Bao_Cao_Phan_Tich_Thiet_Ke_Traveling_App.docx`.

## Mở giao diện

- Đăng nhập quản trị: `http://localhost:8082/admin/login`.
- Dashboard: `http://localhost:8082/admin`.
- Thay `8082` bằng cổng Expo web đang chạy nếu dùng cổng khác.
- Tài khoản admin đăng nhập từ màn hình Log in thông thường cũng được chuyển
  đến Admin Portal. Trong Profile của admin có nút quay lại portal.

Chỉ dùng tài khoản đã có `users.role = 'admin'` và đang hoạt động. Không có
chức năng tự đăng ký admin hoặc tự nâng quyền trên frontend. Portal kiểm tra
thêm `/admin/session`; backend tiếp tục kiểm tra JWT và quyền ở mọi API.

## Đối chiếu báo cáo

| Use case | Giao diện và hành vi |
| --- | --- |
| UC021–022 | Đăng nhập riêng, kiểm tra quyền, đăng xuất và thu hồi phiên qua backend |
| UC023–026 | Thêm/sửa chỗ ở, ảnh bìa và bộ sưu tập, tiện ích, giá/phí, ẩn/hiện, tìm kiếm theo từ khóa/danh mục/thành phố |
| UC027–030 | Thêm/sửa danh mục, chọn hoặc tải biểu tượng, tìm kiếm, chặn xóa danh mục còn chỗ ở liên kết |
| UC031–033 | Tìm khách theo tên/email/SĐT; sửa hồ sơ; khóa/mở khóa có lý do; theo dõi và thử lại đồng bộ xác thực |
| UC034–036 | Tra cứu đặt phòng, xem thanh toán và lịch lưu trú, xác nhận/hoàn thành/hủy đơn, duyệt/từ chối và gửi xử lý hoàn tiền |
| UC037–040 | Tạo/sửa/ngừng áp dụng coupon, tìm kiếm và lọc trạng thái, giới hạn thời gian/số lượng/số lượt mỗi khách/phạm vi áp dụng |
| UC041 | Chọn khoảng ngày, biểu đồ thu/hoàn, tổng thu/hoàn/thuần, bảng chi tiết và xuất Excel có xác thực |

Các danh sách có phân trang, trạng thái đang tải, báo lỗi và thử lại. Màn hình
nhỏ dùng menu thu gọn; bảng có thể cuộn ngang. Giao diện không dùng dữ liệu mẫu
làm phương án thay thế khi API lỗi.

## Quy tắc được giữ

- Chỗ ở được ẩn bằng API soft delete; lịch sử đặt phòng vẫn còn. Coupon ngừng
  áp dụng cũng giữ lịch sử. API danh mục chặn thao tác nếu còn liên kết.
- Lưu chỗ ở cần ảnh, giá dương, sức chứa hợp lệ và thời gian nhận/trả đúng định dạng.
- Xác nhận đơn cần thanh toán đã xác minh và thời hạn giữ phòng còn hiệu lực.
  Hoàn thành cần trả đủ tiền và đến ngày trả phòng theo UTC. Backend quyết định
  cuối cùng, kể cả khi dữ liệu trên giao diện vừa bị thay đổi bởi người khác.
- Duyệt hoàn tiền không đồng nghĩa tiền đã hoàn. Sau khi duyệt, quản trị viên
  chọn thực hiện hoàn tiền. Chỉ hiển thị thành công khi API xác nhận; giao dịch
  đang xử lý hoặc lỗi vẫn giữ đúng trạng thái để theo dõi/thử lại.
- Lý do khóa/mở khóa, hủy đơn và quyết định hoàn tiền có từ 3 đến 500 ký tự.
- Doanh thu thuần bằng thanh toán thành công trừ hoàn tiền thành công. Số giao
  dịch thanh toán không được gắn nhãn thành số đơn duy nhất. Báo cáo dùng UTC,
  tối đa 367 ngày, và xuất Excel theo đúng khoảng ngày đã áp dụng.
- Backend hiện công bố báo cáo thuộc `test_and_mock_only`; giao diện hiển thị
  rõ nhãn dữ liệu thử nghiệm. Không coi thanh toán mô phỏng là doanh thu thực.

## Ảnh và biểu tượng

`POST /api/v1/admin/media` chỉ dành cho admin. Server kiểm tra loại nội dung,
chữ ký tệp, base64 và giới hạn 4 MB; chỉ nhận JPG/PNG/WebP. Service role key
được dùng ở backend, không đưa vào frontend.

Khi admin tải ảnh lần đầu, server tạo bucket công khai `admin-listing-images`
nếu chưa tồn tại. Bucket chỉ dành cho ảnh hiển thị công khai của chỗ ở/danh mục,
không dùng cho giấy tờ cá nhân. Không có thao tác tạo bucket trong các bài test.

Danh mục lưu khóa ngắn `media:<uuid>.<extension>` vừa cột `icon_name` hiện có.
Thanh danh mục của ứng dụng khách cũng đọc được định dạng này. Không cần đổi
schema database cho chức năng admin mới. Ảnh chỗ ở có thể thêm bằng URL lưu trữ
nếu không sử dụng tính năng tải tệp. Tải tệp được thiết kế cho Admin Portal web;
giao diện native có thể dùng URL ảnh.

## Phạm vi backend

Tận dụng API admin hiện có. Các bổ sung trong lần triển khai này gồm:

- Bộ lọc `categoryId`/`city` cho danh sách chỗ ở, với SQL tham số hóa.
- Tên chỗ ở và thông tin khách trong danh sách đặt phòng/hoàn tiền để đối soát.
- Endpoint tải ảnh có xác thực admin.

Giao diện không tự đổi vai trò tài khoản, không giả lập thành công khi API lỗi,
và không tuyên bố đã gửi email. Các email thông báo được mô tả trong báo cáo
cần dịch vụ thông báo phía backend; không thuộc các API admin hiện tại.

## Kiểm tra

Trong `traveling-app-mobile`:

```powershell
npm run test:admin
npx tsc --noEmit
```

Trong `traveling-app-backend`:

```powershell
npm run typecheck
```

Bộ test tập trung kiểm tra payload form so với schema backend, ngày báo cáo,
tổng hợp doanh thu, điều kiện trạng thái đặt phòng, SQL bộ lọc, ảnh tải lên và
phân quyền admin. Kiểm tra trình duyệt dùng API/auth/storage giả lập, bao gồm
CRUD, phân trang, đồng bộ tài khoản, hoàn tiền, Excel, menu mobile và chặn dữ
liệu khi quyền bị thu hồi. Không tạo tài khoản, thay đổi đơn, khóa khách hàng
hay thực hiện hoàn tiền trên Supabase thật trong quá trình kiểm tra.
