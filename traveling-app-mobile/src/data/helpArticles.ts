export type HelpCategory = 'account' | 'bookings' | 'payments' | 'reviews';
export type HelpAction = 'search' | 'bookings' | 'favorites' | 'settings';

export const HELP_CATEGORIES: { id: HelpCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả chủ đề' },
  { id: 'account', label: 'Tài khoản' },
  { id: 'bookings', label: 'Đặt chỗ' },
  { id: 'payments', label: 'Thanh toán' },
  { id: 'reviews', label: 'Đánh giá' },
];

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  keywords: string;
  action?: { type: HelpAction; label: string };
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'browse', category: 'bookings', question: 'Tôi có thể khám phá chỗ ở mà không đăng nhập không?',
    answer: 'Có. Bạn có thể duyệt chỗ ở, dùng bộ lọc tìm kiếm, mở chi tiết và đọc đánh giá. Hãy đăng nhập khi muốn lưu yêu thích hoặc đặt chỗ.',
    keywords: 'khách chỗ ở phòng tìm kiếm khám phá',
    action: { type: 'search', label: 'Khám phá chỗ ở' },
  },
  {
    id: 'find-place', category: 'bookings', question: 'Làm thế nào để tìm chỗ ở cho chuyến đi?',
    answer: 'Dùng thanh tìm kiếm để chọn điểm đến, ngày đi và số khách. Chọn danh mục hoặc mở Bộ lọc để thu hẹp theo giá, số phòng và tiện nghi. Nếu không có kết quả, hãy đặt lại bộ lọc và thử lại.',
    keywords: 'tìm kiếm biển núi cắm trại bộ lọc ngày khách kết quả',
    action: { type: 'search', label: 'Tìm chỗ ở' },
  },
  {
    id: 'booking-status', category: 'bookings', question: 'Tôi kiểm tra trạng thái đặt chỗ ở đâu?',
    answer: 'Sau khi đăng nhập, mở Đặt chỗ rồi chọn một đơn để xem mã đặt chỗ, ngày, giá và trạng thái hiện tại. Đơn đang chờ chưa được xác nhận; hãy theo dõi trạng thái trong chi tiết đơn.',
    keywords: 'đặt chỗ chuyến đi xác nhận đang chờ mã đơn',
    action: { type: 'bookings', label: 'Xem đơn đặt chỗ' },
  },
  {
    id: 'favorites', category: 'account', question: 'Làm thế nào để lưu chỗ ở vào mục yêu thích?',
    answer: 'Đăng nhập rồi chạm biểu tượng trái tim trên thẻ hoặc trang chi tiết chỗ ở. Mở Yêu thích để xem các chỗ đã lưu. Chạm lại biểu tượng để xóa khỏi danh sách.',
    keywords: 'trái tim lưu danh sách yêu thích đăng nhập',
    action: { type: 'favorites', label: 'Mở mục yêu thích' },
  },
  {
    id: 'password', category: 'account', question: 'Làm thế nào để đổi mật khẩu?',
    answer: 'Sau khi đăng nhập, mở Cài đặt và thông báo. Nhập mật khẩu hiện tại, mật khẩu mới khác mật khẩu cũ và có ít nhất 6 ký tự, rồi xác nhận. Chọn Cập nhật mật khẩu.',
    keywords: 'bảo mật mật khẩu cài đặt tài khoản đăng nhập',
    action: { type: 'settings', label: 'Mở cài đặt tài khoản' },
  },
  {
    id: 'notifications', category: 'account', question: 'Làm thế nào để bật thông báo?',
    answer: 'Mở Cài đặt và thông báo. Trên web, chọn Bật thông báo trình duyệt và cho phép yêu cầu. Sau khi bật, bạn có thể gửi thông báo thử nghiệm. Nếu bị chặn, hãy cập nhật quyền của trang web trong trình duyệt.',
    keywords: 'thông báo trình duyệt quyền bị chặn cảnh báo cài đặt',
    action: { type: 'settings', label: 'Mở cài đặt thông báo' },
  },
  {
    id: 'payment-status', category: 'payments', question: 'Làm sao biết thanh toán đã hoàn tất?',
    answer: 'Mở đơn trong mục Đặt chỗ và kiểm tra trạng thái thanh toán cùng trạng thái đơn. Nếu thanh toán thất bại hoặc đơn vẫn đang chờ, hãy đọc lỗi trước khi thử lại. Chỉ xem đơn là đã xác nhận khi trạng thái thể hiện rõ điều đó.',
    keywords: 'thanh toán đã trả đang chờ thất bại xác nhận giao dịch thẻ',
    action: { type: 'bookings', label: 'Kiểm tra đơn đặt chỗ' },
  },
  {
    id: 'cancellation', category: 'payments', question: 'Hủy đặt chỗ có chắc chắn được hoàn tiền không?',
    answer: 'Trạng thái hủy và hoàn tiền là hai phần riêng biệt. Hãy kiểm tra chi tiết đơn để xem lựa chọn và trạng thái hiện tại. Điều kiện hoàn tiền phụ thuộc vào đơn và chính sách áp dụng; hủy đơn không có nghĩa tiền đã được hoàn.',
    keywords: 'hủy hoàn tiền thanh toán đặt chỗ chính sách',
    action: { type: 'bookings', label: 'Xem chi tiết đơn' },
  },
  {
    id: 'reviews', category: 'reviews', question: 'Tại sao tôi không thể gửi đánh giá?',
    answer: 'Hãy đăng nhập bằng tài khoản đã đặt chỗ. Bạn chỉ có thể đánh giá sau khi hoàn thành kỳ lưu trú và mỗi tài khoản chỉ được đánh giá một lần cho mỗi chỗ ở. Chọn số sao và viết ít nhất 5 ký tự.',
    keywords: 'đánh giá xếp hạng sao hoàn thành lưu trú nhận xét trùng lặp',
    action: { type: 'bookings', label: 'Kiểm tra trạng thái lưu trú' },
  },
  {
    id: 'loading', category: 'bookings', question: 'Nếu danh sách chỗ ở không tải được thì sao?',
    answer: 'Kiểm tra kết nối rồi chọn Thử lại trên màn hình tìm kiếm. Nếu không có kết quả, hãy đặt lại bộ lọc. Tải lại ứng dụng nếu cần. Nếu lỗi chỉ xảy ra khi đã đăng nhập, hãy đăng xuất rồi đăng nhập lại.',
    keywords: 'lỗi kết nối không tải chỗ ở thử lại danh sách làm mới phiên',
    action: { type: 'search', label: 'Quay lại tìm kiếm' },
  },
];

export const findHelpArticles = (query: string, category: HelpCategory | 'all'): HelpArticle[] => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return HELP_ARTICLES.filter((article) => {
    if (category !== 'all' && article.category !== category) return false;
    const text = `${article.question} ${article.answer} ${article.keywords}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
};
