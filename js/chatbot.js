// Gemini AI Chatbot Integration
// API Configuration
const GEMINI_API_KEY = "AIzaSyAjhTGYES8ehLi_qvHR3_fH2vH36_QOrmk";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Chatbot State
let chatHistory = [];
let isOpen = false;
let isSending = false;
let degradedMode = false;

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
            <img src="maskot.jpg" alt="Catalis Mascot" class="chatbot-avatar-img" onerror="this.src='logo.png'"/>
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

function setStatus(state) {
  try {
    const statusEl = document.querySelector('.chatbot-status');
    if (!statusEl) return;
    const dot = statusEl.querySelector('.status-dot');
    if (!dot) return;
    dot.classList.remove('status-offline');
    if (state === 'offline') {
      dot.classList.add('status-offline');
      statusEl.innerHTML = '<span class="status-dot"></span> Offline';
    } else if (state === 'degraded') {
      statusEl.innerHTML = '<span class="status-dot"></span> Degraded';
    } else {
      statusEl.innerHTML = '<span class="status-dot"></span> Online';
    }
  } catch(_) {}
}

// Add Welcome Message
function addWelcomeMessage() {
  const welcomeText = `Halo! 👋 Saya Catalis AI Assistant.

Saya bisa membantu:
• Info produk & marketplace
• Cara berbelanja & pembayaran (Midtrans)
• Fitur Community (post, reply, like, delete milik sendiri)
• Profil pengguna & karya kreatif

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

  // Bounce animation for user send
  if (sender === 'user') {
    try { messageDiv.classList.add('send-bounce'); setTimeout(()=>messageDiv.classList.remove('send-bounce'), 600); } catch(_) {}
  }
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
  if (isSending) return; // prevent double send
  const input = document.getElementById("chatbot-input");
  const message = input.value.trim();

  if (!message) return;

  // Add user message
  addMessage(message, "user");
  input.value = "";

  // Show typing indicator
  showTypingIndicator();
  isSending = true;

  // Add context about Catalis to the prompt
  const contextualPrompt = `
You are **Catalis AI** — the official assistant of **Catalis**, a modern creative marketplace. 
Your job is to guide users, offer insights, generate ideas, and explain features related to the Catalis platform.

===========================
🎭 Persona & Behavioral Rules
===========================
- Gaya bicara ramah, jelas, informatif, dan terasa seperti "teman kreatif".
- Fokus pada solusi. Jangan bertele-tele.
- Jangan pernah menampilkan error seperti: "Maaf, terjadi kesalahan".
- Jika informasi tidak tersedia atau tidak pasti, jawab:
  "Saya tidak memiliki datanya, tetapi saya bisa memberikan analisis atau saran berdasarkan konteks Catalis."
- Jika terjadi kesalahan internal dari model, ulangi atau perbaiki jawabannya tanpa menyebutkan error.

===========================
📌 Platform Knowledge (Important)
===========================
Pahami seluruh ekosistem Catalis:

1. **Marketplace System**
   - User dapat menjelajah produk kreatif (digital item, asset, karya).
   - Terdapat halaman: Explore → Product Detail → Creator Profile.
   - Creator memiliki profil khusus berisi portofolio dan informasi.
   - Pembayaran melalui Midtrans (kartu, e-wallet, bank transfer).
   - Tidak ada konteks Web3, blockchain, atau Solana.

2. **Community System**
   - User dapat membuat post (text-based).
   - Post memiliki: content, author, timestamp, like_count, view_count.
   - Fitur interaksi: reply, like, delete own post.
   - User hanya bisa menghapus *post yang mereka buat sendiri*.
   - Setiap post dan reply tersimpan di Supabase.
   - UI bergaya modern / sosial media (clean, card-based, smooth spacing).

3. **User System**
   - Login & register menggunakan Supabase Auth.
   - Terdapat session sehingga AI harus memahami konteks:
     - currentUser
     - userId
     - author relationship
   - Setiap user memiliki halaman profil:
     - Informasi dasar
     - Daftar post
     - Daftar karya di marketplace
     - Edit profile

4. **Navigation / Layout**
   - Navbar utama: **Home | Marketplace | Community | Profile**
   - Community menggantikan halaman "Creator" lama.

5. **Database (Conceptual Knowledge AI)**
   - Table: users
   - Table: community_posts
   - Table: community_replies
   - Table: likes (opsional)
   - AI perlu memahami konsep: foreign key, ownership, timestamp, relation.

===========================
📌 Guidelines for All Answers
===========================
- Utamakan konteks Catalis terlebih dahulu.
- Bila user meminta:
  • redesign → berikan ide UI modern, clean, card layout  
  • prompt → berikan instruksi yang dapat dipahami model lain  
  • teks/hero copy → harus sesuai brand Catalis (kreatif, profesional, modern)  
  • penjelasan teknis → jelaskan secukupnya, tidak terlalu mendalam  

- Jika user membahas fitur baru, evaluasi apakah fit dengan alur Catalis.
- Jangan keluar konteks (misalnya membahas blockchain, crypto, Solana, Web3).

===========================
Pertanyaan dari pengguna:
${message}

Jawablah dalam bahasa Indonesia, dengan nada ramah, ringkas, relevan, dan sesuai persona Catalis AI.
`;

  try {
    // If degraded or offline, respond via fallback immediately
    if (degradedMode || !navigator.onLine) {
      const botResponse = fallbackResponse(message);
      hideTypingIndicator();
      addMessage(botResponse, 'bot');
      setStatus(navigator.onLine ? 'degraded' : 'offline');
      return;
    }
    // Call Gemini API with timeout
    console.log("Calling Gemini API...", GEMINI_API_URL);
    const controller = new AbortController();
    const timeout = setTimeout(()=> controller.abort(), 9000);
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contextualPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Response:", errorData);
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("API Response Data:", data);

    let botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!botResponse) botResponse = fallbackResponse(message);

    // Hide typing indicator
    hideTypingIndicator();

    // Add bot response
    addMessage(botResponse, "bot");
    // Reset degraded mode and set status online
    degradedMode = false;
    setStatus('online');

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

    // Fail-safe tanpa menampilkan teks error apa pun
    const fb = fallbackResponse(message);
    addMessage(fb, "bot");
    degradedMode = true;
    setStatus('degraded');
  }
  finally {
    isSending = false;
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
// Fallback response generator (simple intent match)
function fallbackResponse(q) {
  const s = q.toLowerCase();
  if (s.includes('halo') || s.includes('hai') || s.includes('hello')) return 'Halo! Saya Catalis AI Assistant. Saya bisa membantu info produk, cara belanja, pembayaran, dan pertanyaan seputar marketplace Catalis.';
  if (s.includes('catalis') && (s.includes('apa') || s.includes('itu'))) return 'Catalis adalah marketplace produk kreatif di Indonesia untuk artwork, desain, merchandise, dll, dengan pembayaran aman melalui Midtrans.';
  if (s.includes('bayar') || s.includes('pembayaran') || s.includes('metode')) return 'Metode pembayaran: Midtrans (kartu kredit, e‑wallet, transfer bank). Klik “Buy Now” lalu ikuti instruksi checkout.';
  if (s.includes('belanja') || s.includes('cara') || s.includes('checkout')) return 'Cara berbelanja: pilih produk → klik “Buy Now” → isi data → bayar via Midtrans → cek riwayat pesanan di profil.';
  if (s.includes('seller') || s.includes('jualan') || s.includes('penjual')) return 'Untuk menjadi seller, buat akun dan hubungi support. Admin akan mengaktifkan akses seller di panel admin untuk mengelola produk.';
  if (s.includes('marketplace')) return 'Marketplace adalah platform tempat pembeli dan penjual bertemu untuk transaksi produk kreatif. Di Catalis, kamu bisa menemukan artwork, desain, merchandise, dan lainnya.';
  if (s.includes('refund') || s.includes('pengembalian')) return 'Kebijakan pengembalian mengikuti aturan seller. Jika ada masalah pembayaran, hubungi support dengan nomor order Anda.';
  if (s.includes('support') || s.includes('bantuan') || s.includes('cs')) return 'Hubungi hello@catalistcreative.com atau gunakan form kontak di halaman About/Contact untuk bantuan lebih lanjut.';
  return 'Saya belum memahami pertanyaan tersebut. Coba jelaskan kembali atau tanyakan tentang belanja, pembayaran, atau menjadi seller di Catalis.';
}
