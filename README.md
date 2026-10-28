# Traveling App

Ứng dụng đặt chỗ ở với React Native Expo, backend Express + TypeScript và PostgreSQL trên Supabase. Backend chính nằm trong `traveling-app-backend`; database, migration và tài liệu dùng chung nằm ngay dưới thư mục gốc.

## Cấu trúc project

```text
traveling-app/
├── traveling-app-backend/     # API, cấu hình, scripts và kiểm thử backend
├── traveling-app-mobile/      # Ứng dụng Expo của nhóm frontend
├── database/
│   ├── schema.sql            # Baseline cũ, chỉ dùng một lần cho database mới
│   ├── seed.sql              # Seed legacy; cần xem giới hạn trước khi dùng
│   ├── preflight.sql         # Kiểm tra database chỉ đọc
│   └── migrations/           # Migration 001–004
├── docs/                     # API, Postman, hướng dẫn và bằng chứng kiểm tra
├── .gitignore
└── README.md
```

## Chạy backend

Máy phát triển cần Node.js và npm. Nếu database đang dùng Supabase hosted, không cần cài PostgreSQL server cục bộ. Backend kết nối đến Supabase bằng `DATABASE_URL`.

```powershell
cd E:\Project_ReactNaTive\traveling-app\traveling-app-backend
npm ci
```

Giữ file `.env` hiện có. Đối chiếu với `.env.example` và chỉ bổ sung hoặc điều chỉnh biến cần thiết; không ghi đè file cấu hình bằng file mẫu. Với một checkout mới chưa có `.env`, có thể tạo bằng:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Cấu hình `DATABASE_URL`, `SUPABASE_URL` và server key của cùng dự án Supabase. Backend mới yêu cầu migration 001–004; đọc [hướng dẫn database và chạy backend](docs/RUNBOOK.md) trước khi khởi động. Việc gộp source không tự chạy migration hoặc seed trên Supabase.

```powershell
npm run typecheck
npm run build
npm start
```

- Backend: `http://localhost:5000/api/v1`
- Kiểm tra kết nối database: `http://localhost:5000/health`
- Chạy phát triển với tự tải lại: `npm run dev`

Mặc định `PAYMENT_MODE=disabled`. Backend có chế độ mô phỏng được cấu hình riêng và adapter Stripe test; chưa hỗ trợ thanh toán live. Các giới hạn kiểm chứng nằm trong [VERIFICATION](docs/VERIFICATION.md).

## Database và dữ liệu mẫu

`schema.sql` và `seed.sql` được giữ nguyên từ baseline trước đây. Với database đã có dữ liệu, dùng preflight và xem migration, không chạy lại baseline hay seed.

Seed legacy có lệnh ghi trực tiếp tài khoản Auth, payment và review; không được coi là seed tương thích sau migration 001–004. Cần xem xét riêng trước khi dùng trên một database thử nghiệm có thể bỏ. Với Supabase mới, baseline public schema chỉ được áp dụng một lần, tiếp theo là các migration đã xem xét; Supabase quản lý các bảng `auth.*`.

## Kiểm thử backend

Từ thư mục `traveling-app-backend`:

```powershell
npm run test:isolated
npm run docs:generate
```

Lệnh `test:isolated` chạy bộ test trong thư mục tạm ngoài project, dùng dependencies đã cài, không chuyển hoặc xóa `.env`. Test tạo PostgreSQL nhúng cục bộ riêng và thay lời gọi Supabase/Stripe bằng stub; không cần cài PostgreSQL server riêng. Kết quả mới chỉ được đưa về `docs/test-results.json` khi wrapper xác nhận lần kiểm thử thành công. Chi tiết kết quả gộp và kiểm tra nằm trong [CONSOLIDATION](docs/CONSOLIDATION.md).

## Chạy mobile

Frontend được phát triển trong thư mục riêng:

```powershell
cd E:\Project_ReactNaTive\traveling-app\traveling-app-mobile
npm install
npx expo start
```

Dùng Expo Go hoặc Android Emulator theo môi trường của nhóm frontend. Điện thoại thật cần địa chỉ backend có thể truy cập trong mạng; frontend và backend dùng cùng dự án Supabase Auth. Các thay đổi cần tích hợp được mô tả trong [FRONTEND_INTEGRATION](docs/FRONTEND_INTEGRATION.md).

## Tài liệu API và bàn giao

- [Hướng dẫn cấu hình, migration và vận hành](docs/RUNBOOK.md)
- [Danh sách API, request, response và mã lỗi](docs/API_REFERENCE.md)
- [OpenAPI](docs/openapi.json)
- [Postman collection](docs/postman.collection.json) và [environment mẫu](docs/postman.environment.json)
- [Đối chiếu yêu cầu và phạm vi backend](docs/REQUIREMENTS.md)
- [Bằng chứng kiểm thử và giới hạn](docs/VERIFICATION.md)
- [Kết quả gộp cấu trúc](docs/CONSOLIDATION.md)

Không đưa `.env`, mật khẩu database, token hoặc server key vào Git hay các file Postman bàn giao.
