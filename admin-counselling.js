import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getFirestore,
  collection, doc,
  query, where, orderBy,
  onSnapshot, addDoc, updateDoc, getDoc,
  serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

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

// DOM
const threadsList = document.getElementById("threadsList");
const messagesEl  = document.getElementById("messages");
const replyInput  = document.getElementById("replyInput");
const sendBtn     = document.getElementById("sendReplyBtn");
const globalBadge = document.getElementById("globalUnread");
const chatHeaderTitle = document.getElementById("chatHeaderTitle");

// State
let selectedChatId = null;
let selectedUserId = null;
let unsubscribeMessages = null;

// per-chat unread counts and listeners
const unreadCounts = new Map();           // chatId -> number
const perChatMsgUnsub = new Map();        // chatId -> unsubscribe fn
const perChatDocUnsub = new Map();        // chatId -> unsubscribe fn
const chatDocCache = new Map();           // chatId -> chatDoc.data()

onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be signed in as admin to view this page.");
    window.location.href = "login.html";
    return;
  }
  loadThreadsAndAttachUnread();
});

/** Load all chats for this section and wire up unread counters */
function loadThreadsAndAttachUnread() {
  const chatsRef = collection(db, "chats");
  const qChats = query(chatsRef, where("section", "==", "counselling"), orderBy("createdAt", "desc"));

  onSnapshot(qChats, (chatsSnap) => {
    // Track which chats exist in this snapshot
    const present = new Set();

    chatsSnap.forEach((chatDoc) => {
      const chatId = chatDoc.id;
      const data = chatDoc.data();
      present.add(chatId);
      chatDocCache.set(chatId, data);

      // Render (or update) a thread row
      renderThreadItem(chatId, data);

      // Listen to chat doc (for adminLastReadAt changes)
      if (!perChatDocUnsub.has(chatId)) {
        const unsubChatDoc = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
          const updated = docSnap.data() || {};
          chatDocCache.set(chatId, updated);
          // Recompute unread for this chat using latest lastRead
          // (messages listener remains the same; we filter on client)
          // Trigger a fake recompute by reading current messages via its snapshot handler
          // (no-op here; actual recompute happens whenever new messages snapshot fires)
        });
        perChatDocUnsub.set(chatId, unsubChatDoc);
      }

      // Listen to user messages in this chat and compute unread count on client
      if (!perChatMsgUnsub.has(chatId)) {
        const msgsRef = collection(db, "chats", chatId, "messages");
        const qMsgs = query(msgsRef, where("senderType", "==", "user"));
        const unsubMsgs = onSnapshot(qMsgs, (msgSnap) => {
          const lastRead = chatDocCache.get(chatId)?.adminLastReadAt || Timestamp.fromMillis(0);
          let count = 0;
          msgSnap.forEach((m) => {
            const dt = m.data().timestamp;
            if (dt && dt.toMillis() > lastRead.toMillis()) count++;
          });
          unreadCounts.set(chatId, count);
          updatePerUserBadge(chatId, data.userId, count);
          updateGlobalBadge();
        });
        perChatMsgUnsub.set(chatId, unsubMsgs);
      }
    });

    // Remove listeners for chats that no longer exist
    for (const chatId of [...perChatMsgUnsub.keys()]) {
      if (!present.has(chatId)) {
        perChatMsgUnsub.get(chatId)(); perChatMsgUnsub.delete(chatId);
      }
    }
    for (const chatId of [...perChatDocUnsub.keys()]) {
      if (!present.has(chatId)) {
        perChatDocUnsub.get(chatId)(); perChatDocUnsub.delete(chatId);
      }
    }
  });
}

/** Create / update a thread row with per-user badge */
function renderThreadItem(chatId, data) {
  let row = document.getElementById(`thread-${chatId}`);
  if (!row) {
    row = document.createElement("div");
    row.id = `thread-${chatId}`;
    row.className = "thread-item";
    row.addEventListener("click", () => selectChat(chatId, data.userId));
    threadsList.appendChild(row);
  }
  row.innerHTML = `
    <div class="thread-name">User: ${data.userId || "unknown"}</div>
    <span class="badge user-badge hidden" data-chat="${chatId}">0</span>
    <div class="thread-meta">${formatTime(data.createdAt)}</div>
  `;
}

/** When admin opens a chat: show messages + mark read */
function selectChat(chatId, userId) {
  selectedChatId = chatId;
  selectedUserId = userId;
  chatHeaderTitle.textContent = `Chat with ${userId}`;

  // mark read immediately (serverTimestamp)
  updateDoc(doc(db, "chats", chatId), { adminLastReadAt: serverTimestamp() }).catch(() => {});

  // messages area
  if (unsubscribeMessages) unsubscribeMessages();
  const msgsRef = collection(db, "chats", chatId, "messages");
  const qMsgs = query(msgsRef, orderBy("timestamp", "asc"));

  unsubscribeMessages = onSnapshot(qMsgs, (snap) => {
    messagesEl.innerHTML = "";
    snap.forEach((m) => {
      const msg = m.data();
      const div = document.createElement("div");
      div.className = "msg " + (msg.senderType === "admin" ? "user" : "admin");
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = `${msg.senderType}: ${msg.text}`;
      div.appendChild(bubble);
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  // zero out this chat’s badge visually (count will recompute via snapshot)
  const badge = document.querySelector(`.user-badge[data-chat="${chatId}"]`);
  if (badge) {
    badge.classList.add("hidden");
    badge.textContent = "0";
  }
}

/** Send message as admin */
sendBtn.addEventListener("click", async () => {
  if (!selectedChatId) {
    alert("Please select a chat thread first.");
    return;
  }
  const text = (replyInput.value || "").trim();
  if (!text) return;

  const msgsRef = collection(db, "chats", selectedChatId, "messages");
  await addDoc(msgsRef, {
    text,
    senderType: "admin",
    senderId: auth.currentUser.uid,
    timestamp: serverTimestamp()
  });

  // Sending a message implies we've seen the chat
  updateDoc(doc(db, "chats", selectedChatId), { adminLastReadAt: serverTimestamp() }).catch(() => {});
  replyInput.value = "";
});

/** Helpers */
function updatePerUserBadge(chatId, userId, count) {
  const badge = document.querySelector(`.user-badge[data-chat="${chatId}"]`);
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}
function updateGlobalBadge() {
  let total = 0;
  unreadCounts.forEach((n) => (total += n || 0));
  if (total > 0) {
    globalBadge.textContent = total;
    globalBadge.classList.remove("hidden");
  } else {
    globalBadge.classList.add("hidden");
  }
}
function formatTime(ts) {
  if (!ts || !ts.toMillis) return "";
  const d = new Date(ts.toMillis());
  return d.toLocaleString();
}
