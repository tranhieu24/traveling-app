// Floating AI Chat Bubble
import React, { useState } from 'react';
import { View, Modal, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { aiHelp } from '../../services/ai'; // mobile API client

export const ChatBubble = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant'; text: string}>>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessages(prev => [...prev, {role: 'user', text: userMsg}]);
    setMessage('');
    setLoading(true);
    try {
      const resp = await aiHelp(userMsg); // fallback or AI answer
      const answer = resp.answer ?? resp.message ?? 'Không có câu trả lời.';
      setMessages(prev => [...prev, {role: 'assistant', text: answer}]);
    } catch (e) {
      setMessages(prev => [...prev, {role: 'assistant', text: 'Lỗi khi gọi trợ lý AI.'}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating button */}
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)} accessibilityLabel="Mở trợ lý AI">
        <Text style={styles.fabText}>🤖</Text>
      </TouchableOpacity>

      {/* Modal chat */}
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Trợ lý AI</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.chatArea} contentContainerStyle={{paddingVertical: 8}}>
              {messages.map((m, i) => (
                <View key={i} style={m.role === 'user' ? styles.userMsg : styles.assistantMsg}>
                  <Text style={styles.msgText}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Nhập câu hỏi…"
                value={message}
                onChangeText={setMessage}
                editable={!loading}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={loading} accessibilityLabel="Gửi câu hỏi AI">
                <Text style={styles.sendText}>{loading ? '…' : 'Gửi'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {position: 'absolute', bottom: 20, right: 20, zIndex: 100},
  fab: {backgroundColor: '#0066ff', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center'},
  fabText: {fontSize: 28, color: '#fff'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  modalContent: {backgroundColor: '#fff', maxHeight: '80%', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 12},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  title: {fontSize: 18, fontWeight: 'bold'},
  close: {fontSize: 20},
  chatArea: {flexGrow: 1, marginBottom: 8},
  userMsg: {alignSelf: 'flex-end', backgroundColor: '#e0f0ff', borderRadius: 8, marginVertical: 4, padding: 8, maxWidth: '80%'},
  assistantMsg: {alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderRadius: 8, marginVertical: 4, padding: 8, maxWidth: '80%'},
  msgText: {fontSize: 14},
  inputBar: {flexDirection: 'row', alignItems: 'center'},
  input: {flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, paddingHorizontal: 8, height: 40},
  sendBtn: {marginLeft: 8, backgroundColor: '#0066ff', borderRadius: 4, paddingHorizontal: 12, height: 40, justifyContent: 'center'},
  sendText: {color: '#fff', fontWeight: 'bold'},
});

