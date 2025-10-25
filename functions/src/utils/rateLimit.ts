import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Lazy initialization to avoid breaking tests
function getDb() {
  return admin.firestore();
}

const config = functions.config();

const HOURLY_LIMIT = parseInt(config.ai?.hourly_limit || '50');
const MONTHLY_LIMIT = parseInt(config.ai?.monthly_limit || '1000');

export async function checkAIRateLimit(
  userId: string,
  feature: string
): Promise<boolean> {
  const db = getDb();
  const month = new Date().toISOString().slice(0, 7);
  const usageRef = db.doc(`users/${userId}/ai_usage/${month}`);

  return await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    if (!usageDoc.exists) {
      transaction.set(usageRef, {
        month,
        totalActions: 1,
        [`${feature}Calls`]: 1,
        actionsThisHour: 1,
        hourStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    }

    const data = usageDoc.data()!;
    const hourlyActions =
      (data.hourStartedAt?.toMillis() < oneHourAgo)
        ? 0
        : data.actionsThisHour || 0;

    // Check limits
    if (hourlyActions >= HOURLY_LIMIT) {
      return false;
    }

    if ((data.totalActions || 0) >= MONTHLY_LIMIT) {
      return false;
    }

    // Increment counters
    transaction.update(usageRef, {
      totalActions: admin.firestore.FieldValue.increment(1),
      [`${feature}Calls`]: admin.firestore.FieldValue.increment(1),
      actionsThisHour:
        hourlyActions >= HOURLY_LIMIT ||
        data.hourStartedAt?.toMillis() < oneHourAgo
          ? 1
          : admin.firestore.FieldValue.increment(1),
      hourStartedAt:
        data.hourStartedAt?.toMillis() < oneHourAgo
          ? admin.firestore.FieldValue.serverTimestamp()
          : data.hourStartedAt,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  });
}

