import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const AdminDashboard = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  const userId = loggedInUser?.id;

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");

  // 💰 Income
  const [earnings, setEarnings] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [monthlyProfits, setMonthlyProfits] = useState([]);

  // 🚗 Mileage (ADMIN ONLY)
  const [mileageTotal, setMileageTotal] = useState(0);

  /* ============================
     Helpers
  ============================ */
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  /* ============================
     Announcements
  ============================ */
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/announcements`);
        const data = await res.json();
        setAnnouncements(data);
      } catch (err) {
        console.error("❌ Announcements error:", err);
      }
    };
    fetchAnnouncements();
  }, [apiUrl]);

  /* ============================
     Income
  ============================ */
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/profits`);
        const profits = await res.json();

        const income = profits.filter(
          (p) =>
            String(p.category).toLowerCase() === "income" ||
            String(p.type).toLowerCase().includes("income")
        );

        const total = income.reduce((s, r) => s + toNum(r.amount), 0);
        setEarnings(total);

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const monthly = Array(12).fill(0);
        income.forEach((row) => {
          const d = new Date(row.created_at);
          if (!isNaN(d) && d.getFullYear() === year) {
            monthly[d.getMonth()] += toNum(row.amount);
          }
        });

        setMonthlyProfits(
          monthly.map((amt, i) => ({
            month: new Date(0, i).toLocaleString("default", { month: "short" }),
            amount: Number(amt.toFixed(2)),
          }))
        );

        setMonthlyTotal(monthly[month]);

        setMonthlyCount(
          income.filter((r) => {
            const d = new Date(r.created_at);
            return (
              !isNaN(d) &&
              d.getFullYear() === year &&
              d.getMonth() === month
            );
          }).length
        );
      } catch (err) {
        console.error("❌ Earnings error:", err);
      }
    };

    fetchEarnings();
  }, [apiUrl]);

  /* ============================
     🚗 Mileage (ADMIN HIM/HERSELF)
  ============================ */
  useEffect(() => {
    const fetchMileage = async () => {
      try {
        const year = new Date().getFullYear();
        const res = await fetch(
          `${apiUrl}/api/mileage/${userId}?year=${year}`
        );
        const data = await res.json();

        const totalMiles = Array.isArray(data)
          ? data.reduce((sum, row) => sum + Number(row.miles || 0), 0)
          : 0;

        setMileageTotal(totalMiles);
      } catch (err) {
        console.error("❌ Mileage error:", err);
      }
    };

    if (userId) fetchMileage();
  }, [userId, apiUrl]);

  /* ============================
     Post Announcement
  ============================ */
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
      }
    } catch (err) {
      console.error("❌ Post error:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">📊 Admin Dashboard</h2>

      <div className="dashboard-grid">
        {/* 💰 Income */}
        <div className="card">
          <h3>💰 Income (All-Time)</h3>
          <p className="earnings-amount">${earnings.toFixed(2)}</p>
          <p>This Month: ${monthlyTotal.toFixed(2)}</p>
          <p>Entries: {monthlyCount}</p>
        </div>

        {/* 🚗 Mileage */}
        <div className="card">
          <h3>🚗 My Mileage (Round-Trip)</h3>
          <p className="earnings-amount">
            {mileageTotal.toFixed(2)} mi
          </p>
          <small>Calculated from your saved address</small>
        </div>

        {/* 📈 Chart */}
        <div className="card">
          <h3>📈 Monthly Income</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyProfits}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 🛠 Admin Tools */}
        <div className="card">
          <h3>📎 Admin Tools</h3>
          <div className="resource-list-items">
            <div className="resource-item">
              <Link to="/admin/scheduling-page">🧾 Scheduling</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/quotes-dashboard">📄 Quotes</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/inventory">📦 Inventory</Link>
            </div>
            <div className="resource-item">
              <Link to="/admin/userlist">👥 Staff</Link>
            </div>
          </div>
        </div>

        {/* 📢 Announcements */}
        <div className="announcement-list card">
          <h3>📢 Announcements</h3>
          <input
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
            placeholder="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <button onClick={handlePost}>Post</button>

          {announcements.map((a) => (
            <div key={a.id}>
              <strong>{a.title}</strong>
              <p>{a.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
