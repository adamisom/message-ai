import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase.config';

export const setUserOnline = async (uid: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      isOnline: true,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });  // CRITICAL: merge to avoid overwriting existing fields
    console.log('🟢 [presenceService] User set online:', uid);
  } catch (error) {
    console.error('❌ [presenceService] Error setting user online:', error);
  }
};

export const setUserOffline = async (uid: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      isOnline: false,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });  // CRITICAL: merge to avoid overwriting existing fields
    console.log('⚫ [presenceService] User set offline:', uid);
  } catch (error) {
    console.error('❌ [presenceService] Error setting user offline:', error);
  }
};

