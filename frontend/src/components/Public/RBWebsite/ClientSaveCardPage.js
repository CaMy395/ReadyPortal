// ClientSaveCardPage.js
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
const SQUARE_APP_ID = process.env.REACT_APP_SQUARE_APP_ID;
const SQUARE_LOCATION_ID = process.env.REACT_APP_SQUARE_LOCATION_ID;

const ClientSaveCardPage = () => {
  const [status, setStatus] = useState("Initializing card form...");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const email = searchParams.get("email") || "";
  const amount = searchParams.get("amount") || "";
  const itemName = searchParams.get("itemName") || "";
  const title = searchParams.get("title") || "";
  const course = searchParams.get("course") || "";
  const name = searchParams.get("name") || "";

  useEffect(() => {
    const scriptId = "square-sdk";

    const initSquare = async () => {
      try {
        if (!window.Square) {
          setStatus("❌ Square SDK not loaded.");
          return;
        }

        if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID) {
          setStatus("❌ Square configuration missing. Please contact support.");
          return;
        }

        setStatus("Loading card form...");

        const payments = window.Square.payments(
          SQUARE_APP_ID,
          SQUARE_LOCATION_ID
        );
        const card = await payments.card();

        const container = document.getElementById("card-container");
        if (!container) {
          setStatus("❌ Card container not found.");
          return;
        }

        container.innerHTML = "";
        await card.attach("#card-container");

        const saveButton = document.getElementById("saveCardBtn");
        if (!saveButton) {
          setStatus("❌ Save button not found.");
          return;
        }

        saveButton.onclick = async () => {
          try {
            setStatus("Processing your card…");

            const result = await card.tokenize();
            if (result.status !== "OK") {
              setStatus("❌ Failed to tokenize card. Please check your card details.");
              return;
            }

            const token = result.token;

            // 1️⃣ Save card on file for this customer
            const saveRes = await fetch(`${apiUrl}/api/save-card-on-file`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, token }),
            });

            const saveJson = await saveRes.json().catch(() => ({}));
            if (!saveRes.ok) {
              setStatus(
                `❌ Failed to save card: ${
                  saveJson.error || saveJson.message || "Unknown error"
                }`
              );
              return;
            }

            // 2️⃣ After card is saved, send them to the NORMAL Square payment link page
            //    so they can actually pay the deposit, just like your other flows.
            if (amount) {
              setStatus("Card saved! Redirecting you to payment…");

              // Try to grab course info from localStorage if available
              let appointmentData = null;
              try {
                const raw =
                  window.localStorage.getItem("pendingAppointment") ||
                  window.localStorage.getItem("pendingBartendingCourse");
                if (raw) {
                  const parsed = JSON.parse(raw);
                  appointmentData = {
                    title: title || "Bartending Course",
                    cycleStart: parsed.setSchedule || parsed.cycleStart || "",
                  };
                }
              } catch {
                // ignore parse errors, appointmentData will just be null
              }

              const linkRes = await fetch(`${apiUrl}/api/create-payment-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email,
                  amount: Number(amount),
                  itemName: itemName || title || "Payment",
                  appointmentData,
                }),
              });

              const linkJson = await linkRes.json().catch(() => ({}));
              const checkoutUrl = linkJson.url;

              if (!linkRes.ok || !checkoutUrl) {
                console.error("❌ create-payment-link error:", linkJson);
                setStatus(
                  `❌ Could not start payment: ${
                    linkJson.error || linkJson.message || "Unknown error"
                  }`
                );
                return;
              }

              // ✅ Now send them to Square's hosted checkout page
              window.location.href = checkoutUrl;
              return;
            }

            // If no amount, just send them straight to success (rare case)
            const q = new URLSearchParams({
              email,
              itemName: itemName || "",
              title: title || "",
              course: course || "",
              name: name || "",
            });

            setStatus("✅ Card saved. Redirecting…");
            setTimeout(() => {
              window.location.href = `/rb/client-scheduling-success?${q.toString()}`;
            }, 800);
          } catch (err) {
            console.error("❌ Save card error:", err);
            setStatus("❌ Something went wrong saving your card.");
          }
        };

        setStatus("Ready to save your card.");
      } catch (e) {
        console.error("❌ Init error:", e);
        setStatus("❌ Could not initialize card form.");
      }
    };

    // Load Square Web Payments SDK (sandbox vs prod based on APP ID)
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      const isSandbox = (SQUARE_APP_ID || "").startsWith("sandbox-");
      script.src = isSandbox
        ? "https://sandbox.web.squarecdn.com/v1/square.js"
        : "https://web.squarecdn.com/v1/square.js";
      script.onload = () => initSquare();
      script.onerror = () =>
        setStatus("❌ Failed to load Square SDK. Please refresh.");
      document.body.appendChild(script);
    } else {
      initSquare();
    }
  }, [email, amount, itemName, title, course, name]);

  return (
    <div
      className="save-card-wrapper"
      style={{ maxWidth: 560, margin: "28px auto", padding: 16 }}
    >
      <h2>🔒 Save Your Card</h2>
      <p>
        This card will be stored securely with Square for your Bartending Course
        payments. After saving, you'll be taken to the payment page to complete
        your deposit.
      </p>

      <div id="card-container" style={{ marginBottom: "1rem" }}></div>
      <button id="saveCardBtn">Save Card & Go to Payment</button>

      <p
        style={{
          marginTop: "1rem",
          color: status.includes("✅")
            ? "green"
            : status.includes("❌")
            ? "red"
            : "#333",
        }}
      >
        {status}
      </p>
    </div>
  );
};

export default ClientSaveCardPage;
