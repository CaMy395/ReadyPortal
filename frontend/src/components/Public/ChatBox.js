import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from '../../apiConfig';
import { chatRequest, ensureVisitorSession, mergeChatMessages, visitorMessagesPath } from '../../liveVisitorChat';
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

const Chatbox = ({ portal = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [channel,setChannel]=useState(portal ? 'team' : 'assistant');
  const [teamMessages,setTeamMessages]=useState([]);
  const [teamActive,setTeamActive]=useState(false);
  const [chatError,setChatError]=useState('');
  const teamActiveRef=useRef(false);
  const cursor=useRef('0');
  const endRef=useRef(null);
  const pendingMessage=useRef(null);

  const apiUrl = API_BASE_URL;
  useEffect(() => { if (portal) setChannel('team'); },[portal]);
  useEffect(() => {
    let stopped=false;
    let polling=false;
    let lastTeamMessage='0';
    try { lastTeamMessage=localStorage.getItem('readyChatLastTeamMessage') || '0'; } catch { /* Private browsing. */ }
    const poll=async () => {
      if (polling || document.visibilityState!=='visible') return;
      polling=true;
      try {
        await ensureVisitorSession();
        const data=await chatRequest(visitorMessagesPath(cursor.current),undefined,{ visitor:true });
        if (stopped) return;
        setTeamMessages(current => mergeChatMessages(current,data.messages));
        if (data.messages.length) cursor.current=data.messages[data.messages.length-1].id;
        teamActiveRef.current=data.visitor.team_active;
        setTeamActive(data.visitor.team_active);
        const incoming=data.messages.filter(message => message.sender==='admin' && Number(message.id)>Number(lastTeamMessage));
        if (incoming.length) {
          lastTeamMessage=incoming[incoming.length-1].id;
          try { localStorage.setItem('readyChatLastTeamMessage',String(lastTeamMessage)); } catch { /* Private browsing. */ }
          setChannel('team'); setIsOpen(true);
        }
        if (data.visitor.team_active) setChannel('team');
        setChatError('');
      } catch (error) { if (!stopped) setChatError(error.message); }
      finally { polling=false; }
    };
    poll();
    const timer=setInterval(poll,3000);
    document.addEventListener('visibilitychange',poll);
    return () => { stopped=true; clearInterval(timer); document.removeEventListener('visibilitychange',poll); };
  },[]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block:'nearest' }); },[teamMessages,messages,isOpen,channel]);

  const handleSendQuestion = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    if (channel==='team' || teamActiveRef.current) {
      setLoading(true); setChatError('');
      // A retry keeps the same message UUID so it cannot send the message twice.
      if (pendingMessage.current?.content!==trimmedQuestion) pendingMessage.current={ content:trimmedQuestion,messageId:crypto.randomUUID() };
      try {
        await ensureVisitorSession();
        const data=await chatRequest('/visitor/messages',pendingMessage.current,{ visitor:true });
        setTeamMessages(current => mergeChatMessages(current,[data.message]));
        pendingMessage.current=null; setQuestion(''); setChannel('team');
        setTeamActive(true); teamActiveRef.current=true;
      } catch (error) { setChatError(error.message); }
      finally { setLoading(false); }
      return;
    }

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

      // A team member may have joined while the AI response was in flight.
      const live=await chatRequest(visitorMessagesPath(cursor.current),undefined,{ visitor:true }).catch(() => null);
      if (live?.visitor.team_active || teamActiveRef.current) {
        teamActiveRef.current=true; setTeamActive(true); setChannel('team');
        return;
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
    <div className={`chatbox-container${portal ? ' chatbox-portal' : ''}`}>
      <div className={`chatbox ${isOpen ? "open" : ""}`}>
        <button
          type="button"
          className="chatbox-header"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
        >
          <span>{portal ? 'Team messages' : teamActive || channel==='team' ? 'Chat with the Ready team' : isOpen ? "Ready Assistant" : "Chat with Ready"}</span>
          <span className="chatbox-toggle-icon" aria-hidden="true">
            {isOpen ? "×" : ""}
          </span>
        </button>

        {isOpen && (
          <div className="chatbox-body">
            <div className="chatbox-channels" aria-label="Chat options">
              {!portal && <button type="button" disabled={teamActive || loading} aria-pressed={channel==='assistant'} onClick={() => setChannel('assistant')}>Ready Assistant</button>}
              <button type="button" disabled={loading} aria-pressed={channel==='team'} onClick={() => setChannel('team')}>Talk to the team</button>
            </div>
            <p className="chatbox-human-note">
              {channel==='team' ? 'Your messages here go directly to the Ready team. If a team member is away, replies may take longer. ' : 'For help from a person, choose Talk to the team. '}
              <a href="sms:+13059827850">Text us at 305-982-7850</a>.
              {" "}Opens your messaging app. You can also text this number from your phone.
            </p>
            <div className="chatbox-messages" aria-live="polite">
              {channel==='team' && teamMessages.length===0 && <p className="chatbox-human-note">Send a message to start a conversation. No account is needed.</p>}
              {(channel==='team' ? teamMessages.map(message => ({ ...message,role:message.sender==='visitor' ? 'user' : 'assistant' })) : messages).map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`chatbox-message ${message.role}`}
                >
                  <div className="chatbox-bubble">
                    {channel==='team' && <strong className="chatbox-sender">{message.role==='user' ? 'You' : `${message.sender_name} · Ready team`}</strong>}
                    {renderMessageContent(message.content)}
                    {message.needsHuman && (
                      <div className="chatbox-human-note">
                        <a href="sms:+13059827850">Text the Ready team at 305-982-7850</a> for help.
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="chatbox-typing">{channel==='team' ? 'Sending…' : 'Ready Assistant is typing…'}</div>}
              <div ref={endRef} />
            </div>

            <textarea
              rows="2"
              maxLength={2000}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={channel==='team' ? 'Message the Ready team…' : "Type your question..."}
              disabled={loading}
              aria-label={channel==='team' ? 'Message the Ready team' : "Message Ready Assistant"}
            />
            <button
              type="button"
              className="chatbox-send"
              onClick={handleSendQuestion}
              disabled={loading || !question.trim()}
            >
              {loading ? channel==='team' ? 'Sending…' : "Thinking..." : "Send"}
            </button>
            {chatError && <p role="status" className="chatbox-human-note">{chatError} You can also use the text link above.</p>}
            <p className="chatbox-security-note">Team conversations are saved so the Ready team can respond.</p>
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
