# Nâng Traveling App lên Expo SDK 58

Đã nâng bản Downloads từ SDK 51 lên SDK 58 để khớp Expo Go trên iPhone.
Thực hiện ngày 30/10/2026. Backend và database không được sửa trong bước nâng SDK.

## Phiên bản

| Thành phần | Trước | Hiện tại |
| --- | --- | --- |
| Expo | 51 | ~58.0.21 |
| React / React DOM | 18.2 | 19.3.0 |
| React Native | 0.74.5 | 0.88.1 |
| React Navigation | 6 | 7 |
| NativeWind | 2 | 4.2.7 |
| Tailwind CSS | 3.3 | 3.4 |
| TypeScript | 5.3 | 6.0 |

Các package Expo, Screens, Safe Area, SVG, Reanimated và Worklets được chọn theo
bundledNativeModules của Expo 58; package-lock.json đã cập nhật. Dùng Node phù hợp
engines trong package.json; máy kiểm tra dùng Node 24.13.0.

NativeWind chuyển sang Babel preset, Metro withNativeWind và global.css.
Các class giao diện có sẵn được giữ lại. Ref ScrollView/TextInput chuyển sang
React.ComponentRef để hợp React Native 0.88. Callback refresh và footer danh sách
được điều chỉnh theo kiểu dữ liệu mới. Tải hóa đơn và Excel native dùng
expo-file-system/legacy để giữ API download hiện có.

## Chạy trên iPhone với Expo Go

1. Sau khi lấy code mới, chạy npm ci trong traveling-app-mobile.
2. Expo Go trên iPhone cần hỗ trợ SDK 58.
3. Đăng nhập cùng tài khoản Expo trên máy tính và Expo Go. Tài khoản Expo là tài
   khoản công cụ phát triển, không phải tài khoản đăng nhập Traveling App.
4. Chạy npm start, rồi quét QR mới. Điện thoại và máy tính cùng Wi-Fi.
5. Khi Expo Go yêu cầu quyền truy cập mạng cục bộ, cho phép để truy cập Metro/API.

```cmd
cd /d C:\Users\dangt\Downloads\traveling-app\traveling-app-mobile
npx expo login
npx expo whoami
npm start
```

Expo CLI 58 mặc định dùng đăng nhập bằng trình duyệt. Cần hoàn tất đăng nhập
trang Expo rồi kiểm tra whoami. Nếu có mật khẩu tài khoản Expo và muốn nhập
trực tiếp trong terminal, dùng npx expo login --no-browser. Không đưa mật khẩu
vào lệnh hoặc file cấu hình.

npm start dùng expo start --go --lan. Nếu Metro nhận nhầm địa chỉ 127.0.0.1,
đặt REACT_NATIVE_PACKAGER_HOSTNAME bằng IPv4 Wi-Fi hiện tại rồi chạy lại:

```cmd
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.251
npm start
```

Địa chỉ trên là IP máy kiểm tra tại thời điểm nâng cấp; thay nếu đổi mạng/IP.
Development build riêng dùng npm run start:dev-client.

## Kết nối backend trên điện thoại

API dev native tự nhận hostname từ Expo hostUri, giữ port 5000 và prefix /api/v1.
Ví dụ Metro 192.168.1.251:8081 thì API là http://192.168.1.251:5000/api/v1.
Web dùng hostname đang mở trang. Cách này tránh IP Wi-Fi cũ bị ghi cứng trong API client.

EXPO_PUBLIC_API_URL luôn có ưu tiên cao nhất. Cấu hình extra.apiUrl vẫn là dự
phòng cho native/production. Với Metro tunnel, cần tự cung cấp backend URL truy
cập được; tunnel Metro không chuyển tiếp port backend. Không thay cấu hình
backend hay thêm secret để giải quyết kết nối này.

## OAuth và Expo Go

Email/password, đăng ký và khôi phục phiên vẫn được kiểm tra.
Google/Facebook native với callback travelingapp://auth/callback vẫn cần bản
development/production đã cài. Expo Go không nhận scheme riêng của ứng dụng.
Web vẫn cần callback HTTP đúng cổng trong Supabase Redirect URLs.
Apple và Phone tiếp tục Coming soon.

Nâng SDK giúp vượt lỗi phiên bản Expo Go, không tự bật provider hay thay cấu hình
Google/Meta/Supabase. Người dùng phải hoàn tất consent thật để xác nhận OAuth
đầu cuối; các ca hồi quy bên dưới dùng fixture, không tạo tài khoản thật.

## Kiểm tra

- TypeScript: passed.
- Expo Doctor: 20/20 passed.
- Auth tests: 29 passed.
- Admin tests: 8 passed.
- API location/import tests: 7 passed.
- Export bundle iOS/Android (Hermes) và web: passed.
- Bundle iOS ở chế độ dev mà Expo Go dùng: HTTP 200, đã biên dịch thành công.
- Chrome với API giả lập: OAuth/email/session/logout, phân quyền/admin,
  responsive 320px, phòng/tiện nghi/review, yêu thích, chọn ngày/khách, báo giá
  đặt phòng, trạng thái thiếu dữ liệu và bộ lọc tìm kiếm đều passed.
- Chưa xác nhận chạy trên iPhone vật lý. Bước này cần người dùng đăng nhập cùng
  tài khoản Expo và quét QR trên thiết bị.
- Chưa build IPA/APK hoặc đăng nhập Google/Facebook bằng tài khoản thật trong
  bước nâng cấp.

Đã giữ bản sao source trước nâng cấp ngoài repository để có thể đối chiếu.
Các thay đổi OAuth đang có được giữ lại, không reset working tree. Thành viên
khác trong nhóm khi pull cần chạy npm ci và dùng client phù hợp SDK 58.

Tham khảo:
[Expo nâng SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/),
[Expo Go trên thiết bị](https://docs.expo.dev/get-started/start-developing/),
[NativeWind](https://www.nativewind.dev/docs/getting-started/installation),
[React Navigation 7](https://reactnavigation.org/docs/upgrading-from-6.x/).

## Native startup fix

The iPhone runtime exposes window without a browser location. API client setup
now reads window.location only on web, and loads the existing URL polyfill before
resolving the native Metro hostname. Regression tests import the actual API
client with iOS/Android window objects whose location getter throws, plus browser
and non-browser web cases. Reload Expo Go after taking this fix to clear the
startup exception from the previous bundle. ImageBackground deprecation is a
separate library warning, not the hostname startup error.


## Native button layout regression

NativeWind v4 processes Pressable style callbacks differently on native and web.
On iOS, the callback styles were lost: country/email/provider buttons stacked
vertically, borders disappeared, and the white phone-button label was invisible.
Keep `cssInterop={false}` on Pressables that use a React Native style callback
and no className. This preserves both their StyleSheet layout and pressed feedback.
ClassName-based buttons continue using NativeWind as before.

Run `npm run test:native-ui` to exercise the installed NativeWind **native**
runtime against the actual account and login components. The four regression
checks failed before the fix and pass after it. Native host primitives are stubbed
for this Node test; it does not replace checking the UI on a physical iPhone.

References: [NativeWind callback-style issue](https://github.com/nativewind/nativewind/issues/1105),
[React Native Pressable style API](https://reactnative.dev/docs/pressable#style).
