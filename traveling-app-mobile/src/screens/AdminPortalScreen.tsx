import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Tags,
  Ticket,
  Users,
} from 'lucide-react-native';
import type { RootStackParamList } from '../types';
import type { AdminFilters, AdminRecord, AdminResource, AdminSection } from '../types/admin';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { adminAction, adminList, adminOptions, adminSession } from '../services/admin';
import {
  adminDate,
  adminError,
  adminMoney,
  categoryImage,
  couponStatus,
  isAdminAccessError,
} from '../utils/admin';
import {
  a,
  AdminBadge,
  AdminButton,
  AdminColumn,
  AdminEmpty,
  AdminField,
  AdminModal,
  AdminNotice,
  AdminPagination,
  AdminSelect,
  AdminTable,
  colors,
} from '../components/admin/AdminUI';
import { AdminEditor } from '../components/admin/AdminEditor';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminRevenue } from '../components/admin/AdminRevenue';
import { AdminBookingDialog } from '../components/admin/AdminBookingDialog';

const sections = [
  {
    key: 'overview',
    label: 'Tổng quan',
    title: 'Tổng quan hệ thống',
    description: 'Theo dõi hoạt động và những việc cần xử lý.',
    icon: LayoutDashboard,
  },
  {
    key: 'listings',
    label: 'Chỗ ở lưu trú',
    title: 'Quản lý chỗ ở',
    description: 'Niêm yết, cập nhật và quản lý các chỗ ở của Traveling.',
    icon: Building2,
  },
  {
    key: 'categories',
    label: 'Danh mục',
    title: 'Quản lý danh mục',
    description: 'Sắp xếp chỗ ở theo những trải nghiệm du lịch.',
    icon: Tags,
  },
  {
    key: 'customers',
    label: 'Khách hàng',
    title: 'Quản lý khách hàng',
    description: 'Tra cứu hồ sơ và quản lý trạng thái tài khoản.',
    icon: Users,
  },
  {
    key: 'bookings',
    label: 'Đặt phòng',
    title: 'Quản lý đặt phòng',
    description: 'Tra cứu, đối soát và cập nhật trạng thái đặt phòng.',
    icon: CalendarDays,
  },
  {
    key: 'refunds',
    label: 'Hoàn tiền',
    title: 'Yêu cầu hoàn tiền',
    description: 'Kiểm tra lý do hủy và theo dõi từng bước hoàn tiền.',
    icon: RotateCcw,
  },
  {
    key: 'coupons',
    label: 'Mã khuyến mãi',
    title: 'Quản lý coupon',
    description: 'Thiết lập ưu đãi, thời hạn và số lượt sử dụng.',
    icon: Ticket,
  },
  {
    key: 'revenue',
    label: 'Báo cáo doanh thu',
    title: 'Báo cáo doanh thu',
    description: 'Đối soát dòng tiền và xuất báo cáo theo thời gian.',
    icon: BarChart3,
  },
] as const;
type Editable = 'listings' | 'categories' | 'customers' | 'coupons';
type Action = {
  title: string;
  description: string;
  button: string;
  danger?: boolean;
  reason?: boolean;
  context?: string;
  run: (reason: string) => Promise<any>;
  success: string;
  logout?: boolean;
};
const stateOptions: Partial<Record<AdminSection, { value: string; label: string }[]>> = {
  listings: [
    { value: 'true', label: 'Đang hiển thị' },
    { value: 'false', label: 'Đã ẩn' },
  ],
  categories: [
    { value: 'true', label: 'Đang hoạt động' },
    { value: 'false', label: 'Đã ẩn' },
  ],
  customers: [
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'blocked', label: 'Đã khóa' },
  ],
  bookings: [
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'expired', label: 'Hết hạn' },
  ],
  refunds: [
    { value: 'requested', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'succeeded', label: 'Thành công' },
    { value: 'failed', label: 'Thất bại' },
    { value: 'rejected', label: 'Từ chối' },
  ],
  coupons: [
    { value: 'active', label: 'Đang áp dụng' },
    { value: 'inactive', label: 'Ngừng áp dụng' },
    { value: 'upcoming', label: 'Sắp bắt đầu' },
    { value: 'expired', label: 'Hết hạn' },
    { value: 'exhausted', label: 'Hết lượt dùng' },
  ],
};

export function AdminPortalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AdminPortal'>>();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const wide = width >= 1050;
  const section: AdminSection = sections.some((s) => s.key === route.params?.section)
    ? route.params!.section!
    : 'overview';
  const current = sections.find((s) => s.key === section)!;
  const [menu, setMenu] = useState(false),
    [denied, setDenied] = useState(false);
  const [draft, setDraft] = useState(''),
    [city, setCity] = useState('');
  const [filters, setFilters] = useState<AdminFilters>({ page: 1, limit: 12 });
  const [editor, setEditor] = useState<{ resource: Editable; record?: AdminRecord } | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null),
    [reason, setReason] = useState(''),
    [actionError, setActionError] = useState(''),
    [acting, setActing] = useState(false);
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const accessError = useCallback(() => {
    setDenied(true);
    setEditor(null);
    setBookingId(null);
    setAction(null);
  }, []);
  const session = useQuery({
    queryKey: ['admin', user?.id, 'session'],
    queryFn: ({ signal }) => adminSession(signal),
    enabled: !authLoading && user?.role === 'admin',
    retry: false,
    staleTime: 60000,
  });
  const authorized =
    !authLoading && user?.role === 'admin' && session.isSuccess && !session.error && !denied;
  const isResource = !['overview', 'revenue'].includes(section);
  const list = useQuery({
    queryKey: ['admin', user?.id, 'list', section, filters],
    queryFn: ({ signal }) => adminList(section as AdminResource, filters, signal),
    enabled: authorized && isResource,
    retry: false,
  });
  const categories = useQuery({
    queryKey: ['admin', user?.id, 'category-options'],
    queryFn: ({ signal }) => adminOptions('categories', signal),
    enabled: authorized && (section === 'listings' || section === 'coupons' || !!editor),
    retry: false,
  });
  useEffect(() => {
    setDraft('');
    setCity('');
    setFilters({ page: 1, limit: 12 });
    setNotice('');
  }, [section]);
  useEffect(() => {
    if (isAdminAccessError(list.error) || isAdminAccessError(categories.error)) accessError();
  }, [list.error, categories.error, accessError]);
  const selectSection = (next: AdminSection) => {
    setMenu(false);
    navigation.setParams({ section: next });
  };
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', user?.id] });
  };
  const afterSave = async (message: string) => {
    setEditor(null);
    setNotice(message);
    await refresh();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['listings'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);
  };
  const ask = (next: Action) => {
    setReason('');
    setActionError('');
    setAction(next);
  };
  const confirm = async () => {
    if (!action || pending.current) return;
    if (action.reason && (reason.trim().length < 3 || reason.trim().length > 500)) {
      setActionError('Vui lòng nhập lý do từ 3 đến 500 ký tự.');
      return;
    }
    pending.current = true;
    setActing(true);
    setActionError('');
    try {
      const result = await action.run(reason.trim());
      if (action.logout) {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'AdminLogin' }] });
        return;
      }
      setAction(null);
      const message = result?.auth_sync_pending
        ? 'Thay đổi đã được lưu. Đồng bộ xác thực đang chờ xử lý; hãy thử đồng bộ lại từ danh sách.'
        : action.success;
      setNotice(message);
      await refresh();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listings'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['my_bookings'] }),
      ]);
    } catch (failure) {
      if (isAdminAccessError(failure)) accessError();
      else setActionError(adminError(failure));
    } finally {
      pending.current = false;
      setActing(false);
    }
  };
  const logout = () =>
    ask({
      title: 'Đăng xuất quản trị',
      description:
        'Kết thúc phiên quản trị và thu hồi phiên đăng nhập của tài khoản trên các thiết bị.',
      button: 'Đăng xuất',
      danger: true,
      logout: true,
      success: '',
      run: async () => {
        const response = await apiClient.post('/admin/logout');
        if (!response.data.success) throw new Error('Chưa thể kết thúc phiên quản trị.');
      },
    });
  const deactivate = (resource: 'listings' | 'categories' | 'coupons', row: AdminRecord) => {
    const active = row.is_active !== false;
    ask({
      title: `${active ? (resource === 'coupons' ? 'Ngừng áp dụng coupon' : resource === 'categories' ? 'Xóa danh mục' : 'Ẩn chỗ ở') : 'Kích hoạt lại'}`,
      description: active
        ? resource === 'categories'
          ? 'Danh mục sẽ ngừng hiển thị. Không thể xóa khi vẫn còn chỗ ở liên kết.'
          : resource === 'listings'
            ? 'Chỗ ở sẽ ngừng hiển thị khi tìm kiếm. Các đơn đặt phòng trước đó vẫn được giữ nguyên.'
            : 'Khách hàng sẽ không thể dùng mã cho đơn mới. Lịch sử sử dụng vẫn được giữ nguyên.'
        : 'Mục này sẽ được kích hoạt lại nếu thỏa điều kiện nghiệp vụ.',
      context: row.title || row.name || row.code,
      button: active ? 'Xác nhận' : 'Kích hoạt lại',
      danger: active,
      success: 'Đã cập nhật trạng thái.',
      run: () =>
        adminAction(
          resource,
          row.id,
          '',
          active ? undefined : { isActive: true },
          active ? 'delete' : 'patch'
        ),
    });
  };
  const accountStatus = (row: AdminRecord) => {
    const blocked = row.account_status === 'blocked';
    ask({
      title: blocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      description: blocked
        ? 'Cho phép tài khoản đăng nhập trở lại. Người dùng cần tạo phiên đăng nhập mới.'
        : 'Tài khoản sẽ bị chặn và các phiên cũ không còn hợp lệ. Vui lòng ghi rõ lý do.',
      context: `${row.full_name} · ${row.email}`,
      button: blocked ? 'Xác nhận mở khóa' : 'Xác nhận khóa',
      danger: !blocked,
      reason: true,
      success: blocked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.',
      run: (text) =>
        adminAction('customers', row.id, 'status', {
          status: blocked ? 'active' : 'blocked',
          reason: text,
        }),
    });
  };
  const bookingAction = (operation: 'confirm' | 'complete' | 'cancel', row: AdminRecord) => {
    setBookingId(null);
    ask({
      title:
        operation === 'confirm'
          ? 'Xác nhận đặt phòng'
          : operation === 'complete'
            ? 'Hoàn thành chuyến đi'
            : 'Hủy đặt phòng',
      description:
        operation === 'confirm'
          ? 'Backend sẽ kiểm tra thanh toán đã xác minh và thời hạn giữ phòng trước khi xác nhận.'
          : operation === 'complete'
            ? 'Chỉ hoàn thành khi chuyến đi đã kết thúc và thanh toán đầy đủ.'
            : 'Đơn sẽ được hủy. Nếu có tiền đã thu, hệ thống tạo yêu cầu hoàn tiền để quản trị viên xét duyệt.',
      context: `${row.booking_code} · ${row.listing_title}`,
      button: 'Xác nhận thao tác',
      danger: operation === 'cancel',
      reason: operation === 'cancel',
      success: 'Đã cập nhật trạng thái đặt phòng.',
      run: (text) =>
        adminAction(
          'bookings',
          row.id,
          operation,
          operation === 'cancel' ? { reason: text } : undefined
        ),
    });
  };
  const refundAction = (row: AdminRecord, decision: 'approve' | 'reject' | 'process') =>
    ask({
      title:
        decision === 'approve'
          ? 'Duyệt yêu cầu hoàn tiền'
          : decision === 'reject'
            ? 'Từ chối hoàn tiền'
            : 'Thực hiện hoàn tiền',
      description:
        decision === 'process'
          ? 'Gửi lệnh hoàn đến cổng thanh toán. Trạng thái chỉ chuyển thành công khi backend xác nhận kết quả.'
          : 'Đối soát đơn đặt phòng, thanh toán và chính sách hủy trước khi đưa ra quyết định.',
      context: `${row.booking_code || row.booking_id} · ${adminMoney(row.amount)}\n${row.guest_name || ''} ${row.guest_email || ''}\nChỗ ở: ${row.listing_title || '—'}\nNhận / trả phòng: ${adminDate(row.check_in_date)} – ${adminDate(row.check_out_date)}\nLý do yêu cầu: ${row.reason}\n${row.is_simulated ? 'Giao dịch mô phỏng' : row.provider === 'stripe_test' ? 'Giao dịch Stripe thử nghiệm' : row.provider || ''}`,
      button:
        decision === 'approve'
          ? 'Duyệt hoàn tiền'
          : decision === 'reject'
            ? 'Từ chối yêu cầu'
            : 'Gửi lệnh hoàn tiền',
      danger: decision === 'reject',
      reason: decision !== 'process',
      success:
        decision === 'approve'
          ? 'Đã duyệt. Chọn “Thực hiện hoàn tiền” để gửi lệnh đến cổng thanh toán.'
          : decision === 'reject'
            ? 'Đã từ chối yêu cầu và lưu lý do.'
            : 'Đã gửi xử lý. Theo dõi trạng thái xác nhận từ cổng thanh toán.',
      run: (text) =>
        adminAction(
          'refunds',
          row.id,
          decision === 'process' ? 'process' : 'decision',
          decision === 'process' ? undefined : { decision, reason: text },
          decision === 'process' ? 'post' : 'patch'
        ),
    });

  const text = (value: unknown, bold = false) => (
    <Text numberOfLines={2} style={[a.text, bold && { fontWeight: '600' }]}>
      {String(value ?? '—')}
    </Text>
  );
  const edit = (resource: Editable, row: AdminRecord) => (
    <AdminButton
      title="Sửa"
      label={`Sửa ${row.title || row.name || row.full_name || row.code}`}
      small
      variant="secondary"
      icon={<Pencil size={12} color={colors.muted} />}
      onPress={() => setEditor({ resource, record: row })}
    />
  );
  const columns: AdminColumn[] =
    section === 'listings'
      ? [
          {
            key: 'stay',
            title: 'CHỖ Ở',
            width: 300,
            render: (r) => (
              <View style={{ gap: 5 }}>
                {text(r.title, true)}
                <Text style={a.helper}>
                  {r.city}, {r.country}
                </Text>
                <Text selectable style={[a.helper, { fontSize: 9 }]}>
                  {r.id}
                </Text>
              </View>
            ),
          },
          {
            key: 'category',
            title: 'DANH MỤC',
            width: 150,
            render: (r) => text(categories.data?.find((c) => c.id === r.category_id)?.name || '—'),
          },
          {
            key: 'price',
            title: 'GIÁ / ĐÊM',
            width: 125,
            render: (r) => text(adminMoney(r.price_per_night), true),
          },
          {
            key: 'capacity',
            title: 'SỨC CHỨA',
            width: 100,
            render: (r) => text(`${r.max_guests} khách`),
          },
          {
            key: 'status',
            title: 'TRẠNG THÁI',
            width: 150,
            render: (r) => <AdminBadge status={r.is_active ? 'active' : 'inactive'} />,
          },
          {
            key: 'action',
            title: 'THAO TÁC',
            width: 210,
            render: (r) => (
              <View style={a.row}>
                {edit('listings', r)}
                <AdminButton
                  title={r.is_active ? 'Ẩn' : 'Hiện lại'}
                  small
                  variant={r.is_active ? 'danger' : 'secondary'}
                  onPress={() => deactivate('listings', r)}
                />
              </View>
            ),
          },
        ]
      : section === 'categories'
        ? [
            {
              key: 'name',
              title: 'DANH MỤC',
              width: 240,
              render: (r) => (
                <View style={a.row}>
                  {categoryImage(r.icon_name) ? (
                    <Image
                      source={{ uri: categoryImage(r.icon_name) }}
                      style={{ width: 36, height: 36, borderRadius: 9 }}
                    />
                  ) : (
                    <View style={s.categoryIcon}>
                      <Tags size={18} color={colors.primary} />
                    </View>
                  )}
                  {text(r.name, true)}
                </View>
              ),
            },
            { key: 'slug', title: 'SLUG', width: 160, render: (r) => text(r.slug) },
            { key: 'description', title: 'MÔ TẢ', width: 280, render: (r) => text(r.description) },
            {
              key: 'status',
              title: 'TRẠNG THÁI',
              width: 155,
              render: (r) => <AdminBadge status={r.is_active ? 'active' : 'inactive'} />,
            },
            {
              key: 'action',
              title: 'THAO TÁC',
              width: 210,
              render: (r) => (
                <View style={a.row}>
                  {edit('categories', r)}
                  <AdminButton
                    title={r.is_active ? 'Xóa' : 'Hiện lại'}
                    small
                    variant={r.is_active ? 'danger' : 'secondary'}
                    onPress={() => deactivate('categories', r)}
                  />
                </View>
              ),
            },
          ]
        : section === 'customers'
          ? [
              {
                key: 'name',
                title: 'KHÁCH HÀNG',
                width: 220,
                render: (r) => (
                  <View>
                    {text(r.full_name, true)}
                    <Text style={a.helper}>{r.role === 'host' ? 'Chủ chỗ ở' : 'Khách hàng'}</Text>
                  </View>
                ),
              },
              {
                key: 'contact',
                title: 'LIÊN HỆ',
                width: 260,
                render: (r) => (
                  <View>
                    {text(r.email)}
                    <Text style={a.helper}>{r.phone_number || 'Chưa có số điện thoại'}</Text>
                  </View>
                ),
              },
              {
                key: 'status',
                title: 'TRẠNG THÁI',
                width: 170,
                render: (r) => (
                  <View style={{ gap: 7 }}>
                    <AdminBadge status={r.account_status || 'active'} />
                    {r.auth_sync_pending && (
                      <Text style={[a.helper, { color: '#BE8F39' }]}>Chờ đồng bộ xác thực</Text>
                    )}
                  </View>
                ),
              },
              {
                key: 'created',
                title: 'NGÀY THAM GIA',
                width: 135,
                render: (r) => text(adminDate(r.created_at)),
              },
              {
                key: 'action',
                title: 'THAO TÁC',
                width: 290,
                render: (r) => (
                  <View style={[a.row, { flexWrap: 'wrap' }]}>
                    {edit('customers', r)}
                    <AdminButton
                      title={r.account_status === 'blocked' ? 'Mở khóa' : 'Khóa'}
                      small
                      variant={r.account_status === 'blocked' ? 'secondary' : 'danger'}
                      onPress={() => accountStatus(r)}
                    />
                    {r.auth_sync_pending && (
                      <AdminButton
                        title="Đồng bộ lại"
                        small
                        variant="secondary"
                        onPress={() =>
                          ask({
                            title: 'Đồng bộ xác thực',
                            description:
                              'Thử áp dụng lại email và trạng thái tài khoản đã lưu lên hệ thống xác thực.',
                            button: 'Đồng bộ',
                            success: 'Đã đồng bộ xác thực.',
                            run: () =>
                              adminAction('customers', r.id, 'auth-sync', undefined, 'post'),
                          })
                        }
                      />
                    )}
                  </View>
                ),
              },
            ]
          : section === 'bookings'
            ? [
                {
                  key: 'code',
                  title: 'MÃ ĐẶT PHÒNG',
                  width: 195,
                  render: (r) => text(r.booking_code, true),
                },
                {
                  key: 'stay',
                  title: 'CHỖ Ở / KHÁCH HÀNG',
                  width: 260,
                  render: (r) => (
                    <View>
                      {text(r.listing_title, true)}
                      <Text style={a.helper}>
                        {r.guest_name} · {r.guest_email}
                      </Text>
                    </View>
                  ),
                },
                {
                  key: 'dates',
                  title: 'NHẬN / TRẢ PHÒNG',
                  width: 195,
                  render: (r) => (
                    <View>
                      {text(adminDate(r.check_in_date))}
                      <Text style={a.helper}>
                        đến {adminDate(r.check_out_date)} · {r.total_nights} đêm
                      </Text>
                    </View>
                  ),
                },
                {
                  key: 'total',
                  title: 'TỔNG TIỀN',
                  width: 130,
                  render: (r) => text(adminMoney(r.total_price), true),
                },
                {
                  key: 'status',
                  title: 'TRẠNG THÁI',
                  width: 150,
                  render: (r) => <AdminBadge status={r.booking_status} />,
                },
                {
                  key: 'action',
                  title: 'THAO TÁC',
                  width: 130,
                  render: (r) => (
                    <AdminButton
                      title="Chi tiết"
                      label={`Chi tiết ${r.booking_code}`}
                      small
                      variant="secondary"
                      onPress={() => setBookingId(r.id)}
                    />
                  ),
                },
              ]
            : section === 'refunds'
              ? [
                  {
                    key: 'booking',
                    title: 'ĐƠN ĐẶT PHÒNG',
                    width: 230,
                    render: (r) => (
                      <View>
                        {text(r.booking_code || r.booking_id, true)}
                        <Text style={a.helper}>{r.guest_email}</Text>
                      </View>
                    ),
                  },
                  {
                    key: 'reason',
                    title: 'LÝ DO YÊU CẦU',
                    width: 230,
                    render: (r) => (
                      <View>
                        {text(r.reason)}
                        {!!r.decision_reason && (
                          <Text style={a.helper}>Quyết định: {r.decision_reason}</Text>
                        )}
                      </View>
                    ),
                  },
                  {
                    key: 'amount',
                    title: 'SỐ TIỀN',
                    width: 130,
                    render: (r) => text(adminMoney(r.amount), true),
                  },
                  {
                    key: 'status',
                    title: 'TRẠNG THÁI',
                    width: 150,
                    render: (r) => <AdminBadge status={r.status} />,
                  },
                  {
                    key: 'action',
                    title: 'THAO TÁC',
                    width: 310,
                    render: (r) => (
                      <View style={[a.row, { flexWrap: 'wrap' }]}>
                        <AdminButton
                          title="Xem đơn"
                          small
                          variant="secondary"
                          onPress={() => setBookingId(r.booking_id)}
                        />
                        {r.status === 'requested' && (
                          <>
                            <AdminButton
                              title="Duyệt"
                              small
                              onPress={() => refundAction(r, 'approve')}
                            />
                            <AdminButton
                              title="Từ chối"
                              small
                              variant="danger"
                              onPress={() => refundAction(r, 'reject')}
                            />
                          </>
                        )}
                        {['approved', 'failed'].includes(r.status) && (
                          <AdminButton
                            title={r.status === 'failed' ? 'Thử lại xử lý' : 'Thực hiện hoàn tiền'}
                            small
                            onPress={() => refundAction(r, 'process')}
                          />
                        )}
                      </View>
                    ),
                  },
                ]
              : [
                  {
                    key: 'code',
                    title: 'MÃ KHUYẾN MÃI',
                    width: 200,
                    render: (r) => text(r.code, true),
                  },
                  {
                    key: 'discount',
                    title: 'ƯU ĐÃI',
                    width: 150,
                    render: (r) => (
                      <View>
                        {text(`${r.discount_percent}%`, true)}
                        <Text style={a.helper}>
                          {r.max_discount != null
                            ? `Tối đa ${adminMoney(r.max_discount)}`
                            : 'Không giới hạn tối đa'}
                        </Text>
                      </View>
                    ),
                  },
                  {
                    key: 'period',
                    title: 'THỜI HẠN',
                    width: 200,
                    render: (r) => (
                      <View>
                        {text(adminDate(r.starts_at))}
                        <Text style={a.helper}>đến {adminDate(r.ends_at)}</Text>
                      </View>
                    ),
                  },
                  {
                    key: 'uses',
                    title: 'ĐÃ DÙNG / PHÁT HÀNH',
                    width: 160,
                    render: (r) => text(`${r.used_count || 0} / ${r.max_uses}`),
                  },
                  {
                    key: 'status',
                    title: 'TRẠNG THÁI',
                    width: 160,
                    render: (r) => <AdminBadge status={couponStatus(r)} />,
                  },
                  {
                    key: 'action',
                    title: 'THAO TÁC',
                    width: 240,
                    render: (r) => (
                      <View style={a.row}>
                        {edit('coupons', r)}
                        <AdminButton
                          title={r.is_active ? 'Ngừng áp dụng' : 'Kích hoạt'}
                          small
                          variant={r.is_active ? 'danger' : 'secondary'}
                          onPress={() => deactivate('coupons', r)}
                        />
                      </View>
                    ),
                  },
                ];

  const navItems = (
    <View style={{ gap: 6 }}>
      {sections.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: item.key === section }}
          onPress={() => selectSection(item.key)}
          style={[s.navItem, item.key === section && s.navActive]}
        >
          <item.icon size={19} color={item.key === section ? '#41D0DF' : '#91A7B3'} />
          <Text style={[s.navText, item.key === section && { color: '#FFF' }]}>{item.label}</Text>
          {item.key === section && <View style={s.navDot} />}
        </Pressable>
      ))}
    </View>
  );

  if (authLoading || (user?.role === 'admin' && session.isLoading))
    return (
      <SafeAreaView style={s.gate}>
        <ActivityIndicator color={colors.primary} />
        <Text style={a.muted}>Đang xác minh phiên quản trị...</Text>
      </SafeAreaView>
    );
  if (!authorized)
    return (
      <SafeAreaView style={s.gate}>
        <ShieldCheck size={42} color={colors.primary} />
        <Text style={a.modalTitle}>
          {!user
            ? 'Đăng nhập quản trị'
            : user.role !== 'admin'
              ? 'Bạn không có quyền quản trị'
              : 'Không thể xác minh phiên quản trị'}
        </Text>
        <Text style={[a.emptyText, { marginBottom: 8 }]}>
          {session.error
            ? adminError(session.error)
            : denied
              ? 'Phiên quản trị đã hết hạn hoặc quyền truy cập đã thay đổi.'
              : 'Trang này chỉ dành cho tài khoản đã được cấp quyền admin.'}
        </Text>
        <AdminButton
          title="Đến trang đăng nhập quản trị"
          onPress={() => navigation.replace('AdminLogin')}
        />
        {user?.role === 'admin' && (
          <AdminButton
            title="Kiểm tra lại phiên"
            variant="secondary"
            onPress={() =>
              void session.refetch().then((result) => {
                if (!result.error) setDenied(false);
              })
            }
          />
        )}
        <AdminButton
          title="Về ứng dụng"
          variant="ghost"
          onPress={() => navigation.replace('MainTabs')}
        />
      </SafeAreaView>
    );

  const rows = list.error ? [] : list.data?.items || [];
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
      {wide && (
        <View style={s.sidebar}>
          <View style={s.brand}>
            <View style={s.brandMark}>
              <ShieldCheck size={24} color="#39CEDF" />
            </View>
            <View>
              <Text style={s.brandText}>
                traveling<Text style={{ color: '#39CEDF' }}>.</Text>
              </Text>
              <Text style={s.brandCaption}>ADMIN PORTAL</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={s.groupLabel}>QUẢN LÝ HỆ THỐNG</Text>
            {navItems}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem ứng dụng"
            onPress={() => navigation.navigate('MainTabs')}
            style={s.preview}
          >
            <ArrowUpRight size={17} color="#91A7B3" />
            <Text style={s.navText}>Xem ứng dụng</Text>
          </Pressable>
          <View style={s.sidebarFooter}>
            <View style={s.avatar}>
              <Text style={{ color: '#40BDCB', fontWeight: '700' }}>
                {(user.full_name || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: '#ECF5F7', fontSize: 12, fontWeight: '600' }}>
                {user.full_name}
              </Text>
              <Text style={s.brandCaption}>Quản trị viên</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng xuất quản trị"
              onPress={logout}
            >
              <LogOut size={17} color="#91A7B3" />
            </Pressable>
          </View>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[s.header, !wide && { paddingHorizontal: 18 }]}>
          <View style={[a.row, { flex: 1, minWidth: 0 }]}>
            {!wide && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mở menu quản trị"
                onPress={() => setMenu(true)}
                style={a.iconButton}
              >
                <Menu size={20} color={colors.ink} />
              </Pressable>
            )}
            <Text style={a.muted}>Admin</Text>
            <ChevronRight size={13} color="#A4B3BC" />
            <Text numberOfLines={1} style={[a.text, { flexShrink: 1 }]}>{current.label}</Text>
          </View>
          <View style={a.row}>
            <View style={s.adminTag}>
              <ShieldCheck size={13} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>ADMIN</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đăng xuất quản trị"
              onPress={logout}
              style={a.iconButton}
            >
              <LogOut size={17} color={colors.muted} />
            </Pressable>
          </View>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: wide ? 30 : 18, gap: 23, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[a.wrap, { alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ gap: 8, flex: 1, minWidth: 180 }}>
              <Text accessibilityRole="header" style={s.pageTitle}>
                {current.title}
              </Text>
              <Text style={a.muted}>{current.description}</Text>
            </View>
            {['listings', 'categories', 'coupons'].includes(section) && (
              <AdminButton
                title={
                  section === 'listings'
                    ? 'Thêm chỗ ở'
                    : section === 'categories'
                      ? 'Thêm danh mục'
                      : 'Thêm coupon'
                }
                icon={<Plus size={17} color="#FFF" />}
                onPress={() => setEditor({ resource: section as Editable })}
              />
            )}
          </View>
          {!!notice && <AdminNotice text={notice} onClose={() => setNotice('')} />}
          {section === 'overview' ? (
            <AdminOverview
              userId={user.id}
              onSection={selectSection}
              onBooking={setBookingId}
              onAccessError={accessError}
            />
          ) : section === 'revenue' ? (
            <AdminRevenue userId={user.id} onAccessError={accessError} />
          ) : (
            <>
              <View style={[a.card, { padding: 18, gap: 15 }]}>
                <View style={[a.wrap, { alignItems: 'flex-end' }]}>
                  <AdminField
                    label={
                      section === 'bookings'
                        ? 'Mã đặt phòng, số điện thoại hoặc tên chỗ ở'
                        : section === 'customers'
                          ? 'Tên, email hoặc số điện thoại'
                          : section === 'refunds'
                            ? 'Mã đặt phòng, khách hàng hoặc lý do'
                            : 'Tìm kiếm'
                    }
                    value={draft}
                    onChange={setDraft}
                    placeholder="Nhập từ khóa..."
                  />
                  <AdminSelect
                    label="Trạng thái"
                    value={filters.isActive || filters.status || ''}
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      ...(stateOptions[section] || []),
                    ]}
                    onChange={(value) =>
                      setFilters((f) => ({
                        ...f,
                        page: 1,
                        ...(['listings', 'categories'].includes(section)
                          ? { isActive: value || undefined }
                          : { status: value || undefined }),
                      }))
                    }
                  />
                  <AdminButton
                    title="Tìm kiếm"
                    icon={<Search size={16} color="#FFF" />}
                    onPress={() =>
                      setFilters((f) => ({
                        ...f,
                        page: 1,
                        q: draft.trim() || undefined,
                        city: section === 'listings' ? city.trim() || undefined : undefined,
                      }))
                    }
                  />
                  <AdminButton
                    title="Tải lại"
                    label="Làm mới danh sách"
                    variant="secondary"
                    disabled={list.isFetching}
                    icon={<RefreshCw size={15} color={colors.primary} />}
                    onPress={() => void list.refetch()}
                  />
                </View>
                {section === 'listings' && (
                  <View style={a.wrap}>
                    <AdminSelect
                      label="Lọc danh mục"
                      value={filters.categoryId || ''}
                      options={[
                        { value: '', label: 'Tất cả danh mục' },
                        ...(categories.data || []).map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      onChange={(value) =>
                        setFilters((f) => ({ ...f, page: 1, categoryId: value || undefined }))
                      }
                    />
                    <AdminField
                      label="Thành phố"
                      value={city}
                      onChange={setCity}
                      placeholder="Ví dụ: Da Nang"
                    />
                  </View>
                )}
                {categories.error && section === 'listings' && (
                  <AdminNotice text="Không tải được danh mục. Hãy làm mới để thử lại." error />
                )}
              </View>
              <View style={a.card}>
                <View style={[a.row, { padding: 20, justifyContent: 'space-between' }]}>
                  <Text style={[a.sectionTitle, { marginBottom: 0 }]}>{current.label}</Text>
                  <Text style={a.helper}>
                    {list.isFetching
                      ? 'Đang tải...'
                      : `${list.data?.pagination.total ?? 0} kết quả`}
                  </Text>
                </View>
                {list.isLoading ? (
                  <View style={{ padding: 60 }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : list.error ? (
                  <AdminEmpty error={adminError(list.error)} onRetry={() => void list.refetch()} />
                ) : rows.length ? (
                  <AdminTable columns={columns} rows={rows} />
                ) : (
                  <AdminEmpty
                    title="Không tìm thấy kết quả"
                    description="Thử đổi từ khóa hoặc bộ lọc. Dữ liệu mới sẽ xuất hiện sau khi được tạo."
                  />
                )}
                {list.data && !list.error && (
                  <AdminPagination
                    page={list.data.pagination.page}
                    totalPages={list.data.pagination.totalPages}
                    total={list.data.pagination.total}
                    busy={list.isFetching}
                    onPage={(page) => setFilters((f) => ({ ...f, page }))}
                  />
                )}
              </View>
            </>
          )}
          <Text style={s.footer}>Traveling Admin · Đồng hành cùng mỗi hành trình</Text>
        </ScrollView>
      </View>
      {editor && (
        <AdminEditor
          resource={editor.resource}
          record={editor.record}
          categories={categories.data || []}
          onClose={() => setEditor(null)}
          onAccessError={accessError}
          onSaved={(message) => void afterSave(message)}
        />
      )}
      {bookingId && (
        <AdminBookingDialog
          id={bookingId}
          userId={user.id}
          onClose={() => setBookingId(null)}
          onAction={bookingAction}
          onAccessError={accessError}
        />
      )}
      <AdminModal
        visible={!!action}
        title={action?.title || ''}
        onClose={() => setAction(null)}
        busy={acting}
        width={520}
        footer={
          <>
            <AdminButton
              title="Hủy bỏ"
              variant="secondary"
              onPress={() => setAction(null)}
              disabled={acting}
            />
            <AdminButton
              title={action?.button || 'Xác nhận'}
              variant={action?.danger ? 'danger' : 'primary'}
              onPress={() => void confirm()}
              busy={acting}
            />
          </>
        }
      >
        <Text style={a.text}>{action?.description}</Text>
        {!!action?.context && (
          <View style={{ padding: 14, borderRadius: 9, backgroundColor: colors.background }}>
            <Text selectable style={a.text}>
              {action.context}
            </Text>
          </View>
        )}
        {action?.reason && (
          <AdminField
            label="Lý do *"
            value={reason}
            onChange={setReason}
            multiline
            helper="Từ 3 đến 500 ký tự. Lý do sẽ được lưu cùng quyết định."
            disabled={acting}
          />
        )}
        {!!actionError && <AdminNotice text={actionError} error />}
      </AdminModal>
      <AdminModal visible={menu} title="Menu quản trị" onClose={() => setMenu(false)} width={360}>
        <View style={{ backgroundColor: colors.navy, padding: 10, borderRadius: 12 }}>
          {navItems}
        </View>
      </AdminModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  gate: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  sidebar: { width: 238, backgroundColor: colors.navy, paddingHorizontal: 16, paddingTop: 30 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    marginBottom: 43,
  },
  brandMark: {
    width: 40,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#1B4150',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.7 },
  brandCaption: { color: '#7E9BAA', fontSize: 8, letterSpacing: 1.5, marginTop: 4 },
  groupLabel: {
    color: '#668594',
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '600',
    marginBottom: 17,
    marginLeft: 13,
  },
  navItem: {
    minHeight: 47,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  navActive: { backgroundColor: '#1D4351' },
  navText: { color: '#91A7B3', fontSize: 12, fontWeight: '500', flex: 1 },
  navDot: { width: 5, height: 5, backgroundColor: '#39CEDF', borderRadius: 3 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 21,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: '#294653',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 21,
    paddingHorizontal: 6,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#1D4553',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 30,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  adminTag: {
    backgroundColor: colors.pale,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pageTitle: { color: colors.ink, fontSize: 25, fontWeight: '700', letterSpacing: -0.5 },
  footer: { color: '#9BABBA', fontSize: 10, textAlign: 'center', marginTop: 5 },
  categoryIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.pale,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
