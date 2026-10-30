import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiClient, API_BASE_URL } from './apiClient';
import { storage } from '../utils/storage';
import type {
  AdminFilters,
  AdminPage,
  AdminRecord,
  AdminResource,
  AdminUser,
  RevenueReport,
} from '../types/admin';
import { validateReportRange } from '../utils/admin';

export async function adminSession(signal?: AbortSignal): Promise<AdminUser> {
  const response = await apiClient.get('/admin/session', { signal });
  if (!response.data.success || response.data.data?.role !== 'admin')
    throw new Error('Tài khoản không có quyền quản trị.');
  return response.data.data;
}

export async function adminList(
  resource: AdminResource,
  params: AdminFilters = {},
  signal?: AbortSignal
): Promise<AdminPage> {
  const response = await apiClient.get(`/admin/${resource}`, {
    params: { page: 1, limit: 12, ...params },
    signal,
  });
  const body = response.data;
  if (!body.success || !Array.isArray(body.data) || !body.pagination)
    throw new Error('Danh sách trả về không hợp lệ.');
  return { items: body.data, pagination: body.pagination };
}

export async function adminOptions(
  resource: 'categories' | 'customers',
  signal?: AbortSignal
): Promise<AdminRecord[]> {
  const rows: AdminRecord[] = [];
  let page = 1;
  while (true) {
    const result = await adminList(resource, { page, limit: 50 }, signal);
    rows.push(...result.items);
    if (page >= result.pagination.totalPages) return rows;
    if (!result.items.length || page >= 100000)
      throw new Error('Không thể tải đầy đủ danh sách lựa chọn.');
    page++;
  }
}

export async function adminGet(
  resource: string,
  id: string,
  signal?: AbortSignal
): Promise<AdminRecord> {
  const response = await apiClient.get(`/admin/${resource}/${encodeURIComponent(id)}`, { signal });
  if (!response.data.success || !response.data.data?.id)
    throw new Error('Không tải được thông tin chi tiết.');
  return response.data.data;
}

export async function adminSave(
  resource: string,
  body: unknown,
  id?: string
): Promise<AdminRecord> {
  const response = id
    ? await apiClient.patch(`/admin/${resource}/${encodeURIComponent(id)}`, body)
    : await apiClient.post(`/admin/${resource}`, body);
  if (!response.data.success) throw new Error('Không thể lưu thay đổi.');
  return response.data.data;
}

export async function adminAction(
  resource: string,
  id: string,
  action: string,
  body?: unknown,
  method: 'patch' | 'post' | 'delete' = 'patch'
): Promise<any> {
  const endpoint = `/admin/${resource}/${encodeURIComponent(id)}${action ? `/${action}` : ''}`;
  const response = await apiClient.request({ url: endpoint, method, data: body });
  if (!response.data.success) throw new Error('Thao tác chưa được xác nhận.');
  return response.data.data;
}

export async function adminRevenue(
  from: string,
  to: string,
  signal?: AbortSignal
): Promise<RevenueReport> {
  const error = validateReportRange(from, to);
  if (error) throw new Error(error);
  const response = await apiClient.get('/admin/reports/revenue', { params: { from, to }, signal });
  if (!response.data.success || !Array.isArray(response.data.data?.items))
    throw new Error('Không tải được báo cáo doanh thu.');
  return response.data.data;
}

export async function exportAdminRevenue(from: string, to: string): Promise<void> {
  const error = validateReportRange(from, to);
  if (error) throw new Error(error);
  const endpoint = '/admin/reports/revenue.xlsx';
  const filename = `Doanh-thu-${from}-${to}.xlsx`;
  if (Platform.OS === 'web') {
    const response = await apiClient.get<Blob>(endpoint, {
      params: { from, to },
      responseType: 'blob',
      timeout: 30000,
    });
    if (!response.data.size || !String(response.headers['content-type']).includes('spreadsheetml'))
      throw new Error('Máy chủ chưa trả về báo cáo Excel hợp lệ.');
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
    return;
  }
  const token = await storage.getItem('traveling_auth_token');
  if (!token || !FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
    throw new Error('Thiết bị chưa hỗ trợ lưu báo cáo. Hãy mở Admin Portal trên web.');
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    const response = await FileSystem.downloadAsync(
      `${API_BASE_URL}${endpoint}?from=${from}&to=${to}`,
      uri,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.status !== 200)
      throw new Error('Không thể tải báo cáo. Vui lòng kiểm tra phiên đăng nhập.');
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }
}

// Admin Portal is a web workflow. Native forms can still accept hosted image URLs.
export function pickAdminImage(): Promise<{ base64: string; contentType: string } | null> {
  if (Platform.OS !== 'web')
    return Promise.reject(
      new Error('Hãy dùng bản web để tải ảnh, hoặc dán đường dẫn ảnh đã lưu trữ.')
    );
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    let settled = false;
    const finish = (value: { base64: string; contentType: string } | null, error?: Error) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      error ? reject(error) : resolve(value);
    };
    const onFocus = () =>
      setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 1000);
    input.oncancel = () => finish(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 4 * 1024 * 1024
      ) {
        finish(null, new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 4 MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => finish(null, new Error('Không đọc được ảnh.'));
      reader.onload = () =>
        finish({ contentType: file.type, base64: String(reader.result).split(',')[1] });
      reader.readAsDataURL(file);
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    window.addEventListener('focus', onFocus);
    input.click();
  });
}

export async function uploadAdminImage(): Promise<{ url: string; iconName: string } | null> {
  const file = await pickAdminImage();
  if (!file) return null;
  const response = await apiClient.post('/admin/media', file, { timeout: 30000 });
  if (!response.data.success || !response.data.data?.url)
    throw new Error('Tải ảnh chưa thành công.');
  return response.data.data;
}
