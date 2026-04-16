import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for the Chrome Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration - Replace with your API Key or set environment variable
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

class ScrapeRequest(BaseModel):
    html: str
    url: str

@app.post("/process_html")
async def process_html(data: ScrapeRequest):
    print(f"Received scrape from: {data.url}")
    
    # Prompt Gemini to clean the HTML/Text
    prompt = (
        f"The following is raw text scraped from a website ({data.url}). "
        "Please extract the key technical information, facts, and steps. "
        "Ignore ads, navigation menus, and footers. Output only the clean, concise technical content."
        f"\n\nRaw Content:\n{data.html[:10000]}" # Limit size
    )
    
    try:
        response = model.generate_content(prompt)
        cleaned_text = response.text
        
        # Save to a temporary context file that rag.py can read
        with open("web_context.txt", "w", encoding="utf-8") as f:
            f.write(f"SOURCE: {data.url}\n\n{cleaned_text}")
            
        return {"status": "success", "message": "Context stored in web_context.txt"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("Gemini Bridge starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
