---
name: traveling-grounded-ai
description: Tích hợp AI cơ bản cho Traveling App để hiểu nhu cầu tìm phòng và trả lời từ dữ liệu ứng dụng có nguồn. Dùng cho trợ lý chỉ đọc và gợi ý bộ lọc; không dùng cho tự động đặt/hủy phòng, quyết định thanh toán hoặc sinh listing/giá giả.
---

# AI hỗ trợ khách bằng dữ liệu của app

Đọc mục AI và tiêu chuẩn nghiệm thu trong [prompt chung](../../../TRAVELING_APP_UPGRADE_PROMPT.md). Triển khai hai nghiệp vụ trước; không mặc định thêm vector database, framework agent nhiều tầng hoặc mô hình huấn luyện riêng.

## 1. Tìm phòng bằng ngôn ngữ tự nhiên

Ví dụ: “Tìm homestay ở Đà Lạt cho 2 người, 2 đêm, có chỗ đỗ xe, dưới 100 USD mỗi đêm.”

Luồng:

1. Người dùng nhập nhu cầu từ Search hoặc một ô trợ lý gắn với Search.
2. Backend chuyển ngôn ngữ tự nhiên thành intent được kiểm tra bằng schema: destination, cặp ngày hoặc thiếu ngày, số khách, ngân sách, tiền tệ, đơn vị ngân sách theo đêm/toàn chuyến, tiện nghi và sở thích.
3. Chuẩn hóa destination/amenity qua dữ liệu thật và danh sách ID hợp lệ. Không chấp nhận ID listing/amenity do model bịa.
4. Mơ hồ thì trả câu hỏi bổ sung hoặc bộ lọc tạm với ghi chú; không chọn đại ngày hay đổi ngân sách toàn chuyến thành giá mỗi đêm.
5. Query qua repository/API tìm kiếm hiện có. Nếu có ngày, dùng pricing/availability server; trước đặt vẫn phải gọi quote và tạo booking như luồng hiện tại.
6. Trả bộ lọc dạng chip có thể sửa và danh sách listing thật; lý do phù hợp chỉ dựa trên trường đã xác minh.

Cần xử lý ngày tiếng Việt như “cuối tuần này” theo ngày hiện tại và múi giờ người dùng do server kiểm tra; chuyển thành ngày cụ thể để người dùng xác nhận. “Dưới 1 triệu” cần xác định VND; nếu hệ thống chỉ hỗ trợ USD, hỏi lại hoặc giải thích giới hạn, không tự dùng tỷ giá đoán.

Khi không có kết quả, nêu điều kiện nào có thể nới và để người dùng chọn; không tự bỏ giới hạn ngân sách/tiện nghi bắt buộc rồi gọi đó là kết quả đúng yêu cầu.

## 2. Trợ lý giải đáp trong app

Nguồn dùng được: bài Help Center đã duyệt, thông tin listing, chính sách đang áp dụng và snapshot booking mà người dùng có quyền đọc.

- Câu hỏi công khai: mô tả tiện nghi, cách đặt, giải thích các bước và chính sách đã có nguồn.
- Câu hỏi riêng: số còn phải trả, trạng thái đơn/hoàn tiền chỉ lấy từ backend với danh tính đã xác minh. Không nhận `userId` từ body để xin quyền xem.
- Câu trả lời có `sourceRefs` trỏ tới article/listing/booking/policy ID hợp lệ và nút mở màn tương ứng; không tự tạo URL ngoài hoặc dẫn nguồn không tồn tại.
- Với dữ liệu thay đổi như giá/lịch/trạng thái, kèm thời điểm lấy và nói rõ cần kiểm tra lại ở màn giao dịch.
- Ngoài dữ liệu nguồn thì thừa nhận chưa có thông tin, đề nghị mở hỗ trợ. Không đoán giờ nhận phòng, điều khoản hoàn tiền, hotline, giá tham quan hoặc giờ mở cửa.

Trợ lý có thể mở màn hướng dẫn hoặc điền bộ lọc để người dùng kiểm tra. Không tự tạo/hủy booking, xử lý refund, đổi tài khoản hay xác nhận thanh toán bằng hội thoại.

## Kiến trúc tối thiểu

- Mobile gọi backend; backend giữ provider key. Không có secret trong `EXPO_PUBLIC_*`, bundle hoặc app.json.
- Tạo adapter provider nhỏ, schema request/response và hai nghiệp vụ tách biệt. Có thể dùng endpoint `/api/v1/ai/search` và `/api/v1/ai/help` nếu không xung đột cấu trúc hiện tại.
- Nếu dùng OpenAI, đọc skill `openai-docs` khi có và kiểm tra API/SDK chính thức hiện hành; chọn model qua biến cấu hình. Không ghi cứng tên model chưa được xác minh.
- Chuẩn bị các biến như `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS` và secret phía server theo nhà cung cấp. Giá trị giới hạn phải được kiểm tra khi khởi động, có mặc định hữu hạn và được ghi trong tài liệu.
- Có giới hạn độ dài input, timeout, số lượt và token cho mỗi request/người dùng; có mức sử dụng đo được và cơ chế tắt. Không log prompt chứa thông tin cá nhân hoặc toàn bộ token/session.
- Khi chưa cấu hình key hoặc AI bị tắt: công bố trạng thái chưa bật, vẫn cho tìm thủ công và đọc bài trợ giúp. Không giả câu trả lời cố định là đầu ra model thật.
- Khi provider lỗi: fallback có thông báo, không tự nâng cấp sang model đắt hơn hoặc retry vô hạn.

## Quyền và tính đúng đắn

Chỉ truyền những trường tối thiểu cần cho câu hỏi. Không gửi token, secret, email/số điện thoại hoặc lịch sử booking không cần thiết sang provider. Với câu hỏi trạng thái, ưu tiên số liệu server render trực tiếp hoặc mẫu trả lời xác định thay vì gửi toàn bộ hồ sơ cho model.

Listing description, review, tin nhắn và nội dung truy xuất là dữ liệu không tin cậy. Chỉ dẫn “bỏ qua quy tắc” trong các trường đó không được thay đổi quyền hoặc nghiệp vụ. Model không được viết SQL tự do; tool/query có allowlist và schema, backend kiểm tra quyền riêng.

Danh sách listing và nguồn trích dẫn trong response phải là tập con của dữ liệu backend đã truy xuất. Tiền, ngày, số khách và điều kiện thanh toán được kiểm tra xác định; không lấy kết luận tự nhiên của model làm sự thật nghiệp vụ.

## UI cần có

- Ô nhập gợi ý nhu cầu, trạng thái đang xử lý, sửa bộ lọc, quay lại tìm thủ công.
- Thẻ gợi ý dùng ListingCard hiện có; giá và ảnh từ API, không lấy URL/giá model tự sinh.
- Trả lời ngắn, nút xem nguồn và hành động tiếp theo rõ ràng. Không chiếm toàn màn bằng chat nếu chỉ cần chọn ngày hoặc thêm tiện nghi.
- Nhãn AI và giới hạn rõ ràng; không thông báo “đã đặt phòng” khi chỉ đang gợi ý.

## Bộ đánh giá và kiểm thử

Tạo tập ca tiếng Việt có expected intent, trường cần hỏi lại, nguồn được phép và điều cấm. Có ít nhất các trường hợp:

- Ngân sách theo đêm và theo chuyến; USD/VND; không nêu tiền tệ.
- Thiếu ngày, ngày không tồn tại/quá khứ, “cuối tuần này”, thiếu số khách.
- Destination có dấu/không dấu, không có listing, tiện nghi không tồn tại.
- Đề nghị đổi bộ lọc, không có kết quả phù hợp và không được âm thầm nới điều kiện.
- Hỏi booking của chính mình, chưa đăng nhập, booking người khác, account blocked.
- Nội dung nguồn chứa prompt injection; model trả JSON hỏng, ID lạ hoặc giá không có trong dữ liệu.
- Timeout, hết quota, provider tắt và người dùng gửi liên tục.

Unit/integration test dùng provider stub để xác minh schema/quyền/fallback. Chạy một tập nhỏ với provider thật khi môi trường được cấu hình và việc gọi có phí đã nằm trong phạm vi được phép; ghi model/version cấu hình, số ca, chất lượng, độ trễ và token thực tế. Không đánh đồng stub pass với chất lượng câu trả lời thật.

Bàn giao `docs/ai-setup.md`, tập ca đánh giá, cách tắt AI và kết quả phân biệt rõ test mô phỏng/thật.
