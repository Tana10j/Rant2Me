import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Admin SDK lookup by email requires server privileges.
// We'll call a HTTPS Callable Cloud Function to resolve email->uid securely.

import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";
const functions = getFunctions();

const resolveUserByEmail = httpsCallable(functions, 'resolveUserByEmail'); // implemented in Functions below

const emailEl = document.getElementById('email');
const msgEl = document.getElementById('beta-msg');
const btn = document.getElementById('grantBtn');

let isAdmin = false;

onAuthStateChanged(auth, async (u) => {
  if (!u) { window.location.href = "index.html"; return; }
  // rely on custom claims; token refresh may be needed
  await u.getIdToken(true);
  const token = await u.getIdTokenResult();
  isAdmin = !!token.claims.admin || ["tana10j@gmail.com","edukdorcas@gmail.com","chideraumezurike13@gmail.com"].includes(u.email);
  if (!isAdmin) {
    alert("Admins only.");
    window.location.href = "home.html";
  }
});

btn.addEventListener('click', async () => {
  const email = (emailEl.value || "").trim().toLowerCase();
  const c = document.getElementById('chkCounselling').checked;
  const n = document.getElementById('chkNutrition').checked;
  const s = document.getElementById('chkStudent').checked;

  if (!email) { msgEl.textContent = "Enter a user email."; return; }
  if (!c && !n && !s) { msgEl.textContent = "Select at least one section."; return; }

  try {
    msgEl.textContent = "Looking up user…";
    const result = await resolveUserByEmail({ email });
    const uid = result.data && result.data.uid;
    if (!uid) { msgEl.textContent = "User not found. Ask them to sign up first."; return; }

    await setDoc(doc(db, "beta_access", uid), {
      counselling: c,
      nutrition: n,
      student: s
    }, { merge: true });

    msgEl.textContent = "Beta access updated successfully.";
  } catch (e) {
    console.error(e);
    msgEl.textContent = "Failed to update beta access.";
  }
});
