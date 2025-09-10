import { signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { auth } from "./firebase.js";

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.add("opacity-0");
    setTimeout(() => toast.classList.add("hidden"), 500);
  }, 2000);
}

export function initSignOut() {
  const desktopBtn = document.getElementById("signOutBtnDesktop");
  const mobileBtn = document.getElementById("signOutBtnMobile");

  [desktopBtn, mobileBtn].forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", async () => {
        try {
          await signOut(auth);
          localStorage.removeItem("userRole");
          localStorage.removeItem("userEmail");
          showToast("✅ Signed out successfully");

          setTimeout(() => {
            window.location.href = "index.html";
          }, 2200);
        } catch (error) {
          console.error("Sign-out error:", error);
          showToast("❌ Error signing out");
        }
      });
    }
  });
}
