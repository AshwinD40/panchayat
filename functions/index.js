// functions/index.js
// Firebase Cloud Functions - Server-side auto-delete for expired rooms
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled function: runs every 30 minutes
 * Deletes all rooms whose expiresAt timestamp has passed
 */
exports.deleteExpiredRooms = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    console.log(`Running cleanup at ${now.toDate().toISOString()}`);

    try {
      const expiredRooms = await db.collection('rooms')
        .where('expiresAt', '<=', now)
        .get();

      if (expiredRooms.empty) {
        console.log('No expired rooms to delete.');
        return null;
      }

      console.log(`Found ${expiredRooms.size} expired rooms to delete.`);

      const batch = db.batch();
      const messageDeletePromises = [];

      for (const roomDoc of expiredRooms.docs) {
        // Delete all messages in the room subcollection
        const messagesRef = db.collection('rooms').doc(roomDoc.id).collection('messages');
        const msgPromise = messagesRef.get().then((msgs) => {
          const msgBatch = db.batch();
          msgs.docs.forEach((msgDoc) => msgBatch.delete(msgDoc.ref));
          return msgBatch.commit();
        });
        messageDeletePromises.push(msgPromise);

        // Delete the room document
        batch.delete(roomDoc.ref);
      }

      // Wait for all message deletions, then delete rooms
      await Promise.all(messageDeletePromises);
      await batch.commit();

      console.log(`Deleted ${expiredRooms.size} expired rooms.`);
      return null;
    } catch (error) {
      console.error('Error deleting expired rooms:', error);
      return null;
    }
  });

/**
 * Optional: Triggered when a room doc is deleted
 * Cleans up messages subcollection (belt-and-suspenders)
 */
exports.onRoomDeleted = functions.firestore
  .document('rooms/{roomId}')
  .onDelete(async (snap, context) => {
    const roomId = context.params.roomId;
    const messagesRef = db.collection('rooms').doc(roomId).collection('messages');

    try {
      const messages = await messagesRef.get();
      const batch = db.batch();
      messages.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      console.log(`Cleaned up messages for deleted room: ${roomId}`);
    } catch (error) {
      console.error('Error cleaning messages on room delete:', error);
    }
  });
