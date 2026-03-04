// src/components/RoomInfoSheet.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Share, Platform
} from 'react-native';
import { COLORS } from '../utils/theme';
import CountdownTimer from './CountdownTimer';

const RoomInfoSheet = ({ visible, onClose, room, onExpire }) => {
  if (!room) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my room on Panchayat!\n\nRoom: ${room.name}\nRoom ID: ${room.roomId}\n\nDownload Panchayat to join.`,
      });
    } catch (e) { }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Room Name */}
          <Text style={styles.roomName}>{room.name}</Text>

          {/* Info Grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridIcon}>📍</Text>
              <Text style={styles.gridLabel}>Location</Text>
              <Text style={styles.gridValue}>{room.area}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridIcon}>👥</Text>
              <Text style={styles.gridLabel}>Members</Text>
              <Text style={styles.gridValue}>{room.memberCount || 1}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridIcon}>⏳</Text>
              <Text style={styles.gridLabel}>Time Left</Text>
              {room.expiresAt && (
                <CountdownTimer expiresAt={room.expiresAt} onExpire={onExpire} />
              )}
            </View>
          </View>

          {/* Room ID */}
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>Room ID</Text>
            <Text style={styles.idCode}>{room.roomId}</Text>
          </View>

          {/* Share */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.shareBtnText}>Share Room ↗</Text>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  roomName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  gridItem: {
    flex: 1,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  gridIcon: { fontSize: 20, marginBottom: 6 },
  gridLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Room ID
  idCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  idLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  idCode: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },

  // Buttons
  shareBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  closeBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});

export default RoomInfoSheet;
