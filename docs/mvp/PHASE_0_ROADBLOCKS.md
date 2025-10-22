# Phase 0: Roadblocks & Solutions

**✅ VERIFIED: Phase 0 completed successfully**

Quick reference for common Phase 0 issues and their solutions.

---

## Critical Issues

### Firebase Test Script (CRITICAL - FIXED)

**Problem:** Node.js test script fails with ES6 import error.

**Solution:** Test Firebase directly in `app/index.tsx` instead:

```typescript
// Add to app/index.tsx temporarily
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.config';

const testFirebase = async () => {
  try {
    const docRef = await addDoc(collection(db, 'test'), {
      message: 'Hello from MessageAI',
      timestamp: serverTimestamp(),
    });
    console.log('✅ Firebase working! Doc ID:', docRef.id);
  } catch (err) {
    console.error('❌ Firebase test failed:', err);
  }
};
```

Run `npx expo start`, check console for success, verify document in Firebase Console, then delete test code.

### app-example/ Folder (RESOLVED)

**Problem:** Sample code causes confusion/linter errors.

**Solution:** `rm -rf app-example/` (already done in Phase 1)

### TypeScript Config

**Problem:** May not recognize new folders.

**Check:** Run `npx tsc --noEmit` - should pass with no errors.

---

## Medium Priority

### Firebase Test Mode Security

- Test mode allows public read/write (needed for MVP)
- Don't share credentials publicly
- Proper rules added in Phase 7

### First Hot Reload Slow

- Normal: Metro bundles Firebase SDK (~1MB)
- Subsequent reloads are fast
- If persistent: `npx expo start --clear`

### Expo Go Limitations

- Background push notifications won't work (Phase 6 uses local notifications instead)
- Production needs EAS Build (post-MVP)

---

## Minor Issues

### .env Hidden
`ls -la | grep .env` to verify it exists

### Firebase "Public Rules" Warning
Intentional for MVP - ignore

### Emulator Performance
- Allocate 4GB+ RAM in AVD Manager
- Enable GPU acceleration
- Or use physical device (faster)

---

## Emergency Troubleshooting

### Complete Reset
```bash
cp .env .env.backup
rm -rf node_modules .expo package-lock.json
npm install
mv .env.backup .env
npx expo start --clear
```

### Common Errors

| Error | Fix |
|-------|-----|
| "Cannot resolve 'firebase'" | `npm install firebase` |
| "Permission denied" | Check Firestore rules = test mode |
| "Undefined is not an object" | Restart Expo, verify EXPO_PUBLIC_ prefix |
| "Metro bundler failed" | `npx expo start --clear` |

---

## Pre-Phase 1 Checklist

**Critical:**
- [ ] Firebase test passes in app
- [ ] `npx tsc --noEmit` passes
- [ ] App runs on emulator
- [ ] Hot reload works

**Recommended:**
- [ ] app-example/ removed
- [ ] .env file visible and correct
- [ ] Test document verified in Firebase Console

---

**Phase 0: ~1.5-2 hours with these fixes**
