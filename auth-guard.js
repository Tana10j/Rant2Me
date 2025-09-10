// auth-guard.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { auth } from "./firebase.js";

export function protectPage() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // If not logged in, redirect to login page
      window.location.href = "index.html";
    }
  });
}
