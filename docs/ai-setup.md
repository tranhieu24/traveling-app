# Cấu hình AI cho Traveling App

Backend hỗ trợ hai provider: **Gemini** và **OpenAI**. Frontend dùng cùng
`POST /api/v1/ai/search` và `POST /api/v1/ai/help` với cả hai provider.
Bong bóng chat dùng `POST /api/v1/ai/chat` để phối hợp tra dữ liệu công khai
và trợ giúp bằng FAQ.

## Gemini

Tạo key trong [Google AI Studio](https://aistudio.google.com/apikey), rồi cấu hình
`traveling-app-backend/.env`:

```env
AI_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-3.6-flash
GEMINI_API_KEY=
OPENAI_API_KEY=
AI_TIMEOUT_MS=12000
AI_MAX_OUTPUT_TOKENS=1200
AI_DAILY_REQUESTS_PER_USER=20
AI_DAILY_TOKEN_BUDGET=100000
```

Điền key Google vào `GEMINI_API_KEY`. Backend gửi key qua header
`x-goog-api-key` đến Gemini API. Khóa authorization mới của Google AI Studio
cũng được hỗ trợ. Không đặt khóa Google vào `OPENAI_API_KEY`.

Gemini có free tier với hạn mức tùy model/project. Kiểm tra
[bảng giá](https://ai.google.dev/gemini-api/docs/pricing) và quota của project
trước khi sử dụng. Một model xuất hiện trong danh sách chưa bảo đảm project mới
gọi được model đó: nếu `gemini-2.5-flash` trả 404 khi sinh nội dung, chọn model
Flash còn được cấp quyền. Không tự chuyển sang model khác trong một yêu cầu.

## OpenAI

```env
AI_ENABLED=true
AI_PROVIDER=openai
AI_MODEL=gpt-6-luna
OPENAI_API_KEY=
GEMINI_API_KEY=
```

Điền key OpenAI vào `OPENAI_API_KEY`. Model phải hỗ trợ Responses API và
Structured Outputs, đồng thời được cấp quyền cho project của key.
Ví dụ trên dùng một model đang có trong
[danh mục OpenAI](https://developers.openai.com/api/docs/models).
Tài khoản cần có credit API để sinh nội dung; thay tên model không khắc phục
lỗi hết credit.

Sau khi chỉnh `.env`, khởi động lại backend bằng `npm run dev`.

## Luồng sử dụng

- **Bong bóng chat:** hỗ trợ chào hỏi, hỏi rõ tên phòng và tra chỗ ở theo tên,
  thành phố hoặc danh mục như Camping. Tên, giá niêm yết, sức chứa, tiện nghi
  và liên kết chi tiết lấy từ các chỗ ở đang hoạt động, không do model tạo ra.
  Câu hỏi tiếp theo có thể gửi `listingId` công khai; backend đọc lại dữ liệu
  và kiểm tra trạng thái hiển thị. Không nhận lịch sử hội thoại hay dữ liệu đơn.
  Các nhánh này và FAQ theo chủ đề xác định không gọi model, vẫn dùng được khi
  hết hạn mức. Câu hỏi khác dùng tra cứu FAQ và hiển thị rõ khi chuyển dự phòng.
  Giá trong chat là giá niêm yết mỗi đêm; chọn ngày và số khách để báo giá và
  kiểm tra phòng trống. Chat không tự đặt, hủy, thanh toán hay hoàn tiền.
- **Tìm kiếm:** mở mục tìm kiếm trong app → **Tìm chỗ ở với AI**.
  AI trích xuất bộ lọc; backend xác minh thành phố, tiện nghi, ngày, số khách
  và ngân sách trước khi truy vấn các chỗ ở thật trong database.
- **Trợ giúp:** mở Help Center → **Trợ giúp với AI**.
  Model chỉ chọn bài FAQ đã duyệt; backend trả nội dung và nguồn thật.
- **Chi tiết đơn:** chủ đơn có thể xem giải thích trạng thái và số tiền.
  Số liệu lấy trực tiếp từ database, không gửi thông tin đặt phòng cho model.
- **Gợi ý phòng trong chat:** yêu cầu như “tôi muốn đặt phòng camping” mở luồng
  hỏi điểm đến, ngày nhận/trả và số khách. Các câu trả lời tiếp theo được giữ
  trong `searchContext` có schema giới hạn, không gửi lịch sử chat tự do.
  Nhận ngày ISO hoặc ngày/tháng/năm; ngày đã qua, thiếu năm hay không hợp lệ
  phải được sửa, không tự đổi năm hoặc mặc định một đêm. Khi đủ điều kiện,
  truy vấn lại loại chỗ ở, thành phố, sức chứa và phòng trống trong database.
  Ngân sách tùy chọn phải là USD mỗi đêm; không tự quy đổi hay nới điều kiện.
  Các yêu cầu chưa hỗ trợ được hỏi rõ thay vì bỏ qua. Nút **Tìm mới** xóa điều
  kiện cũ. Luồng này chỉ đọc, chưa tạo đơn và chưa thanh toán.
- Thiếu thông tin, điều kiện chưa hỗ trợ hoặc không có phòng phù hợp được
  thông báo rõ. AI không tự nới bộ lọc, tạo đơn, hủy đơn hoặc thanh toán.

## Database và giới hạn

Chạy các migration nền tảng trước, sau đó
[014_ai_usage_budget.sql](../database/migrations/014_ai_usage_budget.sql).
Bảng `ai_usage_daily` lưu số lượt/token; không lưu câu hỏi, API key, IP thô
hoặc nội dung đặt phòng. Hai provider dùng chung giới hạn hiện có.

`AI_ENABLED=false`, thiếu key/model, provider lỗi hoặc hết quota đều trả trạng
thái dự phòng để người dùng tiếp tục tìm kiếm thủ công và đọc FAQ.

Key chỉ nằm trong backend `.env`; không đưa vào `EXPO_PUBLIC_*`, mobile hoặc
Git. Không bật ghi log nội dung header xác thực.

## Kiểm tra

Trong `traveling-app-backend`:

```sh
npm run typecheck
npm run test:ai
npm run test:ai:integration
npm run test:ai:integration:gemini
```

Hai bộ kiểm tra integration tạo PostgreSQL tạm và giả lập provider,
không dùng key hay dữ liệu Supabase thật. Kiểm tra provider bao gồm schema,
timeout, phản hồi bị chặn/cắt ngắn, giới hạn kích thước, phân tách key và
việc chọn đúng provider.

Tài liệu chính thức:
[Gemini API](https://ai.google.dev/api),
[Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output),
[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
