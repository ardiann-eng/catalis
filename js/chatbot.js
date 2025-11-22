// Gemini AI Chatbot Integration
// API Configuration
const GEMINI_API_KEY = "AIzaSyAjhTGYES8ehLi_qvHR3_fH2vH36_QOrmk";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Chatbot State
let chatHistory = [];
let isOpen = false;

// Initialize Chatbot
document.addEventListener("DOMContentLoaded", function () {
  createChatbotUI();
  attachEventListeners();
  addWelcomeMessage();
});

// Create Chatbot UI
function createChatbotUI() {
  const chatbotHTML = `
    <!-- Chatbot Toggle Button -->
    <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Open Chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

    <!-- Chatbot Window -->
    <div id="chatbot-window" class="chatbot-window">
      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-header-content">
          <div class="chatbot-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </div>
          <div>
            <h3 class="chatbot-title">Catalis AI Assistant</h3>
            <p class="chatbot-status">
              <span class="status-dot"></span>
              Online
            </p>
          </div>
        </div>
        <button id="chatbot-close" class="chatbot-close-btn" aria-label="Close Chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Messages Container -->
      <div id="chatbot-messages" class="chatbot-messages">
        <!-- Messages will be dynamically inserted here -->
      </div>

      <!-- Input Area -->
      <div class="chatbot-input-area">
        <input
          type="text"
          id="chatbot-input"
          class="chatbot-input"
          placeholder="Tanya tentang produk Catalis..."
          autocomplete="off"
        />
        <button id="chatbot-send" class="chatbot-send-btn" aria-label="Send Message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Insert chatbot into body
  document.body.insertAdjacentHTML("beforeend", chatbotHTML);
}

// Attach Event Listeners
function attachEventListeners() {
  const toggleBtn = document.getElementById("chatbot-toggle");
  const closeBtn = document.getElementById("chatbot-close");
  const sendBtn = document.getElementById("chatbot-send");
  const input = document.getElementById("chatbot-input");

  toggleBtn.addEventListener("click", toggleChatbot);
  closeBtn.addEventListener("click", toggleChatbot);
  sendBtn.addEventListener("click", sendMessage);

  // Send on Enter key
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

// Toggle Chatbot Window
function toggleChatbot() {
  isOpen = !isOpen;
  const chatbotWindow = document.getElementById("chatbot-window");
  const toggleBtn = document.getElementById("chatbot-toggle");

  if (isOpen) {
    chatbotWindow.classList.add("active");
    toggleBtn.classList.add("hidden");
    document.getElementById("chatbot-input").focus();
  } else {
    chatbotWindow.classList.remove("active");
    toggleBtn.classList.remove("hidden");
  }
}

// Add Welcome Message
function addWelcomeMessage() {
  const welcomeText = `Halo! 👋 Saya Catalis AI Assistant.

Saya siap membantu Anda dengan:
• Informasi produk kreatif
• Cara berbelanja di Catalis
• Proses pembayaran dan checkout
• Pertanyaan umum tentang marketplace

Ada yang bisa saya bantu?`;

  addMessage(welcomeText, "bot");
}

// Add Message to Chat
function addMessage(text, sender) {
  const messagesContainer = document.getElementById("chatbot-messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `chatbot-message ${sender}-message`;

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = text;

  const timestamp = document.createElement("div");
  timestamp.className = "message-timestamp";
  timestamp.textContent = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.appendChild(messageContent);
  messageDiv.appendChild(timestamp);
  messagesContainer.appendChild(messageDiv);

  // Auto scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add Typing Indicator
function showTypingIndicator() {
  const messagesContainer = document.getElementById("chatbot-messages");
  const typingDiv = document.createElement("div");
  typingDiv.className = "chatbot-message bot-message typing-indicator";
  typingDiv.id = "typing-indicator";

  typingDiv.innerHTML = `
    <div class="message-content">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove Typing Indicator
function hideTypingIndicator() {
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Send Message
async function sendMessage() {
  const input = document.getElementById("chatbot-input");
  const message = input.value.trim();

  if (!message) return;

  // Add user message
  addMessage(message, "user");
  input.value = "";

  // Show typing indicator
  showTypingIndicator();

  // Add context about Catalis to the prompt
  const contextualPrompt = `Kamu adalah AI assistant untuk Catalis Creative, sebuah marketplace produk kreatif Indonesia.

Informasi tentang Catalis:
- Catalis adalah platform jual-beli produk kreatif seperti artwork, design, merchandise, dll
- Menggunakan Midtrans untuk payment gateway (support kartu kredit, e-wallet, transfer bank)
- Website: https://catalist-omega.vercel.app
- Memiliki admin panel untuk seller mengelola produk
- Database menggunakan Supabase
- Produk bisa dibeli dengan klik "Buy Now" dan checkout langsung

Jawab pertanyaan berikut dengan ramah, informatif, dan fokus ke Catalis:
${message}

Jika pertanyaan di luar topik Catalis, tetap jawab dengan sopan tapi arahkan kembali ke topik Catalis.`;

  try {
    // Call Gemini API
    console.log("Calling Gemini API...", GEMINI_API_URL);

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: contextualPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Response:", errorData);
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("API Response Data:", data);

    const botResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Maaf, saya tidak bisa memproses pertanyaan Anda saat ini.";

    // Hide typing indicator
    hideTypingIndicator();

    // Add bot response
    addMessage(botResponse, "bot");

    // Save to history
    chatHistory.push({
      user: message,
      bot: botResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot Error Details:", error);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);

    hideTypingIndicator();

    // More helpful error message
    let errorMessage = "Maaf, terjadi kesalahan dalam memproses pertanyaan Anda.";

    if (error.message.includes("403")) {
      errorMessage = "API key tidak valid atau quota habis. Mohon hubungi administrator.";
    } else if (error.message.includes("429")) {
      errorMessage = "Terlalu banyak request. Silakan tunggu sebentar dan coba lagi.";
    } else if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
      errorMessage = "Koneksi internet bermasalah. Silakan cek koneksi Anda.";
    }

    addMessage(errorMessage, "bot");
  }
}

// Quick Actions (Optional - can be added later)
function addQuickActions() {
  const quickActions = [
    "Bagaimana cara berbelanja?",
    "Metode pembayaran apa saja?",
    "Cara menjadi seller?",
  ];

  const messagesContainer = document.getElementById("chatbot-messages");
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "quick-actions";

  quickActions.forEach((action) => {
    const button = document.createElement("button");
    button.className = "quick-action-btn";
    button.textContent = action;
    button.onclick = () => {
      document.getElementById("chatbot-input").value = action;
      sendMessage();
    };
    actionsDiv.appendChild(button);
  });

  messagesContainer.appendChild(actionsDiv);
}

// Export for debugging (optional)
window.chatbotDebug = {
  history: () => chatHistory,
  clear: () => {
    chatHistory = [];
    document.getElementById("chatbot-messages").innerHTML = "";
    addWelcomeMessage();
  },
};
