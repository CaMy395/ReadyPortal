// AdminSavedCardsPage.js
import React, { useEffect, useState } from "react";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

const AdminSavedCardsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});
  const [charging, setCharging] = useState(null); // email currently being charged

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/clients-with-cards`);
        const json = await res.json();
        if (!res.ok) {
          setStatus(json.error || "Failed to load clients.");
          return;
        }
        setClients(json.clients || []);
        setStatus("");
      } catch (err) {
        console.error("❌ fetch clients-with-cards error:", err);
        setStatus("Failed to load clients with saved cards.");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleAmountChange = (email, value) => {
    setAmounts((prev) => ({
      ...prev,
      [email]: value,
    }));
  };

  const handleNoteChange = (email, value) => {
    setNotes((prev) => ({
      ...prev,
      [email]: value,
    }));
  };

  const handleCharge = async (email) => {
    const amountValue = amounts[email];

    if (!amountValue || isNaN(amountValue) || Number(amountValue) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!window.confirm(`Charge $${amountValue} to ${email}?`)) {
      return;
    }

    try {
      setCharging(email);
      setStatus("");

      const res = await fetch(`${apiUrl}/api/charge-saved-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Number(amountValue),
          note: notes[email] || "",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("❌ charge-saved-card error:", json);
        alert(
          `Charge failed: ${
            json.error || json.message || "Unknown error from Square"
          }`
        );
        return;
      }

      alert(
        `✅ Charge successful! Payment ID: ${
          json.payment?.id || "N/A"
        }`
      );
    } catch (err) {
      console.error("❌ charge-saved-card request error:", err);
      alert("Charge failed. Check console/logs for details.");
    } finally {
      setCharging(null);
    }
  };

  if (loading) {
    return <p>Loading clients with saved cards…</p>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
      <h2>💳 Clients With Saved Cards</h2>
      <p>
        These clients have a card on file in Square. You can charge them
        manually for remaining course payments or other balances.
      </p>

      {status && (
        <p style={{ color: "red", marginBottom: "1rem" }}>{status}</p>
      )}

      {clients.length === 0 ? (
        <p>No clients have cards on file yet.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "1rem",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                Client
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                Email
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                  width: "90px",
                }}
              >
                Amount ($)
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                Note (optional)
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                  width: "140px",
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {c.full_name || "(No name)"}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {c.email}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amounts[c.email] || ""}
                    onChange={(e) =>
                      handleAmountChange(c.email, e.target.value)
                    }
                    style={{ width: "80px" }}
                  />
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  <input
                    type="text"
                    placeholder="e.g. Course payment #2"
                    value={notes[c.email] || ""}
                    onChange={(e) =>
                      handleNoteChange(c.email, e.target.value)
                    }
                    style={{ width: "100%" }}
                  />
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  <button
                    onClick={() => handleCharge(c.email)}
                    disabled={charging === c.email}
                  >
                    {charging === c.email ? "Charging…" : "Charge Card"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminSavedCardsPage;
