// src/screens/ChatScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  StatusBar, Animated
} from 'react-native';
import {
  collection, query, orderBy, onSnapshot, addDoc,
  Timestamp, doc, deleteDoc, where, getDocs
} from 'firebase/firestore';
import { db, isFirebaseConfigured, firebaseConfigError } from '../../firebase';
import CountdownTimer from '../components/CountdownTimer';
import RoomInfoSheet from '../components/RoomInfoSheet';
import { COLORS } from '../utils/theme';

const ChatScreen = ({ route, navigation }) => {
  const { room: initialRoom, userId, displayName, joinById, joinedNow } = route.params;
  const joinMessageSent = useRef(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(initialRoom);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [expired, setExpired] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const flatListRef = useRef(null);
  const warningShown = useRef(false);
  const hasExpiredRef = useRef(false);
  const messagesUnsubscribeRef = useRef(null);
  const checkWarningRef = useRef(() => { });
  const warningBannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const init = async () => {
      if (!isFirebaseConfigured) {
        Alert.alert('Firebase Setup Required', firebaseConfigError || 'Firebase config missing.');
        setLoading(false);
        return;
      }
      if (joinById) {
        await loadRoomById(initialRoom.roomId);
      } else if (initialRoom?.id) {
        messagesUnsubscribeRef.current = subscribeToMessages(initialRoom.id);
        if (joinedNow && !joinMessageSent.current) {
          joinMessageSent.current = true;
          await addDoc(collection(db, 'rooms', initialRoom.id, 'messages'), {
            type: 'system',
            text: `${displayName || 'Someone'} joined the room`,
            createdAt: Timestamp.now(),
          }).catch((e) => console.error('System message error:', e));
        }
      } else {
        setRoomNotFound(true);
        setLoading(false);
      }
    };
    init();

    const warningInterval = setInterval(() => {
      checkWarningRef.current();
    }, 5000);
    return () => {
      clearInterval(warningInterval);
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
        messagesUnsubscribeRef.current = null;
      }
    };
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
      const expiry = roomData.expiresAt?.toDate?.().getTime() || 0;
      if (expiry < Date.now()) {
        setRoomNotFound(true);
        setLoading(false);
        return;
      }
      setRoom(roomData);
      if (messagesUnsubscribeRef.current) messagesUnsubscribeRef.current();
      messagesUnsubscribeRef.current = subscribeToMessages(docSnap.id);
    } catch (error) {
      setRoomNotFound(true);
      setLoading(false);
    }
  };

  const subscribeToMessages = (roomDocId) => {
    const q = query(
      collection(db, 'rooms', roomDocId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
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
  checkWarningRef.current = checkWarning;

  const handleSend = async () => {
    if (!isFirebaseConfigured) return;
    const text = inputRef.current.trim();
    if (!text || !room?.id || sending) return;
    if (expired) {
      Alert.alert('Room Expired', 'This room has closed.');
      return;
    }
    setSending(true);
    setInputText('');
    inputRef.current = '';
    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        text,
        senderId: userId,
        senderName: displayName,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      setInputText(text);
      Alert.alert('Error', 'Message failed to send.');
    }
    setSending(false);
  };

  const handleExpire = useCallback(async () => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;
    setExpired(true);
    if (room?.id) {
      try { await deleteDoc(doc(db, 'rooms', room.id)); } catch (e) { }
    }
    Alert.alert(
      '⏰ Room Closed',
      'This room has expired.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [navigation, room?.id]);

  const renderMessage = useCallback(({ item, index }) => {
    // System message
    if (item.type === 'system') {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const isMe = item.senderId === userId;

    const time = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && item._showSender && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeMeText : styles.timeOtherText]}>
            {time}
          </Text>
        </View>
      </View>
    );
  }, [userId]);

  // Pre-compute showSender flag to avoid index lookups in renderMessage
  const processedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const showSender = msg.type !== 'system' && msg.senderId !== userId && (!prev || prev.senderId !== msg.senderId || prev.type === 'system');
      return { ...msg, _showSender: showSender };
    });
  }, [messages, userId]);

  const getAvatarLetter = () => {
    return room?.name ? room.name.charAt(0).toUpperCase() : '?';
  };

  const getAvatarColor = () => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E'
    ];
    const letter = getAvatarLetter();
    const index = letter.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (roomNotFound) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 }}>Room Not Found</Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>This room doesn't exist or has expired.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backHomeBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header — tappable to open room info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setShowRoomInfo(true)}
          activeOpacity={0.6}
        >
          <View style={[styles.headerAvatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.headerAvatarText}>{getAvatarLetter()}</Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>{room.name || 'Room'}</Text>
            <Text style={styles.headerSub}>tap for info</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerTimer}>
          {room?.expiresAt && (
            <CountdownTimer expiresAt={room.expiresAt} onExpire={handleExpire} />
          )}
        </View>
      </View>

      {/* Warning Banner */}
      {showWarningBanner && (
        <Animated.View style={[styles.warningBanner, { opacity: warningBannerAnim }]}>
          <Text style={styles.warningText}>⚠️ Room closes in under 5 minutes</Text>
        </Animated.View>
      )}

      {/* Expired */}
      {expired && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>⏰ Room expired</Text>
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={processedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          style={{ flex: 1 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={20}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>💬</Text>
              <Text style={styles.emptyChatText}>Start the conversation</Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input — Telegram style */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={(t) => { setInputText(t); inputRef.current = t; }}
            placeholder={expired ? 'Room expired' : 'Message'}
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
            editable={!expired}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || expired) && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={!inputText.trim() || expired || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Room Info Sheet */}
      <RoomInfoSheet
        visible={showRoomInfo}
        onClose={() => setShowRoomInfo(false)}
        room={room}
        onExpire={handleExpire}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  backArrow: { color: COLORS.primary, fontSize: 30, fontWeight: '300' },
  headerCenter: { flex: 1, marginLeft: 6, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerTextWrap: { flex: 1, justifyContent: 'center' },
  headerName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  headerSub: { color: COLORS.textLight, fontSize: 11, marginTop: 2 },
  headerTimer: { marginRight: 4 },

  // Warning / Expired
  warningBanner: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  warningText: { color: COLORS.timerOrange, fontWeight: '700', fontSize: 12 },
  expiredBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  expiredText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },

  // Messages
  messagesList: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Message rows
  msgRow: { marginBottom: 3, maxWidth: '80%' },
  msgRowMe: { alignSelf: 'flex-end' },
  msgRowOther: { alignSelf: 'flex-start' },
  senderName: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 12,
  },

  // Bubbles
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 15, lineHeight: 21, color: COLORS.text },
  msgTextMe: { color: '#fff' },
  timeText: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  timeMeText: { color: 'rgba(255,255,255,0.55)' },
  timeOtherText: { color: COLORS.textLight },

  // System
  systemRow: { alignItems: 'center', marginVertical: 10 },
  systemBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  systemText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },

  // Empty
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.4 },
  emptyChatText: { color: COLORS.textLight, fontSize: 14 },

  // Input — Telegram-style
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 10,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 120,
    lineHeight: 22,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnOff: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: { color: '#fff', fontSize: 18 },

  // Not found
  backHomeBtn: {
    backgroundColor: COLORS.surfaceGlass,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  backHomeBtnText: { color: COLORS.text, fontWeight: '600' },
});

export default ChatScreen;
