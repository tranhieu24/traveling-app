# Kiểm kê ảnh property thật cho bộ 50 chỗ ở

Cập nhật: 04/11/2026. Mục tiêu của bảng này là thay yêu cầu ảnh minh họa bằng ảnh chụp đúng cơ sở/hạng phòng. Không coi mục đích học tập là giấy phép tái sử dụng; cột quyền phải được chốt trước khi đưa ảnh vào migration dùng chung.

## Trạng thái migration catalog

`database/migrations/009_real_homestay_catalog.sql` tạo 35 listing ứng viên từ các nguồn bên dưới và đã được chủ project xác nhận chạy thành công trên Supabase ngày 04/11/2026. Các listing đều `is_active = false`; giá, phí, tọa độ và sức chứa là dữ liệu catalog nháp cần admin xác minh. Migration chỉ lưu URL trang nguồn và kết quả kiểm tra vào `listing_source_audits`, không chèn URL ảnh chưa được duyệt. Agent chưa tự đối soát database đích.

`database/migrations/010_listing_media_publish_guard.sql` đã được chuẩn bị nhưng chưa áp dụng. Sau khi áp dụng, một listing có bản ghi provenance chỉ được bật khi audit là `approved` và có đúng một cover với `media_context.usageStatus = approved`, `contextLevel = verified_property`, đúng `targetId` và đủ thông tin nguồn/giấy phép/attribution. Điều kiện này tiếp tục được kiểm tra khi sửa hoặc xóa audit/ảnh.

| Điểm đến | Property/hạng phòng nguồn | Trang chính thức hoặc nguồn chủ quản | Bằng chứng ảnh đúng property | Trạng thái quyền |
| --- | --- | --- | --- | --- |
| Sa Pa | Sapa Hmong Bungalow: Bungalow 01, 02, Premium | https://sapahmongbungalow.com/ | Trang Accommodation gắn tên hạng phòng với `/files/images/gallery/...` | `needs_review` — website ghi bản quyền |
| Huế | Huế Mơ Homestay: phòng 101, 201 | https://huemohomestay.com/en/ | Gallery đặt tên P101/P201 và ảnh cùng mã phòng | `needs_review` |
| Quy Nhơn | An House: Standard, Double Sea View, Quad Sea View | https://anhousequynhon.vn/index.php/room/ | Trang phòng chính thức gắn mô tả và ảnh từng hạng | `needs_review` |
| Phú Quốc | Phu Quoc Homestay: Private, Family | https://phuquoc-homestay.com/rooms/ | URL ảnh có tên `private-room.webp`, `family-room.webp` trên trang phòng | `needs_review` |
| Mộc Châu | Mộc Châu Eco Garden: Bungalow, VIP, Family | https://mocchauecogarden.com/en/ | Trang Accommodation và media WordPress của property | `needs_review` |
| Ninh Bình | Hang Múa Village Homestay: Twin, Triple, Family | https://www.hangmuavillagehomestay.com/en | Trang chính thức hiển thị ảnh cạnh từng hạng phòng | `needs_review`; URL Google Sites cần kiểm tra độ ổn định |
| Phong Nha | An An Homestay: Double Garden, Double Mountain | https://ananhomestayphongnha.com/ | Tên file ảnh chứa đúng hạng phòng/property | `needs_review` |
| Cát Bà | An Homestay Cat Ba: hai phòng private | https://anhomestay-catba.com/rooms/ | Trang Rooms của chính homestay có gallery property | `needs_review`; cần trích URL ảnh ổn định |
| Đà Lạt | Đạ Lạch Homestay nguyên căn | https://homestay.dalachfarmstay.vn/ | Website chính thức mô tả 6 phòng và gallery property | `needs_review`; ảnh tải qua script nên cần URL gốc |
| Đà Lạt | Feliz Dalat Homestay | https://www.felizdalathomestay.com/gallery | Gallery chính thức và địa chỉ property | `needs_review`; cần URL ảnh gốc |
| Hội An | Phoenix Homestay: Superior, Deluxe | https://www.phoenixhomestayhoian.com/ | `images/sup.jpg` và `images/deluxe.jpg` nằm trên website property | `needs_review` |
| Hà Giang | Ha Giang Historic House: Double, Twin | https://hagianghistorichouse.com/stay | Trang Stay gắn hạng phòng với media trong `uploads/update-stay` | `needs_review` |
| Côn Đảo | Côn Đảo House: Double, Family | https://condao.com.vn/vi/store/dia-diem-luu-tru/Con-Dao-House.html | Trang du lịch chủ quản có 11 ảnh và mô tả đúng property | `needs_review`; cần xác nhận quyền từ cơ sở/chủ quản |
| Mai Châu | Meadow Mai Chau Homestay: Double/Family | https://meadowmaichauhomestay.com/ | Website property và media WordPress cùng domain | `needs_review` |
| Cao Bằng | Cốm Homestay/Bản Giốc | https://comhomestay.com/ | Website hệ thống chính thức, có hạng VIP | `blocked` — scraper hiện trả media khác domain; chưa chọn ảnh phòng |
| Vũng Tàu | VungTau Stay: Studio The Sóng | https://vungtaustay.vn/ | Trang công bố ảnh chụp tại căn và file `/uploads/apartments/demo/...` | `needs_review`; cần xác minh file không phải fixture minh họa |
| Chiang Mai | VANA Homestay: Misty Trail, Suite Double | https://vanahomestay.com/ | Trang Rooms chính thức và ảnh `/img/*.webp` | `needs_review` |
| Bali | Middle House Bali: Premier/Garden/Pool rooms | https://middlehouse.id/ | Website chính thức liệt kê sáu phòng | `blocked` — chưa trích được URL ảnh ổn định |

## Quy tắc áp dụng

- Chỉ tạo listing khi tên, mô tả, sức chứa và ảnh cùng trỏ tới đúng hạng phòng/property.
- Không dùng ảnh phong cảnh điểm đến thay ảnh phòng; không dùng ảnh Booking/Airbnb/Google Images.
- `verified_property` chỉ mô tả việc xác minh đúng property, không đồng nghĩa có giấy phép sao chép.
- Ảnh `needs_review` chưa được đưa vào migration ảnh dùng chung cho tới khi có điều khoản/đồng ý phù hợp. Có thể dùng khi chủ sở hữu cấp phép hoặc thay bằng ảnh do nhóm tự chụp.
- Migration listing phải additive, ID cố định, `ON CONFLICT DO NOTHING`; không cập nhật/xóa 15 listing cũ.
