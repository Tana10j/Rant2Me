// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEVKUuUn0rypPGTzJ2UsVIy9HGYUBHLhI",
  authDomain: "rant2me-ab36b.firebaseapp.com",
  projectId: "rant2me-ab36b",
  storageBucket: "rant2me-ab36b.appspot.com",
  messagingSenderId: "245661393279",
  appId: "1:245661393279:web:b31483f57a40cf2c807a4a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
