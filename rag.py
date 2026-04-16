import os
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains import create_retrieval_chain

CHROMA_DB_DIR = "chroma_db"

# Initialize singletons for embedding 
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_vectorstore():
    if not os.path.exists(CHROMA_DB_DIR):
        print("ChromaDB not found! Please run ingest.py first.")
        return None
    return Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)

def setup_rag_chain():
    # Make sure you have Ollama installed and pulled phi3:
    # Run `ollama run phi3` in a separate terminal.
    llm = Ollama(model="llama3.1")  
    
    # Prompt template for QA
    system_prompt = (
        "You are a senior technical analyst for Betway operations and platform configurations. "
        "Your task is to provide detailed, structured, and highly accurate answers based ONLY on the provided documentation context. "
        "\n\nGUIDELINES:\n"
        "1. EXPLAIN IN DETAIL: Do not provide one-word or overly brief answers. Elaborate on the steps, requirements, or configurations found in the document.\n"
        "2. USE STRUCTURE: Use bullet points, numbered lists, and bold text to make your response easy to read.\n"
        "3. STAY WITHIN CONTEXT: If the information is not in the context, explicitly state: 'The provided document does not contain information regarding [Topic].'\n"
        "4. REGIONAL ACCURACY: Since you are currently analyzing regional documentation (e.g., South Africa), ensure you reference information specific to that context.\n"
        "5. CITE SOURCES: If possible, mention specifically which section or page the information is coming from if provided in the context.\n\n"
        "DOCUMENT CONTEXT:\n{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    
    vectorstore = get_vectorstore()
    if not vectorstore:
         return None
         
    # Expose the retriever (fetches top 3 most relevant chunks)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    return rag_chain

def query_rag(query):
    rag_chain = setup_rag_chain()
    if not rag_chain:
        return {"answer": "Error: Database not found. Please ingest a PDF first."}
        
    try:
        response = rag_chain.invoke({"input": query})
        answer = response["answer"]
        return {"answer": answer}
    except Exception as e:
        return {"answer": f"Error running LLM: {str(e)}\n\n(Did you start Ollama locally?)"}
