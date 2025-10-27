/**
 * Phase 4: Upgrade to Pro Cloud Function
 * MVP: Instant upgrade with dummy payment (no real Stripe integration)
 * 
 * In production, this would:
 * 1. Create Stripe customer
 * 2. Process payment with Stripe
 * 3. Create subscription
 * 4. Handle webhooks
 * 
 * MVP: Instant upgrade for testing
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { calculateSubscriptionEndDate } from '../utils/subscriptionHelpers';

const db = admin.firestore();

/**
 * Start free trial for user
 * Grants 5-day trial with full Pro access
 */
export const startFreeTrial = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  console.log(`🔍 Starting trial for user: ${userId}`);

  try {
    // 2. Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    console.log(`📄 User doc exists: ${userDoc.exists}`);

    if (!userDoc.exists) {
      console.error(`❌ User not found: ${userId}`);
      throw new functions.https.HttpsError('not-found', `User document not found for UID: ${userId}`);
    }

    const user = userDoc.data()!;
    console.log(`👤 User data:`, {
      email: user.email,
      isPaidUser: user.isPaidUser,
      trialUsed: user.trialUsed,
      trialEndsAt: user.trialEndsAt,
    });

    // 3. Check if already used trial
    if (user.trialUsed === true) {
      throw new functions.https.HttpsError('failed-precondition', 'Trial already used');
    }

    // 4. Check if already Pro
    if (user.isPaidUser === true) {
      throw new functions.https.HttpsError('failed-precondition', 'Already a Pro subscriber');
    }

    // 5. Check if already in trial
    if (user.trialEndsAt) {
      const now = Date.now();
      const trialEndsAt = user.trialEndsAt.toMillis();
      if (now < trialEndsAt) {
        throw new functions.https.HttpsError('failed-precondition', 'Already in active trial');
      }
    }

    // 6. Start trial
    const now = admin.firestore.FieldValue.serverTimestamp();
    const trialEndDate = new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)); // 5 days from now

    await userRef.update({
      trialStartedAt: now,
      trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndDate),
      trialUsed: true,
      updatedAt: now,
    });

    console.log(`✅ User ${userId} started 5-day trial`);

    return {
      success: true,
      message: 'Trial started successfully!',
      trialEndsAt: trialEndDate.toISOString(),
      daysRemaining: 5,
    };

  } catch (error: any) {
    console.error('Error starting trial:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to start trial');
  }
});

/**
 * Upgrade user to Pro subscription
 * MVP: Instant upgrade (dummy payment)
 */
export const upgradeToPro = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    // 2. Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const user = userDoc.data()!;

    // 3. Check if already Pro
    if (user.isPaidUser) {
      return {
        success: true,
        message: 'Already a Pro subscriber',
        alreadyPro: true,
      };
    }

    // 4. MVP: Instant upgrade (no payment processing)
    // In production: Stripe.customers.create(), Stripe.subscriptions.create()
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    const subscriptionEndsAt = calculateSubscriptionEndDate(); // Use tested helper

    await userRef.update({
      isPaidUser: true,
      subscriptionTier: 'pro',
      subscriptionStartedAt: now,
      subscriptionEndsAt: admin.firestore.Timestamp.fromDate(subscriptionEndsAt),
      // MVP: Dummy Stripe IDs
      stripeCustomerId: `cus_mvp_${userId.substring(0, 10)}`,
      stripeSubscriptionId: `sub_mvp_${Date.now()}`,
      updatedAt: now,
    });

    console.log(`✅ User ${userId} upgraded to Pro (MVP mode)`);

    return {
      success: true,
      message: 'Successfully upgraded to Pro!',
      subscriptionEndsAt: subscriptionEndsAt.toISOString(),
    };

  } catch (error: any) {
    console.error('Error upgrading to Pro:', error);
    throw new functions.https.HttpsError('internal', `Failed to upgrade: ${error.message}`);
  }
});

/**
 * Downgrade user from Pro to Free
 * MVP: Instant downgrade (for testing)
 */
export const downgradeToFree = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    // 2. Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const user = userDoc.data()!;

    // 3. Check if currently Pro
    if (!user.isPaidUser) {
      return {
        success: true,
        message: 'Already on free tier',
        alreadyFree: true,
      };
    }

    // 4. MVP: Instant downgrade
    // In production: Stripe.subscriptions.cancel()
    
    const now = admin.firestore.FieldValue.serverTimestamp();

    await userRef.update({
      isPaidUser: false,
      subscriptionTier: 'free',
      subscriptionEndedAt: now,
      updatedAt: now,
    });

    console.log(`✅ User ${userId} downgraded to Free (MVP mode)`);

    return {
      success: true,
      message: 'Successfully downgraded to Free',
    };

  } catch (error: any) {
    console.error('Error downgrading to Free:', error);
    throw new functions.https.HttpsError('internal', `Failed to downgrade: ${error.message}`);
  }
});

