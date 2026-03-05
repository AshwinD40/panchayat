// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

const ProfileScreen = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [liveRoomsCount, setLiveRoomsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('displayName');
        const id = await AsyncStorage.getItem('userId');
        setDisplayName(name || 'Anonymous');
        setUserId(id || '');

        if (id && isFirebaseConfigured) {
          const now = new Date();
          const q = query(
            collection(db, 'rooms'),
            where('members', 'array-contains', id),
            where('expiresAt', '>', now)
          );

          const querySnapshot = await getDocs(q);
          setLiveRoomsCount(querySnapshot.size);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeFocus = navigation.addListener('focus', () => {
      fetchUserData();
    });

    fetchUserData();
    return unsubscribeFocus;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>

        {/* Avatar Placeholder */}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>

        <Text style={styles.greeting}>Hello,</Text>
        <Text style={styles.displayName}>{displayName}</Text>

        <View style={styles.statsCard}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.statsNumber}>{liveRoomsCount}</Text>
              <Text style={styles.statsLabel}>Active Live Rooms</Text>
            </>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Your profile is completely anonymous. The rooms you create or join will automatically disappear after 3 hours.
          </Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700'
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginBottom: 4,
  },
  displayName: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 40,
  },
  statsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 107, 0, 0.1)', // Primary tint using RGBA 
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    marginBottom: 24,
  },
  statsNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 20,
  }
});

export default ProfileScreen;
