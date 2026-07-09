# NutriTrack AI Proxy — Setup (one-time, ~10 minutes)

Why: right now the shared Anthropic key is readable by every signed-in user
(DevTools → localStorage → `nt_k`). This proxy keeps the key server-side.
Once live, users' browsers never see the key at all.

The app is **already wired** for this: if `config/app` in Firestore has a
`proxyUrl` field, every AI call automatically routes through the proxy with
the user's Firebase sign-in token. No proxyUrl = current direct behaviour,
so nothing breaks in the meantime.

## Steps

### 1. Create the Worker (free tier is plenty)
1. Go to https://dash.cloudflare.com → sign up / log in (free plan is fine)
2. **Workers & Pages → Create → Worker** — name it `nutritrack-ai`
3. Click **Edit code**, delete the boilerplate, paste the contents of
   `proxy/worker.js`, then **Deploy**

### 2. Configure secrets & variables
In the worker's **Settings → Variables and Secrets** add:

| Name | Type | Value |
|---|---|---|
| `ANTHROPIC_KEY` | **Secret** | your `sk-ant-…` key |
| `FIREBASE_API_KEY` | Variable | `AIzaSyARJJxV1N9YkqCkIf7BDxUaQpoF-D_8U9U` (from firebase-config.js — this one is public, that's fine) |
| `ALLOWED_ORIGIN` | Variable | `https://adityakumar-bikes.github.io` |

Click **Deploy** again after saving.

### 3. Point the app at the proxy
Your worker URL looks like `https://nutritrack-ai.<your-subdomain>.workers.dev`.

In **Firebase Console → Firestore → config → app**, add a field:

```
proxyUrl (string) = https://nutritrack-ai.<your-subdomain>.workers.dev
```

Done. Users pick it up on their next login — no app deploy needed.

### 4. Verify
- Open the app in incognito, sign in, analyze a food → should work as before
- DevTools → Network: the request goes to `workers.dev`, not `api.anthropic.com`

### 5. Lock the vault (after confirming step 4 works)
1. **Rotate the Anthropic key** at console.anthropic.com (the old one has been
   client-visible, treat it as burned). Put the NEW key in the worker secret —
   do **not** save it in the admin panel.
2. Delete the `anthropicKey` field from `config/app` in Firestore.
3. In Firestore rules, you can now make `config/app` admin-read-only:
   ```
   match /config/{docId} {
     allow read: if isSignedIn();   // proxyUrl is harmless to expose
     allow write: if isAdmin();
   }
   ```
   (unchanged — but the sensitive key no longer lives there)

## What the worker enforces
- Only signed-in Firebase users of *your* project (token verified server-side)
- Only the two models the app uses (nobody can run expensive models on your key)
- max_tokens capped at 2000 per request
- CORS locked to your GitHub Pages origin

## Optional next steps
- Per-user daily budget: bind a KV namespace and count requests per uid/day
- Also gate on approval: have the worker read the user's Firestore doc and
  reject `approved: false` accounts
