import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Booking } from '../../types';
import { theme } from '../../theme/tokens';

export function BookingHold({ booking, onRefresh, onRebook, onElapsed }: { booking: Booking; onRefresh?: () => void; onRebook?: () => void; onElapsed?: (elapsed:boolean) => void }) {
  const clock = useRef({ server: NaN, start: 0 });
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    clock.current = { server: Date.parse(booking.server_time || ''), start: performance.now() };
    const update = () => {
      const due = Date.parse(booking.payment_due_at || '');
      const now = clock.current.server + performance.now() - clock.current.start;
      setSeconds(Number.isFinite(due) && Number.isFinite(now) ? Math.max(0, Math.ceil((due - now) / 1000)) : null);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [booking.payment_due_at, booking.server_time]);
  useEffect(()=>{onElapsed?.(booking.booking_status==='expired'||(booking.booking_status==='pending'&&seconds===0));},[seconds,booking.booking_status,onElapsed]);
  if (!['pending', 'expired'].includes(booking.booking_status)) return null;
  const expired = booking.booking_status === 'expired' || seconds === 0;
  return <View style={s.card} accessibilityLiveRegion="polite">
    <Text style={s.title}>{expired ? 'Thời hạn giữ phòng đã kết thúc' : 'Phòng đang được giữ cho bạn'}</Text>
    <Text style={s.copy}>{expired ? 'Kiểm tra lại trạng thái trước khi thanh toán. Nếu đơn hết hạn, hãy chọn lịch và đặt lại.' : seconds === null ? 'Đang chờ đồng bộ thời gian với server.' : `Còn khoảng ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} để hoàn tất thanh toán.`}</Text>
    <Text style={s.hint}>Thời gian hiển thị là ước tính. Server quyết định hiệu lực của đơn.</Text>
    <View style={s.actions}>{onRefresh && <Pressable onPress={onRefresh} style={s.button}><Text style={s.link}>Kiểm tra trạng thái</Text></Pressable>}{expired && onRebook && <Pressable onPress={onRebook} style={s.button}><Text style={s.link}>Chọn lịch và đặt lại</Text></Pressable>}</View>
  </View>;
}
const s = StyleSheet.create({card:{padding:16,backgroundColor:theme.colors.primarySoft,borderRadius:theme.radius.card,marginVertical:12,gap:6},title:{fontSize:15,fontWeight:'700',color:theme.colors.ink},copy:{fontSize:13,lineHeight:20,color:theme.colors.ink},hint:{fontSize:11,lineHeight:17,color:theme.colors.muted},actions:{flexDirection:'row',flexWrap:'wrap',gap:12},button:{minHeight:44,justifyContent:'center'},link:{color:theme.colors.primary,fontWeight:'600',fontSize:13}});
