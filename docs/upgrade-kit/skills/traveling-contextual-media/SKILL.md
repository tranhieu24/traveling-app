---
name: traveling-contextual-media
description: Kiểm kê, tìm nguồn và thay ảnh URL cho listing/destination của Traveling App bằng ảnh đúng ngữ cảnh, có provenance và nhãn minh họa khi cần. Dùng cho cover/gallery/ảnh địa điểm; không dùng để tạo ảnh AI rồi mô tả là ảnh thật của cơ sở lưu trú.
---

# Ảnh chỗ ở và địa điểm đúng ngữ cảnh

Phạm vi chung ở [prompt nâng cấp](../../../TRAVELING_APP_UPGRADE_PROMPT.md). Mục tiêu là giúp khách hiểu đúng thứ đang được giới thiệu, đồng thời có bộ ảnh nhất quán về ánh sáng, tỷ lệ và chất lượng.

## Kiểm kê trước khi chọn ảnh

Đọc `database/seed.sql`, dữ liệu local được phép truy cập, API listing và các đường đi cover/gallery. Seed hiện có URL dạng Picsum theo ID; đây không phải bằng chứng ảnh chỗ ở thực tế. Không suy ra database đang chạy vẫn giống seed.

Với mỗi listing/destination, ghi ID, tên, địa lý, loại chỗ ở, tiện nghi được công bố, URL hiện tại, các màn sử dụng và trạng thái dữ liệu thật/demo. Lấy đúng ID từ dữ liệu; không ghép theo tiêu đề không duy nhất.

Phân loại ảnh:

| Loại | Cách sử dụng |
| --- | --- |
| Ảnh thực tế được chủ cơ sở cung cấp hoặc xác nhận | Có thể trình bày là ảnh cơ sở nếu đã xác minh liên kết và quyền sử dụng |
| Ảnh địa điểm có nguồn xác nhận địa lý | Dùng cho destination/editorial; không tự biến thành ảnh phòng của listing |
| Ảnh stock phù hợp phong cách nhưng chưa xác minh property | Chỉ dùng cho dữ liệu demo và ghi rõ ảnh minh họa |
| Ảnh AI | Chỉ dùng cho minh họa ngoài bằng chứng listing, khi người dùng yêu cầu; gắn nhãn thích hợp |

Tên như “Sapa Valley Homestay” trong seed có thể là tên giả lập. Không tìm một homestay bất kỳ ở Sa Pa rồi khẳng định đó là căn được bán trong app.

## Tìm nguồn và kiểm tra

- Dùng công cụ web/image search nếu có; ưu tiên tài sản của chủ cơ sở, nguồn chính thức có quyền dùng hoặc thư viện có điều khoản phù hợp. Kiểm tra điều khoản hiện hành lúc thực hiện.
- Trang tìm kiếm và snippet không đủ làm nguồn cuối cùng. Mở trang ảnh, xác minh ngữ cảnh và quyền sử dụng; lưu URL trang nguồn và URL file riêng biệt.
- Không dùng random endpoint, URL theo keyword trả ảnh ngẫu nhiên, URL tự đoán hoặc ảnh có watermark.
- Không sao chép ảnh từ nền tảng đặt phòng khác khi chưa xác định quyền sử dụng. Không giả định một ảnh truy cập công khai có nghĩa là được phép tái sử dụng.
- Nếu gọi qua API ảnh, tuân thủ quy tắc attribution, hotlink/download của nhà cung cấp. Không tự tải lại hoặc chuyển sang CDN riêng nếu điều khoản nguồn không cho phép.
- Đọc ảnh thực tế để kiểm tra phòng/địa lý/phong cách. HTTP 200 chỉ chứng minh tải được file, không chứng minh đúng ngữ cảnh.
- Không dùng nhiều ảnh phòng từ các cơ sở khác nhau để tạo cảm giác là cùng một property. Với demo, cả bộ vẫn cần đồng nhất và có nhãn minh họa.

## Catalog bắt buộc

Tạo `docs/media-catalog.json`; mỗi ảnh có các trường sau, dùng null hoặc trạng thái chưa xác minh khi thiếu bằng chứng:

- `targetType`, `targetId`, `targetTitle`, `city`, `country`, `propertyType`.
- `sourcePageUrl`, `imageUrl`, `provider`, `creator`, `licenseName`, `licenseUrl`, `attributionText`.
- `contextLevel`: `verified_property`, `verified_destination` hoặc `illustrative`.
- `contextEvidence`: lý do và bằng chứng liên kết ảnh với đối tượng; không dùng mô tả của AI làm bằng chứng độc lập.
- `usageStatus`: `approved`, `needs_review`, `rejected`; lý do nếu chưa dùng được.
- `role`: `cover`, `bedroom`, `bathroom`, `common_area`, `exterior`, `view`, `destination` hoặc vai trò phù hợp khác.
- `caption`, `altText`, `displayOrder`, `isCover`, `width`, `height`, `checkedAt`.

Catalog không chứa token, URL ký hết hạn hoặc thông tin riêng của chủ ảnh. Chỉ đưa ảnh approved vào bản cập nhật; phân biệt approved cho demo minh họa với xác minh property.

## Chất lượng thị giác và cập nhật dữ liệu

- Cover nên có một chủ thể rõ, ưu tiên khung ngang khoảng 3:2 và độ rộng ít nhất 1200px khi nguồn cho phép. Đây là mục tiêu chất lượng, không lý do để dùng ảnh sai ngữ cảnh.
- Mục tiêu 4–6 ảnh hữu ích/listing khi có nguồn: mặt ngoài hoặc tổng thể, phòng ngủ, phòng tắm, không gian chung và view/tiện nghi nổi bật. Không dùng ảnh sai để lấp đủ số lượng.
- Nếu chỉ có ảnh xác minh cho một phần gallery, báo rõ độ phủ; không coi thiếu ảnh là đã đạt yêu cầu.
- Giữ đúng một cover, thứ tự ổn định, caption và alt text mô tả điều nhìn thấy. Không thêm claim như “hồ bơi riêng” nếu chỉ thấy bể bơi hoặc chưa xác minh quyền sử dụng.
- Kiểm tra crop trên card nhỏ, gallery lớn và điện thoại. Có loading/fallback trung tính; không âm thầm đổi sang một căn nhà khác khi URL lỗi.
- Tái sử dụng pipeline `listing_photos` và API admin hiện có nếu đủ; không thay URL bằng hardcode rải ở từng màn.
- Script áp ảnh cần dry-run mặc định, danh sách ID/URL trước-sau và điều kiện chỉ sửa bản ghi dự kiến. Áp dụng có transaction, có cách khôi phục mapping cũ và chạy lại không nhân đôi ảnh.
- Không chạy lại seed legacy hoặc xóa toàn bộ ảnh để cập nhật một tập listing. Với dữ liệu dùng chung/live, bản dry-run là đầu ra để người có quyền quyết định áp dụng.

## Nghiệm thu

Đối chiếu Home/Search, ListingDetail, Favorites, OrderReview, Bookings và admin cho cùng ID. Kiểm tra file ảnh tải được với đúng content type, URL ổn định, không hết hạn nhanh, không trùng lặp vô nghĩa và đúng nhãn thực tế/minh họa.

Báo cáo số listing đã kiểm tra, đã thay, đã xác minh property, chỉ có ảnh minh họa và còn thiếu nguồn. Không tuyên bố toàn bộ catalog là ảnh thật khi chưa có bằng chứng cho từng property.
