#!/usr/bin/env node

/**
 * Data Deletion Script
 * 
 * Flexible script to delete data from both Firestore and Pinecone.
 * Can delete specific conversations, user data, or everything.
 * 
 * Usage:
 *   node scripts/deleteData.js --all
 *   node scripts/deleteData.js --conversation-id CONV_ID
 *   node scripts/deleteData.js --user-id USER_ID
 *   node scripts/deleteData.js --all --skip-pinecone
 * 
 * From code:
 *   const { deleteAllData, deleteConversation, deleteUserData } = require('./deleteData.js');
 */

/* eslint-env node */
const admin = require('firebase-admin');
const path = require('path');

// Try to load Pinecone (only available if installed)
let Pinecone;
try {
  // Try functions directory first (where it's actually installed)
  Pinecone = require('../functions/node_modules/@pinecone-database/pinecone').Pinecone;
} catch (error) {
  try {
    // Fallback to root node_modules
    Pinecone = require('@pinecone-database/pinecone').Pinecone;
  } catch (error2) {
    // Pinecone not installed - that's okay, we'll skip vector cleanup
    Pinecone = null;
  }
}

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

// Initialize Pinecone (only if API key is available and package is installed)
let pineconeIndex = null;
const INDEX_NAME = 'message-ai-embeddings';

function initPinecone() {
  if (!Pinecone) {
    return false; // Package not installed
  }
  
  if (!process.env.PINECONE_API_KEY) {
    return false;
  }
  
  if (!pineconeIndex) {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    pineconeIndex = pinecone.index(INDEX_NAME);
  }
  return pineconeIndex !== null;
}

/**
 * Delete all conversations and messages
 */
async function deleteAllConversations(options = {}) {
  const { skipPinecone = false, silent = false } = options;
  
  if (!silent) console.log('🗑️  Deleting all conversations...');
  
  const conversationsSnapshot = await db.collection('conversations').get();
  
  if (conversationsSnapshot.empty) {
    if (!silent) console.log('   No conversations to delete\n');
    return { conversations: 0, messages: 0 };
  }
  
  if (!silent) console.log(`   Found ${conversationsSnapshot.size} conversations`);
  
  let deleteCount = 0;
  let messageCount = 0;
  
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
    
    // Delete the conversation document
    await doc.ref.delete();
    deleteCount++;
    
    if (!silent) process.stdout.write('.');
  }
  
  if (!silent) console.log(`\n   ✅ Deleted ${deleteCount} conversations and ${messageCount} messages`);
  
  // Clear Pinecone if requested
  if (!skipPinecone && initPinecone()) {
    if (!silent) console.log('   🗑️  Clearing Pinecone index...');
    try {
      await pineconeIndex.namespace('').deleteAll();
      if (!silent) console.log('   ✅ Pinecone index cleared');
    } catch (error) {
      if (!silent) console.error('   ⚠️  Failed to clear Pinecone:', error.message);
    }
  } else if (!skipPinecone) {
    if (!silent) {
      console.log('   ⚠️  Pinecone not configured - skipping vector cleanup');
      console.log('   💡 Tip: Set PINECONE_API_KEY to auto-clear vectors');
    }
  }
  
  if (!silent) console.log('');
  
  return { conversations: deleteCount, messages: messageCount };
}

/**
 * Delete a specific conversation and its messages
 */
async function deleteConversation(conversationId, options = {}) {
  const { skipPinecone = false, silent = false } = options;
  
  if (!silent) console.log(`🗑️  Deleting conversation: ${conversationId}`);
  
  const conversationRef = db.doc(`conversations/${conversationId}`);
  const conversationDoc = await conversationRef.get();
  
  if (!conversationDoc.exists) {
    if (!silent) console.log('   ⚠️  Conversation not found\n');
    return { messages: 0, found: false };
  }
  
  // Delete all messages
  const messagesSnapshot = await conversationRef.collection('messages').get();
  let messageCount = 0;
  
  if (!messagesSnapshot.empty) {
    const messageBatch = db.batch();
    messagesSnapshot.docs.forEach((msgDoc) => {
      messageBatch.delete(msgDoc.ref);
    });
    await messageBatch.commit();
    messageCount = messagesSnapshot.size;
  }
  
  // Delete the conversation
  await conversationRef.delete();
  
  if (!silent) console.log(`   ✅ Deleted conversation and ${messageCount} messages`);
  
  // Delete from Pinecone (by conversation prefix)
  if (!skipPinecone && initPinecone()) {
    if (!silent) console.log('   🗑️  Clearing vectors from Pinecone...');
    try {
      // Pinecone IDs are formatted as: conversationId_messageId
      // We need to delete all vectors with this prefix
      // Note: This requires fetching by metadata filter if supported
      if (!silent) console.log('   ⚠️  Pinecone deletion by conversation not yet implemented');
      if (!silent) console.log('   💡 Run with --all to clear all vectors');
    } catch (error) {
      if (!silent) console.error('   ⚠️  Pinecone error:', error.message);
    }
  }
  
  if (!silent) console.log('');
  
  return { messages: messageCount, found: true };
}

/**
 * Delete all data associated with a user
 */
async function deleteUserData(userId, options = {}) {
  const { skipPinecone = false, silent = false } = options;
  
  if (!silent) console.log(`🗑️  Deleting all data for user: ${userId}`);
  
  // Find all conversations the user is part of
  const conversationsSnapshot = await db
    .collection('conversations')
    .where('participants', 'array-contains', userId)
    .get();
  
  if (conversationsSnapshot.empty) {
    if (!silent) console.log('   ⚠️  No conversations found for this user\n');
    return { conversations: 0, messages: 0 };
  }
  
  if (!silent) console.log(`   Found ${conversationsSnapshot.size} conversations`);
  
  let conversationCount = 0;
  let messageCount = 0;
  
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
    
    // Delete the conversation
    await doc.ref.delete();
    conversationCount++;
    
    if (!silent) process.stdout.write('.');
  }
  
  if (!silent) console.log(`\n   ✅ Deleted ${conversationCount} conversations and ${messageCount} messages`);
  
  // Note: We don't delete the user document itself, just their conversation data
  if (!silent) console.log('   ℹ️  User document preserved (only conversation data deleted)');
  
  // Clear Pinecone if needed
  if (!skipPinecone && initPinecone()) {
    if (!silent) console.log('   ⚠️  Pinecone cleanup by user not yet implemented');
    if (!silent) console.log('   💡 Run with --all to clear all vectors');
  }
  
  if (!silent) console.log('');
  
  return { conversations: conversationCount, messages: messageCount };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const flags = {
    all: args.includes('--all'),
    conversationId: args.includes('--conversation-id') ? args[args.indexOf('--conversation-id') + 1] : null,
    userId: args.includes('--user-id') ? args[args.indexOf('--user-id') + 1] : null,
    skipPinecone: args.includes('--skip-pinecone'),
    help: args.includes('--help') || args.includes('-h'),
  };
  
  // Show help
  if (flags.help || args.length === 0) {
    console.log(`
📚 Data Deletion Script

Usage:
  node scripts/deleteData.js --all                              Delete all conversations
  node scripts/deleteData.js --conversation-id CONV_ID          Delete specific conversation
  node scripts/deleteData.js --user-id USER_ID                  Delete all user's conversations
  node scripts/deleteData.js --all --skip-pinecone              Delete without clearing Pinecone

Options:
  --all                  Delete all conversations and messages
  --conversation-id ID   Delete specific conversation by ID
  --user-id ID          Delete all conversations for a user
  --skip-pinecone       Skip Pinecone vector cleanup
  --help, -h            Show this help message

Environment:
  PINECONE_API_KEY      Required for Pinecone cleanup (optional)

Examples:
  node scripts/deleteData.js --all
  node scripts/deleteData.js --conversation-id abc123
  node scripts/deleteData.js --user-id user_xyz --skip-pinecone
`);
    process.exit(0);
  }
  
  // Validate: exactly one action required
  const actionCount = [flags.all, flags.conversationId, flags.userId].filter(Boolean).length;
  
  if (actionCount === 0) {
    console.error('❌ Error: Must specify one action (--all, --conversation-id, or --user-id)');
    console.log('   Run with --help for usage information\n');
    process.exit(1);
  }
  
  if (actionCount > 1) {
    console.error('❌ Error: Can only specify one action at a time');
    console.log('   Run with --help for usage information\n');
    process.exit(1);
  }
  
  console.log('🚀 Starting data deletion...\n');
  
  if (!flags.skipPinecone && !process.env.PINECONE_API_KEY) {
    console.log('⚠️  PINECONE_API_KEY not set - will skip Pinecone cleanup\n');
  }
  
  // Execute the requested action
  try {
    let result;
    
    if (flags.all) {
      result = await deleteAllConversations({ skipPinecone: flags.skipPinecone });
      console.log(`✅ Deletion complete: ${result.conversations} conversations, ${result.messages} messages\n`);
    } else if (flags.conversationId) {
      result = await deleteConversation(flags.conversationId, { skipPinecone: flags.skipPinecone });
      if (result.found) {
        console.log(`✅ Deletion complete: 1 conversation, ${result.messages} messages\n`);
      }
    } else if (flags.userId) {
      result = await deleteUserData(flags.userId, { skipPinecone: flags.skipPinecone });
      console.log(`✅ Deletion complete: ${result.conversations} conversations, ${result.messages} messages\n`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main();
}

// Export functions for programmatic use
module.exports = {
  deleteAllConversations,
  deleteConversation,
  deleteUserData,
};

