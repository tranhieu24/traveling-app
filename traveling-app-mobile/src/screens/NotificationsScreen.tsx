import { uiLocale, useUiPreferences, uiStyle, uiTextStyle, uiText, uiColor } from '../preferences/ui';

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, BellRing, CalendarCheck, CheckCheck, ChevronRight, CircleDollarSign, CreditCard, RotateCcw, Settings, XCircle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';
import { AppNotification, fetchNotifications, groupNotifications, notificationKeys } from '../services/notifications';
import { useNotificationActions, useNotificationForeground, useUnreadNotifications } from '../hooks/useNotifications';

const appearance = {
  booking_created: { icon: CalendarCheck, color: '#008B9C', background: '#DCF7FA' },
  payment_received: { icon: CreditCard, color: '#168258', background: '#E5F6ED' },
  booking_cancelled: { icon: XCircle, color: '#D34D59', background: '#FDECEE' },
  refund_requested: { icon: RotateCcw, color: '#997022', background: '#FFF5DB' },
  refund_succeeded: { icon: CircleDollarSign, color: '#8054BD', background: '#F0E9FB' },
};

export function NotificationsScreen({ embedded = false }: { embedded?: boolean }) {
  const { language } = useUiPreferences();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading: authLoading } = useAuth();
  const focused = useIsFocused(), active = useNotificationForeground(), cache = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false), [page, setPage] = useState(1);
  const actions = useNotificationActions(), count = useUnreadNotifications(focused && !embedded);
  const allowed = !!user && !authLoading;
  const list = useQuery({
    queryKey: [...notificationKeys.list(user?.id), language, unreadOnly, page],
    enabled: allowed && focused && active,
    queryFn: ({ signal }) => fetchNotifications(page, unreadOnly, signal),
    refetchInterval: focused && active ? 30000 : false, refetchIntervalInBackground: false,
  });
  useEffect(() => { setPage(1); setUnreadOnly(false); }, [user?.id]);
  useEffect(() => {
    if (user && list.data) {
      cache.setQueryData(notificationKeys.count(user.id), list.data.unreadCount);
      if (page > Math.max(1, list.data.pagination.totalPages)) setPage(Math.max(1, list.data.pagination.totalPages));
    }
  }, [list.data, user?.id]);
  const unread = count.data ?? list.data?.unreadCount ?? 0;
  const refresh = () => { if (page !== 1) setPage(1); else void list.refetch(); void count.refetch(); };
  const open = async (item: AppNotification) => {
    if (actions.busy) return;
    if (await actions.markRead(item.id)) {
      if (item.bookingId) nav.navigate('BookingDetail', { bookingId: item.bookingId });
    }
  };
  const action = (title: string, onPress: () => void) => <Pressable accessibilityRole="button" onPress={onPress} style={uiStyle(s.primary)}><Text style={uiTextStyle(s.primaryText)}>{uiText(title)}</Text></Pressable>;

  return <SafeAreaView style={uiStyle(s.screen)} edges={embedded ? [] : ['top', 'left', 'right', 'bottom']}>
    <View style={uiStyle(s.header)}>
      {!embedded && <Pressable accessibilityRole="button" accessibilityLabel={uiText("Quay lại từ thông báo")} style={uiStyle(s.iconButton)}
        onPress={() => nav.canGoBack() ? nav.goBack() : nav.replace('MainTabs', { screen: 'SearchTab' })}><ArrowLeft size={22} color={uiColor("#293E48")} /></Pressable>}
      <View style={uiStyle(s.heading)}>
        <Text accessibilityRole="header" style={uiTextStyle(s.title)}>{uiText("Thông báo")}</Text>
        <Text style={uiTextStyle(s.subtitle)}>{user ? unread ? uiText(`Bạn có ${unread} thông báo chưa đọc`) : uiText('Cập nhật cho những chuyến đi của bạn') : uiText('Theo dõi các cập nhật về chuyến đi')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={uiText("Cài đặt thông báo")} style={uiStyle(s.iconButton)} onPress={() => nav.navigate('Settings')}><Settings size={21} color={uiColor("#6A7E87")} /></Pressable>
    </View>

    {authLoading && !user ? <View style={uiStyle(s.center)}><ActivityIndicator color={uiColor("#00ACC1")} /></View>
      : !user ? <View style={uiStyle(s.center)}>
        <View style={uiStyle(s.emptyIcon)}><Bell size={34} color={uiColor("#00A8BD")} /></View>
        <Text style={uiTextStyle(s.emptyTitle)}>{uiText("Thông báo dành riêng cho bạn")}</Text>
        <Text style={uiTextStyle(s.emptyBody)}>{uiText("Đăng nhập để xem cập nhật đặt phòng, thanh toán và hoàn tiền của bạn.")}</Text>
        {action('Đăng nhập', () => nav.navigate('Login'))}
      </View> : <>
        <View style={uiStyle(s.toolbar)}>
          <View style={uiStyle(s.filters)}>
            {[false, true].map(value => <Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{ selected: unreadOnly === value }}
              onPress={() => { setUnreadOnly(value); setPage(1); }} style={uiStyle([s.filter, unreadOnly === value && s.filterActive])}>
              <Text style={uiTextStyle([s.filterText, unreadOnly === value && s.filterTextActive])}>{value ? uiText('Chưa đọc') : uiText('Tất cả')}</Text>
            </Pressable>)}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={uiText("Đánh dấu tất cả thông báo đã đọc")}
            disabled={!unread || !!actions.busy || list.isError} style={uiStyle([s.readAll, (!unread || !!actions.busy) && s.disabled])}
            onPress={async () => { if (await actions.markAllRead(list.data?.fetchedAt)) setPage(1); }}>
            {actions.busy === 'all' ? <ActivityIndicator size="small" color={uiColor("#00899A")} /> : <CheckCheck size={17} color={uiColor("#00899A")} />}
            <Text style={uiTextStyle(s.readAllText)}>{uiText("Đọc tất cả")}</Text>
          </Pressable>
        </View>
        {!!actions.error && <Text accessibilityRole="alert" style={uiTextStyle(s.error)}>{uiText(actions.error)}</Text>}
        {list.isError && !!list.data && <Pressable accessibilityRole="button" onPress={refresh} style={uiStyle(s.notice)}><Text style={uiTextStyle(s.noticeText)}>{uiText("Chưa làm mới được thông báo. Bấm để thử lại.")}</Text></Pressable>}
        {list.isPending ? <View style={uiStyle(s.center)}><ActivityIndicator color={uiColor("#00ACC1")} /><Text style={uiTextStyle(s.emptyBody)}>{uiText("Đang tải thông báo…")}</Text></View>
          : list.isError && !list.data ? <View style={uiStyle(s.center)}>
            <View style={uiStyle(s.emptyIcon)}><Bell size={34} color={uiColor("#00A8BD")} /></View>
            <Text style={uiTextStyle(s.emptyTitle)}>{uiText("Chưa tải được thông báo")}</Text><Text style={uiTextStyle(s.emptyBody)}>{uiText("Kiểm tra kết nối rồi thử lại nhé.")}</Text>
            {action('Thử lại', refresh)}
          </View> : <SectionList
            sections={groupNotifications(list.data?.items || [])} keyExtractor={item => item.id}
            style={uiStyle(s.list)} contentContainerStyle={uiStyle([s.content, embedded && { paddingBottom: 100 }, !list.data?.items.length && { flexGrow: 1 }])}
            stickySectionHeadersEnabled={false}
            refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={refresh} tintColor={uiColor("#00ACC1")} />}
            renderSectionHeader={({ section }) => <Text style={uiTextStyle(s.sectionTitle)}>{uiText(section.title)}</Text>}
            renderItem={({ item }) => {
              const info = appearance[item.type] || appearance.booking_created, Icon = info.icon;
              return <Pressable accessibilityRole="button" accessibilityLabel={uiText(`${item.readAt ? 'Đã đọc' : 'Chưa đọc'}: ${item.title}`)}
                accessibilityHint={item.bookingId ? uiText('Mở chi tiết đơn đặt phòng') : uiText('Đánh dấu đã đọc')} disabled={!!actions.busy}
                onPress={() => void open(item)} style={uiStyle([s.card, !item.readAt && s.cardUnread])}>
                <View style={uiStyle([s.eventIcon, { backgroundColor: info.background }])}><Icon size={21} color={uiColor(info.color)} /></View>
                <View style={uiStyle(s.cardCopy)}>
                  <Text style={uiTextStyle([s.cardTitle, !item.readAt && s.cardTitleUnread])}>{uiText(item.title)}</Text>
                  <Text style={uiTextStyle(s.body)}>{item.body}</Text>
                  <Text style={uiTextStyle(s.time)}>{uiText(new Date(item.createdAt).toLocaleString(uiLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}</Text>
                </View>
                <View style={uiStyle(s.trailing)}>
                  {actions.busy === item.id ? <ActivityIndicator size="small" color={uiColor("#00ACC1")} /> : <>
                    {!item.readAt && <View style={uiStyle(s.unreadDot)} />}
                    {item.bookingId && <ChevronRight size={17} color={uiColor("#A2B0B7")} />}
                  </>}
                </View>
              </Pressable>;
            }}
            ListEmptyComponent={<View style={uiStyle(s.center)}>
              <View style={uiStyle(s.emptyIcon)}><BellRing size={34} color={uiColor("#00A8BD")} /></View>
              <Text style={uiTextStyle(s.emptyTitle)}>{unreadOnly ? uiText('Bạn đã đọc hết thông báo') : uiText('Chưa có thông báo')}</Text>
              <Text style={uiTextStyle(s.emptyBody)}>{unreadOnly ? uiText('Các cập nhật mới sẽ xuất hiện ở đây.') : uiText('Khi có cập nhật về đặt phòng, thanh toán hoặc hoàn tiền, bạn sẽ thấy tại đây.')}</Text>
              {unreadOnly && action('Xem tất cả', () => { setUnreadOnly(false); setPage(1); })}
            </View>}
            ListFooterComponent={list.data && list.data.pagination.totalPages > 1 ? <View style={uiStyle(s.pagination)}>
              <Pressable accessibilityRole="button" disabled={page <= 1 || list.isFetching} onPress={() => setPage(value => value - 1)} style={uiStyle(s.pageButton)}><Text style={uiTextStyle(page <= 1 ? s.muted : s.readAllText)}>{uiText("Trước")}</Text></Pressable>
              <Text style={uiTextStyle(s.muted)}>{uiText(page)}{uiText(" / ")}{uiText(list.data.pagination.totalPages)}</Text>
              <Pressable accessibilityRole="button" disabled={page >= list.data.pagination.totalPages || list.isFetching} onPress={() => setPage(value => value + 1)} style={uiStyle(s.pageButton)}><Text style={uiTextStyle(page >= list.data.pagination.totalPages ? s.muted : s.readAllText)}>{uiText("Tiếp")}</Text></Pressable>
            </View> : undefined}
          />}
      </>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#F0F3F5' },
  heading: { flex: 1 }, title: { fontSize: 23, fontWeight: '700', color: '#233944' }, subtitle: { fontSize: 12, color: '#7A8C95', marginTop: 5, lineHeight: 18 },
  iconButton: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  toolbar: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filters: { flexDirection: 'row', gap: 6 }, filter: { paddingHorizontal: 13, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F6F7' },
  filterActive: { backgroundColor: '#DEF7FA' }, filterText: { color: '#71838C', fontSize: 12, fontWeight: '600' }, filterTextActive: { color: '#008C9E' },
  readAll: { flexDirection: 'row', gap: 5, alignItems: 'center', minHeight: 44 }, readAllText: { color: '#008C9E', fontSize: 12, fontWeight: '600' }, disabled: { opacity: 0.4 },
  list: { flex: 1 }, content: { paddingHorizontal: 18, paddingBottom: 24 }, sectionTitle: { color: '#84959D', fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'flex-start', padding: 13, gap: 10, marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#E8EFF1', backgroundColor: '#FFFFFF' },
  cardUnread: { backgroundColor: '#F0FBFD', borderColor: '#D8EFF3' }, eventIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1 }, cardTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#415762' }, cardTitleUnread: { fontWeight: '700', color: '#203943' },
  body: { color: '#6D818C', fontSize: 12, lineHeight: 19, marginTop: 4 }, time: { color: '#98A8AF', fontSize: 10, marginTop: 9, lineHeight: 15 },
  trailing: { width: 16, gap: 18, alignItems: 'center', paddingTop: 7 }, unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00B2C7' },
  center: { flex: 1, padding: 28, gap: 13, alignItems: 'center', justifyContent: 'center', minHeight: 220 }, emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7FAFC', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2F4651', textAlign: 'center' }, emptyBody: { fontSize: 13, lineHeight: 21, color: '#81949E', textAlign: 'center', maxWidth: 320 },
  primary: { minHeight: 44, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 12, backgroundColor: '#00AFC5', marginTop: 5 }, primaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  notice: { marginHorizontal: 18, padding: 12, borderRadius: 10, backgroundColor: '#FFF6E4' }, noticeText: { color: '#87651D', fontSize: 12, lineHeight: 18 }, error: { color: '#B3261E', paddingHorizontal: 18, paddingVertical: 10, fontSize: 12, lineHeight: 18 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 14 }, pageButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15 }, muted: { fontSize: 12, color: '#95A5AD' },
});
