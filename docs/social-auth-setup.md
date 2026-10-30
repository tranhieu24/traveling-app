# Google và Facebook OAuth — Traveling App

Đã triển khai ở bản `C:\Users\dangt\Downloads\traveling-app`, frontend Expo SDK 58.
Google/Facebook dùng Supabase OAuth thật với S256 PKCE. Cùng một luồng dùng cho
đăng nhập và tạo tài khoản. Apple và Phone hiện disabled, ghi rõ Coming soon.

Không thay đổi backend, database, migration, seed hay cấu hình service-role.
Thay đổi có sẵn ở `traveling-app-backend/package.json` được giữ nguyên.

## Cấu hình public frontend

App tiếp tục đọc URL và publishable key sẵn có trong `app.json → expo.extra`.
Có thể ghi đè bằng file `traveling-app-mobile/.env`, tham khảo `.env.example`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:5000/api/v1
```

Chỉ điền URL dự án và anon/publishable key. Không chép backend/.env vào mobile.
Không cần DATABASE_URL, service-role, Google Client Secret hoặc Facebook App Secret
ở frontend. File .env được Git ignore. Khởi động lại Metro sau khi đổi biến Expo public.

Nếu không đặt API_URL: web dùng localhost:5000/api/v1; native giữ IP LAN hiện có
của dự án. Điện thoại và máy chạy backend cần truy cập được cùng địa chỉ.
Bản backend thực tế mount /api/v1, nên hồ sơ dùng GET /api/v1/auth/me, không đổi
sang /api/auth/me trong tài liệu đầu vào. Interceptor gửi Bearer token hiện tại.

## Callback

- Scheme app: `travelingapp`.
- Native development build/APK: `travelingapp://auth/callback`.
- Web: `window.location.origin + /auth/callback`, ví dụ
  `http://localhost:8082/auth/callback`.
- Kiểm thử web tự động lần này dùng `http://localhost:8083/auth/callback`; final production web fixture used
  `http://localhost:8084/auth/callback`.

Supabase → Authentication → URL Configuration cần cho phép URL của môi trường
đang dùng. Native URL bạn đã cấu hình không thay thế callback HTTP của web.
Thêm đúng cổng web, tên miền HTTPS triển khai và cả 127.0.0.1 nếu sử dụng.
Không sửa Site URL native hiện tại chỉ để thử web; thêm web vào Redirect URLs.

Google/Meta console vẫn nhận callback HTTPS do Supabase cung cấp, không phải
custom scheme app. Việc cấu hình này thuộc dashboard của chủ dự án.

Web dùng chuyển trang trong cùng cửa sổ, không mở popup. Vì vậy không cần
maybeCompleteAuthSession() trên web. Callback được làm sạch khỏi thanh địa chỉ
trước khi gọi API và không được đưa vào navigation params.
Native dùng openAuthSessionAsync(). Hủy/đóng trình duyệt trả về màn hình trước,
không tạo hồ sơ giả hay báo lỗi hệ thống.

## Session và quyền truy cập

1. Supabase đổi authorization code lấy access/refresh session bằng SDK. Callback
   dạng token cũ cũng được chuyển cho setSession() của Supabase.
2. Listener và kết quả đăng nhập dùng chung một tác vụ đồng bộ, tránh gọi
   /auth/me hai lần cho cùng token.
3. Lưu access_token vào traveling_auth_token trước khi API chạy. API client chờ
   các lần ghi/xóa token đang chờ, bao gồm TOKEN_REFRESHED và SIGNED_OUT.
4. Chỉ reset vào MainTabs sau khi backend trả hồ sơ hợp lệ, cùng ID của session.
   Role/ID không được tạo hoặc tự nâng quyền từ frontend.
5. Supabase quản lý refresh token trong session storage riêng của SDK. Native
   giữ SecureStore, chia session lớn thành các phần mã hóa để tránh giới hạn
   kích thước trên iOS cũ. Web giữ localStorage như thiết kế có sẵn.
6. Mở lại app dùng getSession() của Supabase, cho phép refresh trước khi đọc
   hồ sơ. Một access token rời không được coi là phiên hợp lệ.
7. Logout gọi Supabase local signOut, xóa API token, user/token state và React
   Query cache. Kết quả profile cũ về muộn không thể khôi phục user sau logout.
8. PROFILE_NOT_FOUND, tài khoản blocked và provider không cung cấp email có
   thông báo riêng. Frontend không ghi public.users.
9. Nếu backend lỗi sau khi đổi code, Try again dùng lại session đã đổi, không
   đổi authorization code một lần nữa. Không in token/refresh token/URL callback
   vào console.

Luồng đăng nhập email/password, đăng ký có xác nhận email, đổi mật khẩu và
điều hướng admin theo hồ sơ backend được giữ lại.

## Chạy web và development build

Web:

```powershell
cd C:\Users\dangt\Downloads\traveling-app\traveling-app-mobile
npm install
npx expo start --web --port 8082 --max-workers 2
```

Thêm callback cổng 8082 trong Supabase rồi thử Google/Facebook bằng tài khoản
được phép trong Google/Meta khi provider đang ở chế độ thử nghiệm.

Android development build trên máy đã cài Android Studio, Android SDK, JDK phù
hợp và bật USB debugging (hoặc chạy Android emulator):

```powershell
cd C:\Users\dangt\Downloads\traveling-app\traveling-app-mobile
npm install
npx expo run:android --device
```

Lần đầu lệnh tạo native project và cài bản debug development client. Các lần
sau có thể chạy `npx expo start --dev-client`. Cần rebuild khi đổi scheme hay
thêm thư viện native. Android package và iOS bundle ID: com.travelingapp.mobile.

iOS local build cần macOS/Xcode; trên Windows có thể dùng EAS development build
với tài khoản/cấu hình ký phù hợp. Chưa tạo build EAS hay tải mã nguồn lên EAS
trong nhiệm vụ này. Không dùng Expo Go cho custom-scheme OAuth này.
Expo Go SDK 58 trên iPhone không chạy được dự án SDK 51; chưa nâng SDK trong
thay đổi OAuth. Dùng development client được build từ chính dự án.

## Package đã thêm

| Package | Phiên bản tương thích SDK 51 | Mục đích |
| --- | --- | --- |
| expo-web-browser | ~58.0.7 | Trình duyệt đăng nhập và callback native |
| expo-crypto | ~58.0.7 | Random an toàn và SHA-256 cho PKCE trên Hermes |
| react-native-url-polyfill | ^2.0.0 | URL và URLSearchParams native |
| fast-text-encoding | ^1.0.6 | TextEncoder cho PKCE trên Hermes |
| react-native-svg | 15.16.0 | Match Expo SDK 58 / React Native 0.88 native codegen |
| expo-dev-client | ~58.0.17 | Bản development client hỗ trợ scheme của app |

Không cần expo-auth-session vì app dùng callback chính xác từ cấu hình chung
và Supabase tự quản lý PKCE. Không cài native SDK riêng của Google/Facebook.

## File đã thay đổi/thêm

Trong traveling-app-mobile:

- App.tsx, app.json, package.json, package-lock.json, .env.example.
- src/config/auth.ts.
- src/context/AuthContext.tsx.
- src/components/common/SocialSignInButtons.tsx.
- src/navigation/linking.ts, src/navigation/AppNavigator.tsx.
- src/screens/LoginScreen.tsx, src/screens/CreateAccountScreen.tsx,
  src/screens/AuthCallbackScreen.tsx, src/screens/SplashScreen.tsx.
- src/services/supabase.ts, src/services/authCrypto.ts,
  src/services/authSession.ts, src/services/socialAuth.ts,
  src/services/apiClient.ts.
- src/utils/storage.ts, src/utils/secureChunks.ts, src/utils/authToken.ts.
- src/types/index.ts, scripts/auth.test.cjs.

Ngoài frontend: docs/social-auth-setup.md là hướng dẫn này.

## Kết quả xác minh và giới hạn

Ngày 30/10/2026, kiểm tra public settings của Supabase trả Google/Facebook/email
enabled; Apple/Phone disabled. Authorize endpoint thật trả HTTP 302 tới
accounts.google.com và www.facebook.com. Đây chỉ xác nhận mở luồng consent,
không chứng minh đã đăng nhập thành công bằng tài khoản thật.

- TypeScript: passed.
- Expo public config: scheme travelingapp, Android/iOS app ID resolved correctly.
- Android, iOS (Hermes bytecode) and web bundle export: passed.
- npm run test:auth: 29 passed.
- npm run test:admin: 8 passed.
- Web Chrome (development and final production bundle): các ca giả lập qua SDK Supabase thật, HTTP auth/backend được
  chặn bằng fixture; không tạo tài khoản thật hoặc ghi dữ liệu thật.
- Google/Facebook mới và đã tồn tại: passed với fixture, từ cả Login và CreateAccount.
- Hủy, provider error, thiếu email, PROFILE_NOT_FOUND: passed với fixture.
- Hồ sơ lỗi mạng rồi thử lại: passed, chỉ đổi code một lần.
- Email/password login và đăng ký cần xác nhận email: passed với fixture.
- Reload, refresh token hết hạn và logout: passed với fixture.
- Double click, callback lặp, listener unsubscribe, response muộn sau logout,
  thứ tự lưu token/API, secure session lớn: passed trong automated tests.
- Chưa thử Google hay Facebook bằng tài khoản thật. Cần người dùng tự hoàn
  tất consent với tài khoản được phép, kiểm tra trigger hồ sơ và backend thật.
- Chưa chạy APK/development build trên thiết bị: máy hiện chưa có Android SDK.
  Export bundle Android/iOS không tương đương build/chạy APK.

Apple và Phone OTP tiếp tục Coming soon. Không gọi Apple provider hay OTP giả.

Tham khảo chính thức:
[Supabase native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking),
[Supabase React Native session](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[Expo OAuth](https://docs.expo.dev/guides/authentication/).

## OAuth startup recovery

OAuth URL preparation and web navigation each have a 15-second deadline.
If the SDK stalls or browser navigation is blocked, loading ends, buttons are
re-enabled, and a safe error explains how to retry. A late SDK URL result cannot
navigate after its attempt has timed out. The deadline stops when leaving for
the provider, so users can take time to sign in. Browser Back clears loading.
The email login spinner now only appears for an email/password submission.

Regression verification: TypeScript passed; 29 auth tests passed. Chrome fixture
checks passed for blocked navigation recovery, Google retry, stalled PKCE startup
recovery, and Facebook retry. These remain mocked flows, not live account consent.
After updating an already spinning page, reload it fully once (Ctrl+Shift+R).

## Live provider entry and callback configuration check (2026-10-30)

Fresh isolated Chrome profiles opened the actual Google sign-in identifier page
from the app button on localhost ports 8081, 8082 and 8083. No Google account was
entered and no successful live consent/session was claimed.

A provider-denial callback with its valid issued state returned access_denied
and the supplied cancellation description, but Supabase redirected to
travelingapp://auth/callback for all three requested web callback addresses.
The hosted project is therefore currently returning these web flows to a native
address. The owner should allow the exact web callback in Supabase Authentication
> URL Configuration > Redirect URLs, starting with:

    http://localhost:8082/auth/callback

Keep travelingapp://auth/callback for native builds. Save the dashboard change
and retest from a freshly reloaded localhost:8082/login (or a fresh private
browser window). No Supabase dashboard configuration was changed by this check.
If the requested web address is still not returned, inspect any configured
external redirect override with the project owner. This configuration finding
does not prove the exact browser-side reason navigation failed on the user's
existing Chrome profile; that specific failure was not reproduced in clean Chrome.

SDK upgrade and iPhone/Expo CLI account steps: [expo-sdk58-upgrade.md](expo-sdk58-upgrade.md).
