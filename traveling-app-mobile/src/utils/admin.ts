import axios from 'axios';
import type { AdminRecord, RevenueDay } from '../types/admin';

export const ADMIN_MEDIA_BUCKET = 'admin-listing-images';
export const adminMoney = (value: unknown) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export const adminDate = (value: unknown) =>
  typeof value === 'string' && value ? value.slice(0, 10).split('-').reverse().join('/') : '—';
export const utcToday = () => new Date().toISOString().slice(0, 10);
export const monthRange = () => {
  const to = utcToday();
  return { from: `${to.slice(0, 7)}-01`, to };
};
export const isAdminAccessError = (error: unknown) =>
  axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0);

export function adminError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    const messages: Record<string, string> = {
      CATEGORY_IN_USE:
        'Danh mục còn chỗ ở liên kết. Hãy chuyển các chỗ ở sang danh mục khác trước.',
      DUPLICATE_ENTRY: 'Tên hoặc mã đã tồn tại. Vui lòng kiểm tra và thử lại.',
      PAYMENT_REQUIRED: 'Chưa có đủ giao dịch thanh toán đã xác minh để chuyển trạng thái.',
      BOOKING_EXPIRED: 'Thời hạn giữ phòng đã hết. Không thể xác nhận đơn này.',
      STAY_NOT_ENDED: 'Chưa đến ngày trả phòng (UTC). Không thể đánh dấu hoàn thành.',
      CANCELLATION_WINDOW_CLOSED: 'Đã đến ngày nhận phòng. Không thể hủy đơn đã xác nhận.',
      INVALID_STATE_TRANSITION:
        'Trạng thái đã thay đổi hoặc thao tác không còn hợp lệ. Hãy tải lại.',
      LEGACY_PAYMENT: 'Giao dịch mô phỏng cũ cần được đối soát thủ công.',
      PAYMENTS_DISABLED: 'Thanh toán đang tắt. Chưa thể gửi lệnh hoàn tiền.',
      PROVIDER_UNAVAILABLE:
        'Cổng thanh toán chưa xác nhận. Kiểm tra trạng thái và thử lại cùng yêu cầu.',
      STORAGE_UNAVAILABLE: 'Image storage is unavailable. Try again or use a hosted image URL.',
      INVALID_IMAGE: 'Please select a JPG, PNG or WebP image up to 4 MB.',
      FORBIDDEN: 'Tài khoản không có quyền quản trị.',
      ACCOUNT_BLOCKED: 'Tài khoản đã bị khóa.',
    };
    if (messages[code]) return messages[code];
    if (error.response?.status === 401) return 'Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.';
    return error.response?.data?.error?.message || 'Không kết nối được máy chủ. Vui lòng thử lại.';
  }
  return error instanceof Error ? error.message : 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

export { categoryImage } from './categoryImage';

export function validateReportRange(from: string, to: string): string | null {
  const valid = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= '2000-01-01' &&
    Number.isFinite(Date.parse(v)) &&
    new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  if (!valid(from) || !valid(to)) return 'Nhập ngày hợp lệ theo định dạng YYYY-MM-DD.';
  if (to < from || Date.parse(to) - Date.parse(from) > 366 * 86400000)
    return 'Ngày kết thúc phải sau ngày bắt đầu và khoảng xem tối đa 367 ngày.';
  return null;
}

export function revenueSeries(items: RevenueDay[], from: string, to: string, maxBars = 12) {
  if (validateReportRange(from, to)) return [];
  const start = Date.parse(from),
    days = Math.round((Date.parse(to) - start) / 86400000) + 1;
  const bucket = Math.ceil(days / maxBars);
  const result = Array.from({ length: Math.ceil(days / bucket) }, (_, index) => ({
    day: new Date(start + index * bucket * 86400000).toISOString().slice(0, 10),
    gross: 0,
    refunds: 0,
  }));
  for (const item of items) {
    const offset = Math.round((Date.parse(item.day) - start) / 86400000);
    if (offset >= 0 && offset < days) {
      result[Math.floor(offset / bucket)].gross += Number(item.gross_payments) || 0;
      result[Math.floor(offset / bucket)].refunds += Number(item.refunds) || 0;
    }
  }
  return result;
}

export function couponStatus(row: AdminRecord, now = Date.now()): string {
  if (!row.is_active) return 'inactive';
  if (now < Date.parse(row.starts_at)) return 'upcoming';
  if (now >= Date.parse(row.ends_at)) return 'expired';
  if (Number(row.used_count || 0) >= Number(row.max_uses)) return 'exhausted';
  return 'active';
}

export function bookingActions(row: AdminRecord, today = utcToday()) {
  const status = row.booking_status;
  return {
    confirm: status === 'pending',
    complete: status === 'confirmed' && String(row.check_out_date).slice(0, 10) <= today,
    cancel:
      status === 'pending' ||
      (status === 'confirmed' && String(row.check_in_date).slice(0, 10) > today),
  };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AdminFormValues = Record<string, string>;
export function buildAdminPayload(
  resource: string,
  values: AdminFormValues,
  amenityIds: string[] = [],
  photos: { photoUrl: string; isCover: boolean }[] = []
) {
  const required = (key: string, label: string, max = 255) => {
    const value = (values[key] || '').trim();
    if (!value || value.length > max)
      throw new Error(`${label}: vui lòng nhập từ 1 đến ${max} ký tự.`);
    return value;
  };
  const numeric = (key: string, label: string, min = 0, integer = false, fallback?: number) => {
    const raw = values[key]?.trim();
    const value = raw ? Number(raw) : fallback;
    if (
      value === undefined ||
      !Number.isFinite(value) ||
      value < min ||
      value > (integer ? 100000000 : 99999999.99) ||
      (integer && !Number.isInteger(value))
    )
      throw new Error(`${label}: giá trị không hợp lệ.`);
    if (!integer && Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)
      throw new Error(label + ': use at most two decimal places.');
    return value;
  };
  const reference = (key: string, label: string) => {
    const value = required(key, label);
    if (!uuid.test(value)) throw new Error(`Vui lòng chọn ${label.toLowerCase()} hợp lệ.`);
    return value;
  };
  const isActive = values.isActive !== 'false';
  if (resource === 'categories') {
    const slug = required('slug', 'Slug', 50);
    if (!/^[a-z0-9-]+$/.test(slug))
      throw new Error('Slug chỉ gồm chữ thường, số và dấu gạch ngang.');
    return {
      name: required('name', 'Tên danh mục', 50),
      slug,
      iconName: required('iconName', 'Biểu tượng', 50),
      description: values.description?.trim() || null,
      isActive,
    };
  }
  if (resource === 'customers') {
    const email = required('email', 'Email', 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ.');
    const fullName = required('fullName', 'Họ tên', 100);
    if (fullName.length < 2) throw new Error('Họ tên cần ít nhất 2 ký tự.');
    if ((values.phoneNumber || '').length > 30) throw new Error('Số điện thoại tối đa 30 ký tự.');
    return { fullName, email, phoneNumber: values.phoneNumber?.trim() || '' };
  }
  if (resource === 'coupons') {
    const code = required('code', 'Mã coupon', 40).toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(code))
      throw new Error('Mã coupon chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.');
    const discountPercent = numeric('discountPercent', 'Phần trăm giảm', 0.01);
    if (discountPercent > 100) throw new Error('Phần trăm giảm tối đa 100%.');
    const from = required('startsAt', 'Ngày bắt đầu'),
      to = required('endsAt', 'Ngày kết thúc');
    if (
      !Number.isFinite(Date.parse(from)) ||
      !Number.isFinite(Date.parse(to)) ||
      Date.parse(to) <= Date.parse(from)
    )
      throw new Error(
        'Ngày kết thúc phải sau ngày bắt đầu. Nhập thời gian kèm múi giờ, ví dụ 2026-11-01T00:00:00Z.'
      );
    const listingId = values.listingId?.trim() || null,
      categoryId = values.categoryId?.trim() || null;
    if ((listingId && !uuid.test(listingId)) || (categoryId && !uuid.test(categoryId)))
      throw new Error('Mã chỗ ở hoặc danh mục không hợp lệ.');
    return {
      code,
      discountPercent,
      minSubtotal: numeric('minSubtotal', 'Giá trị đơn tối thiểu', 0, false, 0),
      maxDiscount: values.maxDiscount?.trim() ? numeric('maxDiscount', 'Giảm tối đa') : null,
      startsAt: new Date(from).toISOString(),
      endsAt: new Date(to).toISOString(),
      maxUses: numeric('maxUses', 'Số lượng', 1, true),
      perUserLimit: numeric('perUserLimit', 'Lượt dùng mỗi khách', 1, true, 1),
      listingId,
      categoryId,
      isActive,
    };
  }
  if (resource !== 'listings') throw new Error('Loại dữ liệu không hỗ trợ chỉnh sửa.');
  if (!photos.length || photos.length > 30)
    throw new Error('Vui lòng thêm từ 1 đến 30 ảnh cho chỗ ở.');
  for (const photo of photos) {
    let url: URL;
    try {
      url = new URL(photo.photoUrl);
    } catch {
      throw new Error('Đường dẫn ảnh không hợp lệ.');
    }
    if (!['https:', 'http:'].includes(url.protocol) || photo.photoUrl.length > 2000)
      throw new Error('Ảnh phải sử dụng đường dẫn HTTP/HTTPS hợp lệ.');
  }
  const times = {
    checkInTime: values.checkInTime || '14:00',
    checkOutTime: values.checkOutTime || '12:00',
  };
  if (Object.values(times).some((v) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)))
    throw new Error('Giờ nhận/trả phòng cần định dạng HH:mm.');
  const coordinate = (key: string, max: number) => {
    if (!values[key]?.trim()) return null;
    const value = Number(values[key]);
    if (!Number.isFinite(value) || Math.abs(value) > max)
      throw new Error('Tọa độ GPS không hợp lệ.');
    return value;
  };
  if (!['entire_place', 'private_room', 'dormitory'].includes(values.roomType))
    throw new Error('Vui lòng chọn loại phòng.');
  const capacity = (key: string, label: string, min: number) => {
    const value = numeric(key, label, min, true);
    if (value > 1000) throw new Error(`${label}: tối đa 1000.`);
    return value;
  };
  return {
    hostId: reference('hostId', 'Chủ chỗ ở'),
    categoryId: reference('categoryId', 'Danh mục'),
    title: required('title', 'Tên chỗ ở'),
    description: values.description?.trim() || null,
    propertyType: required('propertyType', 'Loại hình', 50),
    roomType: values.roomType,
    address: required('address', 'Địa chỉ'),
    city: required('city', 'Thành phố', 100),
    country: required('country', 'Quốc gia', 100),
    region: required('region', 'Khu vực', 50),
    latitude: coordinate('latitude', 90),
    longitude: coordinate('longitude', 180),
    pricePerNight: numeric('pricePerNight', 'Giá mỗi đêm', 0.01),
    cleaningFee: numeric('cleaningFee', 'Phí dọn dẹp', 0, false, 0),
    serviceFee: numeric('serviceFee', 'Phí dịch vụ', 0, false, 0),
    maxGuests: capacity('maxGuests', 'Số khách', 1),
    bedrooms: capacity('bedrooms', 'Phòng ngủ', 0),
    beds: capacity('beds', 'Số giường', 0),
    bathrooms: capacity('bathrooms', 'Phòng tắm', 0),
    ...times,
    isActive,
    amenityIds,
    photos: photos.map((p, i) => ({ ...p, isCover: i === 0 })),
  };
}
