function sendMessage(section) {
    const input = document.getElementById(`input-${section}`);
    const chatBox = document.getElementById(`chat-box-${section}`);
  
    const userMsg = input.value.trim();
    if (userMsg === '') return;
  
    // Append user message
    const userBubble = document.createElement('div');
    userBubble.className = 'message user';
    userBubble.textContent = userMsg;
    chatBox.appendChild(userBubble);
  
    // Scroll down
    chatBox.scrollTop = chatBox.scrollHeight;
  
    // Clear input
    input.value = '';
  
    // Simulate admin reply
    setTimeout(() => {
      const adminBubble = document.createElement('div');
      adminBubble.className = 'message admin';
  
      // Customize response based on section
      let reply;
      if (section === 'nutrition') reply = 'Dorcas: Got it! Let’s talk nutrition.';
      else if (section === 'counselling') reply = 'Tana: I hear you. Let’s work through this.';
      else if (section === 'lifestyle') reply = 'Chidera: Thanks for reaching out! Let’s explore your lifestyle goals.';
  
      adminBubble.textContent = reply;
      chatBox.appendChild(adminBubble);
  
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 1000);
  }
  import { db } from './firebase.js'; // adjust path as needed
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const form = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (text) {
    await addDoc(collection(db, "messages"), {
      text,
      timestamp: serverTimestamp(),
    });
    messageInput.value = "";
  }
});
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

const messageList = document.getElementById("messageList");

const q = query(collection(db, "messages"), orderBy("timestamp"));

onSnapshot(q, (snapshot) => {
  messageList.innerHTML = "";
  snapshot.forEach((doc) => {
    const message = doc.data();
    const li = document.createElement("li");
    li.textContent = message.text;
    messageList.appendChild(li);
  });
});
