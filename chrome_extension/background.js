// ============================================================
//  Betway RAG Assistant — Background Service Worker
//  Proxies API requests from content script to localhost
//  (avoids HTTPS→HTTP mixed content blocking)
// ============================================================

const API_BASE = "http://localhost:5000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHAT_QUERY") {
    fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: message.query,
        page_context: message.page_context || "",
        page_url: message.page_url || "",
      }),
    })
      .then((resp) => {
        if (!resp.ok) {
          return resp.json().catch(() => ({})).then((errData) => {
            sendResponse({
              success: false,
              error: errData.error || `Server returned ${resp.status}`,
            });
          });
        }
        return resp.json().then((data) => {
          sendResponse({ success: true, answer: data.answer || "No answer received." });
        });
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: "Cannot reach the RAG server. Make sure api.py is running.",
        });
      });

    // Return true to indicate we'll respond asynchronously
    return true;
  }

  if (message.type === "HEALTH_CHECK") {
    fetch(`${API_BASE}/health`, { method: "GET" })
      .then((resp) => {
        if (resp.ok) {
          sendResponse({ online: true });
        } else {
          sendResponse({ online: false });
        }
      })
      .catch(() => {
        sendResponse({ online: false });
      });

    return true;
  }
});
