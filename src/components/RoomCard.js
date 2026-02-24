import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

const RoomCard = ({ room, onPress }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const expiry = room.expiresAt?.toDate ? room.expiresAt.toDate().getTime() : room.expiresAt;
      const diff = expiry - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = (n) => String(n).padStart(2, '0');
      setTimeLeft(h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const isExpiringSoon = () => {
    const expiry = room.expiresAt?.toDate ? room.expiresAt.toDate().getTime() : room.expiresAt;
    return (expiry - Date.now()) <= 5 * 60 * 1000;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: room.isPrivate ? COLORS.private : COLORS.public }]}>
          <Text style={styles.typeBadgeText}>{room.isPrivate ? '🔒 Private' : '🌐 Public'}</Text>
        </View>
        <View style={[styles.timerBadge, { backgroundColor: isExpiringSoon() ? '#FEF2F2' : '#F0FDF4' }]}>
          <Text style={[styles.timerText, { color: isExpiringSoon() ? COLORS.timerRed : COLORS.timerGreen }]}>
            ⏳ {timeLeft}
          </Text>
        </View>
      </View>
      <Text style={styles.roomName}>{room.name}</Text>
      <View style={styles.footer}>
        <Text style={styles.area}>📍 {room.area}</Text>
        <Text style={styles.roomId}>ID: {room.roomId}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
    shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#FF6B35',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  timerBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  timerText: { fontSize: 12, fontWeight: '700' },
  roomName: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  area: { fontSize: 13, color: '#6B7280' },
  roomId: { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' },
});

export default RoomCard;