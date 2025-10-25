/**
 * View debug logs from Firestore
 * Usage: node scripts/viewDebugLogs.js [limit]
 * 
 * Retrieves the most recent debug logs written by Cloud Functions
 * for inspecting raw AI responses and parsing errors
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function viewDebugLogs() {
  const limit = parseInt(process.argv[2]) || 5;
  
  console.log(`📋 Fetching last ${limit} debug logs...\n`);
  
  try {
    const snapshot = await db.collection('debug_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No debug logs found');
      return;
    }
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${'='.repeat(80)}`);
      console.log(`Log #${index + 1} (ID: ${doc.id})`);
      console.log(`${'='.repeat(80)}`);
      console.log(`📅 Timestamp: ${data.timestamp?.toDate() || 'N/A'}`);
      console.log(`👤 User: ${data.userId || 'N/A'}`);
      console.log(`💬 Conversation: ${data.conversationId || 'N/A'}`);
      console.log(`🔧 Feature: ${data.feature || 'N/A'}`);
      console.log(`📊 Status: ${data.status || 'SUCCESS'}`);
      
      if (data.status === 'PARSING_ERROR') {
        console.log(`\n❌ ERROR DETAILS:`);
        console.log(`Message: ${data.errorMessage || 'N/A'}`);
        console.log(`\nStack Trace:`);
        console.log(data.errorStack || 'N/A');
      }
      
      console.log(`\n📏 Raw Response Length: ${data.rawResponseLength || 'N/A'} chars`);
      
      if (data.rawResponseFull) {
        console.log(`\n📝 FULL RAW RESPONSE:`);
        console.log(`${'─'.repeat(80)}`);
        console.log(data.rawResponseFull);
        console.log(`${'─'.repeat(80)}`);
      } else {
        if (data.rawResponsePreview) {
          console.log(`\n📝 Response Preview (first 1000 chars):`);
          console.log(data.rawResponsePreview);
        }
        
        if (data.rawResponseEnd) {
          console.log(`\n📝 Response End (last 500 chars):`);
          console.log(data.rawResponseEnd);
        }
      }
      
      if (data.firstCharsAsCodes) {
        console.log(`\n🔢 Character Codes (first 300 chars):`);
        console.log(data.firstCharsAsCodes.join(', '));
        
        // Highlight non-printable characters
        const nonPrintable = data.firstCharsAsCodes.filter((code, idx) => 
          code < 32 && code !== 9 && code !== 10 && code !== 13
        );
        
        if (nonPrintable.length > 0) {
          console.log(`\n⚠️  WARNING: Found ${nonPrintable.length} non-printable character(s)`);
          console.log(`Non-printable codes: ${nonPrintable.join(', ')}`);
        } else {
          console.log(`✅ No hidden non-printable characters detected`);
        }
      }
      
      console.log(`\n`);
    });
    
    console.log(`\n✅ Displayed ${snapshot.docs.length} debug log(s)`);
    console.log(`\n💡 To see more logs, run: node scripts/viewDebugLogs.js [number]`);
    console.log(`💡 To clear debug logs, run: node scripts/clearDebugLogs.js`);
    
  } catch (error) {
    console.error('❌ Error fetching debug logs:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

viewDebugLogs();

