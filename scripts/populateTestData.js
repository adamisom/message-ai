#!/usr/bin/env node

/**
 * Test Data Population Script
 *
 * Creates realistic test conversations with messages that trigger various AI features:
 * - Priority messages (urgent, casual, normal)
 * - Action items with assignees
 * - Decisions made by the group
 * - Regular conversation flow
 *
 * Usage:
 *   node scripts/populateTestData.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(
  __dirname,
  '../functions/serviceAccountKey.json'
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

// Test users will be fetched from Firestore dynamically
let TEST_USERS = [];

// Sample messages with various AI triggers
const MESSAGE_TEMPLATES = {
  urgent: [
    'URGENT: Server is down! Need immediate attention!!!',
    'ASAP - Client needs response by end of day',
    'EMERGENCY: Budget approval deadline is today',
    'This is critical - production bug affecting users',
  ],
  casual: [
    'lol',
    'thanks!',
    'sounds good 👍',
    'ok cool',
    'haha nice',
    'good morning',
  ],
  actionItems: [
    'Alice, can you review the budget by Friday?',
    'Bob should update the documentation ASAP',
    'Charlie, please send the report to diana@example.com',
    'Diana needs to approve the design by end of week',
    'Someone should schedule a follow-up meeting for next Tuesday',
  ],
  decisions: [
    'We all agree - let\'s go with option A for the Q4 strategy',
    'After discussion, we\'re launching the feature on December 1st',
    'Budget approved at $50,000 for the marketing campaign',
    'Charlie will be the project lead starting next month',
    'Meeting rescheduled to 3pm Friday, everyone confirmed',
  ],
  normal: [
    'What does everyone think about the proposal?',
    'I reviewed the document and it looks solid',
    'Can we discuss this in tomorrow\'s standup?',
    'I have a few suggestions for improvement',
    'Let me check with the team and get back to you',
    'The timeline seems reasonable to me',
    'Good point, I hadn\'t considered that angle',
  ],
};

async function createTestConversation(participants, name, messageCount = 30) {
  console.log(`\n📝 Creating conversation: ${name}`);
  console.log(
    `   Participants: ${participants.map((p) => p.displayName).join(', ')}`
  );

  // Create conversation document
  const conversationRef = db.collection('conversations').doc();
  const conversationId = conversationRef.id;

  const participantDetails = {};
  const participantIds = [];

  participants.forEach((user) => {
    participantIds.push(user.uid);
    participantDetails[user.uid] = {
      displayName: user.displayName,
      email: user.email,
      photoURL: null,
    };
  });

  await conversationRef.set({
    type: participants.length > 2 ? 'group' : 'direct',
    participants: participantIds,
    participantDetails,
    name: participants.length > 2 ? name : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: participants[0].uid,
    lastMessage: null,
    lastMessageAt: null,
    messageCount: 0,
  });

  console.log(`   ✅ Conversation created: ${conversationId}`);

  // Create messages
  const messagesRef = conversationRef.collection('messages');
  let createdAt = Date.now() - messageCount * 60000; // Start from N minutes ago

  const allMessages = [
    // Start with normal conversation
    ...MESSAGE_TEMPLATES.normal.slice(0, 8),
    // Add some urgent messages
    ...MESSAGE_TEMPLATES.urgent.slice(0, 2),
    // More normal flow
    ...MESSAGE_TEMPLATES.normal.slice(8, 14),
    // Add action items
    ...MESSAGE_TEMPLATES.actionItems.slice(0, 3),
    // Continue conversation
    ...MESSAGE_TEMPLATES.normal.slice(14, 18),
    // Add decisions
    ...MESSAGE_TEMPLATES.decisions.slice(0, 2),
    // Mix in casual messages
    ...MESSAGE_TEMPLATES.casual.slice(0, 4),
    // End with more normal messages
    ...MESSAGE_TEMPLATES.normal.slice(18),
  ];

  for (let i = 0; i < Math.min(messageCount, allMessages.length); i++) {
    const sender = participants[i % participants.length];
    const text = allMessages[i];

    await messagesRef.add({
      text,
      senderId: sender.uid,
      senderName: sender.displayName,
      type: 'text',
      createdAt: new Date(createdAt + i * 60000), // 1 minute apart
      embedded: false, // Will trigger embedding
    });

    if ((i + 1) % 10 === 0) {
      process.stdout.write('.');
    }
  }

  console.log(`\n   ✅ Created ${messageCount} messages`);

  // Update conversation with last message
  const lastMessage = allMessages[Math.min(messageCount, allMessages.length) - 1];
  await conversationRef.update({
    lastMessage: {
      text: lastMessage,
      senderId: participants[(messageCount - 1) % participants.length].uid,
      senderName:
        participants[(messageCount - 1) % participants.length].displayName,
      createdAt: new Date(createdAt + (messageCount - 1) * 60000),
    },
    lastMessageAt: new Date(createdAt + (messageCount - 1) * 60000),
    messageCount,
  });

  console.log(`   ✅ Conversation ready for testing`);
  return conversationId;
}

async function fetchTestUsers() {
  console.log('📥 Fetching users from Firestore...\n');
  
  const usersSnapshot = await db.collection('users').limit(10).get();
  
  if (usersSnapshot.empty) {
    throw new Error('No users found in Firestore! Please create some users first.');
  }
  
  const users = [];
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    users.push({
      uid: doc.id,
      displayName: data.displayName || 'Unknown User',
      email: data.email || 'unknown@example.com',
    });
  });
  
  return users;
}

async function deleteAllConversations() {
  console.log('🗑️  Deleting all existing conversations...');
  
  const conversationsSnapshot = await db.collection('conversations').get();
  
  if (conversationsSnapshot.empty) {
    console.log('   No existing conversations to delete\n');
    return;
  }
  
  console.log(`   Found ${conversationsSnapshot.size} conversations to delete`);
  
  let deleteCount = 0;
  let messageCount = 0;
  
  // Delete each conversation and its messages
  for (const doc of conversationsSnapshot.docs) {
    // Delete all messages in this conversation
    const messagesSnapshot = await doc.ref.collection('messages').get();
    
    if (!messagesSnapshot.empty) {
      const messageBatch = db.batch();
      messagesSnapshot.docs.forEach((msgDoc) => {
        messageBatch.delete(msgDoc.ref);
      });
      await messageBatch.commit();
      messageCount += messagesSnapshot.size;
    }
    
    // Delete the conversation document itself
    await doc.ref.delete();
    deleteCount++;
    
    process.stdout.write('.');
  }
  
  console.log(`\n   ✅ Deleted ${deleteCount} conversations and ${messageCount} messages\n`);
}

async function promptForDeletion() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    readline.question(
      '⚠️  Do you want to DELETE ALL existing conversations before creating test data? (y/N): ',
      (answer) => {
        readline.close();
        resolve(answer.toLowerCase() === 'y');
      }
    );
  });
}

async function main() {
  console.log('🚀 Starting test data population...\n');
  
  // Ask user if they want to delete existing conversations
  const shouldDelete = await promptForDeletion();
  
  if (shouldDelete) {
    await deleteAllConversations();
  } else {
    console.log('⏭️  Skipping deletion, keeping existing conversations\n');
  }
  
  // Fetch real users from Firestore
  TEST_USERS = await fetchTestUsers();
  
  if (TEST_USERS.length < 2) {
    throw new Error('Need at least 2 users for testing. Please create more users.');
  }
  
  console.log(`✅ Found ${TEST_USERS.length} users in Firestore:\n`);
  TEST_USERS.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.displayName} (${user.email})`);
  });

  const conversationIds = [];

  // Use up to 4 users for testing (or all available if less than 4)
  const usersForTesting = TEST_USERS.slice(0, Math.min(4, TEST_USERS.length));

  if (usersForTesting.length >= 4) {
    // 1. Group conversation (4 people) - Full feature testing
    conversationIds.push(
      await createTestConversation(
        usersForTesting,
        'Project Team',
        40 // More messages for better AI analysis
      )
    );
  }

  if (usersForTesting.length >= 3) {
    // 2. Group conversation (3 people) - Decision tracking focus
    conversationIds.push(
      await createTestConversation(
        [usersForTesting[0], usersForTesting[1], usersForTesting[2]],
        'Budget Planning',
        25
      )
    );
  }

  if (usersForTesting.length >= 2) {
    // 3. Direct conversation (2 people) - Simple testing
    conversationIds.push(
      await createTestConversation(
        [usersForTesting[0], usersForTesting[1]],
        null, // No name for direct messages
        15
      )
    );
  }

  if (usersForTesting.length >= 3) {
    // 4. Group with urgent messages (3 people) - Priority testing
    conversationIds.push(
      await createTestConversation(
        [usersForTesting[1], usersForTesting[2], usersForTesting[usersForTesting.length - 1]],
        'Operations Team',
        20
      )
    );
  }

  console.log('\n\n🎉 Test data population complete!\n');
  console.log('Conversation IDs for testing:');
  conversationIds.forEach((id, i) => {
    console.log(`   ${i + 1}. ${id}`);
  });

  console.log('\n📋 Next steps:');
  console.log('   1. Wait 5-10 minutes for embeddings to process');
  console.log('   2. Check Firebase Console → Firestore to verify data');
  console.log('   3. Check Pinecone dashboard to verify vector count increased');
  console.log('   4. Test AI features using these conversation IDs\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

