'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const corsLib = require('cors');

admin.initializeApp();
const db = admin.firestore();

// ── CONFIG ────────────────────────────────────────────────────────────────────
const REGION = process.env.FUNCTIONS_REGION || 'us-central1';

// Use functions config keys:
//   firebase functions:config:set flw.secret="FLW_SECRET_KEY" flw.hash="WEBHOOK_SECRET_HASH"
const FLW_SECRET =
  (functions.config && functions.config().flw && functions.config().flw.secret) || null;
const FLW_HASH =
  (functions.config && functions.config().flw && functions.config().flw.hash) || null;

const cors = corsLib({ origin: true });

// ── PLANS (server-side source of truth) ───────────────────────────────────────
const PLANS = {
  // TEST plan (delete later)
  test10:      { minutes: 10,    amount: 100,   currency: 'NGN' },

  basic20:     { minutes: 20,    amount: 1000,  currency: 'NGN' },
  pro60:       { minutes: 60,    amount: 2500,  currency: 'NGN' },
  weekly10080: { minutes: 10080, amount: 10000, currency: 'NGN' }
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
function minutesToMs(m) { return Number(m) * 60 * 1000; }
function nowMs()        { return Date.now(); }
function entitlementId(section, uid) { return `${section}_${uid}`; }

/**
 * Idempotently grant/extend entitlement & record payment
 */
async function grantEntitlement({ userId, section, planId, txRef, amount, currency, flwId, raw }) {
  const payRef = db.doc(`payments/${txRef}`);
  const paySnap = await payRef.get();

  // already processed?
  if (paySnap.exists && paySnap.get('status') === 'processed') {
    return { status: 'ok', reason: 'already-processed' };
  }

  const plan = PLANS[planId];
  if (!plan) throw new functions.https.HttpsError('invalid-argument', 'Unknown planId.');

  // enforce amount/currency
  if (Number(amount) < Number(plan.amount) || String(currency).toUpperCase() !== plan.currency) {
    throw new functions.https.HttpsError('failed-precondition', 'Amount/currency mismatch.');
  }

  const entRef = db.doc(`entitlements/${entitlementId(section, userId)}`);

  await db.runTransaction(async (t) => {
    const entSnap = await t.get(entRef);

    const addMs = minutesToMs(plan.minutes);
    let baseMs = nowMs();

    if (entSnap.exists) {
      const ex = entSnap.get('expiresAt');
      const currentMs = (ex && typeof ex.toMillis === 'function') ? ex.toMillis()
                      : (typeof ex === 'number' ? ex : null);
      if (currentMs && currentMs > baseMs) baseMs = currentMs;
    }

    const newExpiry = admin.firestore.Timestamp.fromMillis(baseMs + addMs);

    t.set(entRef, {
      userId,
      section,
      status: 'active',
      expiresAt: newExpiry,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastPaymentRef: txRef
    }, { merge: true });

    t.set(payRef, {
      txRef,
      flwId: flwId || null,
      userId,
      section,
      planId,
      amount: Number(amount),
      currency: String(currency).toUpperCase(),
      status: 'processed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: raw ? { id: raw.id || null, status: raw.status || null } : null
    }, { merge: true });
  });

  return { status: 'ok' };
}

// ── FLW helpers ───────────────────────────────────────────────────────────────
async function flwVerifyByReference(txRef) {
  if (!FLW_SECRET) {
    throw new functions.https.HttpsError('failed-precondition', 'Flutterwave secret not configured.');
  }
  if (typeof fetch !== 'function') {
    throw new functions.https.HttpsError('failed-precondition', 'Global fetch not available in this runtime.');
  }

  const url = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${FLW_SECRET}` }
  });

  const text = await resp.text();
  // Parse JSON if possible
  try {
    const data = JSON.parse(text);
    if (!resp.ok) {
      // bubble error to caller with the body for better debugging
      const err = new functions.https.HttpsError('internal', `FLW verify HTTP ${resp.status}: ${text}`);
      err._raw = data;
      throw err;
    }
    return data;
  } catch (e) {
    // non-json response? still throw for visibility
    if (!resp.ok) {
      throw new functions.https.HttpsError('internal', `FLW verify HTTP ${resp.status}: ${text}`);
    }
    return text;
  }
}

async function flwVerifyById(txId) {
  // fallback: verify using transaction id
  if (!FLW_SECRET) {
    throw new functions.https.HttpsError('failed-precondition', 'Flutterwave secret not configured.');
  }
  if (typeof fetch !== 'function') {
    throw new functions.https.HttpsError('failed-precondition', 'Global fetch not available in this runtime.');
  }

  const url = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(txId)}/verify`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${FLW_SECRET}` }
  });

  const text = await resp.text();
  try {
    const data = JSON.parse(text);
    if (!resp.ok) {
      const err = new functions.https.HttpsError('internal', `FLW verify-by-id HTTP ${resp.status}: ${text}`);
      err._raw = data;
      throw err;
    }
    return data;
  } catch (e) {
    if (!resp.ok) throw new functions.https.HttpsError('internal', `FLW verify-by-id HTTP ${resp.status}: ${text}`);
    return text;
  }
}

function validateWebhook(req) {
  const sig = req.get('verif-hash');
  if (!FLW_HASH || !sig || sig !== FLW_HASH) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid Flutterwave webhook signature.');
  }
}

// ── CLIENT ENDPOINT: /verifyPayment ──────────────────────────────────────────
// Client calls this after checkout. We try verify_by_reference and fall back to verify-by-id.
// The client may include `transaction_id` (fwResponse.transaction_id) to help fallback.
exports.verifyPayment = functions.region(REGION).https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method === 'OPTIONS') return res.status(204).send('');
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      const authHeader = req.get('Authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Missing Authorization' });

      const decoded = await admin.auth().verifyIdToken(token).catch(() => null);
      if (!decoded || !decoded.uid) return res.status(401).json({ error: 'Invalid Auth token' });

      const body = req.body || {};
      const txRef = body.tx_ref || body.tx_ref?.toString();
      const section = body.section;
      const clientTxId = body.transaction_id || (body.fwResponse && body.fwResponse.transaction_id) || null;

      if (!txRef || !section) return res.status(400).json({ error: 'tx_ref and section are required' });

      // First attempt: verify by reference
      let verify;
      try {
        verify = await flwVerifyByReference(txRef);
      } catch (err) {
        // If FLW responds "No transaction was found for this id" (or similar),
        // treat it as pending instead of a fatal error. We'll try fallback below.
        const msg = err && err.message ? err.message : String(err);
        // Try fallback verify by tx id if client provided it
        if (clientTxId) {
          try {
            verify = await flwVerifyById(clientTxId);
          } catch (err2) {
            // both attempts failed — log and return pending
            console.error('Both verify_by_reference and verify_by_id failed:', msg, err2 && err2.message);
            return res.status(202).json({ status: 'pending', error: `verify_by_reference failed: ${msg}` });
          }
        } else {
          console.warn('verify_by_reference failed and no transaction_id provided. Msg:', msg);
          return res.status(202).json({ status: 'pending', error: `verify_by_reference failed: ${msg}` });
        }
      }

      const tx = verify && verify.data;
      if (!tx || tx.status !== 'successful') {
        // Not successful yet (bank transfer/USSD can be async)
        return res.status(202).json({ status: 'pending', detail: 'Not successful yet.' , debug: verify });
      }

      const meta = tx.meta || {};
      const userId = meta.userId;
      const planId = meta.planId;
      const minutes = Number(meta.minutes);

      if (!userId || userId !== decoded.uid) return res.status(403).json({ error: 'User mismatch' });
      if (section !== meta.section) return res.status(400).json({ error: 'Section mismatch' });
      if (!PLANS[planId] || !minutes) return res.status(400).json({ error: 'Unknown plan metadata' });

      // Grant entitlement (idempotent)
      await grantEntitlement({
        userId,
        section,
        planId,
        txRef,
        amount: tx.amount,
        currency: tx.currency,
        flwId: tx.id,
        raw: { id: tx.id, status: tx.status }
      });

      return res.status(200).json({ status: 'ok' });

    } catch (e) {
      console.error('verifyPayment error:', e);
      const code =
        (e && e.code === 'functions/invalid-argument') ? 400 :
        (e && e.code === 'functions/permission-denied') ? 401 :
        (e && e.code === 'functions/failed-precondition') ? 412 : 500;
      return res.status(code).json({ error: (e && e.message) || 'Server error' });
    }
  });
});

// ── WEBHOOK: /flwWebhook (Flutterwave → your server) ─────────────────────────
exports.flwWebhook = functions.region(REGION).https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method not allowed');

      // Verify secret header matches what you configured in FW dashboard and functions config
      validateWebhook(req);

      const evt = req.body;
      const tx = evt && evt.data;

      if (!tx || tx.status !== 'successful') {
        // ignore non-successful events
        return res.status(200).send('ignored');
      }

      const meta = tx.meta || {};
      const userId = meta.userId;
      const planId = meta.planId;
      const section = meta.section;

      if (!userId || !planId || !section) {
        // Missing metadata
        return res.status(200).send('missing-meta');
      }

      await grantEntitlement({
        userId,
        section,
        planId,
        txRef: tx.tx_ref || tx.flw_ref || `flw_${tx.id}`,
        amount: tx.amount,
        currency: tx.currency,
        flwId: tx.id,
        raw: { id: tx.id, status: tx.status }
      });

      return res.status(200).send('ok');
    } catch (e) {
      console.error('flwWebhook error:', e);
      if (e && e.code === 'functions/permission-denied') return res.status(401).send('bad-signature');
      return res.status(200).send('error-logged');
    }
  });
});
