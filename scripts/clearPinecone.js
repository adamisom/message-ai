/* eslint-env node */
const admin = require('firebase-admin');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const INDEX_NAME = 'message-ai-messages';

async function clearPineconeIndex() {
  console.log('🗑️  Clearing Pinecone index...\n');

  try {
    const index = pinecone.index(INDEX_NAME);
    
    // Delete all vectors by namespace (or entire index)
    await index.namespace('').deleteAll();
    
    console.log('✅ Pinecone index cleared!\n');
  } catch (error) {
    console.error('❌ Error clearing Pinecone:', error.message);
    throw error;
  }
}

async function resetEmbeddingFlags() {
  console.log('🔄 Resetting embedding flags in Firestore...\n');

  const conversationsSnapshot = await db.collection('conversations').get();
  
  if (conversationsSnapshot.empty) {
    console.log('❌ No conversations found');
    return;
  }

  let totalMessages = 0;

  for (const convoDoc of conversationsSnapshot.docs) {
    const convoData = convoDoc.data();
    const convoName = convoData.name || convoData.type || 'Unknown';
    
    // Get all messages and reset embedded flag
    const messagesSnapshot = await db
      .collection(`conversations/${convoDoc.id}/messages`)
      .get();
    
    if (messagesSnapshot.empty) continue;

    const batch = db.batch();
    
    messagesSnapshot.docs.forEach(msgDoc => {
      batch.update(msgDoc.ref, { embedded: false });
      totalMessages++;
    });
    
    await batch.commit();
    console.log(`✅ ${convoName}: Reset ${messagesSnapshot.size} messages`);
  }

  console.log(`\n✅ Reset ${totalMessages} messages total\n`);
}

async function main() {
  console.log('🚀 Clearing Pinecone and resetting embeddings...\n');
  
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY environment variable not set');
    console.log('💡 Run: export PINECONE_API_KEY=your_key_here');
    process.exit(1);
  }

  // Step 1: Clear Pinecone
  await clearPineconeIndex();

  // Step 2: Reset embedding flags
  await resetEmbeddingFlags();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Cleanup complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Wait 5-10 minutes for batchEmbedMessages to run');
  console.log('   2. Run: node scripts/checkEmbeddings.js');
  console.log('   3. Test semantic search again\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

