// src/screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Share, StatusBar, Animated
} from 'react-native';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  Timestamp, doc, deleteDoc, where, getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import CountdownTimer from '../components/CountdownTimer';
import { COLORS } from '../utils/theme';

const ChatScreen = ({ route, navigation }) => {
  const { room: initialRoom, userId, displayName, isCreator, joinById } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(initialRoom);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [expired, setExpired] = useState(false);
  const flatListRef = useRef(null);
  const warningShown = useRef(false);
  const warningBannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (joinById) {
      // Find room by roomId field
      loadRoomById(initialRoom.roomId);
    } else {
      loadMessages(initialRoom.id);
    }

    // Setup expiry warning check
    const warningInterval = setInterval(checkWarning, 5000);
    return () => clearInterval(warningInterval);
  }, []);

  const loadRoomById = async (roomId) => {
    try {
      const roomQuery = query(collection(db, 'rooms'), where('roomId', '==', roomId));
      const snap = await getDocs(roomQuery);

      if (snap.empty) {
        setRoomNotFound(true);
        setLoading(false);
        return;
      }

      const docSnap = snap.docs[0];
      const roomData = { id: docSnap.id, ...docSnap.data() };

      // Check not expired
      const expiry = roomData.expiresAt?.toDate?.().getTime() || 0;
      if (expiry < Date.now()) {
        setRoomNotFound(true);
        setLoading(false);
        return;
      }

      setRoom(roomData);
      loadMessages(docSnap.id);
    } catch (error) {
      console.error('Load room error:', error);
      setRoomNotFound(true);
      setLoading(false);
    }
  };

  const loadMessages = (roomDocId) => {
    const q = query(
      collection(db, 'rooms', roomDocId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, (error) => {
      console.error('Messages error:', error);
      setLoading(false);
    });

    return unsub;
  };

  const checkWarning = () => {
    if (!room?.expiresAt) return;
    const expiry = room.expiresAt?.toDate ? room.expiresAt.toDate().getTime() : room.expiresAt;
    const diff = expiry - Date.now();

    if (diff <= 5 * 60 * 1000 && diff > 0 && !warningShown.current) {
      warningShown.current = true;
      setShowWarningBanner(true);
      Animated.sequence([
        Animated.timing(warningBannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(8000),
        Animated.timing(warningBannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowWarningBanner(false));
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !room?.id || sending) return;
    if (expired) {
      Alert.alert('Room Expired', 'This room has closed.');
      return;
    }

    setSending(true);
    setInputText('');
    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        text,
        senderId: userId,
        senderName: displayName,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Send message error:', error);
      setInputText(text); // Restore on failure
      Alert.alert('Error', 'Message failed to send.');
    }
    setSending(false);
  };

  const handleExpire = useCallback(async () => {
    setExpired(true);
    if (room?.id) {
      try {
        await deleteDoc(doc(db, 'rooms', room.id));
      } catch (e) {
        // Already deleted by server function
      }
    }
    Alert.alert(
      '⏰ Room Closed',
      'This room has expired after 3 hours. All messages have been deleted.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [room?.id]);

  const shareRoomId = async () => {
    try {
      await Share.share({
        message: `Join my room on Panchayat!\n\nRoom: ${room.name}\nArea: ${room.area}\nRoom ID: ${room.roomId}\n\nDownload Panchayat app to join.`,
      });
    } catch (e) {}
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderId === userId;
    const prevMsg = messages[index - 1];
    const showSender = !prevMsg || prevMsg.senderId !== item.senderId;

    const time = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && showSender && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  // Room Not Found
  if (roomNotFound) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFoundEmoji}>🔍</Text>
        <Text style={styles.notFoundTitle}>Room Not Found</Text>
        <Text style={styles.notFoundText}>
          This room doesn't exist or has already expired.
        </Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backHomeBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerRoomName} numberOfLines={1}>
            {room.isPrivate ? '🔒 ' : '🌐 '}{room.name || 'Room'}
          </Text>
          <Text style={styles.headerArea}>📍 {room.area}</Text>
        </View>

        {/* Timer - Top Right */}
        <View style={styles.headerRight}>
          {room?.expiresAt && (
            <CountdownTimer
              expiresAt={room.expiresAt}
              onExpire={handleExpire}
            />
          )}
        </View>
      </View>

      {/* Room ID Bar */}
      <TouchableOpacity style={styles.roomIdBar} onPress={shareRoomId}>
        <Text style={styles.roomIdText}>🔑 ID: <Text style={styles.roomIdCode}>{room.roomId}</Text></Text>
        <Text style={styles.shareText}>Tap to Share →</Text>
      </TouchableOpacity>

      {/* Warning Banner */}
      {showWarningBanner && (
        <Animated.View style={[styles.warningBanner, { opacity: warningBannerAnim }]}>
          <Text style={styles.warningText}>⚠️ Room closes in under 5 minutes!</Text>
        </Animated.View>
      )}

      {/* Expired Overlay */}
      {expired && (
        <View style={styles.expiredOverlay}>
          <Text style={styles.expiredText}>⏰ This room has expired</Text>
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          style={{ flex: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>💬</Text>
              <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input Area - now always stays above keyboard */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={expired ? 'Room has expired' : 'Type a message...'}
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={500}
          editable={!expired}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || expired) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || expired || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 8, marginRight: 4 },
  backArrow: { color: '#fff', fontSize: 22, fontWeight: '300' },
  headerCenter: { flex: 1, marginHorizontal: 8 },
  headerRoomName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerArea: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  headerRight: { alignItems: 'flex-end', minWidth: 90 },
  roomIdBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomIdText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  roomIdCode: { color: COLORS.primary, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1 },
  shareText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  warningText: { color: '#92400E', fontWeight: '700', fontSize: 13 },
  expiredOverlay: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    alignItems: 'center',
  },
  expiredText: { color: COLORS.danger, fontWeight: '700' },
  messagesList: { padding: 16, flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, marginTop: 10 },
  msgRow: { marginBottom: 4, maxWidth: '80%' },
  msgRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTextMe: { color: '#fff' },
  msgTextOther: { color: COLORS.text },
  timeText: { fontSize: 10, marginTop: 4 },
  timeTextMe: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  timeTextOther: { color: COLORS.textLight },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { color: COLORS.textSecondary, fontSize: 16 },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  notFoundEmoji: { fontSize: 56, marginBottom: 16 },
  notFoundTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  notFoundText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  backHomeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backHomeBtnText: { color: '#fff', fontWeight: '700' },
});

export default ChatScreen;
