import streamlit as st
from rag import query_rag

st.set_page_config(page_title="App Region Chatbot", page_icon="🤖", layout="wide")

st.title("🤖 Local App Document Chatbot")
st.markdown("💬 Ask questions about the App from the ingested documentation. (Runs 100% locally)")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat messages from history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Accept user input
if prompt := st.chat_input("What is the functionality in Region 3?"):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message
    with st.chat_message("user"):
        st.markdown(prompt)

    # Generate assistant response
    with st.chat_message("assistant"):
        with st.spinner("Thinking (Querying local LLM and Vector Store)..."):
            response_data = query_rag(prompt)
            answer = response_data["answer"]
            
            st.markdown(answer)
                            
    # Add assistant response to chat history
    st.session_state.messages.append({
        "role": "assistant",
        "content": answer
    })
