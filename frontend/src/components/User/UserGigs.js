import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import YourGigs from './YourGigs';
import UserAttendance from './UserAttendance';

const UserGigs = () => {
  const [gigs, setGigs] = useState([]);
  const [error, setError] = useState(null);
  const username = localStorage.getItem('username');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // =========================
  // NEW: STAFF METER HELPERS
  // =========================
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getStaffStatus = (claimedCount, neededCount) => {
    const claimed = toNum(claimedCount);
    const needed = toNum(neededCount);

    if (needed <= 0) return { label: 'STAFF N/A', tone: 'neutral', pct: 0 };
    if (claimed <= 0) return { label: 'NEEDS STAFF', tone: 'danger', pct: 0 };
    if (claimed >= needed) return { label: 'FULLY STAFFED', tone: 'success', pct: 100 };

    const pct = Math.round((claimed / needed) * 100);
    return { label: 'PARTIALLY STAFFED', tone: 'warn', pct };
  };

  const StaffMeter = ({ title, claimedCount, neededCount }) => {
    const claimed = toNum(claimedCount);
    const needed = toNum(neededCount);
    const status = getStaffStatus(claimed, needed);

    const toneStyles = {
      success: { bg: '#E8F7EE', text: '#137A3A', border: '#BFE7CE', bar: '#22C55E' },
      warn: { bg: '#FFF5E6', text: '#8A5A00', border: '#FFE1B3', bar: '#F59E0B' },
      danger: { bg: '#FFECEC', text: '#A30000', border: '#FFC9C9', bar: '#EF4444' },
      neutral: { bg: '#F2F2F2', text: '#444', border: '#DDD', bar: '#999' },
    };

    const t = toneStyles[status.tone] || toneStyles.neutral;
    const pct = needed > 0 ? Math.min(100, Math.round((claimed / needed) * 100)) : 0;

    return (
      <div
        style={{
          flex: '1 1 320px',
          minWidth: 260,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          background: '#fff',
          padding: '12px 14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.2 }}>{title}</div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: `1px solid ${t.border}`,
              background: t.bg,
              color: t.text,
              fontWeight: 900,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {status.label}
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
          }}
        >
          <div>
            <strong>{claimed}</strong> claimed / <strong>{needed}</strong> needed
          </div>
          <div style={{ opacity: 0.75 }}>{needed > 0 ? `${pct}%` : ''}</div>
        </div>

        <div style={{ marginTop: 10, height: 12, borderRadius: 999, background: '#eee', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: t.bar,
              transition: 'width 200ms ease',
            }}
          />
        </div>
      </div>
    );
  };

  // Fetch gigs from the server
  const fetchGigs = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/gigs`);
      if (!response.ok) throw new Error('Failed to fetch gigs');
      const data = await response.json();
      setGigs(data);
    } catch (error) {
      console.error('Error fetching gigs:', error);
      setError('Failed to fetch gigs.');
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  // Filter and sort claimed gigs
  const filteredGigs = useMemo(() => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 3);
    return gigs
      .filter((gig) => new Date(gig.date) >= currentDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [gigs]);

  // Claim or unclaim a regular gig
  const toggleClaimGig = async (gigId, isClaimed) => {
    const action = isClaimed ? 'unclaim' : 'claim';

    try {
      const response = await fetch(`${apiUrl}/gigs/${gigId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      await response.json();
      fetchGigs();
    } catch (error) {
      console.error(`Error ${action}ing gig:`, error.message);
      setError(`Failed to ${action} gig.`);
    }
  };

  // Claim or unclaim a backup gig
  const toggleClaimBackup = async (gigId, isBackupClaimed) => {
    const action = isBackupClaimed ? 'unclaim-backup' : 'claim-backup';

    try {
      const response = await fetch(`${apiUrl}/gigs/${gigId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      await response.json();
      fetchGigs();
    } catch (error) {
      console.error(`Error ${action}ing backup gig:`, error.message);
      setError(`Failed to ${action} backup gig.`);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const dateTimeString = `1970-01-01T${timeString}`;
    const date = new Date(dateTimeString);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  return (
    <div>
      <h2>Welcome to the Gigs Portal</h2>

      <Routes>
        <Route path="your-gigs" element={<YourGigs />} />
        <Route path="user-attendance" element={<UserAttendance />} />
      </Routes>

      <p>See the available gigs below.</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {filteredGigs.length > 0 ? (
        <ul>
          {filteredGigs.map((gig) => {
            const staffClaimed = Array.isArray(gig.claimed_by) ? gig.claimed_by.length : 0;
            const staffNeeded = toNum(gig.staff_needed);

            const backupClaimed = Array.isArray(gig.backup_claimed_by) ? gig.backup_claimed_by.length : 0;
            const backupNeeded = toNum(gig.backup_needed);

            return (
              <li key={gig.id} className="gig-card">
                {/* ✅ STAFF STATUS (TOP) */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    flexWrap: 'wrap',
                    alignItems: 'stretch',
                    width: '100%',
                    marginBottom: 16,
                    position: 'static',
                  }}
                >
                  <StaffMeter title="STAFFING" claimedCount={staffClaimed} neededCount={staffNeeded} />
                  <StaffMeter title="BACKUP" claimedCount={backupClaimed} neededCount={backupNeeded} />
                </div>

                {/* Gig details */}
                <h3>Client: {gig.client}</h3>
                <strong>Event Type:</strong> {gig.event_type} <br />
                <strong>Date:</strong> {formatDate(gig.date)} <br />
                <strong>Time:</strong> {formatTime(gig.time)} <br />
                <strong>Duration:</strong> {gig.duration} hours <br />

                <strong>Location:</strong>{' '}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gig.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="location-link"
                >
                  {gig.location}
                </a>
                <br />

                <strong>Position:</strong> {gig.position} <br />
                <strong>Pay:</strong> ${gig.pay}/hr + tips <br />

                <strong>Insurance:</strong>{' '}
                <span style={{ color: gig.confirmed ? 'green' : 'red' }}>{gig.confirmed ? 'No' : 'Yes'}</span>
                <br />

                <strong>Gender:</strong> {gig.gender} <br />
                <strong>Attire:</strong> {gig.attire || 'N/A'} <br />

                <strong>Indoor:</strong>{' '}
                <span style={{ color: gig.indoor ? 'green' : 'red' }}>{gig.indoor ? 'Yes' : 'No'}</span>
                <br />

                <strong>Approval Needed:</strong>{' '}
                <span style={{ color: gig.approval_needed ? 'red' : 'green' }}>
                  {gig.approval_needed ? 'Yes' : 'No'}
                </span>
                <br />

                <strong>On-Site Parking:</strong>{' '}
                <span style={{ color: gig.on_site_parking ? 'green' : 'red' }}>
                  {gig.on_site_parking ? 'Yes' : 'No'}
                </span>
                <br />

                <strong>Local Parking:</strong> {gig.local_parking || 'N/A'} <br />

                <strong>NDA Required:</strong>{' '}
                <span style={{ color: gig.NDA ? 'red' : 'green' }}>{gig.NDA ? 'Yes' : 'No'}</span>
                <br />

                <strong>Establishment:</strong> {gig.establishment || 'N/A'} <br />

                <strong>Claimed By:</strong> {gig.claimed_by.length > 0 ? gig.claimed_by.join(', ') : 'None'}
                <br />
                <strong>Staff Needed:</strong> {gig.staff_needed} <br />
                <strong>Backup Needed:</strong> {gig.backup_needed} <br />
                <strong>Backup Claimed By:</strong>{' '}
                {gig.backup_claimed_by.length > 0 ? gig.backup_claimed_by.join(', ') : 'None'}
                <br />

                <strong>Certification:</strong>{' '}
                <span style={{ color: gig.needs_cert ? 'red' : 'green' }}>{gig.needs_cert ? 'Yes' : 'No'}</span>
                <br />

                <strong>Confirmed:</strong>{' '}
                <span style={{ color: gig.confirmed ? 'green' : 'red' }}>{gig.confirmed ? 'Yes' : 'No'}</span>
                <br />

                {/* Buttons */}
                <button
                  className="claim-button"
                  onClick={() => toggleClaimGig(gig.id, gig.claimed_usernames?.includes(username))}
                >
                  {gig.claimed_usernames?.includes(username) ? 'Unclaim Gig' : 'Claim Gig'}
                </button>

                <button
                  className="backup-button"
                  onClick={() => toggleClaimBackup(gig.id, gig.backup_claimed_by?.includes(username))}
                >
                  {gig.backup_claimed_by?.includes(username) ? 'Unclaim Backup Gig' : 'Claim Backup Gig'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No gigs available.</p>
      )}
    </div>
  );
};

export default UserGigs;
