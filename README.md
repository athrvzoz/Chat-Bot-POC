# Betway RAG Assistant

A Chrome extension that provides AI-powered guidance on Betway sites across all regions, using your local RAG chatbot.

## Features
- **Local AI**: Runs entirely on your machine (Ollama + ChromaDB)
- **Regional Support**: ZA, GH, TZ, NG, ZM, MZ, MW, BW
- **Context-Aware**: Automatically detects the page you're on
- **Privacy-First**: No data sent to external servers

## Architecture
- **Vector Store**: ChromaDB
- **Local Embeddings**: `sentence-transformers/all-MiniLM-L6-v2`
- **Local LLM**: Ollama (`llama3.1`)
- **API Server**: Flask (localhost:5000)
- **Extension**: Chrome Manifest V3

## Setup Instructions

### 1. Install Python Dependencies
```bash
py -3.13 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install and Run Ollama
Download from [ollama.com](https://ollama.com/) and run:
```bash
ollama run llama3.1
```
Keep this terminal open.

### 3. Ingest Your Documentation
Place PDFs in the `docs/` folder, then:
```bash
.venv\Scripts\activate
python ingest.py "docs/" --clear
```

### 4. Start the API Server
```bash
.venv\Scripts\activate
python api.py
```
This runs on http://localhost:5000

### 5. Load the Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the `chrome_extension/` folder
4. The extension should appear in your toolbar

### 6. Use the Extension
- Navigate to any Betway regional site (e.g., betway.co.za)
- Click the green chat bubble in the bottom-right corner
- Ask questions about the site or functionality
- The AI will use your ingested docs to provide accurate answers

## How It Works
- The extension detects Betway URLs and injects a chat widget
- Queries are sent to your local Flask API
- The API queries the RAG system (ChromaDB + Ollama)
- Responses are context-aware, using page URL and content
