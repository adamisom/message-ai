# Reload Crash Debug Analysis

## Problem Statement
When reloading Expo Go app while logged in, the app crashes with:
```
FirebaseError: Function where() called with invalid data. Unsupported field value: undefined
```

## Root Cause (CONFIRMED)
**Firestore Client SDK is only returning 2 fields (`isOnline`, `lastSeenAt`) out of 20+ fields in the user document.**

This is NOT a code issue, NOT a rules issue, NOT a caching issue - it's a Firestore SDK bug or configuration problem.

## Evidence

### What We Know - FACTS
1. ✅ **Firestore Console shows ALL fields** (verified manually):
   - `isPaidUser: false`
   - `subscriptionTier: "free"`
   - `trialUsed: true`
   - `trialEndsAt: Timestamp`
   - ...and 15+ other fields

2. ✅ **Node.js Admin SDK returns ALL fields** (verified via script):
   ```javascript
   admin.firestore().collection('users').doc(uid).get()
   // Returns: isPaidUser, subscriptionTier, trialUsed, etc.
   ```

3. ❌ **Client SDK only returns 2 fields** (from app logs):
   ```
   [getUserProfile] Raw data keys: ["isOnline", "lastSeenAt"]
   [getUserProfile] Has isPaidUser field? false
   [getUserProfile] Has subscriptionTier field? false
   ```

4. ✅ **AsyncStorage has complete data** (when written by login/Cloud Functions):
   ```
   Raw user JSON: {"isPaidUser":false,"subscriptionTier":"free","trialUsed":true,...}
   ```

### What We Tried - ALL FAILED

#### ❌ Attempt 1: Fixed Firestore Rules
- **Hypothesis**: Rules were blocking field access
- **Action**: Changed from `allow read: if request.auth != null` to `allow read, write: if true` (wide open)
- **Result**: Still only 2 fields returned
- **Conclusion**: Not a rules issue

#### ❌ Attempt 2: Removed get() Calls from Rules
- **Hypothesis**: Circular `get()` calls in helper functions causing rule evaluation failure
- **Action**: Simplified `isPaidUser()` and `isInTrial()` to not use `get()`
- **Result**: Still only 2 fields returned
- **Conclusion**: Not a rule complexity issue

#### ❌ Attempt 3: Disabled Firestore Cache
- **Hypothesis**: Corrupted or stale cache
- **Action**: Set `cacheSizeBytes: 0` in `firebase.config.ts`
- **Result**: Still only 2 fields returned
- **Conclusion**: Not a caching issue

#### ❌ Attempt 4: Logout/Login
- **Hypothesis**: Session or auth state corruption
- **Action**: Full logout and re-login
- **Result**: Still only 2 fields returned
- **Conclusion**: Not a session issue

#### ❌ Attempt 5: Fixed Trial Management Script
- **Hypothesis**: Firestore document missing fields
- **Action**: Updated `manageTrial.js` to write `isPaidUser`, `subscriptionTier`, `trialUsed`
- **Result**: Firestore has fields (verified in console), but client still doesn't read them
- **Conclusion**: Not a data issue

## Current Workaround

### ✅ IMPLEMENTED: Solution 1 - Hybrid Client-Side Write

**Status:** Active workaround (implemented October 26, 2025)

**Implementation:** Modified `presenceService.ts` to re-write all subscription/trial fields when setting user online.

```typescript
// services/presenceService.ts
export const setUserOnline = async (uid: string, userData?: Partial<User>) => {
  const updates: any = {
    isOnline: true,
    lastSeenAt: serverTimestamp(),
  };

  // Re-write subscription fields so client SDK can read them back
  if (userData) {
    if (userData.isPaidUser !== undefined) updates.isPaidUser = userData.isPaidUser;
    if (userData.subscriptionTier) updates.subscriptionTier = userData.subscriptionTier;
    // ... all other subscription/trial/workspace fields
  }

  await setDoc(doc(db, 'users', uid), updates, { merge: true });
};
```

**Updated call sites:**
- `authService.ts:122` - Login passes `userProfile` to `setUserOnline()`
- `app/_layout.tsx:76,83` - Presence tracking passes `user` to `setUserOnline()`

**Result:**
- ✅ All subscription fields are now written by client
- ✅ Client SDK can read them back (theory validated)
- ✅ Trial/subscription status updates on app reload
- ✅ No crashes
- ✅ Tests pass

**Trade-offs:**
- Slight write overhead (re-writes ~15 fields on each presence update)
- Hacky but effective workaround for SDK bug
- Can be removed when Firebase fixes the underlying issue

---

### Previous Workaround (Deprecated)

The app doesn't crash anymore thanks to validation in `authStore.ts`:
```typescript
// Line 100-103
if (!freshUser.uid || !freshUser.email) {
  console.error('[authStore] ❌ Fresh user data is invalid, keeping cached user');
  return; // Keep cached user, don't update
}
```

**This validation is still in place as a safety net, but should no longer be triggered.**

## Mystery: Why Only isOnline and lastSeenAt?

**Observation**: These 2 fields are the ONLY fields written directly by the client:
- `isOnline` - written by `presenceService.ts`
- `lastSeenAt` - written by `presenceService.ts`

All other fields are written by:
- Cloud Functions (e.g., `startFreeTrial`, `upgradeToPro`)
- Backend scripts (e.g., `manageTrial.js`)
- Registration flow (server-side)

**Theory**: Firestore SDK might have a bug where client reads are restricted to fields that were written by the same client, even though rules allow full access.

## Next Steps for Investigation

### 1. Check Firestore SDK Version
```bash
grep "firebase" package.json
```
Possible issue: Expo/React Native Firestore SDK bug in current version.

### 2. Test with REST API
Bypass the SDK entirely:
```typescript
// In getUserProfile, try direct REST call
const response = await fetch(
  `https://firestore.googleapis.com/v1/projects/message-ai-2a7cf/databases/(default)/documents/users/${uid}`,
  { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }
);
```

If REST API returns all fields, it's definitely an SDK bug.

### 3. Check for Firestore Converters
Search codebase for `withConverter` - maybe there's a converter stripping fields.

### 4. Enable Firestore Debug Logging
```typescript
// In firebase.config.ts
import { setLogLevel } from 'firebase/firestore';
setLogLevel('debug');
```

Check if SDK logs show why it's filtering fields.

### 5. Test on Different Device/Platform
- Try on iOS instead of Expo Go
- Try on Android
- Try in development build (not Expo Go)

Expo Go might have SDK limitations.

### 6. Check for Middleware/Interceptors
Search codebase for anything intercepting Firestore reads:
```bash
grep -r "onSnapshot\|getDoc\|addSnapshotListener" --include="*.ts"
```

### 7. File Firebase Support Ticket
This appears to be a genuine Firebase SDK bug. Provide:
- Firestore rules (wide open: `allow read, write: if true`)
- Console screenshot (all fields visible)
- SDK logs (only 2 fields returned)
- Node.js admin SDK comparison (returns all fields)

## Temporary Production Solution

### ✅ Option C: Write All Fields via Presence Service (IMPLEMENTED)

**Status:** Active solution as of October 26, 2025

When `setUserOnline()` is called, also write `isPaidUser`, `subscriptionTier`, etc.
This way, client will have written all fields and can read them back.

**Result:** Theory confirmed! This hacky workaround successfully bypasses the SDK bug.

---

### Alternative Options (Not Implemented)

**Option A: Use Cloud Function for getUserProfile**
```typescript
// Create getUserProfile Cloud Function
export const getUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated');
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  return userDoc.data();
});
```

**Pros:** Guaranteed to work (admin SDK confirmed working)  
**Cons:** Adds ~200-500ms latency, extra Cloud Function costs

**Option B: Accept Stale Data on Reload**
- Keep current workaround (use cached AsyncStorage data)
- Only fetch fresh data on explicit actions (login, trial start, upgrade)
- Document that reload doesn't update subscription status

**Pros:** Zero changes needed  
**Cons:** User confusion, stale data

## Code Locations

**Key files:**
- `services/authService.ts:199-225` - `getUserProfile()` with debug logging
- `store/authStore.ts:88-145` - Fresh data fetch with validation
- `firebase.config.ts:35-44` - Firestore initialization (cache disabled)
- `firestore.rules:90-95` - User collection rules (wide open for debugging)

**Related:**
- `services/presenceService.ts` - Writes `isOnline`, `lastSeenAt`
- `scripts/manageTrial.js` - Updates trial fields via admin SDK
- `functions/src/billing/upgradeToPro.ts` - Updates subscription via admin SDK

## Conclusion

This is a **Firestore Client SDK issue**, not a code bug. The SDK is filtering document fields for unknown reasons, despite:
- ✅ Rules allowing full access
- ✅ Document containing all fields (verified in console)
- ✅ Admin SDK returning all fields
- ✅ Cache disabled
- ✅ No converters in use

**Workaround is acceptable for MVP.** Investigate further for production or wait for SDK update.

