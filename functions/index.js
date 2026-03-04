
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const MAX_BATCH_SIZE = 450;

const commitDeleteInChunks = async (docRefs) => {
  for (let i = 0; i < docRefs.length; i += MAX_BATCH_SIZE) {
    const batch = db.batch();
    docRefs.slice(i, i + MAX_BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

const deleteRoomMessages = async (roomId) => {
  const messagesSnap = await db.collection('rooms').doc(roomId).collection('messages').get();
  if (messagesSnap.empty) {
    return 0;
  }
  await commitDeleteInChunks(messagesSnap.docs.map((docSnap) => docSnap.ref));
  return messagesSnap.size;
};

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
      let deletedMessagesCount = 0;
      for (const roomDoc of expiredRooms.docs) {
        deletedMessagesCount += await deleteRoomMessages(roomDoc.id);
      }

      await commitDeleteInChunks(expiredRooms.docs.map((roomDoc) => roomDoc.ref));
      console.log(`Deleted ${expiredRooms.size} expired rooms and ${deletedMessagesCount} messages.`);
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

    try {
      const deleted = await deleteRoomMessages(roomId);
      console.log(`Cleaned up ${deleted} messages for deleted room: ${roomId}`);
    } catch (error) {
      console.error('Error cleaning messages on room delete:', error);
    }
  });
