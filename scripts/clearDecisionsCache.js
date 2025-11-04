const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'message-ai-2a7cf',
  });
}

const db = admin.firestore();

async function clearDecisionsCache(conversationId) {
  if (!conversationId) {
    console.error('Usage: node clearDecisionsCache.js <conversationId>');
    process.exit(1);
  }

  const cacheRef = db
    .collection('conversations')
    .doc(conversationId)
    .collection('ai_cache')
    .doc('decisions');

  try {
    await cacheRef.delete();
    console.log(`✅ Successfully deleted decisions cache for conversation: ${conversationId}`);
  } catch (error) {
    console.error(`❌ Error deleting decisions cache for conversation ${conversationId}:`, error);
  } finally {
    process.exit();
  }
}

const conversationId = process.argv[2];
clearDecisionsCache(conversationId);
