/**
 * Trial Management Script
 * Expire, grant, or reset trials for testing purposes
 * 
 * Usage:
 *   node scripts/manageTrial.js expire adam3-Hey
 *   node scripts/manageTrial.js grant adam3-Hey
 *   node scripts/manageTrial.js grant adam3-Hey 7      (custom days)
 *   node scripts/manageTrial.js reset adam3-Hey        (make eligible for trial again)
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function manageTrial() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Usage: node scripts/manageTrial.js <expire|grant|reset> <email-or-displayName> [days]');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/manageTrial.js expire adam3-Hey');
    console.error('  node scripts/manageTrial.js grant adam3-Hey');
    console.error('  node scripts/manageTrial.js grant adam3-Hey 7   (grant 7-day trial)');
    console.error('  node scripts/manageTrial.js reset adam3-Hey     (make eligible for trial again)');
    process.exit(1);
  }

  const action = args[0].toLowerCase();
  const identifier = args[1];
  const customDays = args[2] ? parseInt(args[2]) : 5; // Default 5 days

  if (action !== 'expire' && action !== 'grant' && action !== 'reset') {
    console.error('❌ Action must be "expire", "grant", or "reset"');
    process.exit(1);
  }

  try {
    // Find user by email or displayName
    let userDoc = null;
    let userId = null;

    // Try email first
    const emailQuery = await db.collection('users')
      .where('email', '==', identifier)
      .limit(1)
      .get();

    if (!emailQuery.empty) {
      userDoc = emailQuery.docs[0];
      userId = userDoc.id;
    } else {
      // Try displayName
      const nameQuery = await db.collection('users')
        .where('displayName', '==', identifier)
        .limit(1)
        .get();

      if (!nameQuery.empty) {
        userDoc = nameQuery.docs[0];
        userId = userDoc.id;
      }
    }

    if (!userDoc) {
      console.error(`❌ User not found: ${identifier}`);
      console.error('   Try email or displayName (case-sensitive)');
      process.exit(1);
    }

    const user = userDoc.data();
    console.log(`\n📝 Found user:`);
    console.log(`   Name: ${user.displayName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Status: ${user.isPaidUser ? '💎 Pro' : '🔴 Free'}`);
    
    if (user.trialEndsAt) {
      try {
        const now = Date.now();
        let trialEndsAt;
        
        // Handle both Timestamp object and plain object with _seconds
        if (typeof user.trialEndsAt.toMillis === 'function') {
          trialEndsAt = user.trialEndsAt.toMillis();
        } else if (user.trialEndsAt._seconds) {
          trialEndsAt = user.trialEndsAt._seconds * 1000;
        } else {
          // Fallback for any other format
          trialEndsAt = new Date(user.trialEndsAt).getTime();
        }
        
        const daysRemaining = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
        
        if (now < trialEndsAt) {
          console.log(`   Trial: 🎉 Active (${daysRemaining} days left)`);
        } else {
          console.log(`   Trial: ⏰ Expired`);
        }
      } catch (err) {
        console.log(`   Trial: ⚠️ Has trial data (format issue)`);
      }
    } else {
      console.log(`   Trial: ❌ No trial data`);
    }
    console.log('');

    // Perform action
    if (action === 'expire') {
      console.log('⏱️  Expiring trial...');
      
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      
      await db.collection('users').doc(userId).update({
        trialEndsAt: admin.firestore.Timestamp.fromDate(oneHourAgo),
        trialUsed: true,
        isPaidUser: false,
        subscriptionTier: 'free',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Trial expired successfully!');
      console.log('   - trialEndsAt: 1 hour ago');
      console.log('   - trialUsed: true');
      console.log('   - isPaidUser: false');
      console.log('   - subscriptionTier: free');
      console.log('');
      console.log('🧪 Test behavior:');
      console.log('   - AI features should be blocked in personal chats');
      console.log('   - Should show "Upgrade to Pro" prompt');
      console.log('   - AI features should still work in workspace chats');
      
    } else if (action === 'grant') {
      console.log(`🎁 Granting ${customDays}-day trial...`);
      
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + (customDays * 24 * 60 * 60 * 1000));
      
      await db.collection('users').doc(userId).update({
        trialStartedAt: admin.firestore.Timestamp.fromDate(now),
        trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndsAt),
        trialUsed: true,
        isPaidUser: false,
        subscriptionTier: 'free',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ ${customDays}-day trial granted successfully!`);
      console.log(`   - Trial starts: ${now.toISOString()}`);
      console.log(`   - Trial ends: ${trialEndsAt.toISOString()}`);
      console.log(`   - Days: ${customDays}`);
      console.log(`   - isPaidUser: false`);
      console.log(`   - subscriptionTier: free`);
      console.log('');
      console.log('🧪 Test behavior:');
      console.log('   - AI features should work everywhere');
      console.log('   - Should show trial banner with countdown');
      console.log(`   - Trial expires in ${customDays} days`);
      
    } else if (action === 'reset') {
      console.log('🔄 Resetting trial eligibility...');
      
      await db.collection('users').doc(userId).update({
        trialStartedAt: admin.firestore.FieldValue.delete(),
        trialEndsAt: admin.firestore.FieldValue.delete(),
        trialUsed: false,
        isPaidUser: false,
        subscriptionTier: 'free',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Trial eligibility reset successfully!');
      console.log('   - trialStartedAt: deleted');
      console.log('   - trialEndsAt: deleted');
      console.log('   - trialUsed: false');
      console.log('   - isPaidUser: false');
      console.log('   - subscriptionTier: free');
      console.log('');
      console.log('🧪 Test behavior:');
      console.log('   - User is now a free user (no trial, no Pro)');
      console.log('   - Should see "Start 5-Day Free Trial" button in upgrade modal');
      console.log('   - Can start a new trial');
    }

    console.log('');
    console.log('💡 Tip: Reload your app to see changes');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

manageTrial();

