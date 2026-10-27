# TRAVELING APP (MVP) 🌍🏖️

Ứng dụng di động đặt phòng lưu trú đa quốc gia (React Native Expo) kèm Backend REST API (Node.js/Express/TypeScript) và Supabase PostgreSQL Database.

---

## 1. Cấu Trúc Dự Án

```text
traveling-app/
├── database/
│   └── seed.sql                  # Script nạp seed data mẫu vào 10 bảng Supabase DB
├── traveling-app-backend/        # Node.js Express REST API (TypeScript + pg Driver)
│   ├── src/
│   │   ├── config/               # database.ts (pg.Pool Session Pooler 5432), supabase.ts, env.ts
│   │   ├── middlewares/          # auth.middleware, validate.middleware, error.middleware
│   │   ├── validators/           # Zod schemas (booking, listing, review, user)
│   │   ├── repositories/         # Parameterized SQL queries via pg driver
│   │   ├── services/             # pdf.service.ts (PDFKit Stream Receipt)
│   │   ├── controllers/          # auth, discovery, interaction, booking
│   │   ├── routes/               # express router mapping
│   │   ├── app.ts                # Express app setup, rate-limit, helmet, health check
│   │   └── server.ts             # Server entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── traveling-app-mobile/         # React Native Expo Mobile App (NativeWind Cyan #00BCD4)
    ├── src/
    │   ├── components/           # Button, ListingCard, CategoryBar, SkeletonLoader, EmptyState
    │   ├── context/              # AuthContext (Supabase Auth + SecureStore)
    │   ├── store/                # useFilterStore (Zustand)
    │   ├── services/             # apiClient (Axios + SecureStore Bearer Interceptors)
    │   ├── navigation/           # AppNavigator (Root Stack) & TabNavigator (5 Tabs)
    │   ├── screens/              # 15 Screens (Home, Detail, Review, Order, Bookings...)
    │   └── types/                # TypeScript interfaces
    ├── App.tsx
    ├── tailwind.config.js
    ├── babel.config.js
    ├── app.json
    └── package.json
```

---

## 2. Hướng Dẫn Nạp Dữ Liệu Mẫu (Seed Data)

Script `database/seed.sql` đã được biên soạn sẵn chứa:
- **5 Categories:** Beach, Mountain, Camping, Countryside, Iconic Cities.
- **10 Amenities:** Wifi, Kitchen, Pool, Free parking, Air conditioning, Dedicated workspace, TV, Washer, Exercise equipment, BBQ grill.
- **12 Listings mẫu:** Trải dài khắp Châu Á (Bali, Kyoto, Đà Nẵng, Chiang Mai), Châu Âu (Swiss Alps, Santorini, Tuscany, Paris), Bắc Mỹ (Aspen, Joshua Tree, SoHo NY, Vermont).
- **Listing photos:** 3-5 ảnh chất lượng cao cho mỗi listing.
- **20+ Reviews & 5 Bookings:** Đầy đủ trạng thái `confirmed`, `pending`, `cancelled`.

👉 **Cách thực thi:**
Mở **SQL Editor** trong trang quản trị Supabase Cloud của bạn, copy toàn bộ nội dung file [database/seed.sql](file:///e:/Project_ReactNaTive/traveling-app/database/seed.sql) và bấm **Run**.

---

## 3. Khởi Chạy Backend API (`/traveling-app-backend`)

1. Di chuyển vào thư mục backend:
   ```bash
   cd traveling-app-backend
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Tạo file `.env` từ `.env.example` và điền thông tin Supabase:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
   SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
   ```
4. Chạy chế độ Development:
   ```bash
   npm run dev
   ```
   - Health Check: `http://localhost:5000/health`
   - API Base: `http://localhost:5000/api/v1`

---

## 4. Khởi Chạy Ứng Dụng Di Động (`/traveling-app-mobile`)

1. Di chuyển vào thư mục mobile:
   ```bash
   cd traveling-app-mobile
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy Expo Dev Server:
   ```bash
   npx expo start
   ```
4. Quét mã QR bằng ứng dụng **Expo Go** trên điện thoại (iOS / Android) hoặc nhấn `a` để chạy Android Emulator.

---

## 5. Danh Sách 17 REST API Endpoints

| Method | Endpoint | Mô Tả | Bảo Mật |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra kết nối CSDL và trạng thái máy chủ | Public |
| `GET` | `/api/v1/auth/me` | Lấy hồ sơ tài khoản hiện tại | Bearer Token |
| `PATCH` | `/api/v1/auth/me` | Cập nhật họ tên, avatar URL | Bearer Token |
| `GET` | `/api/v1/categories` | Danh sách danh mục | Public |
| `GET` | `/api/v1/amenities` | Danh mục tiện nghi chuẩn | Public |
| `GET` | `/api/v1/listings` | Tìm kiếm & lọc chỗ ở nâng cao (chống trùng lịch) | Optional Token |
| `GET` | `/api/v1/listings/:id` | Chi tiết chỗ ở + Photos + Amenities | Optional Token |
| `GET` | `/api/v1/favorites` | Danh sách chỗ ở yêu thích | Bearer Token |
| `POST` | `/api/v1/favorites/toggle` | Thêm / xóa yêu thích | Bearer Token |
| `GET` | `/api/v1/listings/:id/reviews` | Danh sách bài đánh giá (phân trang) | Public |
| `POST` | `/api/v1/listings/:id/reviews` | Đăng bài đánh giá (tự động cập nhật `rating_avg`) | Bearer Token |
| `POST` | `/api/v1/bookings/quote` | Tính toán phân rã chi phí chi tiết | Public |
| `POST` | `/api/v1/bookings` | Đặt phòng (Transaction + `SELECT FOR UPDATE`) | Bearer Token |
| `GET` | `/api/v1/bookings` | Lịch sử đơn đặt phòng (lọc theo tab) | Bearer Token |
| `GET` | `/api/v1/bookings/:id` | Chi tiết đơn đặt phòng | Bearer Token |
| `PATCH` | `/api/v1/bookings/:id/cancel` | Hủy đơn và hoàn tiền | Bearer Token |
| `GET` | `/api/v1/payments/:bookingId/receipt` | **Stream file PDF hóa đơn/biên lai bằng `pdfkit`** | Bearer Token |
