// ClientSaveCardPage.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ClientSaveCardPage = () => {
  const [status, setStatus] = useState("Initializing...");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email");

  useEffect(() => {
    const initCardForm = async () => {
      const scriptId = "square-sdk";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
        script.async = true;
        script.id = scriptId;
        script.onload = () => loadCard();
        document.body.appendChild(script);
      } else {
        loadCard();
      }
    };

const loadCard = async () => {
  if (!window.Square) {
    setStatus("❌ Square SDK not available.");
    return;
  }

  try {
    const payments = window.Square.payments(
      process.env.REACT_APP_SQUARE_APP_ID,
      process.env.REACT_APP_SQUARE_LOCATION_ID
    );

    const card = await payments.card();
    const container = document.getElementById("card-container");

    // ✅ Track whether the card is attached
    let cardAttached = false;

    if (container && container.childElementCount === 0) {
      await card.attach("#card-container");
      cardAttached = true;
    }

    const saveButton = document.getElementById("saveCardBtn");
    if (saveButton) {
      saveButton.onclick = async () => {
        try {
          if (!cardAttached) {
            setStatus("❌ Card is not attached. Please wait.");
            return;
          }

          const result = await card.tokenize();
          if (result.status === "OK") {
            const token = result.token;

            const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/save-card-on-file`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, token })
            });

            const data = await res.json();
            if (res.ok) {
              setStatus("✅ Card saved successfully!");
              setTimeout(() => {
                window.location.href = "/rb/client-scheduling-success?email=" + encodeURIComponent(email);
              }, 2000);
            } else {
              setStatus(`❌ Failed to save card: ${data.error || "Unknown error"}`);
            }
          } else {
            setStatus("❌ Failed to tokenize card");
          }
        } catch (err) {
          console.error("❌ Save card error:", err);
          setStatus("❌ Error saving card.");
        }
      };
    }
  } catch (error) {
    console.error("❌ Square card form error:", error);
    setStatus("❌ Could not initialize card form.");
  }
};


    initCardForm();
  }, [email]);

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "auto" }}>
      <h2>🔒 Save Your Card</h2>
      <p>This card will be stored securely with Square for remaining payments.</p>

      <div id="card-container" style={{ marginBottom: "1rem" }}></div>
      <button id="saveCardBtn">Save Card</button>

      <p style={{ marginTop: "1rem", color: status.includes("✅") ? "green" : status.includes("❌") ? "red" : "#333" }}>{status}</p>
    </div>
  );
};

export default ClientSaveCardPage;
