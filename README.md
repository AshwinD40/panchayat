# 🏘️ Panchayat

Panchayat is a location-based, ephemeral chat application designed for spontaneous and anonymous community conversations. Built on the idea that not everything needs to be permanent, the app allows users to create and join local chat rooms that automatically disappear after exactly 3 hours. No phone numbers, emails, or passwords are required—just open the app, get an auto-generated identity, and start talking with people in your city.

### 📱 Try it out
[<img width="328" height="327" alt="Expo QR Code" src="https://github.com/user-attachments/assets/ee77f493-73ff-4bc5-bd3d-afdcc6052f4d" />](https://expo.dev/accounts/ashwin.sde/projects/panchayat/builds/ad6470c2-9856-427c-b661-080198960d33)

## 🛠️ Tech Stack

The application relies on a modern, tailored stack for a smooth, high-performing location-based experience.
- **Frontend**: React Native powered by Expo
- **Navigation**: React Navigation (Native Stack for fluid, cinematic screen transitions)
- **Database & Auth**: Firebase Firestore (real-time messaging) and Firebase Anonymous Authentication (frictionless login)
- **Location Services**: Expo Location API (to detect your city and filter local rooms)
- **Background Tasks**: Google Cloud Functions (automates the 3-hour permanent deletion cycle)

## 🔄 App Workflow

The user experience is designed to be frictionless. When you launch Panchayat, you bypass traditional sign-up screens entirely. The system instantly provisions a unique anonymous identity (like "SwiftLion#4821") and seamlessly logs you in behind the scenes. 

From the main dashboard, you can browse active public rooms filtered by your local city or jump back into rooms you are already participating in. Creating a room is as simple as giving it a title and selecting a location. Once inside a chat, the interface functions as a fluid, real-time messaging environment complete with dynamic room avatars, smooth glassmorphism styling, and a persistent live countdown timer in the header. 

When the 3-hour timer inevitably hits zero, the session immediately closes. A cloud function then permanently purges the room and all its messages from the servers, leaving no trace behind.

## 🚀 Getting Started

Panchayat is currently deployed exclusively for Android devices via Expo. To download or preview the app, simply scan the QR code above using an Android device or download the APK directly from the Expo EAS link.

If you want to run this project locally, ensure you have Node.js and the Expo CLI installed. You will also need to provide your own Firebase configuration credentials in the app's configuration file.

**Start the development server:**
```bash
npx expo start -c
```

**Build a fresh Android APK via EAS:**
```bash
eas build -p android --profile preview
```
