// src/components/CountdownTimer.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, WARNING_THRESHOLD_MS } from '../utils/theme';

const CountdownTimer = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;
    hasExpiredRef.current = false;

    let interval;
    const tick = () => {
      const now = Date.now();
      const expiry = expiresAt?.toDate
        ? expiresAt.toDate().getTime()
        : expiresAt instanceof Date
          ? expiresAt.getTime()
          : expiresAt; // Assume it's a timestamp in ms

      if (!Number.isFinite(expiry)) {
        setTimeLeft(null);
        return;
      }

      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft(0);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire && onExpire();
        }
        clearInterval(interval);
        return;
      }
      setTimeLeft(diff);
    };

    tick();
    interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  useEffect(() => {
    let pulseLoop;
    if (timeLeft !== null && timeLeft <= WARNING_THRESHOLD_MS && timeLeft > 0) {
      // Pulse animation when under 5 minutes
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
    };
  }, [timeLeft, pulseAnim]);

  if (timeLeft === null) return null;

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const pad = (n) => String(n).padStart(2, '0');
  const display = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const getTimerColor = () => {
    if (timeLeft <= WARNING_THRESHOLD_MS) return COLORS.timerRed;
    if (timeLeft <= 30 * 60 * 1000) return COLORS.timerOrange;
    return COLORS.timerGreen;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { borderColor: getTimerColor() },
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <Text style={styles.emoji}>⏳</Text>
      <Text style={[styles.text, { color: getTimerColor() }]}>{display}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  emoji: {
    fontSize: 11,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
});

export default CountdownTimer;
