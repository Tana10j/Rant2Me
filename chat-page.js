// chat-page.js
import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

let userRole = "user";
let userEmail = "";

function attachServiceClicks() {
  document.querySelectorAll(".service-card").forEach(card => {
    card.addEventListener("click", () => {
      const service = (card.dataset.service || '').toLowerCase();

      if (service === 'counselling') {
        if (userRole === "counselling" || userEmail === "tana10j@gmail.com") {
          location.href = "admin-counselling.html";
        } else {
          location.href = "chat-counselling.html";
        }
        return;
      }
      if (service === 'nutrition') {
        if (userRole === "nutrition" || userEmail === "edukdorcas@gmail.com") {
          location.href = "admin-nutrition.html";
        } else {
          location.href = "chat-nutrition.html";
        }
        return;
      }
      if (service === 'student') {
        if (userRole === "student" || userEmail === "chidera@example.com") {
          location.href = "admin-student.html";
        } else {
          location.href = "chat-student.html";
        }
        return;
      }
      if (service === 'anonymous') {
        location.href = "chat.html";
        return;
      }
    });
  });
}

// Wait for auth state then attach handlers
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const tokenResult = await user.getIdTokenResult(true);
    userRole = tokenResult.claims.role || "user";
    userEmail = user.email || "";
    console.log("Logged in as", userEmail, "role:", userRole);
  } else {
    userRole = "user";
    userEmail = "";
    console.log("No user logged in");
  }
  attachServiceClicks();
});
