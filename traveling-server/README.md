# Traveling App Backend

Backend độc lập cho Traveling App, dự kiến sử dụng Node.js, Express,
TypeScript, MongoDB/Mongoose và Stripe.

## Trạng thái hiện tại

Giai đoạn 1 đã hoàn tất:

- Node.js: `v24.11.0`
- npm: `11.6.1`
- Thư mục backend riêng: `traveling-server/`
- MongoDB và Stripe chưa được giả định là đã cấu hình.

## Quy tắc môi trường

1. Sao chép `.env.example` thành `.env`.
2. Thay `JWT_SECRET` bằng chuỗi ngẫu nhiên dài khi chạy thật.
3. Chỉ thêm `MONGO_URI` thật khi MongoDB đã được cài hoặc có MongoDB Atlas.
4. Chỉ thêm các biến Stripe sau khi tạo tài khoản và API key phù hợp.
5. Không commit `.env`.

## Dependency và scripts

Đã cài dependency cho Express, Mongoose, JWT, bcryptjs, Zod, Stripe,
dotenv, CORS, Helmet, rate limit, TypeScript, Jest và Supertest.

Các lệnh dự kiến:

```powershell
npm run dev
npm run typecheck
npm run build
npm test
```

Source code API sẽ được thêm theo từng giai đoạn tiếp theo.
