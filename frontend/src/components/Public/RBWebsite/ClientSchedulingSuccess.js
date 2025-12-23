// ClientSchedulingSuccess.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const TZ = "America/New_York";

/** ---------- Date helpers (UTC-based) ---------- */
function toYMD(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function parseYMD(ymd) {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function nextMonday() {
  const now = new Date();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
  );
  const day = base.getUTCDay(); // 0–6
  const offset = (8 - day) % 7 || 7; // strictly next Monday
  return addDays(base, offset);
}

function nextSaturday() {
  const now = new Date();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
  );
  const day = base.getUTCDay(); // 0–6
  const offset = (6 - day + 7) % 7; // 0 if already Sat, else days until Sat
  return addDays(base, offset);
}

/** Parse the label like "Dec 6 - Jan 24" into a yyyy-mm-dd start date */
function deriveCycleStartYMD(setScheduleLabel) {
  if (!setScheduleLabel) return "";
  const firstPart = String(setScheduleLabel).split("-")[0].trim(); // e.g. "Dec 6"
  if (!firstPart) return "";

  const now = new Date();
  const thisYear = now.getUTCFullYear();

  const makeYMD = (year) => {
    const d = new Date(`${firstPart} ${year}`);
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  let candidateYMD = makeYMD(thisYear);
  if (!candidateYMD) return "";

  const candidateDate = parseYMD(candidateYMD) || new Date();
  const twoWeeksAgo = addDays(new Date(), -14);
  if (candidateDate < twoWeeksAgo) {
    const nextYearYMD = makeYMD(thisYear + 1);
    if (nextYearYMD) candidateYMD = nextYearYMD;
  }

  return candidateYMD;
}

/** Timezone-safe formatter for the "When:" line */
function fmtWhen(dateStr, startStr, endStr, tz) {
  if (!dateStr || !startStr) return "";
  try {
    const [yyyy, mm, dd] = dateStr.split("-").map((x) => Number(x));
    if (!yyyy || !mm || !dd) return "";
    const noonUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));

    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(noonUTC);

    const tzParts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      timeZoneName: "short",
    }).formatToParts(noonUTC);
    const tzShort =
      (tzParts.find((p) => p.type === "timeZoneName") || {}).value || "ET";

    const to12h = (t) => {
      const [hStr, mStr = "0"] = String(t).split(":");
      let h = Number(hStr);
      const m = String(Number(mStr)).padStart(2, "0");
      const period = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
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

/** ---------- Course session generator (respects Weekdays vs Saturdays) ---------- */
function generateCourseSessions(cycleStartYMD, preferredTime) {
  const pref = String(preferredTime || "").toLowerCase();

  const weekendText =
    pref.includes("weekend") ||
    pref.includes("weekends") ||
    pref.includes("saturday") ||
    pref.includes(" sat");

  let startDate = parseYMD(cycleStartYMD);
  if (!startDate) {
    startDate = weekendText ? nextSaturday() : nextMonday();
  }

  const dayOfWeek = startDate.getUTCDay();
  const isWeekend = weekendText || dayOfWeek === 6;

  if (isWeekend) {
    const START = "11:00:00";
    const END = "14:00:00";
    const sessions = [];
    for (let i = 0; i < 8; i++) {
      const d = addDays(startDate, i * 7);
      sessions.push({
        index: i + 1,
        date: toYMD(d),
        time: START,
        end_time: END,
        title: `Bartending Course - Class ${i + 1}`,
      });
    }
    return sessions;
  }

  const OFFSETS = [0, 1, 2, 3, 7, 8, 9, 10];
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

function safeString(s) {
  return (s ?? "").toString();
}

function extractAxiosErrorMessage(err) {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  const sq = data?.errors?.[0]?.detail;
  if (sq) return sq;
  return err?.message || "Unknown error";
}

export default function ClientSchedulingSuccess() {
  const [searchParams] = useSearchParams();
  const [finalizing, setFinalizing] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const onceRef = useRef(false);

  // Params from redirect(s)
  const paymentLinkId = searchParams.get("paymentLinkId") || "";
  const emailParam = searchParams.get("email") || "";
  const titleParam = searchParams.get("title") || "";
  const itemNameParam = searchParams.get("itemName") || "";
  const amountParam = searchParams.get("amount") || "";
  const dateParam = searchParams.get("date") || "";
  const timeParam = searchParams.get("time") || "";
  const endParam = searchParams.get("end") || "";
  const cycleStartParam = searchParams.get("cycleStart") || "";
  const courseParam = searchParams.get("course") || "";
  const nameParam = searchParams.get("name") || "";

  // From localStorage: pending appointment & original course form
  const pendingAppointment = useMemo(() => {
    try {
      const raw = localStorage.getItem("pendingAppointment");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const pendingCourse = useMemo(() => {
    try {
      const raw = localStorage.getItem("pendingBartendingCourse");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  /** Merge saved + URL to form a robust base payload */
  function mergeFromLocalAndURL() {
    const b = pendingAppointment || {};
    const c = pendingCourse || {};

    const emailFallback = (emailParam || b.client_email || c.email || "").trim();
    const setScheduleLabel = b.setSchedule || c.setSchedule || "";
    const preferredTime = b.preferredTime || c.preferredTime || "";

    const derivedCycleStart =
      b.cycleStart || cycleStartParam || deriveCycleStartYMD(setScheduleLabel);

    return {
      ...c,
      ...b,
      title:
        (b.title || c.title || titleParam || itemNameParam || "").trim() ||
        "Bartending Course",
      client_name: (
        b.client_name ||
        c.fullName ||
        b.client_email ||
        nameParam ||
        emailFallback ||
        "Guest"
      ).trim(),
      client_email: emailFallback,
      date: b.date || c.date || dateParam,
      time: b.time || c.time || timeParam,
      end_time: b.end_time || c.end_time || endParam,
      price: Number(b.price || c.price || 0) || 0,
      cycleStart: derivedCycleStart,
      preferredTime,
      courseFlag: courseParam === "1" || b.courseFlag || c.courseFlag,
      setSchedule: setScheduleLabel,
    };
  }

  function isCourseFrom(base) {
    const t = String(base?.title || "").toLowerCase();
    const itemT = String(itemNameParam || "").toLowerCase();
    return (
      t.includes("course") ||
      itemT.includes("course") ||
      base?.courseFlag ||
      (!base?.date && !base?.time)
    );
  }

  function requireBasicsOrThrow(p, label) {
    if (!p.title || !p.date || !p.time || !p.client_email) {
      throw new Error(
        `${label}: missing details. If you completed payment, please contact us.`
      );
    }
  }

  function isBarePaymentFlow() {
    const hasPayment = !!paymentLinkId || !!amountParam;
    if (!hasPayment) return false;

    const hasApptHints =
      !!pendingAppointment ||
      !!pendingCourse ||
      !!dateParam ||
      !!timeParam ||
      !!cycleStartParam ||
      courseParam === "1";

    return !hasApptHints;
  }

  /** If backend returns 500 after already creating appointment (calendar/email fail),
   *  we try to look it up and still show success.
   */
  async function rescueIfCreated(base, paidAmount) {
    try {
      // If we have a date + email + time, we can lookup
      const date = base?.date;
      const email = (base?.client_email || "").trim();
      if (!date || !email) return null;

      const existing = await lookupExisting({
        title: base?.title,
        client_email: email,
        date,
        time: base?.time,
      });

      if (existing) {
        setResult({
          appointmentId: existing.id,
          title: existing.title || base.title,
          date: existing.date || base.date,
          start: existing.time || base.time,
          end: existing.end_time || base.end_time,
          amount: paidAmount,
        });
        return existing;
      }
      return null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (onceRef.current) return;
    onceRef.current = true;

    (async () => {
      const base = mergeFromLocalAndURL();

      try {
        const amountNum = Number(amountParam || NaN);
        const paidAmount = Number.isFinite(amountNum)
          ? amountNum
          : Number(base.price || 0) || 0;

        if (isBarePaymentFlow()) {
          setResult({
            appointmentId: null,
            title: itemNameParam || titleParam || base.title || "Payment Received",
            date: "",
            start: "",
            end: "",
            amount: paidAmount,
          });
          return;
        }

        // paid flow
        if (paymentLinkId || amountParam) {
          if (isCourseFrom(base)) {
            await finalizeCourse(base, paidAmount);
          } else {
            await finalizePaid(base, paidAmount);
          }
          return;
        }

        // no-payment flow but email param present
        if (emailParam) {
          if (isCourseFrom(base)) {
            await finalizeCourse(base, paidAmount);
          } else {
            await finalizeNoPayment(base);
          }
          return;
        }

        setError(
          "We couldn’t find booking details to finalize. If you completed payment, please contact us."
        );
      } catch (e) {
        const msg = extractAxiosErrorMessage(e);

        // Rescue path: backend may have inserted appointment but failed on calendar/email, returning 500.
        const paidAmountFallback = Number(amountParam || base.price || 0) || 0;
        const rescued = await rescueIfCreated(base, paidAmountFallback);

        if (!rescued) {
          setError(msg || "Something went wrong finalizing your booking.");
        }
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
      price: paidAmount,
      // keep any extras if present
      guestCount: base.guestCount,
      classCount: base.classCount,
      addons: base.addons,
      description: base.description || `Client booked a ${base.title} appointment`,
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

  // Course finalize: create Class 1; backend can expand to full series
  async function finalizeCourse(preset, paidAmount = 0) {
    const base = preset || mergeFromLocalAndURL();
    const email = (base.client_email || "").trim();
    if (!email) throw new Error("Course finalize: missing client email.");

    const sessions = generateCourseSessions(base.cycleStart || "", base.preferredTime || "");
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
      price: Number(base.price || paidAmount || 0) || 0,
      amount_paid: paidAmount,
      source: "course-auto",
      isAdmin: true,
      // carry extras if you stored them in pending
      addons: base.addons,
      guestCount: base.guestCount,
      classCount: base.classCount,
    });

    const appt = createResp?.data?.appointment;
    if (appt) {
      setResult({
        appointmentId: appt.id,
        title: base.title || appt.title || "Bartending Course",
        date: first.date,
        start: first.time,
        end: first.end_time,
        amount: Number(base.price || paidAmount || 0) || 0,
      });
      return;
    }

    throw new Error(
      "We couldn’t finalize automatically. If you completed payment, please contact us."
    );
  }

  async function finalizeNoPayment(preset) {
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
      price: base.price || 0,
      addons: base.addons,
      guestCount: base.guestCount,
      classCount: base.classCount,
      description: base.description || `Client booked a ${base.title} appointment`,
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

  async function createOrFindAppointment(payload) {
    const existing = await lookupExisting(payload);
    if (existing) return existing;

    const resp = await axios.post(`${API_URL}/appointments`, {
      ...payload,
      isAdmin: true,
    });

    if (resp.status === 201 && resp.data?.appointment) {
      return coalesceFromServer(resp.data.appointment);
    }
    if (resp.status === 200 && resp.data?.appointment) {
      return coalesceFromServer(resp.data.appointment);
    }

    throw new Error("Could not create appointment from payment.");
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

      const match =
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

  const emailDisplay = useMemo(() => {
    const b = mergeFromLocalAndURL();
    return safeString(b.client_email || emailParam).trim();
  }, [emailParam]);

  return (
    <div style={{ maxWidth: 760, margin: "20px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 12 }}>Payment / Booking Status</h2>

      {finalizing && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            color: "#856404",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <strong>Finalizing your booking…</strong> Please don’t close or navigate away.
        </div>
      )}

      {!!error && (
        <div
          style={{
            background: "#fdecea",
            border: "1px solid #f5c2c7",
            color: "#b02a37",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>We hit a snag.</div>
          <div style={{ marginBottom: 10 }}>{error}</div>

          {!!emailDisplay && (
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              If you already paid, please screenshot this page and email support. <br />
              <strong>Email on file:</strong> {emailDisplay}
            </div>
          )}
        </div>
      )}

      {!!result && (
        <div
          style={{
            background: "#e6ffed",
            border: "1px solid #b7eb8f",
            color: "#135200",
            padding: "12px 14px",
            borderRadius: 10,
            marginBottom: 12,
            lineHeight: 1.45,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>You're all set! 🎉</strong>

          {result?.appointmentId && (
            <div>
              <strong>Appointment ID:</strong> {result.appointmentId}
            </div>
          )}

          <div>
            <strong>What:</strong> {safeTitle}
          </div>

          <div>
            <strong>When:</strong> {whenString || "—"}
          </div>

          <div>
            <strong>Amount recorded:</strong> ${amountDisplay}
          </div>

          <div style={{ marginTop: 10 }}>
            <Link to="/rb">Back to Portal</Link>
          </div>
        </div>
      )}

      {!finalizing && !error && !result && (
        <div
          style={{
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            color: "#1e3a8a",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          We couldn’t find booking details to display. If you completed payment, please contact us.
        </div>
      )}
    </div>
  );
}
