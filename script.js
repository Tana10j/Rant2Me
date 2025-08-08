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

    const sendButton = document.querySelector('button');
    const textArea = document.querySelector('textarea');
    const chatOutput = document.getElementById('chat-output');
    const chatType = document.getElementById('chatType');

    sendButton.addEventListener('click', function() {
        const message = textArea.value.trim();

        if (message === "") {
            alert("Please type something!");
            return;
        }

        const userMsg = document.createElement('p');
        userMsg.textContent = "You: " + message;
        chatOutput.appendChild(userMsg);

        textArea.value = "";

        setTimeout(() => {
            const botReply = document.createElement('p');

            let responder = "Anonymous Bot";

            botReply.textContent = responder + ": I'm here for you 💜";
            chatOutput.appendChild(botReply);
        }, 1000);
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
            botMsg.textContent = "Anonymous Bot: I'm here for you. 💜";
            chatOutput.appendChild(botMsg);
        }, 800);

        // Auto-delete after 5 minutes
        setTimeout(() => {
            chatOutput.innerHTML = '';
        }, 5 * 60 * 1000);
    });
}
