# Thiết kế Giai đoạn 1

## Hành trình

Tìm phòng → ảnh/thông tin → chọn ngày/khách → báo giá server → liên hệ/yêu cầu/chính sách → tạo pending có thời hạn → payment mock hoặc Stripe test → xác nhận server → chi tiết booking.

Không thêm màn cho mỗi trường. Checkout gom lựa chọn và nội dung cần quyết định. Người chưa đăng nhập vẫn xem phòng. API và UI giữ USD; không đổi nhãn thành VND.

## Dữ liệu và tương thích

- Migration 005 thêm snapshot liên hệ/chính sách, khóa tạo booking và fingerprint. Booking cũ có trường null; UI dùng thông tin đã có và không giả là khách đã chấp thuận chính sách mới.
- Request cũ được chấp nhận với thông tin hồ sơ server và không ghi policy acceptance giả. Checkout mới gửi contact, policy version/acceptance, tổng tiền dự kiến và requestId.
- Quote đưa chính sách hiện hành và serverTime. Backend so tổng tiền, version và dữ liệu trong transaction. Cùng requestId/cùng payload trả booking cũ; khác payload trả conflict.
- Giữ mặc định cọc 30 USD, hủy trước ngày nhận phòng UTC và refund phải duyệt. Chưa thêm cấu hình chính sách mới của Giai đoạn 2.
- API review summary riêng trả total/average/counts cho toàn bộ listing; danh sách vẫn phân trang. Không trả điểm vệ sinh/giao tiếp suy diễn.

## Thanh toán

Backend giữ PaymentIntent hiện tại. Frontend chọn adapter dựa provider trả về; chỉ mock mới simulate. Stripe.js trên web thu thập thẻ qua Elements; native dùng PaymentSheet tương thích Expo. Publishable test key public; secret chỉ ở server. SDK trả xong thì poll booking hữu hạn và kiểm tra đúng payment đã succeeded/booking confirmed; webhook chậm hiển thị đang chờ và cho kiểm tra lại. Không đặt client secret vào URL hoặc log.

Thời hạn dựa serverTime và đồng hồ monotonic của thiết bị, đồng thời backend kiểm tra mỗi request. Khi hết hạn UI hiển thị đặt lại; client không được tự xác nhận booking expired thay backend.

## Ảnh

Catalog ghi đúng seed ID và nguồn/license/context. Property chưa xác minh dùng nhãn “Ảnh địa điểm minh họa — chưa xác minh chỗ ở”. Pipeline listing_photos là nguồn duy nhất; không hardcode override ở từng màn. Import mặc định dry-run; apply phải chỉ định phạm vi và môi trường, lưu mapping cũ; không xóa ảnh của bản ghi đã được người dùng chỉnh khác dự kiến.

## Thị giác

Tokens dùng chung: nền sáng, chữ slate, teal cho thao tác chính, đỏ cho lỗi, amber cho đang chờ. Card bo góc, thứ bậc tiêu đề/giá/phí, vùng bấm >=44px, form cuộn được khi mở bàn phím. Gallery lỗi giữ khung trung tính. Label tiếng Việt trên các luồng chính, không sửa dữ liệu mô tả của host thành claim mới.
