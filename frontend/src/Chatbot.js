// frontend/src/components/Chatbot.js
import React, { useState } from "react";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I’m Ready Assistant. I can help with services, staffing, booking, payment policies, classes, and general event questions. What can I help you with?",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const handleAskQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    const userMessage = {
      role: "user",
      content: trimmedQuestion,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);

    try {
      const history = messages
        .filter((message) => ["user", "assistant"].includes(message.role))
        .slice(-8);

      const res = await fetch(`${apiUrl}/api/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to get assistant response");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            data.answer ||
            "I’ll need the Ready team to confirm that for you.",
          needsHuman: Boolean(data.needsHuman),
        },
      ]);
    } catch (error) {
      console.error("Ready Assistant error:", error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Sorry, I’m having trouble answering right now. Please contact the Ready team for assistance.",
          needsHuman: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div
      style={{
        maxWidth: "650px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: "6px" }}>Ready Assistant</h2>

      <p style={{ marginTop: 0, opacity: 0.7 }}>
        Ask us about Ready Bartending services and booking.
      </p>

      <div
        style={{
          minHeight: "340px",
          maxHeight: "500px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "16px",
          background: "#fafafa",
          marginBottom: "12px",
        }}
      >
        {messages.map((message, index) => {
          const isUser = message.role === "user";

          return (
            <div
              key={`${message.role}-${index}`}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  whiteSpace: "pre-wrap",
                  background: isUser ? "#111" : "#fff",
                  color: isUser ? "#fff" : "#111",
                  border: isUser ? "none" : "1px solid #e5e5e5",
                }}
              >
                {message.content}

                {message.needsHuman && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    Please use the provided contact link.
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ fontSize: "14px", opacity: 0.65 }}>
            Ready Assistant is typing…
          </div>
        )}
      </div>

      <textarea
        rows="3"
        placeholder="Type your question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          resize: "vertical",
        }}
      />

      <button
        type="button"
        onClick={handleAskQuestion}
        disabled={loading || !question.trim()}
        style={{
          marginTop: "10px",
          padding: "10px 18px",
          borderRadius: "8px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Thinking..." : "Send"}
      </button>

      <p style={{ fontSize: "12px", opacity: 0.6, marginTop: "12px" }}>
        Do not send card numbers, CVV codes, banking passwords, or other
        sensitive payment information in chat.
      </p>
    </div>
  );
};

export default Chatbot;
