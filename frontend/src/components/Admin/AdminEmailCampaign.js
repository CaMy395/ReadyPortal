import React, { useState } from "react";
import axios from "axios";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function AdminEmailCampaign() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const sendCampaign = async () => {
    if (!subject || !message) {
      setStatus("Subject and message are required.");
      return;
    }

    setStatus("Sending...");

    try {
      const res = await axios.post(`${apiUrl}/api/send-campaign`, {
        subject,
        message,
        sendTo: "clients", // or "both" later
      });

      // Backend currently returns: { message: "Campaign sent successfully" }
      setStatus(`✅ ${res.data.message || "Campaign sent successfully."}`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error sending campaign. Check server logs.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px" }}>
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
        }}
      />

      <button
        onClick={sendCampaign}
        style={{
          padding: "12px 20px",
          backgroundColor: "#000",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Send Campaign
      </button>

      {status && <p style={{ marginTop: "15px" }}>{status}</p>}
    </div>
  );
}
