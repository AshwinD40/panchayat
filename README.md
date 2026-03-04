# 🏘️ Panchayat

This is my personal documentation for the Panchayat app. I built this app to create ephemeral (temporary), location-based chat rooms that disappear after 3 hours. 

### 📱 Scan to Play (Expo)
[[<img width="328" height="327" alt="{C9121C41-6270-438F-BF53-5F8A7B7C4C1E}" src="https://github.com/user-attachments/assets/ee77f493-73ff-4bc5-bd3d-afdcc6052f4d" />](https://wf-artifacts.eascdn.net/builds/internal-st/25d69fba-7b4f-49a1-9ae7-7dcde13c5769/ad6470c2-9856-427c-b661-080198960d33/019cb842-9b8a-77c9-95a9-53407ac4d55e/application-ad6470c2-9856-427c-b661-080198960d33.apk?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=75d871a1a44e598975dd84fa2341c9b0%2F20260304%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260304T095417Z&X-Amz-Expires=900&X-Amz-Signature=173dd0891f5d0633d21a6364ad4febf8595d2378cc585e79bc0e2bd4b531dbe3&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)](https://expo.dev/accounts/ashwin.sde/projects/panchayat/builds/ad6470c2-9856-427c-b661-080198960d33)


---

## 🔄 How the App Flows

1. **Splash Screen (`SplashScreen.js`)**
   - The app opens with a cool animation.
   - It checks `AsyncStorage` (local phone memory) to see if you have an ID and a Display Name.
   - If not, it generates them for you (e.g., `SwiftLion#4821`).
   - It also automatically logs you in anonymously to Firebase.
   - After 2 seconds, it instantly swaps to the Home Screen.

2. **Home Screen (`HomeScreen.js`)**
   - You land on a clean, dark, glass-themed dashboard.
   - Up top, you see your auto-generated username in a pill shape.
   - **Tabs**: You have two main tabs:
     - **My Rooms**: Shows rooms you've joined or created.
     - **Public Rooms**: Shows rooms created by others in a specific city.
   - **Location**: In Public Rooms, you can pick a city (like "Surat" or "Delhi"). The app filters rooms based on that city.
   - **Joining**: Tap a room to join. If you aren't in it yet, a pop-up asks if you want to join. Once you join, it moves to your "My Rooms" tab.
   - **Creating**: The `+ Create Room` button at the bottom takes you to the creation screen.

3. **Create Room Screen (`CreateRoomScreen.js`)**
   - A sleek form where you type the Room Name and select the City.
   - When you hit "Create", it saves the room to the Firestore database with an expiration time of exactly 3 hours from now.

4. **Chat Screen (`ChatScreen.js`)**
   - **Header**: Shows the room's dynamic colorful avatar, name, and a live countdown timer. Tap the header to open the `RoomInfoSheet`.
   - **Room Info**: A slick bottom sheet that slides up to show the Location, Member count, Timer, and the large Room ID so you can share it.
   - **Messaging**: The chat looks like WhatsApp (bubbles on right for you, left for others). System messages ("SwiftLion joined") show up quietly in the middle.
   - **Input**: A bold, Telegram-style input bar at the bottom.
   - **Auto-Delete**: When the timer hits 00:00:00, the room closes and kicks you back to the home screen.

---

## 🧠 The Logic (Plain English)

**Firebase Database (Firestore)**
Everything lives in a collection called `rooms`. Each room is a document. Inside each room document, there is a sub-collection called `messages`.
- **Querying**: On the Home Screen, we ask Firebase: *"Give me all rooms where the Area is 'Surat' and the ExpiresAt time is greater than right now."* 
- **Auto-Cleaning**: The app is smart. When it downloads the list of rooms, if it sees a room that is past its expiry time, it quietly deletes it from Firebase. We also have a Cloud Function server script that sweeps the database every 30 minutes to delete expired rooms automatically.
- **State Management**: We use `useCallback`, `useMemo`, and `React.memo` to make sure the app doesn't slow down or lag when you are typing fast in the chat.

**Navigation**
We use `@react-navigation/native-stack`. When you move between screens, they don't slide wildly; they do a smooth cinematic cross-fade. We force the background of the app to be pitch black (`#000`), so there is no ugly white flash between pages.

---

## 🚀 Version History

### Version 1: The Basics (MVP)
The first version was all about making the logic work. 
- **Looks**: Basic white/light theme. Standard buttons and inputs.
- **Features**: Real-time messaging, a basic 3-hour countdown, location-based filtering, and a Room ID you could copy. 
- **Problems**: Looked a bit boring, had a clunky layout where the Room ID and member counts took up too much space on the screen, and transitions felt stiff.

### Version 2: The "Glass" Redesign (Current)
This is the massive glow-up. We focused heavily on UX (User Experience) and UI (User Interface).
- **Aesthetic**: Complete pitch-black Dark Mode with "Glassmorphism" (semi-transparent backgrounds that look like frosted glass).
- **Navigation**: Buttery smooth iOS-style fade transitions. No more white flashes.
- **Room Avatars**: Every room now automatically gets a circular logo with its first letter and a dynamic, vibrant background color so it's easy to recognize.
- **Chat Experience**: Cleaned up the header. Moved all the boring stats (Room ID, Location, Members) hiding inside a smooth sliding `RoomInfoSheet` that opens when you tap the header.
- **Input**: Replaced the basic text box with a bold, rounded Telegram-style input that has a glowing orange Send button.
- **Performance**: Fixed lag spikes while navigating and typing by optimizing how the lists render.

---

## 💻 Commands to remember

**Run the app locally:**
```bash
npx expo start -c
```

**Build an APK for Android (to share via link):**
```bash
eas build -p android --profile preview
```
