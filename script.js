// script.js (replace your existing file with this)

// Determine current page basename
const currentPage = window.location.pathname.split("/").pop();

// Simple helper to escape user HTML for safe output
function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// --- BOT RESPONSE FUNCTION (global) ---
// Expose on window so other inline scripts (chat.html etc.) can call it
window.getBotResponse = function getBotResponse(userText = "") {
  const lowerMsg = (userText || "").toLowerCase();

  // Keyword-based checks (mirrors your previous logic, extended a bit)
  if (/(help|support|need|assistance|advice|guidance|talk|listen|listening)/i.test(lowerMsg)) {
    return "I hear that you may need help. Please remember, this anonymous chat is for quick release. You can choose a specialist section for deeper support.";
  }
  if (/(sad|depress|depressed|lonely|unhappy|down|miserable|cry|tear)/i.test(lowerMsg)) {
    return "I’m sorry you’re feeling this way. You’re not alone - it’s okay to express it here. If you want longer support, consider connecting to a specialist.";
  }
  if (/(angry|frustrat|mad|upset|vex|irritat|annoyed|rage)/i.test(lowerMsg)) {
    return "It’s valid to feel angry. This is a judgment-free space to let it out. Try a breathing exercise or a short walk if you can.";
  }
  if (/(thank|thanks|appreciate|grateful|cheers|bless)/i.test(lowerMsg)) {
    return "You’re welcome - glad this space could help. If you want, try a gratitude exercise (name three things that went well today).";
  }
  if (/(happy|joy|excited|content|pleased|delighted|cheerful|elated)/i.test(lowerMsg)) {
    return "That’s wonderful to hear! Celebrating the positive is important. Share more if you'd like - it's nice to savor the good moments.";
  }
  if (/(confus|uncertain|unsure|perplex|baffl|puzzle|doubt|ambig)/i.test(lowerMsg)) {
    return "It's okay to feel confused. Try writing down the specific question or worry - that often helps clarify the next step.";
  }
  if (/(Hi|Hello|Greetings|Hola|Good |Hey|Howdy|)/i.test(lowerMsg)) {
    return "Hello, to you too. I'm here to listen. Feel free to share whatever's on your mind.";
  }
  // fallback replies (rotate)
  const defaultReplies = [
    "I hear you. Sometimes just letting it out makes a difference.",
    "Thanks for sharing that. You’re not alone here.",
    "It’s okay to feel this way, this is your space to release it.",
    "Your rant is safe here. Remember, this chat auto-deletes after 5 minutes.",
    "If you want to go deeper, you can always choose a specialist section below to connect further.",
    "I'm here to listen. Feel free to share whatever's on your mind.",
    "Sometimes, just expressing your thoughts can bring relief.",
    "Take your time. I'm here whenever you're ready to share more.",
    "It's okay to feel the way you do. Let it out here.",
    "Remember, this is a judgment-free space. Share whatever you need to.",
    "If you need more support, consider exploring our specialist sections.",
    "Your feelings are valid. I'm here to listen.",
    "Thank you for trusting me with your thoughts. I'm here for you.",
  ];
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
};


// --- PAGE-SPECIFIC UI Wiring (only attach when necessary) ---
(function setupChatUI() {
  // Avoid attaching multiple times if this script is re-run
  if (window.__r2m_chat_ui_initialized) return;
  window.__r2m_chat_ui_initialized = true;

  // --- Anonymous quick rant area (hero) ---
  const rantSend = document.getElementById('rantSend');
  const rantClear = document.getElementById('rantClear');
  const anonRant = document.getElementById('anonRant');
  const anonOutput = document.getElementById('anonRantOutput');

  let anonTimeout = null;

  if (rantClear && anonRant && anonOutput) {
    rantClear.addEventListener('click', () => {
      anonRant.value = '';
      anonOutput.textContent = '';
      if (anonTimeout) { clearTimeout(anonTimeout); anonTimeout = null; }
    });
  }

  if (rantSend && anonRant && anonOutput) {
    rantSend.addEventListener('click', () => {
      const txt = (anonRant.value || "").trim();
      if (!txt) {
        anonOutput.textContent = 'Write something first…';
        return;
      }

      // User message
      anonOutput.innerHTML = `<div class="p-3 rounded bg-slate-50 border text-slate-800">${escapeHtml(txt)}</div>`;

      // Bot reply (using global function)
      const botReply = window.getBotResponse(txt);
      setTimeout(() => {
        anonOutput.innerHTML += `<div class="p-3 mt-2 rounded bg-r2m-aqua/10 border text-r2m-blue">${escapeHtml(botReply)}</div>`;
      }, 650);

      // clear input
      anonRant.value = '';

      // auto-delete after 5 minutes
      if (anonTimeout) clearTimeout(anonTimeout);
      anonTimeout = setTimeout(() => {
        anonOutput.textContent = '';
        anonTimeout = null;
      }, 5 * 60 * 1000);
    });
  }

  // --- Generic chat UI (if you have a send button / chat-output area) ---
  // Try a few selectors so it works on different markup versions.
  const sendButton = document.querySelector('#sendBtn') || document.querySelector('#send-button');
  const chatTextArea = document.querySelector('#chatInput') || document.querySelector('#chat-textarea') || document.querySelector('textarea.chat-input');
  const chatOutputEl = document.getElementById('chat-output') || document.getElementById('chatOutput') || document.getElementById('anonRantOutput');

  if (sendButton && chatTextArea && chatOutputEl) {
    sendButton.addEventListener('click', () => {
      const msg = (chatTextArea.value || "").trim();
      if (!msg) return;

      // display user text
      const userMsg = document.createElement('p');
      userMsg.className = 'mt-2 p-2 rounded bg-white/80';
      userMsg.textContent = "You: " + msg;
      chatOutputEl.appendChild(userMsg);

      // clear input
      chatTextArea.value = "";

      // bot reply
      const reply = window.getBotResponse(msg);
      setTimeout(() => {
        const botMsg = document.createElement('p');
        botMsg.className = 'mt-2 p-2 rounded bg-r2m-aqua/10 text-r2m-blue';
        botMsg.textContent = "Anonymous Bot: " + reply;
        chatOutputEl.appendChild(botMsg);

        // scroll down if container supports scroll
        if (chatOutputEl.scrollTop !== undefined) {
          chatOutputEl.scrollTop = chatOutputEl.scrollHeight;
        }
      }, 700);

      // optionally clear the chat area after 5 minutes for privacy
      setTimeout(() => {
        if (chatOutputEl) chatOutputEl.innerHTML = '';
      }, 5 * 60 * 1000);
    });
  }

  // --- Accessibility: allow Enter to send when textarea present ---
  if (chatTextArea && sendButton) {
    chatTextArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
      }
    });
  }

  // --- small misc: fade-in intro on chat page (kept from original) ---
  if (currentPage === "chat.html") {
    setTimeout(() => {
      const introMsg = document.getElementById('intro-message');
      if (introMsg) introMsg.style.opacity = 1;
    }, 500);
  }
})();
