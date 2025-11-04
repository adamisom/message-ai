const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearDecisionsCache(conversationId) {
  console.log(`Deleting decisions cache for conversation: ${conversationId}`);
  
  try {
    await db.doc(`conversations/${conversationId}/ai_cache/decisions`).delete();
    console.log('✅ Decisions cache deleted successfully');
    console.log('Next time you open Decisions, it will regenerate with IDs');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

const conversationId = process.argv[2];
if (!conversationId) {
  console.error('Usage: node clearDecisionsCache.js <conversationId>');
  process.exit(1);
}

clearDecisionsCache(conversationId);
