# Quick Setup Guide for Testing

## Step 1: Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (message-ai)
3. Click the **gear icon (⚙️)** → **Project settings**
4. Go to the **Service accounts** tab
5. Click **"Generate new private key"** button
6. Click **"Generate key"** in the confirmation dialog
7. A JSON file will download (something like `message-ai-xxxxx-firebase-adminsdk-xxxxx.json`)
8. Rename it to **`serviceAccountKey.json`**
9. Move it to **`/Users/adamisom/Desktop/message-ai/functions/`**

**⚠️ Important:** This file contains sensitive credentials! It's already in `.gitignore` so it won't be committed to git. Never share this file or commit it to version control.

## Step 2: Verify Your Users

The test script will now automatically fetch users from your Firestore `users` collection. Make sure you have at least **2-4 users** registered in your app.

To check how many users you have:
```bash
# Option 1: Check Firebase Console
# Go to Firestore → users collection → count documents

# Option 2: Run this quick check (after setting up serviceAccountKey.json)
node -e "const admin=require('firebase-admin');admin.initializeApp({credential:admin.credential.cert('./functions/serviceAccountKey.json')});admin.firestore().collection('users').get().then(s=>console.log('Total users:',s.size)).then(()=>process.exit())"
```

## Step 3: Run Test Data Population

```bash
node scripts/populateTestData.js
```

**Expected output:**
```
🚀 Starting test data population...

📥 Fetching users from Firestore...

✅ Found 4 users in Firestore:

   1. John Doe (john@example.com)
   2. Jane Smith (jane@example.com)
   3. Bob Wilson (bob@example.com)
   4. Alice Brown (alice@example.com)

📝 Creating conversation: Project Team
   Participants: John Doe, Jane Smith, Bob Wilson, Alice Brown
   ✅ Conversation created: abc123xyz...
   ✅ Created 40 messages
   ✅ Conversation ready for testing

[... more conversations ...]

🎉 Test data population complete!
```

## Step 4: Start Testing

Follow the **BACKEND_TESTING_GUIDE.md** for detailed testing instructions.

Quick start:
```bash
# Terminal 1: Start emulator
firebase emulators:start --only functions,firestore

# Terminal 2: Run unit tests
cd functions && npm test
```

---

## Troubleshooting

### Error: "ENOENT: no such file or directory, open 'serviceAccountKey.json'"

**Solution:** You haven't downloaded the service account key yet. Follow Step 1 above.

### Error: "No users found in Firestore!"

**Solution:** You need to create at least 2 users. Use your app to register some test accounts, or create them via Firebase Console → Authentication.

### Error: "Need at least 2 users for testing"

**Solution:** The script needs minimum 2 users to create conversations. Register more users in your app.

---

## What Changed (Summary)

1. ✅ **Priority schedule:** Back to every 10 minutes (was 30)
2. ✅ **Test script:** Now fetches users dynamically from Firestore (no hardcoded UIDs needed)
3. ✅ **Service account path:** Updated to `functions/serviceAccountKey.json`

**All code compiles with no errors!** 🎉

