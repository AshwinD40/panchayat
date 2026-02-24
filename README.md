# 🏘️ Panchayat - Hyperlocal Community Chat

> Ephemeral community rooms tied to your location. Every room vanishes in **3 hours**.

---

## 📱 Features
- 🔐 Auto-generated anonymous identity (e.g. `SwiftLion#4821`)
- 📍 GPS-based room discovery + manual city selection fallback
- 🌐 Public rooms visible to everyone in the area
- 🔒 Private rooms accessible only via shared Room ID
- ⏳ All rooms auto-delete after **3 hours** (server + client enforced)
- 🔔 5-minute expiry warning banner in chat
- 📤 Share Room ID to invite anyone directly

---

## 🛠️ Prerequisites

Install these tools before starting:

```bash
# Node.js (v18+): https://nodejs.org
node --version

# Expo CLI
npm install -g expo-cli eas-cli

# Firebase CLI
npm install -g firebase-tools
firebase login
```

---

## 🔥 Step 1: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** → Name it `panchayat`
3. Disable Google Analytics (optional) → Create project

### Enable Services:
- **Authentication**: Go to Build → Authentication → Get Started → Enable **Anonymous** sign-in
- **Firestore**: Go to Build → Firestore Database → Create database → Start in **production mode** → Choose a region close to India (e.g. `asia-south1`)

### Get Config:
- Go to Project Settings (gear icon) → Your Apps → Click **</>** (Web)
- Register app as `panchayat-web` → Copy the firebaseConfig object

### Add Config to Project:
Open `firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Deploy Firestore Rules & Indexes:
```bash
firebase init firestore   # Select your project, use existing files
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## ☁️ Step 2: Deploy Cloud Functions (Auto-Delete)

Cloud Functions run every 30 minutes to delete expired rooms on the server.

```bash
# Upgrade to Firebase Blaze plan (required for scheduled functions)
# Go to Firebase Console → Upgrade → Blaze (pay-as-you-go, free up to limits)

cd functions
npm install

cd ..
firebase init functions   # Choose your project, select existing functions/index.js
firebase deploy --only functions
```

✅ You'll see `deleteExpiredRooms` and `onRoomDeleted` in your Firebase Console → Functions.

---

## 📦 Step 3: Install & Run the App

```bash
# In the project root
npm install

# Start Expo dev server
npx expo start

# Scan QR code with Expo Go app on your Android phone
# OR press 'a' to launch Android emulator
```

---

## 🚀 Step 4: Build for Google Play Store

### Setup EAS:
```bash
# Login to Expo
eas login

# Configure EAS in your project
eas build:configure
```

### Update app.json:
```json
{
  "expo": {
    "android": {
      "package": "com.yourname.panchayat"  // ← Change to your unique package name
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"  // ← From: eas build:configure output
      }
    }
  }
}
```

### Build Android APK/AAB:
```bash
# Build APK (for direct install on your phone)
eas build --platform android --profile preview

# Build AAB (for Google Play Store submission)
eas build --platform android --profile production
```

### Create eas.json (if not auto-created):
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### Download & Install:
- After build completes, Expo will give you a **download link**
- For preview APK: Download → Install directly on your phone
- For Play Store: Upload the `.aab` file at [play.google.com/console](https://play.google.com/console)

---

## 📁 Project Structure

```
panchayat/
├── App.js                          # Root entry point
├── app.json                        # Expo configuration
├── firebase.js                     # Firebase setup ⚠️ Add your config here
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Required query indexes
├── firebase.json                   # Firebase project config
│
├── functions/
│   ├── index.js                    # Cloud Functions (auto-delete rooms)
│   └── package.json
│
└── src/
    ├── navigation/
    │   └── AppNavigator.js         # Stack navigation setup
    │
    ├── screens/
    │   ├── SplashScreen.js         # Onboarding + user init
    │   ├── HomeScreen.js           # Browse local/all rooms
    │   ├── CreateRoomScreen.js     # Create new room
    │   └── ChatScreen.js           # Real-time chat + timer
    │
    ├── components/
    │   ├── CountdownTimer.js       # ⏳ Animated countdown widget
    │   └── RoomCard.js             # Room list card
    │
    └── utils/
        ├── nameGenerator.js        # Generate display names + room IDs
        ├── locationHelper.js       # GPS + reverse geocoding + city list
        └── theme.js                # Colors, constants
```

---

## 🗄️ Firestore Data Structure

```
rooms/{auto-id}
  ├── name: "Surat Farmers Talk"
  ├── roomId: "ABCD5678"          ← 8-char shareable ID
  ├── area: "Surat"
  ├── isPrivate: false
  ├── creatorId: "firebase-uid"
  ├── creatorName: "SwiftLion#4821"
  ├── createdAt: Timestamp
  ├── expiresAt: Timestamp        ← createdAt + 3 hours
  └── messages/{auto-id}
        ├── text: "Hello!"
        ├── senderId: "firebase-uid"
        ├── senderName: "SwiftLion#4821"
        └── createdAt: Timestamp
```

---

## ⏳ How 3-Hour Auto-Delete Works

| Layer | How |
|-------|-----|
| **Client** | `CountdownTimer` hits 0 → calls `handleExpire()` → deletes room doc → navigates back |
| **Client (list)** | `HomeScreen` checks `expiresAt` on every snapshot → removes expired rooms locally |
| **Server** | `deleteExpiredRooms` Cloud Function runs every **30 minutes** → bulk deletes expired rooms + their messages |
| **Server trigger** | `onRoomDeleted` function fires whenever a room doc is deleted → cleans up messages subcollection |

---

## 🎨 Color Guide

| Color | Use |
|-------|-----|
| `#FF6B35` Orange | Primary brand, my chat bubbles |
| `#1A1A2E` Dark Slate | Header backgrounds |
| `#10B981` Green | Timer (plenty of time), Public badge |
| `#F59E0B` Amber | Timer (under 30 min) |
| `#EF4444` Red | Timer (under 5 min), expiry |
| `#8B5CF6` Purple | Private room badge |

---

## 🐛 Common Issues

**"Missing index" Firestore error:**
```bash
firebase deploy --only firestore:indexes
```

**Location permission denied:**
App will show the city picker automatically — no GPS needed.

**Functions deployment fails:**
Make sure your Firebase project is on the **Blaze plan** (required for Cloud Functions).

**Expo Go can't connect:**
Make sure your phone and computer are on the same WiFi network.

---

## 📞 Support

If you get stuck on any step, the most common fix is making sure your `firebase.js` config values exactly match what's in your Firebase Console → Project Settings.

Built with ❤️ using Expo + Firebase.
