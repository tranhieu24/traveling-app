import { useUiPreferences, uiStyle, uiColor, uiTextStyle, uiText } from '../../preferences/ui';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Building2, CalendarDays, Users } from 'lucide-react-native';
import { adminList, adminRevenue } from '../../services/admin';
import {
  adminDate,
  adminError,
  adminMoney,
  isAdminAccessError,
  monthRange,
} from '../../utils/admin';
import type { AdminSection } from '../../types/admin';
import { a, AdminBadge, AdminButton, AdminEmpty, AdminTable, colors } from './AdminUI';
import { AdminStat, RevenueChart } from './AdminRevenue';

export function AdminOverview({
  userId,
  onSection,
  onBooking,
  onAccessError,
}: {
  userId: string;
  onSection: (section: AdminSection) => void;
  onBooking: (id: string) => void;
  onAccessError: () => void;
}) {
  useUiPreferences();
  const range = monthRange();
  const query = useQuery({
    queryKey: ['admin', userId, 'overview', range],
    retry: false,
    queryFn: async ({ signal }) => {
      const [listings, customers, bookings, refunds, revenue] = await Promise.all([
        adminList('listings', { limit: 1, isActive: 'true' }, signal),
        adminList('customers', { limit: 1 }, signal),
        adminList('bookings', { limit: 5 }, signal),
        adminList('refunds', { limit: 1, status: 'requested' }, signal),
        adminRevenue(range.from, range.to, signal),
      ]);
      return { listings, customers, bookings, refunds, revenue };
    },
  });
  useEffect(() => {
    if (isAdminAccessError(query.error)) onAccessError();
  }, [query.error, onAccessError]);
  if (query.isLoading)
    return (
      <View style={uiStyle({ padding: 70 })}>
        <ActivityIndicator color={uiColor(colors.primary)} />
      </View>
    );
  if (query.error || !query.data)
    return <AdminEmpty error={adminError(query.error)} onRetry={() => void query.refetch()} />;
  const { listings, customers, bookings, refunds, revenue } = query.data;
  return (
    <View style={uiStyle({ gap: 22 })}>
      <View
        style={uiStyle([
          a.card,
          {
            padding: 23,
            backgroundColor: '#E7F8FB',
            borderColor: '#D4EFF3',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
          },
        ])}
      >
        <View style={uiStyle({ flex: 1, minWidth: 200, gap: 7 })}>
          <Text style={uiTextStyle({ color: '#167B8B', fontSize: 20, fontWeight: '700' })}>{uiText("Mọi chuyến đi, một nơi quản lý.")}</Text>
          <Text style={uiTextStyle([a.muted, { color: '#5A929D' }])}>{uiText("Theo dõi đặt phòng, quản lý chỗ ở và chăm sóc khách hàng của Traveling.")}</Text>
        </View>
        <AdminButton
          title={uiText("Quản lý đặt phòng")}
          onPress={() => onSection('bookings')}
          icon={<ArrowUpRight size={17} color={uiColor("#FFF")} />}
        />
      </View>
      <View style={uiStyle(a.wrap)}>
        <AdminStat
          label={uiText("Doanh thu thuần tháng này")}
          value={adminMoney(revenue.net_revenue)}
          detail="Đã thu trừ hoàn tiền · USD · UTC"
        />
        <AdminStat
          label={uiText("Tổng đơn đặt phòng")}
          value={String(bookings.pagination.total)}
          detail="Tất cả trạng thái"
          icon={<CalendarDays size={17} color={uiColor("#8B73C7")} />}
          tone="#F1EDFD"
        />
        <AdminStat
          label={uiText("Chỗ ở đang hiển thị")}
          value={String(listings.pagination.total)}
          detail="Đang được niêm yết"
          icon={<Building2 size={17} color={uiColor("#D39B51")} />}
          tone="#FFF2E3"
        />
        <AdminStat
          label={uiText("Tài khoản khách hàng")}
          value={String(customers.pagination.total)}
          detail="Khách hàng và chủ chỗ ở"
          icon={<Users size={17} color={uiColor("#4E9E80")} />}
          tone="#E8F8F0"
        />
      </View>
      {refunds.pagination.total > 0 && (
        <View
          style={uiStyle([
            a.card,
            {
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 15,
              flexWrap: 'wrap',
            },
          ])}
        >
          <Text style={uiTextStyle(a.text)}>{uiText(refunds.pagination.total)}{uiText(" yêu cầu hoàn tiền đang chờ duyệt.")}</Text>
          <AdminButton
            title={uiText("Xem yêu cầu")}
            variant="secondary"
            small
            onPress={() => onSection('refunds')}
          />
        </View>
      )}
      <RevenueChart report={revenue} compact />
      <View style={uiStyle(a.card)}>
        <View style={uiStyle([a.row, { padding: 20, justifyContent: 'space-between' }])}>
          <Text style={uiTextStyle([a.sectionTitle, { marginBottom: 0 }])}>{uiText("Đặt phòng gần đây")}</Text>
          <AdminButton
            title={uiText("Xem tất cả")}
            small
            variant="ghost"
            onPress={() => onSection('bookings')}
          />
        </View>
        <AdminTable
          rows={bookings.items}
          columns={[
            {
              key: 'code',
              title: 'MÃ ĐẶT PHÒNG',
              width: 190,
              render: (r) => <Text style={uiTextStyle([a.text, { fontWeight: '600' }])}>{uiText(r.booking_code)}</Text>,
            },
            {
              key: 'stay',
              title: 'CHỖ Ở / KHÁCH HÀNG',
              width: 230,
              render: (r) => (
                <View>
                  <Text numberOfLines={1} style={uiTextStyle(a.text)}>
                    {uiText(r.listing_title || r.listing_id)}
                  </Text>
                  <Text style={uiTextStyle(a.helper)}>{uiText(r.guest_name || r.guest_email)}</Text>
                </View>
              ),
            },
            {
              key: 'dates',
              title: 'NHẬN / TRẢ PHÒNG',
              width: 190,
              render: (r) => (
                <Text style={uiTextStyle(a.muted)}>
                  {uiText(adminDate(r.check_in_date))}{uiText(" → ")}{uiText(adminDate(r.check_out_date))}
                </Text>
              ),
            },
            {
              key: 'total',
              title: 'TỔNG TIỀN',
              width: 130,
              render: (r) => (
                <Text style={uiTextStyle([a.text, { fontWeight: '600' }])}>{uiText(adminMoney(r.total_price))}</Text>
              ),
            },
            {
              key: 'status',
              title: 'TRẠNG THÁI',
              width: 150,
              render: (r) => <AdminBadge status={r.booking_status} />,
            },
            {
              key: 'action',
              title: '',
              width: 110,
              render: (r) => (
                <AdminButton
                  title={uiText("Chi tiết")}
                  small
                  variant="secondary"
                  onPress={() => onBooking(r.id)}
                />
              ),
            },
          ]}
        />
        {!bookings.items.length && (
          <AdminEmpty
            title={uiText("Chưa có đơn đặt phòng")}
            description={uiText("Đơn đặt phòng mới sẽ xuất hiện tại đây.")}
          />
        )}
      </View>
    </View>
  );
}
