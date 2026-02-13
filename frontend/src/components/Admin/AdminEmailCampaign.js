// AdminEmailCampaign.js (FULL PASTE-IN — Style B: separated sections)
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function AdminEmailCampaign() {
  // shared campaign content
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // email image attachment (optional)
  const [image, setImage] = useState(null);

  // statuses
  const [status, setStatus] = useState("");
  const [smsStatus, setSmsStatus] = useState("");
  const [logStatus, setLogStatus] = useState("");

  // scheduling
  const [scheduledAt, setScheduledAt] = useState(""); // datetime-local string
  const [scheduledStatus, setScheduledStatus] = useState("");
  const [scheduledList, setScheduledList] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // log data
  const [logData, setLogData] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    entries: [],
    message: "",
  });

  const convertToEST = (raw) => {
    const match = raw?.match?.(/\[(.*?)\]/);
    if (!match) return raw;
    const utcDateStr = match[1];
    const estDate = new Date(utcDateStr).toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
    return raw.replace(match[1], estDate);
  };

  const fmtLocalNY = (dt) => {
    if (!dt) return "N/A";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString("en-US", { timeZone: "America/New_York" });
  };

  // Converts <input datetime-local> value to "YYYY-MM-DD HH:mm:00"
  // (works clean with Postgres timestamp parsing)
  const toPgTimestampString = (dtLocal) => {
    if (!dtLocal) return "";
    // dtLocal is like "2026-02-13T22:15"
    return `${dtLocal.replace("T", " ")}:00`;
  };

  // ----------------------------
  // SEND NOW: EMAIL (to clients)
  // ----------------------------
  const sendCampaignToAll = async () => {
    setStatus("");
    if (!subject || !message) {
      setStatus("Subject and message are required.");
      return;
    }

    setStatus("Sending email campaign to all clients...");

    try {
      const fd = new FormData();
      fd.append("subject", subject);
      fd.append("message", message);
      fd.append("sendTo", "clients");
      if (image) fd.append("image", image);

      const res = await axios.post(`${API_BASE}/api/send-campaign`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus(`✅ ${res.data?.message || "Campaign sent successfully."}`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error sending email campaign. Check server logs.");
    }
  };

  // ----------------------------
  // SEND NOW: SMS (to clients)
  // ----------------------------
  const sendSmsCampaignToAll = async () => {
    setSmsStatus("");
    if (!message) {
      setSmsStatus("Message is required to send SMS campaign.");
      return;
    }

    setSmsStatus("Sending SMS campaign to all clients...");

    try {
      const res = await axios.post(`${API_BASE}/api/send-sms-campaign`, {
        sendTo: "clients",
        message,
      });

      setSmsStatus(`📱 ${res.data?.message || "SMS campaign sent (or queued) to all clients."}`);
    } catch (err) {
      console.error(err);
      setSmsStatus("❌ Error sending SMS campaign. Check server logs.");
    }
  };

  // ----------------------------
  // RESEND MISSED (email only)
  // ----------------------------
  const resendMissed = async () => {
    setStatus("");
    if (!subject || !message) {
      setStatus("Subject and message are required.");
      return;
    }

    setStatus("Resending ONLY to missed clients (based on campaign_log.txt)...");

    try {
      const fd = new FormData();
      fd.append("subject", subject);
      fd.append("message", message);
      if (image) fd.append("image", image);

      const res = await axios.post(`${API_BASE}/admin/email-campaign-missed`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { attempted = 0, skippedAlreadySent = 0, message: backendMsg } = res.data || {};
      setStatus(
        `✅ ${
          backendMsg ||
          `Retry attempted for ${attempted} clients (skipped ${skippedAlreadySent} already sent).`
        }`
      );
    } catch (err) {
      console.error(err);
      setStatus("❌ Error resending missed. Check server logs.");
    }
  };

  // ----------------------------
  // VIEW LOG
  // ----------------------------
  const loadLog = async () => {
    setLogStatus("Loading campaign log...");

    try {
      const res = await axios.get(`${API_BASE}/admin/email-campaign-log`);
      const { total = 0, sent = 0, failed = 0, entries = [], message: msg = "" } = res.data || {};

      setLogData({ total, sent, failed, entries, message: msg });

      if (!entries.length) setLogStatus(msg || "No log entries yet.");
      else setLogStatus(`Log loaded. Total: ${total}, Sent: ${sent}, Failed: ${failed}.`);
    } catch (err) {
      console.error(err);
      setLogStatus("❌ Error loading campaign log. Check server logs.");
    }
  };

  // ----------------------------
  // SCHEDULE EMAIL
  // ----------------------------
  const scheduleEmailCampaign = async () => {
    setScheduledStatus("");
    if (!subject || !message) {
      setScheduledStatus("Subject and message are required.");
      return;
    }
    if (!scheduledAt) {
      setScheduledStatus("Pick a date/time to schedule this campaign.");
      return;
    }

    setScheduledStatus("Scheduling campaign...");

    try {
      const scheduledSendAt = toPgTimestampString(scheduledAt);

      const fd = new FormData();
      fd.append("subject", subject);
      fd.append("message", message);
      fd.append("sendTo", "clients");
      fd.append("scheduledSendAt", scheduledSendAt);
      if (image) fd.append("image", image);

      const res = await axios.post(`${API_BASE}/admin/scheduled-campaigns`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.ok) {
        setScheduledStatus("✅ Scheduled!");
        await loadScheduledCampaigns();
      } else {
        setScheduledStatus("❌ Scheduling failed.");
      }
    } catch (err) {
      console.error(err);
      setScheduledStatus("❌ Scheduling failed. Check server logs.");
    }
  };

  const loadScheduledCampaigns = async () => {
    setLoadingScheduled(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/scheduled-campaigns`);
      setScheduledList(res.data?.campaigns || []);
    } catch (err) {
      console.error(err);
      setScheduledStatus("❌ Failed to load scheduled campaigns.");
    } finally {
      setLoadingScheduled(false);
    }
  };

  const cancelScheduled = async (id) => {
    if (!id) return;
    setScheduledStatus("Cancelling...");
    try {
      const res = await axios.post(`${API_BASE}/admin/scheduled-campaigns/${id}/cancel`);
      if (res.data?.ok) {
        setScheduledStatus("✅ Cancelled.");
        await loadScheduledCampaigns();
      } else {
        setScheduledStatus("❌ Cancel failed.");
      }
    } catch (err) {
      console.error(err);
      setScheduledStatus("❌ Cancel failed. Check server logs.");
    }
  };

  useEffect(() => {
    loadScheduledCampaigns();
  }, []);

  // ----------------------------
  // UI
  // ----------------------------
  const cardStyle = {
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
    padding: "14px",
    background: "#fff",
    marginBottom: "14px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  const btn = (bg, color = "#fff") => ({
    padding: "12px 16px",
    backgroundColor: bg,
    color,
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    fontWeight: 600,
  });

  return (
    <div style={{ padding: "20px", maxWidth: "900px" }}>
      <h2 style={{ marginTop: 0 }}>Email & SMS Campaign</h2>

      {/* Shared inputs */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: "10px" }}>Campaign Content</div>

        <label>Subject (Email only)</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Holiday Special 🎄"
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />

        <label>Message (used for Email + SMS)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={9}
          placeholder="Write your announcement..."
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />

        <label>Image (Email attachment)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          style={{ marginTop: "6px" }}
        />
        {image?.name ? (
          <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
            Selected: <strong>{image.name}</strong>
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
            No image selected.
          </div>
        )}
      </div>

      {/* SEND NOW */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: "10px" }}>Send Now</div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={sendCampaignToAll} style={btn("#000")}>
            Send Email to All Clients
          </button>
          <button onClick={resendMissed} style={btn("#444")}>
            Resend Email Only to Missed
          </button>
          <button onClick={sendSmsCampaignToAll} style={btn("#198754")}>
            Send SMS to All Clients
          </button>
        </div>

        {status ? <p style={{ marginTop: "10px" }}>{status}</p> : null}
        {smsStatus ? <p style={{ marginTop: "6px" }}>{smsStatus}</p> : null}
      </div>

      {/* SCHEDULE */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: "10px" }}>Schedule Email</div>

        <label style={{ display: "block", marginBottom: "6px" }}>
          Send date/time (America/New_York)
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            marginBottom: "10px",
            width: "100%",
            maxWidth: "360px",
          }}
        />

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={scheduleEmailCampaign} style={btn("#0d6efd")}>
            Schedule Email Campaign
          </button>
          <button
            onClick={loadScheduledCampaigns}
            style={btn("#eee", "#222")}
          >
            Refresh Scheduled List
          </button>
        </div>

        {scheduledStatus ? <p style={{ marginTop: "10px" }}>{scheduledStatus}</p> : null}
      </div>

      {/* SCHEDULED LIST */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ fontWeight: 700 }}>Scheduled Campaigns</div>
          <button onClick={loadScheduledCampaigns} style={btn("#eee", "#222")}>
            Refresh
          </button>
        </div>

        {loadingScheduled ? (
          <p style={{ marginTop: "10px" }}>Loading scheduled campaigns…</p>
        ) : scheduledList.length === 0 ? (
          <p style={{ marginTop: "10px", color: "#666" }}>No scheduled campaigns.</p>
        ) : (
          <div style={{ marginTop: "10px", border: "1px solid #eee", borderRadius: "8px" }}>
            {scheduledList.map((c, idx) => (
              <div
                key={c.id}
                style={{
                  padding: "10px",
                  borderBottom: idx === scheduledList.length - 1 ? "none" : "1px solid #eee",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{c.subject}</div>
                  <div style={{ fontSize: "13px", color: "#555", marginTop: "2px" }}>
                    <strong>Status:</strong> {c.status} ·{" "}
                    <strong>Send at:</strong> {fmtLocalNY(c.scheduled_send_at)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
                    <strong>To:</strong> {c.send_to}
                    {c.image_name ? (
                      <>
                        {" "}· <strong>Image:</strong> {c.image_name}
                      </>
                    ) : null}
                  </div>
                  {c.last_error ? (
                    <div style={{ marginTop: "6px", color: "#b00020", fontSize: "12px" }}>
                      <strong>Error:</strong> {c.last_error}
                    </div>
                  ) : null}
                </div>

                {c.status === "scheduled" ? (
                  <button onClick={() => cancelScheduled(c.id)} style={btn("#dc3545")}>
                    Cancel
                  </button>
                ) : (
                  <div style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap" }}>
                    {c.status === "sent" && c.sent_at ? `Sent: ${fmtLocalNY(c.sent_at)}` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LOG */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ fontWeight: 700 }}>Campaign Log (Email)</div>
          <button onClick={loadLog} style={btn("#eee", "#222")}>
            View / Refresh Log
          </button>
        </div>

        {logStatus ? <p style={{ marginTop: "10px" }}>{logStatus}</p> : null}

        <p style={{ fontSize: "14px", marginTop: "10px", marginBottom: "8px" }}>
          <strong>Total:</strong> {logData.total} · <strong>Sent:</strong> {logData.sent} ·{" "}
          <strong>Failed:</strong> {logData.failed}
        </p>

        <div
          style={{
            maxHeight: "260px",
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "8px",
            padding: "8px",
            fontSize: "13px",
            background: "#fafafa",
          }}
        >
          {logData.entries.length === 0 ? (
            <p style={{ margin: 0, color: "#666" }}>
              No log entries yet. Send a campaign, then refresh.
            </p>
          ) : (
            logData.entries
              .slice()
              .reverse()
              .map((entry, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color:
                          entry.status === "sent"
                            ? "green"
                            : entry.status === "failed"
                            ? "red"
                            : "#555",
                      }}
                    >
                      {String(entry.status || "unknown").toUpperCase()}
                    </strong>{" "}
                    — {entry.email || "(no email)"}
                  </div>
                  <div style={{ color: "#777" }}>
                    <code
                      style={{
                        background: "#f2f2f2",
                        padding: "2px 4px",
                        borderRadius: "4px",
                      }}
                    >
                      {convertToEST(entry.raw)}
                    </code>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
