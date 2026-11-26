import { API_BASE_URL } from "../../apiConfig";
import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import "./AdminEmailCampaign.css";

const API = API_BASE_URL;
const easternTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York",
});
const errorMessage = (error, fallback) => error.response?.data?.error || fallback;

export default function AdminEmailCampaign() {
  const [channel, setChannel] = useState("email");
  const [mode, setMode] = useState("now");
  const [subject, setSubject] = useState("");
  const [messages, setMessages] = useState({ email: "", sms: "" });
  const [image, setImage] = useState(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [audience, setAudience] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [log, setLog] = useState(null);
  const [audienceError, setAudienceError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [logError, setLogError] = useState("");
  const [notice, setNotice] = useState(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const fileInput = useRef(null);

  const isEmail = channel === "email";
  const scheduling = isEmail && mode === "later";
  const message = messages[channel];
  const audienceCount = audience?.[channel];
  const valid = Boolean(message.trim() && (!isEmail || subject.trim()) && (!scheduling || scheduledAt));
  const canSend = valid && (scheduling || audienceCount > 0);

  const loadAudience = useCallback(async () => {
    setAudienceError("");
    try {
      const { data } = await axios.get(`${API}/admin/email-campaign-audience`);
      setAudience(data);
    } catch (error) {
      setAudience(null);
      setAudienceError(errorMessage(error, "Could not load the audience."));
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueError("");
    try {
      const { data } = await axios.get(`${API}/admin/scheduled-campaigns`);
      setCampaigns(data.campaigns);
    } catch (error) {
      setQueueError(errorMessage(error, "Could not load scheduled emails."));
    }
  }, []);

  const loadLog = async () => {
    setLogError("");
    try {
      const { data } = await axios.get(`${API}/admin/email-campaign-log`);
      setLog(data);
    } catch (error) {
      setLogError(errorMessage(error, "Could not load email activity."));
    }
  };

  useEffect(() => {
    loadAudience();
    loadQueue();
  }, [loadAudience, loadQueue]);

  const selectChannel = (next) => {
    setChannel(next);
    setReview(false);
    setNotice(null);
  };

  const send = async () => {
    if (lock.current || !canSend || !review) return;
    lock.current = true;
    setBusy(true);
    setReview(false);
    setNotice(null);

    try {
      if (isEmail) {
        const content = new FormData();
        content.append("subject", subject.trim());
        content.append("message", message.trim());
        if (image) content.append("image", image);
        if (scheduling) content.append("scheduledSendAt", `${scheduledAt.replace("T", " ")}:00`);
        const endpoint = scheduling ? "/admin/scheduled-campaigns" : "/api/send-campaign";
        const { data } = await axios.post(API + endpoint, content);
        if (scheduling) {
          setNotice({ text: "Email campaign scheduled." });
          await loadQueue();
        } else {
          showResult(data);
          await loadLog();
        }
      } else {
        const { data } = await axios.post(`${API}/api/send-sms-campaign`, { message: message.trim() });
        showResult(data);
      }
    } catch (error) {
      setNotice({ error: true, text: errorMessage(error, "The result could not be confirmed. Check activity before sending again.") });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const showResult = ({ attempted, sent, failed }) => {
    setNotice({
      error: failed > 0 || !attempted,
      text: attempted
        ? `${sent} accepted by the provider · ${failed} failed`
        : "No eligible recipients at send time.",
    });
  };

  const cancelCampaign = async (id) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setQueueError("");
    try {
      await axios.post(`${API}/admin/scheduled-campaigns/${id}/cancel`);
      await loadQueue();
    } catch (error) {
      await loadQueue();
      setQueueError(errorMessage(error, "Could not cancel the campaign."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="campaign-page">
      <header className="campaign-hero">
        <h1>Campaigns</h1>
        <p>Send email and text updates to clients who opted in to each channel.</p>
      </header>

      <div className="campaign-layout">
        <section className="campaign-panel" aria-labelledby="campaign-compose">
          <h2 id="campaign-compose">Compose campaign</h2>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (canSend && !busy) setReview(true);
          }}>
            <fieldset disabled={busy || review}>
              <legend>Channel</legend>
              <div className="campaign-options">
                <button type="button" aria-pressed={isEmail} onClick={() => selectChannel("email")}>Email</button>
                <button type="button" aria-pressed={!isEmail} onClick={() => selectChannel("sms")}>SMS</button>
              </div>
              {isEmail && (
                <label>Subject
                  <input required value={subject} onChange={(event) => setSubject(event.target.value)}
                    maxLength={200} placeholder="Enter an email subject" />
                </label>
              )}
              <label>{isEmail ? "Email message" : "Text message"}
                <textarea required rows={7} value={message} maxLength={isEmail ? undefined : 450}
                  placeholder={isEmail ? "Write your email…" : "Write your text…"}
                  onChange={(event) => setMessages({ ...messages, [channel]: event.target.value })} />
              </label>
              {!isEmail && <p className="campaign-hint">{message.length}/450 characters. Sender and opt-out instructions are added automatically.</p>}
              {isEmail && (
                <>
                  <label>Image attachment <span className="campaign-hint">(optional)</span>
                    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(event) => {
                        const file = event.target.files[0];
                        if (file?.size > 5 * 1024 * 1024) {
                          event.target.value = "";
                          setImage(null);
                          setNotice({ error: true, text: "Choose an image up to 5 MB." });
                        } else {
                          setNotice(null);
                          setImage(file || null);
                        }
                      }} />
                  </label>
                  {image && (
                    <div className="campaign-options">
                      <span className="campaign-hint">Attached {image.name}</span>
                      <button type="button" onClick={() => {
                        fileInput.current.value = "";
                        setImage(null);
                      }}>Remove image</button>
                    </div>
                  )}
                  <label>Send timing
                    <select value={mode} onChange={(event) => setMode(event.target.value)}>
                      <option value="now">Send now</option>
                      <option value="later">Schedule for later</option>
                    </select>
                  </label>
                  {scheduling && (
                    <label>Send date and time (Eastern)
                      <input type="datetime-local" required value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)} />
                    </label>
                  )}
                </>
              )}
              {!review && <button type="submit" className="campaign-primary" disabled={!canSend}>
                {busy ? "Working…" : "Review campaign"}
              </button>}
            </fieldset>
          </form>
          {review && (
            <div className="campaign-review" role="region" aria-label="Review campaign">
              <strong>{scheduling ? "Confirm schedule" : `Confirm ${isEmail ? "email" : "SMS"} send`}</strong>
              <p>{scheduling
                ? "The email will go to clients eligible at the scheduled time."
                : `${audienceCount} eligible recipients now. Consent is checked again at send time.`}</p>
              {isEmail && <strong>{subject}</strong>}
              <p className="campaign-preview">{message}</p>
              {isEmail && image && <p className="campaign-hint">Attachment {image.name}</p>}
              <div className="campaign-options">
                <button className="campaign-primary" type="button" onClick={send}>{scheduling ? "Schedule email" : `Send ${isEmail ? "email" : "SMS"}`}</button>
                <button type="button" onClick={() => setReview(false)}>Back to editing</button>
              </div>
            </div>
          )}
          {busy && <p role="status">Processing campaign request…</p>}
          {notice && <p className={notice.error ? "campaign-error" : "campaign-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
        </section>

        <aside className="campaign-panel campaign-audience">
          <div className="campaign-section-header">
            <h2>Opted-in audience</h2>
            <button type="button" disabled={busy || review} onClick={loadAudience}>Refresh</button>
          </div>
          <dl>
            <div><dt>Email recipients</dt><dd>{audience?.email ?? "—"}</dd></div>
            <div><dt>SMS recipients</dt><dd>{audience?.sms ?? "—"}</dd></div>
          </dl>
          {audienceError && <p className="campaign-error" role="alert">{audienceError}</p>}
          {audienceCount === 0 && <p className="campaign-hint">No clients are eligible for {isEmail ? "email" : "SMS"} yet.</p>}
          <p className="campaign-hint">Clients can sign up on the inquiry form or in their communication preferences.</p>
        </aside>
      </div>

      <section className="campaign-panel">
        <div className="campaign-section-header">
          <h2>Scheduled emails</h2>
          <button type="button" disabled={busy} onClick={loadQueue}>Refresh</button>
        </div>
        {queueError && <p role="alert" className="campaign-error">{queueError}</p>}
        {!queueError && campaigns === null && <p className="campaign-hint">Loading scheduled emails…</p>}
        {campaigns?.length === 0 && <p className="campaign-hint">No scheduled emails yet.</p>}
        {campaigns?.map((campaign) => (
          <div className="campaign-row" key={campaign.id}>
            <div>
              <strong>{campaign.subject}</strong>
              <div className="campaign-hint">{easternTime.format(new Date(campaign.scheduled_send_at))} ET</div>
              {campaign.last_error && <div className="campaign-hint">{campaign.last_error}</div>}
            </div>
            <span className="campaign-state">{campaign.status}</span>
            {campaign.status === "scheduled" && <button disabled={busy} type="button" onClick={() => cancelCampaign(campaign.id)}>Cancel</button>}
          </div>
        ))}
      </section>

      <section className="campaign-panel">
        <div className="campaign-section-header">
          <h2>Email activity</h2>
          <button type="button" onClick={loadLog}>{log ? "Refresh" : "Load activity"}</button>
        </div>
        {logError && <p role="alert" className="campaign-error">{logError}</p>}
        {log && <p className="campaign-hint">{log.sent || 0} accepted by the provider · {log.failed || 0} failed</p>}
        {log?.entries.length === 0 && <p className="campaign-hint">No email activity yet.</p>}
        {Boolean(log?.entries.length) && (
          <ul className="campaign-log">
            {log.entries.slice().reverse().map((entry, index) => (
              <li className="campaign-row" key={index}>
                <span>{entry.email || entry.raw}</span>
                <span className="campaign-state">{entry.status === "sent" ? "Accepted" : entry.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
