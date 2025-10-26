const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const TEST_CONVERSATION_ID = 'dlOhukWjJ6lo5xWgw8tu';

(async () => {
  console.log('🔧 Fixing test conversation...\n');
  
  // Get the conversation
  const convRef = db.collection('conversations').doc(TEST_CONVERSATION_ID);
  const convSnap = await convRef.get();
  
  if (!convSnap.exists) {
    console.log('❌ Conversation not found!');
    process.exit(1);
  }
  
  // Get the most recent message timestamp
  const messagesSnap = await db.collection(`conversations/${TEST_CONVERSATION_ID}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  
  if (messagesSnap.empty) {
    console.log('❌ No messages found!');
    process.exit(1);
  }
  
  const lastMessage = messagesSnap.docs[0].data();
  const lastTimestamp = lastMessage.createdAt;
  
  console.log(`✓ Found last message at: ${lastTimestamp.toDate()}`);
  
  // Update conversation with lastMessageAt
  await convRef.update({
    lastMessageAt: lastTimestamp,
  });
  
  console.log('✓ Added lastMessageAt field to conversation');
  console.log('\n✅ Done! The conversation should now appear in your app.');
  
  process.exit(0);
})();

