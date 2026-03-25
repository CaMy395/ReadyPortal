import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  const [qrStats, setQrStats] = useState([]);
  const [qrClickStats, setQrClickStats] = useState([]);

  // ✅ Tasks
  const [tasks, setTasks] = useState([]);

  // 💰 Income/Expenses/Net (MATCH PROFITS.JS)
  const [incomeYTD, setIncomeYTD] = useState(0);
  const [expenseYTD, setExpenseYTD] = useState(0);
  const [netYTD, setNetYTD] = useState(0);

  // month slices (same classifier)
  const [incomeMonth, setIncomeMonth] = useState(0);
  const [expenseMonth, setExpenseMonth] = useState(0);
  const [incomeMonthCount, setIncomeMonthCount] = useState(0);

  // Chart (income contributions per month, within YTD-to-date range)
  const [monthlyProfits, setMonthlyProfits] = useState([]);

  // 🚗 Mileage
  const [mileageTotal, setMileageTotal] = useState(0);

  const currentYear = new Date().getFullYear();

  /* ============================
     Helpers (mirrors Profits.js)
  ============================ */
  const getEffectiveDate = useCallback((profit) => {
    const raw = profit?.paid_at || profit?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, []);

  const parseAmount = useCallback((val) => {
    const n = parseFloat(String(val ?? "").replace(/[$,]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }, []);

  // yyyy-mm-dd (local)
  const toDateInputValue = useCallback((d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // same as Profits.js: startOfDay / endOfDay using local time
  const startOfDay = useCallback((yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    const d = new Date(yyyyMmDd);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endOfDay = useCallback((yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    const d = new Date(yyyyMmDd);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const money = (n) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

  // ✅ Detect which task category this logged-in user belongs to
  const getViewerCategory = () => {
    const name = String(loggedInUser?.name || "").toLowerCase();
    const username = String(loggedInUser?.username || "").toLowerCase();
    const email = String(loggedInUser?.email || "").toLowerCase();

    const blob = `${name} ${username} ${email}`.trim();

    if (blob.includes("lyn") || blob.includes("caitlyn")) return "Lyn";
    if (blob.includes("charlene")) return "Charlene";
    if (blob.includes("aminah")) return "Aminah";

    const fallback = String(loggedInUser?.category || "").trim();
    if (fallback) return fallback;

    return "";
  };

  const viewerCategory = getViewerCategory();

  // ✅ Priority helpers (tasks card)
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
      if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;

      const pa = priorityRank(a.priority);
      const pb = priorityRank(b.priority);
      if (pa !== pb) return pa - pb;

      const ad = parseDueMillis(a.due_date);
      const bd = parseDueMillis(b.due_date);

      if (ad !== null && bd !== null && ad !== bd) return ad - bd;
      if (ad !== null && bd === null) return -1;
      if (ad === null && bd !== null) return 1;

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
        setAnnouncements(Array.isArray(data) ? data : []);
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

  /* ============================
     ✅ QRs -Scans & Clicks
  ============================ */

  useEffect(() => {
    const fetchQRStats = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/qr-scans-summary`);
        const data = await res.json();
        setQrStats(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ QR stats error:", err);
      }
    };

    fetchQRStats();
  }, [apiUrl]);

  useEffect(() => {
    const fetchQRClickStats = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/qr-clicks-summary`);
        const data = await res.json();
        setQrClickStats(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ QR click stats error:", err);
      }
    };

    fetchQRClickStats();
  }, [apiUrl]);

  const myTopTasks = useMemo(() => {
    const open = (Array.isArray(tasks) ? tasks : []).filter((t) => !t.completed);
    if (!viewerCategory) return [];
    const mine = open.filter((t) => String(t.category || "").trim() === viewerCategory);
    return sortByImportance(mine).slice(0, 3);
  }, [tasks, viewerCategory]);

  /* ============================
     ✅ Income/Expense/Net — MATCH Profits.js exactly
     - POST update-profits-from-transactions first (like Profits page)
     - filter range: Jan 1 -> TODAY end-of-day (like Profits default)
     - classifier: same as Profits.js
  ============================ */
  useEffect(() => {
    const fetchLedger = async () => {
      try {
        // 1) keep ledger updated (Profits.js does this)
        try {
          await fetch(`${apiUrl}/api/update-profits-from-transactions`, { method: "POST" });
        } catch (e) {
          console.error("⚠️ update-profits-from-transactions failed:", e);
        }

        // 2) fetch profits
        const res = await fetch(`${apiUrl}/api/profits`);
        if (!res.ok) throw new Error(`Profits fetch failed: ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : [];

        // 3) build same default date range as Profits.js
        const now = new Date();
        const jan1 = new Date(now.getFullYear(), 0, 1);
        const startDateStr = toDateInputValue(jan1);
        const future = new Date(now);
        future.setDate(future.getDate() + 7);
        const endDateStr = toDateInputValue(future);
        const start = startOfDay(startDateStr);
        const end = endOfDay(endDateStr);

        // 4) filter EXACTLY like Profits.js (effective date within range)
        const filtered = rows.filter((p) => {
          const d = getEffectiveDate(p);
          if (!d) return false;
          if (start && d < start) return false;
          if (end && d > end) return false;
          return true;
        });

        // 5) totals EXACTLY like Profits.js
        let income = 0;
        let expense = 0;

        // also compute month slices + chart within the SAME filtered set
        const year = now.getFullYear();
        const month = now.getMonth();

        let incM = 0;
        let expM = 0;
        let incMCount = 0;

        const monthlyIncome = Array(12).fill(0);

        filtered.forEach((p) => {
          const amount = parseAmount(p.amount);
          const tt = String(p.type || "").toLowerCase().trim();

          const isIncome = tt.includes("income");
          const isExpense =
            tt.includes("expense") ||
            tt.includes("staff payment") ||
            tt.includes("payout") ||
            tt.includes("pay out");

          if (isIncome) income += amount;
          else if (isExpense) expense += Math.abs(amount);
          else {
            if (amount < 0) expense += Math.abs(amount);
            else income += amount;
          }

          // Month slices (must use effective date)
          const d = getEffectiveDate(p);
          if (d && d.getFullYear() === year && d.getMonth() === month) {
            if (isIncome) {
              incM += amount;
              if (amount > 0) incMCount += 1;
            } else if (isExpense) {
              expM += Math.abs(amount);
            } else {
              if (amount < 0) expM += Math.abs(amount);
              else {
                incM += amount;
                if (amount > 0) incMCount += 1;
              }
            }
          }

          // Chart: income contributions only (same bucket)
          const dd = getEffectiveDate(p);
          if (dd && dd.getFullYear() === year) {
            if (isIncome && amount > 0) monthlyIncome[dd.getMonth()] += amount;
            else if (!isExpense && amount > 0) monthlyIncome[dd.getMonth()] += amount;
          }
        });

        const net = income - expense;

        setIncomeYTD(income);
        setExpenseYTD(expense);
        setNetYTD(net);

        setIncomeMonth(incM);
        setExpenseMonth(expM);
        setIncomeMonthCount(incMCount);

        setMonthlyProfits(
          monthlyIncome.map((amt, i) => ({
            month: new Date(0, i).toLocaleString("default", { month: "short" }),
            amount: Number(amt.toFixed(2)),
          }))
        );
      } catch (err) {
        console.error("❌ Ledger error:", err);
        setIncomeYTD(0);
        setExpenseYTD(0);
        setNetYTD(0);
        setIncomeMonth(0);
        setExpenseMonth(0);
        setIncomeMonthCount(0);
        setMonthlyProfits([]);
      }
    };

    fetchLedger();
  }, [apiUrl, getEffectiveDate, parseAmount, startOfDay, endOfDay, toDateInputValue]);

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

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">📊 Admin Dashboard</h2>

      <div className="dashboard-grid">
        {/* ROW 1 — MONEY (matches Profits page default filter: Jan 1 -> today) */}
        <div className="card">
          <h3>💰 Income (YTD {currentYear})</h3>
          <p className="earnings-amount">{money(incomeYTD)}</p>
          <p>This Month: {money(incomeMonth)}</p>
          <p>Entries: {incomeMonthCount}</p>
        </div>

        <div className="card">
          <h3>💸 Expense (YTD {currentYear})</h3>
          <p className="earnings-amount">{money(expenseYTD)}</p>
          <p>This Month: {money(expenseMonth)}</p>
          <small>Matches Profits page rules</small>
        </div>

        <div className="card">
          <h3>💹 Net Profit (YTD {currentYear})</h3>
          <p className="earnings-amount">{money(netYTD)}</p>
          <small>Income − Expense (same as Profits page)</small>
        </div>

        {/* ROW 2 — TASKS / CHART / MILEAGE */}
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

        <div className="card">
          <h3>📱 QR Scan Sources</h3>

          {qrStats.length === 0 ? (
            <p>No scan data yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {qrStats.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                    color: "black",
                  }}
                >
                  <span>{row.ref}</span>
                  <strong>{row.count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>🖱️ QR Click Tracking</h3>

          {qrClickStats.length === 0 ? (
            <p>No click data yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {qrClickStats.map((row, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px",
                    background: "#f8f9fa",
                    borderRadius: "6px",
                    color: "black",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{row.ref}</div>
                  <div>
                    {row.button_name}: <strong>{row.count}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>🚗 My Mileage (Round-Trip)</h3>
          <p className="earnings-amount">{Number(mileageTotal).toFixed(2)} mi</p>
          <small>Calculated from your saved address</small>
        </div>

        {/* ROW 3 — ADMIN TOOLS / ANNOUNCEMENTS */}
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
