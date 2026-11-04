# Hướng dẫn cài đặt AI — Traveling App Phase 3

## Tổng quan

Phase 3 bổ sung hai tính năng AI vào ứng dụng:

| Tính năng | Endpoint | Mô tả |
|-----------|----------|-------|
| **AI-01 Tìm kiếm bằng ngôn ngữ tự nhiên** | `POST /api/v1/ai/search` | Người dùng mô tả nhu cầu bằng tiếng Việt → AI trích xuất bộ lọc → trả về danh sách chỗ ở thực từ DB |
| **AI-02 Trợ lý trợ giúp** | `POST /api/v1/ai/help` | Trả lời câu hỏi về đơn đặt chỗ, chính sách, tiện nghi — chỉ từ dữ liệu DB và bài FAQ đã được kiểm duyệt |

---

## Yêu cầu biến môi trường

Thêm vào file `traveling-app-backend/.env` (không commit lên Git):

```env
# ── AI Feature Flag ─────────────────────────────────────────────────
AI_ENABLED=false          # Đặt thành true để bật AI; false = fallback thủ công
AI_PROVIDER=openai        # Chỉ hỗ trợ openai

# ── Model & Key ──────────────────────────────────────────────────────
AI_MODEL=gpt-4o-mini      # Khuyến nghị: gpt-4o-mini (tiết kiệm) hoặc gpt-4o
OPENAI_API_KEY=sk-...     # Lấy tại platform.openai.com/api-keys — KHÔNG để vào mobile

# ── Giới hạn hiệu suất ───────────────────────────────────────────────
AI_TIMEOUT_MS=12000             # Timeout mỗi request (ms), 1000–30000
AI_MAX_OUTPUT_TOKENS=1200       # Token output tối đa, 256–4000
AI_DAILY_REQUESTS_PER_USER=20   # Số request AI tối đa mỗi user mỗi ngày
AI_DAILY_TOKEN_BUDGET=100000    # Tổng token tối đa toàn hệ thống mỗi ngày
```

> **CẢNH BÁO:** `OPENAI_API_KEY` và `AI_ENABLED=true` chỉ được đặt trong backend `.env`.
> Tuyệt đối không dùng biến `EXPO_PUBLIC_*` cho bất kỳ secret AI nào.

---

## Lấy API Key

1. Đăng nhập tại [platform.openai.com](https://platform.openai.com)
2. Vào **API Keys** → **Create new secret key**
3. Copy key (chỉ hiện 1 lần), dán vào `OPENAI_API_KEY=` trong `.env`
4. Đặt Usage Limit tại **Settings → Limits** để kiểm soát chi phí

**Chi phí ước tính (gpt-4o-mini):** ~\$0.00015/1K input tokens · ~\$0.0006/1K output tokens.
Với `AI_DAILY_TOKEN_BUDGET=100000` và 100 user/ngày: **~\$0.08/ngày**.

---

## Bật / Tắt AI

```env
# Bật AI
AI_ENABLED=true
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your-real-key

# Tắt AI (fallback thủ công)
AI_ENABLED=false
```

Khi `AI_ENABLED=false` hoặc key trống:
- Mobile nhận `mode: "fallback"` với thông báo tiếng Việt hướng dẫn tìm thủ công
- Không có lỗi; trải nghiệm vẫn hoàn chỉnh qua bộ lọc thông thường

---

## Kiến trúc bảo mật

```
Mobile App
   │  POST /api/v1/ai/search  { message, timeZone }
   │  POST /api/v1/ai/help    { message, bookingId? }
   ▼
Backend (Express)
   ├── Rate limit: 10 req/min toàn cục · 6 req/min/user
   ├── Zod validate: message max 800 ký tự
   ├── redactAiInput(): xoá email, JWT, số điện thoại, API key trước khi gửi AI
   ├── reserveAiBudget(): kiểm tra quota trước khi gọi AI
   ├── OpenAiProvider → openai.com API (key chỉ ở backend)
   └── normalizeIntent() → validate destination/amenity với DB thực
```

**Nguyên tắc không thể thương lượng:**
- Key AI chỉ ở backend, không bao giờ trong mobile bundle
- AI không được bịa listing ID, giá, số điện thoại, URL bên ngoài
- Mọi `sourceRefs` phải là ID tồn tại trong DB hoặc danh sách FAQ cứng
- PII (email, số ĐT) bị redact trước khi gửi AI
- Booking của user khác: yêu cầu xác thực, không tiết lộ nếu không phải chủ đơn

---

## Migration cần thiết

Bảng `ai_usage_daily` được tạo bởi migration. Nếu chưa chạy, chạy:

```sql
-- Chạy trên Supabase SQL Editor nếu bảng chưa tồn tại
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  day            date        NOT NULL,
  scope_key      text        NOT NULL,
  requests       integer     NOT NULL DEFAULT 0,
  reserved_tokens bigint     NOT NULL DEFAULT 0,
  input_tokens   bigint      NOT NULL DEFAULT 0,
  output_tokens  bigint      NOT NULL DEFAULT 0,
  failures       integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (day, scope_key)
);
```

---

## Kiểm thử

### Chạy test AI (không cần network, không cần key thật)

```bash
cd traveling-app-mobile
node --test scripts/ai.test.cjs
# → 30 tests pass
```

### Chạy toàn bộ test suite

```bash
node --test scripts/*.test.cjs
# → 99 tests pass (69 cũ + 30 AI)
```

### Test thủ công với backend đang chạy

```bash
# Với AI_ENABLED=false (fallback)
curl -X POST http://localhost:3000/api/v1/ai/search \
  -H "Content-Type: application/json" \
  -d '{"message":"Homestay Đà Lạt cho 2 người","timeZone":"Asia/Ho_Chi_Minh"}'
# Kết quả: { mode: "fallback", ready: false, message: "AI chưa được bật..." }

# Với AI_ENABLED=true và key thật
curl -X POST http://localhost:3000/api/v1/ai/search \
  -H "Content-Type: application/json" \
  -d '{"message":"Tìm homestay Đà Lạt cho 2 người có wifi dưới 100 USD/đêm cuối tuần này","timeZone":"Asia/Ho_Chi_Minh"}'
```

---

## 10 Test cases NLP tiếng Việt

| # | Input | Kỳ vọng |
|---|-------|---------|
| 1 | `"Homestay Đà Lạt cho 2 người"` | city=Đà Lạt, guests=2, hỏi ngày & ngân sách |
| 2 | `"Tìm chỗ ở Hội An cuối tuần này dưới 80 USD"` | dateKind=this_weekend, maxPrice=80, hỏi số khách |
| 3 | `"Villa Đà Nẵng 3 khách 15/01 - 18/01/2027 có hồ bơi"` | checkIn=2027-01-15, amenities=[Pool] |
| 4 | `"Phòng Nha Trang 500 nghìn/đêm"` | Hỏi lại: app dùng USD, không tự quy đổi VND |
| 5 | `"Cần chỗ ở Sapa 2 phòng ngủ"` | propertyType/rooms không phải filter trực tiếp → unsupported |
| 6 | `"Homestay có wifi gần biển cho pets"` | amenities=[Wifi], "gần biển"/"pets" → unsupported |
| 7 | `"cho thuê nhà nguyên căn Hà Nội tháng 12"` | destination=Hà Nội (không có trong catalog) → hỏi lại điểm đến |
| 8 | `"Tìm chỗ bất kỳ miễn rẻ"` | Hỏi: thành phố, ngày, số khách, ngân sách |
| 9 | `"Da Lat homestay 2 people next weekend under $60"` | Tiếng Anh cũng được xử lý: city=Đà Lạt, maxPrice=60 USD |
| 10 | `"Đặt phòng ngay cho tôi"` | ready=false, hỏi đầy đủ thông tin; không tự đặt |

---

## Giám sát chi phí

Xem usage thực tế:

```sql
-- Supabase SQL Editor
SELECT day, scope_key, requests, input_tokens, output_tokens, failures
FROM ai_usage_daily
WHERE day >= CURRENT_DATE - 7
ORDER BY day DESC, scope_key;
```

Đặt alert tại OpenAI Platform khi chi phí vượt ngưỡng định trước (Settings → Limits → Set budget alert).

---

## Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `mode: "fallback", reason: "disabled"` | `AI_ENABLED` không phải `true` | Kiểm tra `.env` và restart server |
| `mode: "fallback", reason: "provider_error"` | Key sai hoặc hết quota OpenAI | Kiểm tra key tại platform.openai.com |
| `mode: "fallback", reason: "quota"` | Vượt `AI_DAILY_REQUESTS_PER_USER` | Tăng limit hoặc đợi sang ngày mới |
| `mode: "fallback", reason: "invalid_output"` | Model trả schema sai | Thử lại; nếu thường xuyên → kiểm tra AI_MODEL |
| Rate limit 429 | Quá 6 req/min/user hoặc 10 req/min toàn cục | Đợi 1 phút |
| `ai_usage_daily` không tồn tại | Migration chưa chạy | Chạy SQL tạo bảng ở mục Migration phía trên |

