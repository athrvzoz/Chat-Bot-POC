// ============================================================
//  Betway RAG Assistant — Content Script
//  Injected into betway.co.za / betway.com pages
// ============================================================

(function () {
  "use strict";

  let chatOpen = false;
  let isWaiting = false;

  // ---- Helpers ----
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getPageContext() {
    // Grab visible text from key areas to send as context
    const title = document.title || "";
    const url = window.location.href;
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .slice(0, 5)
      .map((h) => h.textContent.trim())
      .join(", ");
    const breadcrumbs = Array.from(
      document.querySelectorAll('[class*="breadcrumb"] a, nav a')
    )
      .slice(0, 6)
      .map((a) => a.textContent.trim())
      .filter(Boolean)
      .join(" > ");

    return {
      url,
      context: `Page: ${title}. Headings: ${headings}. Navigation: ${breadcrumbs}`,
    };
  }

  // ---- SVG Icons ----
  const ICONS = {
    chat: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    bot: `<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1H3v-1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM5 19h14a2 2 0 01-2 2H7a2 2 0 01-2-2z"/></svg>`,
    pin: `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  };

  // ---- Build widget DOM ----
  function createWidget() {
    // Container
    const widget = document.createElement("div");
    widget.id = "bw-rag-widget";

    // FAB
    const fab = document.createElement("button");
    fab.id = "bw-rag-fab";
    fab.title = "Ask the Betway Assistant";
    fab.innerHTML = ICONS.chat;
    fab.addEventListener("click", toggleChat);

    // Chat window
    const chat = document.createElement("div");
    chat.id = "bw-rag-chat";
    chat.innerHTML = `
      <div class="bw-chat-header">
        <div class="bw-chat-header-icon">${ICONS.bot}</div>
        <div class="bw-chat-header-text">
          <div class="bw-chat-header-title">Betway RAG Assistant</div>
          <div class="bw-chat-header-subtitle">
            <span class="bw-status-dot" id="bw-status-dot"></span>
            <span id="bw-status-text">Connecting…</span>
          </div>
        </div>
        <button class="bw-chat-close" id="bw-chat-close" title="Close">${ICONS.close}</button>
      </div>

      <div class="bw-chat-messages" id="bw-messages"></div>

      <div class="bw-quick-actions" id="bw-quick-actions">
        <button class="bw-quick-btn" data-q="What sports can I bet on?">🏈 Sports available</button>
        <button class="bw-quick-btn" data-q="How do I place a bet on soccer?">⚽ Place a soccer bet</button>
        <button class="bw-quick-btn" data-q="How does the accumulator work?">📊 Accumulator info</button>
        <button class="bw-quick-btn" data-q="What promotions are available?">🎁 Promotions</button>
      </div>

      <div class="bw-context-badge" id="bw-context-badge">
        ${ICONS.pin}
        <span id="bw-context-url"></span>
      </div>

      <div class="bw-chat-input-area">
        <textarea class="bw-chat-input" id="bw-chat-input"
          placeholder="Ask about this page or Betway…"
          rows="1"></textarea>
        <button class="bw-chat-send" id="bw-chat-send" title="Send">${ICONS.send}</button>
      </div>
    `;

    widget.appendChild(chat);
    widget.appendChild(fab);
    document.body.appendChild(widget);

    // Bind events
    document.getElementById("bw-chat-close").addEventListener("click", toggleChat);
    document.getElementById("bw-chat-send").addEventListener("click", sendMessage);

    const input = document.getElementById("bw-chat-input");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

    // Quick action buttons
    document.querySelectorAll(".bw-quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.getAttribute("data-q");
        input.value = q;
        sendMessage();
      });
    });

    // Update context badge
    document.getElementById("bw-context-url").textContent = window.location.href;

    // Check API status
    checkApiStatus();
  }

  // ---- Toggle chat ----
  function toggleChat() {
    chatOpen = !chatOpen;
    const chat = document.getElementById("bw-rag-chat");
    const fab = document.getElementById("bw-rag-fab");

    if (chatOpen) {
      chat.classList.add("bw-visible");
      fab.classList.add("bw-open");
      fab.innerHTML = ICONS.close.replace(
        "<svg",
        '<svg style="width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2.5"'
      );
      document.getElementById("bw-chat-input").focus();

      // Welcome message on first open
      const messages = document.getElementById("bw-messages");
      if (messages.children.length === 0) {
        addMessage(
          "system",
          "👋 Hi! I'm your Betway RAG Assistant. I can answer questions about the site using your local documentation. Ask me anything!"
        );
      }
    } else {
      chat.classList.remove("bw-visible");
      fab.classList.remove("bw-open");
      fab.innerHTML = ICONS.chat;
    }
  }

  // ---- Add message to chat ----
  function addMessage(type, text) {
    const messages = document.getElementById("bw-messages");
    const msg = document.createElement("div");
    msg.className = `bw-msg bw-${type}`;

    // Simple markdown-ish formatting for bot responses
    if (type === "bot") {
      text = text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br>");
      msg.innerHTML = text;
    } else {
      msg.textContent = text;
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
    return msg;
  }

  // ---- Show/hide typing indicator ----
  function showTyping() {
    const messages = document.getElementById("bw-messages");
    const typing = document.createElement("div");
    typing.className = "bw-typing";
    typing.id = "bw-typing-indicator";
    typing.innerHTML = `
      <div class="bw-typing-dot"></div>
      <div class="bw-typing-dot"></div>
      <div class="bw-typing-dot"></div>
    `;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("bw-typing-indicator");
    if (el) el.remove();
  }

  // ---- Send message (via background service worker) ----
  async function sendMessage() {
    if (isWaiting) return;

    const input = document.getElementById("bw-chat-input");
    const query = input.value.trim();
    if (!query) return;

    input.value = "";
    input.style.height = "auto";

    // Hide quick actions after first send
    const qa = document.getElementById("bw-quick-actions");
    if (qa) qa.style.display = "none";

    addMessage("user", query);
    showTyping();

    const sendBtn = document.getElementById("bw-chat-send");
    sendBtn.disabled = true;
    isWaiting = true;

    const pageCtx = getPageContext();

    chrome.runtime.sendMessage(
      {
        type: "CHAT_QUERY",
        query: query,
        page_context: pageCtx.context,
        page_url: pageCtx.url,
      },
      (response) => {
        hideTyping();

        if (chrome.runtime.lastError) {
          addMessage(
            "bot",
            "⚠️ **Extension error.**\n\nTry reloading the extension from chrome://extensions."
          );
        } else if (response && response.success) {
          addMessage("bot", response.answer);
        } else {
          addMessage(
            "bot",
            `⚠️ ${response?.error || "Cannot reach the RAG server."}\n\nMake sure \`api.py\` is running:\n\`python api.py\``
          );
        }

        sendBtn.disabled = false;
        isWaiting = false;
        input.focus();
      }
    );
  }

  // ---- Check API health (via background service worker) ----
  function checkApiStatus() {
    const dot = document.getElementById("bw-status-dot");
    const text = document.getElementById("bw-status-text");

    chrome.runtime.sendMessage({ type: "HEALTH_CHECK" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        dot.classList.add("bw-offline");
        text.textContent = "Extension error";
        return;
      }
      if (response.online) {
        dot.classList.remove("bw-offline");
        text.textContent = "Local RAG — Online";
      } else {
        dot.classList.add("bw-offline");
        text.textContent = "Offline — start api.py";
      }
    });
  }

  // ---- Initialize ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
