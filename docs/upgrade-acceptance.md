# Nghiệm thu Giai đoạn 0–1

Ngày kiểm tra: 03/11/2026. Windows; PostgreSQL nhúng 18.4 riêng cho test. Không sửa database hosted, chạy seed legacy, bật live, commit/push/deploy.

| Mã | Trước → sau | Bằng chứng và phần còn lại |
| --- | --- | --- |
| AUTH-01 | Callback vào khách → role server, chống effect lặp, chặn iframe và retry an toàn | Auth/upgrade fixture đạt; chưa consent Google/Facebook thật |
| BOOK-01 | Checkout tối giản → liên hệ/yêu cầu/chính sách, snapshot, khóa retry và kiểm tra giá/version | Integration stale quote/concurrent identity đạt; cần migration staging và UI thiết bị |
| BOOK-02 | Hold khó thấy → đồng hồ server, kiểm tra/đặt lại; confirmed không bị hold cũ chặn | Integration expiry/late success + mobile regression đạt; chưa test background/resume thật |
| PAY-01 | Chỉ mock → Stripe test web/native, xác nhận server, chờ webhook, retry, trả đủ sau cọc | SDK stub + HMAC thật và mobile tests đạt; chưa giao dịch Stripe account đầu cuối |
| REVIEW-01 | Sáu điểm suy diễn → chỉ overall rating thật | API không trả alias; đạt local |
| REVIEW-02 | Tải mọi review → từng trang 12 và summary riêng | API aggregate và mobile số request/trang đạt local |
| MEDIA-01 | Picsum seed → catalog nguồn rõ, provenance xuyên API, apply/restore có bảo vệ | CLI thật trên DB fixture đạt; chưa áp target dùng chung, thiếu ảnh property |
| UX-01 | Nhãn pha trộn → Việt hóa luồng chính, ngày/tiền, form cuộn và token | TypeScript, native style fixture, HTML preview; chưa nghiệm thu UI tương tác, nội dung phụ còn tiếng Anh |

Giai đoạn 0 đã hoàn thành tài liệu. Giai đoạn 1 có bản triển khai local để review, **chưa nghiệm thu toàn bộ** khi thiếu provider thật, ảnh property và kiểm tra giao diện. Chưa triển khai AI, nên chưa tạo `ai-setup.md` hoặc khẳng định có chức năng AI.

## Kiểm thử thực tế

- Backend `npm run typecheck` và `npm run build`: exit 0.
- Backend `npm run test:isolated`: **40 passed, 0 failed**, exit 0; bắt đầu `2026-11-03T15:56:11.058Z`. [test-results.json](test-results.json) ghi từng nhóm và môi trường; wrapper xác nhận `.env` chính không đổi.
- Mobile `npx --no-install tsc --noEmit`: exit 0.
- Năm suite auth/admin/sdk/native-ui/upgrade: **61 passed, 0 failed**, exit 0.
- Expo export web/Android/iOS: **exit 0**, output `traveling-app-mobile/dist/upgrade-check`; web 2921 modules, Android 3709, iOS 3714. Build bundle không chứng minh đã cài/chạy thiết bị.
- `node scripts/render-upgrade-preview.cjs`: exit 0; checkout/payment component thật với dữ liệu fixture, ở `traveling-app-mobile/dist/upgrade-preview`.
- OpenAPI/Postman: integration đối chiếu toàn bộ route, 61 operations và token mẫu trống. Có review-summary/payment config và snapshot/provenance.

Supabase Auth và request mạng Stripe được stub. Chữ ký webhook dùng SDK thật với secret fixture. Chưa gửi giao dịch tới tài khoản Stripe hoặc hoàn tất Google/Facebook thật. Sự cố duyệt lệnh ở lượt trước đã được giải quyết; bộ backend cuối đã chạy thành công.

## Độ phủ ảnh

- Kiểm kê **15 listing seed**, chuẩn bị **15 ảnh địa điểm**; nguồn Wikimedia Commons, tác giả/giấy phép từng file trong [catalog](media-catalog.json).
- 15/15 URL đã tải HTTP 200 với JPEG rộng 1280px ở lần kiểm tra; đã xem ảnh thực tế bằng contact sheet. Không đảm bảo URL sẽ luôn hoạt động.
- **15 listing có minh họa; 0 property được xác minh; 0 listing trong database dùng chung được cập nhật trong lượt này.** Cả 15 còn thiếu ảnh property; chưa đạt mục tiêu 4–6 ảnh hữu ích/chỗ ở.
- Không ghép ảnh phòng từ cơ sở khác để đủ số lượng. Ảnh địa điểm chỉ dùng demo có nhãn, không chứng minh vị trí/chất lượng property mang tên seed.
- [Preview ảnh](media-preview.html) có nguồn, giấy phép, caption và cảnh báo ngữ cảnh. Attribution truyền vào app qua media_context.

## UI chưa xác minh

Computer-use đã dừng vì không xác định được URL Chrome đủ chắc chắn để thực thi chính sách công cụ. Không tiếp tục điều khiển browser sau thông báo đó. **Chưa có screenshot nghiệm thu UI**, chưa xác nhận crop/bàn phím/thao tác ở 360px hoặc native. HTML fixture không phải E2E; native style tests không phải kết quả chạy iPhone.

Các ca cần chạy nằm trong [runbook nâng cấp](upgrade-runbook.md). Cần cấu hình provider test do chủ project quản lý, thiết bị/development build và nguồn ảnh chủ cơ sở để đóng các phần còn lại.

## Rollout và quay lui

Migration 005 additive cần áp trước backend mới, không tự chạy ở startup. Booking cũ không bị gán acceptance. Quay lui ứng dụng có thể giữ cột mới; nếu xóa phải export snapshot/provenance và bỏ consumer trước. Media apply có backup riêng, restore từ chối ghi đè thay đổi sau apply. Xem runbook để chọn target và kiểm tra trước/sau.
