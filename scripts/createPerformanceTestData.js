/**
 * Performance Test Data Generator
 * 
 * Creates a test conversation with 1500 realistic messages to test:
 * - Scroll performance
 * - Message rendering
 * - Real-time listener performance
 * - Search functionality at scale
 * 
 * Usage:
 *   node scripts/createPerformanceTestData.js
 * 
 * Cleanup:
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

// Test conversation details
const TEST_CONVERSATION_NAME = 'Performance Test - 1500 Messages';
const MESSAGE_COUNT = 1500;

// Realistic message templates
const MESSAGE_TEMPLATES = [
  "Hey team, just finished the {task}. Ready for review!",
  "Can someone take a look at the {topic}? Need feedback.",
  "Meeting at {time} tomorrow to discuss {topic}.",
  "Great work on {task}! Really impressive.",
  "Quick question about {topic} - anyone available?",
  "Updated the {task} based on your feedback.",
  "I'll handle {task} by end of day.",
  "Does anyone have experience with {topic}?",
  "Let's schedule a sync about {topic}.",
  "Finished testing {task}. All looks good!",
  "Running into an issue with {topic}. Any ideas?",
  "Can we prioritize {task} for this sprint?",
  "Documentation for {topic} is now updated.",
  "I'll be out of office {time}. Back tomorrow.",
  "Thanks for the help with {topic}!",
  "Pushed the changes for {task} to staging.",
  "Need approval on {topic} before we proceed.",
  "Who's available to pair on {task}?",
  "Reminder: deadline for {task} is {time}.",
  "Let me know if you need help with {topic}.",
];

const TASKS = [
  'the API integration',
  'the dashboard redesign',
  'user authentication',
  'the payment flow',
  'database optimization',
  'the mobile layout',
  'error handling',
  'the analytics feature',
  'code review',
  'the deployment pipeline',
  'unit tests',
  'documentation',
  'the search functionality',
  'performance monitoring',
  'bug fixes',
];

const TOPICS = [
  'the new feature',
  'the production deployment',
  'our Q4 roadmap',
  'the client feedback',
  'scaling issues',
  'security updates',
  'the sprint planning',
  'technical debt',
  'user onboarding',
  'the database migration',
  'API rate limits',
  'monitoring alerts',
  'the design system',
  'accessibility improvements',
  'infrastructure costs',
];

const TIMES = [
  '2pm',
  '3:30pm',
  'tomorrow afternoon',
  'next Monday',
  'this Friday',
  'end of week',
  'next sprint',
  'by EOD',
];

// Generate realistic message content
function generateMessage() {
  const template = MESSAGE_TEMPLATES[Math.floor(Math.random() * MESSAGE_TEMPLATES.length)];
  let message = template;
  
  if (message.includes('{task}')) {
    message = message.replace('{task}', TASKS[Math.floor(Math.random() * TASKS.length)]);
  }
  if (message.includes('{topic}')) {
    message = message.replace('{topic}', TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  }
  if (message.includes('{time}')) {
    message = message.replace('{time}', TIMES[Math.floor(Math.random() * TIMES.length)]);
  }
  
  return message;
}

// Create participants
const PARTICIPANTS = [
  { uid: 'test_alice', displayName: 'Alice (Test)', email: 'alice.test@example.com' },
  { uid: 'test_bob', displayName: 'Bob (Test)', email: 'bob.test@example.com' },
  { uid: 'test_charlie', displayName: 'Charlie (Test)', email: 'charlie.test@example.com' },
  { uid: 'test_diana', displayName: 'Diana (Test)', email: 'diana.test@example.com' },
];

async function createPerformanceTestData() {
  console.log('🚀 Creating performance test data...\n');
  
  try {
    // Check if test conversation already exists
    const existingConvs = await db.collection('conversations')
      .where('name', '==', TEST_CONVERSATION_NAME)
      .limit(1)
      .get();
    
    let conversationId;
    
    if (!existingConvs.empty) {
      conversationId = existingConvs.docs[0].id;
      console.log(`✓ Found existing test conversation: ${conversationId}`);
      console.log('  (Skipping conversation creation - idempotent)\n');
    } else {
      // Create test conversation
      console.log('📝 Creating test conversation...');
      const conversationRef = await db.collection('conversations').add({
        name: TEST_CONVERSATION_NAME,
        type: 'group',
        participants: PARTICIPANTS.map(p => p.uid),
        participantDetails: PARTICIPANTS.reduce((acc, p) => {
          acc[p.uid] = {
            displayName: p.displayName,
            email: p.email,
          };
          return acc;
        }, {}),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: null,
        messageCount: 0,
        isPerformanceTest: true, // Flag for easy identification
      });
      
      conversationId = conversationRef.id;
      console.log(`✓ Created conversation: ${conversationId}\n`);
    }
    
    // Check how many messages already exist
    const existingMessages = await db.collection(`conversations/${conversationId}/messages`).count().get();
    const existingCount = existingMessages.data().count;
    
    if (existingCount >= MESSAGE_COUNT) {
      console.log(`✓ Test conversation already has ${existingCount} messages`);
      console.log('  (Idempotent - no new messages needed)\n');
      console.log(`✅ Performance test data ready!`);
      console.log(`   Conversation ID: ${conversationId}`);
      console.log(`   Message count: ${existingCount}\n`);
      return;
    }
    
    const messagesToCreate = MESSAGE_COUNT - existingCount;
    console.log(`📨 Creating ${messagesToCreate} messages...`);
    console.log(`   (${existingCount} already exist)\n`);
    
    // Create messages in batches (Firestore has 500 writes per batch limit)
    const BATCH_SIZE = 400; // Safe margin
    const batches = Math.ceil(messagesToCreate / BATCH_SIZE);
    
    // Start timestamp: 30 days ago
    const startTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const timeIncrement = (30 * 24 * 60 * 60 * 1000) / MESSAGE_COUNT; // Spread over 30 days
    
    for (let batchNum = 0; batchNum < batches; batchNum++) {
      const batch = db.batch();
      const startIdx = batchNum * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, messagesToCreate);
      
      for (let i = startIdx; i < endIdx; i++) {
        const messageRef = db.collection(`conversations/${conversationId}/messages`).doc();
        const sender = PARTICIPANTS[Math.floor(Math.random() * PARTICIPANTS.length)];
        const timestamp = new Date(startTime + ((existingCount + i) * timeIncrement));
        
        batch.set(messageRef, {
          text: generateMessage(),
          senderId: sender.uid,
          senderName: sender.displayName,
          createdAt: admin.firestore.Timestamp.fromDate(timestamp),
          readBy: {}, // Empty initially
          type: 'text',
        });
      }
      
      await batch.commit();
      console.log(`  ✓ Batch ${batchNum + 1}/${batches} complete (${endIdx}/${messagesToCreate} messages)`);
    }
    
    // Update conversation metadata
    await db.collection('conversations').doc(conversationId).update({
      messageCount: MESSAGE_COUNT,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: generateMessage(),
    });
    
    console.log(`\n✅ Performance test data created successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Conversation ID: ${conversationId}`);
    console.log(`   Conversation Name: ${TEST_CONVERSATION_NAME}`);
    console.log(`   Total Messages: ${MESSAGE_COUNT}`);
    console.log(`   Participants: ${PARTICIPANTS.length}`);
    console.log(`   Time Span: 30 days`);
    console.log(`\n🧪 To test:`);
    console.log(`   1. Open the app`);
    console.log(`   2. Find "${TEST_CONVERSATION_NAME}" in your conversations`);
    console.log(`   3. Test scroll performance, search, AI features`);
    console.log(`\n🧹 To cleanup:`);
    console.log(`   node scripts/cleanupPerformanceTestData.js\n`);
    
  } catch (error) {
    console.error('\n❌ Error creating test data:', error);
    process.exit(1);
  }
}

// Run the script
createPerformanceTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

