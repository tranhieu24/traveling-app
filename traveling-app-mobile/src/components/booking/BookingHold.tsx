import { useUiPreferences, uiStyle, uiTextStyle, uiText } from '../../preferences/ui';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Booking } from '../../types';
import { theme } from '../../theme/tokens';

export function BookingHold({ booking, onRefresh, onRebook, onElapsed }: { booking: Booking; onRefresh?: () => void; onRebook?: () => void; onElapsed?: (elapsed:boolean) => void }) {
  useUiPreferences();
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
  return <View style={uiStyle(s.card)} accessibilityLiveRegion="polite">
    <Text style={uiTextStyle(s.title)}>{expired ? uiText('Thời hạn giữ phòng đã kết thúc') : uiText('Phòng đang được giữ cho bạn')}</Text>
    <Text style={uiTextStyle(s.copy)}>{expired ? uiText('Kiểm tra lại trạng thái trước khi thanh toán. Nếu đơn hết hạn, hãy chọn lịch và đặt lại.') : seconds === null ? uiText('Đang chờ đồng bộ thời gian với server.') : uiText(`Còn khoảng ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} để hoàn tất thanh toán.`)}</Text>
    <Text style={uiTextStyle(s.hint)}>{uiText("Thời gian hiển thị là ước tính. Server quyết định hiệu lực của đơn.")}</Text>
    <View style={uiStyle(s.actions)}>{onRefresh && <Pressable onPress={onRefresh} style={uiStyle(s.button)}><Text style={uiTextStyle(s.link)}>{uiText("Kiểm tra trạng thái")}</Text></Pressable>}{expired && onRebook && <Pressable onPress={onRebook} style={uiStyle(s.button)}><Text style={uiTextStyle(s.link)}>{uiText("Chọn lịch và đặt lại")}</Text></Pressable>}</View>
  </View>;
}
const s = StyleSheet.create({card:{padding:16,backgroundColor:theme.colors.primarySoft,borderRadius:theme.radius.card,marginVertical:12,gap:6},title:{fontSize:15,fontWeight:'700',color:theme.colors.ink},copy:{fontSize:13,lineHeight:20,color:theme.colors.ink},hint:{fontSize:11,lineHeight:17,color:theme.colors.muted},actions:{flexDirection:'row',flexWrap:'wrap',gap:12},button:{minHeight:44,justifyContent:'center'},link:{color:theme.colors.primary,fontWeight:'600',fontSize:13}});
