import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Expand Workspace Capacity - Sub-Phase 7
 * Allow workspace admin to expand capacity mid-month with pro-rated billing
 */
export const expandWorkspaceCapacity = functions.https.onCall(async (data, context) => {
  // 1. Auth & admin check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  const { workspaceId, newMaxUsers } = data;

  if (!workspaceId || !newMaxUsers) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'workspaceId and newMaxUsers are required'
    );
  }

  const workspaceRef = db.collection('workspaces').doc(workspaceId);
  const workspaceSnap = await workspaceRef.get();

  if (!workspaceSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Workspace not found');
  }

  const workspace = workspaceSnap.data()!;

  if (workspace.adminUid !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only workspace admin can expand capacity'
    );
  }

  // 2. Calculate pro-rated charge
  const currentCapacity = workspace.maxUsersThisMonth || 0;
  const additionalSeats = newMaxUsers - currentCapacity;

  if (additionalSeats <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'New capacity must be greater than current capacity'
    );
  }

  const billingCycleStart = workspace.billingCycleStart?.toDate() || new Date();
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate() + 1;
  const proratedCharge = (additionalSeats * 0.5) * (daysRemaining / daysInMonth);

  // 3. Process payment (MVP mode: auto-succeed)
  let paymentSuccess = true;
  let paymentIntentId = `mock_${Date.now()}`;

  // TODO: In production, replace with real Stripe call
  // const paymentIntent = await stripe.paymentIntents.create({ ... });
  // paymentSuccess = paymentIntent.status === 'succeeded';

  if (!paymentSuccess) {
    // Payment failed - mark workspace as inactive
    await workspaceRef.update({
      isActive: false,
      lastPaymentFailure: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log billing event
    await db.collection(`workspaces/${workspaceId}/billingEvents`).add({
      type: 'payment_failed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      triggeredBy: context.auth.uid,
      details: {
        oldCapacity: currentCapacity,
        newCapacity: newMaxUsers,
        proratedCharge,
        errorMessage: 'Payment declined',
      },
    });

    throw new functions.https.HttpsError('aborted', 'Payment failed');
  }

  // 4. Payment succeeded - update capacity
  await workspaceRef.update({
    maxUsersThisMonth: newMaxUsers,
    currentMonthCharge: workspace.currentMonthCharge + proratedCharge,
    isActive: true,
  });

  // 5. Log billing event
  await db.collection(`workspaces/${workspaceId}/billingEvents`).add({
    type: 'expansion',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    triggeredBy: context.auth.uid,
    details: {
      oldCapacity: currentCapacity,
      newCapacity: newMaxUsers,
      proratedCharge,
      daysRemaining,
      paymentIntentId,
    },
  });

  return {
    success: true,
    newCapacity: newMaxUsers,
    chargeAmount: proratedCharge,
  };
});

