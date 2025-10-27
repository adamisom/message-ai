#!/usr/bin/env node

/**
 * Burst Message Test - Real Firestore
 * 
 * Tests rapid message influx by sending 10 messages to Firestore within 2 seconds.
 * Use this to test real-world performance with actual network and Firestore behavior.
 * 
 * Usage:
 *   node scripts/testMessageBurst.js [conversationId]
 * 
 * If no conversationId provided, uses 'perf_test_1500'
 * 
 * What to observe on device:
 * 1. Frame rate during burst (should stay smooth)
 * 2. Time until first message appears
 * 3. Time until all messages visible
 * 4. Any UI jank or freezing
 * 5. Ability to scroll during burst
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Configuration
const MESSAGE_COUNT = 10;
const BURST_DURATION_MS = 2000; // 2 seconds
const INTERVAL_MS = BURST_DURATION_MS / MESSAGE_COUNT; // 200ms

function generateMessage(index) {
  return `Burst ${index}`;
}

async function getParticipants(conversationId) {
  const convDoc = await db.collection('conversations').doc(conversationId).get();
  
  if (!convDoc.exists) {
    throw new Error(`Conversation ${conversationId} not found`);
  }
  
  const participants = convDoc.data().participants;
  const participantDetails = convDoc.data().participantDetails;
  
  return participants.map(uid => ({
    uid,
    displayName: participantDetails[uid]?.displayName || 'Unknown',
    email: participantDetails[uid]?.email || `${uid}@example.com`,
  }));
}

async function sendBurstMessages(conversationId, participants) {
  console.log(`\n🚀 Starting burst test: ${MESSAGE_COUNT} messages in ${BURST_DURATION_MS}ms`);
  console.log(`   Interval: ${INTERVAL_MS}ms between messages\n`);
  
  const startTime = Date.now();
  const sendTimes = [];
  const promises = [];

  // Schedule all messages with staggered timing
  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const delay = i * INTERVAL_MS;
    
    const promise = new Promise((resolve) => {
      setTimeout(async () => {
        const sendStart = Date.now();
        const sender = participants[Math.floor(Math.random() * participants.length)];
        const messageText = generateMessage(i + 1);
        
        try {
          await db.collection(`conversations/${conversationId}/messages`).add({
            text: messageText,
            senderId: sender.uid,
            senderName: sender.displayName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            participants: participants.map(p => p.uid),
          });
          
          const sendTime = Date.now() - sendStart;
          sendTimes.push(sendTime);
          
          console.log(`  ✓ Message ${i + 1}/${MESSAGE_COUNT}: ${messageText}`);
          console.log(`    Sent in ${sendTime}ms (${Date.now() - startTime}ms total elapsed)`);
          
          resolve();
        } catch (error) {
          console.error(`  ✗ Message ${i + 1} failed:`, error.message);
          resolve(); // Don't fail entire burst
        }
      }, delay);
    });
    
    promises.push(promise);
  }

  // Wait for all messages to be sent
  await Promise.all(promises);
  
  const totalTime = Date.now() - startTime;
  const avgSendTime = sendTimes.reduce((a, b) => a + b, 0) / sendTimes.length;
  const maxSendTime = Math.max(...sendTimes);
  const minSendTime = Math.min(...sendTimes);
  
  console.log(`\n📊 Burst Test Results:`);
  console.log(`   Total elapsed: ${totalTime}ms`);
  console.log(`   Messages sent: ${sendTimes.length}/${MESSAGE_COUNT}`);
  console.log(`   Average send time: ${avgSendTime.toFixed(2)}ms`);
  console.log(`   Min send time: ${minSendTime}ms`);
  console.log(`   Max send time: ${maxSendTime}ms`);
  console.log(`\n✅ Burst complete!`);
  console.log(`\n📱 Now check your device/app:`);
  console.log(`   1. Did all ${MESSAGE_COUNT} messages appear?`);
  console.log(`   2. Was there any UI jank or freezing?`);
  console.log(`   3. Could you scroll during the burst?`);
  console.log(`   4. What was the frame rate? (use React DevTools)`);
  console.log(`   5. Time to first message visible?`);
  console.log(`   6. Time to all messages visible?\n`);
}

async function main() {
  const conversationId = process.argv[2] || 'perf_test_1500';
  
  try {
    console.log(`\n🎯 Burst Test Configuration:`);
    console.log(`   Conversation: ${conversationId}`);
    console.log(`   Messages: ${MESSAGE_COUNT}`);
    console.log(`   Duration: ${BURST_DURATION_MS}ms`);
    console.log(`   Interval: ${INTERVAL_MS}ms`);
    
    // Get participants
    const participants = await getParticipants(conversationId);
    console.log(`   Participants: ${participants.length}`);
    console.log(`   Senders:`);
    participants.forEach(p => {
      console.log(`      - ${p.displayName} (${p.email})`);
    });
    
    // Verify all 4 test users are present
    const expectedUsers = ['adam1-gmail', 'adam2-gmailAlt', 'adam3-Hey', 'adam4'];
    const userNames = participants.map(p => p.displayName);
    const missingUsers = expectedUsers.filter(u => !userNames.includes(u));
    
    if (missingUsers.length > 0) {
      console.log(`\n⚠️  Warning: Missing test users: ${missingUsers.join(', ')}`);
      console.log(`   Using available users: ${userNames.join(', ')}`);
    } else {
      console.log(`   ✓ All 4 test users present`);
    }
    
    // Countdown
    console.log(`\n⏱️  Starting in 3 seconds...`);
    console.log(`   (Open the conversation on your device NOW)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`   2...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`   1...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(``);
    
    // Send burst
    await sendBurstMessages(conversationId, participants);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Burst test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

