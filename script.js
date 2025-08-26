const currentPage = window.location.pathname.split("/").pop();
if (currentPage === "chat.html") {
    setTimeout(() => {
        const introMsg = document.getElementById('intro-message');
        if (introMsg) introMsg.style.opacity = 1;
    }, 500);
}


// Auto-typing Welcome Text (Home Page Only)
if (currentPage === "" || currentPage === "home.html") {
    const welcomeText = "Welcome to Rant2Me. A safe space to be heard.";
    let i = 0;
    const typingTarget = document.getElementById('typing-text');

    function typeWriter() {
        if (i < welcomeText.length) {
            typingTarget.innerHTML += welcomeText.charAt(i);
            i++;
            setTimeout(typeWriter, 80);
        }
    }
    typeWriter();
}

// Expandable FAQ
if (currentPage === "faq.html") {
    document.querySelectorAll('.question').forEach(q => {
        q.addEventListener('click', () => {
            q.nextElementSibling.classList.toggle('show');
        });
    });
}

// Fun Chat Simulation
if (currentPage === "chat.html") {
    const sendButton = document.querySelector('#sendBtn');
    const textArea = document.querySelector('textarea');
    const chatOutput = document.getElementById('chat-output');

    sendButton.addEventListener('click', () => {
        const msg = textArea.value.trim();
        if (!msg) return;

        // Display user message
        const userMsg = document.createElement('p');
        userMsg.textContent = "You: " + msg;
        chatOutput.appendChild(userMsg);
        textArea.value = "";

        setTimeout(() => {
            const botMsg = document.createElement('p');
            let reply = "";
            const lowerMsg = msg.toLowerCase();

            // Keyword-based responses
            if (lowerMsg.includes("help") || lowerMsg.includes("support") || lowerMsg.includes("need") || lowerMsg.includes("assistance") || lowerMsg.includes("advice") || lowerMsg.includes("guidance") || lowerMsg.includes("talk") || lowerMsg.includes("listen") || lowerMsg.includes("listening")) {
                reply = "I hear that you may need help. Please remember, while this chat is anonymous and temporary, you can connect with our specific sections for more focused support.";
            } else if (lowerMsg.includes("sad") || lowerMsg.includes("depressed") || lowerMsg.includes("lonely") || lowerMsg.includes("unhappy") || lowerMsg.includes("down") || lowerMsg.includes("miserable") || lowerMsg.includes("cry") || lowerMsg.includes("tear")) {
                reply = "I’m sorry you’re feeling this way. You’re not alone, and it’s okay to express it here. Your rant will auto-delete in 5 minutes, but you can choose a support section if you’d like to continue.";
            } else if (lowerMsg.includes("angry") || lowerMsg.includes("frustrated") || lowerMsg.includes("mad") || lowerMsg.includes("upset") || lowerMsg.includes("Vex") || lowerMsg.includes("irritated") || lowerMsg.includes("annoyed") || lowerMsg.includes("rage")) {
                reply = "It’s completely valid to feel angry sometimes. This space is judgment-free, let it out. In 5 minutes, this chat will be wiped for your privacy.";
            } else if (lowerMsg.includes("thanks") || lowerMsg.includes("thank you") || lowerMsg.includes("appreciate") || lowerMsg.includes("grateful") || lowerMsg.includes("cheers") || lowerMsg.includes("bless") || lowerMsg.includes("gratitude")) {
                reply = "You’re welcome. I’m glad this space could be here for you.";
                } else if (lowerMsg.includes("Happy") || lowerMsg.includes (" joyful") || lowerMsg.includes("excited") || lowerMsg.includes("content") || lowerMsg.includes("pleased") || lowerMsg.includes("delighted") || lowerMsg.includes("cheerful") || lowerMsg.includes("elated")) {
                reply = "That’s wonderful to hear! Embracing positive feelings is just as important. Remember, you can always share more or choose a section to connect further.";
                } else if (lowerMsg.includes("Confused") || lowerMsg.includes("uncertain") || lowerMsg.includes("unsure") || lowerMsg.includes("perplexed") || lowerMsg.includes("baffled") || lowerMsg.includes("puzzled") || lowerMsg.includes("doubtful") || lowerMsg.includes("ambiguous")) {
                reply = "It's okay to feel confused sometimes. This is a safe space to express your thoughts. If you want clarity or guidance, consider reaching out to one of our specific sections.";
            } else {
                // Default responses (rotate randomly)
                const defaultReplies = [
                    "I hear you. Sometimes just letting it out makes a difference.",
                    "Thanks for sharing that. You’re not alone here.",
                    "It’s okay to feel this way — this is your space to release it.",
                    "Your rant is safe here. Remember, this chat auto-deletes after 5 minutes.",
                    "Admins online may see this rant, but they cannot respond. This is just for you to be heard.",
                    "If you want to go deeper, you can always choose a specific section below to connect further.",
                    " I'm here to listen. Feel free to share whatever's on your mind.",
                    "Sometimes, just expressing your thoughts can bring relief.",
                    "Remember, this is a safe space. Your feelings are valid.",
                    "Take your time. I'm here to listen whenever you're ready to share more.",
                    "It's okay to feel the way you do. Let it out here.",
                    " Your rant will be deleted in 5 minutes, ensuring your privacy.",
                ];
                reply = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
            }

            botMsg.textContent = "Anonymous Bot: " + reply;
            chatOutput.appendChild(botMsg);
        }, 800);

        // Auto-delete after 5 minutes
        setTimeout(() => {
            chatOutput.innerHTML = '';
        }, 5 * 60 * 1000);
    });
}



// Smooth Scroll (only for hash links like #section1)
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
document.querySelectorAll('.service-item button').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.parentElement;

        // Close all other items
        document.querySelectorAll('.service-item').forEach(i => {
            if (i !== item) i.classList.remove('active');
        });

        // Toggle current item
        item.classList.toggle('active');
    });
});
if (currentPage === "chat.html") {
    const sendButton = document.querySelector('#sendBtn');
    const textArea = document.querySelector('textarea');
    const chatOutput = document.getElementById('chat-output');

    sendButton.addEventListener('click', () => {
        const msg = textArea.value.trim();
        if (!msg) return;

        const userMsg = document.createElement('p');
        userMsg.textContent = "You: " + msg;
        chatOutput.appendChild(userMsg);

        textArea.value = "";

        setTimeout(() => {
            const botMsg = document.createElement('p');
            botMsg.textContent = "Anonymous Bot: Hi, and yes I am a bot. While I may not respond in real-time, I'm here to listen and support you. Our admins can also see your rants, so if you would like to Speak on it further, you can choose whichever section works for you below. In 5 minutes, I will delete this conversation to ensure your privacy.";
            chatOutput.appendChild(botMsg);
        }, 800);

        // Auto-delete after 5 minutes
        setTimeout(() => {
            chatOutput.innerHTML = '';
        }, 5 * 60 * 1000);
    });
}

