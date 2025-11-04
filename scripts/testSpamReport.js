/**
 * Test spam reporting - check what's failing
 * Usage: node scripts/testSpamReport.js <invitationId>
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testSpamReport() {
  const invitationId = process.argv[2];
  
  if (!invitationId) {
    console.log('Usage: node scripts/testSpamReport.js <invitationId>');
    console.log('\nTo get invitation IDs, check workspace_invitations collection in Firestore');
    process.exit(1);
  }
  
  console.log(`🔍 Testing spam report for invitation: ${invitationId}\n`);
  
  try {
    // 1. Get invitation
    console.log('1️⃣ Fetching invitation...');
    const invitationRef = db.collection('workspace_invitations').doc(invitationId);
    const invitationDoc = await invitationRef.get();
    
    if (!invitationDoc.exists) {
      console.log('❌ Invitation not found');
      process.exit(1);
    }
    
    const invitation = invitationDoc.data();
    console.log('✅ Invitation found:');
    console.log(`   - Workspace: ${invitation.workspaceName} (${invitation.workspaceId})`);
    console.log(`   - Invited by: ${invitation.invitedByDisplayName} (${invitation.invitedByUid})`);
    console.log(`   - Invited user: ${invitation.invitedUserEmail} (${invitation.invitedUserUid})`);
    console.log(`   - Status: ${invitation.status}`);
    console.log('');
    
    // 2. Get inviter
    console.log('2️⃣ Fetching inviter user document...');
    const inviterRef = db.collection('users').doc(invitation.invitedByUid);
    const inviterDoc = await inviterRef.get();
    
    if (!inviterDoc.exists) {
      console.log('❌ Inviter not found');
      process.exit(1);
    }
    
    const inviter = inviterDoc.data();
    console.log('✅ Inviter found:');
    console.log(`   - Display name: ${inviter.displayName}`);
    console.log(`   - Email: ${inviter.email}`);
    console.log(`   - Current spam strikes: ${inviter.spamStrikes || 0}`);
    console.log(`   - Current spam reports: ${(inviter.spamReportsReceived || []).length}`);
    console.log(`   - Spam banned: ${inviter.spamBanned || false}`);
    console.log('');
    
    // 3. Simulate spam calculation
    console.log('3️⃣ Simulating spam strike calculation...');
    const spamReportsReceived = inviter.spamReportsReceived || [];
    
    console.log(`   - Existing reports: ${spamReportsReceived.length}`);
    spamReportsReceived.forEach((report, i) => {
      console.log(`     [${i + 1}] Reported by ${report.reportedBy} on ${report.timestamp?.toDate?.() || 'N/A'} for ${report.reason}`);
    });
    
    // Try to call the calculation
    const reportsForCalculation = spamReportsReceived.map((report) => ({
      reportedBy: report.reportedBy,
      timestamp: report.timestamp,
      reason: report.reason,
      workspaceId: report.workspaceId,
    }));
    
    // Add new report
    const newReport = {
      reportedBy: 'TEST_USER',
      reason: 'workspace',
      timestamp: new Date(),
      workspaceId: invitation.workspaceId,
    };
    reportsForCalculation.push(newReport);
    
    console.log(`   - After adding new report: ${reportsForCalculation.length} total`);
    console.log('');
    
    console.log('✅ Test completed - invitation and inviter documents are valid');
    console.log('\n💡 If the Cloud Function is still failing, check the Firebase Functions logs:');
    console.log('   https://console.firebase.google.com/project/message-ai-2a7cf/functions/logs');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

testSpamReport();

