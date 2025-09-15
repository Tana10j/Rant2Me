// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAEVKUuUn0rypPGTzJ2UsVIy9HGYUBHLhI",
  authDomain: "rant2me-ab36b.firebaseapp.com",
  projectId: "rant2me-ab36b",
  storageBucket: "rant2me-ab36b.appspot.com",
  messagingSenderId: "245661393279",
  appId: "1:245661393279:web:b31483f57a40cf2c807a4a"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const greeting = document.getElementById("greeting");
const userEmail = document.getElementById("userEmail");
const signOutBtn = document.getElementById("signOutBtn");
const starRating = document.getElementById("starRating");
const feedbackBtn = document.getElementById("submitFeedback");

// Load user info
onAuthStateChanged(auth, (user) => {
  if (user) {
    greeting.textContent = `Welcome back, ${user.displayName || user.email.split("@")[0]} 👋`;
    userEmail.textContent = user.email;
  } else {
    window.location.href = "index.html"; // redirect if not logged in
  }
});

// Sign out
signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ⭐ Rating stars
let selectedStars = 0;
for (let i = 1; i <= 5; i++) {
  const star = document.createElement("span");
  star.textContent = "★";
  star.className = "text-gray-400 text-2xl cursor-pointer";
  star.addEventListener("click", () => {
    selectedStars = i;
    document.querySelectorAll("#starRating span").forEach((s, idx) => {
      s.className = idx < i ? "text-yellow-500 text-2xl cursor-pointer" : "text-gray-400 text-2xl cursor-pointer";
    });
  });
  starRating.appendChild(star);
}

// Feedback submit
feedbackBtn.addEventListener("click", async () => {
  const section = document.getElementById("feedbackSection").value;
  const text = document.getElementById("feedbackText").value;

  try {
    await addDoc(collection(db, "feedback"), {
      stars: selectedStars,
      section,
      text,
      user: auth.currentUser.email,
      timestamp: serverTimestamp()
    });
    alert("✅ Feedback submitted. Thank you!");
    document.getElementById("feedbackText").value = "";
    selectedStars = 0;
    document.querySelectorAll("#starRating span").forEach(s => s.className = "text-gray-400 text-2xl cursor-pointer");
  } catch (err) {
    console.error("Error saving feedback:", err);
    alert("❌ Failed to submit feedback.");
  }
});

// Share functions
window.shareTo = function(platform) {
  const url = "https://rant2me.web.app";
  const text = "Check out Rant2Me — a safe space to rant, track moods, and get support.";
  if (platform === "twitter") {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
  } else if (platform === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
  }
};

window.copyLink = function() {
  navigator.clipboard.writeText("https://rant2me.web.app");
  alert("🔗 Link copied!");
};
