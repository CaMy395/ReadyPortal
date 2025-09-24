// frontend/src/pages/ClientSchedulingSuccess.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

/** ---------- Config ---------- */
const TZ = "America/New_York";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

/** ---------- Time helpers (TZ-safe) ---------- */
function toYMD(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYMD(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function nextMonday(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // Sun=0..Sat=6
  const diff = (8 - day) % 7 || 7; // strictly next Monday
  return addDays(d, diff);
}

/** Timezone-safe formatter:
 *  - we DON'T reinterpret "18:00:00" as UTC; we render those clock times as chosen
 *  - we take the TZ name (EDT/EST) from a stable "noon" moment on that date
 */
function fmtWhen(dateStr, startStr, endStr, tz = TZ) {
  if (!dateStr || !startStr) return "";
  try {
    const [yyyy, mm, dd] = String(dateStr).split("-").map(Number);
    if (!yyyy || !mm || !dd) return "";
    const noonUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0)); // stable date label

    // Date label in target TZ
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(noonUTC);

    // Short TZ name (EDT/EST)
    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      timeZoneName: "short",
    }).formatToParts(noonUTC);
    const tzShort = (tzParts.find((p) => p.type === "timeZoneName") || {}).value || "ET";

    // "18:00[:ss]" -> "6:00 PM"
    const to12h = (t) => {
      const [hStr, mStr = "0"] = String(t).split(":");
      let h = Number(hStr);
      const m = String(Number(mStr)).padStart(2, "0");
      const period = h >= 12 ? "PM" : "AM";
      h = (h % 12) || 12;
      return `${h}:${m} ${period}`;
    };

    const start12 = to12h(startStr);
    const end12 = endStr ? to12h(endStr) : null;

    return end12
      ? `${dateLabel} • ${start12} – ${end12} ${tzShort}`
      : `${dateLabel} • ${start12} ${tzShort}`;
  } catch {
    return "";
  }
}

/** ---------- Course session generator ----------
 * Default: Mon–Thu for two weeks (8 classes), 6–9 PM.
 * If cycleStartYMD is provided, use it as the Monday anchor; else next Monday.
 */
function generateCourseSessions(cycleStartYMD) {
  const startDate = parseYMD(cycleStartYMD) || nextMonday();
  const OFFSETS = [0, 1, 2, 3, 7, 8, 9, 10]; // M–Th x 2 weeks
  const START = "18:00:00";
  const END = "21:00:00";
  return OFFSETS.map((offset, i) => {
    const d = addDays(startDate, offset);
    return {
      index: i + 1,
      date: toYMD(d),
      time: START,
      end_time: END,
      title: `Bartending Course - Class ${i + 1}`,
    };
  });
}

/** ---------- Small utils ---------- */
const norm = (s) => String(s || "").trim().toLowerCase();
const coalesceFromServer = (row) => ({
  id: row.id || row.appointmentId || row.appointment_id,
  title: row.title,
  date: row.date,
  time: row.time,
  end_time: row.end_time,
  client_email: row.client_email,
});

export default function ClientSchedulingSuccess() {
  const [searchParams] = useSearchParams();
  const [finalizing, setFinalizing] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const onceRef = useRef(false);

  // Params from redirect(s)
  const paymentLinkId = searchParams.get("paymentLinkId") || ""; // present for Square checkout flow
  const emailParam = searchParams.get("email") || "";
  const titleParam = searchParams.get("title") || "";
  const itemNameParam = searchParams.get("itemName") || ""; // e.g. "Bartending Course Deposit"
  const amountParam = searchParams.get("amount") || ""; // gross amount charged
  const dateParam = searchParams.get("date") || "";
  const timeParam = searchParams.get("time") || "";
  const endParam = searchParams.get("end") || "";
  const cycleStartParam = searchParams.get("cycleStart") || ""; // optional YYYY-MM-DD from upstream
  const courseParam = searchParams.get("course") || ""; // optional "1"
  const nameParam = searchParams.get("name") || ""; // optional

  // Fallback from localStorage (appointments via scheduler)
  const pendingAppointment = useMemo(() => {
    try {
      const raw = localStorage.getItem("pendingAppointment");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  /** Merge saved + URL to form a robust base payload */
  function mergeFromLocalAndURL() {
    const b = pendingAppointment || {};
    const emailFallback = (emailParam || b.client_email || "").trim();
    return {
      ...b,
      title: (b.title || titleParam || itemNameParam || "").trim() || "Bartending Course",
      client_name: (b.client_name || b.client_email || nameParam || emailFallback || "Guest").trim(),
      client_email: emailFallback,
      date: b.date || dateParam,
      time: b.time || timeParam,
      end_time: b.end_time || endParam,
      price: Number(b.price || 0) || 0,
      cycleStart: b.cycleStart || cycleStartParam || "",
      courseFlag: courseParam === "1",
    };
  }

  function isCourseFrom(base) {
    const t = String(base?.title || "").toLowerCase();
    const itemT = String(itemNameParam || "").toLowerCase();
    return (
      t.includes("course") ||
      itemT.includes("course") ||
      base?.courseFlag ||
      // if no date/time present, treat as course (these often skip scheduler)
      (!base?.date && !base?.time)
    );
  }

  function requireBasicsOrThrow(p, label) {
    if (!p.title || !p.date || !p.time || !p.client_email) {
      throw new Error(`${label}: missing details. If you completed payment, please contact us.`);
    }
  }

  useEffect(() => {
    if (onceRef.current) return;
    onceRef.current = true;

    (async () => {
      try {
        const base = mergeFromLocalAndURL();
        const amountNum = Number(amountParam || NaN);
        const paidAmount = Number.isFinite(amountNum)
          ? amountNum
          : Number(base.price || 0) || 0;

        if (paymentLinkId || amountParam) {
          // Paid Square checkout return
          if (isCourseFrom(base)) {
            await finalizeCourse(base, paidAmount);
          } else {
            await finalizePaid(base, paidAmount);
          }
        } else if (emailParam) {
          // Non-checkout returns (save-card deposit, application, etc.)
          if (isCourseFrom(base)) {
            await finalizeCourse(base, paidAmount);
          } else {
            await finalizeNoPayment(base);
          }
        } else {
          setError("We couldn’t find booking details to finalize. If you completed payment, please contact us.");
        }
      } catch (e) {
        setError(e?.message || "Something went wrong finalizing your booking.");
      } finally {
        setFinalizing(false);
        localStorage.removeItem("pendingAppointment");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ---- Core finalize flows ---- */
  async function finalizePaid(preset, paidAmount) {
    const base = preset || mergeFromLocalAndURL();
    // normal one-off appointment
    requireBasicsOrThrow(base, "Paid finalize");
    const created = await createOrFindAppointment({
      title: base.title,
      client_name: base.client_name || base.client_email,
      client_email: base.client_email,
      date: base.date,
      time: base.time,
      end_time: base.end_time,
      status: "confirmed",
      payment_method: "Square",
      amount_paid: paidAmount,
      price: paidAmount,            // ✅ make singles match course behavior

    });
    if (created) {
      setResult({
        appointmentId: created.id,
        title: created.title || base.title,
        date: created.date || base.date,
        start: created.time || base.time,
        end: created.end_time || base.end_time,
        amount: paidAmount,
      });
    }
  }

  // Unified course finalize: create Class 1 (server expands to 8)
  async function finalizeCourse(preset, paidAmount = 0) {
    const base = preset || mergeFromLocalAndURL();
    const email = (base.client_email || "").trim();
    if (!email) throw new Error("Course finalize: missing client email.");

    const sessions = generateCourseSessions(base.cycleStart || "");
    const first = sessions[0];

    const createResp = await axios.post(`${API_URL}/appointments`, {
      title: base.title || "Bartending Course",
      client_name: base.client_name || email,
      client_email: email,
      date: first.date,
      time: first.time,
      end_time: first.end_time,
      status: "confirmed",
      payment_method: "Square",
      price: Number(base.price || paidAmount || 0) || 0, // server records the money on Class 1
      amount_paid: paidAmount,
      source: "course-auto",
      isAdmin: true,
    });

    if (createResp?.status === 201 && createResp.data?.appointment) {
      setResult({
        appointmentId: createResp.data.appointment.id,
        title: base.title || "Bartending Course",
        date: first.date,
        start: first.time,
        end: first.end_time,
        amount: Number(base.price || paidAmount || 0) || 0,
      });
    } else if (createResp?.status === 200 && createResp.data?.appointment) {
      // Some backends might return 200; handle generously
      const a = createResp.data.appointment;
      setResult({
        appointmentId: a.id,
        title: base.title || a.title || "Bartending Course",
        date: first.date,
        start: first.time,
        end: first.end_time,
        amount: Number(base.price || paidAmount || 0) || 0,
      });
    } else {
      throw new Error("We couldn’t finalize automatically. If you completed payment, please contact us.");
    }
  }

  async function finalizeNoPayment(preset) {
    // Application / non-paid flows still require date/time
    const base = preset || mergeFromLocalAndURL();
    requireBasicsOrThrow(base, "Finalize");
    const created = await createOrFindAppointment({
      title: base.title,
      client_name: base.client_name || base.client_email || "Guest",
      client_email: base.client_email,
      date: base.date,
      time: base.time,
      end_time: base.end_time,
      status: "confirmed",
      payment_method: base.payment_method || "None",
      amount_paid: base.price || 0,
    });
    if (created) {
      setResult({
        appointmentId: created.id,
        title: created.title || base.title,
        date: created.date || base.date,
        start: created.time || base.time,
        end: created.end_time || base.end_time,
        amount: base.price || 0,
      });
    }
  }

  /** ---- Create-or-find helpers ---- */
  async function createOrFindAppointment(payload) {
    try {
      const res = await axios.post(`${API_URL}/appointments`, payload, {
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
      });

      if (res.status === 201 && res.data?.appointment) return coalesceFromServer(res.data.appointment);
      if (res.status === 200 && res.data?.duplicate && res.data?.existing) return coalesceFromServer(res.data.existing);
      if (res.status === 409) {
        const found = await lookupExisting(payload);
        if (found) return found;
      }

      const found = await lookupExisting(payload);
      if (found) return found;
      throw new Error(`Create failed (status ${res.status})`);
    } catch {
      const found = await lookupExisting(payload);
      if (found) return found;
      throw new Error("We couldn’t finalize automatically. If you completed payment, please contact us.");
    }
  }

  async function lookupExisting(payload) {
    const date = payload?.date;
    const email = (payload?.client_email || "").trim();
    if (!date || !email) return null;
    try {
      const r = await axios.get(`${API_URL}/appointments/by-date`, { params: { date } });
      const list = Array.isArray(r?.data) ? r.data : [];
      const emailN = norm(email);
      const timeN = norm(payload?.time);
      const titleN = norm(payload?.title);

      let match =
        list.find(
          (x) =>
            norm(x.client_email) === emailN &&
            norm(x.time) === timeN &&
            norm(x.title) === titleN
        ) ||
        list.find((x) => norm(x.client_email) === emailN && norm(x.time) === timeN) ||
        list.find((x) => norm(x.client_email) === emailN);

      return match ? coalesceFromServer(match) : null;
    } catch {
      return null;
    }
  }

  /** ---- Display ---- */
  const safeTitle = useMemo(() => {
    if (result?.title && String(result.title).trim()) return String(result.title).trim();
    const merged = mergeFromLocalAndURL();
    return merged.title || "Unknown Appointment";
  }, [result]);

  // Prefer values we carried through (URL/localStorage) to ensure the exact chosen times are shown.
  const whenString = useMemo(() => {
    const b = mergeFromLocalAndURL();
    const date = b.date || result?.date;
    const start = b.time || result?.start;
    const end = b.end_time || result?.end;
    return fmtWhen(date, start, end, TZ);
  }, [result]);

  const amountDisplay = useMemo(() => {
    const n = Number(result?.amount ?? (mergeFromLocalAndURL().price ?? 0));
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }, [result]);

  return (
    <div style={{ maxWidth: 760, margin: "20px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 12 }}>Payment / Booking Status</h2>

      {finalizing && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffeeba", color: "#856404", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          <strong>Finalizing your booking…</strong> Please don’t close or navigate away.
        </div>
      )}

      {!!error && (
        <div style={{ background: "#fdecea", border: "1px solid #f5c2c7", color: "#b02a37", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!!result && (
        <div style={{ background: "#e6ffed", border: "1px solid #b7eb8f", color: "#135200", padding: "12px 14px", borderRadius: 10, marginBottom: 12, lineHeight: 1.45 }}>
          <strong style={{ display: "block", marginBottom: 6 }}>You're all set! 🎉</strong>
          {result?.appointmentId && <div><strong>Appointment ID:</strong> {result.appointmentId}</div>}
          <div><strong>What:</strong> {safeTitle}</div>
          <div><strong>When:</strong> {whenString || "—"}</div>
          <div><strong>Amount recorded:</strong> ${amountDisplay}</div>
          <div style={{ marginTop: 10 }}>
            <Link to="/rb">Back to Portal</Link>
          </div>
        </div>
      )}
    </div>
  );
}
