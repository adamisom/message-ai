# Memory

*This document contains high-priority active context that every new chat must read carefully.*

## Reverse Chronological Notes by Developer

### Tuesday 10/21

**9:30pm - Phase 0 & Phase 1 Complete ✅**

Phase 0 and Phase 1 are fully implemented and tested. Key learnings and decisions:

**Firebase Configuration:**
- **CRITICAL:** Use `firebase.config.ts` (TypeScript, not .js) for proper type safety
- React Native persistence requires special handling: `getReactNativePersistence(AsyncStorage)` must be imported via `require()` due to TypeScript module resolution issues
- Firestore cache configured with 40MB for mobile: `initializeFirestore(app, { cacheSizeBytes: 40 * 1024 * 1024 })`
- Error handling for re-initialization (try/catch with `getAuth`/`getFirestore` fallback)

**Testing & Validation:**
- Firebase connection test: Used temporary test code in `app/index.tsx` (approach from `PHASE_0_ROADBLOCKS.md` worked perfectly)
- Jest configured with `ts-jest` preset (NOT `jest-expo` - simpler for utility testing)
- Created 32 unit tests for validators (all passing)
- Validation command: `npm run validate` (lint + type-check + test)

**Project Structure:**
- **Deleted `app-example/` folder** - was causing linting errors, not needed
- `.cursorignore` updated to exclude `.env`, `node_modules/`, build artifacts

**Phase 1 Implementation:**
- Auth screens (login/register) working with full validation
- Session persistence via Zustand + AsyncStorage (survives app restarts)
- Firebase Auth properly initialized with React Native persistence
- Success screen shows user info when authenticated (placeholder for Phase 2 conversations list)
- All auth flows tested and verified in Firebase Console

**Development Workflow:**
- Clear restart needed after major config changes: `npx expo start --clear --tunnel`
- Initial bundle with `--clear` + `--tunnel` takes 30-60 seconds (normal)
- Hot reload works well after initial load

---

2:12pm troubleshooting the Expo Go app saying `There was a problem running the requested app. Unknown error: The request timed out. exp://10.145.190.21:8081`, Claude's fix worked: use the `--tunnel` flag with `npx expo start`, which tunnels using ngrok to create a publicly accessible URL. After that, the QR code to open the app in Expo Go on my iPhone worked and I got the expected page for the default Expo project, created with `npx create-expo-app@` and I'm ready to start development. Note that I installed Watchman per [the React Native docs on getting started](https://reactnative.dev/docs/set-up-your-environment). I then tested that the app updates immediately on Expo Go by changing the text of `<ThemedText` in `app/(tabs)/index.tsx` to `Hello World!` ([as the Expo Docs suggest here](https://docs.expo.dev/get-started/start-developing/)) and seeing the Hello World message on my phone.
