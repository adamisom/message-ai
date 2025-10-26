const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

(async () => {
  console.log('🔍 Checking test conversation...\n');
  
  const convs = await db.collection('conversations')
    .where('name', '==', 'Performance Test - 1500 Messages')
    .get();
  
  if (convs.empty) {
    console.log('❌ No test conversation found!');
    process.exit(1);
  }
  
  const conv = convs.docs[0];
  const data = conv.data();
  
  console.log('✅ Found conversation:', conv.id);
  console.log('\nDetails:');
  console.log('  Name:', data.name);
  console.log('  Type:', data.type);
  console.log('  Message count:', data.messageCount);
  console.log('  Participants:', data.participants);
  console.log('\n  Participant Details:');
  Object.entries(data.participantDetails || {}).forEach(([uid, details]) => {
    console.log(`    - ${details.displayName} (${uid})`);
  });
  
  console.log('\n  adam1-gmail included?', data.participants.includes('JEwIUllu9QYvK6mhTMxUNUgVSxj2'));
  
  process.exit(0);
})();

