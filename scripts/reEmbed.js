#!/usr/bin/env node

/**
 * Re-Embed Messages Script
 *
 * Resets the 'embedded' flag on messages so they get re-embedded
 * by the batchEmbedMessages Cloud Function with updated logic.
 *
 * Usage:
 *   node scripts/reEmbed.js --all                     Re-embed all messages
 *   node scripts/reEmbed.js --conversation-id ID      Re-embed specific conversation
 *
 * After running, wait 5-10 minutes for batchEmbedMessages to process.
 */

/* eslint-env node */
const admin = require('firebase-admin');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(
    __dirname,
    '../functions/serviceAccountKey.json'
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

/**
 * Re-embed all messages in a specific conversation
 */
async function reEmbedConversation(conversationId) {
  console.log(`🔄 Re-embedding conversation: ${conversationId}...`);

  const messagesSnapshot = await db
    .collection(`conversations/${conversationId}/messages`)
    .where('embedded', '==', true)
    .get();

  if (messagesSnapshot.empty) {
    console.log(`   No embedded messages found in conversation ${conversationId}\n`);
    return 0;
  }

  console.log(`   Found ${messagesSnapshot.size} embedded messages`);

  const batch = db.batch();
  messagesSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      embedded: false,
      embeddedAt: admin.firestore.FieldValue.delete(),
    });
  });

  await batch.commit();
  console.log(`   ✅ Reset ${messagesSnapshot.size} messages for re-embedding\n`);

  return messagesSnapshot.size;
}

/**
 * Re-embed all messages across all conversations
 */
async function reEmbedAllConversations() {
  console.log('🔄 Re-embedding all conversations...\n');

  const conversationsSnapshot = await db.collection('conversations').get();

  if (conversationsSnapshot.empty) {
    console.log('No conversations found\n');
    return;
  }

  console.log(`Found ${conversationsSnapshot.size} conversations\n`);

  let totalMessages = 0;

  for (const conversationDoc of conversationsSnapshot.docs) {
    const count = await reEmbedConversation(conversationDoc.id);
    totalMessages += count;
  }

  console.log(`✅ Total: Reset ${totalMessages} messages for re-embedding\n`);
  console.log('📋 Next steps:');
  console.log('   1. Wait 5-10 minutes for batchEmbedMessages Cloud Function to run');
  console.log('   2. Check Pinecone dashboard to verify vectors are updated');
  console.log('   3. Test semantic search with updated embeddings\n');
}

// Command-line interface
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('all', {
      type: 'boolean',
      description: 'Re-embed all conversations',
    })
    .option('conversation-id', {
      type: 'string',
      description: 'Re-embed specific conversation by ID',
    })
    .help()
    .alias('h', 'help')
    .argv;

  if (argv.all) {
    await reEmbedAllConversations();
  } else if (argv.conversationId) {
    await reEmbedConversation(argv.conversationId);
  } else {
    console.log('\n📚 Re-Embed Messages Script');
    console.log('\nUsage:');
    console.log('  node scripts/reEmbed.js --all                     Re-embed all conversations');
    console.log('  node scripts/reEmbed.js --conversation-id ID      Re-embed specific conversation');
    console.log('\nOptions:');
    console.log('  --all                  Re-embed all messages in all conversations');
    console.log('  --conversation-id ID   Re-embed specific conversation by ID');
    console.log('  --help, -h            Show this help message');
    console.log('\nDescription:');
    console.log('  This script resets the "embedded" flag on messages to false,');
    console.log('  causing the batchEmbedMessages Cloud Function to re-process them');
    console.log('  with updated embedding logic (e.g., including participants metadata).');
    console.log('\nExamples:');
    console.log('  node scripts/reEmbed.js --all');
    console.log('  node scripts/reEmbed.js --conversation-id abc123\n');
    process.exit(0);
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = {
  reEmbedConversation,
  reEmbedAllConversations,
};

