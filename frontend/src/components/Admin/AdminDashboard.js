// AdminDashboard.js — drop-in replacement

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AdminDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");

  // Payments-received view (existing)
  const [earnings, setEarnings] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [monthlyProfits, setMonthlyProfits] = useState([]);

  // Event-date view (new)
  const [eventMonthlyTotal, setEventMonthlyTotal] = useState(0);
  const [eventMonthlyCount, setEventMonthlyCount] = useState(0);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // --- helpers (kept + expanded) ---
  const parseJsonSafe = async (res) => {
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch {
      console.error("❌ /api/profits returned non-JSON. Using empty list.");
      return [];
    }
  };
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const isIncome = (row) => {
    const cat = String(row?.category || "").toLowerCase();
    const typ = String(row?.type || "").toLowerCase();
    return cat === "income" || cat === "revenue" || typ.includes("income");
  };
  const safeDate = (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  // Prefer "... on YYYY-MM-DD" inside description as event date; else fallback to created_at
  const getEventDate = (row) => {
    const desc = String(row?.description || "");
    let d = null;
    // ISO yyyy-mm-dd
    let m = desc.match(/\bon\s(\d{4}-\d{2}-\d{2})\b/);
    if (m) d = new Date(m[1] + "T00:00:00");
    // If you later store row.event_date, prefer it here:
    if ((!d || isNaN(d)) && row?.event_date) d = new Date(row.event_date);
    if (!d || isNaN(d)) d = safeDate(row?.created_at);
    return d;
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/announcements`);
        const data = await res.json();
        setAnnouncements(data);
      } catch (err) {
        console.error("❌ Error loading announcements:", err);
      }
    };
    fetchAnnouncements();
  }, [apiUrl]);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/profits`);
        const profits = await parseJsonSafe(res);

        // 🔒 Income-only rows for all tiles + chart
        const incomeRows = (Array.isArray(profits) ? profits : []).filter(isIncome);

        // === Payments-received view (created_at) ===
        // All-time gross income
        const total = incomeRows.reduce((sum, entry) => sum + toNum(entry.amount), 0);
        setEarnings(total);

        // Monthly chart (payments received) — current year
        const monthlyData = Array(12).fill(0);
        const now = new Date();
        const thisYear = now.getFullYear();
        incomeRows.forEach((entry) => {
          const d = safeDate(entry.created_at);
          if (d && d.getFullYear() === thisYear) {
            monthlyData[d.getMonth()] += toNum(entry.amount);
          }
        });
        const formattedData = monthlyData.map((amt, idx) => ({
          month: new Date(0, idx).toLocaleString("default", { month: "short" }),
          amount: Number(amt.toFixed(2)),
        }));
        setMonthlyProfits(formattedData);

        // “This Month” (payments received)
        const currentMonth = now.getMonth();
        setMonthlyTotal(monthlyData[currentMonth]);

        const entriesThisMonth = incomeRows.filter((p) => {
          const d = safeDate(p.created_at);
          return d && d.getFullYear() === thisYear && d.getMonth() === currentMonth;
        }).length;
        setMonthlyCount(entriesThisMonth);

        // === Event-date view (parsed from description) ===
        const monthlyEventData = Array(12).fill(0);
        incomeRows.forEach((entry) => {
          const d = getEventDate(entry);
          if (d && d.getFullYear() === thisYear) {
            monthlyEventData[d.getMonth()] += toNum(entry.amount);
          }
        });
        setEventMonthlyTotal(monthlyEventData[currentMonth]);

        const eventEntriesThisMonth = incomeRows.filter((p) => {
          const d = getEventDate(p);
          return d && d.getFullYear() === thisYear && d.getMonth() === currentMonth;
        }).length;
        setEventMonthlyCount(eventEntriesThisMonth);
      } catch (err) {
        console.error("❌ Error loading total profits:", err);
        // fallbacks so UI never crashes
        setEarnings(0);
        setMonthlyTotal(0);
        setMonthlyCount(0);
        setMonthlyProfits([]);
        setEventMonthlyTotal(0);
        setEventMonthlyCount(0);
      }
    };

    fetchEarnings();
  }, [apiUrl]);

  const handlePost = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, tag }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements([data, ...announcements]);
        setTitle("");
        setMessage("");
        setTag("");
      } else {
        console.error("❌ Failed to post announcement");
      }
    } catch (err) {
      console.error("❌ Error posting announcement:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">📊 Admin Dashboard</h2>
      <div className="dashboard-grid">
        {/* Earnings (payments received) */}
        <div className="card">
          <h3>💰 Income (Payments Received)</h3>
          <p className="earnings-amount">${earnings.toFixed(2)}</p>
          <p><strong>This Month:</strong> ${monthlyTotal.toFixed(2)}</p>
          <p><strong>Entries:</strong> {monthlyCount}</p>
        </div>

        {/* Earnings (by event date) */}
        <div className="card">
          <h3>📅 Income (By Event Date)</h3>
          <p className="earnings-amount">${eventMonthlyTotal.toFixed(2)}</p>
          <p><strong>This Month (Events):</strong> ${eventMonthlyTotal.toFixed(2)}</p>
          <p><strong>Event Entries:</strong> {eventMonthlyCount}</p>
        </div>

        {/* Chart (payments received) */}
        <div className="card">
          <h3>📈 Monthly Income (Payments Received)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyProfits} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Admin Tools */}
        <div className="card">
          <h3>📎 Admin Tools</h3>
          <div className="resource-list-items">
            <div className="resource-item">
              <Link to="/admin/scheduling-page">🧾 Scheduling Page</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/quotes-dashboard"> Quotes Dashboard</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/inventory">📦 Inventory</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/userlist">👥 Staff List</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/class-roster">📚 Course Roster</Link>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="announcement-list card">
          <h3>📢 Announcements</h3>
          <div className="announcement-form">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input
              type="text"
              placeholder="Tag (optional)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <button onClick={handlePost}>Post</button>
          </div>
          {announcements.length === 0 ? (
            <p>No announcements yet.</p>
          ) : (
            <div className="announcement-list-items">
              {announcements.map((a) => (
                <div key={a.id} className="announcement-item">
                  <strong>{a.title}</strong>
                  {a.tag && <span className="tag-badge">{a.tag}</span>}
                  <p>{a.message}</p>
                  <small>{new Date(a.created_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
