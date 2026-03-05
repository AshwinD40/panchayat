// src/screens/AboutScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

const AboutScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>About Panchayat</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>

        {/* Intro */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Information</Text>
          <Text style={styles.paragraph}>
            Panchayat is a location-based, ephemeral chat application. It is designed to provide
            temporary, anonymous chatting features. All rooms and their content disappear automatically
            after 3 hours and cannot be recovered.
          </Text>
        </View>

        {/* Privacy Policy */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy Policy</Text>
          <Text style={styles.subheading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            Because Panchayat is designed for anonymity, we collect as little data as possible.
          </Text>
          <Text style={styles.paragraph}>
            • Anonymous Identifiers: We generate a random Display Name and ID. No email, phone number, or password is required.
          </Text>
          <Text style={styles.paragraph}>
            • Location Data: Used strictly to filter public rooms by city.
          </Text>
          <Text style={styles.paragraph}>
            • Chat Data: Temporarily collected to deliver messages.
          </Text>

          <Text style={styles.subheading}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            To log you in anonymously, connect you with local chat rooms, and deliver messages in real-time.
          </Text>

          <Text style={styles.subheading}>3. Storage & Ephemeral Nature</Text>
          <Text style={styles.paragraph}>
            Every room and its messages expire 3 hours after creation and are permanently deleted from the database.
          </Text>

          <Text style={styles.subheading}>4. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We use Google Firebase/Firestore for database storage and authentication, and Expo for app framework services.
          </Text>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Terms and Conditions</Text>
          <Text style={styles.subheading}>1. Nature of the Service</Text>
          <Text style={styles.paragraph}>
            Panchayat provides time-limited, anonymous chat rooms. Provided "as is".
          </Text>

          <Text style={styles.subheading}>2. User Conduct</Text>
          <Text style={styles.paragraph}>
            You agree NOT to share illegal or offensive content, harass other users, distribute spam, or organize illegal activities.
            We reserve the right to ban or block anonymous IDs that violate these rules.
          </Text>

          <Text style={styles.subheading}>3. Content & Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for your content. Your account is tied to your device; if you uninstall the app, your history is permanently lost.
          </Text>

          <Text style={styles.subheading}>4. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            The developer is not liable for indirect or consequential damages arising from app use. Please use common sense when interacting with strangers.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 2.0 (2026)</Text>
          <Text style={styles.footerText}>Made with ⚡ for fast ephemeral chats</Text>
        </View>
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  footerText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  }
});

export default AboutScreen;
