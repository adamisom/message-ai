/**
 * Script to upgrade adam1-gmail user to Pro subscription
 * Run: node scripts/upgradeAdam1ToPro.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses serviceAccountKey.json from functions/)
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function upgradeUserToPro() {
  try {
    // Find adam1-gmail user
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'adam.r.isom@gmail.com')
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('❌ User adam.r.isom@gmail.com not found');
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('📝 Found user:', {
      uid: userId,
      email: userData.email,
      displayName: userData.displayName,
      currentTier: userData.subscriptionTier || 'free',
      isPaidUser: userData.isPaidUser || false,
    });

    // Upgrade to Pro
    const now = admin.firestore.FieldValue.serverTimestamp();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await db.collection('users').doc(userId).update({
      isPaidUser: true,
      subscriptionTier: 'pro',
      subscriptionStartedAt: now,
      subscriptionEndsAt: admin.firestore.Timestamp.fromDate(oneYearFromNow),
      updatedAt: now,
    });

    console.log('✅ Successfully upgraded adam1-gmail to Pro!');
    console.log('   - isPaidUser: true');
    console.log('   - subscriptionTier: pro');
    console.log(`   - Subscription ends: ${oneYearFromNow.toISOString()}`);
    console.log('');
    console.log('🎉 User can now create workspaces!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error upgrading user:', error);
    process.exit(1);
  }
}

upgradeUserToPro();

