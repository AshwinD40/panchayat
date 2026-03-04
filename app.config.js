import 'dotenv/config';

export default {
  expo: {
    name: "Panchayat",
    slug: "panchayat",
    version: "1.0.2",
    icon: "./assets/icon.png",
    backgroundColor: "#000000",
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      eas: {
        projectId: "25d69fba-7b4f-49a1-9ae7-7dcde13c5769"
      }
    },
    android: {
      package: "com.ashwin.panchayat",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FF6B35"
      }
    }
  }
};
