#!/usr/bin/env node

/**
 * Push Notification Test Script
 * 
 * Sends a single test message to trigger push notifications.
 * Useful for live testing - run this while watching your device.
 * 
 * Usage:
 *   node scripts/testPushNotification.js
 *   node scripts/testPushNotification.js adam2-gmailAlt adam4
 *   node scripts/testPushNotification.js --from adam1-gmail --to adam3-Hey
 * 
 * Defaults: adam1-gmail → adam3-Hey
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Default users for testing
const DEFAULT_SENDER = 'adam1-gmail';
const DEFAULT_RECIPIENT = 'adam3-Hey';

async function getUserByDisplayName(displayName) {
  const usersSnapshot = await db.collection('users')
    .where('displayName', '==', displayName)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    throw new Error(`User not found: ${displayName}`);
  }
  
  const doc = usersSnapshot.docs[0];
  return {
    uid: doc.id,
    displayName: doc.data().displayName,
    email: doc.data().email,
  };
}

async function findOrCreateConversation(user1, user2) {
  // Look for existing direct conversation between these two users
  const conversationsSnapshot = await db.collection('conversations')
    .where('type', '==', 'direct')
    .where('participants', 'array-contains', user1.uid)
    .get();
  
  // Find conversation that includes both users
  for (const doc of conversationsSnapshot.docs) {
    const participants = doc.data().participants;
    if (participants.includes(user2.uid)) {
      return doc.id;
    }
  }
  
  // Create new direct conversation
  const conversationRef = await db.collection('conversations').add({
    type: 'direct',
    participants: [user1.uid, user2.uid],
    participantDetails: {
      [user1.uid]: {
        displayName: user1.displayName,
        email: user1.email,
      },
      [user2.uid]: {
        displayName: user2.displayName,
        email: user2.email,
      },
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastMessage: null,
    lastMessageAt: null,
    messageCount: 0,
  });
  
  return conversationRef.id;
}

async function sendTestMessage(conversationId, sender, messageText) {
  await db.collection(`conversations/${conversationId}/messages`).add({
    text: messageText,
    senderId: sender.uid,
    senderName: sender.displayName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    participants: [sender.uid],
    embedded: false,
    type: 'text',
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let senderName, recipientName;
  
  if (args.includes('--from') && args.includes('--to')) {
    senderName = args[args.indexOf('--from') + 1];
    recipientName = args[args.indexOf('--to') + 1];
  } else if (args.length >= 2) {
    senderName = args[0];
    recipientName = args[1];
  } else {
    senderName = DEFAULT_SENDER;
    recipientName = DEFAULT_RECIPIENT;
  }
  
  console.log(`\n🔔 Push Notification Test`);
  console.log(`   From: ${senderName}`);
  console.log(`   To: ${recipientName}\n`);
  
  try {
    // Get users
    const sender = await getUserByDisplayName(senderName);
    const recipient = await getUserByDisplayName(recipientName);
    
    console.log(`✓ Found sender: ${sender.email}`);
    console.log(`✓ Found recipient: ${recipient.email}\n`);
    
    // Find or create conversation
    const conversationId = await findOrCreateConversation(sender, recipient);
    console.log(`✓ Conversation: ${conversationId}\n`);
    
    // Send test message
    const timestamp = new Date().toLocaleTimeString();
    const messageText = `🔔 Push notification test at ${timestamp}`;
    
    console.log(`📨 Sending: "${messageText}"`);
    await sendTestMessage(conversationId, sender, messageText);
    
    console.log(`\n✅ Message sent successfully!`);
    console.log(`\n📱 Check ${recipient.displayName}'s device for push notification`);
    console.log(`   Expected: "${messageText}"\n`);
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

main();

