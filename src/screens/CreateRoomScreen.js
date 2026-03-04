// src/screens/CreateRoomScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, Modal
} from 'react-native';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured, firebaseConfigError } from '../../firebase';
import { generateRoomCode } from '../utils/nameGenerator';
import { COLORS, ROOM_DURATION_MS } from '../utils/theme';
import { INDIAN_CITIES } from '../utils/locationHelper';

const CreateRoomScreen = ({ route, navigation }) => {
  const { currentArea, userId, displayName } = route.params || {};

  const [roomName, setRoomName] = useState('');
  const [selectedArea, setSelectedArea] = useState(currentArea || '');
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
    if (!isFirebaseConfigured) {
      Alert.alert('Firebase Setup Required', firebaseConfigError || 'Firebase config missing.');
      return;
    }

    const { auth } = await import('../../firebase');
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please restart the app and try again.');
      return;
    }

    setLoading(true);
    try {
      const roomId = generateRoomCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ROOM_DURATION_MS);

      const creatorUid = userId || auth.currentUser.uid;
      const roomData = {
        name: trimName,
        roomId,
        area: selectedArea,
        creatorId: creatorUid,
        creatorName: displayName || 'Anonymous',
        members: [creatorUid],
        memberCount: 1,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
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
      Alert.alert('Error', error.message || 'Failed to create room.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Room</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* Timer info */}
        <View style={styles.timerInfo}>
          <Text style={styles.timerIcon}>⏳</Text>
          <Text style={styles.timerText}>
            Auto-deletes in <Text style={styles.timerBold}>3 hours</Text>
          </Text>
        </View>

        {/* Location */}
        <Text style={styles.label}>LOCATION</Text>
        <TouchableOpacity
          style={styles.fieldCard}
          onPress={() => setShowAreaPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.fieldRow}>
            <Text style={styles.fieldIcon}>📍</Text>
            <Text style={selectedArea ? styles.fieldValue : styles.fieldPlaceholder}>
              {selectedArea || 'Select area'}
            </Text>
            <Text style={styles.fieldArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Room Name */}
        <Text style={styles.label}>ROOM NAME</Text>
        <View style={styles.fieldCard}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Surat Farmers Talk"
            placeholderTextColor={COLORS.textLight}
            value={roomName}
            onChangeText={(t) => setRoomName(t.slice(0, MAX_NAME_LENGTH))}
            maxLength={MAX_NAME_LENGTH}
          />
          <Text style={styles.charCount}>{roomName.length}/{MAX_NAME_LENGTH}</Text>
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            🌐  Everyone in your area can find and join this room
          </Text>
        </View>

        {/* Create */}
        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Room</Text>
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
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            {/* Handle */}
            <View style={styles.pickerHandle} />

            {/* Title */}
            <Text style={styles.pickerTitle}>Select Area</Text>

            {/* Search */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search city..."
                value={citySearch}
                onChangeText={setCitySearch}
                placeholderTextColor={COLORS.textLight}
                autoFocus
              />
              {citySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearch('')}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* City List */}
            <ScrollView
              style={styles.cityList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredCities.map((city) => {
                const isSelected = selectedArea === city;
                return (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityRow, isSelected && styles.cityRowActive]}
                    onPress={() => {
                      setSelectedArea(city);
                      setShowAreaPicker(false);
                      setCitySearch('');
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                      {city}
                    </Text>
                    {isSelected && <Text style={styles.cityCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              {filteredCities.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No cities found</Text>
                </View>
              )}
            </ScrollView>

            {/* Close */}
            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => { setShowAreaPicker(false); setCitySearch(''); }}
            >
              <Text style={styles.pickerDoneText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { color: COLORS.primary, fontSize: 32, fontWeight: '300' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },

  // Main
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 60 },

  // Timer info
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.15)',
  },
  timerIcon: { fontSize: 14, marginRight: 8 },
  timerText: { color: COLORS.textSecondary, fontSize: 13 },
  timerBold: { color: COLORS.timerOrange, fontWeight: '700' },

  // Labels
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },

  // Field cards
  fieldCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: 24,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldIcon: { fontSize: 16, marginRight: 10 },
  fieldValue: { color: COLORS.text, fontSize: 16, fontWeight: '500', flex: 1 },
  fieldPlaceholder: { color: COLORS.textLight, fontSize: 16, flex: 1 },
  fieldArrow: { color: COLORS.textLight, fontSize: 22, fontWeight: '300' },

  // Text input
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    paddingRight: 60,
  },
  charCount: {
    position: 'absolute',
    right: 16,
    top: 18,
    fontSize: 11,
    color: COLORS.textLight,
  },

  // Info note
  infoNote: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  infoNoteText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },

  // Create button
  createBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  searchIcon: { fontSize: 14, marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  searchClear: { color: COLORS.textLight, fontSize: 16, padding: 4 },

  // City list
  cityList: { marginTop: 4 },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityRowActive: {
    borderBottomColor: 'rgba(255,107,53,0.3)',
  },
  cityName: { fontSize: 16, color: COLORS.textSecondary },
  cityNameActive: { color: COLORS.primary, fontWeight: '700' },
  cityCheck: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  noResults: { paddingVertical: 32, alignItems: 'center' },
  noResultsText: { color: COLORS.textLight, fontSize: 14 },

  // Done button
  pickerDoneBtn: {
    marginTop: 12,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  pickerDoneText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
});

export default CreateRoomScreen;
