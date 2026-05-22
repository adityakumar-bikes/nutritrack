# NutriTrack — Firebase + GitHub Pages Setup Guide

Quick setup. ~15 minutes total.

---

## Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `nutritrack` → Continue
3. Disable Google Analytics (not needed) → **Create project**

---

## Step 2 — Enable Google Sign-In

1. In the Firebase console → **Authentication** → **Get started**
2. Click **Google** under Sign-in providers → **Enable** → Save
3. Make sure your support email is set

---

## Step 3 — Create Firestore Database

1. Firebase console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → Next
3. Pick a region (e.g. `asia-south1` for India) → **Enable**

### Paste these Security Rules

In Firestore → **Rules** tab, replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: read/write own doc; admins can read/write all
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // App config (API key): only admins can read/write
    match /config/app {
      allow read:  if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.approved == true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

Click **Publish**.

---

## Step 4 — Register a Web App & Get Config

1. Firebase console → **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → click **</>** (Web)
3. Name it `NutriTrack Web` → **Register app**
4. Copy the `firebaseConfig` object — it looks like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "nutritrack-xxxx.firebaseapp.com",
  projectId: "nutritrack-xxxx",
  storageBucket: "nutritrack-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc"
};
```

5. Open `firebase-config.js` in this folder and paste your values into `FIREBASE_CONFIG`

---

## Step 5 — Authorize Your GitHub Pages Domain

1. Firebase console → **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Enter: `yourusername.github.io`  ← replace with your actual GitHub username
4. Click **Add**

This allows Google Sign-In to work from your GitHub Pages URL.

---

## Step 6 — Push to GitHub

```bash
# In your Nutrition folder:
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/nutritrack.git
git push -u origin main
```

---

## Step 7 — Enable GitHub Pages

1. Go to your GitHub repo → **Settings** → **Pages**
2. Under **Build and deployment** → Source → **GitHub Actions**
3. The deploy workflow runs automatically on every push to `main`
4. Your app will be live at: `https://YOURUSERNAME.github.io/nutritrack/`

---

## Step 8 — Set the Anthropic API Key (Admin Only)

1. Open your live app and sign in with `aditya.kumar@girnarsoft.com`
   - You are auto-approved as admin on first sign-in
2. Tap the **🛡️ Admin** tab
3. Paste your Anthropic API key (`sk-ant-...`) in the **API Key** field → **Save**
4. The key is now live for all approved users — they never see it

---

## Adding Users

1. User visits your app URL and clicks **Continue with Google**
2. They land on the **Awaiting Approval** screen
3. You go to **Admin → Pending Requests** → tap **✓ Approve**
4. They can now use the app immediately

To make someone an admin: **Admin → All Users → Make Admin**

---

## Updating the App

Just push to `main`. GitHub Actions redeploys in ~30 seconds.

```bash
git add .
git commit -m "Update"
git push
```

Users get the new version automatically on next load (service worker updates silently).

---

## Costs

- **Firebase Spark (free) plan** covers:
  - 10,000 auth sign-ins/month
  - 1 GB Firestore storage
  - 50,000 Firestore reads/day, 20,000 writes/day
  - More than enough for a team tool
- **Anthropic API**: you pay per use (food analysis calls) — roughly ₹0.01–₹0.05 per query on Haiku
- **GitHub Pages**: free
