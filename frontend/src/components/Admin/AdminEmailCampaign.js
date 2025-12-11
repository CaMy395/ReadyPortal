// AdminEmailCampaign.js
import React, { useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function AdminEmailCampaign() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const [logStatus, setLogStatus] = useState("");
  const [logData, setLogData] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    entries: [],
    message: "",
  });

  const convertToEST = (raw) => {
  const match = raw.match(/\[(.*?)\]/);
  if (!match) return raw;
  const utcDateStr = match[1];
  const estDate = new Date(utcDateStr).toLocaleString("en-US", { timeZone: "America/New_York" });
  return raw.replace(match[1], estDate);
};

  // NEW CAMPAIGN → send to ALL
  const sendCampaignToAll = async () => {
    if (!subject || !message) {
      setStatus("Subject and message are required.");
      return;
    }

    setStatus("Sending to all clients...");

    try {
      const res = await axios.post(`${API_BASE}/api/send-campaign`, {
        subject,
        message,
        sendTo: "clients", // or "both" if you add staff later
      });

      setStatus(
        `✅ ${res.data.message || "Campaign sent successfully to all clients."}`
      );
    } catch (err) {
      console.error(err);
      setStatus("❌ Error sending campaign. Check server logs.");
    }
  };

  // SAME CAMPAIGN RETRY → send ONLY MISSED (based on campaign_log.txt)
  const resendMissed = async () => {
    if (!subject || !message) {
      setStatus("Subject and message are required.");
      return;
    }

    setStatus("Sending only to clients who missed the first send...");

    try {
      const res = await axios.post(`${API_BASE}/admin/email-campaign-missed`, {
        subject,
        message,
      });

      const { attempted = 0, skippedAlreadySent = 0, message: backendMsg } =
        res.data || {};

      setStatus(
        `✅ ${
          backendMsg ||
          `Retry attempted for ${attempted} clients (skipped ${skippedAlreadySent} already sent).`
        }`
      );
    } catch (err) {
      console.error(err);
      setStatus(
        "❌ Error sending retry to missed clients. Check server logs."
      );
    }
  };

  // VIEW LOG → see who was sent / failed
  const loadLog = async () => {
    setLogStatus("Loading campaign log...");

    try {
      const res = await axios.get(`${API_BASE}/admin/email-campaign-log`);
      const { total = 0, sent = 0, failed = 0, entries = [], message = "" } =
        res.data || {};

      setLogData({
        total,
        sent,
        failed,
        entries,
        message,
      });

      if (entries.length === 0) {
        setLogStatus(message || "No log entries yet.");
      } else {
        setLogStatus(
          `Log loaded. Total: ${total}, Sent: ${sent}, Failed: ${failed}.`
        );
      }
    } catch (err) {
      console.error(err);
      setLogStatus("❌ Error loading campaign log. Check server logs.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px" }}>
      <h2>Email Campaign</h2>

      <label>Subject</label>
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Holiday Special 🎄"
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "15px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      <label>Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={10}
        placeholder="Write your announcement..."
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "15px",
          borderRadius: "6px",
          border: "1px solid #ccc",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        <button
          onClick={sendCampaignToAll}
          style={{
            padding: "12px 20px",
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "6px",
            cursor: "pointer",
            border: "none",
          }}
        >
          Send Campaign to All
        </button>

        <button
          onClick={resendMissed}
          style={{
            padding: "12px 20px",
            backgroundColor: "#444",
            color: "#fff",
            borderRadius: "6px",
            cursor: "pointer",
            border: "none",
          }}
        >
          Resend Only Missed
        </button>

        <button
          onClick={loadLog}
          style={{
            padding: "12px 20px",
            backgroundColor: "#eee",
            color: "#222",
            borderRadius: "6px",
            cursor: "pointer",
            border: "1px solid #ccc",
          }}
        >
          View Campaign Log
        </button>
      </div>

      {status && (
        <p style={{ marginTop: "5px", marginBottom: "15px" }}>{status}</p>
      )}

      <hr style={{ margin: "15px 0" }} />

      <h3>Campaign Log</h3>
      {logStatus && <p style={{ marginBottom: "10px" }}>{logStatus}</p>}

      <p style={{ fontSize: "14px", marginBottom: "8px" }}>
        <strong>Total entries:</strong> {logData.total} ·{" "}
        <strong>Sent:</strong> {logData.sent} ·{" "}
        <strong>Failed:</strong> {logData.failed}
      </p>

      <div
        style={{
          maxHeight: "250px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "6px",
          padding: "8px",
          fontSize: "13px",
          background: "#fafafa",
        }}
      >
        {logData.entries.length === 0 ? (
          <p style={{ margin: 0, color: "#666" }}>
            No log entries yet. Click &quot;View Campaign Log&quot; after
            sending a campaign.
          </p>
        ) : (
          logData.entries
            .slice()
            .reverse() // newest first
            .map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: "4px 0",
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
                    {entry.status.toUpperCase()}
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
  );
}
