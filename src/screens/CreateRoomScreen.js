// src/screens/CreateRoomScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, Modal
} from 'react-native';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { generateRoomCode } from '../utils/nameGenerator';
import { COLORS, ROOM_DURATION_MS } from '../utils/theme';
import { INDIAN_CITIES } from '../utils/locationHelper';

const CreateRoomScreen = ({ route, navigation }) => {
  const { currentArea, userId, displayName } = route.params || {};

  const [roomName, setRoomName] = useState('');
  const [selectedArea, setSelectedArea] = useState(currentArea || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const MAX_NAME_LENGTH = 30;

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleCreate = async () => {
    const trimName = roomName.trim();
    if (!trimName) {
      Alert.alert('Room Name Required', 'Please give your room a name.');
      return;
    }
    if (!selectedArea) {
      Alert.alert('Area Required', 'Please select a location for this room.');
      return;
    }
    if (trimName.length < 3) {
      Alert.alert('Name too short', 'Room name must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const roomId = generateRoomCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ROOM_DURATION_MS);

      const roomData = {
        name: trimName,
        roomId,
        area: selectedArea,
        isPrivate,
        creatorId: userId,
        creatorName: displayName,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        memberCount: 1,
      };

      const docRef = await addDoc(collection(db, 'rooms'), roomData);

      navigation.replace('Chat', {
        room: { id: docRef.id, ...roomData },
        userId,
        displayName,
        isCreator: true,
      });
    } catch (error) {
      console.error('Create room error:', error);
      Alert.alert('Error', 'Could not create room. Please try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Room</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            ⏳ This room will auto-delete in <Text style={{ fontWeight: '800' }}>3 hours</Text>
          </Text>
        </View>

        {/* Step 1: Location */}
        <Text style={styles.sectionLabel}>STEP 1 — Choose Location</Text>
        <TouchableOpacity
          style={styles.areaSelector}
          onPress={() => setShowAreaPicker(true)}
        >
          <Text style={selectedArea ? styles.areaSelectorText : styles.areaSelectorPlaceholder}>
            📍 {selectedArea || 'Tap to select area...'}
          </Text>
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>

        {/* Step 2: Room Name */}
        <Text style={styles.sectionLabel}>STEP 2 — Room Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Surat Farmers Talk"
            placeholderTextColor={COLORS.textLight}
            value={roomName}
            onChangeText={(t) => setRoomName(t.slice(0, MAX_NAME_LENGTH))}
            maxLength={MAX_NAME_LENGTH}
          />
          <Text style={styles.charCount}>{roomName.length}/{MAX_NAME_LENGTH}</Text>
        </View>

        {/* Step 3: Privacy */}
        <Text style={styles.sectionLabel}>STEP 3 — Privacy</Text>
        <View style={styles.privacyCard}>
          <View style={styles.privacyRow}>
            <View>
              <Text style={styles.privacyTitle}>
                {isPrivate ? '🔒 Private Room' : '🌐 Public Room'}
              </Text>
              <Text style={styles.privacyDesc}>
                {isPrivate
                  ? 'Only people with the Room ID can join'
                  : 'Anyone in your area can see and join'}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: COLORS.border, true: COLORS.private }}
              thumbColor={isPrivate ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {/* Room ID Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Your room will get a unique 8-character ID</Text>
          <Text style={styles.previewSample}>e.g. ABCD5678</Text>
          <Text style={styles.previewHint}>Share this ID with others to invite them directly</Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Room 🚀</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Area Picker Modal */}
      <Modal
        visible={showAreaPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAreaPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitle}>📍 Select Area</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Search city..."
              value={citySearch}
              onChangeText={setCitySearch}
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />
            <ScrollView>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityItem, selectedArea === city && styles.cityItemSelected]}
                  onPress={() => {
                    setSelectedArea(city);
                    setShowAreaPicker(false);
                    setCitySearch('');
                  }}
                >
                  <Text style={[styles.cityItemText, selectedArea === city && { color: COLORS.primary, fontWeight: '700' }]}>
                    {city} {selectedArea === city ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowAreaPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 60 },
  backText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 60 },
  infoBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  infoBannerText: { color: '#856404', fontSize: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  areaSelector: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  areaSelectorText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  areaSelectorPlaceholder: { color: COLORS.textLight, fontSize: 16 },
  arrowText: { color: COLORS.textSecondary },
  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  charCount: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    fontSize: 11,
    color: COLORS.textLight,
  },
  privacyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  privacyDesc: { fontSize: 13, color: COLORS.textSecondary, maxWidth: '80%' },
  previewCard: {
    backgroundColor: '#F0FFF4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    alignItems: 'center',
  },
  previewLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  previewSample: { fontSize: 22, fontWeight: '900', color: COLORS.success, letterSpacing: 2, fontFamily: 'monospace' },
  previewHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center' },
  createBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
  },
  cityItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityItemSelected: { backgroundColor: '#FFF5F0' },
  cityItemText: { fontSize: 16, color: COLORS.text },
  cancelText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15, marginTop: 16 },
});

export default CreateRoomScreen;
