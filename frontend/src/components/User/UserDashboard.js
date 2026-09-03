import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dateOnlyKey, easternTodayKey } from "../../utils/dateOnly";

const UserDashboard = () => {
  const [claimedGigs, setClaimedGigs] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [mileageTotal, setMileageTotal] = useState(0);
  const [myRating, setMyRating] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
  const userId = loggedInUser?.id;

  /* ============================
     ⭐ My Rating
  ============================ */
  useEffect(() => {
    const loadMyRating = async () => {
      try {
        if (!userId) return;

        const r = await fetch(`${apiUrl}/api/me/rating-summary?userId=${userId}`);
        const j = await r.json();
        if (r.ok) setMyRating(j);
      } catch (err) {
        console.error("❌ Error loading my rating:", err);
      }
    };

    loadMyRating();
  }, [apiUrl, userId]);

  /* ============================
     Upcoming Gigs
  ============================ */
  useEffect(() => {
    const fetchClaimedGigs = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/gigs/claimed/${userId}`);
        const allGigs = await res.json();
        const today = easternTodayKey();
        const upcoming = allGigs
          .filter((g) => dateOnlyKey(g.date) >= today)
          .sort((a, b) => dateOnlyKey(a.date).localeCompare(dateOnlyKey(b.date)))
          .slice(0, 3);
        setClaimedGigs(upcoming);
      } catch (err) {
        console.error("❌ Error loading claimed gigs:", err);
      }
    };

    if (userId) fetchClaimedGigs();
  }, [apiUrl, userId]);

  /* ============================
     Earnings (This Month)
  ============================ */
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/gigs/claimed/${userId}`);
        const allGigs = await res.json();
        const month = new Date().getMonth();
        const year = new Date().getFullYear();

        const total = allGigs.reduce((sum, gig) => {
          const gigDate = new Date(gig.date);
          if (gigDate.getMonth() === month && gigDate.getFullYear() === year) {
            return sum + Number(gig.pay || 0);
          }
          return sum;
        }, 0);

        setEarnings(total);
      } catch (err) {
        console.error("❌ Error calculating earnings:", err);
      }
    };

    if (userId) fetchEarnings();
  }, [apiUrl, userId]);

  /* ============================
     🚗 Mileage (This Year)
  ============================ */
  useEffect(() => {
    const fetchMileage = async () => {
      try {
        const year = new Date().getFullYear();
        const res = await fetch(`${apiUrl}/api/mileage/${userId}?year=${year}`);
        const data = await res.json();

        const totalMiles = data.reduce((sum, row) => sum + Number(row.miles || 0), 0);
        setMileageTotal(totalMiles);
      } catch (err) {
        console.error("❌ Error loading mileage:", err);
      }
    };

    if (userId) fetchMileage();
  }, [apiUrl, userId]);

  return (
    <div className="dashboard-container staff-workspace staff-dashboard-workspace">
      <header className="staff-page-header">
        <span>STAFF PORTAL</span>
        <h1>Welcome to Your Dashboard</h1>
        <p>Your schedule, earnings, mileage, and feedback at a glance.</p>
      </header>

      <div className="dashboard-grid">
        {/* 💰 Earnings */}
        <div className="card">
          <h3>💰 This Month's Earnings</h3>
          <p className="earnings-amount">${earnings.toFixed(2)}</p>
        </div>

        {/* 🚗 Mileage */}
        <div className="card">
          <h3>🚗 Miles Logged (This Year)</h3>
          <p className="earnings-amount">{mileageTotal.toFixed(2)} mi</p>
          <small>Automatically tracked from your address</small>
        </div>

        {/* ⭐ My Rating */}
        <div className="card">
          <h3>⭐ My Client Rating</h3>
          {myRating ? (
            <>
              <p className="earnings-amount">⭐ {Number(myRating.avg || 0).toFixed(2)}</p>
              <small>Based on {myRating.count || 0} client reviews</small>
            </>
          ) : (
            <p style={{ margin: 0, opacity: 0.7 }}>No ratings yet.</p>
          )}
        </div>

        {/* 📎 Staff Resources */}
        <div className="card">
          <h3>📎 Staff Resources</h3>
          <div className="resource-list-items">
            <div className="resource-item">
              <Link to="/gigs/cocktails-ingredients">🍸 Cocktail Ingredients</Link>
            </div>
            <div className="resource-item">
              <a href="/resources/bartender_guide.pdf" target="_blank" rel="noopener noreferrer">
                📘 Bartender Handbook (PDF)
              </a>
            </div>
            <div className="resource-item">
              <a href="mailto:readybartending.schedule@gmail.com">📧 Contact Supervisor</a>
            </div>
          </div>
        </div>

        {/* 🗓 Upcoming Gigs */}
        <div className="card">
          <h3>🗓 My Upcoming Gigs</h3>
          {claimedGigs.length === 0 ? (
            <p>No upcoming gigs.</p>
          ) : (
            <ul className="dashboard-gigs-list">
              {claimedGigs.map((gig) => (
                <li key={gig.id} className="dashboard-gig-item">
                  <strong>{gig.event_type}</strong>
                  <br />
                  {gig.date} @ {gig.time}
                  <br />
                  {gig.location}
                  <br />
                  💵 ${gig.pay}
                </li>
              ))}
            </ul>
          )}
          <Link to="/user/your-gigs" className="btn-small">
            View All My Gigs
          </Link>
        </div>

      </div>
    </div>
  );
};

export default UserDashboard;
