/**
 * NutriTrack AI Proxy — Cloudflare Worker
 *
 * Holds the Anthropic API key server-side. The PWA sends requests here
 * with a Firebase ID token; the worker verifies the token belongs to a
 * signed-in NutriTrack user, then forwards the payload to Anthropic.
 *
 * Secrets / vars to configure (see proxy/SETUP.md):
 *   ANTHROPIC_KEY   (secret)  — your sk-ant-… key
 *   FIREBASE_API_KEY (var)    — the public web API key from firebase-config.js
 *   ALLOWED_ORIGIN   (var)    — https://adityakumar-bikes.github.io
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Models the client may request — keeps a leaked token from running Opus bills
const ALLOWED_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6'
];

const MAX_TOKENS_CAP = 2000;

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) }
  });
}

async function verifyFirebaseToken(idToken, env) {
  // Server-side validation via Google Identity Toolkit — no JWT crypto needed.
  // Returns the user record if the token is valid and unexpired.
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return (data.users && data.users[0]) || null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) });
    }
    if (request.method !== 'POST') {
      return json({ error: { message: 'POST only' } }, 405, env);
    }

    // 1. Auth: require a valid Firebase ID token
    const auth = request.headers.get('Authorization') || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!idToken) {
      return json({ error: { message: 'Missing Authorization header' } }, 401, env);
    }
    const user = await verifyFirebaseToken(idToken, env);
    if (!user) {
      return json({ error: { message: 'Invalid or expired session — please sign in again' } }, 401, env);
    }

    // 2. Payload guardrails
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return json({ error: { message: 'Invalid JSON body' } }, 400, env);
    }
    if (!ALLOWED_MODELS.includes(payload.model)) {
      return json({ error: { message: 'Model not allowed' } }, 400, env);
    }
    if (!payload.max_tokens || payload.max_tokens > MAX_TOKENS_CAP) {
      payload.max_tokens = Math.min(payload.max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP);
    }

    // 3. Forward to Anthropic with the server-held key
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors(env) }
    });
  }
};
