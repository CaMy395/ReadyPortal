import React, { useEffect, useMemo, useState } from "react";
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

  // ✅ Tasks
  const [tasks, setTasks] = useState([]);

  // 💰 Income
  const [earnings, setEarnings] = useState(0); // ✅ now YTD
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [monthlyProfits, setMonthlyProfits] = useState([]);

  // 🚗 Mileage
  const [mileageTotal, setMileageTotal] = useState(0);

  /* ============================
     Helpers
  ============================ */
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  // ✅ Detect which task category this logged-in user belongs to
  const getViewerCategory = () => {
    const name = String(loggedInUser?.name || "").toLowerCase();
    const username = String(loggedInUser?.username || "").toLowerCase();
    const email = String(loggedInUser?.email || "").toLowerCase();

    const blob = `${name} ${username} ${email}`.trim();

    // map Caitlyn -> Lyn (because your tasks use "Lyn")
    if (blob.includes("lyn") || blob.includes("caitlyn")) return "Lyn";
    if (blob.includes("charlene")) return "Charlene";
    if (blob.includes("aminah")) return "Aminah";

    // If you ever store category on user later, this will use it automatically
    const fallback = String(loggedInUser?.category || "").trim();
    if (fallback) return fallback;

    return ""; // unknown
  };

  const viewerCategory = getViewerCategory();

  // ✅ Priority helpers
  const priorityRank = (p) => {
    const v = String(p || "").toLowerCase();
    if (v === "high") return 1;
    if (v === "medium") return 2;
    if (v === "low") return 3;
    return 99;
  };

  const priorityColor = (p) => {
    const v = String(p || "").toLowerCase();
    if (v === "high") return "#dc3545"; // red
    if (v === "medium") return "#ffcc00"; // yellow
    if (v === "low") return "#28a745"; // green
    return "#6c757d"; // gray
  };

  // ✅ Safe due-date parsing
  const parseDueMillis = (due) => {
    if (!due) return null;

    const raw = String(due);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const t = new Date(`${raw}T12:00:00`).getTime();
      return Number.isFinite(t) ? t : null;
    }

    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
  };

  const formatDue = (due) => {
    if (!due) return "No Due Date";

    const raw = String(due);
    let d;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) d = new Date(`${raw}T12:00:00`);
    else d = new Date(raw);

    if (Number.isNaN(d.getTime())) return "No Due Date";

    return d.toLocaleDateString("en-US", { timeZone: "America/New_York" });
  };

  const sortByImportance = (list) => {
    return [...list].sort((a, b) => {
      // 1) incomplete first
      if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;

      // 2) priority
      const pa = priorityRank(a.priority);
      const pb = priorityRank(b.priority);
      if (pa !== pb) return pa - pb;

      // 3) due date (soonest first); dated tasks before no due date
      const ad = parseDueMillis(a.due_date);
      const bd = parseDueMillis(b.due_date);

      if (ad !== null && bd !== null && ad !== bd) return ad - bd;
      if (ad !== null && bd === null) return -1;
      if (ad === null && bd !== null) return 1;

      // stable fallback
      return (a.id || 0) - (b.id || 0);
    });
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
     ✅ Tasks
  ============================ */
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${apiUrl}/tasks`);
        if (!res.ok) throw new Error(`Tasks fetch failed: ${res.status}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Tasks error:", err);
      }
    };

    fetchTasks();
  }, [apiUrl]);

  // ✅ ONLY show top 3 tasks for the logged-in user’s category
  const myTopTasks = useMemo(() => {
    const open = (Array.isArray(tasks) ? tasks : []).filter((t) => !t.completed);

    if (!viewerCategory) return [];

    const mine = open.filter(
      (t) => String(t.category || "").trim() === viewerCategory
    );

    return sortByImportance(mine).slice(0, 3);
  }, [tasks, viewerCategory]);

  /* ============================
     Income (✅ YTD now)
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

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // ✅ YTD total (current year only)
        const ytdIncome = income
          .filter((r) => {
            const d = new Date(r.created_at);
            return !isNaN(d) && d.getFullYear() === year;
          })
          .reduce((sum, r) => sum + toNum(r.amount), 0);

        setEarnings(ytdIncome);

        // Monthly chart (already year-filtered)
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
     🚗 Mileage
  ============================ */
  useEffect(() => {
    const fetchMileage = async () => {
      try {
        const year = new Date().getFullYear();
        const res = await fetch(`${apiUrl}/api/mileage/${userId}?year=${year}`);
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

  const currentYear = new Date().getFullYear();

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">📊 Admin Dashboard</h2>

      <div className="dashboard-grid">
        {/* ROW 1 - 💰 Income */}
        <div className="card">
          <h3>💰 Income (YTD {currentYear})</h3>
          <p className="earnings-amount">${earnings.toFixed(2)}</p>
          <p>This Month: ${monthlyTotal.toFixed(2)}</p>
          <p>Entries: {monthlyCount}</p>
        </div>

        {/* ROW 1 - ✅ Tasks (ONLY mine) */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <h3 style={{ margin: 0 }}>
              ✅ {viewerCategory ? `${viewerCategory}'s Tasks (Top 3)` : "My Tasks (Top 3)"}
            </h3>
            <Link to="/mytasks" style={{ textDecoration: "underline" }}>
              View All
            </Link>
          </div>

          <div style={{ marginTop: 10 }}>
            {!viewerCategory ? (
              <p style={{ margin: 0, opacity: 0.8 }}>
                I can’t tell who you are for task filtering yet. (No tasks shown.)
              </p>
            ) : myTopTasks.length === 0 ? (
              <p style={{ margin: 0 }}>No open tasks 🎉</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myTopTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      background: "#f8d7da",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ flex: 1, color: "black" }}>
                        <div style={{ fontWeight: "bold" }}>{t.text}</div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <div
                          style={{
                            padding: "3px 10px",
                            backgroundColor: priorityColor(t.priority),
                            borderRadius: "6px",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: 12,
                            minWidth: 70,
                            textAlign: "center",
                          }}
                        >
                          {t.priority || "Medium"}
                        </div>

                        <div
                          style={{
                            padding: "3px 10px",
                            backgroundColor: "#8B0000",
                            borderRadius: "6px",
                            color: "#fff",
                            fontWeight: "bold",
                            fontSize: 12,
                            textAlign: "center",
                          }}
                        >
                          {t.due_date ? formatDue(t.due_date) : "No Due Date"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ROW 1 - 📈 Chart */}
        <div className="card">
          <h3>📈 Monthly Income (YTD)</h3>
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

        {/* ROW 2 - 🚗 Mileage (moved to 2nd row) */}
        <div className="card">
          <h3>🚗 My Mileage (Round-Trip)</h3>
          <p className="earnings-amount">{mileageTotal.toFixed(2)} mi</p>
          <small>Calculated from your saved address</small>
        </div>

        {/* ROW 2 - 🛠 Admin Tools */}
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

        {/* ROW 2 - 📢 Announcements */}
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
