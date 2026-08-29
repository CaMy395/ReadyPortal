import React, { useState } from "react";
import { Search, Send, ShieldCheck } from "lucide-react";

const STARTER_MESSAGE = {
  role: "assistant",
  text: "Ask me about a gig's staffing and payment status. Include the client name and date when you can.",
};

export default function AssistantHub() {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const authToken = localStorage.getItem("internalAuthToken") || "";
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([STARTER_MESSAGE]);
  const [loading, setLoading] = useState(false);

  const ask = async (prompt = question) => {
    const cleanQuestion = String(prompt || "").trim();
    if (!cleanQuestion || loading) return;

    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: cleanQuestion }]);
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/admin/operations-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ question: cleanQuestion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to check portal records.");

      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.answer, matches: data.matches || [] },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: error.message || "Unable to check portal records right now.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="operations-assistant-page">
      <header className="operations-assistant-header">
        <div>
          <p className="operations-assistant-eyebrow"><ShieldCheck size={16} /> Admin only</p>
          <h1>Operations Assistant</h1>
          <p>Fast, read-only answers from current ReadyPortal gig records.</p>
        </div>
      </header>

      <section className="operations-assistant-shell" aria-label="Operations Assistant chat">
        <div className="operations-assistant-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`operations-message operations-message-${message.role}${message.error ? " operations-message-error" : ""}`}>
              <div className="operations-message-label">{message.role === "user" ? "You" : "Ready Ops"}</div>
              <div className="operations-message-text">{message.text}</div>
              {message.matches?.length > 0 && (
                <div className="operations-match-list">
                  {message.matches.map((match) => (
                    <button type="button" key={match.id} onClick={() => ask(`${match.client} gig on ${match.date}`)}>
                      <strong>{match.client}</strong>
                      <span>{match.date} at {match.time} | {match.eventType}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && <div className="operations-assistant-loading">Checking portal records...</div>}
        </div>

        <div className="operations-assistant-suggestions">
          <button type="button" onClick={() => setQuestion("Is the Latoya gig on 8/31 fully staffed and paid in full?")}>
            <Search size={15} /> Check a client gig
          </button>
          <button type="button" onClick={() => setQuestion("Is the gig on 8/31 fully staffed?")}>
            <Search size={15} /> Check staffing by date
          </button>
        </div>

        <form className="operations-assistant-form" onSubmit={(event) => { event.preventDefault(); ask(); }}>
          <label htmlFor="operations-question">Ask about a gig</label>
          <div className="operations-assistant-input-row">
            <textarea
              id="operations-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Is the Latoya gig on 8/31 fully staffed? Is it paid in full?"
              rows={2}
              maxLength={500}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask();
                }
              }}
            />
            <button type="submit" disabled={loading || !question.trim()} title="Ask Operations Assistant" aria-label="Ask Operations Assistant">
              <Send size={19} />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
