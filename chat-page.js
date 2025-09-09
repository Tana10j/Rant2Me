// chat-page.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let currentUser = null;
let userRole = "user";
let userEmail = "";
let listenersBound = false; // avoid double-binding after auth state changes

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      const tokenResult = await user.getIdTokenResult(true);
      userRole = tokenResult.claims.role || "user";
      userEmail = user.email || "";
      console.log("Logged in as", userEmail, "role:", userRole);
    } catch (err) {
      console.error("Error getting claims:", err);
      userRole = "user";
      userEmail = user.email || "";
    }
  } else {
    currentUser = null;
    userRole = "user";
    userEmail = "";
    console.log("No user logged in");
  }
  if (!listenersBound) {
    attachServiceClicks();
    listenersBound = true;
  }
});

// IMPORTANT: Your rules expect entitlementId = "<section>_<uid>"
async function hasEntitlement(uid, section) {
  try {
    const entRef = doc(db, "entitlements", `${section}_${uid}`);
    const entSnap = await getDoc(entRef);
    if (!entSnap.exists()) return false;
    const d = entSnap.data();
    return d.status === "active" &&
           d.expiresAt &&
           typeof d.expiresAt.toMillis === "function" &&
           d.expiresAt.toMillis() > Date.now();
  } catch (e) {
    // Permission errors or network errors = treat as NO entitlement
    console.warn("hasEntitlement read failed:", e);
    return false;
  }
}

function attachServiceClicks() {
  document.querySelectorAll(".service-card").forEach(card => {
    card.addEventListener("click", async () => {
      const service = (card.dataset.service || '').toLowerCase();

      // Anonymous chat is always free
      if (service === 'anonymous') {
        location.href = "chat.html#anon";
        return;
      }
      else if (service === 'resources') {
  location.href = 'resource.html';
  return;
}
      // Admin shortcuts (always allowed for admins)
      if (service === 'counselling' && (userRole === "counselling" || userEmail === "tana10j@gmail.com")) {
        location.href = "admin-counselling.html";
        return;
      }
      if (service === 'nutrition' && (userRole === "nutrition" || userEmail === "edukdorcas@gmail.com")) {
        location.href = "admin-nutrition.html";
        return;
      }
      if (service === 'student' && (userRole === "student" || userEmail === "chideraumezurike13@gmail.com")) {
        location.href = "admin-student.html";
        return;
      }

      // Regular user path
      if (!currentUser) {
        alert("Please login to continue.");
        location.href = "index.html";
        return;
      }

      const ok = await hasEntitlement(currentUser.uid, service);
      if (ok) {
        if (service === 'counselling') location.href = "chat-counselling.html";
        if (service === 'nutrition')   location.href = "chat-nutrition.html";
        if (service === 'student')     location.href = "chat-student.html";
      } else {
        // Always force redirect to pay if no entitlement
        location.href = "pay.html#" + service;
      }
    }, { once: false });
  });
}
