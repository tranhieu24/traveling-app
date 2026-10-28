# Bằng chứng xác minh và giới hạn

Tài liệu này lưu kết quả kiểm thử lịch sử của lần bàn giao ngày 27/10/2026 (Asia/Bangkok), trước khi gộp backend vào cấu trúc chính. Khi đó, 68 hash được dùng để đối chiếu source backend/mobile/database trước thay đổi. Các hash lịch sử không chứng minh tính toàn vẹn của source sau lần gộp; xem [CONSOLIDATION.md](CONSOLIDATION.md) để biết kết quả kiểm tra cấu trúc hiện tại.

## Kết quả đã ghi nhận ngày 27/10/2026

- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; build Express/TypeScript thành công.
- `npm test`: exit 0, **34/34 nhóm đạt, 0 lỗi** trên một cluster PostgreSQL **18.4** cục bộ mới.
- `npm run docs:generate`: exit 0; SwaggerParser xác thực OpenAPI 3.0.3, sinh **56 operation**, Postman collection/environment và API_REFERENCE.
- Test đối chiếu **tất cả routes thực tế** với OpenAPI và số request trong Postman; token/signature trong environment mẫu đều để trống.
- HTTP API chạy với role `traveling_backend`; test anon/authenticated không được đọc booking riêng hoặc sửa role; runtime không xóa audit.
- Xuất Excel thực tế được đọc lại bằng ExcelJS; PDF thực tế tải qua HTTP có token được kiểm tra signature/cache và render một trang để xem bố cục, không thấy clipping/chồng chữ trong fixture hai lần thanh toán.
- [test-results.json](test-results.json) chứa kết quả của lần chạy thành công mới nhất; đọc `startedAt` để xác định thời điểm. File có thể được cập nhật bởi `npm run test:isolated` sau lần bàn giao này. [original-integrity.json](original-integrity.json) và [original-sha256.json](original-sha256.json) chỉ là hồ sơ bảo toàn source lịch sử của ngày 27/10/2026. Log cũ không được sao chép vào cấu trúc chính.

Bộ test gồm nhiều assertion trong từng nhóm, không coi “34 nhóm” là tổng số assertion. Test gọi API trực tiếp, kiểm tra dữ liệu sau request và thử bypass bằng SQL; concurrency dùng Promise.all trên các HTTP request riêng đến PostgreSQL thật, không dùng database in-memory giả.

## Phạm vi đã kiểm chứng

Lịch thật/ngày quá khứ/thứ tự/sức chứa; hai booking cùng lịch chỉ một request thành công; constraint độc lập và booking nối tiếp; server bỏ qua tổng tiền frontend; cọc 30 USD + balance/idempotency; ownership/PDF; completed/review duplicate đồng thời; cancellation/approval/refund; webhook chữ ký/amount/replay đồng thời; failed/timeout/late settlement; coupon quota đồng thời qua nhiều listing, hạn/min subtotal/per-user limit; admin CRUD/soft hide/audit; khóa tài khoản/marker retry; RLS/grants trong fixture; tax snapshot; báo cáo giao dịch và Excel.

Các lỗi thực tế được tìm và sửa trong kiểm thử gồm: xung đột suy luận kiểu PostgreSQL text/varchar ở các tham số dùng lại, alias truy vấn doanh thu, DATE parser làm sai phép so sánh checkout. Những lần test thất bại không được coi là nghiệm thu; các con số trong phần này chỉ mô tả lần bàn giao lịch sử. Kết quả kiểm tra sau lần gộp được ghi riêng trong CONSOLIDATION.md.

## Những việc chưa có bằng chứng đầu cuối

- Không đọc secrets/source .env và không kết nối/chỉnh database đang hoạt động.
- Supabase Auth getUser/ban/email/signOut được **stub trong tiến trình test**; schema auth.users/sessions/refresh_tokens của test là fixture. Chưa xác nhận schema/grants/policies/trigger/token behavior của Supabase hosted.
- Request PaymentIntent/refund Stripe được **stub**; việc xác minh chữ ký dùng SDK Stripe thật và payload fixture có chữ ký. Chưa dùng test account/key thật, chưa có giao dịch qua Internet, chưa xác nhận mobile Stripe SDK.
- Postman được sinh/đối chiếu cấu trúc và route; chưa chạy collection qua Postman CLI vào staging.
- PDF đã xem trên fixture ngắn; chưa kiểm tra mọi dữ liệu ngôn ngữ/dài hoặc trên mọi thiết bị.
- Không triển khai email, UI/admin portal, OTP/social setup, benchmark tải/uptime, tự đối soát provider hoặc live payment.
- Chưa chạy migration trên Supabase. Cần preflight/backup/staging; migration 003 phụ thuộc bảng session Auth của môi trường thực tế.

Thông tin này phải được giữ cùng tài liệu bàn giao để không nhầm “test cục bộ đạt” với “hệ thống hosted đã nghiệm thu”.

