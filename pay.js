// pay.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {
  doc,
  onSnapshot,
  getDoc
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// For testing use FLWPUBK_TEST... ; for live use FLWPUBK_LIVE...
// IMPORTANT: use TEST public key while you test locally and ensure functions.config has FLW test secret.
const FLW_PUBLIC_KEY = 'FLWPUBK-83ec69726b55fe4c4ea3746557c8d3b3-X'; // <-- replace with your TEST public key while testing
const VERIFY_URL = 'https://us-central1-rant2me-ab36b.cloudfunctions.net/verifyPayment';
const LOGO_URL = '';

// ─── UI helpers ───────────────────────────────────────────────────────────────
const payMsg = document.getElementById('pay-msg');
function setMsg(t) { if (payMsg) payMsg.textContent = t; else console.log('MSG:', t); }
function disableButtons(disabled) {
  document.querySelectorAll('.buy-btn').forEach(b => (b.disabled = disabled));
}

// ─── Auth state ───────────────────────────────────────────────────────────────
let currentUser = null;
onAuthStateChanged(auth, (u) => {
  currentUser = u || null;
  if (!currentUser) setMsg('Please log in first to purchase a plan.');
  else setMsg('');
});

// ─── Click handlers ───────────────────────────────────────────────────────────
document.querySelectorAll('.buy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const minutes = Number(btn.dataset.minutes);
    const amount = Number(btn.dataset.amount);
    startPayment(minutes, amount).catch((err) => {
      console.error('startPayment failed:', err);
      setMsg('Could not start payment. Please try again.');
      disableButtons(false);
    });
  });
});

// ─── Payment flow ─────────────────────────────────────────────────────────────
async function startPayment(minutes, amount) {
  if (!currentUser) {
    alert('Please login to continue.');
    window.location.href = 'index.html';
    return;
  }

  disableButtons(true);
  setMsg('Preparing checkout…');

  const sectionEl = document.querySelector('input[name="section"]:checked');
  const section = sectionEl ? sectionEl.value : 'counselling';

  // unique tx_ref
  const tx_ref = `r2m_${section}_${currentUser.uid}_${Date.now()}`;

  const planId =
    minutes === 10 ? 'test10' :
    minutes === 20 ? 'basic20' :
    minutes === 60 ? 'pro60' :
    minutes === 10080 ? 'weekly10080' :
    null;

  if (!planId) {
    setMsg('Unknown plan selected.');
    disableButtons(false);
    return;
  }

  if (typeof window.FlutterwaveCheckout !== 'function') {
    setMsg('Payment library failed to load. Check network/ad-blockers.');
    disableButtons(false);
    return;
  }

  setMsg('Opening Flutterwave checkout…');
  window.FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY,
    tx_ref,
    amount,
    currency: 'NGN',
    payment_options: 'card,banktransfer,ussd',
    customer: {
      email: currentUser.email || `${currentUser.uid}@user.rant2me`,
      name: currentUser.displayName || 'Rant2Me User'
    },
    customizations: {
      title: 'Rant2Me',
      description: `Access to ${section} chat`,
      logo: LOGO_URL
    },
    meta: {
      userId: currentUser.uid,
      section,
      minutes,
      planId
    },

    callback: async function (fwResponse) {
      console.log('Flutterwave callback payload:', fwResponse);
      try {
        setMsg('Processing payment result…');
        // Pass transaction_id so server can fallback to verify-by-id
        await finalizeOnServer({
          tx_ref,
          section,
          uid: currentUser.uid,
          transaction_id: fwResponse?.transaction_id || null,
          fwResponse
        });
      } catch (err) {
        console.error('finalizeOnServer failed:', err);
        setMsg('Could not finalize payment automatically. Watching for confirmation...');
        watchEntitlementAndRedirect({ section, uid: currentUser.uid, timeoutMs: 5 * 60_000 });
      } finally {
        disableButtons(false);
      }
    },

    onclose: function () {
      setMsg('Payment window closed.');
      disableButtons(false);
    }
  });
}

/**
 * Calls /verifyPayment and handles pending flow.
 */
async function finalizeOnServer({ tx_ref, section, uid, transaction_id = null, fwResponse = null }) {
  if (!currentUser) throw new Error('No user available');
  const idToken = await currentUser.getIdToken();

  let res;
  try {
    res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tx_ref, section, transaction_id, fwResponse })
    });
  } catch (networkErr) {
    console.error('Network error calling verify endpoint:', networkErr);
    setMsg('Network error when verifying payment. Will watch for entitlement update.');
    watchEntitlementAndRedirect({ section, uid, timeoutMs: 5 * 60_000 });
    return;
  }

  let data = {};
  try { data = await res.json(); } catch (e) { data = {}; }

  console.log('verifyPayment response:', res.status, data);

  if (res.status === 200 && data.status === 'ok') {
    setMsg('Payment verified. Access granted!');
    redirectToSection(section);
    return;
  }

  if (res.status === 202 || data.status === 'pending') {
    setMsg('Payment pending (async method). We’ll activate your access automatically once it clears…');
    watchEntitlementAndRedirect({ section, uid, timeoutMs: 10 * 60_000 });
    return;
  }

  const errText = (data && data.error) ? data.error : `Server returned ${res.status}`;
  setMsg(`Verification failed: ${errText}. If charged, note reference: ${tx_ref}. Watching for webhook...`);
  watchEntitlementAndRedirect({ section, uid, timeoutMs: 10 * 60_000 });
}

/**
 * Watch entitlements/{section}_{uid} and redirect when active.
 * Combines onSnapshot (fast) + periodic polling fallback so that expiry
 * and activation are detected even if no subsequent server writes occur.
 *
 * Usage: watchEntitlementAndRedirect({ section, uid, timeoutMs })
 * returns nothing (listener cleans up itself on success or timeout)
 */
function watchEntitlementAndRedirect({ section, uid, timeoutMs = 5 * 60_000 }) {
  const id = `${section}_${uid}`;
  const ref = doc(db, 'entitlements', id);

  setMsg('Waiting for payment confirmation...');

  // Keep last seen doc data in memory so a timer can check wall-clock expiry
  let lastData = null;
  let timedOut = false;

  // onSnapshot listener (fires immediately with current value)
  const unsubSnap = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      lastData = null;
      return;
    }
    lastData = snap.data() || {};
    // If entitlement already active and not expired, redirect immediately
    const expiresAt = lastData.expiresAt;
    const expiresMs = expiresAt && typeof expiresAt.toMillis === 'function' ? expiresAt.toMillis() : null;
    const active = lastData.status === 'active';
    if (active && (!expiresMs || expiresMs > Date.now())) {
      setMsg('Payment confirmed. Access granted!');
      try { unsubBoth(); } catch (_) {}
      redirectToSection(section);
    }
  }, (err) => {
    console.error('entitlement onSnapshot error:', err);
  });

  // Periodic poll fallback: every 3s check the doc (helps detect expiry/timeouts)
  const pollIntervalMs = 3000;
  const poll = setInterval(async () => {
    if (timedOut) return;
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        // no entitlement yet
        return;
      }
      lastData = snap.data() || {};
      const expiresAt = lastData.expiresAt;
      const expiresMs = expiresAt && typeof expiresAt.toMillis === 'function' ? expiresAt.toMillis() : null;
      const active = lastData.status === 'active';

      if (active && (!expiresMs || expiresMs > Date.now())) {
        setMsg('Payment confirmed. Access granted!');
        try { unsubBoth(); } catch (_) {}
        redirectToSection(section);
      }
    } catch (err) {
      console.error('poll getDoc error:', err);
    }
  }, pollIntervalMs);

  // Timeout fallback
  const timeout = setTimeout(() => {
    timedOut = true;
    setMsg('Still waiting for confirmation. If you were charged and access is not granted within a few minutes, contact support and provide your tx_ref.');
    // cleanup
    try { unsubBoth(); } catch (_) {}
  }, timeoutMs);

  function unsubBoth() {
    try { unsubSnap(); } catch (_) {}
    try { clearInterval(poll); } catch (_) {}
    try { clearTimeout(timeout); } catch (_) {}
  }

  // Return nothing; but we cleaned up internally on success/timeout.
  return;
}

function redirectToSection(section) {
  const target =
    section === 'counselling' ? 'chat-counselling.html' :
    section === 'nutrition'   ? 'chat-nutrition.html' :
    'chat-student.html';

  setTimeout(() => { window.location.href = target; }, 600);
}
