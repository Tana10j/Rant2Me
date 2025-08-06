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
  