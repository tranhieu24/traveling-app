import { uiLocale, useUiPreferences, uiStyle, uiText, uiColor, uiTextStyle } from '../preferences/ui';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  FileText,
  HelpCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react-native';
import { Booking, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchPaymentAccount } from '../services/paymentAccount';
import { downloadBookingReceipt } from '../services/bookingReceipt';
import {
  accountDate,
  collectRefunds,
  getAccountTotals,
  hasReceipt,
  matchesPaymentFilter,
  PaymentHistoryFilter,
} from '../utils/paymentAccount';
import { formatPaymentMoney } from '../utils/paymentSummary';
import { PaymentBookingCard, RefundCard } from '../components/payments/AccountPaymentCards';

const filters: { key: PaymentHistoryFilter; label: string }[] = [
  { key: 'all', label: "Tất cả" },
  { key: 'outstanding', label: 'Cần thanh toán' },
  { key: 'paid', label: 'Paid' },
];

export const PaymentsPayoutsScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentsPayouts'>>();
  const [tab, setTab] = useState<'payments' | 'payouts'>('payments');
  useEffect(() => {
    if (route.params?.tab) {
      setTab(route.params.tab === 'payouts' ? 'payouts' : 'payments');
      navigation.setParams({ tab: undefined });
    }
  }, [route.params?.tab, navigation]);
  const [filter, setFilter] = useState<PaymentHistoryFilter>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [receiptNotice, setReceiptNotice] = useState<{
    id: string;
    error?: string;
    message?: string;
  } | null>(null);
  const receiptPending = useRef(false);
  const account = useQuery({
    queryKey: ['my_bookings', user?.id, 'payment_account'],
    queryFn: ({ signal }) => fetchPaymentAccount(signal),
    enabled: !authLoading && !!user,
    retry: (count, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 401) && count < 1,
  });
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) void account.refetch();
    }, [authLoading, user?.id, account.refetch])
  );

  const bookings = account.data || [],
    refunds = collectRefunds(bookings);
  const totals = getAccountTotals(bookings);
  const visible = bookings.filter((booking) => matchesPaymentFilter(booking, filter));
  const needsLogin =
    !authLoading &&
    (!user || (axios.isAxiosError(account.error) && account.error.response?.status === 401));
  const back = () =>
    navigation.canGoBack()
      ? navigation.goBack()
      : navigation.replace('MainTabs', { screen: 'ProfileTab' });
  const viewBookings = () => navigation.navigate('MainTabs', { screen: 'BookingsTab' });
  const download = async (booking: Booking) => {
    if (receiptPending.current || !hasReceipt(booking)) return;
    receiptPending.current = true;
    setDownloadingId(booking.id);
    setReceiptNotice(null);
    try {
      await downloadBookingReceipt(booking.id, booking.booking_code);
      setReceiptNotice({ id: booking.id, message: 'Biên lai đã sẵn sàng để lưu.' });
    } catch (error) {
      setReceiptNotice({
        id: booking.id,
        error:
          error instanceof Error
            ? error.message
            : 'Không thể tải biên lai. Vui lòng thử lại.',
      });
    } finally {
      receiptPending.current = false;
      setDownloadingId(null);
    }
  };
  const refundedCount = refunds.filter(({ refund }) => refund.status === 'succeeded').length;
  const pendingRefunds = refunds.filter(({ refund }) =>
    ['requested', 'approved', 'processing'].includes(refund.status)
  ).length;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={uiStyle(s.screen)}>
      <View style={uiStyle(s.header)}>
        <View style={uiStyle(s.headerInner)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Quay lại hồ sơ")}
            onPress={back}
            style={uiStyle(s.headerButton)}
          >
            <ArrowLeft size={21} color={uiColor("#566271")} />
          </Pressable>
          <Text accessibilityRole="header" style={uiTextStyle(s.headerTitle)}>{uiText("Thanh toán và nhận tiền")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Cập nhật thanh toán")}
            disabled={!user || authLoading || account.isFetching}
            onPress={() => void account.refetch()}
            style={uiStyle([s.headerButton, (!user || account.isFetching) && { opacity: 0.4 }])}
          >
            <RefreshCw size={19} color={uiColor("#81909F")} />
          </Pressable>
        </View>
      </View>
      {authLoading || (!!user && account.isLoading) ? (
        <View style={uiStyle(s.center)}>
          <ActivityIndicator color={uiColor("#00B8CE")} />
          <Text style={uiTextStyle(s.centerCopy)}>{uiText("Đang tải thông tin thanh toán...")}</Text>
        </View>
      ) : needsLogin ? (
        <View style={uiStyle(s.center)}>
          <View style={uiStyle(s.emptyIcon)}>
            <LockKeyhole size={29} color={uiColor("#00ABBF")} />
          </View>
          <Text style={uiTextStyle(s.emptyTitle)}>{uiText("Thông tin thanh toán của bạn được bảo mật")}</Text>
          <Text style={uiTextStyle(s.centerCopy)}>
            {user ? uiText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.') : uiText('Đăng nhập để xem lịch sử thanh toán, biên lai và hoàn tiền của các đơn đặt chỗ.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Đăng nhập để xem thanh toán")}
            onPress={() => navigation.navigate('Login')}
            style={uiStyle(s.primary)}
          >
            <Text style={uiTextStyle(s.primaryLabel)}>{uiText("Đăng nhập")}</Text>
          </Pressable>
        </View>
      ) : account.isError && !account.data ? (
        <View style={uiStyle(s.center)}>
          <AlertCircle size={36} color={uiColor("#00B8CE")} />
          <Text style={uiTextStyle(s.emptyTitle)}>{uiText("Không thể tải thông tin thanh toán")}</Text>
          <Text style={uiTextStyle(s.centerCopy)}>{uiText("Vui lòng kiểm tra kết nối rồi thử lại.")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Tải lại lịch sử thanh toán")}
            onPress={() => void account.refetch()}
            style={uiStyle(s.primary)}
          >
            <Text style={uiTextStyle(s.primaryLabel)}>{uiText("Thử lại")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={uiStyle(s.content)}
          refreshControl={
            <RefreshControl
              refreshing={account.isRefetching}
              onRefresh={() => void account.refetch()}
              tintColor={uiColor("#00B8CE")}
            />
          }
        >
          <View style={uiStyle(s.intro)}>
            <View style={uiStyle(s.introIcon)}>
              <CreditCard size={22} color={uiColor("#00A8BD")} />
            </View>
            <View style={uiStyle({ flex: 1 })}>
              <Text style={uiTextStyle(s.introTitle)}>{uiText("Quản lý chi phí cho mọi chuyến đi")}</Text>
              <Text style={uiTextStyle(s.introDescription)}>{uiText("Thanh toán, biên lai và hoàn tiền được quản lý tại một nơi.")}</Text>
            </View>
          </View>
          <View style={uiStyle(s.summary)}>
            <View style={uiStyle(s.summaryTop)}>
              <Text style={uiTextStyle(s.summaryLabel)}>{uiText("Tổng đã thanh toán")}</Text>
              <Text style={uiTextStyle(s.currency)}>{uiText("USD")}</Text>
            </View>
            <Text style={uiTextStyle(s.total)}>{uiText(formatPaymentMoney(totals.paid, 'USD', uiLocale()))}</Text>
            <View style={uiStyle(s.summaryBottom)}>
              <View style={uiStyle({ flex: 1 })}>
                <Text style={uiTextStyle(s.summarySmall)}>{uiText("Cần thanh toán")}</Text>
                <Text style={uiTextStyle(s.summaryValue)}>{uiText(formatPaymentMoney(totals.outstanding, 'USD', uiLocale()))}</Text>
              </View>
              <View style={uiStyle(s.summaryDivider)} />
              <View style={uiStyle({ flex: 1 })}>
                <Text style={uiTextStyle(s.summarySmall)}>{uiText("Đã hoàn tiền")}</Text>
                <Text style={uiTextStyle(s.summaryValue)}>{uiText(formatPaymentMoney(totals.refunded, 'USD', uiLocale()))}</Text>
              </View>
            </View>
          </View>
          <View style={uiStyle(s.tabs)}>
            {(['payments', 'payouts'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={value === 'payments' ? uiText('Thanh toán') : uiText('Hoàn tiền')}
                accessibilityState={{ selected: tab === value }}
                aria-selected={tab === value}
                onPress={() => setTab(value)}
                style={uiStyle([s.tab, tab === value && s.activeTab])}
              >
                <Text style={uiTextStyle([s.tabLabel, tab === value && s.activeTabLabel])}>
                  {value === 'payments' ? uiText('Thanh toán') : uiText('Hoàn tiền')}
                </Text>
              </Pressable>
            ))}
          </View>
          {account.isError && (
            <View style={uiStyle(s.refreshError)}>
              <AlertCircle size={17} color={uiColor("#AF7A28")} />
              <Text style={uiTextStyle(s.refreshErrorCopy)}>{uiText("Không thể cập nhật. Đây là thông tin được tải gần nhất.")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={uiText("Thử cập nhật thanh toán lần nữa")}
                onPress={() => void account.refetch()}
              >
                <Text style={uiTextStyle(s.link)}>{uiText("Thử lại")}</Text>
              </Pressable>
            </View>
          )}
          {tab === 'payments' ? (
            <>
              <View style={uiStyle(s.sectionHeading)}>
                <Text style={uiTextStyle(s.sectionTitle)}>{uiText("Lịch sử thanh toán")}</Text>
                <Text style={uiTextStyle(s.count)}>
                  {uiText(bookings.length)}{uiText(" đơn đặt chỗ")}</Text>
              </View>
              <View style={uiStyle(s.filters)}>
                {filters.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={uiText(`Bộ lọc thanh toán: ${item.label}`)}
                    accessibilityState={{ selected: filter === item.key }}
                    aria-pressed={filter === item.key}
                    onPress={() => setFilter(item.key)}
                    style={uiStyle([s.filter, filter === item.key && s.activeFilter])}
                  >
                    <Text style={uiTextStyle([s.filterLabel, filter === item.key && s.activeFilterLabel])}>
                      {uiText(item.label)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {visible.length ? (
                visible.map((booking) => (
                  <PaymentBookingCard
                    key={booking.id}
                    booking={booking}
                    onOpen={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
                    onPay={(plan) =>
                      navigation.navigate("Payment", { bookingId: booking.id, plan })
                    }
                    onReceipt={() => void download(booking)}
                    downloading={downloadingId === booking.id}
                    receiptDisabled={!!downloadingId}
                    receiptMessage={
                      receiptNotice?.id === booking.id ? receiptNotice.message : undefined
                    }
                    receiptError={
                      receiptNotice?.id === booking.id ? receiptNotice.error : undefined
                    }
                  />
                ))
              ) : (
                <View style={uiStyle(s.emptyCard)}>
                  <View style={uiStyle(s.emptyIcon)}>
                    <CreditCard size={28} color={uiColor("#00B0C5")} />
                  </View>
                  <Text style={uiTextStyle(s.emptyTitle)}>
                    {!bookings.length ? uiText('Chưa có thanh toán') : filter === 'outstanding' ? uiText('Không có khoản chưa thanh toán') : uiText('Chưa có thanh toán hoàn tất')}
                  </Text>
                  <Text style={uiTextStyle(s.centerCopy)}>
                    {!bookings.length ? uiText('Thanh toán và biên lai chuyến đi sẽ xuất hiện ở đây sau khi bạn đặt chỗ.') : filter === 'outstanding' ? uiText('Hiện không có số dư đơn đặt chỗ cần thanh toán.') : uiText('Thanh toán thành công sẽ xuất hiện sau khi được xác nhận.')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={bookings.length ? uiText('Xem tất cả thanh toán') : uiText('Khám phá chỗ ở')}
                    onPress={() =>
                      bookings.length
                        ? setFilter('all')
                        : navigation.navigate('MainTabs', { screen: 'SearchTab' })
                    }
                    style={uiStyle(s.primary)}
                  >
                    <Text style={uiTextStyle(s.primaryLabel)}>
                      {bookings.length ? uiText('Xem tất cả thanh toán') : uiText('Khám phá chỗ ở')}
                    </Text>
                  </Pressable>
                </View>
              )}
              <View style={uiStyle(s.receiptInfo)}>
                <FileText size={21} color={uiColor("#00A8BD")} />
                <View style={uiStyle({ flex: 1 })}>
                  <Text style={uiTextStyle(s.infoTitle)}>{uiText("Biên lai cho mọi chuyến đi đã thanh toán")}</Text>
                  <Text style={uiTextStyle(s.infoCopy)}>{uiText("Biên lai PDF có sau khi thanh toán thành công. Phương thức thanh toán được chọn tại bước thanh toán.")}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={uiStyle(s.sectionHeading)}>
                <Text style={uiTextStyle(s.sectionTitle)}>{uiText("Hoàn tiền")}</Text>
                <Text style={uiTextStyle(s.count)}>
                  {uiText(refunds.length)}{uiText(" yêu cầu hoàn tiền")}</Text>
              </View>
              <View style={uiStyle(s.refundInfo)}>
                <ShieldCheck size={23} color={uiColor("#00A8BD")} />
                <View style={uiStyle({ flex: 1 })}>
                  <Text style={uiTextStyle(s.infoTitle)}>{uiText("Hoàn tiền từ đơn đặt chỗ đã hủy")}</Text>
                  <Text style={uiTextStyle(s.infoCopy)}>{uiText("Quản trị viên sẽ xem xét từng yêu cầu. Khoản hoàn được duyệt sẽ trả về phương thức thanh toán ban đầu sau khi xử lý được xác nhận.")}</Text>
                </View>
              </View>
              {refunds.length > 0 && (
                <View style={uiStyle(s.refundCounts)}>
                  <Text style={uiTextStyle(s.count)}>{uiText(pendingRefunds)}{uiText(" đang chờ hoàn tất")}</Text>
                  <Text style={uiTextStyle(s.count)}>{uiText(refundedCount)}{uiText(" đã hoàn tất")}</Text>
                </View>
              )}
              {refunds.length ? (
                refunds.map(({ booking, refund }) => (
                  <RefundCard
                    key={refund.id}
                    booking={booking}
                    refund={refund}
                    onOpen={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
                  />
                ))
              ) : (
                <View style={uiStyle(s.emptyCard)}>
                  <View style={uiStyle(s.emptyIcon)}>
                    <RotateCcw size={28} color={uiColor("#00B0C5")} />
                  </View>
                  <Text style={uiTextStyle(s.emptyTitle)}>{uiText("Chưa có khoản hoàn tiền cần theo dõi")}</Text>
                  <Text style={uiTextStyle(s.centerCopy)}>{uiText("Yêu cầu hoàn tiền cho đơn đã hủy sẽ xuất hiện ở đây cùng trạng thái phê duyệt và xử lý.")}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={uiText("Xem đơn đặt chỗ từ mục hoàn tiền")}
                    onPress={viewBookings}
                    style={uiStyle(s.primary)}
                  >
                    <Text style={uiTextStyle(s.primaryLabel)}>{uiText("Xem đơn đặt chỗ")}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiText("Trợ giúp thanh toán và hoàn tiền")}
            onPress={() => navigation.navigate('HelpCenter')}
            style={uiStyle(s.help)}
          >
            <HelpCircle size={18} color={uiColor("#94A0AC")} />
            <Text style={uiTextStyle(s.helpLabel)}>{uiText("Bạn cần hỗ trợ thanh toán hoặc hoàn tiền?")}</Text>
            <ArrowUpRight size={17} color={uiColor("#94A0AC")} />
          </Pressable>
          <Text style={uiTextStyle(s.updated)}>{uiText("Cập nhật")}{uiText(' ')}
            {uiText(accountDate(
              account.dataUpdatedAt ? new Date(account.dataUpdatedAt).toISOString() : undefined
            ))}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { borderBottomWidth: 1, borderBottomColor: '#ECEFF3', backgroundColor: 'white' },
  headerInner: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  headerButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
    color: '#293545',
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
  },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#DEF7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: '#2C3745' },
  introDescription: { color: '#8E99A6', fontSize: 12, lineHeight: 19, marginTop: 4 },
  summary: {
    borderRadius: 18,
    backgroundColor: '#E9FAFC',
    borderWidth: 1,
    borderColor: '#CBF0F5',
    padding: 20,
    marginBottom: 22,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#56808B', fontSize: 13 },
  currency: {
    backgroundColor: 'white',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#5B8995',
  },
  total: { color: '#244F5A', fontSize: 34, lineHeight: 44, fontWeight: '700', marginTop: 7 },
  summaryBottom: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#CAEAF0',
  },
  summarySmall: { color: '#7498A1', fontSize: 12 },
  summaryValue: { color: '#38636F', fontSize: 16, fontWeight: '600', marginTop: 6 },
  summaryDivider: { width: 1, backgroundColor: '#CAEAF0' },
  tabs: {
    padding: 4,
    backgroundColor: '#ECEFF3',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    marginBottom: 25,
  },
  tab: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  activeTab: { backgroundColor: '#00B8CE' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#8894A2' },
  activeTabLabel: { color: 'white' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 15,
  },
  sectionTitle: { color: '#2C3745', fontSize: 18, fontWeight: '700' },
  count: { color: '#94A0AC', fontSize: 11, lineHeight: 18 },
  filters: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  filter: {
    borderWidth: 1,
    borderColor: '#E2E7ED',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  activeFilter: { borderColor: '#AEEAF1', backgroundColor: '#E7F9FC' },
  filterLabel: { color: '#8995A3', fontSize: 12 },
  activeFilterLabel: { color: '#009DB2', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  centerCopy: {
    fontSize: 13,
    color: '#8E99A6',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 380,
    marginTop: 5,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5F8FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#344251',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  primary: {
    minHeight: 43,
    backgroundColor: '#00B8CE',
    borderRadius: 8,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryLabel: { color: 'white', fontWeight: '600', fontSize: 13 },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EAEF',
    paddingHorizontal: 24,
    paddingVertical: 30,
    marginBottom: 14,
  },
  receiptInfo: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E6EAEF',
    borderRadius: 14,
    marginTop: 4,
  },
  infoTitle: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#596777' },
  infoCopy: { fontSize: 12, lineHeight: 20, color: '#929DA9', marginTop: 5 },
  refundInfo: {
    flexDirection: 'row',
    gap: 12,
    padding: 17,
    backgroundColor: '#EDF9FC',
    borderRadius: 13,
    marginBottom: 18,
  },
  refundCounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  helpLabel: { flexShrink: 1, fontSize: 11, lineHeight: 18, color: '#8A97A4' },
  updated: { textAlign: 'center', fontSize: 10, color: '#A8B0BA' },
  refreshError: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFAED',
    borderRadius: 8,
    marginBottom: 18,
  },
  refreshErrorCopy: { flex: 1, color: '#A38450', fontSize: 11, lineHeight: 18 },
  link: { fontSize: 12, color: '#00A4BA', fontWeight: '600' },
});
