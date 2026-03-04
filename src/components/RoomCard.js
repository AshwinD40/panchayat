import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

const RoomCard = ({ room, onPress }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const getExpiryTime = () => {
    const expiry = room.expiresAt?.toDate
      ? room.expiresAt.toDate().getTime()
      : room.expiresAt instanceof Date
        ? room.expiresAt.getTime()
        : room.expiresAt;
    return Number.isFinite(expiry) ? expiry : null;
  };

  useEffect(() => {
    const tick = () => {
      const expiry = getExpiryTime();
      if (!expiry) { setTimeLeft('--:--'); return; }
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
  }, [room.expiresAt]);

  const isExpiringSoon = () => {
    const expiry = getExpiryTime();
    if (!expiry) return false;
    return (expiry - Date.now()) <= 5 * 60 * 1000;
  };

  const getAvatarLetter = () => {
    return room.name ? room.name.charAt(0).toUpperCase() : '?';
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
          <Text style={styles.avatarText}>{getAvatarLetter()}</Text>
        </View>
        <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
        <View style={styles.rightInfo}>
          <Text style={[styles.timer, isExpiringSoon() && styles.timerUrgent]}>
            {timeLeft}
          </Text>
          <Text style={styles.area}>📍 {room.area}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  rightInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timer: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.timerGreen,
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: {
    color: COLORS.timerRed,
  },
  area: {
    fontSize: 11,
    color: COLORS.textLight,
  },
});

export default RoomCard;
