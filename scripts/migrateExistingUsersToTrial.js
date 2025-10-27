/**
 * Migration Script: Add Trial Fields to Existing Users
 * Backfills trialStartedAt, trialEndsAt, trialUsed for users created before Phase 4
 * 
 * Run: node scripts/migrateExistingUsersToTrial.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function migrateUsers() {
  console.log('🔄 Starting migration: Add trial fields to existing users\n');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`Found ${usersSnapshot.size} users\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      
      // Skip if user already has trial fields
      if (user.trialStartedAt && user.trialEndsAt) {
        console.log(`⏭️  Skipping ${user.displayName} - already has trial fields`);
        skippedCount++;
        continue;
      }
      
      // Skip if user is already Pro (adam1)
      if (user.isPaidUser === true) {
        console.log(`⏭️  Skipping ${user.displayName} - already Pro subscriber`);
        skippedCount++;
        continue;
      }
      
      // Add 5-day trial (starting now)
      const now = new Date();
      const fiveDaysFromNow = new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000));
      
      await db.collection('users').doc(doc.id).update({
        trialStartedAt: admin.firestore.Timestamp.fromDate(now),
        trialEndsAt: admin.firestore.Timestamp.fromDate(fiveDaysFromNow),
        trialUsed: true,
        // Ensure these fields are set
        isPaidUser: false,
        subscriptionTier: 'free',
        workspacesOwned: user.workspacesOwned || [],
        workspacesMemberOf: user.workspacesMemberOf || [],
        spamStrikes: 0,
        spamBanned: false,
        spamReportsReceived: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Migrated ${user.displayName} (${user.email})`);
      console.log(`   - Trial: ${now.toISOString()} → ${fiveDaysFromNow.toISOString()}`);
      migratedCount++;
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated: ${migratedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();

