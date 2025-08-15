import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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

const threadsList = document.getElementById("threadsList");
const messagesContainer = document.getElementById("messages");
const replyInput = document.getElementById("replyInput");
const sendReplyBtn = document.getElementById("sendReplyBtn");

let selectedChatId = null;
let unsubscribeMessages = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be signed in as admin to view this page.");
    window.location.href = "login.html";
    return;
  }
  loadNutritionThreads();
});

function loadNutritionThreads() {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("section", "==", "nutrition"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    threadsList.innerHTML = "";
    snapshot.forEach((doc) => {
      const chatData = doc.data();
      const li = document.createElement("li");
      li.textContent = `User: ${chatData.userId}`;
      li.style.cursor = "pointer";
      li.onclick = () => selectChatThread(doc.id);
      threadsList.appendChild(li);
    });
  });
}

function selectChatThread(chatId) {
  selectedChatId = chatId;
  messagesContainer.innerHTML = "";

  if (unsubscribeMessages) unsubscribeMessages();

  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.textContent = `${msg.senderType}: ${msg.text}`;
      messagesContainer.appendChild(div);
    });
  });
}

sendReplyBtn.addEventListener("click", async () => {
  if (!selectedChatId) {
    alert("Please select a chat thread first.");
    return;
  }

  const text = replyInput.value.trim();
  if (!text) return;

  const messagesRef = collection(db, "chats", selectedChatId, "messages");
  await addDoc(messagesRef, {
    text: text,
    senderType: "admin",
    senderId: auth.currentUser.uid,
    timestamp: serverTimestamp()
  });

  replyInput.value = "";
});
