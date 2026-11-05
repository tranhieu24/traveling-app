# Traveling App

Ứng dụng tìm kiếm và đặt chỗ ở đa nền tảng, giúp khách du lịch quản lý chuyến đi và quản trị viên vận hành dịch vụ lưu trú.

![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)
![React Native 0.88](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)

## Demo

Chưa có đường dẫn demo công khai hoặc ảnh chụp màn hình trong README.

> **Vị trí dành cho ảnh/GIF:** Trang khám phá · Chi tiết chỗ ở · Quy trình đặt phòng · Trang quản trị.

<!-- Khi có ảnh, lưu tại docs/images/ và thay dòng bên dưới bằng ảnh thực tế:
![Giao diện Traveling App](docs/images/traveling-app-demo.png)
-->

Có thể chạy bản web cục bộ theo [hướng dẫn cài đặt](#cài-đặt-và-chạy). Các màn hình nên dùng khi giới thiệu dự án: tìm chỗ ở theo ngày, xem chi tiết, quản lý đặt phòng và Admin Portal.

## Tính năng chính

- **Khám phá chỗ ở:** tìm theo điểm đến, ngày lưu trú, số khách, khoảng giá và tiện nghi; xem bộ ảnh, đánh giá và lưu yêu thích. Cho phép duyệt danh mục khi chưa đăng nhập.
- **Đặt phòng và quản lý chuyến đi:** kiểm tra phòng trống, áp dụng coupon, theo dõi trạng thái, xem hướng dẫn nhận phòng, hủy đặt phòng và tải hóa đơn PDF. Hỗ trợ quy trình đặt cọc, thanh toán phần còn lại và hoàn tiền trong chế độ thử nghiệm.
- **Tài khoản và cá nhân hóa:** Supabase Auth với email/mật khẩu, Google/Facebook OAuth; giao diện Việt/Anh và chế độ sáng, tối hoặc theo thiết bị.
- **Hỗ trợ và thông báo:** gửi yêu cầu hỗ trợ, trao đổi theo yêu cầu, nhận thông báo trong ứng dụng và đánh dấu đã đọc.
- **Trợ lý AI:** hỗ trợ tìm chỗ ở bằng ngôn ngữ tự nhiên, hỏi đáp từ FAQ và giải thích thông tin đặt phòng. Các gợi ý được đối chiếu với dữ liệu backend; AI không tự tạo đơn hoặc thanh toán.
- **Trang quản trị:** quản lý chỗ ở, ảnh, danh mục, khách hàng, đặt phòng, coupon và hoàn tiền; xem báo cáo doanh thu thử nghiệm và xuất Excel.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Ứng dụng Android, iOS và web | Expo SDK 58, React 19.3, React Native 0.88, React Native Web |
| Giao diện và điều hướng | NativeWind 4, Tailwind CSS 3, React Navigation 7 |
| Trạng thái và giao tiếp API | TanStack Query 5, Zustand 4, Axios |
| Backend REST API | Node.js, Express 4, TypeScript 5, Zod |
| Database và xác thực | PostgreSQL, driver `pg`, Supabase Auth, Supabase Storage |
| Thanh toán | Stripe test; chế độ mô phỏng dành cho development/test |
| AI tùy chọn | Adapter OpenAI hoặc Gemini, xử lý tại backend |
| Tài liệu và kiểm thử | OpenAPI, Postman, Node.js test runner, PostgreSQL nhúng |

Frontend dùng TypeScript 6 theo cấu hình riêng. Hai ứng dụng có `package.json` và `package-lock.json` độc lập; cài dependencies trong từng thư mục.

## Yêu cầu hệ thống

| Yêu cầu | Chi tiết |
| --- | --- |
| Node.js | Theo `engines` của mobile: `^22.13.0 \|\| ^24.3.0 \|\| >=26.0.0` |
| npm và Git | npm đi kèm phiên bản Node.js phù hợp; Git để clone repository |
| Supabase | Một project để dùng PostgreSQL và Auth; backend và frontend phải trỏ cùng project |
| PostgreSQL | Baseline khai báo PostgreSQL 15+; dùng Supabase hosted thì không cần cài server database trên máy |
| Chạy web | Trình duyệt có JavaScript; đây là cách bắt đầu thuận tiện để xem giao diện |
| Chạy native | Expo Go tương thích SDK 58 cho các luồng được hỗ trợ; development build cho OAuth và Stripe native |
| Build native cục bộ | Android cần Android SDK/JDK và thiết bị hoặc emulator; iOS cần macOS/Xcode |

## Cài đặt và chạy

Các lệnh dưới đây dùng **PowerShell**, bắt đầu từ thư mục bạn muốn lưu dự án.

### 1. Clone repository

```powershell
git clone https://github.com/tranhieu24/traveling-app.git
cd traveling-app
```

### 2. Cài dependencies và cấu hình backend

```powershell
cd traveling-app-backend
npm ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Điền cấu hình của bạn vào `.env` theo [bảng biến môi trường](#biến-môi-trường). Backend cần tối thiểu `DATABASE_URL`, `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.

**Lưu ý:** `.env.example` backend hiện chưa có dòng `DATABASE_URL`; cần tự thêm biến này. Với checkout đã có `.env`, giữ file hiện tại và đối chiếu từng biến với file mẫu.

### 3. Chuẩn bị database

Database phải sẵn sàng trước khi khởi động API. Đọc [runbook database](docs/RUNBOOK.md) và kiểm tra các file trong [database/migrations](database/migrations) trước khi áp dụng.

- **Project Supabase mới:** xem xét và áp dụng `database/schema.sql` một lần để tạo baseline, sau đó áp dụng các migration `001`–`015` theo thứ tự tăng dần. Supabase quản lý schema `auth`; không tự tạo dữ liệu Auth bằng seed legacy.
- **Database đã có dữ liệu:** sao lưu, chạy `database/preflight.sql`, xác định migration đã áp dụng và chỉ chạy phần còn thiếu. Không chạy lại baseline hoặc migration đã thành công tùy ý.
- Migration `009`–`013` có thay đổi catalog và ảnh chỗ ở; cần xem nội dung trước khi áp dụng vào dữ liệu riêng. Migration `014` bổ sung hạn mức AI; `015` bổ sung trạng thái đọc thông báo và phụ thuộc bảng từ migration `008`.
- Migration `001` yêu cầu xác nhận riêng nếu có thanh toán cũ. Chỉ xác nhận `traveling.approve_legacy_mock` sau khi đã đối soát rằng chúng là dữ liệu mô phỏng; xem hướng dẫn trong runbook.
- `database/seed.sql` là seed legacy, có ghi trực tiếp Auth, payment và review; không nằm trong luồng cài đặt mặc định và không được coi là tương thích với schema sau nâng cấp.

Có thể dùng Supabase SQL Editor hoặc `psql` để chạy từng file đã xem xét. Nếu dùng `psql` qua `$env:DATABASE_URL`, cần đặt biến môi trường cho phiên terminal; PowerShell không tự đọc file `.env`.

### 4. Khởi động backend

Từ `traveling-app-backend`:

```powershell
npm run dev
```

| Địa chỉ mặc định | Mục đích |
| --- | --- |
| `http://localhost:5000/api/v1` | Base URL của REST API |
| `http://localhost:5000/health` | Kiểm tra sức khỏe API và kết nối database |

Để chạy bản biên dịch, dừng tiến trình development rồi dùng:

```powershell
npm run build
npm start
```

### 5. Khởi động frontend

Mở terminal thứ hai tại thư mục gốc repository:

```powershell
cd traveling-app-mobile
npm ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Bỏ comment và điền các biến `EXPO_PUBLIC_*` trong `.env` để dùng project Supabase/API của bạn. Frontend có cấu hình dự phòng trong `app.json`, vì vậy nên đặt rõ các biến khi chạy một môi trường riêng.

Chạy bản web trên cổng cố định:

```powershell
npm run web -- --port 8082
```

Mở `http://localhost:8082`. Admin Portal nằm tại `/admin/login`, chỉ dành cho tài khoản đã được cấp quyền admin trong backend.

Để chạy bằng Expo Go qua mạng LAN:

```powershell
npm start
```

Điện thoại và máy tính cần truy cập được cùng backend. Khi cấu hình `EXPO_PUBLIC_API_URL`, dùng IP LAN của máy chạy API và giữ hậu tố `/api/v1`; `localhost` trên điện thoại trỏ về chính điện thoại. Nếu không ghi đè, bản native development lấy hostname từ Metro và dùng cổng backend `5000`.

**OAuth và Stripe native cần development build.** Với môi trường Android đã cài SDK/JDK:

```powershell
npx expo run:android --device
```

Sau khi đã cài development build, các lần sau dùng `npm run start:dev-client`. Cần build lại khi thay đổi plugin hoặc cấu hình native. Xem [hướng dẫn Expo](docs/expo-sdk58-upgrade.md) và [cấu hình OAuth](docs/social-auth-setup.md), gồm callback web `http://localhost:8082/auth/callback` và native `travelingapp://auth/callback`.

## Biến môi trường

File mẫu: [backend](traveling-app-backend/.env.example) · [frontend](traveling-app-mobile/.env.example). Những giá trị cần điền phụ thuộc môi trường của bạn; không commit file `.env`.

### Backend: kết nối và cấu hình ứng dụng

| Biến | Mục đích / mặc định |
| --- | --- |
| `DATABASE_URL` | **Bắt buộc.** Chuỗi kết nối PostgreSQL; tự thêm vào `.env` |
| `SUPABASE_URL` | **Bắt buộc.** URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bắt buộc.** Server key; chỉ lưu ở backend |
| `PORT` | Cổng API; mặc định `5000` |
| `NODE_ENV` | Mặc định `development`; đặt `production` cho môi trường triển khai tương ứng |
| `DATABASE_SSL` | `verify`, `no-verify` hoặc `disable`; code hiện mặc định `no-verify`, không kiểm tra chứng chỉ. Dùng `verify` khi đã cấu hình CA phù hợp; `disable` cho PostgreSQL cục bộ không có TLS |
| `TAX_RATE` | Tỷ lệ thuế từ `0` đến `1`; mặc định `0` |
| `BOOKING_DEPOSIT_USD` | Số tiền đặt cọc; mặc định `30` USD |
| `CANCELLATION_CUTOFF_DAYS` | Mốc hủy theo ngày; mặc định `0` |
| `RECEIPT_FONT` | Tùy chọn: đường dẫn tuyệt đối đến font TTF Unicode để xuất hóa đơn |

### Backend: thanh toán, email và AI tùy chọn

| Biến | Khi sử dụng |
| --- | --- |
| `PAYMENT_MODE` | `disabled` (mặc định), `mock` hoặc `stripe_test`; `mock` bị chặn khi `NODE_ENV=production` |
| `PAYMENT_HOLD_MINUTES` | Thời hạn giữ phòng chờ thanh toán; mặc định `15`, từ `1` đến `60` phút |
| `MOCK_WEBHOOK_SECRET` | Secret cho webhook của chế độ mô phỏng |
| `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Cấu hình Stripe **test**; không dùng khóa live |
| `EMAIL_MODE` | `disabled` (mặc định) hoặc `webhook` |
| `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_SECRET` | Bắt buộc khi bật gửi email qua webhook; URL phải dùng HTTPS |
| `EMAIL_TIMEOUT_MS`, `EMAIL_MAX_ATTEMPTS` | Timeout và số lần gửi tối đa; mặc định `10000` ms và `5` |
| `AI_ENABLED` | `false` (mặc định); đặt `true` để bật provider đã cấu hình |
| `AI_PROVIDER`, `AI_MODEL` | Provider `openai` hoặc `gemini` và tên model bạn chọn; cần model khi bật AI |
| `OPENAI_API_KEY`, `GEMINI_API_KEY` | Chỉ cần key tương ứng provider đã chọn; chỉ đặt ở backend |
| `AI_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS` | Mặc định `12000` ms và `1200` token đầu ra |
| `AI_DAILY_REQUESTS_PER_USER`, `AI_DAILY_TOKEN_BUDGET` | Mặc định `20` lượt/người/ngày và ngân sách `100000` token/ngày |

Hướng dẫn chi tiết: [AI](docs/ai-setup.md) · [thanh toán và triển khai](docs/upgrade-runbook.md) · [email và vận hành](docs/RUNBOOK.md).

### Frontend: cấu hình công khai

| Biến | Mục đích |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL cùng project Supabase với backend |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon/public publishable key dùng cho client |
| `EXPO_PUBLIC_API_URL` | Base URL API có hậu tố `/api/v1`, truy cập được từ thiết bị đang chạy |

Các biến `EXPO_PUBLIC_*` được đưa vào ứng dụng. Không đặt database URL, service-role key, secret thanh toán hoặc key AI trong nhóm này. Khởi động lại Expo sau khi thay đổi cấu hình.

## Cấu trúc thư mục

```text
traveling-app/
├── traveling-app-mobile/       # Ứng dụng Expo: Android, iOS và web
│   ├── assets/                 # Ảnh và tài nguyên giao diện
│   ├── scripts/                # Kiểm thử frontend
│   ├── src/
│   │   ├── components/         # Thành phần dùng chung, đặt phòng, AI, admin
│   │   ├── navigation/         # Điều hướng và deep linking
│   │   ├── preferences/        # Ngôn ngữ và chế độ giao diện
│   │   ├── screens/            # Màn hình khách hàng và quản trị
│   │   ├── services/           # API client, Supabase và nghiệp vụ client
│   │   └── store/              # Trạng thái bộ lọc
│   ├── App.tsx
│   └── package.json
├── traveling-app-backend/      # REST API Express + TypeScript
│   ├── src/
│   │   ├── config/             # Biến môi trường, database, Supabase, AI
│   │   ├── controllers/        # Xử lý HTTP request/response
│   │   ├── domain/             # Quy tắc nghiệp vụ
│   │   ├── middlewares/        # Xác thực, phân quyền và xử lý lỗi
│   │   ├── repositories/       # Truy vấn dữ liệu
│   │   ├── routes/             # Khai báo REST endpoints
│   │   ├── scripts/            # Tác vụ vận hành và sinh tài liệu
│   │   ├── services/           # Nghiệp vụ và tích hợp provider
│   │   └── validators/         # Schema kiểm tra đầu vào
│   ├── test/                   # Unit và integration tests
│   └── package.json
├── database/
│   ├── schema.sql             # Baseline cho database mới
│   ├── seed.sql               # Seed legacy, cần xem xét riêng
│   ├── preflight.sql          # Kiểm tra database chỉ đọc
│   └── migrations/            # Migration 001–015
├── docs/                      # OpenAPI, Postman và hướng dẫn chuyên đề
└── README.md
```

## Kiểm thử

Từ `traveling-app-backend` sau khi cài dependencies:

```powershell
npm run typecheck
npm run test:isolated
npm run test:ai
```

`test:isolated` chạy bộ HTTP/database integration trong thư mục tạm, dùng PostgreSQL nhúng cùng Supabase/Stripe giả lập, tách khỏi secrets của môi trường phát triển. Không cần cài PostgreSQL server riêng. Khi thành công, wrapper cập nhật `docs/test-results.json`.

Từ `traveling-app-mobile`:

```powershell
npx tsc --noEmit
npm run test:auth
npm run test:guest-access
npm run test:admin
npm run test:ai-chat
npm run test:notifications
npm run test:preferences
```

Các script kiểm thử bổ sung nằm trong `package.json` của từng ứng dụng. Để sinh lại tài liệu API, chạy `npm run docs:generate` từ thư mục backend và xem lại diff trước khi commit.

Kết quả kiểm chứng đã lưu trong repo nằm tại [báo cáo ngày 05/11/2026](docs/verification-2026-11-05.md). Đây là bằng chứng của lần kiểm tra được ghi trong báo cáo; các bài test dùng fixture/provider giả lập không thay thế kiểm thử OAuth, thanh toán hoặc thiết bị thật.

## Tài liệu tham khảo

| Tài liệu | Nội dung |
| --- | --- |
| [API Reference](docs/API_REFERENCE.md) | Endpoint, request, response và mã lỗi |
| [OpenAPI](docs/openapi.json) | Đặc tả API dùng cho công cụ tích hợp |
| [Postman Collection](docs/postman.collection.json) · [Environment mẫu](docs/postman.environment.json) | Bộ request kiểm tra API; tự điền cấu hình môi trường |
| [Runbook](docs/RUNBOOK.md) | Database, migration, quyền runtime và tác vụ vận hành |
| [Frontend Integration](docs/FRONTEND_INTEGRATION.md) | Quy ước tích hợp client/backend |
| [Admin Portal](docs/admin-portal.md) | Quyền quản trị và quy trình nghiệp vụ |
| [AI Setup](docs/ai-setup.md) | Provider, hạn mức và cơ chế dự phòng |
| [Social Auth](docs/social-auth-setup.md) | Google/Facebook và callback OAuth |
| [Thông báo](docs/notifications.md) · [Ngôn ngữ và giao diện](docs/app-preferences.md) | Hành vi thông báo và cá nhân hóa |

## Phạm vi hiện tại

- Thanh toán mặc định bị tắt; chỉ có `mock` và Stripe test, chưa hỗ trợ thanh toán live. Báo cáo doanh thu hiện thuộc phạm vi dữ liệu thử nghiệm.
- Google/Facebook OAuth cần cấu hình provider và redirect URL trong Supabase; Apple và Phone OTP chưa được hỗ trợ.
- Thông báo hiện là **thông báo trong ứng dụng**, chưa có dịch vụ remote push được cấu hình. Gửi email qua webhook là luồng riêng, mặc định tắt.
- AI là tùy chọn. Khi chưa cấu hình, provider lỗi hoặc hết hạn mức, người dùng vẫn có thể tìm thủ công và đọc FAQ. Đơn vị tiền tệ nghiệp vụ hiện là USD; đổi ngôn ngữ không quy đổi tiền.
- Export bundle web/iOS không đồng nghĩa đã chạy thành công trên thiết bị thật. Xem giới hạn cụ thể trong [báo cáo kiểm chứng](docs/verification-2026-11-05.md).

## Đóng góp

Trao đổi lỗi hoặc đề xuất tính năng qua [GitHub Issues](https://github.com/tranhieu24/traveling-app/issues). Với thay đổi mã nguồn:

1. Tạo branch từ `main` và giữ mỗi pull request tập trung vào một vấn đề.
2. Tuân theo cấu trúc hiện có; cập nhật tài liệu và migration khi thay đổi API/database.
3. Chạy kiểm tra TypeScript và các test liên quan; mô tả cách kiểm chứng trong pull request. Với giao diện, bổ sung ảnh trước/sau nếu phù hợp.
4. Không đưa `.env`, token, dữ liệu cá nhân hoặc credentials vào commit và log kiểm thử.

## License

Repository hiện chưa có file `LICENSE`. Điều khoản cấp phép sử dụng, sửa đổi và phân phối chưa được công bố; liên hệ chủ repository trước khi tái sử dụng hoặc phân phối mã nguồn.

## Tác giả và liên hệ

- Repository: [tranhieu24/traveling-app](https://github.com/tranhieu24/traveling-app).
- Tài khoản chủ repository: [@tranhieu24](https://github.com/tranhieu24).
- Báo lỗi và trao đổi kỹ thuật: [GitHub Issues](https://github.com/tranhieu24/traveling-app/issues).
