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
  }, []);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/profits`);
        const profits = await res.json();

        const total = profits.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        setEarnings(total);

        const monthlyData = Array(12).fill(0);
        const now = new Date();

        profits.forEach((entry) => {
          const date = new Date(entry.created_at);
          if (date.getFullYear() === now.getFullYear()) {
            monthlyData[date.getMonth()] += Number(entry.amount || 0);
          }
        });

        const formattedData = monthlyData.map((amt, idx) => ({
          month: new Date(0, idx).toLocaleString('default', { month: 'short' }),
          amount: parseFloat(amt.toFixed(2))
        }));

        setMonthlyProfits(formattedData);

        const currentMonth = now.getMonth();
        setMonthlyTotal(monthlyData[currentMonth]);
        setMonthlyCount(profits.filter(p => new Date(p.created_at).getMonth() === currentMonth).length);
      } catch (err) {
        console.error("❌ Error loading total profits:", err);
      }
    };

    fetchEarnings();
  }, []);

  const handlePost = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, tag })
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
          <h3>📈 Monthly Profits</h3>
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
