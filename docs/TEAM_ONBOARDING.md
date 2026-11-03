# Hướng dẫn Onboarding cho Thành Viên Mới — Traveling App

> Cập nhật: 04/11/2026. Đọc kỹ trước khi bắt đầu code. Tài liệu này dành cho người vừa pull branch `main` và chưa có cấu hình local.

---

## 1. Tổng quan kiến trúc

```
traveling-app/
├── database/
│   ├── schema.sql                  ← Toàn bộ DDL (chỉ đọc để tham khảo)
│   └── migrations/                 ← Các migration theo thứ tự 001-007
├── traveling-app-backend/          ← Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── config/                 ← env.ts, database.ts, supabase.ts
│   │   ├── domain/                 ← Logic nghiệp vụ thuần (checkout.ts, mediaCatalog.ts)
│   │   ├── repositories/           ← Tương tác DB (booking, payment, review, support, trip…)
│   │   ├── routes/                 ← REST API endpoints
│   │   ├── validators/schemas.ts   ← Toàn bộ Zod schemas
│   │   └── server.ts               ← Entry point
│   └── test/
│       ├── integration.ts          ← Test suite chạy trên PostgreSQL nhúng cô lập
│       └── run-isolated.cjs        ← Wrapper đảm bảo không đụng database thật
└── traveling-app-mobile/           ← Expo 58 + React Native + NativeWind/Tailwind
    ├── src/
    │   ├── config/auth.ts          ← Scheme, OAuth redirect URIs, recovery
    │   ├── context/AuthContext.tsx ← Quản lý session Supabase toàn app
    │   ├── navigation/             ← Stack + Tab navigator, linking config
    │   ├── screens/                ← Toàn bộ màn hình
    │   ├── components/             ← UI components theo nhóm (common, booking, listing…)
    │   ├── services/               ← API calls (apiClient, bookingPayment, guestSupport…)
    │   ├── theme/tokens.ts         ← Design tokens (màu, border-radius, spacing)
    │   ├── types/index.ts          ← Toàn bộ TypeScript interfaces
    │   └── utils/                  ← Các hàm tiện ích (checkout, paymentSummary…)
    └── scripts/                    ← Test scripts (*.test.cjs)
```

**Stack công nghệ:**
- **Backend:** Node.js 24, TypeScript, Express 4, PostgreSQL (pg driver), Supabase Auth, Stripe SDK
- **Mobile:** Expo 58, React Native 0.88, TanStack Query, Zustand, NativeWind (Tailwind CSS), @stripe/stripe-react-native
- **Database:** PostgreSQL qua Supabase (hosted) hoặc PostgreSQL nhúng cho test

---

## 2. Thiết lập môi trường lần đầu

### 2.1 Yêu cầu phần mềm

| Phần mềm | Phiên bản yêu cầu |
|---|---|
| Node.js | 20+ (khuyến nghị 24.x) |
| npm | 10+ |
| Git | 2.40+ |
| `psql` CLI | Để chạy migration (tùy chọn, có thể dùng Supabase SQL Editor) |

### 2.2 Clone và cài packages

```powershell
# Đã pull về rồi thì bỏ qua bước này
git clone <repo-url>
cd traveling-app

# Cài backend
cd traveling-app-backend
npm ci

# Cài mobile
cd ..\traveling-app-mobile
npm ci
```

> ⚠️ Không dùng `npm install` (có thể thay đổi package-lock.json). Luôn dùng `npm ci`.

### 2.3 Cấu hình biến môi trường — Backend

Tạo file `.env` từ mẫu:

```powershell
cd traveling-app-backend
Copy-Item .env.example .env
```

Mở file `.env` vừa tạo và điền đầy đủ:

```env
PORT=5000
NODE_ENV=development

# --- Supabase (lấy từ dashboard: Settings > API) ---
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   # Chỉ để backend, KHÔNG vào mobile
SUPABASE_ANON_KEY=<anon_key>

# --- Database ---
# Lấy từ Supabase: Settings > Database > Connection string (Transaction mode / Session mode)
DATABASE_URL=postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres
DATABASE_SSL=no-verify     # Dùng "disable" nếu local PostgreSQL, "verify" cho production

# --- Thanh toán ---
# Bắt đầu với "disabled" (không cần Stripe để phát triển cơ bản)
PAYMENT_MODE=disabled
PAYMENT_HOLD_MINUTES=15

# Nếu dùng mock (development/test):
# PAYMENT_MODE=mock
# MOCK_WEBHOOK_SECRET=any-random-secret-here

# Nếu test Stripe thật (cần tài khoản Stripe test):
# PAYMENT_MODE=stripe_test
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# --- Chính sách đặt phòng ---
BOOKING_DEPOSIT_USD=30         # Số tiền cọc tối thiểu (USD)
CANCELLATION_CUTOFF_DAYS=0     # Số ngày trước check-in thì không được hủy

# --- Tùy chọn ---
TAX_RATE=0                     # Tỷ lệ thuế (0–1). Ví dụ: 0.1 = 10%
# RECEIPT_FONT=                # Đường dẫn file TTF nếu cần font tiếng Việt cho PDF
```

> 🔒 **Bảo mật:** Không bao giờ commit file `.env`. File `.gitignore` đã loại trừ nó.

### 2.4 Cấu hình biến môi trường — Mobile

Tạo file `traveling-app-mobile/.env` (nếu chưa có):

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api/v1   # IP LAN của máy chạy backend
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>              # Chỉ dùng anon key ở mobile
```

> 💡 Khi chạy Expo trên điện thoại thật, phải dùng IP LAN (không phải `localhost`). Kiểm tra bằng `ipconfig` (Windows) hoặc `ifconfig` (macOS/Linux).

---

## 3. Áp dụng Database Migrations

> ⚠️ **Quan trọng:** Chỉ áp migration lên database staging bạn được phép sửa. Không chạy trên production trực tiếp mà không có backup và review.

### 3.1 Kiểm tra migration nào đã áp

Chạy query này trong Supabase SQL Editor để kiểm tra columns đã tồn tại chưa:

```sql
-- Kiểm tra migration 005 đã áp chưa
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name IN ('contact_snapshot', 'policy_snapshot', 'client_request_id');

-- Kiểm tra migration 006 đã áp chưa
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('support_tickets', 'support_messages', 'booking_arrival_guides');

-- Kiểm tra migration 007 đã áp chưa
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_name = 'booking_policy_values';
```

### 3.2 Áp migration theo thứ tự

**Thứ tự bắt buộc: 001 → 002 → 003 → 004 → 005 → 006 → 007**

**Cách an toàn nhất — dùng Supabase SQL Editor:**
1. Mở Supabase Dashboard → SQL Editor
2. Đọc nội dung từng file migration trong `database/migrations/`
3. Paste nguyên file vào editor và chạy
4. Kiểm tra kết quả (không có lỗi = thành công)
5. **Dừng ngay nếu có lỗi. Không chạy tiếp migration tiếp theo.**

**Cách dùng `psql` CLI (nếu đã cài):**

```powershell
# Đặt DATABASE_URL vào shell trước
$env:DATABASE_URL = "postgresql://..."

# Áp từng migration theo thứ tự
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/001_backend_workflows.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/002_rls_and_grants.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/003_auth_sync.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/004_state_guards.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/005_checkout_context.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/006_guest_support.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/007_booking_policy.sql
```

> 📌 **Ghi chú Migration 001:** Nếu database đã từng có payment thật (không phải mock), cần đọc kỹ nội dung migration và thêm `SET LOCAL traveling.approve_legacy_mock='yes';` sau `BEGIN;` chỉ khi tất cả payment cũ đã được xác nhận là mock/test.

---

## 4. Chạy ứng dụng

### 4.1 Chạy Backend

```powershell
cd traveling-app-backend

# Kiểm tra TypeScript trước
npm run typecheck    # Phải exit 0

# Build (kiểm tra lỗi biên dịch)
npm run build        # Phải exit 0

# Chạy development server
npm run dev          # Hot-reload, port 5000
```

Kiểm tra backend đang chạy:
```powershell
curl http://localhost:5000/health
# Kết quả mong đợi: {"status":"ok"}
```

### 4.2 Chạy Mobile

```powershell
cd traveling-app-mobile

# Web (dễ nhất để phát triển)
npm run web          # Mở http://localhost:8081

# Android emulator
npm run android

# iOS simulator (macOS only)
npm run ios

# Thiết bị thật qua LAN
npm run start:lan    # Quét QR code bằng Expo Go
```

> ⚠️ **Quan trọng về OAuth (Google/Facebook):** Không thể test OAuth qua Expo Go. Phải build development client:
> ```powershell
> npm run start:dev-client
> ```
> Và cài app lên thiết bị qua EAS Build hoặc `expo run:android`.

---

## 5. Chạy Tests

### 5.1 Backend Tests (PostgreSQL nhúng, không cần database thật)

```powershell
cd traveling-app-backend

# Wrapper sẽ báo lỗi nếu tìm thấy .env — test cần môi trường sạch
npm run test:isolated
# Kết quả mong đợi: 40 passed, 0 failed
```

### 5.2 Mobile Tests

```powershell
cd traveling-app-mobile

# Chạy tất cả test suites cùng lúc
node --test scripts/auth.test.cjs scripts/admin.test.cjs scripts/sdk.test.cjs scripts/native-ui.test.cjs scripts/upgrade.test.cjs scripts/phase2.test.cjs
# Kết quả mong đợi: 68 passed, 0 failed

# TypeScript check
npx tsc --noEmit    # Phải exit 0, không có output lỗi
```

### 5.3 Build kiểm tra (không deploy)

```powershell
cd traveling-app-mobile
npx expo export --platform all --output-dir dist/build-check
# Web: ~2900 modules, Android/iOS: ~3700 modules — exit 0 là thành công
```

---

## 6. Cấu trúc Code Quan Trọng Cần Hiểu

### 6.1 Luồng Authentication

```
User → LoginScreen → AuthContext.signIn() → Supabase Auth
     → AuthCallbackScreen (OAuth) → server /auth/me → AuthContext.user (role: guest | admin)
     → PasswordRecoveryScreen (quên mật khẩu) → Supabase resetPasswordForEmail
```

**Files cốt lõi:**
- `src/context/AuthContext.tsx` — Session Supabase, refresh, logout, role
- `src/config/auth.ts` — OAuth redirect URIs, scheme `travelingapp://`, recovery URIs
- `src/screens/AuthCallbackScreen.tsx` — Xử lý callback từ OAuth provider
- `src/screens/PasswordRecoveryScreen.tsx` — Quên mật khẩu / đặt lại

**Quy tắc:** Backend xác minh JWT từ Supabase. Không tin frontend về role hay quyền.

### 6.2 Luồng Đặt Phòng (Booking)

```
ListingDetail → OrderReview (quote + policy) → Payment → BookingDetail + TripProgress
                     ↓                              ↓              ↓
              POST /bookings/quote          POST /payments/     GET /bookings/:id/trip
              (server tính giá thật)        initiate            (timeline + arrival guide)
```

- **Server luôn là nguồn sự thật** về giá, policy, trạng thái booking
- `contact_snapshot` & `policy_snapshot` lưu khi tạo booking — không thay đổi sau
- `client_request_id` chống tạo booking trùng khi retry mạng

### 6.3 Hệ thống Thanh Toán

| Mode | Khi nào dùng | Cần gì |
|---|---|---|
| `disabled` | Development, chưa cần Stripe | Chỉ `.env` cơ bản |
| `mock` | Test UI, demo | `MOCK_WEBHOOK_SECRET` bất kỳ |
| `stripe_test` | Test đầu cuối với Stripe | `pk_test_...`, `sk_test_...`, `whsec_...` |

### 6.4 Hệ thống Hỗ Trợ (HELP-01 + TRIP-01)

```
BookingDetail → [Yêu cầu hỗ trợ] → SupportScreen (guest/admin)
             → [TripProgress] ← GET /bookings/:id/trip
             ← [Admin] PUT /admin/bookings/:id/arrival-guide
```

- Support tickets gắn với booking — chỉ chủ booking hoặc admin mới xem được
- Arrival guide do admin tạo — không bịa thông tin nhận phòng

### 6.5 Design Tokens — Quy tắc bắt buộc

```typescript
import { theme } from '../theme/tokens';

// ✅ Đúng
backgroundColor: theme.colors.primary     // '#008A9A'
backgroundColor: theme.colors.surface     // '#FFFFFF'

// ❌ Sai — không hardcode màu hex
backgroundColor: '#008A9A'
```

Bảng màu trong `theme/tokens.ts`:
- `primary` `#008A9A` · `primarySoft` `#E8F7F8`
- `ink` `#172B3A` · `muted` `#617483`
- `border` `#DCE5EA` · `surface` `#FFFFFF` · `background` `#F4F8FA`
- `danger` `#B42318` · `warning` `#9A6700`

---

## 7. Các Tính Năng Đã Hoàn Thành

| Mã | Tên | Trạng thái |
|---|---|---|
| AUTH-01 | OAuth callback, role routing, chống retry lặp | ✅ 40/40 backend, 68/68 mobile |
| BOOK-01 | Checkout đầy đủ: contact, policy snapshot, idempotency | ✅ |
| BOOK-02 | Đồng hồ hold phòng từ server (BookingHold component) | ✅ |
| PAY-01 | Stripe Payment Element web + native, webhook HMAC | ✅ (test stub) |
| REVIEW-01/02 | Chỉ overall rating, phân trang 12/trang, API aggregate | ✅ |
| MEDIA-01 | Catalog 15 ảnh có provenance, apply/restore script | ✅ (ảnh địa điểm, chưa có ảnh phòng) |
| UX-01 | Design tokens, nhãn tiếng Việt, form tránh bàn phím | ✅ |
| HELP-01 | Support tickets gắn booking, thread UI guest + admin | ✅ |
| TRIP-01 | Trip timeline events, arrival guide từ admin | ✅ |
| AUTH-02 | Quên mật khẩu, đặt lại qua email, callback riêng | ✅ |
| POLICY-01 | Policy snapshot cấu hình được, trigger bất biến DB | ✅ (migration sẵn sàng) |

---

## 8. Các Công Việc Còn Dang Dở

### 🔴 NOTIFY-01 — Email thông báo giao dịch *(Chưa bắt đầu)*

Cần làm:
- Migration 008: bảng `notification_outbox` với dedup key
- Adapter email: Resend hoặc SMTP (không chọn trước khi team thống nhất provider)
- Event triggers: booking confirmed, payment received, cancellation, refund
- Biến môi trường mới: `EMAIL_FROM`, `EMAIL_PROVIDER`, `RESEND_API_KEY`
- Test: không gửi trùng khi webhook Stripe đến nhiều lần

### 🟡 AI-01 — Tìm kiếm ngôn ngữ tự nhiên *(Chưa bắt đầu)*

Đọc trước: `docs/upgrade-kit/skills/traveling-grounded-ai/SKILL.md`

Cần làm:
- Backend endpoint nhận câu tự nhiên → parse → gọi `/listings` với filter
- Không tự sinh listing, không xác nhận giá
- Biến môi trường AI provider (chưa chọn)
- `docs/ai-setup.md` chưa tồn tại — phải tạo khi chọn provider

### 🟡 AI-02 — Trợ lý hỏi đáp *(Chưa bắt đầu)*

- Trả lời từ FAQ tĩnh và booking của user được phép truy cập
- Không đọc booking người khác
- Provider lỗi phải có fallback rõ ràng

### 🟢 OPS-01 — Scheduler và monitoring *(Chưa bắt đầu)*

- Script `expire-bookings.ts` hiện chỉ chạy bằng tay — cần cron job
- Health endpoint `/health` có nhưng chưa có alerting

### 🟢 Nghiệm thu còn thiếu *(Cần môi trường thật)*

- Google/Facebook OAuth: chưa test với client ID thật trên thiết bị thật
- Stripe: chưa có giao dịch thật qua Stripe account
- Migration 005-007: chưa áp lên Supabase production
- UI mobile: chưa có screenshot nghiệm thu trên iPhone/Android thật
- Ảnh phòng thật: 0/15 listing có ảnh nội thất xác minh *(team đang tạm dừng)*

---

## 9. Quy tắc làm việc trong team

### ✅ Được làm:
- Đọc source hiện tại trước khi sửa — đặc biệt validators/schemas và repositories
- Chạy `typecheck` và tests trước khi commit
- Viết migration additive (chỉ thêm, không xóa không đổi tên cột)
- Ghi rõ migration có rollback được không trong PR description
- Thêm test cho mọi hành vi mới quan trọng

### ❌ Không được làm:
- Commit `.env`, secrets, token, API key vào Git
- Tự commit/push/merge không có review
- Tự áp migration lên production không có backup
- Xóa test đang pass để build xanh
- Bật `PAYMENT_MODE=stripe_test` với live Stripe key
- Bịa thông tin nhận phòng, số điện thoại, giá tiền trong code/dữ liệu
- Dùng `npm install` (dùng `npm ci` để giữ lock file)

### Convention commit message:

```
feat(backend): thêm endpoint NOTIFY-01 outbox email
fix(mobile): sửa lỗi bàn phím che nút đặt phòng
test(backend): thêm test webhook lặp cho email outbox
docs: cập nhật RUNBOOK migration 008
refactor(mobile): di chuyển màu hardcode vào theme tokens
migration: 008_notification_outbox additive
```

---

## 10. Prompt sẵn cho AI Coding Agent

Paste đoạn sau khi bắt đầu session mới với bất kỳ AI assistant nào:

```
Tôi đang làm việc trên dự án Traveling App — ứng dụng đặt chỗ lưu trú.
Đọc lần lượt các file sau trước khi bắt đầu:

1. docs/TEAM_ONBOARDING.md        ← Tổng quan môi trường, stack, quy tắc
2. docs/PHASE2_HANDOFF.md         ← Checkpoint hiện tại và việc đang dở
3. docs/upgrade-progress.md       ← Trạng thái từng hạng mục
4. docs/upgrade-acceptance.md     ← Kết quả test thực tế và phần chưa nghiệm thu

Sau đó chạy: git status --short

---
STACK:
- Backend: Node 24, TypeScript, Express 4, PostgreSQL (pg), Supabase Auth, Stripe SDK
- Mobile: Expo 58, React Native 0.88, TanStack Query, NativeWind, @stripe/stripe-react-native
- Database: PostgreSQL hosted trên Supabase
- Ngôn ngữ UI: Tiếng Việt là mặc định

TRẠNG THÁI TEST BASELINE:
- Backend: npm run test:isolated → 40/40 pass
- Mobile: node --test scripts/*.test.cjs → 68/68 pass
- Cả hai typecheck: exit 0

RÀNG BUỘC BẮT BUỘC:
- Không tự commit/push/deploy bất kỳ thứ gì
- Không sửa .env, secrets, dashboard Supabase/Stripe/OAuth
- Backend là nguồn sự thật: giá, quyền, trạng thái booking
- Migration phải additive + có rollback plan
- Chạy typecheck và test sau mỗi thay đổi — ghi exit code thực tế
- Không bịa thông tin: số điện thoại, hướng dẫn nhận phòng, ảnh property
- Dùng theme tokens (src/theme/tokens.ts) — không hardcode màu hex

VIỆC ƯU TIÊN TIẾP THEO:
1. NOTIFY-01: Hệ thống email outbox (migration 008, adapter email, dedup, retry)
2. AI-01: Tìm kiếm phòng ngôn ngữ tự nhiên (đọc docs/upgrade-kit/skills/traveling-grounded-ai/SKILL.md)
3. AI-02: Trợ lý hỗ trợ FAQ + booking
4. OPS-01: Cron expire-bookings + health monitoring

SKILLS ĐỌC KHI CẦN:
- docs/upgrade-kit/skills/traveling-product-upgrade/SKILL.md ← Nghiệp vụ booking
- docs/upgrade-kit/skills/traveling-grounded-ai/SKILL.md     ← AI search
- docs/upgrade-kit/skills/traveling-contextual-media/SKILL.md ← Ảnh có provenance
```

---

## 11. Tài liệu tham khảo nhanh

| Tài liệu | Mô tả |
|---|---|
| [`docs/RUNBOOK.md`](RUNBOOK.md) | Hướng dẫn chạy backend, áp migration, rollback |
| [`docs/upgrade-runbook.md`](upgrade-runbook.md) | Demo Giai đoạn 1: Stripe, OAuth, media |
| [`docs/upgrade-acceptance.md`](upgrade-acceptance.md) | Kết quả test, phần chưa nghiệm thu |
| [`docs/upgrade-progress.md`](upgrade-progress.md) | Bảng tiến độ từng hạng mục |
| [`docs/PHASE2_HANDOFF.md`](PHASE2_HANDOFF.md) | Checkpoint Giai đoạn 2 |
| [`docs/API_REFERENCE.md`](API_REFERENCE.md) | Tài liệu REST API |
| [`docs/openapi.json`](openapi.json) | OpenAPI spec (import Postman / Swagger UI) |
| [`docs/media-catalog.json`](media-catalog.json) | Catalog ảnh minh họa (nguồn, giấy phép) |
| [`database/schema.sql`](../database/schema.sql) | DDL database đầy đủ |
| [`database/migrations/`](../database/migrations/) | Migration 001–007 theo thứ tự |

---

*File này nên được cập nhật mỗi khi có tính năng mới hoàn thành hoặc quy tắc team thay đổi. Tạo PR cập nhật trước khi merge tính năng lớn.*
