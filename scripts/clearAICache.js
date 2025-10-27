#!/usr/bin/env node

/**
 * Clear AI feature caches for all conversations
 * This is useful when Cloud Functions are updated and you need fresh data
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearAICaches() {
  console.log('🗑️  Clearing AI feature caches...\n');

  try {
    // Get all conversations
    const conversationsSnapshot = await db.collection('conversations').get();
    
    if (conversationsSnapshot.empty) {
      console.log('No conversations found.');
      return;
    }

    console.log(`Found ${conversationsSnapshot.size} conversations\n`);

    let totalDeleted = 0;

    // For each conversation, delete all ai_cache documents
    for (const convDoc of conversationsSnapshot.docs) {
      const conversationId = convDoc.id;
      const conversationData = convDoc.data();
      const conversationName = conversationData.name || 
        (conversationData.type === 'direct' ? 'Direct Chat' : 'Group Chat');
      
      console.log(`📂 ${conversationName} (${conversationId})`);

      // Delete all documents in the ai_cache subcollection
      const cacheSnapshot = await db
        .collection(`conversations/${conversationId}/ai_cache`)
        .get();

      if (!cacheSnapshot.empty) {
        const batch = db.batch();
        cacheSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          console.log(`   ✓ Deleted: ${doc.id}`);
        });
        
        await batch.commit();
        totalDeleted += cacheSnapshot.size;
      } else {
        console.log(`   (no cache)`);
      }
      
      console.log('');
    }

    console.log(`\n✅ Done! Deleted ${totalDeleted} cached items.`);
    console.log('Next time you open AI features, they will fetch fresh data.\n');

  } catch (error) {
    console.error('Error clearing caches:', error);
    process.exit(1);
  }

  process.exit(0);
}

clearAICaches();

