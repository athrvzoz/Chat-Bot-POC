// Betway RAG Assistant — Popup Script

const API_BASE = "http://localhost:5000";

async function checkStatus() {
  const indicator = document.getElementById("status-indicator");
  const message = document.getElementById("status-message");

  indicator.className = "status-indicator";
  message.textContent = "Checking…";

  try {
    const resp = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      indicator.classList.add("online");
      message.textContent = "RAG server is online ✓";
    } else {
      indicator.classList.add("offline");
      message.textContent = "Server error — check terminal";
    }
  } catch (err) {
    indicator.classList.add("offline");
    message.textContent = "Offline — run python api.py";
  }
}

// Region buttons — open the selected region's Betway site
document.querySelectorAll(".region-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const url = btn.getAttribute("data-url");
    chrome.tabs.create({ url });
  });
});

// Check status button
document.getElementById("check-btn").addEventListener("click", checkStatus);

// Check on open
checkStatus();
