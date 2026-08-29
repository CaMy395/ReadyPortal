import React, { useEffect, useState } from "react";
import { Search, Send, ShieldCheck } from "lucide-react";

const STARTER_MESSAGE = {
  role: "assistant",
  text: "Ask me about gigs, staffing, payments, staff, clients, tasks, inventory, or appointments. I can check records, but I cannot change them.",
};

export default function AssistantHub() {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const authToken = localStorage.getItem("internalAuthToken") || "";
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([STARTER_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

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
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        const fallbackMessage = response.status === 404
          ? "The Operations Assistant is not loaded on the server yet. Restart the backend and try again."
          : "Unable to check portal records.";
        throw new Error(data?.error || fallbackMessage);
      }

      if (!data?.answer) {
        throw new Error("The Operations Assistant returned an invalid response. Please try again.");
      }

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
    <aside className={`operations-assistant-widget${isOpen ? " open" : ""}`} aria-label="Operations Assistant">
      {isOpen && (
        <section className="operations-assistant-panel">
          <header className="operations-assistant-panel-header">
            <div><ShieldCheck size={18} /><span>Ready Ops</span><small>Admin only</small></div>
            <button
              type="button"
              className="operations-assistant-close"
              onClick={() => setIsOpen(false)}
              title="Close Ready Ops"
              aria-label="Close Ready Ops"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

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
            <button type="button" onClick={() => setQuestion("Which upcoming gigs are not fully staffed?")}><Search size={15} /> Staffing gaps</button>
            <button type="button" onClick={() => setQuestion("Which open tasks are overdue or high priority?")}><Search size={15} /> Open tasks</button>
            <button type="button" onClick={() => setQuestion("Which active inventory items are low in stock?")}><Search size={15} /> Low inventory</button>
          </div>

          <form className="operations-assistant-form" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <label htmlFor="operations-question">Ask about a gig</label>
            <div className="operations-assistant-input-row">
              <textarea id="operations-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Latoya on 8/31: staffed and paid?" rows={2} maxLength={500} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }} />
              <button type="submit" disabled={loading || !question.trim()} title="Ask Operations Assistant" aria-label="Ask Operations Assistant"><Send size={19} /></button>
            </div>
          </form>
        </section>
      )}

      {!isOpen && (
        <button type="button" className="operations-assistant-launcher" onClick={() => setIsOpen(true)} aria-label="Open Operations Assistant">
          <ShieldCheck size={19} /> Ask Ready Ops
        </button>
      )}
    </aside>
  );
}
