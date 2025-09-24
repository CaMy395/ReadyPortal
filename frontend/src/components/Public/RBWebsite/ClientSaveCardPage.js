// ClientSaveCardPage.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ClientSaveCardPage = () => {
  const [status, setStatus] = useState("Initializing card form...");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email");
  const amount = searchParams.get("amount");
  const itemName = searchParams.get("itemName") || "";
  const title = searchParams.get("title") || "";

  useEffect(() => {
    const scriptId = "square-sdk";
    const initSquare = async () => {
      if (!window.Square) {
        setStatus("❌ Square SDK not loaded.");
        return;
      }
      setStatus("Loading card form...");

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
                  try {
                    if (amount) {
                      const charge = await fetch(`${apiUrl}/api/charge-card-on-file`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, amount, description: itemName || "Deposit" })
                      });
                      const cj = await charge.json();
                      if (!charge.ok) throw new Error(cj.error || "Charge failed");
                    }
                    const q = new URLSearchParams({ email, amount: amount || "", itemName: itemName || "", title: title || "" });
                    setTimeout(() => { window.location.href = `/rb/client-scheduling-success?${q.toString()}`; }, 800);
                  } catch (err) {
                    console.error("❌ Charge error:", err);
                    setStatus("❌ Error charging the card. Please try another card.");
                  }
                } else {
                  setStatus(`❌ Failed to save card: ${data.error || "Unknown error"}`);
                }
              } else {
                setStatus("❌ Failed to tokenize card.");
              }
            } catch (err) {
              console.error("❌ Save card error:", err);
              setStatus("❌ Something went wrong saving your card.");
            }
          };
        }

        setStatus("Ready to save your card.");
      } catch (e) {
        console.error("❌ Init error:", e);
        setStatus("❌ Could not initialize card form.");
      }
    };

    // Load Square JS if needed
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://sandbox.web.squarecdn.com/v1/square.js";
      s.onload = () => initSquare();
      s.onerror = () => setStatus("❌ Failed to load Square SDK.");
      document.body.appendChild(s);
    } else {
      initSquare();
    }
  }, [email, amount, itemName, title]);

  return (
    <div className="save-card-wrapper" style={{ maxWidth: 560, margin: "28px auto", padding: 16 }}>
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
