# Traveling App

Monorepo cho ứng dụng đặt phòng du lịch:

```text
TravelingApp/
├── traveling-mobile/    # React Native + Expo Web + TypeScript
└── traveling-server/    # Node.js + Express + TypeScript
```

## Frontend

```powershell
cd traveling-mobile
npx expo start --web
```

Frontend chạy mặc định tại `http://localhost:8081`.

## Backend

Backend nằm độc lập trong `traveling-server/`. MongoDB và Stripe chưa được
giả định là đã cấu hình; xem `traveling-server/.env.example` trước khi cài
dependency và khởi động backend.
