import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AdminDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [monthlyProfits, setMonthlyProfits] = useState([]);
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // --- helpers (tiny + local) ---
  const parseJsonSafe = async (res) => {
    // Avoid “Unexpected token '<' … not valid JSON” by reading text first.
    const raw = await res.text();
    try {
      const data = JSON.parse(raw);
      return data;
    } catch {
      console.error("❌ /api/profits returned non-JSON. Using empty list.");
      return [];
    }
  };
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const isIncome = (row) => {
    const tag = String(row?.category || row?.type || "").toLowerCase();
    return tag === "income" || tag === "revenue";
  };
  const safeDate = (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
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

        // 🔒 Income-only view for all tiles + chart
        const incomeRows = (Array.isArray(profits) ? profits : []).filter(isIncome);

        // All-time gross income (income only)
        const total = incomeRows.reduce((sum, entry) => sum + toNum(entry.amount), 0);
        setEarnings(total);

        // Monthly chart data (income only, current year)
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

        // “This Month” and “Entries” (income only)
        const currentMonth = now.getMonth();
        setMonthlyTotal(monthlyData[currentMonth]);

        const entriesThisMonth = incomeRows.filter((p) => {
          const d = safeDate(p.created_at);
          return d && d.getFullYear() === thisYear && d.getMonth() === currentMonth;
        }).length;
        setMonthlyCount(entriesThisMonth);
      } catch (err) {
        console.error("❌ Error loading total profits:", err);
        // fallbacks so UI never crashes
        setEarnings(0);
        setMonthlyTotal(0);
        setMonthlyCount(0);
        setMonthlyProfits([]);
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
        {/* Earnings */}
        <div className="card">
          <h3>💰 Gross Income</h3>
          <p className="earnings-amount">${earnings.toFixed(2)}</p>
          <p><strong>This Month:</strong> ${monthlyTotal.toFixed(2)}</p>
          <p><strong>Entries:</strong> {monthlyCount}</p>
        </div>

        {/* Chart */}
        <div className="card">
          <h3>📈 Monthly Income</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyProfits} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staff Resources */}
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
