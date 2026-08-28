import React, { useState } from "react";
import "../../App.css";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I’m Ready Assistant. Ask me about services, staffing, booking, payment policies, or classes.",
};

const renderMessageContent = (content) =>
  content.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
    if (!part.startsWith("http")) return part;

    const url = part.replace(/[.,!?;:)]+$/, "");
    const trailingPunctuation = part.slice(url.length);

    return (
      <React.Fragment key={`${url}-${index}`}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
        {trailingPunctuation}
      </React.Fragment>
    );
  });

const Chatbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const handleSendQuestion = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    const userMessage = { role: "user", content: trimmedQuestion };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const history = messages
        .filter((message) => ["user", "assistant"].includes(message.role))
        .slice(-8);

      const res = await fetch(`${apiUrl}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.answer || "Assistant request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "I’ll need the Ready team to confirm that for you.",
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
      handleSendQuestion();
    }
  };

  return (
    <div className="chatbox-container">
      <div className={`chatbox ${isOpen ? "open" : ""}`}>
        <button
          type="button"
          className="chatbox-header"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
        >
          {isOpen ? "Ready Assistant — Close" : "Chat with Ready Assistant"}
        </button>

        {isOpen && (
          <div className="chatbox-body">
            <div className="chatbox-messages" aria-live="polite">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`chatbox-message ${message.role}`}
                >
                  <div className="chatbox-bubble">
                    {renderMessageContent(message.content)}
                    {message.needsHuman && (
                      <div className="chatbox-human-note">
                        Please use the link above to contact Ready.
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="chatbox-typing">Ready Assistant is typing…</div>}
            </div>

            <textarea
              rows="2"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              disabled={loading}
              aria-label="Message Ready Assistant"
            />
            <button
              type="button"
              className="chatbox-send"
              onClick={handleSendQuestion}
              disabled={loading || !question.trim()}
            >
              {loading ? "Thinking..." : "Send"}
            </button>
            <p className="chatbox-security-note">
              Please don’t send card numbers, CVV codes, or banking passwords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbox;
