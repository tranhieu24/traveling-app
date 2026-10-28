# Báo cáo gộp cấu trúc Traveling App (Consolidation Report)

Thời điểm thực hiện: 28/10/2026.

## 1. Cấu trúc đích hoàn thiện

```text
traveling-app/
├── traveling-app-backend/     # Backend Express + TypeScript chính đã gộp đầy đủ
├── traveling-app-mobile/      # Frontend Expo của nhóm mobile (giữ nguyên tuyệt đối)
├── database/                  # Quản lý schema, preflight và migration
│   ├── schema.sql             # Baseline public schema ban đầu
│   ├── seed.sql               # Seed legacy phục vụ thử nghiệm
│   ├── preflight.sql          # Script kiểm tra chỉ đọc trạng thái database
│   └── migrations/            # Migration 001 đến 004
├── docs/                      # Toàn bộ tài liệu, OpenAPI, Postman và kết quả test
├── .gitignore                 # Cấu hình bỏ qua dependencies, logs, .env và test-runs
└── README.md                  # Hướng dẫn chung và tổng quan dự án
```

## 2. Chi tiết các nội dung đã gộp và đối chiếu

### 2.1 Backend (`traveling-app-backend/`)
- **Domain & Nghiệp vụ**: Bổ sung `src/domain/booking.ts` kiểm soát trạng thái đặt phòng chặt chẽ.
- **Repositories**: Gộp các repository mới và cải thiện:
  - `admin.repository.ts`: Nghiệp vụ quản trị, kiểm toán (audit log), quản lý listing/category/coupon/customer.
  - `coupon.repository.ts`: Kiểm soát hạn sử dụng, hạn mức toàn cục, hạn mức mỗi người dùng, giá trị đơn tối thiểu.
  - `payment.repository.ts`: Quản lý sổ cái giao dịch, thanh toán nhiều đợt (deposit/balance), quản lý hoàn tiền (refund request/approval/dispatch).
  - `report.repository.ts`: Báo cáo doanh thu và giao dịch.
  - Cập nhật các repository hiện hữu: `booking.repository.ts`, `category.repository.ts`, `favorite.repository.ts`, `listing.repository.ts`, `review.repository.ts`.
- **Services**:
  - `gateway.service.ts`: Adapter thanh toán Stripe test và mock simulation.
  - `pdf.service.ts`: Xuất hóa đơn/chứng từ PDF với định dạng chuẩn và cache header an toàn.
  - `transaction.ts`: Xử lý giao dịch cơ sở dữ liệu có kiểm soát lỗi và rollback.
- **Routes & Controllers**:
  - `admin.routes.ts`: Hệ thống endpoint quản trị được bảo vệ bởi middleware xác thực và phân quyền admin.
  - Cập nhật `booking`, `discovery`, `interaction`, `auth` routes và controllers theo chuẩn API mới.
- **Scripts**:
  - `expire-bookings.ts`: Quét và hủy các yêu cầu đặt phòng pending quá thời hạn thanh toán giữ chỗ.
  - `generate-api-docs.ts`: Tự động trích xuất và sinh tài liệu API, OpenAPI, Postman collection & environment.
  - `seed.ts`: Seed dữ liệu mẫu cho môi trường phát triển cục bộ.
- **Kiểm thử**:
  - `test/integration.ts` & `test/run.cjs`: Bộ kiểm thử tích hợp 34 nhóm test bao phủ luồng nghiệp vụ.
  - `test/run-isolated.cjs`: Runner chạy kiểm thử trong thư mục tạm `os.tmpdir()` với PostgreSQL 18 nhúng, bảo vệ toàn vẹn file `.env` cá nhân của lập trình viên.
- **Cấu hình & Dependencies**:
  - Đồng bộ `package.json` và `package-lock.json` với các thư viện cần thiết (`exceljs`, `stripe`, `@apidevtools/swagger-parser`, `embedded-postgres`, `zod-to-json-schema`).
  - Thêm các lệnh `npm run typecheck`, `npm run test:isolated`, `npm run expire-bookings`, `npm run docs:generate`.
  - Giữ nguyên toàn bộ file `.env` hiện hữu trong `traveling-app-backend/`, không làm thay đổi hay để lộ secrets.

### 2.2 Cơ sở dữ liệu (`database/`)
- Giữ nguyên `schema.sql` (baseline) và `seed.sql` (legacy data).
- Bổ sung `preflight.sql`: Kiểm tra an toàn trước khi chạy migration (xem xét payment legacy, session auth, v.v.).
- Bổ sung thư mục `migrations/` gồm 4 migration:
  - `001_backend_workflows.sql`: Bổ sung cấu trúc sổ cái thanh toán, hoàn tiền, kiểm toán, quản lý coupon và cấu hình.
  - `002_rls_and_grants.sql`: Phân quyền role runtime `traveling_backend`, thiết lập Row Level Security (RLS) ngăn truy cập trực tiếp từ anon/authenticated vào dữ liệu nghiệp vụ nhạy cảm.
  - `003_auth_sync.sql`: Đồng bộ trạng thái khóa tài khoản và thu hồi phiên với Supabase Auth.
  - `004_state_guards.sql`: Trigger và ràng buộc bảo vệ trạng thái booking, review sau hoàn thành, chống trùng lặp lịch đặt phòng.
- Tuyệt đối không chạy migration, seed hoặc can thiệp dữ liệu trên Supabase trong đợt dọn cấu trúc này.

### 2.3 Tài liệu (`docs/`)
- Di chuyển toàn bộ tài liệu từ `backend-work/docs` sang `docs/` ở thư mục gốc:
  - `API_REFERENCE.md`: Hướng dẫn chi tiết từng endpoint.
  - `FRONTEND_INTEGRATION.md`: Hướng dẫn tích hợp cho đội ngũ mobile.
  - `openapi.json`: Tài liệu OpenAPI chuẩn (56 operations).
  - `postman.collection.json` & `postman.environment.json`: Bộ Postman collection sẵn sàng kiểm thử API.
  - `REQUIREMENTS.md`: Bảng đối chiếu yêu cầu báo cáo và hiện trạng mã nguồn.
  - `RUNBOOK.md`: Quy trình chạy backend, áp dụng migration và xử lý vận hành.
  - `VERIFICATION.md`: Bằng chứng xác minh và ghi nhận giới hạn.
  - `test-results.json`: Bằng chứng kết quả kiểm thử mới nhất.
  - `original-integrity.json` & `original-sha256.json`: Dữ liệu băm đối chiếu bảo toàn source ban đầu.
- Cập nhật toàn bộ các đường dẫn tham chiếu trong tài liệu và `README.md` sang cấu trúc mới.

### 2.4 Mobile (`traveling-app-mobile/`)
- Giữ nguyên hoàn toàn 100%, không chỉnh sửa bất kỳ file nào trong thư mục mobile.

## 3. Kết quả kiểm tra xác minh

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run typecheck` | **PASS (exit 0)** | TypeScript kiểm tra không có lỗi kiểu |
| `npm run build` | **PASS (exit 0)** | Build mã nguồn TypeScript sang `dist/` thành công |
| `npm run test:isolated` | **PASS (exit 0)** | 34/34 nhóm test PASS, 0 FAIL. Chạy trên PostgreSQL nhúng trong thư mục tạm, bảo toàn file `.env` |
| `npm run docs:generate` | **PASS (exit 0)** | Khởi tạo và kiểm tra 56 API operations thành công |

## 4. Các biến môi trường cần lưu ý

File `.env` hiện có của bạn đã được bảo vệ nguyên vẹn. Khi vận hành backend với các tính năng mới, hãy đối chiếu với `.env.example` để bổ sung các biến cấu hình nếu cần:
- `DATABASE_SSL`: Mặc định là `verify`. Nếu kết nối PostgreSQL cục bộ không hỗ trợ SSL, đặt thành `disable`.
- `PAYMENT_MODE`: Mặc định là `disabled`. Hỗ trợ các chế độ: `disabled`, `mock` (cho môi trường dev/staging), `stripe_test` (cần Stripe test key).
- `PAYMENT_HOLD_MINUTES`: Thời gian giữ chỗ pending thanh toán (mặc định: `15` phút).
- `TAX_RATE`: Tỷ lệ thuế áp dụng (mặc định: `0`).
- `MOCK_WEBHOOK_SECRET`: Secret cho webhook giả lập khi dùng chế độ `mock`.
- `STRIPE_SECRET_KEY`: Khóa bí mật Stripe test (`sk_test_...`) khi bật `PAYMENT_MODE=stripe_test`.
- `STRIPE_WEBHOOK_SECRET`: Secret chữ ký webhook Stripe (`whsec_...`).
