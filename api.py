from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import query_rag

app = Flask(__name__)
# Allow requests from Chrome extensions (chrome-extension://*) and localhost
CORS(app, origins=["*"])

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Betway RAG API is running"})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' field in request body"}), 400

    query = data["query"].strip()
    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    # Optional: pass page context from the extension
    page_context = data.get("page_context", "")
    page_url = data.get("page_url", "")

    # Enrich the query with page context if provided
    if page_context:
        enriched_query = (
            f"[Page URL: {page_url}]\n"
            f"[Page Context: {page_context[:500]}]\n\n"
            f"User Question: {query}"
        )
    else:
        enriched_query = query

    result = query_rag(enriched_query)
    return jsonify({
        "answer": result.get("answer", "No answer found."),
        "query": query
    })

if __name__ == "__main__":
    print("=" * 50)
    print("  Betway RAG API Server")
    print("  Running on http://localhost:5000")
    print("  Endpoints:")
    print("    GET  /health  - Check server status")
    print("    POST /chat    - Query the RAG bot")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=False)
