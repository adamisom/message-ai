/**
 * Quick script to check test user status
 * Run: node scripts/checkUserStatus.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUsers() {
  console.log('🔍 Checking test user status...\n');
  
  try {
    const usersSnapshot = await db.collection('users')
      .orderBy('email')
      .get();
    
    console.log(`Found ${usersSnapshot.size} users:\n`);
    
    const now = Date.now();
    
    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      
      // Determine status
      let status = '🔴 FREE (No Trial)';
      let detail = '';
      
      if (user.isPaidUser === true) {
        status = '💎 PRO SUBSCRIBER';
        if (user.subscriptionEndsAt) {
          const expiresAt = user.subscriptionEndsAt.toDate();
          detail = `Expires: ${expiresAt.toLocaleDateString()}`;
        }
      } else if (user.trialEndsAt) {
        const trialEndsAt = user.trialEndsAt.toMillis();
        if (now < trialEndsAt) {
          const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
          status = `🎉 IN TRIAL (${daysRemaining} days left)`;
          detail = `Ends: ${user.trialEndsAt.toDate().toLocaleDateString()}`;
        } else {
          status = '⏰ TRIAL EXPIRED';
          detail = `Expired: ${user.trialEndsAt.toDate().toLocaleDateString()}`;
        }
      }
      
      console.log(`${status}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.displayName}`);
      if (detail) console.log(`  ${detail}`);
      console.log('');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();

