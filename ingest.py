import fitz  # PyMuPDF
import os
import argparse
import shutil
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Directory configuration
CHROMA_DB_DIR = "chroma_db"

def extract_pdf_data(pdf_path):
    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    documents = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        
        if text.strip():
            metadata = {
                "source": pdf_path,
                "page": page_num + 1
            }
            documents.append(Document(page_content=text, metadata=metadata))
            
    print(f"Extracted text documents from {len(documents)} pages.")
    return documents

def chunk_text(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split documents into {len(chunks)} chunks.")
    return chunks

def store_in_chroma(chunks, clear_old=False):
    print("Initializing embedding model (all-MiniLM-L6-v2) ...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    if clear_old and os.path.exists(CHROMA_DB_DIR):
        print("Clearing existing ChromaDB...")
        shutil.rmtree(CHROMA_DB_DIR)
        
    print(f"Adding {len(chunks)} chunks to ChromaDB at {CHROMA_DB_DIR}...")
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_DB_DIR
    )
    print("Data successfully stored in ChromaDB.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest PDF(s) into ChromaDB.")
    parser.add_argument("path", type=str, help="Path to a single PDF or a folder containing multiple PDFs.")
    parser.add_argument("--clear", action="store_true", help="Clear the existing database before ingestion.")
    args = parser.parse_args()
    
    if not os.path.exists(args.path):
        print(f"Error: Could not find path at {args.path}")
        exit(1)
        
    all_docs = []
    if os.path.isdir(args.path):
        print(f"Scanning directory for PDFs: {args.path}")
        for file in os.listdir(args.path):
            if file.lower().endswith(".pdf"):
                pdf_path = os.path.join(args.path, file)
                all_docs.extend(extract_pdf_data(pdf_path))
    else:
        all_docs = extract_pdf_data(args.path)
    
    if all_docs:
        chunks = chunk_text(all_docs)
        store_in_chroma(chunks, clear_old=args.clear)
    else:
        print("No PDF files or text found in the specified path.")
