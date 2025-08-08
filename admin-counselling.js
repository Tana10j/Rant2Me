// admin-counselling.js
import { db, auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc, addDoc, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const ADMIN_SECTION = 'counselling';
const ADMIN_DISPLAY_NAME = 'Tana';

const threadsListEl = document.getElementById('threadsList');
const messagesEl = document.getElementById('messages');
const chatHeaderTitle = document.getElementById('chatHeaderTitle');
const replyInput = document.getElementById('replyInput');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const signOutBtn = document.getElementById('signOutBtn');

let currentUser = null;
let currentChatId = null;
let messagesUnsub = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  const idTokenResult = await user.getIdTokenResult(true);
  const roleClaim = idTokenResult.claims.role || null;

  if (roleClaim !== ADMIN_SECTION) {
    alert("Access denied: you are not assigned to this admin section.");
    window.location.href = "home.html";
    return;
  }

  startThreadsListener();
});

signOutBtn.addEventListener('click', () => {
  signOut(auth).then(() => window.location.href = "index.html");
});

function startThreadsListener() {
  const chatsColl = collection(db, 'chats');
  const q = query(chatsColl, where('section', '==', ADMIN_SECTION), orderBy('lastUpdated', 'desc'));
  onSnapshot(q, snap => {
    threadsListEl.innerHTML = '';
    if (snap.empty) {
      threadsListEl.innerHTML = '<div style="color:#777;padding:8px">No chats yet</div>';
      return;
    }
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      const preview = data.lastMessagePreview || '';
      const time = data.lastUpdated ? new Date(data.lastUpdated.toMillis()).toLocaleString() : '';
      const name = data.userName || data.userId || 'Anonymous';

      const item = document.createElement('div');
      item.className = 'thread-item';
      item.innerHTML = `
        <div class="thread-avatar"></div>
        <div class="thread-meta">
          <div class="name">${escapeHtml(name)}</div>
          <div class="preview">${escapeHtml(preview)}</div>
        </div>
        <div class="thread-time">${time}</div>
      `;
      item.onclick = () => openChat(id, data);
      threadsListEl.appendChild(item);
    });
  }, err => {
    console.error("Error listening to chats:", err);
  });
}

async function openChat(chatId, chatMeta) {
  if (messagesUnsub) messagesUnsub();
  currentChatId = chatId;
  chatHeaderTitle.textContent = (chatMeta.userName || chatMeta.userId || 'Anonymous');
  messagesEl.innerHTML = '<div style="color:#777">Loading messages…</div>';

  const msgsRef = collection(db, 'chats', chatId, 'messages');
  const q = query(msgsRef, orderBy('timestamp', 'asc'));
  messagesUnsub = onSnapshot(q, snap => {
    messagesEl.innerHTML = '';
    snap.forEach(m => {
      const d = m.data();
      const el = document.createElement('div');
      el.className = 'msg ' + (d.senderType === 'user' ? 'user' : 'admin');
      if (d.senderType === 'admin') {
        el.innerHTML = `<div class="avatar"></div><div class="bubble">${escapeHtml(d.text)}</div>`;
      } else {
        el.innerHTML = `<div class="bubble">${escapeHtml(d.text)}</div>`;
      }
      messagesEl.appendChild(el);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, err => console.error("Message listener error:", err));
}

sendReplyBtn.addEventListener('click', async () => {
  const text = replyInput.value.trim();
  if (!text || !currentChatId) return;
  const msgsRef = collection(db, 'chats', currentChatId, 'messages');

  try {
    await addDoc(msgsRef, {
      text,
      senderType: 'admin',
      senderId: currentUser.uid,
      senderName: ADMIN_DISPLAY_NAME,
      timestamp: serverTimestamp()
    });

    const chatRef = doc(db, 'chats', currentChatId);
    await updateDoc(chatRef, {
      lastUpdated: serverTimestamp(),
      lastMessagePreview: text
    });

    replyInput.value = '';
  } catch (e) {
    console.error("Failed to send reply:", e);
    alert("Failed to send reply — check console.");
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}
