/**
 * Clear debug logs from Firestore
 * Usage: node scripts/clearDebugLogs.js
 * 
 * Deletes all documents in the debug_logs collection
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearDebugLogs() {
  console.log('🗑️  Clearing debug logs...\n');
  
  try {
    const snapshot = await db.collection('debug_logs').get();
    
    if (snapshot.empty) {
      console.log('✅ No debug logs to clear');
      process.exit(0);
    }
    
    console.log(`Found ${snapshot.docs.length} debug log(s)`);
    
    // Delete in batches of 500
    const batch = db.batch();
    let count = 0;
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    
    console.log(`✅ Deleted ${count} debug log(s)`);
    
  } catch (error) {
    console.error('❌ Error clearing debug logs:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

clearDebugLogs();

