// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
  StatusBar, Modal, ScrollView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, query, where, onSnapshot, deleteDoc, doc,
  updateDoc, arrayUnion, increment
} from 'firebase/firestore';
import { db, isFirebaseConfigured, firebaseConfigError } from '../../firebase';
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
  const [activeTab, setActiveTab] = useState('myRooms');

  // Join popup
  const [joinPopupVisible, setJoinPopupVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joining, setJoining] = useState(false);

  const cacheKey = `cachedRooms_${currentArea || 'unknown'}_${activeTab}_${userId || 'anon'}`;

  useEffect(() => {
    loadUserData();
    detectLocation();
  }, []);

  useEffect(() => {
    if ((activeTab === 'public' && currentArea) || (activeTab === 'myRooms' && userId)) {
      let unsub;
      const setup = async () => {
        unsub = await subscribeToRooms();
      };
      setup();
      return () => unsub && unsub();
    }
  }, [currentArea, activeTab, userId]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      AsyncStorage.removeItem(cacheKey).catch(() => { });
    });
    return unsubscribeFocus;
  }, [navigation, cacheKey]);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('displayName');
      const id = await AsyncStorage.getItem('userId');
      setDisplayName(name || 'Anonymous');
      setUserId(id || '');
    } catch (error) {
      setDisplayName('Anonymous');
      setUserId('');
    }
  };

  const detectLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        const area = await reverseGeocode(location.lat, location.lng);
        setCurrentArea(area);
        await AsyncStorage.setItem('lastArea', area);
      } else {
        const saved = await AsyncStorage.getItem('lastArea');
        if (saved) {
          setCurrentArea(saved);
        } else {
          setShowManualPicker(true);
        }
      }
    } catch (error) {
      setShowManualPicker(true);
    } finally {
      setLocationLoading(false);
    }
  };

  const subscribeToRooms = async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setRefreshing(false);
      setRooms([]);
      return () => { };
    }

    const now = new Date();
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        setRooms(JSON.parse(cached));
        setLoading(false);
      } catch (error) {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    let roomQuery;
    if (activeTab === 'myRooms') {
      roomQuery = query(
        collection(db, 'rooms'),
        where('members', 'array-contains', userId),
        where('expiresAt', '>', now),
      );
    } else {
      roomQuery = query(
        collection(db, 'rooms'),
        where('area', '==', currentArea),
        where('expiresAt', '>', now),
      );
    }

    const unsub = onSnapshot(roomQuery, async (snapshot) => {
      const roomList = [];
      const expiredIds = [];

      snapshot.docs.forEach((docSnap) => {
        const roomData = { id: docSnap.id, ...docSnap.data() };
        const expiry = roomData.expiresAt?.toDate?.().getTime() || 0;
        if (expiry < Date.now()) {
          expiredIds.push(roomData.id);
        } else {
          roomList.push(roomData);
        }
      });

      for (const id of expiredIds) {
        await deleteDoc(doc(db, 'rooms', id)).catch(() => { });
      }

      roomList.sort((a, b) => {
        const aExp = a.expiresAt?.toDate?.().getTime() || 0;
        const bExp = b.expiresAt?.toDate?.().getTime() || 0;
        return aExp - bExp;
      });

      AsyncStorage.setItem(cacheKey, JSON.stringify(roomList)).catch(() => { });
      setRooms(roomList);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Rooms fetch error:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    detectLocation();
    if (currentArea) {
      AsyncStorage.removeItem(cacheKey).catch(() => { });
    }
  }, [currentArea, cacheKey]);

  const handleRoomPress = (room) => {
    if (!isFirebaseConfigured) {
      Alert.alert('Firebase Setup Required', firebaseConfigError || 'Firebase config missing.');
      return;
    }
    if (activeTab === 'myRooms') {
      navigation.navigate('Chat', { room, userId, displayName });
    } else {
      const isMember = room.members && room.members.includes(userId);
      if (isMember) {
        navigation.navigate('Chat', { room, userId, displayName });
      } else {
        setSelectedRoom(room);
        setJoinPopupVisible(true);
      }
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedRoom || !userId) return;
    setJoining(true);
    try {
      const roomRef = doc(db, 'rooms', selectedRoom.id);
      await updateDoc(roomRef, {
        members: arrayUnion(userId),
        memberCount: increment(1),
      });
      setJoinPopupVisible(false);
      setJoining(false);
      navigation.navigate('Chat', {
        room: { ...selectedRoom, members: [...(selectedRoom.members || []), userId] },
        userId,
        displayName,
        joinedNow: true,
      });
      setSelectedRoom(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to join room.');
      setJoining(false);
    }
  };

  const handleCancelJoin = () => {
    setJoinPopupVisible(false);
    setSelectedRoom(null);
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
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>Panchayat</Text>
        <View style={styles.userPill}>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myRooms' && styles.tabActive]}
          onPress={() => setActiveTab('myRooms')}
        >
          <Text style={[styles.tabText, activeTab === 'myRooms' && styles.tabTextActive]}>
            My Rooms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'public' && styles.tabActive]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.tabTextActive]}>
            Public Rooms
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Picker — only in Public tab */}
      {activeTab === 'public' && (
        <TouchableOpacity
          style={styles.locationBar}
          onPress={() => setShowManualPicker(true)}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{currentArea || 'Select area'}</Text>
              <Text style={styles.locationArrow}>›</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Rooms List */}
      {loading ? (
        <View style={styles.skeletonWrap}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonLine} />
            </View>
          ))}
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>{activeTab === 'myRooms' ? '📭' : '🏜️'}</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'myRooms' ? 'No rooms yet' : `No rooms in ${currentArea || 'this area'}`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'myRooms' ? 'Join from Public Rooms or create one' : 'Be the first to start!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RoomCard room={item} onPress={() => handleRoomPress(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      {/* Create Room FAB — bottom */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRoom', { currentArea, userId, displayName })}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>＋ Create Room</Text>
      </TouchableOpacity>

      {/* Join Room Popup */}
      <Modal
        visible={joinPopupVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelJoin}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>Join Room?</Text>
            <Text style={styles.popupRoomName}>{selectedRoom?.name}</Text>
            <Text style={styles.popupInfo}>📍 {selectedRoom?.area}</Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity style={styles.popupCancelBtn} onPress={handleCancelJoin}>
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.popupJoinBtn, joining && { opacity: 0.6 }]}
                onPress={handleJoinRoom}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.popupJoinText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={showManualPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Area</Text>
            <View style={styles.pickerSearchWrap}>
              <Text style={styles.pickerSearchIcon}>🔍</Text>
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search city..."
                value={citySearch}
                onChangeText={setCitySearch}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.pickerItem, currentArea === city && styles.pickerItemActive]}
                  onPress={() => selectCity(city)}
                >
                  <Text style={[styles.pickerItemText, currentArea === city && styles.pickerItemTextActive]}>
                    {city}
                  </Text>
                  {currentArea === city && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {currentArea && (
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setShowManualPicker(false)}>
                <Text style={styles.pickerCloseText}>Done</Text>
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

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appName: { color: COLORS.text, fontSize: 26, fontWeight: '800' },
  userPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  userName: { color: COLORS.textLight, fontSize: 13, fontWeight: '600' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: { color: COLORS.textLight, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },

  // Location bar
  locationBar: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { fontSize: 14, marginRight: 8 },
  locationText: { color: COLORS.text, fontSize: 14, fontWeight: '500', flex: 1 },
  locationArrow: { color: COLORS.textLight, fontSize: 20, fontWeight: '300' },

  // Room list
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },

  // Skeleton
  skeletonWrap: { paddingHorizontal: 20, paddingTop: 8 },
  skeletonCard: {
    backgroundColor: COLORS.surfaceGlass, borderRadius: 14,
    height: 48, marginBottom: 8, justifyContent: 'center', paddingHorizontal: 16,
  },
  skeletonLine: {
    backgroundColor: COLORS.border, borderRadius: 6,
    height: 12, width: '50%',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Join popup
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  popupContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  popupTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  popupRoomName: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 4, textAlign: 'center' },
  popupInfo: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 },
  popupButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  popupCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1, borderColor: COLORS.border,
  },
  popupCancelText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
  popupJoinBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: COLORS.primary,
  },
  popupJoinText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // City picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '75%',
  },
  pickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  pickerSearchIcon: { fontSize: 14, marginRight: 8 },
  pickerSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  pickerList: { marginBottom: 12 },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemActive: { borderBottomColor: COLORS.primary },
  pickerItemText: { fontSize: 16, color: COLORS.textSecondary },
  pickerItemTextActive: { color: COLORS.primary, fontWeight: '700' },
  pickerCheck: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  pickerCloseBtn: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  pickerCloseText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
});

export default HomeScreen;
