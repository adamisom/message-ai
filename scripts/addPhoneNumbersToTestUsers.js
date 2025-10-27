/**
 * Migration Script: Add Phone Numbers to Existing Test Users
 * Sub-Phase 11 (Polish): Phone number requirement
 * 
 * Adds random phone numbers to the 4 existing test users
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../functions/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Random phone numbers for test users (US format, 10 digits)
const testPhoneNumbers = [
  '5551234567', // adam1
  '5559876543', // adam2  
  '5555551212', // adam3
  '5552223333', // adam4
];

async function addPhoneNumbersToTestUsers() {
  console.log('📞 Starting phone number migration for test users...\n');

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users\n`);

    let updateCount = 0;
    const batch = db.batch();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;

      // Only update test users (adam1-4)
      if (!userEmail.startsWith('adam') || !userEmail.includes('@')) {
        continue;
      }

      // Skip if already has phone number
      if (userData.phoneNumber) {
        console.log(`✓ ${userEmail} already has phone: ${userData.phoneNumber}`);
        continue;
      }

      // Assign phone number based on email
      let phoneNumber;
      if (userEmail.includes('adam1')) phoneNumber = testPhoneNumbers[0];
      else if (userEmail.includes('adam2')) phoneNumber = testPhoneNumbers[1];
      else if (userEmail.includes('adam3')) phoneNumber = testPhoneNumbers[2];
      else if (userEmail.includes('adam4')) phoneNumber = testPhoneNumbers[3];
      else phoneNumber = '555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

      // Update user with phone number and DM privacy setting
      batch.update(userDoc.ref, {
        phoneNumber,
        dmPrivacySetting: 'private', // Default setting
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`📱 ${userEmail} → ${phoneNumber}`);
      updateCount++;
    }

    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n✅ Successfully updated ${updateCount} users with phone numbers`);
    } else {
      console.log('\n✅ All test users already have phone numbers');
    }

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
addPhoneNumbersToTestUsers()
  .then(() => {
    console.log('\n🎉 Phone number migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

