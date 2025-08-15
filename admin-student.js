// admin-student.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAEVKUuUn0rypPGTzJ2UsVIy9HGYUBHLhI",
  authDomain: "rant2me-ab36b.firebaseapp.com",
  projectId: "rant2me-ab36b",
  storageBucket: "rant2me-ab36b.appspot.com",
  messagingSenderId: "245661393279",
  appId: "1:245661393279:web:b31483f57a40cf2c807a4a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elements
const threadsList = document.getElementById("threadsList");
const messagesContainer = document.getElementById("messagesContainer");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const chatHeaderTitle = document.getElementById("chatHeaderTitle");
const signOutBtn = document.getElementById("signOutBtn");

let selectedChatId = null;
let unsubscribeMessages = null;

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be signed in as admin to view this page.");
    window.location.href = "login.html";
    return;
  }
  loadStudentThreads();
});

// Load student section chats
function loadStudentThreads() {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("section", "==", "student"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    threadsList.innerHTML = "";
    if (snapshot.empty) {
      threadsList.innerHTML = "<li>No chats found.</li>";
      return;
    }
    snapshot.forEach((doc) => {
      const chatData = doc.data();
      const li = document.createElement("li");
      li.textContent = `User: ${chatData.userId}`;
      li.style.cursor = "pointer";
      li.onclick = () => selectChatThread(doc.id, chatData.userId);
      threadsList.appendChild(li);
    });
  });
}

// Select and display a chat thread
function selectChatThread(chatId, userId) {
  selectedChatId = chatId;
  chatHeaderTitle.textContent = `Chat with ${userId}`;
  messagesContainer.innerHTML = "";

  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = msg.senderType === "admin" ? "message admin" : "message user";
      div.textContent = `${msg.senderType}: ${msg.text}`;
      messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// Send message as admin
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedChatId) {
    alert("Please select a chat thread first.");
    return;
  }

  const text = messageInput.value.trim();
  if (!text) return;

  const messagesRef = collection(db, "chats", selectedChatId, "messages");
  await addDoc(messagesRef, {
    text,
    senderType: "admin",
    senderId: auth.currentUser.uid,
    timestamp: serverTimestamp()
  });

  messageInput.value = "";
});

// Sign out
signOutBtn.addEventListener("click", () => {
  signOut(auth);
});
