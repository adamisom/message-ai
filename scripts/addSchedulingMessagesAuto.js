/**
 * Quick script to find existing conversations and add scheduling messages
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function findAndUpdateConversation() {
  try {
    console.log('🔍 Finding conversations...');
    
    // Get first few conversations
    const conversationsSnapshot = await db.collection('conversations').limit(10).get();
    
    if (conversationsSnapshot.empty) {
      console.log('❌ No conversations found. Run populateTestData script first.');
      process.exit(1);
    }
    
    console.log(`✅ Found ${conversationsSnapshot.size} conversations`);
    
    // Use the first group chat or any conversation
    let targetConv = null;
    conversationsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!targetConv || data.type === 'group') {
        targetConv = { id: doc.id, data };
      }
    });
    
    if (!targetConv) {
      console.log('❌ No suitable conversation found');
      process.exit(1);
    }
    
    console.log(`📝 Using conversation: ${targetConv.data.name || 'Unnamed'} (ID: ${targetConv.id})`);
    console.log(`   Type: ${targetConv.data.type}`);
    console.log(`   Participants: ${targetConv.data.participants.length}`);
    
    const participants = Object.entries(targetConv.data.participantDetails);
    
    // Create scheduling messages
    const messages = [
      {
        text: "Hey team, we need to schedule our Q4 planning meeting. When does everyone have availability?",
        senderIndex: 0,
        minutesAgo: 30,
      },
      {
        text: "I'm free most afternoons next week, but Monday and Tuesday mornings are packed",
        senderIndex: 1,
        minutesAgo: 28,
      },
      {
        text: "Wednesday afternoons work well for me. I have a conflict Thursday all day though",
        senderIndex: participants.length > 2 ? 2 : 0,
        minutesAgo: 25,
      },
      {
        text: "I can do any day next week except Friday afternoon. Prefer mornings if possible",
        senderIndex: participants.length > 3 ? 3 : 1,
        minutesAgo: 22,
      },
      {
        text: "Great! Sounds like Wednesday might work. What time on Wednesday? I'm thinking 2pm or 3pm?",
        senderIndex: 0,
        minutesAgo: 20,
      },
      {
        text: "2pm works better for me, 3pm I have a standup",
        senderIndex: 1,
        minutesAgo: 18,
      },
      {
        text: "Either time works for me!",
        senderIndex: participants.length > 2 ? 2 : 0,
        minutesAgo: 15,
      },
    ];
    
    // Add messages
    const now = Date.now();
    const batch = db.batch();
    
    for (const msg of messages) {
      const [senderId, senderDetails] = participants[msg.senderIndex];
      const messageRef = db.collection(`conversations/${targetConv.id}/messages`).doc();
      
      const timestamp = new Date(now - (msg.minutesAgo * 60 * 1000));
      
      batch.set(messageRef, {
        text: msg.text,
        senderId: senderId,
        senderName: senderDetails.displayName,
        participants: targetConv.data.participants,
        createdAt: admin.firestore.Timestamp.fromDate(timestamp),
        embedded: false,
      });
    }
    
    await batch.commit();
    
    console.log(`✅ Added ${messages.length} scheduling messages`);
    console.log('\n💡 NOW TEST THE FEATURE:');
    console.log(`   1. Open "${targetConv.data.name || 'this conversation'}" in the app`);
    console.log(`   2. Tap AI menu (✨ sparkles icon)`);
    console.log(`   3. Select "Suggest Meeting Times" (📅)`);
    console.log(`   4. Should suggest Wednesday 2pm as top choice!`);
    console.log(`\n📋 Conversation ID: ${targetConv.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findAndUpdateConversation();

