import React, { useCallback, useRef, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  { key: 'all', label: 'All' },
  { key: 'outstanding', label: 'To pay' },
  { key: 'paid', label: 'Paid' },
];

export const PaymentsPayoutsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<'payments' | 'payouts'>('payments');
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
      setReceiptNotice({ id: booking.id, message: 'Your receipt is ready to save.' });
    } catch (error) {
      setReceiptNotice({
        id: booking.id,
        error:
          error instanceof Error
            ? error.message
            : 'Could not download your receipt. Please try again.',
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
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={s.screen}>
      <View style={s.header}>
        <View style={s.headerInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            onPress={back}
            style={s.headerButton}
          >
            <ArrowLeft size={21} color="#566271" />
          </Pressable>
          <Text accessibilityRole="header" style={s.headerTitle}>
            Payments & Payouts
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh payments"
            disabled={!user || authLoading || account.isFetching}
            onPress={() => void account.refetch()}
            style={[s.headerButton, (!user || account.isFetching) && { opacity: 0.4 }]}
          >
            <RefreshCw size={19} color="#81909F" />
          </Pressable>
        </View>
      </View>
      {authLoading || (!!user && account.isLoading) ? (
        <View style={s.center}>
          <ActivityIndicator color="#00B8CE" />
          <Text style={s.centerCopy}>Loading your payments...</Text>
        </View>
      ) : needsLogin ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <LockKeyhole size={29} color="#00ABBF" />
          </View>
          <Text style={s.emptyTitle}>Your payments are private</Text>
          <Text style={s.centerCopy}>
            {user
              ? 'Your session has expired. Please log in again.'
              : 'Log in to view payment history, receipts and refunds for your bookings.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in to view payments"
            onPress={() => navigation.navigate('Login')}
            style={s.primary}
          >
            <Text style={s.primaryLabel}>Log in</Text>
          </Pressable>
        </View>
      ) : account.isError && !account.data ? (
        <View style={s.center}>
          <AlertCircle size={36} color="#00B8CE" />
          <Text style={s.emptyTitle}>Unable to load payments</Text>
          <Text style={s.centerCopy}>Please check your connection and try again.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry payment history"
            onPress={() => void account.refetch()}
            style={s.primary}
          >
            <Text style={s.primaryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={account.isRefetching}
              onRefresh={() => void account.refetch()}
              tintColor="#00B8CE"
            />
          }
        >
          <View style={s.intro}>
            <View style={s.introIcon}>
              <CreditCard size={22} color="#00A8BD" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.introTitle}>Every trip, accounted for</Text>
              <Text style={s.introDescription}>
                Your payments, receipts and refunds in one place.
              </Text>
            </View>
          </View>
          <View style={s.summary}>
            <View style={s.summaryTop}>
              <Text style={s.summaryLabel}>Total paid</Text>
              <Text style={s.currency}>USD</Text>
            </View>
            <Text style={s.total}>{formatPaymentMoney(totals.paid)}</Text>
            <View style={s.summaryBottom}>
              <View style={{ flex: 1 }}>
                <Text style={s.summarySmall}>To pay</Text>
                <Text style={s.summaryValue}>{formatPaymentMoney(totals.outstanding)}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={{ flex: 1 }}>
                <Text style={s.summarySmall}>Refunded</Text>
                <Text style={s.summaryValue}>{formatPaymentMoney(totals.refunded)}</Text>
              </View>
            </View>
          </View>
          <View style={s.tabs}>
            {(['payments', 'payouts'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={value === 'payments' ? 'Payments' : 'Payouts'}
                accessibilityState={{ selected: tab === value }}
                aria-selected={tab === value}
                onPress={() => setTab(value)}
                style={[s.tab, tab === value && s.activeTab]}
              >
                <Text style={[s.tabLabel, tab === value && s.activeTabLabel]}>
                  {value === 'payments' ? 'Payments' : 'Payouts'}
                </Text>
              </Pressable>
            ))}
          </View>
          {account.isError && (
            <View style={s.refreshError}>
              <AlertCircle size={17} color="#AF7A28" />
              <Text style={s.refreshErrorCopy}>
                Could not refresh. These are the last loaded details.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry refreshing payments"
                onPress={() => void account.refetch()}
              >
                <Text style={s.link}>Retry</Text>
              </Pressable>
            </View>
          )}
          {tab === 'payments' ? (
            <>
              <View style={s.sectionHeading}>
                <Text style={s.sectionTitle}>Payment history</Text>
                <Text style={s.count}>
                  {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
                </Text>
              </View>
              <View style={s.filters}>
                {filters.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Payment filter: ${item.label}`}
                    accessibilityState={{ selected: filter === item.key }}
                    aria-pressed={filter === item.key}
                    onPress={() => setFilter(item.key)}
                    style={[s.filter, filter === item.key && s.activeFilter]}
                  >
                    <Text style={[s.filterLabel, filter === item.key && s.activeFilterLabel]}>
                      {item.label}
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
                      navigation.navigate('Payment', { bookingId: booking.id, plan })
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
                <View style={s.emptyCard}>
                  <View style={s.emptyIcon}>
                    <CreditCard size={28} color="#00B0C5" />
                  </View>
                  <Text style={s.emptyTitle}>
                    {!bookings.length
                      ? 'No payments yet'
                      : filter === 'outstanding'
                        ? 'No outstanding payments'
                        : 'No completed payments yet'}
                  </Text>
                  <Text style={s.centerCopy}>
                    {!bookings.length
                      ? 'Your trip payments and receipts will appear here after you make a booking.'
                      : filter === 'outstanding'
                        ? 'There are no booking balances available to pay right now.'
                        : 'Successful payments will appear here once they are confirmed.'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={bookings.length ? 'View all payments' : 'Explore stays'}
                    onPress={() =>
                      bookings.length
                        ? setFilter('all')
                        : navigation.navigate('MainTabs', { screen: 'SearchTab' })
                    }
                    style={s.primary}
                  >
                    <Text style={s.primaryLabel}>
                      {bookings.length ? 'View all payments' : 'Explore stays'}
                    </Text>
                  </Pressable>
                </View>
              )}
              <View style={s.receiptInfo}>
                <FileText size={21} color="#00A8BD" />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>Receipts for every paid trip</Text>
                  <Text style={s.infoCopy}>
                    PDF receipts become available after a successful payment. Payment methods are
                    selected at checkout.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={s.sectionHeading}>
                <Text style={s.sectionTitle}>Refunds</Text>
                <Text style={s.count}>
                  {refunds.length} {refunds.length === 1 ? 'refund' : 'refunds'}
                </Text>
              </View>
              <View style={s.refundInfo}>
                <ShieldCheck size={23} color="#00A8BD" />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>Refunds from cancelled bookings</Text>
                  <Text style={s.infoCopy}>
                    An admin reviews each request. Approved refunds return through the original
                    payment method once processing is confirmed.
                  </Text>
                </View>
              </View>
              {refunds.length > 0 && (
                <View style={s.refundCounts}>
                  <Text style={s.count}>{pendingRefunds} awaiting completion</Text>
                  <Text style={s.count}>{refundedCount} completed</Text>
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
                <View style={s.emptyCard}>
                  <View style={s.emptyIcon}>
                    <RotateCcw size={28} color="#00B0C5" />
                  </View>
                  <Text style={s.emptyTitle}>No refunds to track</Text>
                  <Text style={s.centerCopy}>
                    Refund requests for your cancelled bookings will appear here, together with
                    their approval and processing status.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View bookings from payouts"
                    onPress={viewBookings}
                    style={s.primary}
                  >
                    <Text style={s.primaryLabel}>View bookings</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Payment and refund help"
            onPress={() => navigation.navigate('HelpCenter')}
            style={s.help}
          >
            <HelpCircle size={18} color="#94A0AC" />
            <Text style={s.helpLabel}>Need help with a payment or refund?</Text>
            <ArrowUpRight size={17} color="#94A0AC" />
          </Pressable>
          <Text style={s.updated}>
            Updated{' '}
            {accountDate(
              account.dataUpdatedAt ? new Date(account.dataUpdatedAt).toISOString() : undefined
            )}
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
