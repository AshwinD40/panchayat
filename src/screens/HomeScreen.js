// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
  StatusBar, Modal, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, query, where, onSnapshot, orderBy, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getCurrentLocation, reverseGeocode, INDIAN_CITIES } from '../utils/locationHelper';
import RoomCard from '../components/RoomCard';
import { COLORS } from '../utils/theme';

const HomeScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentArea, setCurrentArea] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [activeTab, setActiveTab] = useState('local'); // 'local' or 'all'

  useEffect(() => {
    loadUserData();
    detectLocation();
  }, []);

  useEffect(() => {
    if (currentArea) {
      const unsub = subscribeToRooms();
      return unsub;
    }
  }, [currentArea, activeTab]);

  const loadUserData = async () => {
    const name = await AsyncStorage.getItem('displayName');
    const id = await AsyncStorage.getItem('userId');
    setDisplayName(name || 'Anonymous');
    setUserId(id || '');
  };

  const detectLocation = async () => {
    setLocationLoading(true);
    const location = await getCurrentLocation();
    if (location) {
      const area = await reverseGeocode(location.lat, location.lng);
      setCurrentArea(area);
      await AsyncStorage.setItem('lastArea', area);
    } else {
      // Check saved area
      const saved = await AsyncStorage.getItem('lastArea');
      if (saved) {
        setCurrentArea(saved);
      } else {
        setShowManualPicker(true);
      }
    }
    setLocationLoading(false);
  };

  const subscribeToRooms = () => {
    setLoading(true);
    const now = new Date();

    let q;
    if (activeTab === 'local') {
      q = query(
        collection(db, 'rooms'),
        where('area', '==', currentArea),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc')
      );
    } else {
      q = query(
        collection(db, 'rooms'),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'asc')
      );
    }

    const unsub = onSnapshot(q, async (snapshot) => {
      const fetchedRooms = [];
      const expiredIds = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const expiry = data.expiresAt?.toDate?.().getTime() || 0;
        if (expiry < Date.now()) {
          expiredIds.push(docSnap.id);
        } else {
          fetchedRooms.push({ id: docSnap.id, ...data });
        }
      });

      // Client-side cleanup of expired rooms
      for (const id of expiredIds) {
        await deleteDoc(doc(db, 'rooms', id)).catch(() => {});
      }

      setRooms(fetchedRooms);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Rooms fetch error:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return unsub;
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    detectLocation();
  }, []);

  const handleRoomPress = (room) => {
    navigation.navigate('Chat', { room, userId, displayName });
  };

  const handleJoinById = () => {
    const trimmed = joinRoomId.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Enter Room ID', 'Please enter a valid Room ID to join.');
      return;
    }
    setJoinModalVisible(false);
    navigation.navigate('Chat', {
      room: { roomId: trimmed, name: 'Loading...', area: '' },
      userId,
      displayName,
      joinById: true,
    });
    setJoinRoomId('');
  };

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const selectCity = async (city) => {
    setCurrentArea(city);
    await AsyncStorage.setItem('lastArea', city);
    setShowManualPicker(false);
    setCitySearch('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>🏘️ Panchayat</Text>
          <Text style={styles.userName}>👤 {displayName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => setJoinModalVisible(true)}
          >
            <Text style={styles.joinBtnText}>🔑 Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateRoom', { currentArea, userId, displayName })}
          >
            <Text style={styles.createBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Bar */}
      <TouchableOpacity
        style={styles.locationBar}
        onPress={() => setShowManualPicker(true)}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.locationText}>
            📍 {currentArea || 'Tap to select area'} ▼
          </Text>
        )}
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.tabActive]}
          onPress={() => setActiveTab('local')}
        >
          <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActive]}>
            Local Rooms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            Browse All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rooms List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching local rooms...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🏜️</Text>
          <Text style={styles.emptyTitle}>No rooms in {currentArea || 'this area'}</Text>
          <Text style={styles.emptySubtitle}>Be the first to start a conversation!</Text>
          <TouchableOpacity
            style={styles.createFirstBtn}
            onPress={() => navigation.navigate('CreateRoom', { currentArea, userId, displayName })}
          >
            <Text style={styles.createFirstBtnText}>Create First Room</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              onPress={() => handleRoomPress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        />
      )}

      {/* Join by Room ID Modal */}
      <Modal
        visible={joinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔑 Join Private Room</Text>
            <Text style={styles.modalSubtitle}>Enter the Room ID shared with you</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. ABCD1234"
              value={joinRoomId}
              onChangeText={(t) => setJoinRoomId(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity style={styles.modalJoinBtn} onPress={handleJoinById}>
              <Text style={styles.modalJoinBtnText}>Join Room</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manual City Picker Modal */}
      <Modal
        visible={showManualPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>📍 Select Your Area</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Search city..."
              value={citySearch}
              onChangeText={setCitySearch}
              placeholderTextColor={COLORS.textLight}
            />
            <ScrollView>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.cityItem}
                  onPress={() => selectCity(city)}
                >
                  <Text style={styles.cityItemText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {currentArea && (
              <TouchableOpacity onPress={() => setShowManualPicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  userName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  joinBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  createBtn: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 26 },
  locationBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: COLORS.primary },
  list: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  createFirstBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createFirstBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 14,
    letterSpacing: 1,
  },
  modalJoinBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalJoinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancelText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15, marginTop: 4 },
  cityItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cityItemText: { fontSize: 16, color: COLORS.text },
});

export default HomeScreen;
