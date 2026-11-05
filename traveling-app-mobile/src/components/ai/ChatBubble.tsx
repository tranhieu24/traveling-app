import { useUiPreferences, uiText, uiStyle, uiColor, uiTextStyle } from '../../preferences/ui';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, Bot, ChevronRight, MessageCircle, Send, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../types';
import { useAiChat } from './useAiChat';

const suggestions = ['Gợi ý cho tôi phòng', 'Camping', 'Hủy đặt chỗ có được hoàn tiền không?'];

export function ChatBubble() {
  useUiPreferences();
  const { user, token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const chat = useAiChat(user?.id, token);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const canSend = !chat.busy && chat.draft.trim().length >= 2;

  function close() {
    chat.cancel();
    setOpen(false);
    Keyboard.dismiss();
  }

  useEffect(() => {
    if (!focused) close();
  }, [focused]);
  useEffect(() => { setOpen(false); }, [user?.id, token]);

  if (!focused) return null;

  return <>
    <Pressable
      accessibilityRole="button" accessibilityLabel={uiText("Mở trò chuyện với trợ lý AI")}
      onPress={() => setOpen(true)}
      style={uiStyle([styles.fab, { bottom: 84 + insets.bottom }])}
    >
      <MessageCircle size={25} color={uiColor("#FFFFFF")} strokeWidth={1.8} />
      <View style={uiStyle(styles.badge)}><Text style={uiTextStyle(styles.badgeText)}>{uiText("AI")}</Text></View>
    </Pressable>

    <Modal visible={open} transparent animationType="fade" onRequestClose={close}
      statusBarTranslucent onShow={() => scroll.current?.scrollToEnd({ animated: false })}>
      <KeyboardAvoidingView style={uiStyle(styles.overlay)}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <Pressable style={uiStyle(StyleSheet.absoluteFill)} accessibilityRole="button"
          accessibilityLabel={uiText("Đóng trò chuyện AI")} onPress={close} />
        <View accessibilityViewIsModal style={uiStyle([styles.panel, {
          width: Math.min(420, width - 24),
          height: Math.min(600, height - insets.top - insets.bottom - 32),
          marginTop: insets.top + 12, marginBottom: Math.max(insets.bottom, 12),
        }])}>
          <View style={uiStyle(styles.header)}>
            <View style={uiStyle(styles.botIcon)}><Bot size={24} color={uiColor("#00899A")} /></View>
            <View style={uiStyle(styles.heading)}>
              <Text accessibilityRole="header" style={uiTextStyle(styles.title)}>{uiText("Trợ lý Traveling")}</Text>
              <Text style={uiTextStyle(styles.subtitle)}>{uiText("Luôn sẵn sàng giúp bạn")}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={uiText("Thu nhỏ trò chuyện AI")}
              onPress={close} style={uiStyle(styles.iconButton)}><X size={22} color={uiColor("#52636B")} /></Pressable>
          </View>

          <ScrollView ref={scroll} style={uiStyle(styles.conversation)} contentContainerStyle={uiStyle(styles.messages)}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
            <View style={uiStyle(styles.assistant)}>
              <Text style={uiTextStyle(styles.body)}>{uiText("Chào bạn! Bạn muốn tìm chỗ ở tại đâu? Gửi tên phòng để mình tra giá và tiện nghi, hoặc hỏi mình về đặt chỗ, thanh toán và hủy phòng nhé.")}</Text>
            </View>
            {!chat.turns.length && !chat.error && <View style={uiStyle(styles.suggestions)}>
              {suggestions.map(question => <Pressable key={question} accessibilityRole="button"
                onPress={() => void chat.send(question)} disabled={chat.busy} style={uiStyle(styles.suggestion)}>
                <Text style={uiTextStyle(styles.suggestionText)}>{uiText(question)}</Text><ChevronRight size={16} color={uiColor("#00899A")} />
              </Pressable>)}
            </View>}
            {chat.turns.map(turn => <React.Fragment key={turn.id}>
              <View style={uiStyle(styles.user)}><Text selectable style={uiTextStyle([styles.body, styles.userText])}>{turn.question}</Text></View>
              {turn.result && <View style={uiStyle(styles.assistant)}>
                <Text style={uiTextStyle(styles.sourceLabel)}>{turn.result.mode === 'fallback' ? uiText('Tra cứu trợ giúp dự phòng') : turn.result.mode === 'data' ? turn.result.sourceRefs.some(source => source.type === 'listing') ? uiText('Thông tin chỗ ở từ hệ thống') : uiText('Trợ lý Traveling') : uiText('AI hỗ trợ tra cứu')}</Text>
                <Text selectable style={uiTextStyle(styles.body)}>{turn.result.answer}</Text>
                {turn.result.mode === 'fallback' && !!turn.result.reason && <Text style={uiTextStyle(styles.sourceLabel)}>{uiText(turn.result.reason)}</Text>}
                {turn.result.sourceRefs.map((source, index) => <Pressable key={`${source.type}-${source.id}-${index}`}
                  accessibilityRole="button" accessibilityLabel={uiText(`Xem nguồn: ${source.title}`)} style={uiStyle(styles.source)}
                  onPress={() => {
                    close();
                    if (source.type === 'article') navigation.navigate('HelpCenter', { articleId: source.id });
                    else if (source.type === 'listing') navigation.navigate('ListingDetail', { listingId: source.id });
                    else navigation.navigate('BookingDetail', { bookingId: source.id });
                  }}>
                  <Text style={uiTextStyle(styles.sourceText)}>{uiText(source.title)}</Text><ArrowUpRight size={16} color={uiColor("#00899A")} />
                </Pressable>)}
              </View>}
            </React.Fragment>)}
            {chat.busy && <View accessibilityLiveRegion="polite" style={uiStyle(styles.typing)}>
              <ActivityIndicator size="small" color={uiColor("#009DAE")} /><Text style={uiTextStyle(styles.muted)}>{uiText("Đang tìm câu trả lời…")}</Text>
            </View>}
            {!!chat.error && <Text accessibilityRole="alert" style={uiTextStyle(styles.error)}>{uiText(chat.error)}</Text>}
          </ScrollView>

          <View style={uiStyle(styles.footer)}>
            <View style={uiStyle(styles.footerActions)}>
            <Pressable accessibilityRole="button" style={uiStyle(styles.searchLink)} onPress={() => {
              close(); navigation.navigate('SearchSheet');
            }}><Text style={uiTextStyle(styles.searchText)}>{uiText("Tìm chỗ ở với AI")}</Text><ArrowUpRight size={16} color={uiColor("#00899A")} /></Pressable>
            {chat.turns[chat.turns.length - 1]?.result?.searchContext !== undefined && <Pressable
              accessibilityRole="button" accessibilityLabel={uiText("Bắt đầu tìm mới")} disabled={chat.busy}
              style={uiStyle(styles.searchLink)} onPress={() => void chat.send('Bắt đầu tìm mới')}>
              <Text style={uiTextStyle(styles.searchText)}>{uiText("Tìm mới")}</Text>
            </Pressable>}
            </View>
            <View style={uiStyle(styles.composer)}>
              <TextInput accessibilityLabel={uiText("Câu hỏi cho trợ lý AI")} placeholder={uiText("Nhập câu hỏi của bạn…")}
                placeholderTextColor={uiColor("#87949B")} multiline maxLength={800} value={chat.draft}
                editable={!chat.busy} onChangeText={chat.setDraft} style={uiStyle(styles.input)} />
              <Pressable accessibilityRole="button" accessibilityLabel={uiText("Gửi câu hỏi AI")}
                accessibilityState={{ disabled: !canSend }} disabled={!canSend}
                style={uiStyle([styles.send, !canSend && styles.disabled])} onPress={() => void chat.send()}>
                <Send size={19} color={uiColor("#FFFFFF")} />
              </Pressable>
            </View>
            <Text style={uiTextStyle(styles.privacy)}>{uiText("Không gửi mật khẩu hoặc thông tin thẻ.")}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 18, width: 54, height: 54, borderRadius: 27, backgroundColor: '#00ABC0', alignItems: 'center', justifyContent: 'center', shadowColor: '#006B78', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 8, elevation: 6 },
  badge: { position: 'absolute', bottom: -3, right: -2, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#C8EEF2' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#00899A' },
  overlay: { flex: 1, backgroundColor: 'rgba(17,36,44,0.3)', justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 12 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 22, overflow: 'hidden', flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#EAF0F2' },
  botIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DFF8FB', alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 }, title: { fontSize: 17, fontWeight: '700', color: '#20333C' },
  subtitle: { fontSize: 11, color: '#71818A', marginTop: 3 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  conversation: { flex: 1, backgroundColor: '#F7FAFB' }, messages: { padding: 16, gap: 14 },
  assistant: { alignSelf: 'flex-start', maxWidth: '94%', padding: 13, backgroundColor: '#FFFFFF', borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#E8EFF1', gap: 8 },
  user: { alignSelf: 'flex-end', maxWidth: '88%', padding: 13, borderRadius: 16, borderBottomRightRadius: 4, backgroundColor: '#008B9C' },
  body: { fontSize: 14, lineHeight: 22, color: '#30464F' }, userText: { color: '#FFFFFF' },
  suggestions: { gap: 8 }, suggestion: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: '#BCE7EC', backgroundColor: '#F0FCFD' },
  suggestionText: { flexShrink: 1, color: '#007B8A', fontSize: 12, lineHeight: 18 },
  sourceLabel: { color: '#69808A', fontSize: 10, lineHeight: 15 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, borderTopWidth: 1, borderTopColor: '#EDF2F4', paddingTop: 7 },
  sourceText: { color: '#008191', fontSize: 12, lineHeight: 18, flexShrink: 1 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 }, muted: { color: '#71818A', fontSize: 12 },
  error: { color: '#B3261E', fontSize: 12, lineHeight: 19 },
  footer: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#EAF0F2' },
  searchLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, minHeight: 44 },
  searchText: { color: '#008191', fontSize: 12, fontWeight: '600' },
  footerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 6, gap: 6, borderWidth: 1, borderColor: '#D8E4E8', borderRadius: 22, backgroundColor: '#F9FBFC' },
  input: { flex: 1, fontSize: 14, lineHeight: 21, minHeight: 38, maxHeight: 100, paddingVertical: 9, paddingHorizontal: 10, color: '#20333C', textAlignVertical: 'top' },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#008B9C', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 }, privacy: { fontSize: 10, color: '#7B8B93', textAlign: 'center', marginTop: 9 },
});
