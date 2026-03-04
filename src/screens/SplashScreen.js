// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, StatusBar, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInUser, isFirebaseConfigured, firebaseConfigError } from '../../firebase';
import { generateDisplayName } from '../utils/nameGenerator';
import { COLORS } from '../utils/theme';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
    ]).start();

    initUser();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const initUser = async () => {
    try {
      let userId = await AsyncStorage.getItem('userId');
      let displayName = await AsyncStorage.getItem('displayName');

      if (isFirebaseConfigured) {
        // Always sign in fresh to ensure valid auth token
        const user = await signInUser();
        userId = user.uid;
      } else {
        userId = userId || 'local_' + Date.now();
        Alert.alert(
          'Firebase Setup Required',
          firebaseConfigError || 'Firebase config is missing. Add values in app.json -> expo.extra.'
        );
      }

      if (!displayName) {
        displayName = generateDisplayName();
        await AsyncStorage.setItem('displayName', displayName);
      }

      await AsyncStorage.setItem('userId', userId);

      timeoutRef.current = setTimeout(() => {
        navigation.replace('Home');
      }, 2200);
    } catch (error) {
      if (isFirebaseConfigured) {
        console.error('Init error:', error);
      }
      const fallbackId = 'local_' + Date.now();
      const fallbackName = generateDisplayName();
      await AsyncStorage.setItem('userId', fallbackId);
      await AsyncStorage.setItem('displayName', fallbackName);
      timeoutRef.current = setTimeout(() => navigation.replace('Home'), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Text style={styles.logo}>🏘️</Text>
        <Text style={styles.title}>Panchayat</Text>
        <Text style={styles.subtitle}>Your Local Community, Reimagined</Text>
      </Animated.View>
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.footerText}>Rooms vanish in 3 hours. Be real. Be local.</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
  },
  footerText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default SplashScreen;
