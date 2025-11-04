/**
 * Check conversation participants
 * Usage: node scripts/checkConversation.js <conversationId>
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkConversation() {
  const conversationId = process.argv[2];
  
  if (!conversationId) {
    console.log('Usage: node scripts/checkConversation.js <conversationId>');
    process.exit(1);
  }
  
  console.log(`🔍 Checking conversation: ${conversationId}\n`);
  
  try {
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!convDoc.exists) {
      console.log('❌ Conversation not found');
      process.exit(1);
    }
    
    const data = convDoc.data();
    console.log('✅ Conversation found:');
    console.log(`   - Type: ${data.type}`);
    console.log(`   - Name: ${data.name || 'N/A'}`);
    console.log(`   - Creator: ${data.creatorId || 'N/A'}`);
    console.log(`   - Workspace: ${data.workspaceId || 'none'}`);
    console.log(`   - Participants (${data.participants.length}):`);
    data.participants.forEach((uid, i) => {
      const details = data.participantDetails[uid];
      console.log(`     [${i + 1}] ${uid}`);
      console.log(`         Name: ${details?.displayName || 'N/A'}`);
      console.log(`         Email: ${details?.email || 'N/A'}`);
    });
    console.log(`\n   - Inactive Participants (${(data.inactiveParticipants || []).length}):`);
    if (data.inactiveParticipants && data.inactiveParticipants.length > 0) {
      data.inactiveParticipants.forEach((uid, i) => {
        console.log(`     [${i + 1}] ${uid}`);
      });
    } else {
      console.log('     (none)');
    }
    
    console.log(`\n   - Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
    console.log(`   - Last Message: ${data.lastMessageAt?.toDate?.() || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

checkConversation();

