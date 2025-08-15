import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc
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
const globalUnreadEl = document.getElementById("globalUnread");

let selectedChatId = null;
let selectedUserId = null;
let unsubscribeMessages = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be signed in as admin to view this page.");
    window.location.href = "login.html";
    return;
  }
  loadCounsellingThreads();
  listenForUnreadMessages();
});

function loadCounsellingThreads() {
  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("section", "==", "counselling"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    threadsList.innerHTML = "";
    snapshot.forEach((doc) => {
      const chatData = doc.data();
      const li = document.createElement("li");
      li.style.cursor = "pointer";

      // Add user name and badge
      li.innerHTML = `User: ${chatData.userId} <span class="badge user-badge hidden" data-user="${chatData.userId}">0</span>`;
      li.onclick = () => selectChatThread(doc.id, chatData.userId);

      threadsList.appendChild(li);
    });
  });
}

function selectChatThread(chatId, userId) {
  selectedChatId = chatId;
  selectedUserId = userId;
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

  // Mark messages as read for this user
  markMessagesAsRead(chatId);
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
    timestamp: serverTimestamp(),
    isRead: true // admin's own messages are always "read"
  });

  replyInput.value = "";
});

async function markMessagesAsRead(chatId) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const unreadSnap = await getDocs(query(messagesRef, where("senderType", "==", "user"), where("isRead", "==", false)));
  
  unreadSnap.forEach((docSnap) => {
    updateDoc(docSnap.ref, { isRead: true });
  });
}

function listenForUnreadMessages() {
  const chatsRef = collection(db, "chats");
  onSnapshot(chatsRef, (chatSnap) => {
    let totalUnread = 0;
    const userUnreadCounts = {};

    chatSnap.forEach((chatDoc) => {
      const chatId = chatDoc.id;
      const userId = chatDoc.data().userId;

      const messagesRef = collection(db, "chats", chatId, "messages");
      const q = query(messagesRef, where("senderType", "==", "user"), where("isRead", "==", false));

      onSnapshot(q, (msgSnap) => {
        const count = msgSnap.size;
        if (count > 0) {
          totalUnread += count;
          userUnreadCounts[userId] = count;
        } else {
          userUnreadCounts[userId] = 0;
        }

        // Update user badge
        const badge = document.querySelector(`.user-badge[data-user="${userId}"]`);
        if (badge) {
          if (userUnreadCounts[userId] > 0) {
            badge.textContent = userUnreadCounts[userId];
            badge.classList.remove("hidden");
          } else {
            badge.classList.add("hidden");
          }
        }

        // Update global badge
        if (totalUnread > 0) {
          globalUnreadEl.textContent = totalUnread;
          globalUnreadEl.classList.remove("hidden");
        } else {
          globalUnreadEl.classList.add("hidden");
        }
      });
    });
  });
}
