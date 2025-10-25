/* eslint-env node */
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, '../functions/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

async function checkEmbeddingStatus() {
  console.log('🔍 Checking embedding status...\n');

  // Get all conversations
  const conversationsSnapshot = await db.collection('conversations').get();
  
  if (conversationsSnapshot.empty) {
    console.log('❌ No conversations found');
    return;
  }

  let totalMessages = 0;
  let embeddedMessages = 0;
  let pendingMessages = 0;

  for (const convoDoc of conversationsSnapshot.docs) {
    const convoData = convoDoc.data();
    const convoName = convoData.name || convoData.type || 'Unknown';
    
    // Get all messages in this conversation
    const messagesSnapshot = await db
      .collection(`conversations/${convoDoc.id}/messages`)
      .get();
    
    let convoTotal = messagesSnapshot.size;
    let convoEmbedded = 0;
    
    messagesSnapshot.docs.forEach(msgDoc => {
      const msgData = msgDoc.data();
      if (msgData.embedded === true) {
        convoEmbedded++;
      }
    });
    
    totalMessages += convoTotal;
    embeddedMessages += convoEmbedded;
    pendingMessages += (convoTotal - convoEmbedded);
    
    const percentage = convoTotal > 0 ? Math.round((convoEmbedded / convoTotal) * 100) : 0;
    const status = percentage === 100 ? '✅' : percentage > 0 ? '⏳' : '❌';
    
    console.log(`${status} ${convoName}`);
    console.log(`   Messages: ${convoEmbedded}/${convoTotal} embedded (${percentage}%)`);
    console.log(`   Conversation ID: ${convoDoc.id}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 SUMMARY:`);
  console.log(`   Total messages: ${totalMessages}`);
  console.log(`   Embedded: ${embeddedMessages} (${totalMessages > 0 ? Math.round((embeddedMessages / totalMessages) * 100) : 0}%)`);
  console.log(`   Pending: ${pendingMessages}\n`);

  if (pendingMessages > 0) {
    console.log('⏰ The batchEmbedMessages function runs every 5 minutes.');
    console.log('⏰ Wait a few minutes and run this script again.\n');
    console.log('💡 To check if the function is running, check Firebase Console → Functions → Logs');
  } else {
    console.log('✅ All messages are embedded! Semantic search should work now.\n');
  }

  process.exit(0);
}

checkEmbeddingStatus().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

