/**
 * Add scheduling-related messages to a test conversation
 * This makes the Meeting Scheduler feature more realistic to test
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Use the "Project Team" group conversation (4 people)
// From memory: Current test conversation IDs in Firestore:
// - Project Team: JyBikbei99UGNDWzIcME (or 2bzM8nrwNSkarXpUdGtY for refreshed data)
const CONVERSATION_ID = 'JyBikbei99UGNDWzIcME';

async function addSchedulingMessages() {
  try {
    console.log('📅 Adding scheduling messages to test conversation...');

    // Get conversation details
    const convDoc = await db.doc(`conversations/${CONVERSATION_ID}`).get();
    if (!convDoc.exists) {
      console.error('❌ Conversation not found!');
      return;
    }

    const convData = convDoc.data();
    const participants = Object.entries(convData.participantDetails);
    
    console.log(`✅ Found conversation with ${participants.length} participants`);
    
    // Create realistic scheduling discussion messages
    const messages = [
      {
        text: "Hey team, we need to schedule our Q4 planning meeting. When does everyone have availability?",
        senderIndex: 0,
        delay: 0,
      },
      {
        text: "I'm free most afternoons next week, but Monday and Tuesday mornings are packed",
        senderIndex: 1,
        delay: 2,
      },
      {
        text: "Wednesday afternoons work well for me. I have a conflict Thursday all day though",
        senderIndex: 2,
        delay: 3,
      },
      {
        text: "I can do any day next week except Friday afternoon. Prefer mornings if possible",
        senderIndex: 3,
        delay: 4,
      },
      {
        text: "Great! Sounds like Wednesday might work. What time on Wednesday? I'm thinking 2pm or 3pm?",
        senderIndex: 0,
        delay: 5,
      },
      {
        text: "2pm works better for me, 3pm I have a standup",
        senderIndex: 1,
        delay: 6,
      },
      {
        text: "Either time works for me!",
        senderIndex: 2,
        delay: 7,
      },
    ];

    // Add messages with timestamps spread out
    const baseTime = admin.firestore.Timestamp.now();
    const batch = db.batch();

    for (const msg of messages) {
      const [senderId, senderDetails] = participants[msg.senderIndex];
      const messageRef = db.collection(`conversations/${CONVERSATION_ID}/messages`).doc();
      
      batch.set(messageRef, {
        text: msg.text,
        senderId: senderId,
        senderName: senderDetails.displayName,
        participants: convData.participants,
        createdAt: new admin.firestore.Timestamp(
          baseTime.seconds + (msg.delay * 60), // Add minutes
          baseTime.nanoseconds
        ),
        embedded: false,
      });
    }

    await batch.commit();
    
    console.log(`✅ Added ${messages.length} scheduling messages`);
    console.log('📅 Test conversation now has realistic scheduling discussion');
    console.log(`🔍 Conversation ID: ${CONVERSATION_ID}`);
    console.log('\n💡 Now test the Meeting Scheduler:');
    console.log('   1. Open this conversation in the app');
    console.log('   2. Tap AI menu (✨)');
    console.log('   3. Select "Suggest Meeting Times"');
    console.log('   4. Should suggest Wednesday 2pm as top choice!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addSchedulingMessages();

