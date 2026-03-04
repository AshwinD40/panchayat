import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence, signInAnonymously } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";

const extra = Constants?.expoConfig?.extra || {};

const {
  firebaseApiKey,
  firebaseAuthDomain,
  firebaseProjectId,
  firebaseStorageBucket,
  firebaseMessagingSenderId,
  firebaseAppId,
} = extra;

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

const isPlaceholder = (value) => {
  if (typeof value !== 'string') {
    return true;
  }
  const trimmed = value.trim();
  return !trimmed || trimmed.startsWith('YOUR_');
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => isPlaceholder(value))
  .map(([key]) => key);

export const isFirebaseConfigured = missingKeys.length === 0;
export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Firebase config missing/invalid in app.json (expo.extra). Fix: ${missingKeys.join(', ')}`;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (error) {
  // Fast refresh can re-run module init; fall back to existing auth instance.
  authInstance = getAuth(app);
}
export const auth = authInstance;

export const signInUser = async () => {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError);
  }
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Firebase sign-in error:', error);
    throw error;
  }
};
