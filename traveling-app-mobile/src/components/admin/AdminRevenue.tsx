import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp } from 'lucide-react-native';
import type { RevenueReport } from '../../types/admin';
import { adminRevenue, exportAdminRevenue } from '../../services/admin';
import {
  adminDate,
  adminError,
  adminMoney,
  isAdminAccessError,
  monthRange,
  revenueSeries,
  validateReportRange,
} from '../../utils/admin';
import {
  a,
  AdminBadge,
  AdminButton,
  AdminEmpty,
  AdminField,
  AdminNotice,
  AdminTable,
  colors,
} from './AdminUI';

export function AdminStat({
  label,
  value,
  detail,
  icon,
  tone = '#E8F8FB',
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
  tone?: string;
}) {
  return (
    <View style={[a.card, { padding: 20, flex: 1, minWidth: 180, gap: 13 }]}>
      <View style={[a.row, { justifyContent: 'space-between' }]}>
        <Text style={[a.muted, { flex: 1 }]}>{label}</Text>
        <View style={{ backgroundColor: tone, padding: 8, borderRadius: 9 }}>
          {icon || <TrendingUp size={17} color={colors.primary} />}
        </View>
      </View>
      <Text style={{ fontSize: 27, fontWeight: '700', color: colors.ink }}>{value}</Text>
      {!!detail && <Text style={a.helper}>{detail}</Text>}
    </View>
  );
}

export function RevenueChart({ report, compact }: { report: RevenueReport; compact?: boolean }) {
  const series = revenueSeries(report.items, report.from, report.to, compact ? 8 : 12);
  const [selected, setSelected] = useState<number | null>(null);
  const maximum = Math.max(1, ...series.flatMap((point) => [point.gross, point.refunds]));
  const picked = selected !== null ? series[selected] : null;
  return (
    <View style={[a.card, { padding: 22, gap: 18 }]}>
      <View style={[a.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <View>
          <Text style={a.sectionTitle}>Thu & hoàn tiền</Text>
          <Text style={a.muted}>
            {adminDate(report.from)} – {adminDate(report.to)} · USD · {report.timezone}
          </Text>
        </View>
        <View style={a.row}>
          <View style={[a.dot, { backgroundColor: colors.primary }]} />
          <Text style={a.helper}>Đã thu</Text>
          <View style={[a.dot, { backgroundColor: '#EFB56C', marginLeft: 10 }]} />
          <Text style={a.helper}>Đã hoàn</Text>
        </View>
      </View>
      {report.scope === 'test_and_mock_only' && (
        <AdminBadge status="upcoming" label="Dữ liệu thanh toán thử nghiệm" />
      )}
      <View
        style={{
          flexDirection: 'row',
          height: compact ? 170 : 220,
          gap: 9,
          alignItems: 'flex-end',
          paddingTop: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {series.map((point, i) => (
          <Pressable
            key={point.day}
            accessibilityRole="button"
            accessibilityLabel={`${point.day}: đã thu ${adminMoney(point.gross)}, đã hoàn ${adminMoney(point.refunds)}`}
            onPress={() => setSelected(i)}
            style={{ flex: 1, height: '100%', justifyContent: 'flex-end', gap: 7 }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: 3,
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  maxWidth: 26,
                  height: point.gross ? `${Math.max(1, (point.gross / maximum) * 100)}%` : 2,
                  backgroundColor: selected === i ? '#087C90' : '#32BDCE',
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
              <View
                style={{
                  flex: 1,
                  maxWidth: 26,
                  height: point.refunds ? `${Math.max(1, (point.refunds / maximum) * 100)}%` : 2,
                  backgroundColor: '#EFB56C',
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[a.helper, { textAlign: 'center', fontSize: 9, paddingBottom: 7 }]}
            >
              {point.day.slice(5).split('-').reverse().join('/')}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={a.helper}>
        {picked
          ? `Từ ${adminDate(picked.day)}: đã thu ${adminMoney(picked.gross)} · đã hoàn ${adminMoney(picked.refunds)} · thuần ${adminMoney(picked.gross - picked.refunds)}`
          : 'Chọn một cột để xem số tiền trong kỳ. Các ngày được gộp khi chọn khoảng thời gian dài.'}
      </Text>
      {!report.items.length && (
        <Text style={[a.muted, { textAlign: 'center' }]}>
          Chưa có giao dịch thành công trong khoảng thời gian này.
        </Text>
      )}
    </View>
  );
}

export function AdminRevenue({
  userId,
  onAccessError,
}: {
  userId: string;
  onAccessError: () => void;
}) {
  const [draft, setDraft] = useState(monthRange),
    [range, setRange] = useState(monthRange);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [exporting, setExporting] = useState(false);
  const query = useQuery({
    queryKey: ['admin', userId, 'revenue', range],
    queryFn: ({ signal }) => adminRevenue(range.from, range.to, signal),
    retry: false,
  });
  React.useEffect(() => {
    if (isAdminAccessError(query.error)) onAccessError();
  }, [query.error, onAccessError]);
  const report = !query.error ? query.data : undefined;
  const apply = () => {
    const message = validateReportRange(draft.from, draft.to);
    setError(message || '');
    if (!message) {
      setNotice('');
      if (draft.from === range.from && draft.to === range.to) void query.refetch();
      else setRange({ ...draft });
    }
  };
  const download = async () => {
    if (exporting || draft.from !== range.from || draft.to !== range.to || validateReportRange(draft.from, draft.to)) return;
    setExporting(true);
    setError('');
    setNotice('');
    try {
      await exportAdminRevenue(range.from, range.to);
      setNotice('Đã tải báo cáo Excel.');
    } catch (failure) {
      if (isAdminAccessError(failure)) onAccessError();
      else setError(adminError(failure));
    } finally {
      setExporting(false);
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <View style={[a.card, { padding: 20, gap: 16 }]}>
        <View style={[a.wrap, { alignItems: 'flex-end' }]}>
          <AdminField
            label="Từ ngày (YYYY-MM-DD)"
            value={draft.from}
            onChange={(from) => setDraft((current) => ({ ...current, from }))}
          />
          <AdminField
            label="Đến ngày (YYYY-MM-DD)"
            value={draft.to}
            onChange={(to) => setDraft((current) => ({ ...current, to }))}
          />
          <AdminButton title="Xem báo cáo" onPress={apply} busy={query.isFetching} />
          <AdminButton
            title="Xuất Excel"
            variant="secondary"
            onPress={() => void download()}
            busy={exporting}
            disabled={!report || query.isFetching || draft.from !== range.from || draft.to !== range.to || !!validateReportRange(draft.from, draft.to)}
            icon={<Download size={16} color={colors.primary} />}
          />
        </View>
        <Text style={a.helper}>
          Chỉ tính giao dịch đã thanh toán và hoàn tiền đã thành công. Ngày báo cáo dùng UTC; khoảng
          xem tối đa 367 ngày. Nhấn “Xem báo cáo” để áp dụng khoảng ngày trước khi xuất Excel.
        </Text>
        {!!error && <AdminNotice text={error} error />}
        {!!notice && <AdminNotice text={notice} onClose={() => setNotice('')} />}
      </View>
      {query.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : query.error ? (
        <AdminEmpty error={adminError(query.error)} onRetry={() => void query.refetch()} />
      ) : (
        report && (
          <>
            <View style={a.wrap}>
              <AdminStat
                label="Tổng tiền đã thu"
                value={adminMoney(report.gross_payments)}
                detail="Giao dịch thanh toán thành công"
              />
              <AdminStat
                label="Tổng tiền đã hoàn"
                value={adminMoney(report.refunds)}
                detail="Yêu cầu hoàn tiền thành công"
                tone="#FFF2E3"
              />
              <AdminStat
                label="Doanh thu thuần"
                value={adminMoney(report.net_revenue)}
                detail="Đã thu trừ đã hoàn"
              />
              <AdminStat
                label="Giao dịch thành công"
                value={String(
                  report.items.reduce((n, item) => n + Number(item.successful_transactions), 0)
                )}
                detail="Số giao dịch, không phải số đơn duy nhất"
              />
            </View>
            <RevenueChart report={report} />
            <View style={a.card}>
              <View style={{ padding: 20 }}>
                <Text style={a.sectionTitle}>Chi tiết giao dịch theo ngày</Text>
                <Text style={a.helper}>
                  Mỗi dòng được tách theo nhà cung cấp và loại giao dịch thử nghiệm.
                </Text>
              </View>
              <AdminTable
                rows={report.items.map((item, index) => ({
                  ...item,
                  id: `${item.day}-${item.provider}-${index}`,
                }))}
                columns={[
                  {
                    key: 'day',
                    title: 'NGÀY (UTC)',
                    width: 135,
                    render: (r) => <Text style={a.text}>{adminDate(r.day)}</Text>,
                  },
                  {
                    key: 'provider',
                    title: 'NHÀ CUNG CẤP',
                    width: 155,
                    render: (r) => (
                      <View>
                        <Text style={a.text}>{r.provider}</Text>
                        <Text style={a.helper}>
                          {r.is_simulated
                            ? 'Mô phỏng'
                            : report.scope === 'test_and_mock_only'
                              ? 'Thử nghiệm'
                              : 'Giao dịch thực'}
                        </Text>
                      </View>
                    ),
                  },
                  {
                    key: 'gross',
                    title: 'ĐÃ THU',
                    width: 140,
                    render: (r) => <Text style={a.text}>{adminMoney(r.gross_payments)}</Text>,
                  },
                  {
                    key: 'refunds',
                    title: 'ĐÃ HOÀN',
                    width: 140,
                    render: (r) => <Text style={a.text}>{adminMoney(r.refunds)}</Text>,
                  },
                  {
                    key: 'net',
                    title: 'DOANH THU THUẦN',
                    width: 155,
                    render: (r) => (
                      <Text style={[a.text, { fontWeight: '700', color: colors.primary }]}>
                        {adminMoney(r.net_revenue)}
                      </Text>
                    ),
                  },
                  {
                    key: 'count',
                    title: 'GIAO DỊCH / HOÀN',
                    width: 150,
                    render: (r) => (
                      <Text style={a.text}>
                        {r.successful_transactions} / {r.successful_refunds}
                      </Text>
                    ),
                  },
                ]}
              />
              {!report.items.length && (
                <AdminEmpty
                  title="Chưa có giao dịch"
                  description="Chọn khoảng thời gian khác để xem báo cáo."
                />
              )}
            </View>
          </>
        )
      )}
    </View>
  );
}
