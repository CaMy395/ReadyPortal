// ClientSaveCardPage.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ClientSaveCardPage = () => {
  const [status, setStatus] = useState("Initializing card form...");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email");

  useEffect(() => {
    const scriptId = "square-sdk";
    const initSquare = async () => {
      if (!window.Square) {
        setStatus("❌ Square SDK not loaded.");
        return;
      }

      try {
        const payments = window.Square.payments(
          process.env.REACT_APP_SQUARE_APP_ID,
          process.env.REACT_APP_SQUARE_LOCATION_ID
        );

        const card = await payments.card();

        const container = document.getElementById("card-container");
        if (container) {
          container.innerHTML = ""; // Clear old card form if reloaded
          await card.attach("#card-container");
        }

        const saveButton = document.getElementById("saveCardBtn");
        if (saveButton) {
          saveButton.onclick = async () => {
            try {
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
                setStatus("❌ Failed to tokenize card.");
              }
            } catch (err) {
              console.error("❌ Save card error:", err);
              setStatus("❌ Error saving card.");
            }
          };
        }

        setStatus("✅ Card form ready. Please enter your details.");
      } catch (err) {
        console.error("❌ Error initializing Square payments:", err);
        setStatus("❌ Could not initialize card form.");
      }
    };

    const loadSquareScript = () => {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
        script.async = true;
        script.id = scriptId;
        script.onload = initSquare;
        document.body.appendChild(script);
      } else {
        initSquare();
      }
    };

    loadSquareScript();
  }, [email]);

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "auto" }}>
      <h2>🔒 Save Your Card</h2>
      <p>This card will be stored securely with Square for remaining payments.</p>

      <div id="card-container" style={{ marginBottom: "1rem" }}></div>
      <button id="saveCardBtn">Save Card</button>

      <p style={{ marginTop: "1rem", color: status.includes("✅") ? "green" : status.includes("❌") ? "red" : "#333" }}>
        {status}
      </p>
    </div>
  );
};

export default ClientSaveCardPage;
