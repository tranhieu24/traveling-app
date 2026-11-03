# Prompt nâng cấp Traveling App: nghiệp vụ, hình ảnh và AI cơ bản

Ngày soạn: 03/11/2026. Căn cứ: source trong repository tại thời điểm rà soát; không coi dữ liệu seed là dữ liệu của cơ sở lưu trú đã xác minh.

## Cách sử dụng

Bộ tài liệu này là yêu cầu triển khai cho coding agent. Việc tạo tài liệu chưa thay đổi ứng dụng, database, URL ảnh hoặc cấu hình AI.

Gửi đoạn sau cho agent đang mở repository:

```text
Đọc docs/TRAVELING_APP_UPGRADE_PROMPT.md và các SKILL.md được dẫn trong tài liệu.
Hãy triển khai yêu cầu nâng cấp theo các giai đoạn đã quy định, bắt đầu từ việc
kiểm chứng hiện trạng. Tạo kế hoạch tiến độ và thực hiện code, migration, UI,
kiểm thử và tài liệu trong phạm vi được mô tả; không chỉ đưa ra lời khuyên.
Giữ kết quả có thể kiểm tra ở cuối mỗi giai đoạn. Nếu thiếu ảnh có quyền sử dụng,
credentials hoặc cấu hình ngoài project, hoàn thiện các phần độc lập trước,
nêu rõ phần chưa được xác minh và thông tin cụ thể còn thiếu.
```

Muốn làm từng phần, thêm một dòng: `Trong lượt này chỉ thực hiện Giai đoạn 1` hoặc `Chỉ thực hiện phần hình ảnh` hoặc `Chỉ thực hiện phần AI`.

Các skill trong bộ này được lưu cùng source để dễ chia sẻ, chưa được cài vào thư mục skill toàn máy. Agent phải đọc chúng theo đường dẫn; không giả định chúng đã có trong danh sách skill tự động.

## 1. Vai trò và kết quả cần đạt

Bạn là kỹ sư phụ trách sản phẩm đặt chỗ ở, React Native Expo, Express/TypeScript và PostgreSQL/Supabase. Nâng cấp Traveling App thành MVP có trải nghiệm đủ chi tiết và nhất quán để thử nghiệm với người dùng.

Ba mục tiêu bắt buộc:

1. Làm quy trình tìm phòng, đặt phòng và theo dõi sau đặt phòng rõ ràng, đáng tin cậy hơn.
2. Thay ảnh mang tính tượng trưng bằng bộ ảnh đã kiểm tra nguồn, đúng ngữ cảnh địa điểm và loại chỗ ở; không trình bày ảnh minh họa như ảnh thực tế đã xác minh.
3. Thêm AI cơ bản hỗ trợ tìm phòng bằng ngôn ngữ tự nhiên và giải đáp thông tin trong hệ thống.

Giữ định vị ban đầu là **đặt chỗ ở/homestay**, không tự mở rộng sang vé máy bay, tour, marketplace lớn hoặc hệ thống khách sạn nhiều kho phòng. Mục tiêu là hoàn thiện một chuỗi nghiệp vụ, không tăng số màn hình cho có.

## 2. Đọc ngữ cảnh và skill trước khi sửa

Đọc `AGENTS.md` áp dụng nếu có; kiểm tra Git và giữ các thay đổi của người dùng.

Đọc source hiện tại trước khi xác nhận một nhận xét cũ vẫn còn đúng. Các điểm vào chính:

- `README.md`, `docs/RUNBOOK.md`, `docs/API_REFERENCE.md`, `docs/VERIFICATION.md`.
- `traveling-app-mobile/src/navigation`, `src/context/AuthContext.tsx`, `src/services` và các màn hình liên quan.
- `traveling-app-backend/src/routes`, `src/repositories`, `src/domain`, `src/validators`.
- `database/schema.sql`, các migration đã có; chỉ đọc seed legacy để hiểu dữ liệu.

Đọc các skill sau theo công việc:

| Công việc | Skill phải đọc |
| --- | --- |
| Nghiệp vụ, thiết kế trải nghiệm, sửa luồng booking | [traveling-product-upgrade](upgrade-kit/skills/traveling-product-upgrade/SKILL.md) |
| Kiểm kê, tìm nguồn, thay ảnh và kiểm tra gallery | [traveling-contextual-media](upgrade-kit/skills/traveling-contextual-media/SKILL.md) |
| Tìm phòng bằng AI và trợ lý hỗ trợ | [traveling-grounded-ai](upgrade-kit/skills/traveling-grounded-ai/SKILL.md) |

Skill hệ thống chỉ dùng khi phù hợp và có sẵn trong môi trường thực thi:

- `openai-docs`: nếu chọn nhà cung cấp OpenAI, đọc skill và tài liệu chính thức hiện hành trước khi chọn API/SDK/model. Không đoán tên model hoặc giá.
- `computer-use:computer-use`: kiểm tra giao diện trên trình duyệt/thiết bị có thể điều khiển; người dùng tự thực hiện bước đăng nhập/cấp quyền nếu công cụ yêu cầu.
- `imagegen`: chỉ khi có yêu cầu tạo hình minh họa mới, ví dụ màn trống hoặc onboarding. Không dùng ảnh sinh làm bằng chứng ảnh thật của một chỗ ở.
- Postman CLI: đã được ghi nhận là có trên máy; dùng khi hữu ích cho kiểm tra hợp đồng API. Không gửi token vào collection bàn giao.

Không gọi Sites để thay thế app Expo trong repository. Không tự cài skill/plugin hoặc thêm dịch vụ trả phí chỉ để thực hiện bản nâng cấp này.

## 3. Danh sách điểm yếu cần xác minh và sửa

Ưu tiên P0 trước, sau đó P1. P2 là mở rộng, không được lấn thời gian sửa luồng chính.

| Mã | Mức | Hiện trạng cần kiểm chứng | Thay đổi cụ thể | Điều kiện nghiệm thu |
| --- | --- | --- | --- | --- |
| AUTH-01 | P0 | OAuth đã có code, nhưng chưa xác nhận được lỗi đăng nhập thực tế người dùng gửi | Tái hiện riêng bước mở provider, callback, đổi code và lấy hồ sơ; sửa theo bằng chứng; điều hướng admin/khách thống nhất | Email vẫn hoạt động; callback không lặp; hủy consent thoát được; lỗi có thông báo đúng bước; không tuyên bố OAuth thật đã đạt chỉ bằng stub |
| AUTH-02 | P1 | Có đổi mật khẩu, chưa thấy đầy đủ luồng quên mật khẩu | Thêm gửi link khôi phục, callback, đặt lại mật khẩu, trạng thái chờ và lỗi link | Link hết hạn có hướng quay lại; không lộ việc email có tồn tại; kiểm tra thiết bị và môi trường callback |
| BOOK-01 | P0 | Checkout còn thiếu ngữ cảnh vận hành | Bổ sung thông tin liên hệ cần thiết, yêu cầu đặc biệt, điều kiện lưu trú, xác nhận chính sách và tóm tắt giá trước đặt | Tên phòng/ngày/khách/giá giữ đúng qua các bước; server quyết định tổng tiền và sức chứa |
| BOOK-02 | P0 | Có giữ phòng nhưng trải nghiệm chờ/hết hạn cần rõ hơn | Hiển thị thời hạn giữ lịch từ server, tiếp tục thanh toán, thông báo hết hạn, lựa chọn đặt lại | Không đổi đồng hồ máy để kéo dài hold; hết hạn không báo thành công hoặc thu tiền sai |
| PAY-01 | P0 | UI checkout chỉ hoàn tất mock, backend có Stripe test | Làm adapter giao diện cho provider test, xử lý thành công/chờ/thất bại và phục hồi khi mất mạng; giữ nhãn mock | Thanh toán được xác nhận từ server/webhook; retry không tạo tiền trùng; không tự bật live |
| POLICY-01 | P1 | Cọc cố định 30 USD và quy tắc hủy còn đơn giản | Cấu hình chính sách cọc/hủy trên server, lưu bản chụp trong booking; hiển thị hạn trả phần còn lại và dự kiến hoàn | Booking cũ không đổi chính sách theo lần sửa mới; chỉ số tiền hoàn đã xác nhận mới tính là đã hoàn |
| TRIP-01 | P1 | Sau đặt phòng chủ yếu là xem trạng thái | Thêm timeline chuyến đi, hướng dẫn nhận phòng đã được quản trị cung cấp, liên hệ hỗ trợ và trạng thái hoàn tiền | Có hành động tiếp theo rõ ràng cho từng trạng thái, không tạo hướng dẫn hoặc số liên hệ giả |
| NOTIFY-01 | P1 | Chưa thấy gửi thông báo giao dịch hoàn chỉnh | Ghi sự kiện và gửi email qua adapter cho xác nhận, nhắc thanh toán, hủy/hoàn; thêm trạng thái gửi và thử lại | Không gửi trùng khi webhook lặp; không ghi đã gửi nếu provider chưa xác nhận; chế độ không cấu hình vẫn minh bạch |
| MEDIA-01 | P1 | Seed dùng Picsum theo ID, ảnh chưa có quan hệ với địa điểm | Kiểm kê và thay bộ ảnh theo skill media; đồng bộ cover/gallery/booking/admin | Mỗi ảnh có nguồn và trạng thái xác minh; ảnh thực tế và minh họa phân biệt được; không còn ảnh ngẫu nhiên trong danh mục đã nghiệm thu |
| REVIEW-01 | P1 | API alias điểm tổng thành nhiều điểm tiêu chí | MVP chỉ dùng điểm tổng hoặc triển khai thu thập/lưu tiêu chí thật; bỏ các điểm tiêu chí suy diễn | API và UI không mô tả số liệu chưa được người dùng đánh giá |
| REVIEW-02 | P1 | Màn review đang tải hết các trang trước khi hiển thị | Tải thêm theo trang; lấy thống kê từ API tổng hợp | Xem trang đầu không cần tải toàn bộ review, không mất biểu đồ/tổng số chính xác |
| HELP-01 | P1 | Inbox hiện là màn rỗng | Làm yêu cầu hỗ trợ gắn booking, gửi nội dung và xem trạng thái; admin tiếp nhận/phản hồi | Chỉ chủ booking hoặc người có quyền xem được; không giả là chat realtime khi chưa có realtime |
| UX-01 | P1 | Ngôn ngữ khách/admin pha trộn, trạng thái còn rời rạc | Chuẩn hóa tiếng Việt mặc định, design tokens, component dùng chung, trạng thái tải/rỗng/lỗi | Không che nút bởi bàn phím; không cắt nội dung ở màn nhỏ; giá và nhãn trạng thái nhất quán |
| AI-01 | P1 | Chưa có tìm kiếm ngôn ngữ tự nhiên | Chuyển câu tiếng Việt thành bộ lọc có cấu trúc và kết quả lấy từ API hiện có | Không sinh listing hoặc giá; bộ lọc được người dùng xem/sửa; thiếu ngày/ngân sách thì hỏi lại |
| AI-02 | P1 | Trợ giúp hiện dựa trên bài viết tĩnh | Trả lời từ bài trợ giúp và dữ liệu booking được phép truy cập, có nguồn | Không bịa điều khoản; không đọc booking người khác; provider lỗi có fallback |
| OPS-01 | P1 | Chưa có bằng chứng cron, giám sát và CI triển khai | Kiểm tra job hết hạn, health, log an toàn, kiểm tra tự động trước merge; thêm cơ chế phù hợp | Booking hết hạn được xử lý có quan sát được; webhook không bị giới hạn sai bởi limiter chung |
| EXT-01 | P2 | Chưa có portal chủ nhà/tồn nhiều phòng/bản đồ tìm kiếm tích hợp | Ghi phương án và phụ thuộc; chỉ triển khai khi được yêu cầu riêng | Không phá mô hình homestay một listing một đơn vị hiện tại |

Những file gợi ý để xác minh: `src/services/bookingPayment.ts`, `src/screens/AuthCallbackScreen.tsx`, `src/services/listingDetail.ts` ở mobile; `src/repositories/review.repository.ts`, `src/repositories/payment.repository.ts`, `src/app.ts` ở backend; `database/seed.sql`.

## 4. Tiêu chuẩn trải nghiệm muốn đạt

Luồng khách cần thể hiện được:

```text
Khám phá/tìm phòng (thủ công hoặc AI)
  → xem danh sách, bộ lọc và tổng giá có ngày
  → xem ảnh, thông tin phòng, vị trí, tiện nghi và chính sách
  → chọn ngày/khách, nhận báo giá server
  → rà soát thông tin liên hệ, yêu cầu đặc biệt, chính sách và số tiền
  → tạo booking pending, có thời hạn giữ lịch
  → thanh toán cọc hoặc đủ, theo dõi xác nhận server
  → chuyến đi: trạng thái, việc cần làm, hướng dẫn nhận phòng và hỗ trợ
  → hoàn thành theo điều kiện backend, rồi mới đánh giá
```

Nhánh hủy phải tách riêng: xem chính sách và số tiền dự kiến → xác nhận hủy → yêu cầu hoàn → xử lý → kết quả. Không dùng một thông báo thành công chung để thay thế cả chuỗi.

Không tăng số bước nếu không giúp khách ra quyết định. Có thể dùng một màn tổng hợp tốt thay vì nhiều màn nhỏ. Tiếp tục cho người chưa đăng nhập xem phòng; chỉ yêu cầu đăng nhập khi nghiệp vụ cần danh tính.

Không đổi USD thành VND bằng cách sửa nhãn. Nếu bổ sung tiền tệ, phải thiết kế lại định dạng, đơn vị tiền nhỏ nhất, snapshot, provider và kiểm thử; giữ USD hiện tại nếu chưa làm đầy đủ.

## 5. Cách triển khai theo giai đoạn

### Giai đoạn 0 — Kiểm chứng và chốt thiết kế

- Lập `docs/upgrade-audit.md`: mã yêu cầu, bằng chứng source, hiện trạng, thay đổi dự kiến, phụ thuộc và ưu tiên.
- Ghi thiết kế ngắn trong `docs/upgrade-design.md`: hành trình khách/admin, các trạng thái, dữ liệu mới, API và ảnh minh họa màn hình nếu công cụ cho phép.
- Phân biệt lỗi tái hiện được, hạn chế nghiệp vụ và đề xuất mở rộng. Không suy luận lỗi Google chỉ từ ảnh consent.
- Dùng mặc định hợp lý: tiếng Việt, mô hình homestay, giao dịch test/mock, AI chỉ đọc và đề xuất. Chính sách chưa được chủ sản phẩm chốt phải giữ tương thích và cấu hình được.

### Giai đoạn 1 — Luồng chính và ảnh

Sửa P0; thực hiện UX-01, REVIEW-01, REVIEW-02 và MEDIA-01. Thiết kế thành phần dùng chung trong app hiện tại, không dựng một landing page thay thế. Chuẩn bị nguồn ảnh và bản xem trước trước khi cập nhật dữ liệu dùng chung.

### Giai đoạn 2 — Sau đặt phòng

Thực hiện POLICY-01, TRIP-01, NOTIFY-01, HELP-01 và AUTH-02. Chính sách và thông tin nhận phòng phải có dữ liệu nguồn, có quyền xem phù hợp và lưu vết thay đổi cần thiết.

### Giai đoạn 3 — AI cơ bản

Thực hiện AI-01 và AI-02 theo skill AI. Lấy dữ liệu qua backend, bổ sung đánh giá chất lượng câu trả lời, giới hạn chi phí và fallback. Ưu tiên kết nối các màn hiện có thay vì thêm một cửa sổ chat rời rạc.

### Giai đoạn 4 — Nghiệm thu và bàn giao

Hoàn tất OPS-01, kiểm tra hồi quy toàn luồng, cập nhật OpenAPI/Postman và hướng dẫn môi trường. Nêu rõ phần đã chạy trên dịch vụ thật, phần stub và phần chưa có credentials.

Trong mỗi giai đoạn, làm hết các phần độc lập có thể thực hiện; không dừng toàn bộ vì một provider hoặc nguồn ảnh chưa sẵn có. Cập nhật tiến độ thực tế theo mã yêu cầu, không đánh dấu hoàn tất khi mới có giao diện.

## 6. Ràng buộc kỹ thuật và dữ liệu

- Giữ Expo/React Native, Express/TypeScript, PostgreSQL và Supabase Auth hiện có. Không tự nâng major dependencies hoặc đổi kiến trúc chỉ để triển khai yêu cầu này.
- API tiền, ngày, sức chứa, quyền xem, chuyển trạng thái và tồn phòng vẫn do backend xác nhận. AI và frontend không được tự xác nhận các thông tin đó.
- Giữ transaction, chống trùng lịch, idempotency thanh toán, lịch sử refund và kiểm tra quyền. Không xóa test đang phát hiện lỗi để làm build xanh.
- Migration phải có chiến lược tương thích dữ liệu cũ; ghi cách rollout/rollback và kiểm tra trước khi áp dụng. Không chạy lại seed legacy vì seed có ghi tài khoản Auth và giao dịch.
- Không ghi đè `.env`, không đưa secret vào mobile hoặc log. Chỉ bổ sung tên biến vào `.env.example` với giá trị mẫu không nhạy cảm.
- Sửa và kiểm tra local trong phạm vi yêu cầu. Với cập nhật database dùng chung, thay toàn bộ URL live, upload public hoặc bật thanh toán live: chuẩn bị bản thay đổi, kết quả dry-run và chỉ thực hiện khi đã có quyền rõ ràng cho môi trường đó.
- Không tự commit, push, merge hoặc deploy nếu chưa được yêu cầu. Không coi file prompt là quyền sửa dashboard Google/Meta/Supabase hoặc thay đổi tài khoản của người dùng.

## 7. Kiểm thử và bằng chứng

Chạy các lệnh phù hợp sau khi có thay đổi; ghi exit code thực tế, không sao chép kết quả lịch sử làm kết quả mới.

Backend:

```powershell
cd traveling-app-backend
npm run typecheck
npm run build
npm run docs:generate
npm run test:isolated
```

Mobile:

```powershell
cd traveling-app-mobile
npx tsc --noEmit
npm run test:auth
npm run test:admin
npm run test:sdk
npm run test:native-ui
npx expo export --platform all --output-dir dist/upgrade-check
```

Bổ sung test cho hành vi mới, tập trung vào rủi ro và kết quả quan sát được:

- Callback OAuth, đăng nhập/đăng xuất, quyền admin/khách và cache khi đổi tài khoản.
- Hai khách đặt trùng; mất mạng sau khi tạo đơn hoặc thanh toán; webhook lặp/đến chậm; hold hết hạn; cọc rồi trả phần còn lại.
- Chính sách snapshot, số tiền hoàn, gửi thông báo không trùng và yêu cầu hỗ trợ không lộ dữ liệu khác chủ.
- Cover/gallery đúng mapping; URL lỗi có fallback trung tính; không có ảnh ngẫu nhiên thay thế âm thầm.
- AI tiếng Việt, ngày mơ hồ, tiền tệ không khớp, không có kết quả, provider timeout, dữ liệu nguồn chứa chỉ dẫn độc hại, yêu cầu truy cập booking người khác.
- UI web rộng, web 360px và ít nhất một môi trường native nếu có; hỗ trợ bàn phím, vùng an toàn, ảnh chậm, thông báo lỗi và thử lại.

Nếu API mới chưa có kiểm thử, thêm script phù hợp với dự án và hướng dẫn chạy. Không thêm test chỉ kiểm tra chuỗi chữ hoặc sao chép logic triển khai.

## 8. Đầu ra bắt buộc khi thực hiện prompt

1. Source thay đổi theo giai đoạn, migration và cấu hình mẫu cần thiết.
2. `docs/upgrade-audit.md`, `docs/upgrade-design.md`, `docs/upgrade-progress.md`.
3. `docs/media-catalog.json`: nguồn và quyết định dùng ảnh cho từng listing/destination; báo cáo mục chưa đủ ảnh xác minh.
4. `docs/ai-setup.md`: provider, biến môi trường, giới hạn, cách tắt, cách chạy và fallback.
5. `docs/upgrade-acceptance.md`: yêu cầu đã đạt/chưa đạt, test, ảnh chụp, môi trường, cách tái hiện và hạn chế.
6. Hướng dẫn ngắn để chủ project chạy demo toàn chuỗi và kiểm tra ảnh/AI.

Khi báo cáo, dẫn file cụ thể và mô tả hành vi trước/sau. Không dùng nhãn “production-ready”, “ảnh thật đã xác minh” hoặc “thanh toán thật hoạt động” nếu chưa có bằng chứng tương ứng.
