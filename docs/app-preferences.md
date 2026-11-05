# Ngôn ngữ và giao diện

Mở **Tài khoản → Cài đặt và thông báo** để chọn Việt/Anh và Sáng/Tối/Theo thiết bị.
Lựa chọn lưu bằng AsyncStorage dưới key `traveling_ui_preferences_v1`, độc lập
với phiên đăng nhập. Không cần đăng nhập để đổi, đăng xuất không xóa lựa chọn.

Provider theo dõi Appearance và cập nhật NativeWind, NavigationContainer cùng
StatusBar. Các màn hình đăng ký thay đổi qua `useUiPreferences()`; không dùng
key để dựng lại navigator nên giữ nguyên route và dữ liệu biểu mẫu. Trên web,
ngôn ngữ và color-scheme cũng được đặt trên phần tử HTML gốc.

`preferences/ui.ts` chuyển bảng màu cho StyleSheet/inline styles và bổ sung
dark variants cho các lớp NativeWind. Không đảo màu ảnh. Chữ trắng của nút,
trạng thái lỗi và màu nhấn được xử lý riêng. Tailwind dùng `darkMode: 'class'`;
khởi động lại Expo với `npm start -- --clear` sau khi cập nhật cấu hình.

`preferences/translations.ts` chứa bảng dịch UI và một số mẫu có biến số.
Giá và ngày hiển thị theo locale; số tiền gốc, tiền tệ và điều kiện đặt phòng
không thay đổi. Tên chỗ ở, nội dung đánh giá và tin nhắn không dịch tự động.
Thông báo hệ thống nhận `Accept-Language: vi|en`, cache danh sách theo ngôn ngữ
và tài khoản. Các nội dung từ máy chủ/nguồn ngoài chưa có bản dịch được giữ nguyên.

Kiểm tra: `npm run test:preferences`. Các tình huống gồm phục hồi lựa chọn,
ghi nối tiếp khi bấm nhanh, lựa chọn trong lúc đọc storage, theo hệ thống,
storage lỗi, đổi ngôn ngữ và bảng màu. Kiểm tra trình duyệt xác minh đổi ngay,
giữ lựa chọn sau reload và giữ bản nháp đăng nhập khi hệ thống đổi sáng/tối.
