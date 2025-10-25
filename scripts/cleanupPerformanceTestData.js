/**
 * Performance Test Data Cleanup
 * 
 * Removes the test conversation and all its messages created by
 * createPerformanceTestData.js
 * 
 * Usage:
 *   node scripts/cleanupPerformanceTestData.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TEST_CONVERSATION_NAME = 'Performance Test - 1500 Messages';

async function cleanupPerformanceTestData() {
  console.log('🧹 Cleaning up performance test data...\n');
  
  try {
    // Find the test conversation
    const conversations = await db.collection('conversations')
      .where('name', '==', TEST_CONVERSATION_NAME)
      .get();
    
    if (conversations.empty) {
      console.log('✓ No performance test conversation found (already cleaned up)');
      console.log('\nNothing to do!\n');
      return;
    }
    
    console.log(`Found ${conversations.docs.length} test conversation(s)\n`);
    
    for (const convDoc of conversations.docs) {
      const conversationId = convDoc.id;
      console.log(`🗑️  Deleting conversation: ${conversationId}`);
      
      // Delete all messages (in batches)
      let deletedMessages = 0;
      let hasMore = true;
      
      while (hasMore) {
        const messagesSnapshot = await db
          .collection(`conversations/${conversationId}/messages`)
          .limit(400)
          .get();
        
        if (messagesSnapshot.empty) {
          hasMore = false;
          break;
        }
        
        const batch = db.batch();
        messagesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedMessages++;
        });
        
        await batch.commit();
        console.log(`  ✓ Deleted ${deletedMessages} messages...`);
      }
      
      // Delete AI cache documents if any
      const cacheSnapshot = await db
        .collection(`conversations/${conversationId}/ai_cache`)
        .get();
      
      if (!cacheSnapshot.empty) {
        const cacheBatch = db.batch();
        cacheSnapshot.docs.forEach(doc => {
          cacheBatch.delete(doc.ref);
        });
        await cacheBatch.commit();
        console.log(`  ✓ Deleted ${cacheSnapshot.docs.length} cache documents`);
      }
      
      // Delete AI action items if any
      const actionItemsSnapshot = await db
        .collection(`conversations/${conversationId}/ai_action_items`)
        .get();
      
      if (!actionItemsSnapshot.empty) {
        const aiItemsBatch = db.batch();
        actionItemsSnapshot.docs.forEach(doc => {
          aiItemsBatch.delete(doc.ref);
        });
        await aiItemsBatch.commit();
        console.log(`  ✓ Deleted ${actionItemsSnapshot.docs.length} action items`);
      }
      
      // Delete the conversation itself
      await db.collection('conversations').doc(conversationId).delete();
      console.log(`  ✓ Deleted conversation document\n`);
      
      console.log(`✅ Cleanup complete for conversation ${conversationId}`);
      console.log(`   Total messages deleted: ${deletedMessages}\n`);
    }
    
    console.log('🎉 All performance test data cleaned up successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
cleanupPerformanceTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

