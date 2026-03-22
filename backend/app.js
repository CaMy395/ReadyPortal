// backend/app.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { Client, Environment } from 'square';
import crypto from 'crypto';
import moment from 'moment-timezone';
import path from 'path'; // Import path to handle static file serving
import { fileURLToPath } from 'url'; // Required for ES module __dirname
import bcrypt from 'bcryptjs';
import pool from './db.js'; // Import the centralized pool connection
import fetch from 'node-fetch';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import {
    sendQuoteEmail, sendEmailCampaign,sendGigEmailNotification,sendGigUpdateEmailNotification,sendRegistrationEmail,sendResetEmail,sendIntakeFormEmail,sendCraftsFormEmail,sendMixNSipFormEmail,sendPaymentEmail,sendAppointmentEmail,sendRescheduleEmail,sendBartendingInquiryEmail,sendBartendingClassesEmail,sendCancellationEmail,sendFeedbackRequestEmail, sendEventTicketEmail} from './emailService.js';
import multer from 'multer';
import 'dotenv/config';
import { google } from 'googleapis';
import {WebSocketServer} from 'ws';
import http from 'http';
import appointmentTypes from '../frontend/src/data/appointmentTypes.json' assert { type: 'json' };
import chatbotRouter from './routes/chatbot.js'; 
import cron from "node-cron";


const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Allow requests from specific origins
const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://ready-bartending-gigs-portal.onrender.com',
    "https://readybartending.com", // Your custom domain
    "https://www.readybartending.com" // Optional if using www
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Attach WebSocket server to the same HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const token = urlParams.get('token');

    if (!token || token !== process.env.REACT_APP_AUTH_TOKEN) {
        console.error('Invalid or missing token');
        ws.close();
        return;
    }

    console.log('WebSocket connection authenticated');
    ws.send('Connection authenticated');
});

app.use(express.json()); // Middleware to parse JSON bodies

app.use('/api/chatbot', chatbotRouter); // Use the chatbot router

// Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Multer configuration
const upload = multer({ dest: 'temp/' }); // Temporary directory for file uploads

//--------------------------------------
// MULTER CONFIG FOR EMAIL CAMPAIGN IMAGE (memory)
//--------------------------------------
const campaignUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Google Drive Authentication
let credentials;

try {
    const keyBase64 = process.env.GOOGLE_CLOUD_KEY;
    if (!keyBase64) {
        throw new Error('Environment variable GOOGLE_CLOUD_KEY is missing');
    }

    const key = Buffer.from(keyBase64, 'base64').toString('utf8');
    credentials = JSON.parse(key);
} catch (error) {
    console.error('Error loading Google Cloud credentials:', error);
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ✅ Set credentials (access + refresh token)
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});
// ============================
// ONE-TIME GOOGLE OAUTH SETUP
// ============================
// Visit /google/auth, approve access, then Google redirects to /google/oauth2callback
// Copy the refresh_token into your Render env as GOOGLE_REFRESH_TOKEN.

app.get("/google/auth", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",   // ✅ required to receive refresh_token
    prompt: "consent",        // ✅ forces refresh_token on re-auth
    scope: scopes,
  });

  res.redirect(url);
});

app.get("/google/oauth2callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing ?code=");

    const { tokens } = await oAuth2Client.getToken(code);

    // IMPORTANT: refresh_token is what you store in env
    console.log("✅ GOOGLE TOKENS:", tokens);
    console.log("✅ GOOGLE REFRESH TOKEN:", tokens.refresh_token);

    res.send(
      "OAuth success. Check your server logs for the REFRESH TOKEN and set it as GOOGLE_REFRESH_TOKEN in your env."
    );
  } catch (err) {
    console.error("❌ OAuth callback error:", err?.message || err);
    res.status(500).send("OAuth callback failed");
  }
});

// GET /auth/me
app.get('/auth/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    const result = await pool.query(
      `SELECT id, name, username, email, role
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin',
    });
  } catch (err) {
    console.error('❌ /auth/me error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        'https://www.googleapis.com/auth/drive', // existing
    ],
});


const drive = google.drive({ version: 'v3', auth });
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

// Function to upload file to Google Drive (supports optional folderId + public sharing)
async function uploadToGoogleDrive(filePath, fileName, mimeType, folderId, makePublic = false) {
  const parentFolder =
    folderId ||
    process.env.GOOGLE_DRIVE_FOLDER_DEFAULT ||
    "1n_Jr7go5XHStzot7FNfWcIhUjmmQ0OXq";

  const fileMetadata = {
    name: fileName,
    parents: [parentFolder],
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  const fileId = response.data.id;

  if (makePublic) {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  }

  return response.data; // { id, webViewLink }
}

// =========================
// Google Calendar helpers
// =========================

// ✅ Normalize any "date" input into YYYY-MM-DD (in America/New_York)
const normalizeDateYYYYMMDD = (d) => {
  const tz = "America/New_York";

  if (!d) return null;

  // If it's already a Date object
  if (d instanceof Date && !isNaN(d.getTime())) {
    return moment(d).tz(tz).format("YYYY-MM-DD");
  }

  const s = String(d).trim();

  // If it's a JS date string or any other parseable date string
  // Example: "Wed Feb 11 2026 00:00:00 GMT-0500 (Eastern Standard Time)"
  const parsed = moment(new Date(s));
  if (parsed.isValid()) {
    return parsed.tz(tz).format("YYYY-MM-DD");
  }

  // If it is already like "2026-02-11"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  return null;
};

// ✅ Robust time parser (accepts "14:30", "14:30:00", "2:30 PM", etc.)
const normalizeTime = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;

  // allow HH:mm:ss / HH:mm / h:mm A
  return s;
};

const toNYMoment = (d, t) => {
  const tz = "America/New_York";

  const dateYYYYMMDD = normalizeDateYYYYMMDD(d);
  const timeStr = normalizeTime(t) || "00:00";

  if (!dateYYYYMMDD) return moment.invalid();

  const m = moment.tz(
    `${dateYYYYMMDD} ${timeStr}`,
    [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD HH:mm",
      "YYYY-MM-DD H:mm",
      "YYYY-MM-DD h:mm A",
      "YYYY-MM-DD hh:mm A",
    ],
    tz
  );

  return m;
};

const toNYRFC3339 = (d, t) => {
  const m = toNYMoment(d, t);
  if (!m.isValid()) return null;
  return m.toISOString(); // RFC3339 dateTime string
};


// ✅ Always send dateTime for BOTH start and end
async function addEventToGoogleCalendar({ summary, description, startDateTime, endDateTime }) {
  // Validate inputs
  if (!startDateTime || !endDateTime) {
    throw new Error(`Missing start/end datetime. start=${startDateTime} end=${endDateTime}`);
  }

  // Extra guard: make sure they look like RFC3339 date-times
  // (date-only like "2026-02-11" is NOT valid for dateTime)
  if (!String(startDateTime).includes("T") || !String(endDateTime).includes("T")) {
    throw new Error(`Start/end must be RFC3339 dateTime strings. start=${startDateTime} end=${endDateTime}`);
  }

  const event = {
    summary: summary || "Appointment",
    description: description || "",
    start: { dateTime: startDateTime, timeZone: "America/New_York" },
    end: { dateTime: endDateTime, timeZone: "America/New_York" },
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: event,
  });

  return response.data;
}

// ===================================
// EVENT SESSION GOOGLE CALENDAR HELPERS
// ===================================

function toGoogleDateTimeString(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function createGoogleCalendarEventForSession({
  title,
  sessionLabel,
  locationName,
  startTime,
  endTime,
  description,
}) {
  const summary = sessionLabel
    ? `${title} - ${sessionLabel}`
    : title || "Ready Bartending Event";

  const event = {
    summary,
    description: description || "",
    location: locationName || "",
    start: {
      dateTime: toGoogleDateTimeString(startTime),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: toGoogleDateTimeString(endTime),
      timeZone: "America/New_York",
    },
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: event,
  });

  return response.data;
}

async function updateGoogleCalendarEventForSession({
  googleEventId,
  title,
  sessionLabel,
  locationName,
  startTime,
  endTime,
  description,
}) {
  if (!googleEventId) return null;

  const summary = sessionLabel
    ? `${title} - ${sessionLabel}`
    : title || "Ready Bartending Event";

  const event = {
    summary,
    description: description || "",
    location: locationName || "",
    start: {
      dateTime: toGoogleDateTimeString(startTime),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: toGoogleDateTimeString(endTime),
      timeZone: "America/New_York",
    },
  };

  const response = await calendar.events.update({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    eventId: googleEventId,
    resource: event,
  });

  return response.data;
}

async function deleteGoogleCalendarEventForSession(googleEventId) {
  if (!googleEventId) return;

  try {
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: googleEventId,
    });
  } catch (err) {
    console.error("❌ Failed to delete Google Calendar event:", err?.message || err);
  }
}

// ✅ Create calendar event from appointment row (guarantees end > start)
const makeCalEventFor = async (row) => {
  try {
    const summary = row.title || "Appointment";
    const descriptionText = (row.description || "").toString();

    // Build start
    const startIso = toNYRFC3339(row.date, row.time);

    // Build end:
    // - prefer row.end_time
    // - else default +1 hour from start
    let endIso = toNYRFC3339(row.date, row.end_time || row.time);

    if (!startIso) {
      throw new Error(`Invalid START datetime from date=${row.date} time=${row.time}`);
    }

    // If end time missing/invalid OR end <= start, force +1 hour
    const startM = moment(startIso);
    let endM = endIso ? moment(endIso) : null;

    if (!endM || !endM.isValid() || endM.isSameOrBefore(startM)) {
      endM = startM.clone().add(1, "hour");
      endIso = endM.toISOString();
    }

    const evt = await addEventToGoogleCalendar({
      summary,
      description: descriptionText,
      startDateTime: startIso,
      endDateTime: endIso,
    });

    if (evt?.id) {
      await pool.query(
        `UPDATE appointments SET google_event_id = $1 WHERE id = $2`,
        [evt.id, row.id]
      );
    }
  } catch (e) {
    console.error("❌ Google Calendar insert failed:", e?.message || e);
  }
};


// ===========================
// DOC UPLOAD ROUTES (UPDATED)
// - Unique filenames (prevents overwrites)
// - Optional per-doc folders (W9/ID/SS)
// - Safer temp file cleanup (async)
// ===========================
// ✅ Put these in your env (or hardcode if you prefer)
// If you DON'T want separate folders, leave these undefined and everything will go to your default folder in uploadToGoogleDrive.
const DRIVE_FOLDER_W9 = process.env.GOOGLE_DRIVE_FOLDER_W9_ID; // optional
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID_ID; // optional
const DRIVE_FOLDER_SS = process.env.GOOGLE_DRIVE_FOLDER_SS_ID; // optional

function sanitizeFilename(name = 'document') {
  // remove weird chars but keep dots/dashes/underscores/spaces
  return String(name).replace(/[^\w.\- ]/g, '').trim() || 'document';
}

function buildUniqueFileName({ docType, userId, originalname }) {
  const safeOriginal = sanitizeFilename(originalname);
  const safeUser = sanitizeFilename(String(userId || 'unknown'));
  const ts = Date.now();
  return `${docType}_${safeUser}_${ts}_${safeOriginal}`;
}

async function cleanupTempFile(filePath) {
  try {
    if (!filePath) return;
    await fs.promises.unlink(filePath);
  } catch (e) {
    console.warn("Temp file cleanup failed:", e?.message || e);
  }
}

async function finalizeEventOrderPayment({
  orderId,
  squareOrderId
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `
      SELECT
        eo.*,
        e.title AS event_title,
        e.flyer_drive_id,
        es.session_label,
        es.start_time,
        ett.name AS ticket_type_name
      FROM event_orders eo
      JOIN events e ON e.id = eo.event_id
      JOIN event_sessions es ON es.id = eo.session_id
      LEFT JOIN event_ticket_types ett ON ett.id = eo.ticket_type_id
      WHERE eo.id = $1
      LIMIT 1
      `,
      [orderId]
    );

    if (orderRes.rowCount === 0) {
      throw new Error("Order not found.");
    }

    const order = orderRes.rows[0];

    const paidUpdateRes = await client.query(
      `
      UPDATE event_orders
      SET payment_status = 'paid',
          square_order_id = $2,
          updated_at = NOW()
      WHERE id = $1
        AND payment_status <> 'paid'
      RETURNING *
      `,
      [orderId, squareOrderId || null]
    );

    if (paidUpdateRes.rowCount === 0) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `
      UPDATE event_sessions
      SET tickets_sold = tickets_sold + $2,
          updated_at = NOW()
      WHERE id = $1
      `,
      [order.session_id, order.attendee_count]
    );

    await client.query(
      `
      INSERT INTO profits (
        category,
        description,
        amount,
        type,
        payment_method,
        processor,
        processor_txn_id,
        client_email,
        paid_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `,
      [
        "Event",
        `${order.event_title} - ${order.session_label || "Session"}`,
        order.amount_paid,
        "income",
        "Square",
        "Square",
        squareOrderId || null,
        order.client_email || null
      ]
    );

    try {
      await sendEventTicketEmail({
        email: order.client_email,
        full_name: order.client_name,
        event_title: order.event_title,
        session_label: order.session_label,
        start_time: order.start_time,
        ticket_type: order.ticket_type_name,
        attendee_count: order.attendee_count,
        amount_paid: order.amount_paid,
        flyer_drive_id: order.flyer_drive_id,
        order_id: order.id,
      });

      console.log("✅ Event confirmation email sent");
    } catch (emailErr) {
      console.error("❌ Event email failed:", emailErr.message);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}



function getUserId(req) {
  // supports query or body; query matches your current frontend
  return req.query.userId || req.body?.userId || null;
}

// =====================
// W-9 UPLOAD
// =====================
app.post('/api/upload-w9', upload.single('w9File'), async (req, res) => {
  const userId = getUserId(req);

  try {
    if (!req.file) {
      console.error('No file uploaded (W9)');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, req.file.path);

    // ✅ Unique name prevents overwriting when many people upload "W9.pdf"
    const fileName = buildUniqueFileName({
      docType: 'W9',
      userId,
      originalname: req.file.originalname,
    });

    // ✅ If your uploadToGoogleDrive supports a folderId param, use it
    // If it doesn't, see NOTE below and I’ll show the updated helper.
    const driveResponse = await uploadToGoogleDrive(
      filePath,
      fileName,
      req.file.mimetype,
      DRIVE_FOLDER_W9 // optional
    );

    await cleanupTempFile(filePath);

    if (userId) await markDocUploadedAndMaybeClearOnboarding(userId, 'w9_uploaded');

    res.status(200).json({
      message: 'W-9 uploaded successfully',
      driveId: driveResponse.id,
      driveLink: driveResponse.webViewLink,
      fileName,
      folderId: DRIVE_FOLDER_W9 || null,
    });
  } catch (err) {
    console.error('Error uploading W-9:', err);
    // best effort cleanup
    if (req.file?.path) await cleanupTempFile(path.join(__dirname, req.file.path));
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// =====================
// ID UPLOAD
// =====================
app.post('/api/upload-id', upload.single('idFile'), async (req, res) => {
  const userId = getUserId(req);

  try {
    if (!req.file) {
      console.error('No file uploaded (ID)');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, req.file.path);

    const fileName = buildUniqueFileName({
      docType: 'ID',
      userId,
      originalname: req.file.originalname,
    });

    const driveResponse = await uploadToGoogleDrive(
      filePath,
      fileName,
      req.file.mimetype,
      DRIVE_FOLDER_ID // optional
    );

    await cleanupTempFile(filePath);

    if (userId) await markDocUploadedAndMaybeClearOnboarding(userId, 'id_uploaded');

    res.status(200).json({
      message: 'ID uploaded successfully',
      driveId: driveResponse.id,
      driveLink: driveResponse.webViewLink,
      fileName,
      folderId: DRIVE_FOLDER_ID || null,
    });
  } catch (err) {
    console.error('Error uploading ID:', err);
    if (req.file?.path) await cleanupTempFile(path.join(__dirname, req.file.path));
    res.status(500).json({ error: 'Failed to upload ID file' });
  }
});

// =====================
// SS CARD UPLOAD
// =====================
app.post('/api/upload-ss', upload.single('ssFile'), async (req, res) => {
  const userId = getUserId(req);

  try {
    if (!req.file) {
      console.error('No file uploaded (SS)');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, req.file.path);

    const fileName = buildUniqueFileName({
      docType: 'SS',
      userId,
      originalname: req.file.originalname,
    });

    const driveResponse = await uploadToGoogleDrive(
      filePath,
      fileName,
      req.file.mimetype,
      DRIVE_FOLDER_SS // optional
    );

    await cleanupTempFile(filePath);

    if (userId) await markDocUploadedAndMaybeClearOnboarding(userId, 'ss_uploaded');

    res.status(200).json({
      message: 'SS uploaded successfully',
      driveId: driveResponse.id,
      driveLink: driveResponse.webViewLink,
      fileName,
      folderId: DRIVE_FOLDER_SS || null,
    });
  } catch (err) {
    console.error('Error uploading SS:', err);
    if (req.file?.path) await cleanupTempFile(path.join(__dirname, req.file.path));
    res.status(500).json({ error: 'Failed to upload SS file' });
  }
});

/*
IMPORTANT NOTE:
This code assumes your uploadToGoogleDrive function signature can accept folderId:

  uploadToGoogleDrive(filePath, fileName, mimeType, folderId)

If yours currently only accepts (filePath, fileName, mimeType),
either:
- ignore the folderId arguments above (remove them), OR
- paste your uploadToGoogleDrive function here and I’ll update it so folder routing works.
*/


// Test route to check server health
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Server is running and healthy!' });
});


// ============================
// ✅ GIG GEOCODING (NO RESTART NEEDED)
// ============================

// =======================================
// 🚗 Driving Distance Helper (Google Maps)
// =======================================
const getDrivingMiles = async (origin, destination) => {
  if (!origin || !destination) {
    throw new Error('Origin and destination are required for mileage calculation');
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GOOGLE_MAPS_API_KEY');
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
    origin
  )}&destinations=${encodeURIComponent(
    destination
  )}&mode=driving&units=imperial&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (
    data.status !== 'OK' ||
    !data.rows?.[0]?.elements?.[0] ||
    data.rows[0].elements[0].status !== 'OK'
  ) {
    throw new Error(`Google Maps error: ${JSON.stringify(data)}`);
  }

  // distance.value is in METERS → convert to miles
  const meters = data.rows[0].elements[0].distance.value;
  const miles = meters / 1609.34;

  return Number(miles.toFixed(2));
};

const GEOCODING_API_KEY =
  process.env.YOUR_GOOGLE_GEOCODING_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

/**
 * Geocode a single address string -> { lat, lng } | null
 */
async function geocodeAddress(address) {
  try {
    const clean = String(address || "").trim();
    if (!clean) return null;

    if (!GEOCODING_API_KEY) {
      console.warn("⚠️ GEOCODING_API_KEY missing. Skipping geocode.");
      return null;
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      clean
    )}&key=${GEOCODING_API_KEY}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }

    if (data.status === "REQUEST_DENIED") {
      console.error(
        "❌ Geocoding REQUEST_DENIED. Check API key + billing. Response:",
        data?.error_message || data.status
      );
      return null;
    }

    console.warn(`⚠️ Geocoding failed: ${data.status}`, {
      address: clean,
      error: data?.error_message,
    });
    return null;
  } catch (err) {
    console.error("❌ Geocode exception:", err);
    return null;
  }
}

/**
 * Backfill any gigs missing coords (runs on an interval too)
 */
async function updateGigCoordinates() {
  try {
    if (!GEOCODING_API_KEY) return;

    const res = await pool.query(
      "SELECT id, location FROM gigs WHERE (latitude IS NULL OR longitude IS NULL) AND location IS NOT NULL AND TRIM(location) <> ''"
    );

    for (const gig of res.rows) {
      const coords = await geocodeAddress(gig.location);
      if (!coords) continue;

      await pool.query(
        "UPDATE gigs SET latitude = $1, longitude = $2 WHERE id = $3",
        [coords.lat, coords.lng, gig.id]
      );

      console.log(
        `✅ Backfilled Gig ID ${gig.id} coords: (${coords.lat}, ${coords.lng})`
      );
    }
  } catch (error) {
    console.error("❌ Error updating gig coordinates:", error);
  }
}

// Run once on boot AND keep retrying automatically (no restart needed)
updateGigCoordinates();
setInterval(updateGigCoordinates, 5 * 60 * 1000); // every 5 minutes


// Set the timezone for the pool connection
pool.on('connect', async (client) => {
    await client.query("SET timezone = 'America/New_York'");
    console.log('Timezone set to America/New_York for the connection');
});

// Test database connection
(async () => {
    try {
        await pool.connect();
        console.log('Connected to PostgreSQL');
    } catch (err) {
        console.error('Connection error', err.stack);
    }
})();

// POST endpoint for registration
app.post('/register', async (req, res) => {
    const { name, username, email, phone, address, position, preferred_payment_method, payment_details, password, role } = req.body;

    try {
        // Check against blocked users
    const blocked = await pool.query(
        'SELECT * FROM blocked_users WHERE email = $1 OR username = $2',
        [email, username]
    );

    if (blocked.rowCount > 0) {
        return res.status(403).json({ error: 'You are not allowed to register on this platform.' });
    }

        // Check if the username or email already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);

        if (existingUser.rowCount > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        const newUser = await pool.query(
            'INSERT INTO users (name, username, email, phone, address, position, preferred_payment_method, payment_details, password, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, username, email, phone, address, position, preferred_payment_method, payment_details, hashedPassword, role]
        );

        // Send registration email to user
        try {
            await sendRegistrationEmail(email, username, name);
            console.log(`Welcome email sent to ${email}`);

            // Send registration notification to admin
            await sendRegistrationEmail(process.env.ADMIN_EMAIL, username, name);
            console.log(`Admin notified about new registration: ${username}`);
        } catch (emailError) {
            console.error('Error sending registration email:', emailError.message);
        }


        // Respond with the newly created user (excluding the password)
        const { password: _, ...userWithoutPassword } = newUser.rows[0];
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login (returns id, username, role, plus a few helpful fields)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT id, username, email, name, role, password FROM users WHERE username = $1 OR email = $1', [username]);
    if (result.rowCount === 0) {
      return res.status(404).send('User not found');
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('Invalid password');
    }

    // return minimal profile (no token here; your app is using localStorage)
    res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal server error');
  }
});

// ✅ Current user (by id) — matches frontend: /api/me?id=34
app.get('/api/me', async (req, res) => {
  try {
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // app.get('/api/me'...)
const result = await pool.query(
  `SELECT id, username, name, email, role,
          needs_staff_onboarding, staff_terms_required,
          id_uploaded, w9_uploaded, ss_uploaded
   FROM users
   WHERE id = $1`,
  [id]
);

const u = result.rows[0];
return res.json({
  id: u.id,
  username: u.username,
  name: u.name,
  email: u.email,
  role: u.role,
  isAdmin: u.role === 'admin',
  needs_staff_onboarding: u.needs_staff_onboarding,
  staff_terms_required: u.staff_terms_required,
  id_uploaded: u.id_uploaded,
  w9_uploaded: u.w9_uploaded,
  ss_uploaded: u.ss_uploaded,
});

  } catch (err) {
    console.error('❌ /api/me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Logged-in staff: get my rating summary (avg + count)
app.get("/api/me/rating-summary", async (req, res) => {
  try {
    // You likely store loggedInUser in FE; if you have auth middleware use req.user.id
    // If not, accept userId via query for now (still safe if dashboard is protected)
    const userId = Number(req.query.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Missing/invalid userId." });
    }

    const r = await pool.query(
      `SELECT staff_rating_avg, staff_rating_count
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "User not found." });

    res.json({
      avg: Number(r.rows[0].staff_rating_avg || 0),
      count: Number(r.rows[0].staff_rating_count || 0),
    });
  } catch (e) {
    console.error("GET /api/me/rating-summary error:", e);
    res.status(500).json({ error: "Failed to load rating summary." });
  }
});

// ============================
// ✅ POST endpoint to add a new gig (auto-geocodes on insert)
// ============================
app.post("/gigs", async (req, res) => {
  const {
    client,
    client_email,
    event_type,
    date,
    time,
    duration,
    location,
    position,
    gender,
    pay,
    insurance,
    needs_cert,
    confirmed,
    staff_needed,
    claimed_by,
    backup_needed,
    backup_claimed_by,
    latitude,
    longitude,
    attire,
    indoor,
    approval_needed,
    on_site_parking,
    local_parking,
    NDA,
    establishment,
  } = req.body;

  try {
    // ✅ If frontend didn't provide coords, geocode NOW so gig is immediately check-in ready
    let lat = latitude ?? null;
    let lng = longitude ?? null;

    const hasLatLng =
      lat !== null &&
      lng !== null &&
      lat !== "" &&
      lng !== "" &&
      !Number.isNaN(Number(lat)) &&
      !Number.isNaN(Number(lng));

    const hasLocation =
      typeof location === "string" && location.trim().length > 0;

    if (!hasLatLng && hasLocation) {
      const coords = await geocodeAddress(location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    const query = `
      INSERT INTO gigs (
        client, client_email, event_type, date, time, duration, location, position, gender, pay,
        insurance, needs_cert, confirmed, staff_needed, claimed_by,
        backup_needed, backup_claimed_by, latitude, longitude, attire, indoor,
        approval_needed, on_site_parking, local_parking, NDA, establishment
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26
      )
      RETURNING *;
    `;

    const values = [
      client,
      client_email,
      event_type,
      date,
      time,
      duration,
      location,
      position,
      gender,
      pay,
      (insurance === "" || insurance === null || insurance === undefined)
        ? false
        : (insurance === true ||
           insurance === "true" ||
           insurance === "Yes" ||
           insurance === "yes"),
      needs_cert ?? false,
      confirmed ?? false,
      staff_needed,
      Array.isArray(claimed_by) ? `{${claimed_by.join(",")}}` : "{}",
      backup_needed ?? false,
      Array.isArray(backup_claimed_by)
        ? `{${backup_claimed_by.join(",")}}`
        : "{}",
      lat ?? null,
      lng ?? null,
      attire ?? null,
      indoor ?? false,
      approval_needed ?? false,
      on_site_parking ?? false,
      local_parking ?? "N/A",
      NDA ?? false,
      establishment ?? "home",
    ];

    const result = await pool.query(query, values);
    const newGig = result.rows[0];

    console.log("✅ Gig successfully added:", newGig);

    // ==================================================
// ✅ SEND GIG EMAIL NOTIFICATION to STAFF USERS
// ==================================================
try {
  const usersResult = await pool.query(
    `SELECT email FROM users WHERE email IS NOT NULL AND trim(email) <> ''`
  );

  const users = usersResult.rows;

  for (const user of users) {
    try {
      await sendGigEmailNotification(user.email, newGig);
    } catch (e) {
      console.error(`Error sending gig email to ${user.email}:`, e?.message || e);
    }
  }

  console.log("📧 Gig notification emails sent to staff");
} catch (mailErr) {
  console.error("❌ Staff gig email loop failed:", mailErr?.message || mailErr);
  // ❗ DO NOT fail the request if email breaks
}
    // ==================================================
    // ✅ ADD TO GOOGLE CALENDAR (kept from your logic)
    // ==================================================
    try {
      const formattedDate = new Date(newGig.date)
        .toISOString()
        .split("T")[0];

      const rawStart = String(newGig.time).trim();
      const startDateTime = new Date(`${formattedDate}T${rawStart}`);

      const hours = parseFloat(newGig.duration || 0);
      const endDateTime = new Date(
        startDateTime.getTime() + hours * 60 * 60 * 1000
      );

      const event = {
        summary: newGig.event_type,
        description: newGig.position || "",
        location: newGig.location || "",
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: "America/New_York",
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: "America/New_York",
        },
      };

      await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: event,
      });

      console.log("✅ Gig added to Google Calendar");
    } catch (calErr) {
      console.error("❌ Google Calendar insert failed:", calErr.message);
    }

    return res.status(201).json(newGig);
  } catch (error) {
    console.error("❌ Error adding gig:", error);
    return res.status(500).json({ error: "Failed to add gig" });
  }
});

// Update Gig
app.patch('/gigs/:id', async (req, res) => {
  const gigId = req.params.id;
  const {
    client,
    event_type,
    date,
    time,
    duration,
    location,
    position,
    needs_cert,
    gender,
    pay,
    claimed_by,
    staff_needed,
    backup_needed,
    backup_claimed_by,
    confirmed,
    attire,
    indoor,
    approval_needed,
    on_site_parking,
    local_parking,
    NDA,
    establishment,
    insurance,
  } = req.body;

  try {
    // Fetch the old gig details
    const oldGigResult = await pool.query('SELECT * FROM gigs WHERE id = $1', [gigId]);
    if (oldGigResult.rowCount === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    const oldGig = oldGigResult.rows[0];

    // Force booleans (prevents "" boolean crash on edits too)
    const insuranceVal = (insurance === '' || insurance === null || insurance === undefined)
      ? false
      : (insurance === true || insurance === 'true' || insurance === 'Yes' || insurance === 'yes');

    const needsCertVal = (needs_cert === '' || needs_cert === null || needs_cert === undefined)
      ? false
      : (needs_cert === true || needs_cert === 'true' || needs_cert === 'Yes' || needs_cert === 'yes');

    const confirmedVal = (confirmed === '' || confirmed === null || confirmed === undefined)
      ? false
      : (confirmed === true || confirmed === 'true' || confirmed === 'Yes' || confirmed === 'yes');

    const indoorVal = (indoor === '' || indoor === null || indoor === undefined)
      ? false
      : (indoor === true || indoor === 'true' || indoor === 'Yes' || indoor === 'yes');

    const approvalVal = (approval_needed === '' || approval_needed === null || approval_needed === undefined)
      ? false
      : (approval_needed === true || approval_needed === 'true' || approval_needed === 'Yes' || approval_needed === 'yes');

    const parkingVal = (on_site_parking === '' || on_site_parking === null || on_site_parking === undefined)
      ? false
      : (on_site_parking === true || on_site_parking === 'true' || on_site_parking === 'Yes' || on_site_parking === 'yes');

    const ndaVal = (NDA === '' || NDA === null || NDA === undefined)
      ? false
      : (NDA === true || NDA === 'true' || NDA === 'Yes' || NDA === 'yes');

    // Convert arrays to Postgres array literals like you do in POST /gigs
    const claimedByVal = Array.isArray(claimed_by) ? `{${claimed_by.filter(Boolean).join(',')}}` : '{}';
    const backupClaimedByVal = Array.isArray(backup_claimed_by) ? `{${backup_claimed_by.filter(Boolean).join(',')}}` : '{}';

    const updatedGigResult = await pool.query(
      `UPDATE gigs
       SET 
         client = $1,
         event_type = $2,
         date = $3,
         time = $4,
         duration = $5,
         location = $6,
         position = $7,
         needs_cert = $8,
         gender = $9,
         pay = $10,
         claimed_by = $11,
         staff_needed = $12,
         backup_needed = $13,
         backup_claimed_by = $14,
         confirmed = $15,
         attire = $16,
         indoor = $17,
         approval_needed = $18,
         on_site_parking = $19,
         local_parking = $20,
         NDA = $21,
         establishment = $22,
         insurance = $23
       WHERE id = $24
       RETURNING *`,
      [
        client,
        event_type,
        date,
        time,
        duration,
        location,
        position,
        needsCertVal,
        gender,
        pay,
        claimedByVal,
        staff_needed,
        backup_needed,
        backupClaimedByVal,
        confirmedVal,
        attire,
        indoorVal,
        approvalVal,
        parkingVal,
        local_parking ?? 'N/A',
        ndaVal,
        establishment ?? 'home',
        insuranceVal,
        gigId,
      ]
    );

    if (updatedGigResult.rowCount === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    const updatedGig = updatedGigResult.rows[0];

    // Compare fields
    const updatedFields = [];
    for (const key in updatedGig) {
      if (oldGig[key] !== updatedGig[key]) {
        updatedFields.push({ field: key, oldValue: oldGig[key], newValue: updatedGig[key] });
      }
    }

    // Notify Users
    const usersResult = await pool.query('SELECT email FROM users WHERE email IS NOT NULL');
    const users = usersResult.rows;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (const [index, user] of users.entries()) {
      if (!user.email) continue;
      await delay(index * 500);
      try {
        await sendGigUpdateEmailNotification(user.email, oldGig, updatedGig);
        console.log(`Email sent to ${user.email}`);
      } catch (err) {
        console.error(`Error sending email to ${user.email}:`, err.message);
      }
    }

    res.status(200).json(updatedGig);
  } catch (error) {
    console.error('Error updating gig:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// ======================================
// EVENT MEDIA UPLOADS + ADMIN EVENT CRUD
// ======================================

const eventsUploadDir = path.join(__dirname, "uploads", "events");
if (!fs.existsSync(eventsUploadDir)) {
  fs.mkdirSync(eventsUploadDir, { recursive: true });
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const eventMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, eventsUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "file", ext)
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);

    cb(null, `event_${Date.now()}_${base}${ext}`);
  },
});

const eventMediaUpload = multer({
  storage: eventMediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

function eventSlugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function boolValue(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function buildUploadUrl(req, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/events/${filename}`;
}

// Upload event media
app.post("/api/admin/events/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = path.join(__dirname, req.file.path);
    const originalName = req.file.originalname || "event-file";
    const mimeType = req.file.mimetype || "application/octet-stream";
    const type = String(req.body.type || "").trim(); // image / flyer / video

    const safeBase = path
      .basename(originalName, path.extname(originalName))
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);

    const ext = path.extname(originalName);
    const driveFileName = `event_${Date.now()}_${safeBase}${ext}`;

    const driveUpload = await uploadToGoogleDrive(
      filePath,
      driveFileName,
      mimeType,
      process.env.GOOGLE_DRIVE_FOLDER_EVENTS_ID,
      false
    );

    await cleanupTempFile(filePath);

    return res.json({
      ok: true,
      fileId: driveUpload.id,
      type,
    });
  } catch (err) {
    console.error("POST /api/admin/events/upload error:", err);
    if (req.file?.path) {
      await cleanupTempFile(path.join(__dirname, req.file.path));
    }
    return res.status(500).json({ error: "Failed to upload event media." });
  }
});

app.get("/api/events/:eventId/image", async (req, res) => {
  const { eventId } = req.params;

  try {
    const r = await pool.query(
      `SELECT image_drive_id FROM events WHERE id = $1 LIMIT 1`,
      [eventId]
    );

    const fileId = r.rows?.[0]?.image_drive_id;
    if (!fileId) return res.status(404).send("No event image");

    const driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const ct = driveRes.headers?.["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Stream event image error:", err?.response?.data || err);
    return res.status(500).send("Failed to load event image");
  }
});

app.get("/api/events/:eventId/flyer", async (req, res) => {
  const { eventId } = req.params;

  try {
    const r = await pool.query(
      `SELECT flyer_drive_id FROM events WHERE id = $1 LIMIT 1`,
      [eventId]
    );

    const fileId = r.rows?.[0]?.flyer_drive_id;
    if (!fileId) return res.status(404).send("No flyer");

    const driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const ct = driveRes.headers?.["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Stream flyer error:", err?.response?.data || err);
    return res.status(500).send("Failed to load flyer");
  }
});

app.get("/api/events/:eventId/video", async (req, res) => {
  const { eventId } = req.params;

  try {
    const r = await pool.query(
      `SELECT video_drive_id FROM events WHERE id = $1 LIMIT 1`,
      [eventId]
    );

    const fileId = r.rows?.[0]?.video_drive_id;
    if (!fileId) return res.status(404).send("No video");

    const driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const ct = driveRes.headers?.["content-type"] || "video/mp4";
    res.setHeader("Content-Type", ct);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Stream video error:", err?.response?.data || err);
    return res.status(500).send("Failed to load video");
  }
});

app.get("/api/events/media/:fileId", async (req, res) => {
  const { fileId } = req.params;

  try {
    const driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const ct = driveRes.headers?.["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=300");

    driveRes.data.on("error", (err) => {
      console.error("Drive event media stream error:", err);
      if (!res.headersSent) res.status(500).end();
    });

    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Stream event media error:", err?.response?.data || err);
    return res.status(500).send("Failed to load event media");
  }
});

app.post("/api/events/finalize-order", async (req, res) => {
  const { event_order_id } = req.body;

  if (!event_order_id) {
    return res.status(400).json({ error: "Missing event_order_id" });
  }

  try {
    await finalizeEventOrderPayment({
      orderId: event_order_id
    });

    res.json({
      success: true,
      order_id: event_order_id
    });
  } catch (err) {
    console.error("Finalize order error:", err);
    res.status(500).json({ error: "Failed to finalize order" });
  }
});

app.get("/api/events/checkin/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const found = await pool.query(
      `SELECT * FROM event_orders WHERE id = $1 LIMIT 1`,
      [orderId]
    );

    if (found.rowCount === 0) {
      return res.status(404).send("Ticket not found.");
    }

    const order = found.rows[0];

    if (order.checked_in) {
      return res.send(`
        <html>
          <body style="font-family:Arial;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
            <div style="background:#1c1c1c;padding:30px;border-radius:16px;max-width:500px;text-align:center;">
              <h1 style="color:#ffeb77;">⚠️ Already Checked In</h1>
              <p><strong>${order.client_name || "Guest"}</strong> was already checked in.</p>
              <p>Order ID: ${order.id}</p>
            </div>
          </body>
        </html>
      `);
    }

    await pool.query(
      `
      UPDATE event_orders
      SET checked_in = TRUE,
          checked_in_at = NOW()
      WHERE id = $1
      `,
      [orderId]
    );

    return res.send(`
      <html>
        <body style="font-family:Arial;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
          <div style="background:#1c1c1c;padding:30px;border-radius:16px;max-width:500px;text-align:center;">
            <h1 style="color:#ffeb77;">✅ Check-In Successful</h1>
            <p><strong>${order.client_name || "Guest"}</strong> has been checked in.</p>
            <p>Order ID: ${order.id}</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Check-in error:", err);
    return res.status(500).send("Check-in failed.");
  }
});

// Admin list all events
app.get("/api/admin/events", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.slug,
        e.subtitle,
        e.description,
        e.location_name,
        e.address_line1,
        e.city,
        e.state,
        e.zip,
        e.event_date,
        e.image_drive_id,
        e.flyer_drive_id,
        e.video_drive_id,
        e.status,
        e.is_featured,
        COALESCE(es.session_count, 0) AS session_count,
        COALESCE(tt.ticket_type_count, 0) AS ticket_type_count,
        COALESCE(tt.starting_price, 0) AS starting_price
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::int AS session_count
        FROM event_sessions
        GROUP BY event_id
      ) es ON es.event_id = e.id
      LEFT JOIN (
        SELECT
          event_id,
          COUNT(*)::int AS ticket_type_count,
          MIN(price) AS starting_price
        FROM event_ticket_types
        GROUP BY event_id
      ) tt ON tt.event_id = e.id
      ORDER BY e.event_date DESC, e.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/admin/events error:", err);
    res.status(500).json({ error: "Failed to fetch admin events." });
  }
});

// ===================================
// EVENTS FOR SCHEDULING CALENDAR
// ===================================
app.get("/api/events/calendar", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        es.id,
        es.event_id,
        e.title,
        e.location_name,
        e.status,
        es.session_label,
        es.start_time,
        es.end_time,
        DATE(es.start_time) AS date
      FROM event_sessions es
      JOIN events e ON e.id = es.event_id
      WHERE e.status IN ('published', 'draft')
        AND es.status = 'active'
      ORDER BY es.start_time ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({ error: "Failed to fetch calendar events." });
  }
});

// Admin get one event with sessions + ticket types
app.get("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const eventRes = await pool.query(
      `SELECT * FROM events WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (eventRes.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const sessionsRes = await pool.query(
      `
      SELECT *
      FROM event_sessions
      WHERE event_id = $1
      ORDER BY start_time ASC, id ASC
      `,
      [id]
    );

    const ticketTypesRes = await pool.query(
      `
      SELECT *
      FROM event_ticket_types
      WHERE event_id = $1
      ORDER BY price ASC, id ASC
      `,
      [id]
    );

    res.json({
      event: eventRes.rows[0],
      sessions: sessionsRes.rows,
      ticketTypes: ticketTypesRes.rows,
    });
  } catch (err) {
    console.error("GET /api/admin/events/:id error:", err);
    res.status(500).json({ error: "Failed to fetch event details." });
  }
});

// Create event
app.post("/api/admin/events", async (req, res) => {
  const {
    title,
    slug,
    subtitle,
    description,
    location_name,
    address_line1,
    city,
    state = "FL",
    zip,
    event_date,
    image_drive_id,
    flyer_drive_id,
    video_drive_id,
    status = "draft",
    is_featured = false,
  } = req.body || {};

  try {
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    if (!event_date) {
      return res.status(400).json({ error: "Event date is required." });
    }

    const finalSlug = eventSlugify(slug || title);
    if (!finalSlug) {
      return res.status(400).json({ error: "A valid slug is required." });
    }

    const dupRes = await pool.query(
      `SELECT id FROM events WHERE slug = $1 LIMIT 1`,
      [finalSlug]
    );
    if (dupRes.rowCount > 0) {
      return res.status(400).json({ error: "That slug already exists." });
    }

    const result = await pool.query(
      `
      INSERT INTO events (
        title,
        slug,
        subtitle,
        description,
        location_name,
        address_line1,
        city,
        state,
        zip,
        event_date,
        image_drive_id,
        flyer_drive_id,
        video_drive_id,
        status,
        is_featured
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      RETURNING *
      `,
      [
        title.trim(),
        finalSlug,
        subtitle || "",
        description || "",
        location_name || "",
        address_line1 || "",
        city || "",
        state || "FL",
        zip || "",
        event_date,
        image_drive_id || "",
        flyer_drive_id || "",
        video_drive_id || "",
        status || "draft",
        !!is_featured,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/admin/events error:", err);
    res.status(500).json({ error: "Failed to create event." });
  }
});

// Update event
app.put("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;
  const {
    title,
    slug,
    subtitle,
    description,
    location_name,
    address_line1,
    city,
    state = "FL",
    zip,
    event_date,
    image_drive_id,
    flyer_drive_id,
    video_drive_id,
    status = "draft",
    is_featured = false,
  } = req.body || {};

  try {
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    if (!event_date) {
      return res.status(400).json({ error: "Event date is required." });
    }

    const finalSlug = eventSlugify(slug || title);
    if (!finalSlug) {
      return res.status(400).json({ error: "A valid slug is required." });
    }

    const dupRes = await pool.query(
      `SELECT id FROM events WHERE slug = $1 AND id <> $2 LIMIT 1`,
      [finalSlug, id]
    );
    if (dupRes.rowCount > 0) {
      return res.status(400).json({ error: "That slug already exists." });
    }

    const result = await pool.query(
      `
      UPDATE events
      SET
        title = $1,
        slug = $2,
        subtitle = $3,
        description = $4,
        location_name = $5,
        address_line1 = $6,
        city = $7,
        state = $8,
        zip = $9,
        event_date = $10,
        image_drive_id = $11,
        flyer_drive_id = $12,
        video_drive_id = $13,
        status = $14,
        is_featured = $15
      WHERE id = $16
      RETURNING *
      `,
      [
        title.trim(),
        finalSlug,
        subtitle || "",
        description || "",
        location_name || "",
        address_line1 || "",
        city || "",
        state || "FL",
        zip || "",
        event_date,
        image_drive_id || "",
        flyer_drive_id || "",
        video_drive_id || "",
        status || "draft",
        !!is_featured,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/admin/events/:id error:", err);
    res.status(500).json({ error: "Failed to update event." });
  }
});

// Quick status update
app.patch("/api/admin/events/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  const allowed = new Set(["draft", "published", "sold_out", "cancelled"]);

  try {
    if (!allowed.has(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const result = await pool.query(
      `
      UPDATE events
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/admin/events/:id/status error:", err);
    res.status(500).json({ error: "Failed to update status." });
  }
});

// Delete event
app.delete("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM event_ticket_types WHERE event_id = $1`, [id]);
    await client.query(`DELETE FROM event_sessions WHERE event_id = $1`, [id]);

    const result = await client.query(
      `DELETE FROM events WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Event not found." });
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE /api/admin/events/:id error:", err);
    res.status(500).json({ error: "Failed to delete event." });
  } finally {
    client.release();
  }
});

const EVENT_TIMEZONE = "America/New_York";

function getTimeZoneOffsetMinutes(timeZone, date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const tzName = parts.find((part) => part.type === "timeZoneName")?.value || "GMT";

  // Examples: GMT-4, GMT-04:00, GMT+5:30
  const match = tzName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);

  return sign * (hours * 60 + minutes);
}

function localDateTimeInZoneToUtcIso(dateTimeLocal, timeZone = EVENT_TIMEZONE) {
  if (!dateTimeLocal) return null;

  const match = String(dateTimeLocal).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    throw new Error(`Invalid datetime-local value: ${dateTimeLocal}`);
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr || 0);

  // Initial UTC guess from the wall-clock parts
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  // First pass offset
  const firstOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, new Date(utcGuess));
  let correctedUtc = utcGuess - firstOffsetMinutes * 60 * 1000;

  // Second pass for DST edge correctness
  const secondOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, new Date(correctedUtc));
  if (secondOffsetMinutes !== firstOffsetMinutes) {
    correctedUtc = utcGuess - secondOffsetMinutes * 60 * 1000;
  }

  return new Date(correctedUtc).toISOString();
}

// Add session + sync to Google Calendar
app.post("/api/admin/events/:eventId/sessions", async (req, res) => {
  const { eventId } = req.params;
  const {
    session_label,
    start_time,
    end_time,
    capacity = 20,
    status = "active",
  } = req.body || {};

  try {
    if (!start_time || !end_time) {
      return res.status(400).json({ error: "Start time and end time are required." });
    }

    const startTimeUtc = localDateTimeInZoneToUtcIso(start_time);
    const endTimeUtc = localDateTimeInZoneToUtcIso(end_time);

    const eventCheck = await pool.query(
      `
      SELECT id, title, description, location_name, status
      FROM events
      WHERE id = $1
      LIMIT 1
      `,
      [eventId]
    );

    if (eventCheck.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const parentEvent = eventCheck.rows[0];

    const insertRes = await pool.query(
      `
      INSERT INTO event_sessions (
        event_id,
        session_label,
        start_time,
        end_time,
        capacity,
        status,
        tickets_sold,
        google_event_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, NULL)
      RETURNING *
      `,
      [
        eventId,
        session_label || "",
        startTimeUtc,
        endTimeUtc,
        Number(capacity || 20),
        status || "active",
      ]
    );

    let session = insertRes.rows[0];

    // Sync only active sessions for draft/published events
    if (
      session.status === "active" &&
      ["draft", "published"].includes(parentEvent.status)
    ) {
      try {
        const googleEvent = await createGoogleCalendarEventForSession({
          title: parentEvent.title,
          sessionLabel: session.session_label,
          locationName: parentEvent.location_name,
          startTime: session.start_time,
          endTime: session.end_time,
          description: parentEvent.description,
        });

        if (googleEvent?.id) {
          const updatedRes = await pool.query(
            `
            UPDATE event_sessions
            SET google_event_id = $1
            WHERE id = $2
            RETURNING *
            `,
            [googleEvent.id, session.id]
          );

          session = updatedRes.rows[0];
        }
      } catch (googleErr) {
        console.error(
          "❌ Google Calendar session insert failed:",
          googleErr?.message || googleErr
        );
      }
    }

    res.status(201).json(session);
  } catch (err) {
    console.error("POST /api/admin/events/:eventId/sessions error:", err);
    res.status(500).json({ error: "Failed to create session." });
  }
});

// Update session + sync to Google Calendar
app.put("/api/admin/events/:eventId/sessions/:sessionId", async (req, res) => {
  const { eventId, sessionId } = req.params;
  const {
    session_label,
    start_time,
    end_time,
    capacity,
    status,
  } = req.body || {};

  try {
    const eventRes = await pool.query(
      `
      SELECT id, title, description, location_name, status
      FROM events
      WHERE id = $1
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRes.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const parentEvent = eventRes.rows[0];

    const existingRes = await pool.query(
      `
      SELECT *
      FROM event_sessions
      WHERE id = $1 AND event_id = $2
      LIMIT 1
      `,
      [sessionId, eventId]
    );

    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: "Session not found." });
    }

    const existing = existingRes.rows[0];

    const normalizedStartTime =
      start_time != null
        ? localDateTimeInZoneToUtcIso(start_time)
        : existing.start_time;

    const normalizedEndTime =
      end_time != null
        ? localDateTimeInZoneToUtcIso(end_time)
        : existing.end_time;

    const updateRes = await pool.query(
      `
      UPDATE event_sessions
      SET
        session_label = $1,
        start_time = $2,
        end_time = $3,
        capacity = $4,
        status = $5
      WHERE id = $6 AND event_id = $7
      RETURNING *
      `,
      [
        session_label ?? existing.session_label,
        normalizedStartTime,
        normalizedEndTime,
        Number(capacity ?? existing.capacity),
        status ?? existing.status,
        sessionId,
        eventId,
      ]
    );

    let session = updateRes.rows[0];

    const shouldSync =
      session.status === "active" &&
      ["draft", "published"].includes(parentEvent.status);

    if (shouldSync) {
      try {
        if (session.google_event_id) {
          await updateGoogleCalendarEventForSession({
            googleEventId: session.google_event_id,
            title: parentEvent.title,
            sessionLabel: session.session_label,
            locationName: parentEvent.location_name,
            startTime: session.start_time,
            endTime: session.end_time,
            description: parentEvent.description,
          });
        } else {
          const googleEvent = await createGoogleCalendarEventForSession({
            title: parentEvent.title,
            sessionLabel: session.session_label,
            locationName: parentEvent.location_name,
            startTime: session.start_time,
            endTime: session.end_time,
            description: parentEvent.description,
          });

          if (googleEvent?.id) {
            const syncRes = await pool.query(
              `
              UPDATE event_sessions
              SET google_event_id = $1
              WHERE id = $2
              RETURNING *
              `,
              [googleEvent.id, session.id]
            );

            session = syncRes.rows[0];
          }
        }
      } catch (googleErr) {
        console.error(
          "❌ Google Calendar session update failed:",
          googleErr?.message || googleErr
        );
      }
    } else if (session.google_event_id) {
      await deleteGoogleCalendarEventForSession(session.google_event_id);

      const clearRes = await pool.query(
        `
        UPDATE event_sessions
        SET google_event_id = NULL
        WHERE id = $1
        RETURNING *
        `,
        [session.id]
      );

      session = clearRes.rows[0];
    }

    res.json(session);
  } catch (err) {
    console.error("PUT /api/admin/events/:eventId/sessions/:sessionId error:", err);
    res.status(500).json({ error: "Failed to update session." });
  }
});

// Delete session + remove from Google Calendar
app.delete("/api/admin/events/:eventId/sessions/:sessionId", async (req, res) => {
  const { eventId, sessionId } = req.params;

  try {
    const sessionRes = await pool.query(
      `
      SELECT *
      FROM event_sessions
      WHERE id = $1 AND event_id = $2
      LIMIT 1
      `,
      [sessionId, eventId]
    );

    if (sessionRes.rowCount === 0) {
      return res.status(404).json({ error: "Session not found." });
    }

    const session = sessionRes.rows[0];

    if (session.google_event_id) {
      await deleteGoogleCalendarEventForSession(session.google_event_id);
    }

    await pool.query(
      `
      DELETE FROM event_sessions
      WHERE id = $1 AND event_id = $2
      `,
      [sessionId, eventId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/events/:eventId/sessions/:sessionId error:", err);
    res.status(500).json({ error: "Failed to delete session." });
  }
});

// Delete session + remove from Google Calendar
app.delete("/api/admin/events/:eventId/sessions/:sessionId", async (req, res) => {
  const { eventId, sessionId } = req.params;

  try {
    const sessionRes = await pool.query(
      `
      SELECT *
      FROM event_sessions
      WHERE id = $1 AND event_id = $2
      LIMIT 1
      `,
      [sessionId, eventId]
    );

    if (sessionRes.rowCount === 0) {
      return res.status(404).json({ error: "Session not found." });
    }

    const session = sessionRes.rows[0];

    if (session.google_event_id) {
      await deleteGoogleCalendarEventForSession(session.google_event_id);
    }

    await pool.query(
      `
      DELETE FROM event_sessions
      WHERE id = $1 AND event_id = $2
      `,
      [sessionId, eventId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/events/:eventId/sessions/:sessionId error:", err);
    res.status(500).json({ error: "Failed to delete session." });
  }
});

// Add ticket type
app.post("/api/admin/events/:eventId/ticket-types", async (req, res) => {
  const { eventId } = req.params;
  const {
    name,
    price,
    quantity_per_purchase = 1,
    is_active = true,
  } = req.body || {};

  try {
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Ticket name is required." });
    }

    const eventCheck = await pool.query(
      `SELECT id FROM events WHERE id = $1 LIMIT 1`,
      [eventId]
    );
    if (eventCheck.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const result = await pool.query(
      `
      INSERT INTO event_ticket_types (
        event_id,
        name,
        price,
        quantity_per_purchase,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        eventId,
        name.trim(),
        Number(price || 0),
        Number(quantity_per_purchase || 1),
        boolValue(is_active),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/admin/events/:eventId/ticket-types error:", err);
    res.status(500).json({ error: "Failed to create ticket type." });
  }
});

// Delete ticket type
app.delete("/api/admin/events/:eventId/ticket-types/:ticketTypeId", async (req, res) => {
  const { eventId, ticketTypeId } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM event_ticket_types
      WHERE id = $1 AND event_id = $2
      RETURNING id
      `,
      [ticketTypeId, eventId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ticket type not found." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/events/:eventId/ticket-types/:ticketTypeId error:", err);
    res.status(500).json({ error: "Failed to delete ticket type." });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.slug,
        e.subtitle,
        e.description,
        e.location_name,
        e.address_line1,
        e.city,
        e.state,
        e.zip,
        e.event_date,
        e.image_drive_id,
        e.flyer_drive_id,
        e.video_drive_id,
        e.status,
        e.is_featured,
        MIN(tt.price) AS starting_price
      FROM events e
      LEFT JOIN event_ticket_types tt
        ON tt.event_id = e.id
       AND tt.is_active = true
      WHERE e.status = 'published'
        AND e.event_date >= CURRENT_DATE
      GROUP BY e.id
      ORDER BY e.event_date ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/events error:", err);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

app.get("/api/events/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const eventRes = await pool.query(
      `
      SELECT *
      FROM events
      WHERE slug = $1
      LIMIT 1
      `,
      [slug]
    );

    if (eventRes.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }

    const event = eventRes.rows[0];

    const sessionsRes = await pool.query(
      `
      SELECT *
      FROM event_sessions
      WHERE event_id = $1
        AND status = 'active'
      ORDER BY start_time ASC
      `,
      [event.id]
    );

    const ticketTypesRes = await pool.query(
      `
      SELECT *
      FROM event_ticket_types
      WHERE event_id = $1
        AND is_active = true
      ORDER BY price ASC
      `,
      [event.id]
    );

    res.json({
      event,
      sessions: sessionsRes.rows,
      ticketTypes: ticketTypesRes.rows,
    });
  } catch (err) {
    console.error("GET /api/events/:slug error:", err);
    res.status(500).json({ error: "Failed to fetch event details." });
  }
});

// Finalize an event order after successful Square checkout
app.post("/api/events/finalize-order", async (req, res) => {
  const { event_order_id, square_order_id } = req.body || {};

  if (!event_order_id) {
    return res.status(400).json({ error: "event_order_id is required." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("🔎 finalize-order start", { event_order_id, square_order_id });

    const orderRes = await client.query(
      `
      SELECT
        eo.*,
        e.title AS event_title,
        e.event_date,
        es.session_label,
        es.start_time,
        es.end_time,
        ett.name AS ticket_type_name
      FROM event_orders eo
      JOIN events e
        ON e.id = eo.event_id
      JOIN event_sessions es
        ON es.id = eo.session_id
      JOIN event_ticket_types ett
        ON ett.id = eo.ticket_type_id
      WHERE eo.id = $1
      LIMIT 1
      `,
      [event_order_id]
    );

    console.log("🔎 order lookup rowCount:", orderRes.rowCount);

    if (orderRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Event order not found." });
    }

    const order = orderRes.rows[0];
    console.log("🔎 loaded order:", {
      id: order.id,
      payment_status: order.payment_status,
      session_id: order.session_id,
      attendee_count: order.attendee_count,
      amount_paid: order.amount_paid,
    });

    if (!["pending", "paid"].includes(order.payment_status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Order cannot be finalized from status "${order.payment_status}".`,
      });
    }

    const desc = `Payment for ${order.event_title} - ${order.ticket_type_name} - ${order.session_label || "Session"}`;
    const externalId = `event_order_${order.id}`;

    const grossAmount = Number(order.amount_paid || 0);
    const feeAmount = Number((grossAmount * 0.029 + 0.30).toFixed(2));
    const netAmount = Number((grossAmount - feeAmount).toFixed(2));

    // If already paid, do NOT exit immediately.
    // Backfill the profits row if it's missing.
    if (order.payment_status === "paid") {
      console.log("ℹ️ order already marked paid, checking profits backfill...");

      const { rows: existingProfit } = await client.query(
        `
        SELECT id
        FROM profits
        WHERE external_id = $1
        LIMIT 1
        `,
        [externalId]
      );

      if (existingProfit.length === 0) {
        await client.query(
          `
          INSERT INTO profits (
            category,
            description,
            amount,
            type,
            created_at,
            external_id,
            gross_amount,
            fee_amount,
            net_amount,
            payment_method,
            processor,
            paid_at
          )
          VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, NOW())
          `,
          [
            "Income",
            desc,
            netAmount,
            "Event Income",
            externalId,
            grossAmount,
            feeAmount,
            netAmount,
            "Card",
            "Square"
          ]
        );

        console.log("✅ backfilled missing profits row for already-paid event order");
      } else {
        console.log("ℹ️ profits row already exists for this event order");
      }

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        already_paid: true,
        order: {
          id: order.id,
          event_title: order.event_title,
          ticket_type_name: order.ticket_type_name,
          amount_paid: order.amount_paid,
          session_label: order.session_label,
          start_time: order.start_time,
          end_time: order.end_time,
        },
      });
    }

    // 1) Mark paid
    console.log("🔎 updating event_orders...");
    await client.query(
      `
      UPDATE event_orders
      SET
        payment_status = 'paid',
        square_order_id = COALESCE($2, square_order_id),
        updated_at = NOW()
      WHERE id = $1
      `,
      [event_order_id, square_order_id || null]
    );

    // 2) Increment tickets sold
    console.log("🔎 updating event_sessions...");
    await client.query(
      `
      UPDATE event_sessions
      SET
        tickets_sold = COALESCE(tickets_sold, 0) + $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [order.session_id, Number(order.attendee_count || 0)]
    );

    // 3) Insert into profits once using external_id
    console.log("🔎 checking profits...");
    const { rows: existingProfit } = await client.query(
      `
      SELECT id
      FROM profits
      WHERE external_id = $1
      LIMIT 1
      `,
      [externalId]
    );

    if (existingProfit.length === 0) {
      console.log("🔎 inserting into profits...");
      await client.query(
        `
        INSERT INTO profits (
          category,
          description,
          amount,
          type,
          created_at,
          external_id,
          gross_amount,
          fee_amount,
          net_amount,
          payment_method,
          processor,
          paid_at
        )
        VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, NOW())
        `,
        [
          "Income",
          desc,
          netAmount,
          "Event Income",
          externalId,
          grossAmount,
          feeAmount,
          netAmount,
          "Card",
          "Square"
        ]
      );
      console.log("✅ profits insert ok");
    } else {
      console.log("ℹ️ profits row already exists, skipping insert");
    }

    await client.query("COMMIT");
    console.log("✅ finalize-order committed");

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        event_title: order.event_title,
        ticket_type_name: order.ticket_type_name,
        amount_paid: order.amount_paid,
        session_label: order.session_label,
        start_time: order.start_time,
        end_time: order.end_time,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error finalizing event order:", error);
    return res.status(500).json({
      error: error.message || "Failed to finalize event order.",
    });
  } finally {
    client.release();
  }
});

// Admin: list staff + rating rollups
app.get("/api/admin/staff-with-ratings", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        id,
        name,
        username,
        email,
        role,
        staff_rating_avg,
        staff_rating_count
      FROM users
      WHERE role IN ('staff', 'admin', 'manager')  -- adjust if needed
      ORDER BY staff_rating_avg DESC, staff_rating_count DESC, name ASC
    `);

    res.json(r.rows);
  } catch (e) {
    console.error("GET /api/admin/staff-with-ratings error:", e);
    res.status(500).json({ error: "Failed to load staff list." });
  }
});


app.post('/api/admin/recalculate-totals', async (req, res) => {
  try {
    const quotesRes = await pool.query('SELECT * FROM quotes');
    const quotes = quotesRes.rows;

    for (const quote of quotes) {
      const items = quote.items || [];

      // Fallback if stored as JSON string
      const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

      const recalculatedTotal = parsedItems.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity || 0);
        const price = parseFloat(item.unitPrice || 0);
        return sum + (quantity * price);
      }, 0);

      await pool.query('UPDATE quotes SET total_amount = $1 WHERE id = $2', [
        recalculatedTotal.toFixed(2),
        quote.id,
      ]);
    }

    res.status(200).send('✅ Totals recalculated successfully.');
  } catch (err) {
    console.error('❌ Error recalculating totals:', err);
    res.status(500).send('❌ Failed to recalculate totals.');
  }
});

app.post('/api/send-quote-email', async (req, res) => {
  const { email, quote } = req.body;

  try {
    // Always get the latest DB version of the quote before emailing
    const result = await pool.query(`SELECT * FROM quotes WHERE quote_number = $1`, [quote.quote_number]);

    if (result.rowCount === 0) {
      return res.status(404).send('Quote not found');
    }

    const dbQuote = result.rows[0];

    // Parse stored items (if stored as JSON string)
    if (typeof dbQuote.items === 'string') {
      dbQuote.items = JSON.parse(dbQuote.items);
    }

    // Ensure all key fields from original quote object are preserved
    const finalQuote = {
      ...dbQuote,
      client_name: quote.client_name || dbQuote.client_name,
      client_email: quote.client_email || dbQuote.client_email,
      client_phone: quote.client_phone || dbQuote.client_phone,
    };

    await sendQuoteEmail(email, finalQuote); // ✅ uses updated values in PDF

    res.status(200).send('Quote email sent successfully!');
  } catch (error) {
    console.error('❌ Error sending quote email:', error);
    res.status(500).send('Error sending quote email');
  }
});

// PATCH /api/users/:id/ack-staff-terms
app.patch('/api/users/:id/ack-staff-terms', async (req, res) => {
  const { id } = req.params;
  const { w9_uploaded, staff_terms_required } = req.body || {};
  try {
    await pool.query(`
      UPDATE users
      SET w9_uploaded = COALESCE($1, w9_uploaded),
          staff_terms_required = COALESCE($2, staff_terms_required)
      WHERE id = $3
    `, [w9_uploaded, staff_terms_required, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('ack-staff-terms error:', e);
    res.status(500).json({ error: 'Failed to update flags' });
  }
});

// Forgot Password Route
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const isBlocked = await pool.query('SELECT * FROM blocked_users WHERE email = $1', [email]);
    if (isBlocked.rowCount > 0) {
        return res.status(403).send('You are not allowed to reset your password.');
    }

    // Check if the email exists in the database
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) { // Make sure to check if user exists
        return res.status(400).send('Email not found');
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(20).toString('hex'); // Generate a random token (20 bytes)
    const expiration = Date.now() + 3600000; // Token expiration time (1 hour)

    // Save the token and expiration to the database
    await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3', [resetToken, expiration, email]);

    // Generate the reset link
    const frontendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000'; // Dynamically handle the frontend URL
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send the reset email
    sendResetEmail(email, resetLink);

    res.status(200).send('Password reset email sent');
});

// Reset Password Route
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    // Find the user by the reset token and check expiration
    const user = await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > $2', [token, Date.now()]);
    if (user.rows.length === 0) {
        return res.status(400).send('Invalid or expired token');
    }

    // Hash the new password (you should hash the password before storing it)
    const hashedPassword = bcrypt.hashSync(newPassword, 10);  // Assuming you use bcrypt for hashing passwords

    // Update the user's password in the database and clear the reset token
    await pool.query('UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE email = $2', [hashedPassword, user.rows[0].email]);

    res.status(200).send('Password updated successfully');
});

// Route for getting users
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users'); // Adjust the query as necessary
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// ✅ Submit Feedback (Gig OR Appointment) - FULL PASTE-IN
// - Prevents rating random staff IDs (allowlist check)
// - Works with gigs using claimed_by_ids (fallback to claimed_by usernames)
// - Optionally uses a transaction to reduce partial writes
// ============================================================
app.post("/api/feedback/:token/submit", async (req, res) => {
  const { token } = req.params;
  const {
    overall_rating,
    overall_comment,
    staffRatings = [],
    wants_public_review = false,
  } = req.body;

  const overall = Number(overall_rating);
  if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
    return res.status(400).json({ error: "Invalid rating." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const frRes = await client.query(
      `SELECT id, service_type, gig_id, appointment_id, client_id, client_name, client_email, completed_at
       FROM feedback_requests
       WHERE token = $1
       LIMIT 1`,
      [token]
    );

    if (frRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Invalid link." });
    }

    const fr = frRes.rows[0];

    if (fr.completed_at) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "This feedback link was already submitted." });
    }

    if (!fr.service_type) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Feedback request missing service_type." });
    }

    // ------------------------------------------------------------
    // ✅ Build allowlist of staff IDs that are allowed to be rated
    // ------------------------------------------------------------
    const allowedStaffIds = new Set();

    if (fr.service_type === "appointment" && fr.appointment_id) {
      const aRes = await client.query(
        `SELECT assigned_staff
         FROM appointments
         WHERE id = $1
         LIMIT 1`,
        [fr.appointment_id]
      );

      if (aRes.rowCount) {
        const asg = aRes.rows[0].assigned_staff;

        let ids = [];
        if (Array.isArray(asg)) {
          ids = asg.map(Number);
        } else if (asg) {
          ids = String(asg)
            .replace(/[{}]/g, "")
            .split(",")
            .map((x) => Number(x.trim()));
        }

        ids.filter(Number.isInteger).forEach((id) => allowedStaffIds.add(id));
      }
    }

    if (fr.service_type === "gig" && fr.gig_id) {
      const gRes = await client.query(
        `SELECT claimed_by_ids, claimed_by
         FROM gigs
         WHERE id = $1
         LIMIT 1`,
        [fr.gig_id]
      );

      if (gRes.rowCount) {
        const g = gRes.rows[0];

        // Prefer claimed_by_ids (int[])
        if (Array.isArray(g.claimed_by_ids) && g.claimed_by_ids.length > 0) {
          g.claimed_by_ids
            .map(Number)
            .filter(Number.isInteger)
            .forEach((id) => allowedStaffIds.add(id));
        } else {
          // Fallback to claimed_by usernames -> ids
          let usernames = [];
          if (Array.isArray(g.claimed_by)) {
            usernames = g.claimed_by.map(String).filter(Boolean);
          } else if (g.claimed_by) {
            usernames = String(g.claimed_by)
              .replace(/[{}]/g, "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
          }

          if (usernames.length) {
            const uRes = await client.query(
              `SELECT id FROM users WHERE username = ANY($1::text[])`,
              [usernames]
            );
            uRes.rows
              .map((r) => Number(r.id))
              .filter(Number.isInteger)
              .forEach((id) => allowedStaffIds.add(id));
          }
        }
      }
    }

    // ------------------------------------------------------------
    // Insert feedback response
    // ------------------------------------------------------------
    const fbRes = await client.query(
      `INSERT INTO feedback_responses
        (request_id, service_type, gig_id, appointment_id, client_id, client_name, client_email, overall_rating, overall_comment)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        fr.id,
        fr.service_type,
        fr.gig_id || null,
        fr.appointment_id || null,
        fr.client_id || null,
        fr.client_name || null,
        fr.client_email || null,
        overall,
        overall_comment || null,
      ]
    );

    const feedbackId = fbRes.rows[0].id;

    // ------------------------------------------------------------
    // Insert staff rating entries + update user aggregates
    // ✅ Only for staff IDs in allowlist
    // ✅ Also de-dupe by staffUserId within this submission
    // ------------------------------------------------------------
    const seenStaff = new Set();

    for (const sr of staffRatings) {
      const staffUserId = Number(sr.staffUserId);
      const rating = Number(sr.rating);

      if (!Number.isInteger(staffUserId) || staffUserId <= 0) continue;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;

      // ✅ must be staff on this gig/appointment
      if (allowedStaffIds.size > 0 && !allowedStaffIds.has(staffUserId)) continue;

      // ✅ prevent duplicates in same submission
      if (seenStaff.has(staffUserId)) continue;
      seenStaff.add(staffUserId);

      await client.query(
        `INSERT INTO staff_rating_entries (feedback_id, staff_user_id, rating)
         VALUES ($1, $2, $3)`,
        [feedbackId, staffUserId, rating]
      );

      await client.query(
        `UPDATE users
            SET staff_rating_sum = COALESCE(staff_rating_sum, 0) + $1,
                staff_rating_count = COALESCE(staff_rating_count, 0) + 1,
                staff_rating_avg =
                  ROUND((COALESCE(staff_rating_sum, 0) + $1)::numeric / (COALESCE(staff_rating_count, 0) + 1), 2)
          WHERE id = $2`,
        [rating, staffUserId]
      );
    }

    // Mark request completed
    await client.query(
      `UPDATE feedback_requests SET completed_at = NOW() WHERE id = $1`,
      [fr.id]
    );

    await client.query("COMMIT");

    const GOOGLE_REVIEW_URL = process.env.GOOGLE_REVIEW_URL || null;
    const shouldShowGoogle = overall >= 4 && wants_public_review && GOOGLE_REVIEW_URL;

    res.json({
      success: true,
      googleReviewUrl: shouldShowGoogle ? GOOGLE_REVIEW_URL : null,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("POST feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback." });
  } finally {
    client.release();
  }
});


// ============================================================
// ✅ Load Feedback Form (Gig OR Appointment) - FULL PASTE-IN
// - Appointment: uses assigned_staff (int[] parsing)
// - Gig: prefers claimed_by_ids (int[]) and falls back to claimed_by usernames
// ============================================================
app.get("/api/feedback/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const frRes = await pool.query(
      `
      SELECT id, token, service_type, gig_id, appointment_id, client_id, client_name, client_email, completed_at
      FROM feedback_requests
      WHERE token = $1
      LIMIT 1
      `,
      [token]
    );

    if (frRes.rowCount === 0) {
      return res.status(404).json({ error: "Invalid or expired link." });
    }

    const fr = frRes.rows[0];

    if (fr.completed_at) {
      return res.json({ alreadySubmitted: true });
    }

    // --------------------------
    // Appointment
    // --------------------------
    if (fr.service_type === "appointment") {
      const aRes = await pool.query(
        `
        SELECT a.id, a.title, a.date, a.assigned_staff, c.full_name AS client_name
        FROM appointments a
        LEFT JOIN clients c ON c.id = a.client_id
        WHERE a.id = $1
        LIMIT 1
        `,
        [fr.appointment_id]
      );

      if (aRes.rowCount === 0) {
        return res.status(404).json({ error: "Appointment not found." });
      }

      const a = aRes.rows[0];

      // Parse assigned_staff -> int[]
      let staffIds = [];
      if (a.assigned_staff) {
        if (Array.isArray(a.assigned_staff)) {
          staffIds = a.assigned_staff
            .map(Number)
            .filter((n) => Number.isInteger(n) && n > 0);
        } else {
          staffIds = String(a.assigned_staff)
            .replace(/[{}]/g, "")
            .split(",")
            .map((x) => Number(x.trim()))
            .filter((n) => Number.isInteger(n) && n > 0);
        }
      }

      let staff = [];
      if (staffIds.length) {
        const sRes = await pool.query(
          `SELECT id, name FROM users WHERE id = ANY($1::int[])`,
          [staffIds]
        );
        staff = sRes.rows;
      }

      return res.json({
        requestId: fr.id,
        serviceType: "appointment",
        appointment: { id: a.id, title: a.title, date: a.date },
        clientName: a.client_name || fr.client_name || null,
        staff,
      });
    }

    // --------------------------
    // Gig
    // --------------------------
    const gRes = await pool.query(
      `
      SELECT id, client, event_type, date, time, location, claimed_by, claimed_by_ids
      FROM gigs
      WHERE id = $1
      LIMIT 1
      `,
      [fr.gig_id]
    );

    if (gRes.rowCount === 0) {
      return res.status(404).json({ error: "Gig not found." });
    }

    const g = gRes.rows[0];

    let staff = [];

    // Prefer claimed_by_ids (int[])
    if (Array.isArray(g.claimed_by_ids) && g.claimed_by_ids.length > 0) {
      const ids = g.claimed_by_ids
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);

      if (ids.length) {
        const sRes = await pool.query(
          `SELECT id, name FROM users WHERE id = ANY($1::int[])`,
          [ids]
        );
        staff = sRes.rows;
      }
    } else {
      // Fallback to claimed_by usernames (text[])
      let usernames = [];
      if (Array.isArray(g.claimed_by)) {
        usernames = g.claimed_by.map(String).filter(Boolean);
      } else if (g.claimed_by) {
        usernames = String(g.claimed_by)
          .replace(/[{}]/g, "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }

      if (usernames.length) {
        const sRes = await pool.query(
          `SELECT id, name FROM users WHERE username = ANY($1::text[])`,
          [usernames]
        );
        staff = sRes.rows;
      }
    }

    return res.json({
      requestId: fr.id,
      serviceType: "gig",
      gig: {
        id: g.id,
        title: g.event_type,
        date: g.date,
        time: g.time,
        location: g.location,
      },
      clientName: fr.client_name || g.client || null,
      staff,
    });
  } catch (err) {
    console.error("GET /api/feedback/:token error:", err);
    res.status(500).json({ error: "Failed to load feedback form." });
  }
});

// ============================================================
// 📨 Feedback Email Cron (Day After Gig + Day After Appointment)
// ============================================================

const BASE_URL =
  process.env.BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://readybartending.com"
    : "http://localhost:3000");

const makeFeedbackToken = () => crypto.randomBytes(24).toString("hex");

// ------------------------------
// ✅ GIG FEEDBACK (day after gig)
// ------------------------------
async function sendNextDayGigFeedbackRequests() {
  const db = await pool.connect();
console.log("⏰ Feedback cron started:", new Date().toISOString());
  try {
    const gigsRes = await db.query(`
      WITH eligible AS (
        SELECT
          g.id,
          g.client,
          g.event_type,
          g.date,
          COALESCE(NULLIF(trim(g.client_email), ''), c.email) AS client_email
        FROM gigs g
        LEFT JOIN clients c
          ON trim(lower(c.full_name)) = trim(lower(g.client))
        LEFT JOIN feedback_requests fr
          ON fr.gig_id = g.id
         AND fr.service_type = 'gig'
        WHERE g.confirmed = true
          AND COALESCE(NULLIF(trim(g.client_email), ''), c.email) IS NOT NULL
          AND trim(COALESCE(NULLIF(g.client_email, ''), c.email)) <> ''
          AND (g.review_sent IS DISTINCT FROM true)
          AND (g.date AT TIME ZONE 'America/New_York')::date
              <= ((NOW() AT TIME ZONE 'America/New_York')::date - 1)
          AND fr.id IS NULL
      ),
      ranked AS (
        SELECT
          e.*,
          ROW_NUMBER() OVER (
            PARTITION BY lower(trim(e.client_email))
            ORDER BY e.date DESC, e.id DESC
          ) AS rn
        FROM eligible e
      )
      SELECT
        r.id,
        r.client,
        r.event_type,
        r.date,
        r.client_email
      FROM ranked r
      WHERE r.rn = 1
        AND NOT EXISTS (
          SELECT 1
          FROM feedback_requests fr2
          WHERE fr2.service_type = 'gig'
            AND lower(trim(fr2.client_email)) = lower(trim(r.client_email))
            AND fr2.created_at >= NOW() - INTERVAL '7 days'
        )
      ORDER BY r.date DESC, r.id DESC
    `);

    console.log("📊 Feedback cron found gigs:", gigsRes.rows.map(g => ({
  id: g.id,
  client: g.client,
  email: g.client_email
})));

    if (gigsRes.rowCount === 0) {
      console.log("✅ Feedback cron: no gigs to send today.");
      return;
    }

    console.log(`📨 Feedback cron: sending ${gigsRes.rowCount} gig feedback email(s).`);

    for (const gig of gigsRes.rows) {
      try {
        await db.query("BEGIN");

        const token = makeFeedbackToken();

        await db.query(
          `
          INSERT INTO feedback_requests
            (token, service_type, gig_id, client_name, client_email, created_at)
          VALUES
            ($1, 'gig', $2, $3, $4, NOW())
          `,
          [token, gig.id, gig.client || null, gig.client_email]
        );

        const feedbackLink = `${BASE_URL}/feedback/${token}`;

        await sendFeedbackRequestEmail({
          email: gig.client_email,
          clientName: gig.client,
          feedbackLink,
          eventType: gig.event_type,
          eventDate: gig.date,
        });

        await db.query(
          `UPDATE gigs SET review_sent = true WHERE id = $1`,
          [gig.id]
        );

        await db.query("COMMIT");
        console.log(`✅ Feedback email sent: gig ${gig.id} -> ${gig.client_email}`);
      } catch (innerErr) {
        try {
          await db.query("ROLLBACK");
        } catch {}
        console.error(`❌ Feedback cron failed for gig ${gig.id}:`, innerErr?.message || innerErr);
      }
    }
  } catch (err) {
    console.error("❌ Feedback cron error:", err?.message || err);
  } finally {
    db.release();
  }
}

// ------------------------------
// ✅ APPOINTMENT FEEDBACK (day after appointment)
// ------------------------------
async function sendNextDayAppointmentFeedbackRequests() {
  const db = await pool.connect();

  try {
    const apptRes = await db.query(
      `
      SELECT a.id,
             a.title,
             a.date,
             c.full_name,
             c.email
      FROM appointments a
      LEFT JOIN clients c ON c.id = a.client_id
      LEFT JOIN feedback_requests fr
        ON fr.appointment_id = a.id
       AND fr.service_type = 'appointment'
      WHERE c.email IS NOT NULL
        AND trim(c.email) <> ''
        AND ((a.date AT TIME ZONE 'America/New_York')::date =
             ((NOW() AT TIME ZONE 'America/New_York')::date - 1))
        AND fr.id IS NULL
      ORDER BY a.id ASC
      `
    );

    if (apptRes.rowCount === 0) {
      console.log("✅ Appointment feedback cron: no appointments to send.");
      return;
    }

    console.log(`📨 Appointment feedback cron: sending ${apptRes.rowCount} email(s)...`);

    for (const appt of apptRes.rows) {
      try {
        await db.query("BEGIN");

        const token = makeFeedbackToken();

        await db.query(
          `
          INSERT INTO feedback_requests
            (token, service_type, appointment_id, client_name, client_email, created_at)
          VALUES
            ($1, 'appointment', $2, $3, $4, NOW())
          `,
          [token, appt.id, appt.full_name || null, appt.email]
        );

        const feedbackLink = `${BASE_URL}/feedback/${token}`;

        await sendFeedbackRequestEmail({
          email: appt.email,
          clientName: appt.full_name,
          feedbackLink,
          eventType: appt.title,
          eventDate: appt.date,
        });

        await db.query("COMMIT");
        console.log(`✅ Appointment feedback email sent: ${appt.id} -> ${appt.email}`);
      } catch (innerErr) {
        try {
          await db.query("ROLLBACK");
        } catch {}
        console.error(
          `❌ Appointment feedback cron failed for appointment ${appt.id}:`,
          innerErr?.message || innerErr
        );
      }
    }
  } catch (err) {
    console.error("❌ Appointment feedback cron error:", err?.message || err);
  } finally {
    db.release();
  }
}

// ✅ Schedule (your current time: 10:00 AM NY)
cron.schedule(
  "51 14 * * *",
  () => {
    // use semicolons, not commas
    sendNextDayGigFeedbackRequests();
    sendNextDayAppointmentFeedbackRequests();
  },
  { timezone: "America/New_York" }
);

// GET stream profile photo (no public sharing needed)
app.get("/api/users/:userId/photo", async (req, res) => {
  const { userId } = req.params;

  try {
    const r = await pool.query(
      `SELECT photo_drive_id
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );

    const fileId = r.rows?.[0]?.photo_drive_id;
    if (!fileId) {
      return res.status(404).send("No profile photo");
    }

    const driveRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const ct = driveRes.headers?.["content-type"] || "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "private, max-age=300");

    driveRes.data.on("error", (err) => {
      console.error("Drive stream error:", err);
      if (!res.headersSent) res.status(500).end();
    });

    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Stream profile photo error:", err?.response?.data || err);
    return res.status(500).send("Failed to load profile photo");
  }
});


// GET user profile
app.get("/api/users/:userId/profile", async (req, res) => {
  const { userId } = req.params;

  try {
    const r = await pool.query(
      `SELECT id,
              name,
              username,
              email,
              phone,
              address,
              role,
              photo_url,
              photo_drive_id
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error("GET profile error:", e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// PATCH user profile
app.patch("/api/users/:userId/profile", async (req, res) => {
  const { userId } = req.params;
  const {
    name,
    username,
    email,
    phone,
    address,
  } = req.body || {};

  try {
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    const r = await pool.query(
      `UPDATE users
          SET name = $1,
              username = $2,
              email = $3,
              phone = $4,
              address = $5,
              updated_at = NOW()
        WHERE id = $6
      RETURNING id,
                name,
                username,
                email,
                phone,
                address,
                role,
                photo_url`,
      [
        String(name).trim(),
        String(username || "").trim() || null,
        String(email || "").trim() || null,
        String(phone || "").trim() || null,
        String(address || "").trim() || null,
        userId,
      ]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error("PATCH profile error:", e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// UPDATE USER
app.patch('/users/:id', async (req, res) => {
    const userId = req.params.id;
    const {
        name,
        username,
        email,
        phone,
        position,
        role,
        preferred_payment_method,
        payment_details
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users
             SET name = $1,
                 username = $2,
                 email = $3,
                 phone = $4,
                 position = $5,
                 role = $6,
                 preferred_payment_method = $7,
                 payment_details = $8
             WHERE id = $9
             RETURNING *`,
            [
                name,
                username,
                email,
                phone,
                position,
                role,
                preferred_payment_method,
                payment_details,
                userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// PATCH change password
app.patch("/api/users/:userId/password", async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body || {};

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Missing currentPassword or newPassword." });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }

    const u = await pool.query(
      `SELECT id, password
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );
    if (u.rowCount === 0) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, u.rows[0].password);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect." });

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
          SET password = $1, updated_at = NOW()
        WHERE id = $2`,
      [hashed, userId]
    );

    return res.json({ success: true });
  } catch (e) {
    console.error("PATCH password error:", e);
    return res.status(500).json({ error: "Failed to change password" });
  }
});


// POST upload profile photo (stores Drive fileId only)
app.post("/api/users/:userId/photo", upload.single("photo"), async (req, res) => {
  const { userId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const filePath = path.join(__dirname, req.file.path);

    const fileName = buildUniqueFileName({
      docType: "PROFILE",
      userId,
      originalname: req.file.originalname,
    });

    // ✅ Upload to SAME folder as SS / ID / W9
    // ❌ do NOT make public (avoid 403 policies)
    const driveResponse = await uploadToGoogleDrive(
      filePath,
      fileName,
      req.file.mimetype,
      null,
      false
    );

    await cleanupTempFile(filePath);

    const fileId = driveResponse.id;

    const upd = await pool.query(
      `UPDATE users
          SET photo_drive_id = $1,
              updated_at = NOW()
        WHERE id = $2
      RETURNING photo_drive_id`,
      [fileId, userId]
    );

    return res.status(200).json({
      success: true,
      photo_drive_id: upd.rows[0].photo_drive_id,
      driveId: fileId,
      driveLink: driveResponse.webViewLink, // optional, for debugging
    });
  } catch (err) {
    console.error("Error uploading profile photo:", err);
    return res.status(500).json({ error: "Failed to upload profile photo" });
  }
});

// GET user profile
app.get("/api/users/:userId/profile", async (req, res) => {
  const { userId } = req.params;

  try {
    const r = await pool.query(
      `SELECT id,
              name,
              username,
              email,
              phone,
              address,
              role,
              "position",
              preferred_payment_method,
              payment_details,
              photo_url,
              photo_drive_id
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error("GET profile error:", e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// PATCH user profile
app.patch("/api/users/:userId/profile", async (req, res) => {
  const { userId } = req.params;
  const {
    name,
    username,
    email,
    phone,
    address,
  } = req.body || {};

  try {
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    const r = await pool.query(
      `UPDATE users
          SET name = $1,
              username = $2,
              email = $3,
              phone = $4,
              address = $5,
              updated_at = NOW()
        WHERE id = $6
      RETURNING id,
                name,
                username,
                email,
                phone,
                address,
                role,
                photo_url`,
      [
        String(name).trim(),
        String(username || "").trim() || null,
        String(email || "").trim() || null,
        String(phone || "").trim() || null,
        String(address || "").trim() || null,
        userId,
      ]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error("PATCH profile error:", e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post('/api/staff-reviews', async (req, res) => {
  const { staffUserId, clientId, gigId, rating, feedback } = req.body;

  if (!staffUserId || !clientId || !gigId || !rating) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be 1-5." });
  }

  try {
    // Prevent duplicate review for same gig/staff/client
    const existing = await pool.query(
      `SELECT id FROM staff_reviews 
       WHERE staff_user_id=$1 AND client_id=$2 AND gig_id=$3`,
      [staffUserId, clientId, gigId]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ error: "Review already submitted." });
    }

    await pool.query(`
      INSERT INTO staff_reviews
      (staff_user_id, client_id, gig_id, rating, feedback)
      VALUES ($1, $2, $3, $4, $5)
    `, [staffUserId, clientId, gigId, rating, feedback]);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save review" });
  }
});


app.get("/api/public/staff", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        name AS display_name,
        role,
        staff_rating_avg AS avg_rating,
        staff_rating_count AS review_count
      FROM users
      WHERE LOWER(role) NOT IN ('vendor','student','client')
      ORDER BY staff_rating_avg DESC NULLS LAST, name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching public staff:", err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// ✅ ADMIN: GET full user profile (guard invalid ids)
app.get("/api/admin/users/:userId/profile", async (req, res) => {
  const raw = String(req.params.userId || "").trim();

  // blocks ":id", "undefined", "", etc.
  const idNum = Number(raw);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  try {
    const r = await pool.query(
      `SELECT id,
              name,
              username,
              email,
              phone,
              address,
              role,
              "position",
              preferred_payment_method,
              payment_details,
              comments,
              photo_drive_id,
              photo_url
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [idNum]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "User not found" });
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("ADMIN GET profile error:", e);
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

// ✅ ADMIN: PATCH full user profile (admin fields allowed)
app.patch("/api/admin/users/:userId/profile", async (req, res) => {
  const { userId } = req.params;

  const {
    name,
    username,
    email,
    phone,
    address,

    // admin fields
    role,
    position,
    preferred_payment_method,
    payment_details,
    comments,
  } = req.body || {};

  try {
    // Minimal validation
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: "Name cannot be empty." });
    }

    // Optional: enforce role values based on your DB check constraint
    const allowedRoles = ["admin", "user", "student", "vendor"];
    if (role !== undefined && role !== null) {
      const rr = String(role).toLowerCase().trim();
      if (!allowedRoles.includes(rr)) {
        return res.status(400).json({ error: `Invalid role. Use: ${allowedRoles.join(", ")}` });
      }
    }

    const r = await pool.query(
      `UPDATE users
          SET name = COALESCE($1, name),
              username = $2,
              email = $3,
              phone = $4,
              address = $5,
              role = COALESCE($6, role),
              "position" = $7,
              preferred_payment_method = $8,
              payment_details = $9,
              comments = $10,
              updated_at = NOW()
        WHERE id = $11
      RETURNING id,
                name,
                username,
                email,
                phone,
                address,
                role,
                "position",
                preferred_payment_method,
                payment_details,
                comments,
                photo_drive_id`,
      [
        name === undefined ? null : String(name).trim(),
        String(username || "").trim() || null,
        String(email || "").trim() || null,
        String(phone || "").trim() || null,
        String(address || "").trim() || null,
        role === undefined || role === null ? null : String(role).toLowerCase().trim(),
        String(position || "").trim() || null,
        String(preferred_payment_method || "").trim() || null,
        String(payment_details || "").trim() || null,
        comments === undefined ? null : String(comments),
        userId,
      ]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error("ADMIN PATCH profile error:", e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// DELETE USER
app.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const result = await pool.query(
            `DELETE FROM users WHERE id = $1 RETURNING *`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ===============================
// ✅ VENDORS (users.role = 'vendor')
// - supports NOT NULL users.email by generating username@vendor.local
// - supports: create vendor (manual), create vendor from name, sync from Business expenses
// - vendor expenses pulled from profits where category='Business' and type='expense'
// ===============================

// Helpers
const normalizeVendorKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseVendorFromDescription = (desc) => {
  const s = String(desc || '');
  const match = s.match(/\(Vendor:\s*([^)]+)\)/i);
  if (match && match[1]) return match[1].trim();
  return s.trim() || '';
};

const buildBaseUsername = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30) || 'vendor';

const buildVendorEmail = (username) => `${username}@vendor.local`;

async function generateUniqueUsername(pool, baseUsername) {
  let username = baseUsername;
  for (let i = 0; i < 15; i++) {
    const exists = await pool.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', [username]);
    if (exists.rowCount === 0) return username;
    username = `${baseUsername}.${Math.floor(100 + Math.random() * 900)}`.slice(0, 30);
  }
  // last resort
  return `${baseUsername}.${Date.now()}`.slice(0, 30);
}

async function ensureEmailUnique(pool, email) {
  const emailExists = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);
  return emailExists.rowCount === 0;
}

async function createVendorUser({ name, email, phone, position }) {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Vendor name is required');

  const baseUsername =
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 30) || 'vendor';

  // Ensure username unique
  let username = baseUsername;
  for (let i = 0; i < 15; i++) {
    const exists = await pool.query('SELECT 1 FROM users WHERE username = $1 LIMIT 1', [username]);
    if (exists.rowCount === 0) break;
    username = `${baseUsername}.${Math.floor(100 + Math.random() * 900)}`.slice(0, 30);
  }

  // Always provide an email (users.email is NOT NULL)
  const finalEmail = (email && String(email).trim())
    ? String(email).trim()
    : `${username}@vendor.local`;

  // Prevent dup email
  const emailExists = await pool.query('SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1', [finalEmail]);
  if (emailExists.rowCount > 0) {
    // If it's the autogenerated vendor.local email, tweak it
    if (!email || !String(email).trim()) {
      const fallbackEmail = `${username}.${Math.floor(1000 + Math.random() * 9000)}@vendor.local`;
      const fallbackExists = await pool.query(
        'SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1',
        [fallbackEmail]
      );
      if (fallbackExists.rowCount === 0) {
        return createVendorUser({ name: cleanName, email: fallbackEmail, phone, position });
      }
    }
    throw new Error('Email already exists');
  }

  // Password required (even if vendor never logs in)
  const tempPassword = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Try role='vendor' first. If constraint still blocks it, fall back to role='user' + position='Vendor'
  const tryInsert = async (roleValue) => {
    return pool.query(
      `INSERT INTO users (name, username, email, phone, position, password, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, name, username, email, phone, position, role`,
      [
        cleanName,
        username,
        finalEmail,
        phone ? String(phone).trim() : null,
        position ? String(position).trim() : 'Vendor',
        hashedPassword,
        roleValue,
      ]
    );
  };

  try {
    const result = await tryInsert('vendor');
    return result.rows[0];
  } catch (err) {
    // 23514 = check constraint violation (your users_role_check)
    if (err?.code === '23514') {
      const result = await tryInsert('user'); // fallback
      // ensure it's clearly marked as a vendor in UI even if role didn't allow it
      return { ...result.rows[0], position: 'Vendor' };
    }
    throw err;
  }
}


// -----------------------------------------------------
// ✅ CREATE VENDOR (manual form / modal)
// POST /api/vendors
// -----------------------------------------------------
app.post('/api/vendors', async (req, res) => {
  try {
    const vendor = await createVendorUser(req.body || {});
    return res.status(201).json(vendor);
  } catch (err) {
    console.error('❌ Error creating vendor:', err);
    return res.status(400).json({ error: err.message || 'Failed to create vendor' });
  }
});


// -----------------------------------------------------
// ✅ CREATE VENDOR FROM NAME (from vendors expenses UI)
// POST /api/vendors/from-name
// -----------------------------------------------------
app.post('/api/vendors/from-name', async (req, res) => {
  const { name } = req.body || {};
  const cleanName = String(name || '').trim();
  if (!cleanName) return res.status(400).json({ error: 'Vendor name is required' });

  try {
    // Look for existing vendor by name (role vendor OR position Vendor)
    const existing = await pool.query(
      `SELECT id, name, username, email, phone, position, role
       FROM users
       WHERE (lower(role)='vendor' OR lower(position)='vendor')
         AND lower(name)=lower($1)
       LIMIT 1`,
      [cleanName]
    );
    if (existing.rowCount > 0) return res.status(200).json(existing.rows[0]);

    const vendor = await createVendorUser({ name: cleanName, position: 'Vendor' });
    return res.status(201).json(vendor);
  } catch (err) {
    console.error('Error creating vendor from name:', err);
    return res.status(500).json({ error: 'Failed to create vendor' });
  }
});


// -----------------------------------------------------
// ✅ VENDOR EXPENSES (Business only) from PROFITS
// GET /api/vendor-expenses
// Returns rows including exists_in_users flag (normalized matching)
// -----------------------------------------------------
app.get('/api/vendor-expenses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        category,
        description,
        amount,
        type,
        payment_method,
        processor,
        COALESCE(paid_at, created_at) AS expense_date
      FROM profits
      WHERE
        category = 'Business'
        AND LOWER(type) = 'expense'
        AND amount < 0
      ORDER BY COALESCE(paid_at, created_at) DESC
      LIMIT 1000;
    `);

    const vendorUsersRes = await pool.query(`
      SELECT name
      FROM users
      WHERE LOWER(role) = 'vendor'
    `);

    const vendorNameSet = new Set(
      vendorUsersRes.rows.map((u) => normalizeVendorKey(u.name))
    );

    const rows = result.rows.map((r) => {
      const vendor = parseVendorFromDescription(r.description);
      const exists = vendorNameSet.has(normalizeVendorKey(vendor));

      return {
        id: r.id,
        vendor: vendor || '-',
        category: r.category, // always Business
        amount: Math.abs(Number(r.amount) || 0),
        expense_date: r.expense_date,
        description: r.description || '-',
        payment_method: r.payment_method || '-',
        processor: r.processor || '-',
        exists_in_users: exists,
      };
    });

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching Business vendor expenses:', err);
    res.status(500).json({ error: 'Failed to fetch vendor expenses' });
  }
});

// -----------------------------------------------------
// ✅ DISCOVERED VENDORS LIST (grouped) from Business expenses
// GET /api/vendor-expense-vendors
// -----------------------------------------------------
app.get('/api/vendor-expense-vendors', async (req, res) => {
  try {
    const expensesRes = await pool.query(`
      SELECT description, amount
      FROM profits
      WHERE
        category = 'Business'
        AND LOWER(type) = 'expense'
        AND amount < 0
      ORDER BY COALESCE(paid_at, created_at) DESC
      LIMIT 5000;
    `);

    const vendorUsersRes = await pool.query(`
      SELECT name
      FROM users
      WHERE LOWER(role) = 'vendor'
    `);

    const vendorNameSet = new Set(
      vendorUsersRes.rows.map((u) => normalizeVendorKey(u.name))
    );

    const map = new Map();
    for (const row of expensesRes.rows) {
      const vendor = parseVendorFromDescription(row.description);
      if (!vendor) continue;

      const key = normalizeVendorKey(vendor);
      if (!key) continue;

      if (!map.has(key)) map.set(key, { vendor, count: 0, total: 0 });

      const cur = map.get(key);
      cur.count += 1;
      cur.total += Math.abs(Number(row.amount) || 0);
      map.set(key, cur);
    }

    const list = Array.from(map.values()).map((v) => ({
      vendor: v.vendor,
      count: v.count,
      total: v.total,
      exists_in_users: vendorNameSet.has(normalizeVendorKey(v.vendor)),
    }));

    list.sort((a, b) => b.total - a.total);

    res.status(200).json(list);
  } catch (err) {
    console.error('Error building vendor expense vendor list:', err);
    res.status(500).json({ error: 'Failed to fetch vendor vendors' });
  }
});

// -----------------------------------------------------
// ✅ BULK SYNC VENDORS from Business expenses
// POST /api/vendors/sync-from-business-expenses
// -----------------------------------------------------
app.post('/api/vendors/sync-from-business-expenses', async (req, res) => {
  try {
    const expensesRes = await pool.query(`
      SELECT description
      FROM profits
      WHERE
        category = 'Business'
        AND LOWER(type)='expense'
        AND amount < 0
      LIMIT 5000;
    `);

    const vendorsFromExpenses = new Map(); // key -> displayName
    for (const r of expensesRes.rows) {
      const displayName = parseVendorFromDescription(r.description);
      const key = normalizeVendorKey(displayName);
      if (!key) continue;
      if (!vendorsFromExpenses.has(key)) vendorsFromExpenses.set(key, displayName);
    }

    const vendorUsersRes = await pool.query(`
      SELECT name
      FROM users
      WHERE LOWER(role)='vendor'
    `);

    const existing = new Set(vendorUsersRes.rows.map((r) => normalizeVendorKey(r.name)));

    let created = 0;
    let skipped = 0;

    for (const [key, displayName] of vendorsFromExpenses.entries()) {
      if (existing.has(key)) {
        skipped++;
        continue;
      }

      // Create vendor user (generates email automatically)
      await createVendorUser(pool, { name: displayName });
      created++;
      existing.add(key);
    }

    res.status(200).json({
      message: 'Vendor sync completed',
      created,
      skipped,
      discovered: vendorsFromExpenses.size,
    });
  } catch (err) {
    console.error('Error syncing vendors:', err);
    res.status(500).json({ error: 'Failed to sync vendors' });
  }
});



// GET endpoint to fetch gigs
app.get('/gigs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                g.*, 
                ARRAY_AGG(u.username) AS claimed_usernames,
                g.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York' AS local_date,
                g.time AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York' AS local_time
            FROM gigs g 
            LEFT JOIN users u ON u.username = ANY(g.claimed_by)
            GROUP BY g.id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching gigs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle chat_created status
app.patch('/gigs/:id/chat-created', async (req, res) => {
    const { id } = req.params;
    const { chat_created } = req.body;

    try {
        const result = await pool.query(
            `UPDATE gigs SET chat_created = $1 WHERE id = $2 RETURNING *`,
            [chat_created, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating chat_created status:', error);
        res.status(500).json({ error: 'Failed to update chat_created status' });
    }
});

// Toggle review_sent status
app.patch('/gigs/:id/review-sent', async (req, res) => {
    const { id } = req.params;
    const { review_sent } = req.body;

    try {
        const result = await pool.query(
            `UPDATE gigs SET review_sent = $1 WHERE id = $2 RETURNING *`,
            [review_sent, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating review_sent status:', error);
        res.status(500).json({ error: 'Failed to update review_sent status' });
    }
});

// PATCH endpoint to claim a gig (DUAL-WRITE: username + ids)
app.patch("/gigs/:id/claim", async (req, res) => {
  const gigId = req.params.id;
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Missing username." });
  }

  try {
    // Pull both old and new claim arrays
    const gigResult = await pool.query(
      "SELECT claimed_by, claimed_by_ids, staff_needed FROM gigs WHERE id = $1",
      [gigId]
    );

    if (gigResult.rowCount === 0) {
      return res.status(404).json({ error: "Gig not found" });
    }

    const gig = gigResult.rows[0];
    const claimedBy = Array.isArray(gig.claimed_by) ? gig.claimed_by : [];
    const claimedByIds = Array.isArray(gig.claimed_by_ids) ? gig.claimed_by_ids : [];

    const claimedCount = claimedBy.length;

    // Check if gig has already been fully claimed (keep your current logic)
    if (claimedCount >= gig.staff_needed) {
      return res.status(400).json({ error: "Max staff claimed for this gig" });
    }

    // Check if the user already claimed the gig (by username)
    if (claimedBy.includes(username)) {
      return res.status(400).json({ error: "User has already claimed this gig" });
    }

    // Lookup user id (for claimed_by_ids)
    const uRes = await pool.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    const userId = uRes.rowCount ? Number(uRes.rows[0].id) : null;

    // If we can't find the user id, we still let the claim happen by username
    // (so we never break existing behavior), but ids won't be updated for that user.
    if (Number.isInteger(userId) && userId > 0) {
      // prevent duplicates in ids array
      if (claimedByIds.includes(userId)) {
        // If this happens, keep things consistent: append username but don't re-append id
        await pool.query(
          "UPDATE gigs SET claimed_by = array_append(claimed_by, $1) WHERE id = $2",
          [username, gigId]
        );
      } else {
        await pool.query(
          `
          UPDATE gigs
          SET claimed_by = array_append(claimed_by, $1),
              claimed_by_ids = array_append(claimed_by_ids, $2)
          WHERE id = $3
          `,
          [username, userId, gigId]
        );
      }
    } else {
      await pool.query(
        "UPDATE gigs SET claimed_by = array_append(claimed_by, $1) WHERE id = $2",
        [username, gigId]
      );
    }

    // Return updated gig info (same format you already use)
    const updatedGigResult = await pool.query(
      `
      SELECT
        g.*,
        ARRAY_REMOVE(ARRAY_AGG(u.username), NULL) AS claimed_usernames
      FROM gigs g
      LEFT JOIN users u ON u.username = ANY(g.claimed_by)
      WHERE g.id = $1
      GROUP BY g.id
      `,
      [gigId]
    );

    res.json(updatedGigResult.rows[0]);
  } catch (error) {
    console.error("Error claiming gig:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH endpoint to claim a backup spot for a gig (DUAL-WRITE: username + ids)
app.patch("/gigs/:id/claim-backup", async (req, res) => {
  const gigId = req.params.id;
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Missing username." });
  }

  try {
    const gigResult = await pool.query(
      "SELECT backup_claimed_by, backup_claimed_by_ids, backup_needed FROM gigs WHERE id = $1",
      [gigId]
    );

    if (gigResult.rowCount === 0) {
      return res.status(404).json({ error: "Gig not found" });
    }

    const gig = gigResult.rows[0];
    const backupClaimedBy = Array.isArray(gig.backup_claimed_by) ? gig.backup_claimed_by : [];
    const backupClaimedByIds = Array.isArray(gig.backup_claimed_by_ids) ? gig.backup_claimed_by_ids : [];

    const backupClaimedCount = backupClaimedBy.length;

    // Check if the backup spots have already been fully claimed
    if (backupClaimedCount >= gig.backup_needed) {
      return res.status(400).json({ error: "Max backup staff claimed for this gig" });
    }

    // Check if user already claimed backup (by username)
    if (backupClaimedBy.includes(username)) {
      return res.status(400).json({ error: "User has already claimed a backup spot for this gig" });
    }

    // Lookup user id (for backup_claimed_by_ids)
    const uRes = await pool.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    const userId = uRes.rowCount ? Number(uRes.rows[0].id) : null;

    if (Number.isInteger(userId) && userId > 0) {
      if (backupClaimedByIds.includes(userId)) {
        await pool.query(
          "UPDATE gigs SET backup_claimed_by = array_append(backup_claimed_by, $1) WHERE id = $2",
          [username, gigId]
        );
      } else {
        await pool.query(
          `
          UPDATE gigs
          SET backup_claimed_by = array_append(backup_claimed_by, $1),
              backup_claimed_by_ids = array_append(backup_claimed_by_ids, $2)
          WHERE id = $3
          `,
          [username, userId, gigId]
        );
      }
    } else {
      await pool.query(
        "UPDATE gigs SET backup_claimed_by = array_append(backup_claimed_by, $1) WHERE id = $2",
        [username, gigId]
      );
    }

    const updatedGigResult = await pool.query(
      `
      SELECT
        g.*,
        ARRAY_REMOVE(ARRAY_AGG(u.username), NULL) AS backup_claimed_usernames
      FROM gigs g
      LEFT JOIN users u ON u.username = ANY(g.backup_claimed_by)
      WHERE g.id = $1
      GROUP BY g.id
      `,
      [gigId]
    );

    res.json(updatedGigResult.rows[0]);
  } catch (error) {
    console.error("Error claiming backup for gig:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH endpoint to unclaim a gig (DUAL-WRITE: username + ids)
app.patch("/gigs/:id/unclaim", async (req, res) => {
  const gigId = req.params.id;
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Missing username." });
  }

  try {
    // Grab current state + also figure out the userId
    const gigResult = await pool.query(
      "SELECT claimed_by, claimed_by_ids FROM gigs WHERE id = $1",
      [gigId]
    );
    if (gigResult.rowCount === 0) {
      return res.status(404).json({ error: "Gig not found" });
    }

    const gig = gigResult.rows[0];

    // Check existing username claim (preserves your current behavior)
    if (!gig.claimed_by || !gig.claimed_by.includes(username)) {
      return res.status(400).json({ error: "User has not claimed this gig" });
    }

    // Find the user's id (for claimed_by_ids)
    const uRes = await pool.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    const userId = uRes.rowCount ? Number(uRes.rows[0].id) : null;

    // Update BOTH arrays in one statement
    // If userId is null (username not found), we only remove from claimed_by and leave ids untouched.
    if (Number.isInteger(userId) && userId > 0) {
      await pool.query(
        `
        UPDATE gigs
        SET claimed_by = array_remove(claimed_by, $1),
            claimed_by_ids = array_remove(claimed_by_ids, $2)
        WHERE id = $3
        `,
        [username, userId, gigId]
      );
    } else {
      await pool.query(
        `
        UPDATE gigs
        SET claimed_by = array_remove(claimed_by, $1)
        WHERE id = $2
        `,
        [username, gigId]
      );
    }

    // Return updated gig info (keep your existing response format)
    const updatedGigResult = await pool.query(
      `
      SELECT
        g.*,
        ARRAY_REMOVE(ARRAY_AGG(u.username), NULL) AS claimed_usernames
      FROM gigs g
      LEFT JOIN users u ON u.username = ANY(g.claimed_by)
      WHERE g.id = $1
      GROUP BY g.id
      `,
      [gigId]
    );

    res.json(updatedGigResult.rows[0]);
  } catch (error) {
    console.error("Error unclaiming gig:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH endpoint to unclaim a backup spot (DUAL-WRITE: username + ids)
app.patch("/gigs/:id/unclaim-backup", async (req, res) => {
  const gigId = req.params.id;
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Missing username." });
  }

  try {
    const gigResult = await pool.query(
      "SELECT backup_claimed_by, backup_claimed_by_ids FROM gigs WHERE id = $1",
      [gigId]
    );
    if (gigResult.rowCount === 0) {
      return res.status(404).json({ error: "Gig not found" });
    }

    const gig = gigResult.rows[0];

    if (!gig.backup_claimed_by || !gig.backup_claimed_by.includes(username)) {
      return res
        .status(400)
        .json({ error: "User has not claimed a backup spot for this gig" });
    }

    const uRes = await pool.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [username]
    );
    const userId = uRes.rowCount ? Number(uRes.rows[0].id) : null;

    if (Number.isInteger(userId) && userId > 0) {
      await pool.query(
        `
        UPDATE gigs
        SET backup_claimed_by = array_remove(backup_claimed_by, $1),
            backup_claimed_by_ids = array_remove(backup_claimed_by_ids, $2)
        WHERE id = $3
        `,
        [username, userId, gigId]
      );
    } else {
      await pool.query(
        `
        UPDATE gigs
        SET backup_claimed_by = array_remove(backup_claimed_by, $1)
        WHERE id = $2
        `,
        [username, gigId]
      );
    }

    const updatedGigResult = await pool.query(
      `
      SELECT
        g.*,
        ARRAY_REMOVE(ARRAY_AGG(u.username), NULL) AS backup_claimed_usernames
      FROM gigs g
      LEFT JOIN users u ON u.username = ANY(g.backup_claimed_by)
      WHERE g.id = $1
      GROUP BY g.id
      `,
      [gigId]
    );

    res.json(updatedGigResult.rows[0]);
  } catch (error) {
    console.error("Error unclaiming backup gig:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/appointments/:id/check-in', async (req, res) => {
  const { id } = req.params;
  const { userId, username } = req.body;

  try {
    // 1) Resolve user (ID preferred, fallback to username)
    let userRes;
    if (userId) {
      userRes = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    } else {
      userRes = await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);
    }

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resolvedUserId = userRes.rows[0].id;
    const resolvedUsername = userRes.rows[0].username;

    // 2) Update appointment record
    await pool.query(
      `
      UPDATE appointments
      SET checked_in = true,
          check_in_time = NOW(),
          checked_in_by = $1
      WHERE id = $2
      `,
      [resolvedUsername, id]
    );

    // 3) Insert or update attendance
    await pool.query(
      `
      INSERT INTO AppointmentAttendance (user_id, appointment_id, check_in_time, is_checked_in)
      VALUES ($1, $2, NOW(), TRUE)
      ON CONFLICT (user_id, appointment_id)
      DO UPDATE SET check_in_time = NOW(), is_checked_in = TRUE
      `,
      [resolvedUserId, id]
    );

    res.status(200).json({ message: 'Checked in to appointment successfully' });
  } catch (err) {
    console.error('❌ Error checking in to appointment:', err);
    res.status(500).json({ error: 'Failed to check in to appointment' });
  }
});


app.post('/appointments/:id/check-out', async (req, res) => {
  const { id } = req.params;
  const { userId, username } = req.body;

  try {
    // 1) Resolve user (ID preferred, fallback to username)
    let userRes;
    if (userId) {
      userRes = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId]);
    } else {
      userRes = await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);
    }

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resolvedUserId = userRes.rows[0].id;
    const resolvedUsername = userRes.rows[0].username;

    // 2) Update appointment record
    await pool.query(
      `
      UPDATE appointments
      SET checked_out = true,
          check_out_time = NOW(),
          checked_out_by = $1
      WHERE id = $2
      `,
      [resolvedUsername, id]
    );

    // 3) Update attendance
    await pool.query(
      `
      UPDATE AppointmentAttendance
      SET check_out_time = NOW(),
          is_checked_in = FALSE
      WHERE user_id = $1 AND appointment_id = $2
      `,
      [resolvedUserId, id]
    );

    res.status(200).json({ message: 'Checked out of appointment successfully' });
  } catch (err) {
    console.error('❌ Error checking out of appointment:', err);
    res.status(500).json({ error: 'Failed to check out of appointment' });
  }
});


// POST /gigs/:gigId/check-in  (accepts userId OR username)
app.post('/gigs/:gigId/check-in', async (req, res) => {
  const { gigId } = req.params;
  const { userId, username } = req.body;

  try {
    // Resolve user (prefer userId, fallback to username)
    const userRes = userId
      ? await pool.query('SELECT id, username FROM users WHERE id = $1', [userId])
      : await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);

    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const resolvedUserId = userRes.rows[0].id;

    const attendanceResult = await pool.query(
      `
      INSERT INTO GigAttendance (gig_id, user_id, check_in_time, is_checked_in)
      VALUES ($1, $2, NOW(), TRUE)
      ON CONFLICT (gig_id, user_id)
      DO UPDATE SET check_in_time = NOW(), is_checked_in = TRUE
      RETURNING check_in_time;
      `,
      [gigId, resolvedUserId]
    );

    const checkInTimeUTC = attendanceResult.rows[0].check_in_time;

    res.status(200).json({
      message: 'Checked in successfully.',
      check_in_time: moment.utc(checkInTimeUTC).tz('America/New_York').format('YYYY-MM-DD hh:mm A'),
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ error: 'Error during check-in' });
  }
});

// ✅ UPDATED: accepts optional startAddress/endAddress from client to avoid blank mileage
app.post('/gigs/:gigId/check-out', async (req, res) => {
  const { gigId } = req.params;
  const { userId, username, startAddress, endAddress } = req.body;

  try {
    // Resolve user + get address
    const userRes = userId
      ? await pool.query('SELECT id, username, address FROM users WHERE id = $1', [userId])
      : await pool.query('SELECT id, username, address FROM users WHERE username = $1', [username]);

    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRes.rows[0];

    // Get gig location
    const gigRes = await pool.query('SELECT id, location FROM gigs WHERE id = $1', [gigId]);
    if (gigRes.rowCount === 0) return res.status(404).json({ error: 'Gig not found' });

    const gig = gigRes.rows[0];

    // Always check out attendance (never block)
    const attendanceResult = await pool.query(
      `
      UPDATE GigAttendance
      SET check_out_time = NOW(), is_checked_in = FALSE
      WHERE gig_id = $1 AND user_id = $2
      RETURNING check_out_time;
      `,
      [gigId, user.id]
    );

    // ✅ Prefer startAddress from client, fallback to users.address
    const effectiveStart = typeof startAddress === 'string' && startAddress.trim()
      ? startAddress.trim()
      : (typeof user.address === 'string' ? user.address.trim() : '');

    // ✅ Prefer endAddress from client, fallback to gigs.location
    const effectiveEnd = typeof endAddress === 'string' && endAddress.trim()
      ? endAddress.trim()
      : (typeof gig.location === 'string' ? gig.location.trim() : '');

    const hasAddress = effectiveStart.length > 0;
    const hasLocation = effectiveEnd.length > 0;

    let mileageLogged = false;

    // Mileage (ROUND-TRIP)
    if (hasAddress && hasLocation) {
      const oneWayMiles = await getDrivingMiles(effectiveStart, effectiveEnd);
      const miles = Number((oneWayMiles * 2).toFixed(2)); // ROUND-TRIP

      await pool.query(
        `
        INSERT INTO gig_mileage (
          gig_id, user_id, start_address, end_address, miles, source
        )
        VALUES ($1, $2, $3, $4, $5, 'home_to_gig')
        ON CONFLICT (gig_id, user_id, source)
        DO UPDATE SET
          miles = EXCLUDED.miles,
          start_address = EXCLUDED.start_address,
          end_address = EXCLUDED.end_address,
          created_at = NOW()
        `,
        [gigId, user.id, effectiveStart, effectiveEnd, miles]
      );

      mileageLogged = true;
    }

    const checkOutTimeUTC = attendanceResult.rows?.[0]?.check_out_time;

    res.status(200).json({
      message: 'Checked out successfully.',
      check_out_time: checkOutTimeUTC
        ? moment.utc(checkOutTimeUTC).tz('America/New_York').format('YYYY-MM-DD hh:mm A')
        : null,
      mileage_logged: mileageLogged,
      start_address_used: effectiveStart || null,
      end_address_used: effectiveEnd || null,
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    res.status(500).json({ error: 'Error during check-out' });
  }
});



app.get('/api/mileage/:userId', async (req, res) => {
  const { userId } = req.params;
  const year = req.query.year || new Date().getFullYear();

  try {
    const result = await pool.query(
      `
      SELECT
        g.date,
        g.event_type,
        g.location,
        gm.miles,
        gm.start_address,
        gm.end_address
      FROM gig_mileage gm
      JOIN gigs g ON g.id = gm.gig_id
      WHERE gm.user_id = $1
        AND EXTRACT(YEAR FROM g.date) = $2
      ORDER BY g.date ASC
      `,
      [userId, year]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Mileage fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch mileage' });
  }
});


app.get('/api/admin/attendance', async (req, res) => {
  try {
    // GIG attendance
    const gigAttendance = await pool.query(`
      SELECT 
        a.user_id,
        u.name,
        g.id AS source_id,
        'gig' AS type,
        g.client,
        g.event_type,
        g.date AS event_date,
        g.time AS event_time,
        g.location,
        g.pay,
        a.check_in_time,
        a.check_out_time,
        a.is_checked_in,
        a.is_paid,
        u.preferred_payment_method
      FROM GigAttendance a
      JOIN users u ON a.user_id = u.id
      JOIN gigs g ON a.gig_id = g.id
    `);

    // APPOINTMENT attendance (assigned_staff tracking)
    const appointmentAttendance = await pool.query(`
        SELECT 
            aa.user_id,
            a.id AS source_id,
            u.username,
            a.title AS event_type,
            a.date AS event_date,
            a.time AS event_time,
            '1030 NW 200th Terrace Miami FL 33169' AS location,
            a.description AS client,
            aa.check_in_time,
            aa.check_out_time,
            aa.is_checked_in,
            aa.is_paid,
            a.price AS pay,
            'appointment' AS type,
            u.name,
            u.preferred_payment_method
        FROM AppointmentAttendance aa
        JOIN appointments a ON aa.appointment_id = a.id
        JOIN users u ON aa.user_id = u.id
        `);

    const users = await pool.query(`
      SELECT id, username, name, preferred_payment_method FROM users
    `);

    // Map usernames to user details
    const userMap = {};
    users.rows.forEach(u => {
      userMap[u.username] = u;
    });

    const formattedAppointments = appointmentAttendance.rows.map(appt => {
      const user = userMap[appt.username] || {};
      return {
        ...appt,
        user_id: user.id,
        name: user.name,
        preferred_payment_method: user.preferred_payment_method
      };
    });

    const combined = [...gigAttendance.rows, ...formattedAppointments].sort(
      (a, b) => new Date(b.event_date) - new Date(a.event_date)
    );

    res.json(combined);
  } catch (error) {
    console.error('Error fetching combined attendance:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.patch('/api/gigs/:gigId/attendance/:userId', async (req, res) => {
    const { gigId, userId } = req.params;
    const { check_in_time, check_out_time } = req.body;

    if (!gigId || !userId || isNaN(parseInt(gigId)) || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: 'Invalid or missing gigId/userId.' });
    }

    try {
        const query = `
            UPDATE gigattendance
            SET check_in_time = $1, check_out_time = $2
            WHERE gig_id = $3 AND user_id = $4
            RETURNING *;
        `;
        const values = [check_in_time, check_out_time, parseInt(gigId), parseInt(userId)];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gig attendance not found.' });
        }

        res.status(200).json({ message: 'Attendance updated successfully.', data: result.rows });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
});

// Edit appointment attendance times (matches GigAttendance.js)
app.patch('/appointments/:apptId/attendance/:userId', async (req, res) => {
  const apptId = parseInt(req.params.apptId, 10);
  const userId = parseInt(req.params.userId, 10);
  const { check_in_time, check_out_time } = req.body;

  if (!apptId || !userId) {
    return res.status(400).json({ error: 'Invalid apptId/userId' });
  }

  try {
    const result = await pool.query(
      `
      UPDATE AppointmentAttendance
      SET
        check_in_time  = $1::timestamptz,
        check_out_time = $2::timestamptz
      WHERE appointment_id = $3 AND user_id = $4
      RETURNING *;
      `,
      [check_in_time || null, check_out_time || null, apptId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment attendance not found.' });
    }

    res.json({ message: 'Appointment attendance updated.', data: result.rows[0] });
  } catch (err) {
    console.error('❌ Error updating appointment attendance:', err);
    res.status(500).json({ error: 'Failed to update appointment attendance' });
  }
});

app.get('/api/appointments/user-attendance', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        a.id AS appointment_id,
        a.title,
        a.date AS appt_date,
        a.time AS appt_time,
        '1030 NW 200th Terrace Miami FL 33169' AS location,
        aa.check_in_time,
        aa.check_out_time,
        aa.is_paid,
        a.description
      FROM appointments a
      JOIN AppointmentAttendance aa ON aa.appointment_id = a.id
      JOIN users u ON aa.user_id = u.id
      WHERE u.username = $1
      ORDER BY a.date DESC, a.time DESC
    `, [username]);

    return res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching appointment attendance:', err);
    return res.status(500).json({ error: 'Failed to fetch appointment attendance' });
  }
});

app.get('/api/gigs/user-attendance', async (req, res) => {
    const { username } = req.query;

    if (!username) {
        console.error('Username is missing from the query parameters.');
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        console.log(`Fetching user ID for username: ${username}`);
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            console.error('User not found in the database.');
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResult.rows[0].id;

        console.log(`Fetching attendance data for user ID: ${userId}`);
        const attendanceResult = await pool.query(`
            SELECT 
                a.*, 
                g.client, 
                g.event_type, 
                g.date, 
                g.time, 
                g.location, 
                g.pay
            FROM GigAttendance a
            INNER JOIN Gigs g ON a.gig_id = g.id
            WHERE a.user_id = $1
        `, [userId]);

        if (attendanceResult.rowCount === 0) {
            console.log('No attendance records found for this user.');
            return res.json([]);
        }

        // Format the date and time
        attendanceResult.rows.forEach((record) => {
            record.gig_date = moment.utc(record.gig_date).tz('America/New_York').format('YYYY-MM-DD');
            record.gig_time = moment.utc(record.gig_time).tz('America/New_York').format('HH:mm:ss');
        });

        console.log('Attendance records fetched successfully.');
        res.json(attendanceResult.rows);
    } catch (error) {
        console.error('Error fetching user attendance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add this to app.js if missing
app.patch('/appointments/:appointmentId/attendance/:userId/pay', async (req, res) => {
  const { appointmentId, userId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE AppointmentAttendance
       SET is_paid = TRUE
       WHERE appointment_id = $1 AND user_id = $2
       RETURNING *`,
      [appointmentId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment attendance record not found.' });
    }

    res.json({ message: 'Appointment payment marked as completed.', attendance: result.rows[0] });
  } catch (error) {
    console.error('Error updating appointment payment status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// POST: Add extra income  ✅ (FULL paste-in)
app.post('/api/extra-income', async (req, res) => {
  const { clientId, gigId, amount, description } = req.body;

  // ✅ sanitize/cast
  const clientIdInt = parseInt(clientId, 10);
  const gigIdInt = gigId ? parseInt(gigId, 10) : null; // "" -> null
  const amountNum = Number(amount);

  if (!clientIdInt || !Number.isFinite(amountNum) || !String(description || '').trim()) {
    return res.status(400).json({ error: 'clientId, amount, and description are required.' });
  }

  try {
    // ✅ Fetch client name (so profits shows a real name instead of ID)
    const cRes = await pool.query(
      `SELECT id, full_name
         FROM clients
        WHERE id = $1
        LIMIT 1`,
      [clientIdInt]
    );

    if (cRes.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const clientName = cRes.rows[0].full_name || `Client ${clientIdInt}`;

    // ✅ (optional) fetch gig name if gigId provided
    let gigName = null;
    if (gigIdInt) {
      const gRes = await pool.query(
        `SELECT id, client, event_type, date
           FROM gigs
          WHERE id = $1
          LIMIT 1`,
        [gigIdInt]
      );
      if (gRes.rowCount > 0) {
        const g = gRes.rows[0];
        gigName = g.client || g.event_type || `Gig ${gigIdInt}`;
      }
    }

    // ✅ Insert extra income row
    const insertIncomeQuery = `
      INSERT INTO extra_income (client_id, gig_id, amount, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(insertIncomeQuery, [
      clientIdInt,
      gigIdInt,     // ✅ nullable
      amountNum,
      String(description).trim()
    ]);

    // ✅ Insert into profits table with CLIENT NAME (not ID)
    const profitDesc =
      gigName
        ? `Payment from ${clientName} (${gigName}): ${String(description).trim()}`
        : `Payment from ${clientName}: ${String(description).trim()}`;

    const insertProfitQuery = `
      INSERT INTO profits (category, description, amount, type)
      VALUES ($1, $2, $3, $4);
    `;

    await pool.query(insertProfitQuery, [
      'Income',
      profitDesc,
      amountNum,     // ✅ positive
      'Income',
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding extra income:', error);
    return res.status(500).json({ error: 'Failed to add extra income.' });
  }
});

// GET: Fetch extra incomes
app.get('/api/extra-income', async (req, res) => {
    try {
        const extraIncomes = await pool.query(`
            SELECT ei.id, c.full_name AS client_name, g.client AS gig_name, ei.amount, ei.date, ei.description
            FROM extra_income ei
            JOIN clients c ON ei.client_id = c.id
            LEFT JOIN gigs g ON ei.gig_id = g.id
            ORDER BY ei.date DESC
        `);
        res.json(extraIncomes.rows);
    } catch (error) {
        console.error('Error fetching extra incomes:', error);
        res.status(500).json({ error: 'Failed to fetch extra incomes' });
    }
});


app.post('/api/payouts', async (req, res) => {
    const { staff_id, gig_id, appointment_id, payout_amount, description } = req.body;

    try {
        // Insert payout into the payouts table
        const result = await pool.query(
        `INSERT INTO payouts (staff_id, gig_id, appointment_id, payout_amount, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [staff_id, gig_id || null, appointment_id || null, payout_amount, description]
        );


        const payout = result.rows[0];

        // Fetch the staff name based on staff_id
        const staffResult = await pool.query(
            `SELECT name AS staff_name
            FROM users
            WHERE id = $1`,
            [staff_id]
        );

        if (staffResult.rows.length > 0) {
            const staffName = staffResult.rows[0].staff_name;

        // Insert corresponding record into the profits table
        await pool.query(
            `INSERT INTO profits (category, description, amount, type)
             VALUES ($1, $2, $3, $4)`,
            [
                'Expense',
                `Payout to ${staffName} for ${description}`,
                -payout_amount, // Negative value for expense
                'Staff Payment',
            ]
        );
    }
        res.status(201).json({ message: 'Payout saved successfully!', payout });
    } catch (error) {
        console.error('Error saving payout:', error);
        res.status(500).json({ error: 'Failed to save payout.' });
    }
});


app.get('/api/payouts/user', async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const result = await pool.query(
            `SELECT p.*
             FROM payouts p
             JOIN users u ON p.staff_id = u.id
             WHERE u.username = $1`,
            [username]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payouts:', error);
        res.status(500).json({ error: 'Failed to fetch payouts' });
    }
});

app.get('/api/payouts', async (req, res) => {
    const { staffId, gigId, startDate, endDate } = req.query;

    try {
        // Query for regular payouts
        let regularPayoutsQuery = `
            SELECT p.id, u.name, g.client AS gig_name, p.payout_amount, p.payout_date, p.status, p.description, 'regular' AS source
            FROM payouts p
            JOIN users u ON p.staff_id = u.id
            JOIN gigs g ON p.gig_id = g.id
            WHERE 1=1
        `;
        const params = [];

        // Apply filters
        if (staffId) {
            regularPayoutsQuery += ` AND p.staff_id = $${params.length + 1}`;
            params.push(staffId);
        }
        if (gigId) {
            regularPayoutsQuery += ` AND p.gig_id = $${params.length + 1}`;
            params.push(gigId);
        }
        if (startDate) {
            regularPayoutsQuery += ` AND p.payout_date >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            regularPayoutsQuery += ` AND p.payout_date <= $${params.length + 1}`;
            params.push(endDate);
        }

        regularPayoutsQuery += ` ORDER BY p.payout_date DESC`;

        const regularPayouts = await pool.query(regularPayoutsQuery, params);

        // Query for extra payouts
        let extraPayoutsQuery = `
            SELECT ep.id, u.name, g.client AS gig_name, ep.amount AS payout_amount, ep.date AS payout_date, 'Paid' AS status, ep.description, 'extra' AS source
            FROM extra_payouts ep
            LEFT JOIN users u ON ep.user_id = u.id
            LEFT JOIN gigs g ON ep.gig_id = g.id
            WHERE 1=1
        `;

        const extraPayoutsParams = [];
        if (staffId) {
            extraPayoutsQuery += ` AND ep.user_id = $${extraPayoutsParams.length + 1}`;
            extraPayoutsParams.push(staffId);
        }
        if (gigId) {
            extraPayoutsQuery += ` AND ep.gig_id = $${extraPayoutsParams.length + 1}`;
            extraPayoutsParams.push(gigId);
        }
        if (startDate) {
            extraPayoutsQuery += ` AND ep.date >= $${extraPayoutsParams.length + 1}`;
            extraPayoutsParams.push(startDate);
        }
        if (endDate) {
            extraPayoutsQuery += ` AND ep.date <= $${extraPayoutsParams.length + 1}`;
            extraPayoutsParams.push(endDate);
        }

        const extraPayouts = await pool.query(extraPayoutsQuery, extraPayoutsParams);

        // Combine results from both queries
        const allPayouts = [...regularPayouts.rows, ...extraPayouts.rows];

        // Sort by date (optional, since both queries are already sorted)
        allPayouts.sort((a, b) => new Date(b.payout_date) - new Date(a.payout_date));

        res.json(allPayouts);
    } catch (error) {
        console.error('Error fetching payouts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/extra-payouts', async (req, res) => {
    try {
        const payouts = await pool.query(`
            SELECT 
                p.id, u.name, g.client AS gig_name, p.payout_amount, p.payout_date, p.description
            FROM payouts p
            JOIN users u ON p.user_id = u.id
            JOIN gigs g ON p.gig_id = g.id
        `);

        const extraPayouts = await pool.query(`
            SELECT 
                ep.id, u.name, g.client AS gig_name, ep.amount AS payout_amount, ep.date AS payout_date, ep.description
            FROM extra_payouts ep
            JOIN users u ON ep.user_id = u.id
            JOIN gigs g ON ep.gig_id = g.id
        `);

        const combinedPayouts = [...payouts.rows, ...extraPayouts.rows];
        res.json(combinedPayouts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching payouts');
    }
});

app.post('/api/extra-payouts', async (req, res) => {
  const { userId, gigId, amount, description } = req.body;

  // ✅ sanitize/cast
  const userIdInt = parseInt(userId, 10);
  const gigIdInt = gigId ? parseInt(gigId, 10) : null;
  const amountNum = Number(amount);

  if (!userIdInt || !Number.isFinite(amountNum) || !String(description || '').trim()) {
    return res.status(400).json({ error: 'userId, amount, and description are required.' });
  }

  try {
    // ✅ Fetch staff name so profits shows a real name
    const uRes = await pool.query(
      `SELECT id, name
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [userIdInt]
    );

    if (uRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const staffName = uRes.rows[0].name || `User ${userIdInt}`;

    // ✅ (optional) fetch gig name if gig provided
    let gigName = null;
    if (gigIdInt) {
      const gRes = await pool.query(
        `SELECT id, client, event_type, date
           FROM gigs
          WHERE id = $1
          LIMIT 1`,
        [gigIdInt]
      );
      if (gRes.rowCount > 0) {
        const g = gRes.rows[0];
        gigName = g.client || g.event_type || `Gig ${gigIdInt}`;
      }
    }

    // ✅ Insert into extra_payouts
    const insertPayoutQuery = `
      INSERT INTO extra_payouts (user_id, gig_id, amount, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(insertPayoutQuery, [
      userIdInt,
      gigIdInt,
      amountNum,
      String(description).trim()
    ]);

    // ✅ Insert into profits with NAME (not ID)
    const profitDesc =
      gigName
        ? `Payout to ${staffName} (${gigName}): ${String(description).trim()}`
        : `Payout to ${staffName}: ${String(description).trim()}`;

    const insertProfitQuery = `
      INSERT INTO profits (category, description, amount, type)
      VALUES ($1, $2, $3, $4);
    `;

    await pool.query(insertProfitQuery, [
      'Expense',
      profitDesc,
      -Math.abs(amountNum), // ✅ always negative
      'Payout',
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding extra payout:', error);
    return res.status(500).json({ error: 'Failed to add extra payout.' });
  }
});


app.patch('/api/gigs/:gigId/attendance/:userId/pay', async (req, res) => {
    const { gigId, userId } = req.params;

    try {
        const result = await pool.query(
            `UPDATE GigAttendance
             SET is_paid = TRUE
             WHERE gig_id = $1 AND user_id = $2
             RETURNING *`,
            [gigId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gig attendance record not found.' });
        }

        const updatedAttendance = result.rows[0];


        res.json({ message: 'Payment marked as completed.', attendance: updatedAttendance });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/users/:id/payment-details', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT preferred_payment_method, payment_details FROM users WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { preferred_payment_method, payment_details } = result.rows[0];

        // Ensure payment_details is not null
        if (!preferred_payment_method || !payment_details) {
            return res.status(400).json({ error: 'Payment details are incomplete.' });
        }

        res.json({ preferred_payment_method, payment_details });
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/gigs/:id', async (req, res) => {
    const gigId = req.params.id;
    console.log('Deleting gig with ID:', gigId); // Add this log
    try {
        const result = await pool.query('DELETE FROM gigs WHERE id = $1', [gigId]);
        if (result.rowCount > 0) {
            res.status(200).send({ message: 'Gig deleted successfully' });
        } else {
            res.status(404).send({ message: 'Gig not found' });
        }
    } catch (error) {
        console.error('Error deleting gig:', error); // Log the error
        res.status(500).send({ error: 'Failed to delete the gig' });
    }
});

// Fetch all quotes
app.get('/api/quotes', async (req, res) => {
    try {
        const result = await pool.query(`
        SELECT q.*, c.full_name AS client_name
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        ORDER BY q.date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/quotes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT q.*, c.full_name AS client_name, c.email AS client_email, c.phone AS client_phone
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE q.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = result.rows[0];

    // Ensure items is parsed JSON (Postgres returns jsonb as object)
    if (typeof quote.items === 'string') {
      quote.items = JSON.parse(quote.items);
    }

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Add a new quote
// POST endpoint to create a new quote
app.post('/api/quotes', async (req, res) => {
  const {
    client_id,
    quoteDate,
    total_amount,
    status,
    quote_number,
    items,
    clientName,
    clientEmail,
    clientPhone,
    eventDate,
    eventTime,
    location
  } = req.body;

  if (!client_id || !quoteDate || !total_amount || !quote_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `
      INSERT INTO quotes (
        client_id, date, total_amount, status, quote_number,
        client_name, client_email, client_phone, event_date, event_time,
        location, items
      )
      VALUES ($1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12)
      RETURNING *;
    `;

    const values = [
      client_id,
      quoteDate,
      total_amount,
      status,
      quote_number,
      clientName,
      clientEmail,
      clientPhone,
      eventDate,
      eventTime,
      location,
      JSON.stringify(items)
    ];

    const result = await pool.query(query, values);
    const savedQuote = result.rows[0];

    // ✅ Attempt to send quote email
    try {
      await sendQuoteEmail(clientEmail, {
        ...req.body,
        id: savedQuote.id,
      });
      console.log(`✅ Quote email sent to ${clientEmail}`);
    } catch (emailErr) {
      console.error('❌ Failed to send quote email:', emailErr.message);
    }

    res.status(201).json(savedQuote);
  } catch (error) {
    console.error('❌ Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// PATCH /api/quotes/:id  — partial edit/update of a quote
app.patch('/api/quotes/:id', async (req, res) => {
  const { id } = req.params;

  const fieldMap = {
    client_id: 'client_id',
    quoteDate: 'date',
    total_amount: 'total_amount',
    status: 'status',
    quote_number: 'quote_number',
    clientName: 'client_name',
    clientEmail: 'client_email',
    clientPhone: 'client_phone',
    eventDate: 'event_date',
    eventTime: 'event_time',
    location: 'location',
    items: 'items',
    deposit_amount: 'deposit_amount',
    deposit_date: 'deposit_date',
    paid_in_full: 'paid_in_full'
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Fetch existing quote to detect transition
    const beforeRes = await client.query(
      `SELECT id, quote_number, client_name, client_email, total_amount, paid_in_full
       FROM quotes
       WHERE id = $1`,
      [id]
    );

    if (beforeRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quote not found' });
    }

    const before = beforeRes.rows[0];
    const payload = req.body || {};

    // 2) Build dynamic UPDATE for quotes
    const setParts = [];
    const values = [];
    let idx = 1;

    for (const [incomingKey, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(payload, incomingKey)) {
        let value = payload[incomingKey];

        if (incomingKey === 'items' && Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        if (value === '') value = null;

        setParts.push(`${column} = $${idx++}`);
        values.push(value);
      }
    }

    if (setParts.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    values.push(id);

    const updatedRes = await client.query(
      `
      UPDATE quotes
      SET ${setParts.join(', ')}
      WHERE id = $${idx}
      RETURNING id, quote_number, client_name, client_email, total_amount, paid_in_full;
      `,
      values
    );

    const updated = updatedRes.rows[0];

    // 3) If paid_in_full flipped false -> true, UPSERT into profits by quote_id
    const paidWasFalse = !before.paid_in_full;
    const paidNowTrue = updated.paid_in_full === true;

    if (paidWasFalse && paidNowTrue) {
      const quoteId = updated.id;
      const quoteNumber = updated.quote_number || before.quote_number || String(quoteId);
      const clientName = updated.client_name || before.client_name || 'Unknown Client';
      const clientEmail = updated.client_email || before.client_email || null;

      const grossAmount = Number(updated.total_amount ?? before.total_amount ?? 0) || 0;

      // If you track payment processor fees for quotes, compute fee here.
      // Otherwise leave fee at 0 and net=gross.
      const feeAmount = 0;
      const netAmount = grossAmount - feeAmount;

      await client.query(
        `
        INSERT INTO profits (
          category,
          description,
          amount,
          type,
          quote_id,
          gross_amount,
          fee_amount,
          net_amount,
          payment_method,
          processor,
          processor_txn_id,
          client_email,
          paid_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        ON CONFLICT (quote_id)
        DO UPDATE SET
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          type = EXCLUDED.type,
          gross_amount = EXCLUDED.gross_amount,
          fee_amount = EXCLUDED.fee_amount,
          net_amount = EXCLUDED.net_amount,
          payment_method = EXCLUDED.payment_method,
          processor = EXCLUDED.processor,
          processor_txn_id = EXCLUDED.processor_txn_id,
          client_email = EXCLUDED.client_email,
          paid_at = EXCLUDED.paid_at
        `,
        [
          'Income',
          `Quote ${quoteNumber} paid in full — ${clientName}`,
          netAmount,              // keep amount aligned with net, trigger can also adjust
          'Quote Income',
          quoteId,
          grossAmount,
          feeAmount,
          netAmount,
          payload.payment_method || 'Unknown',  // optional: allow frontend to pass these
          payload.processor || null,
          payload.processor_txn_id || null,
          clientEmail
        ]
      );
    }

    await client.query('COMMIT');
    res.json(updated);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error patching quote:', error);
    res.status(500).json({ error: 'Failed to edit quote' });
  } finally {
    client.release();
  }
});

// Update quote status
app.patch('/api/quotes/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, deposit_amount, deposit_date, paid_in_full } = req.body;

  try {
    // 1. Update the quote
    await pool.query(`
      UPDATE quotes
      SET status = $1,
          deposit_amount = $2,
          deposit_date = $3,
          paid_in_full = $4
      WHERE id = $5
    `, [status, deposit_amount || null, deposit_date || null, paid_in_full || false, id]);

    // 2. Fetch updated quote + client info
    const quoteRes = await pool.query(`
      SELECT q.*, c.full_name AS client_name, c.email AS client_email, c.phone AS client_phone
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE q.id = $1
    `, [id]);

    const updatedQuote = quoteRes.rows[0];

    // 3. Check for existing profit linked to this quote
    const profitCheck = await pool.query(`SELECT id FROM profits WHERE quote_id = $1`, [id]);

    if (paid_in_full) {
  const desc = `Payment from ${updatedQuote.client_name} for ${updatedQuote.event_type || "Event"} on ${updatedQuote.event_date || "TBD"}`;

  const upd = await pool.query(
    `UPDATE profits
     SET category = $1, description = $2, amount = $3, type = $4
     WHERE quote_id = $5
     RETURNING id`,
    ["Income", desc, updatedQuote.total_amount, "Gig Income", id]
  );

  if (upd.rowCount === 0) {
    await pool.query(
      `INSERT INTO profits (category, description, amount, type, quote_id)
       VALUES ($1, $2, $3, $4, $5)`,
      ["Income", desc, updatedQuote.total_amount, "Gig Income", id]
    );
  }
} else {
  await pool.query(`DELETE FROM profits WHERE quote_id = $1`, [id]);
}


    // 4. Always send update email to client
    try {
    await sendQuoteEmail(updatedQuote.client_email, updatedQuote);
    console.log(`✅ Update email sent to ${updatedQuote.client_email}`);
    } catch (err) {
    console.error('❌ Failed to send update email:', err.message);
    }

    res.json({ message: 'Quote updated successfully' });

  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// Delete a quote
app.delete('/api/quotes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM Quotes WHERE id = $1', [id]);
        res.sendStatus(204);
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Example POST route for creating a task
app.post('/tasks', async (req, res) => {
    let { text, priority, dueDate, category } = req.body;

    try {
        // ✅ Normalize date
        // Convert "" -> null
        // Keep YYYY-MM-DD exactly
        if (!dueDate || dueDate === '') {
            dueDate = null;
        } else {
            // Ensure we only store YYYY-MM-DD
            dueDate = String(dueDate).split('T')[0];
        }

        const result = await pool.query(
            `INSERT INTO tasks (text, priority, due_date, category)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [text, priority, dueDate, category]
        );

        const newTask = result.rows[0];
        console.log("✅ New Task Created:", newTask);

        res.status(201).json(newTask);
    } catch (error) {
        console.error('❌ Error adding task:', error);
        res.status(500).json({ error: 'Failed to add task' });
    }
});


const SUGGEST_USERNAME = (fullName, email) => {
  const base = (fullName || email.split('@')[0] || 'student').toLowerCase().replace(/[^a-z0-9]/g,'');
  return base.slice(0, 18); // keep short
};
const RAND = (len=6) => Math.random().toString(36).slice(2, 2+len);

// POST /admin/inquiries/:id/create-login
app.post('/admin/inquiries/:id/create-login', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) load inquiry
    const iq = await client.query(
      `SELECT id, full_name, email, phone, user_id
         FROM bartending_course_inquiries
        WHERE id = $1
        LIMIT 1`,
      [id]
    );
    if (iq.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    const { full_name, email, phone, user_id } = iq.rows[0];

    // already linked?
    if (user_id) {
      await client.query('COMMIT');
      return res.json({ ok: true, message: 'Inquiry already linked to a user', user_id });
    }

    // 2) does a user exist for this email?
    const u0 = await client.query(
      `SELECT id, username, email, role FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
      [email]
    );
    let userId, username, tempPassword;

    if (u0.rowCount > 0) {
      // link existing account
      userId = u0.rows[0].id;
      username = u0.rows[0].username;
      // ensure role is student (don’t downgrade admins/users if they already exist)
      if (u0.rows[0].role === 'student') {
        // ok
      } else {
        // leave role as-is; you can choose to force 'student' if desired
      }
    } else {
      // 3) create a new student account with a temp password
      const base = SUGGEST_USERNAME(full_name, email);
      // ensure unique username
      let candidate = base;
      for (let i = 0; i < 5; i++) {
        const chk = await client.query(`SELECT 1 FROM users WHERE username=$1`, [candidate]);
        if (chk.rowCount === 0) break;
        candidate = `${base}${Math.floor(Math.random()*1000)}`;
      }
      username = candidate;
      tempPassword = `${RAND(4)}${(phone || '').slice(-4)}!Rb`; // simple temp; change if you prefer
      const hash = await bcrypt.hash(tempPassword, 10);

      const ins = await client.query(
        `INSERT INTO users (name, username, email, phone, role, password, w9_uploaded, staff_terms_required)
         VALUES ($1,$2,$3,$4,'student',$5, FALSE, FALSE)
         RETURNING id`,
        [full_name || username, username, email, phone || null, hash]
      );
      userId = ins.rows[0].id;
    }

    // 4) link inquiry → user
    await client.query(
      `UPDATE bartending_course_inquiries SET user_id = $1 WHERE id = $2`,
      [userId, id]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: 'Login created/linked',
      user: { id: userId, username, email },
      tempPassword // present only when we created a brand-new user
    });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('create-login error:', e);
    return res.status(500).json({ error: 'Failed to create/assign login' });
  } finally {
    client.release();
  }
});

// Promotes the user (found by inquiry email) to staff and sets the W‑9 gate flags.
app.patch('/admin/students/:studentId/graduate', async (req, res) => {
  const { studentId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Load the inquiry
    const iq = await client.query(
      `SELECT id, full_name, email, dropped
         FROM bartending_course_inquiries
        WHERE id = $1
        LIMIT 1`,
      [studentId]
    );
    if (iq.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Inquiry/student not found' });
    }
    const { full_name, email } = iq.rows[0];

    // 2) Find the user by email (case-insensitive)
    const u = await client.query(
      `SELECT id, email, role, w9_uploaded, staff_terms_required
         FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [email]
    );
    if (u.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'User account not found for this inquiry email',
        hint: 'Ensure the student registered a portal account with the same email.'
      });
    }
    const user = u.rows[0];

    // 3) Promote to staff + require onboarding at next login
    const updated = await client.query(
      `UPDATE users
          SET role = 'user',
              staff_terms_required = TRUE,
              needs_staff_onboarding = TRUE,
              id_uploaded = FALSE,
              w9_uploaded = FALSE,
              ss_uploaded = FALSE
        WHERE id = $1
        RETURNING id, email, role, staff_terms_required, id_uploaded, w9_uploaded, ss_uploaded`,
      [user.id]
    );

async function markDocUploadedAndMaybeClearOnboarding(db, userId, field) {
  await db.query(`UPDATE users SET ${field} = TRUE WHERE id = $1`, [userId]);

  const chk = await db.query(
    `SELECT id_uploaded, w9_uploaded, ss_uploaded
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const r = chk.rows[0];
  if (r?.id_uploaded && r?.w9_uploaded && r?.ss_uploaded) {
    await db.query(
      `UPDATE users
       SET staff_terms_required = FALSE,
           needs_staff_onboarding = FALSE
       WHERE id = $1`,
      [userId]
    );
  }
}



    // 4) Mark the inquiry as graduated (if you add graduated_at; see migration below)
    //    If you don't want the column, you can simply set dropped = FALSE (or skip).
    await client.query(
      `UPDATE bartending_course_inquiries
          SET dropped = FALSE
          -- , graduated_at = NOW()    -- uncomment once column exists (see SQL below)
        WHERE id = $1`,
      [studentId]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: `Graduated ${full_name || email} and promoted to staff.`,
      user: updated.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('graduate error:', err);
    return res.status(500).json({ error: 'Failed to graduate student' });
  } finally {
    client.release();
  }
});


// --- API aliases (so FE can use /api/* consistently) ---
app.patch('/api/gigs/:id/claim', (req, res, next) => {
  req.url = `/gigs/${req.params.id}/claim`;
  next();
});

app.patch('/api/gigs/:id/claim-backup', (req, res, next) => {
  req.url = `/gigs/${req.params.id}/claim-backup`;
  next();
});

// ✅ ADD THESE TWO
app.patch('/api/gigs/:id/unclaim', (req, res, next) => {
  req.url = `/gigs/${req.params.id}/unclaim`;
  next();
});

app.patch('/api/gigs/:id/unclaim-backup', (req, res, next) => {
  req.url = `/gigs/${req.params.id}/unclaim-backup`;
  next();
});

app.patch('/api/gigs/:id/request-backup', (req, res, next) => {
  req.url = `/gigs/${req.params.id}/request-backup`;
  next();
});


// GET /api/gigs/open-for-backup?username=alice
app.get('/api/gigs/open-for-backup', async (req, res) => {
  const { username } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT *
        FROM gigs
       WHERE date >= NOW() - INTERVAL '1 day'
         AND backup_needed > 0
    `);
    const result = rows.filter(r => {
      const claimed = Array.isArray(r.backup_claimed_by) ? r.backup_claimed_by : [];
      return !username || !claimed.includes(username);
    });
    res.json(result);
  } catch (e) {
    console.error('open-for-backup error', e);
    res.status(500).json({ error: 'Failed to load open gigs' });
  }
});

// PATCH /gigs/:id/request-backup  { username }
app.patch('/gigs/:id/request-backup', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const { rows } = await pool.query(
      `SELECT backup_pending_by, backup_claimed_by, backup_needed
         FROM gigs WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Gig not found' });

    const gig = rows[0];
    const pending = Array.isArray(gig.backup_pending_by) ? gig.backup_pending_by : [];
    const claimed  = Array.isArray(gig.backup_claimed_by) ? gig.backup_claimed_by : [];
    const needed   = gig.backup_needed ?? 0;

    if (claimed.includes(username))  return res.status(400).json({ error: 'Already claimed' });
    if (pending.includes(username))  return res.status(400).json({ error: 'Already requested' });
    if (needed > 0 && claimed.length >= needed)
      return res.status(400).json({ error: 'Max backups already filled' });

    await pool.query(
      `UPDATE gigs
          SET backup_pending_by = array_append(backup_pending_by, $1)
        WHERE id = $2`,
      [username, id]
    );
    res.json({ message: 'Backup request submitted. Waiting for admin approval.' });
  } catch (e) {
    console.error('request-backup error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /admin/gigs/:id/approve-backup  { username, approve: true|false }
app.patch('/admin/gigs/:id/approve-backup', async (req, res) => {
  const { id } = req.params;
  const { username, approve } = req.body;
  try {
    const { rows } = await pool.query(
      `SELECT backup_pending_by, backup_claimed_by, backup_needed
         FROM gigs WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Gig not found' });

    const gig = rows[0];
    const pending = Array.isArray(gig.backup_pending_by) ? gig.backup_pending_by : [];
    const claimed  = Array.isArray(gig.backup_claimed_by) ? gig.backup_claimed_by : [];
    const needed   = gig.backup_needed ?? 0;

    if (!pending.includes(username)) {
      return res.status(400).json({ error: 'This user is not pending for this gig' });
    }

    if (approve) {
      if (needed > 0 && claimed.length >= needed) {
        return res.status(400).json({ error: 'Max backups already filled' });
      }
      await pool.query(`
        UPDATE gigs
           SET backup_pending_by = array_remove(backup_pending_by, $1),
               backup_claimed_by = array_append(backup_claimed_by, $1)
         WHERE id = $2
      `, [username, id]);
      res.json({ message: `${username} approved as backup.` });
    } else {
      await pool.query(`
        UPDATE gigs
           SET backup_pending_by = array_remove(backup_pending_by, $1)
         WHERE id = $2
      `, [username, id]);
      res.json({ message: `${username}'s request was rejected.` });
    }
  } catch (e) {
    console.error('approve-backup error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create announcement
app.post('/api/announcements', async (req, res) => {
  const { title, message } = req.body;
  try {
    await pool.query('INSERT INTO announcements (title, message) VALUES ($1, $2)', [title, message]);
    res.status(201).send("Announcement added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating announcement");
  }
});

// Fetch recent announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching announcements");
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
  res.sendStatus(204);
});

// PUT /api/announcements/:id
app.put('/api/announcements/:id', async (req, res) => {
  const { id } = req.params;
  const { title, message, tag } = req.body;

  try {
    await pool.query(
      'UPDATE announcements SET title = $1, message = $2, tag = $3 WHERE id = $4',
      [title, message, tag, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update announcement");
  }
});

/*async function notifyNewTask(task) {
    console.log("🔍 Full Task Object:", task); // Debugging - Ensure task data is correct

    try {
        if (!task || !task.category || !task.due_date) {
            console.error("❌ Missing task fields:", task);
            return;
        }

        const user = users[task.category]; // Get the assigned user

        if (user) {
            // Convert `due_date` from UTC to `America/New_York`
            const formattedDueDate = moment.utc(task.due_date).tz('America/New_York').format('YYYY-MM-DD hh:mm A');

            // Pass correct task values to sendTaskTextMessage
            await sendTaskTextMessage({ 
                phone: user.phone, 
                carrier: user.carrier, 
                task: task.text, 
                due_date: formattedDueDate
            });

            console.log(`📩 New task notification sent to ${task.category} for task: ${task.text}`);
        } else {
            console.log(`⚠️ No user found for category: ${task.category}`);
        }
    } catch (error) {
        console.error('❌ Error sending new task notification:', error);
    }
}

// Function to check for upcoming tasks and send reminders
async function checkAndSendTaskReminders() {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const formattedTomorrow = tomorrow.toISOString().split('T')[0];

        // Query tasks that are due today, tomorrow, OR overdue but not completed
        const tasksResult = await pool.query(
            `SELECT * FROM tasks 
             WHERE (due_date <= $1 OR due_date = $2) 
             AND completed = false`,
            [today, formattedTomorrow]
        );       

        for (const task of tasksResult.rows) {
            const user = users[task.category];

            if (user) {
                // Convert `due_date` to local time and format properly
                const formattedDueDate = moment.utc(task.due_date).tz('America/New_York').format('YYYY-MM-DD hh:mm A');

                // Customize message for overdue tasks
                const isOverdue = new Date(task.due_date) < now;
                const message = isOverdue
                    ? `⏳ Overdue Task Reminder: "${task.text}" was due on ${formattedDueDate}. Please complete it as soon as possible!`
                    : `🔔 Task Reminder: "${task.text}" is due on ${formattedDueDate}.`;

                await sendTextMessage({ phone: user.phone, carrier: user.carrier, message });

                console.log(`Reminder sent to ${task.category} for task: ${task.text} (Due: ${formattedDueDate})`);
            }
        }
    } catch (error) {
        console.error('Error sending task reminders:', error);
    }
}


Schedule the function to run every day at 8 AM
cron.schedule('0 9 * * *', () => {
    console.log('Checking and sending task reminders...');
    checkAndSendTaskReminders();
}, {
    timezone: "America/New_York"
});*/

// // PATCH endpoint to update task completion status
app.patch('/tasks/:id', async (req, res) => {
    const { id } = req.params;  // Extract the task ID from the URL
    const { completed } = req.body;  // Get the completed status from the request body

    try {
        // Update the task's completion status
        const query = 'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *';
        const values = [completed, id];
        const result = await pool.query(query, values);  // Execute the query

        if (result.rowCount === 0) {
            // Task not found
            return res.status(404).json({ error: 'Task not found' });
        }

        // Return the updated task
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task:', error.message);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM tasks`);
const tasks = result.rows.map(task => ({
    ...task,
    due_date: task.due_date 
        ? new Date(task.due_date).toLocaleDateString("en-US", { timeZone: "America/New_York" }) 
        : null
}));

console.log("📅 Sending Adjusted Tasks:", tasks);
res.json(tasks);

    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// PUT endpoint to update task completion
app.put('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;  // Status of task completion (true/false)

    try {
        const query = 'UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *';
        const values = [completed, id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const updatedTask = result.rows[0];
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error.message);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE endpoint to delete a task
app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;  // Get the task ID from the request parameters
    console.log('Attempting to delete task with ID:', id);  // Log the ID for debugging

    try {
        // Query to delete the task
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            // If no rows were deleted, return 404
            return res.status(404).json({ error: 'Task not found' });
        }

        // Return a success message
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// -----------------------------
// INVENTORY (with type_key)
// -----------------------------

// Fetch all inventory
app.get('/inventory', async (req, res) => {
  try {
    // keep returning everything; frontend can filter
    const result = await pool.query('SELECT * FROM inventory ORDER BY item_name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
  }
});

// Add inventory item (supports type_key)
app.post('/inventory', async (req, res) => {
  const { item_name, category, quantity, barcode, type_key } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO inventory (item_name, category, quantity, barcode, type_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [item_name, category, quantity, barcode, type_key || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item', details: error.message });
  }
});

// PATCH by barcode (scanner add/use) — supports existing behavior
app.patch('/inventory/:barcode', async (req, res) => {
  const { barcode } = req.params;
  let { quantity, action } = req.body;

  try {
    const qty = Math.max(1, parseInt(quantity, 10) || 0);
    const isAdd = action === 'add';
    const isUse = action === 'use' || action === 'remove';

    if (!isAdd && !isUse) {
      return res.status(400).json({ error: 'Invalid action. Use "add" or "use"/"remove".' });
    }

    if (isAdd) {
      const result = await pool.query(
        `UPDATE inventory
           SET quantity = quantity + $1
         WHERE barcode = $2
         RETURNING *`,
        [qty, barcode]
      );

      if (result.rowCount > 0) return res.json(result.rows[0]);

      // Optional: auto-insert if not found
      const newItem = await pool.query(
        `INSERT INTO inventory (item_name, category, quantity, barcode, type_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        ['Unknown Item', 'Uncategorized', qty, barcode, null]
      );
      return res.status(201).json(newItem.rows[0]);
    }

    if (isUse) {
      const result = await pool.query(
        `UPDATE inventory
           SET quantity = GREATEST(0, quantity - $1)
         WHERE barcode = $2
         RETURNING *`,
        [qty, barcode]
      );

      if (result.rowCount > 0) return res.json(result.rows[0]);
      return res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Failed to update inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory', details: error.message });
  }
});

// Edit inventory item (supports type_key)
app.put('/inventory/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const { item_name, category, quantity, new_barcode, type_key } = req.body;

  try {
    await pool.query(
      `UPDATE inventory
          SET item_name = $1,
              category = $2,
              quantity = $3,
              barcode = $4,
              type_key = $5
        WHERE barcode = $6`,
      [item_name, category, quantity, new_barcode || barcode, type_key || null, barcode]
    );

    const updatedItem = await pool.query(`SELECT * FROM inventory WHERE barcode = $1`, [new_barcode || barcode]);
    res.json(updatedItem.rows[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).send('Server Error');
  }
});

// Delete inventory item
app.delete('/inventory/:barcode', (req, res) => {
  const { barcode } = req.params;

  pool.query('DELETE FROM inventory WHERE barcode = $1', [barcode])
    .then(() => res.status(200).send({ message: 'Item deleted successfully' }))
    .catch((error) => res.status(500).send({ error: 'Failed to delete item' }));
});

// ✅ Bulk adjust inventory — this is what PackageChecklist uses
// POST /inventory/bulk-adjust
// body: { items: [{ type_key, quantity, action: "use"|"add", barcode? }] }
app.post('/inventory/bulk-adjust', async (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items[] is required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = [];

    for (const raw of items) {
      const action = String(raw?.action || 'use').toLowerCase();
      const qty = Math.max(0, parseInt(raw?.quantity, 10) || 0);
      const barcode = raw?.barcode ? String(raw.barcode) : null;
      const typeKey = raw?.type_key ? String(raw.type_key) : null;

      if (!qty) continue;
      if (action !== 'use' && action !== 'add' && action !== 'remove') {
        throw new Error(`Invalid action: ${action}`);
      }

      const isAdd = action === 'add';
      const isUse = action === 'use' || action === 'remove';

      // 1) If barcode provided, adjust that single row
      if (barcode) {
        const q = isAdd
          ? `UPDATE inventory SET quantity = quantity + $1 WHERE barcode = $2 RETURNING *`
          : `UPDATE inventory SET quantity = GREATEST(0, quantity - $1) WHERE barcode = $2 RETURNING *`;

        const updated = await client.query(q, [qty, barcode]);

        if (updated.rowCount === 0) {
          results.push({ ok: false, barcode, type_key: typeKey, message: 'Barcode not found' });
        } else {
          results.push({ ok: true, barcode, type_key: updated.rows[0].type_key, updated: updated.rows[0] });
        }
        continue;
      }

      // 2) Otherwise: require type_key for checklist usage
      if (!typeKey) {
        results.push({ ok: false, barcode: null, type_key: null, message: 'Missing type_key (or barcode)' });
        continue;
      }

      // 2a) ADD by type_key: add to the largest row (or create one)
      if (isAdd) {
        const pick = await client.query(
          `SELECT * FROM inventory
            WHERE type_key = $1
            ORDER BY quantity DESC, item_name ASC
            LIMIT 1`,
          [typeKey]
        );

        if (pick.rowCount === 0) {
          // create a generic placeholder row if none exist
          const created = await client.query(
            `INSERT INTO inventory (item_name, category, quantity, barcode, type_key)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [`${typeKey} (auto)`, 'Liquor', qty, crypto.randomUUID(), typeKey]
          );

          results.push({ ok: true, type_key: typeKey, updated: created.rows[0], note: 'Created new row for type_key' });
        } else {
          const row = pick.rows[0];
          const updated = await client.query(
            `UPDATE inventory SET quantity = quantity + $1 WHERE barcode = $2 RETURNING *`,
            [qty, row.barcode]
          );

          results.push({ ok: true, type_key: typeKey, updated: updated.rows[0] });
        }

        continue;
      }

      // 2b) USE by type_key: subtract across rows for that type_key (largest-first)
      if (isUse) {
        let remaining = qty;

        const rows = await client.query(
          `SELECT * FROM inventory
            WHERE type_key = $1
            ORDER BY quantity DESC, item_name ASC`,
          [typeKey]
        );

        if (rows.rowCount === 0) {
          results.push({ ok: false, type_key: typeKey, message: 'No rows found for type_key' });
          continue;
        }

        const touched = [];

        for (const row of rows.rows) {
          if (remaining <= 0) break;

          const available = Math.max(0, parseInt(row.quantity, 10) || 0);
          if (available <= 0) continue;

          const take = Math.min(available, remaining);
          remaining -= take;

          const upd = await client.query(
            `UPDATE inventory
               SET quantity = GREATEST(0, quantity - $1)
             WHERE barcode = $2
             RETURNING *`,
            [take, row.barcode]
          );

          if (upd.rowCount > 0) touched.push(upd.rows[0]);
        }

        results.push({
          ok: true,
          type_key: typeKey,
          requested: qty,
          deducted: qty - remaining,
          remaining_unfulfilled: remaining,
          updated_rows: touched
        });

        continue;
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, results });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ bulk-adjust error:', err);
    res.status(500).json({ error: err.message || 'Bulk adjust failed' });
  } finally {
    client.release();
  }
});


// Save blocked times to the database
app.post("/api/schedule/block", async (req, res) => {
    try {
        const { blockedTimes } = req.body;

        if (!Array.isArray(blockedTimes) || blockedTimes.length === 0) {
            return res.status(400).json({ success: false, error: "Invalid blockedTimes format" });
        }

        await pool.query("BEGIN");

        // ✅ Delete only the affected time slots for the given date
        const existingTimeSlots = blockedTimes.map(bt => bt.timeSlot);
        if (existingTimeSlots.length > 0) {
            await pool.query(`DELETE FROM schedule_blocks WHERE time_slot = ANY($1) AND date = $2`, [existingTimeSlots, blockedTimes[0].date]);
        }

        // ✅ Insert new blocked times with date
        const query = `
        INSERT INTO schedule_blocks (time_slot, label, date) 
        VALUES ($1, $2, $3) 
        ON CONFLICT ON CONSTRAINT unique_block_time 
        DO UPDATE SET label = EXCLUDED.label
        `;

    
    for (const entry of blockedTimes) {
        if (!entry.timeSlot || !entry.label || !entry.date) continue; // Skip invalid entries
    
        // ✅ Convert `HH:MM:SS` to `YYYY-MM-DD-HH`
        let formattedTimeSlot = entry.timeSlot.trim();
        
        if (formattedTimeSlot.match(/^\d{2}:\d{2}:\d{2}$/)) {
            formattedTimeSlot = `${entry.date}-${formattedTimeSlot.split(":")[0]}`;
        }
    
        await pool.query(query, [formattedTimeSlot, entry.label, entry.date]);
    }
    

        await pool.query("COMMIT");
        res.json({ success: true, blockedTimes });
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error("❌ Error saving blocked times:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fetch blocked times from the database
app.get('/api/schedule/block', async (req, res) => {
    try {
        const { date } = req.query;
        let result;

        if (date) {
            result = await pool.query(
                `SELECT time_slot, label, date FROM schedule_blocks WHERE date = $1 ORDER BY time_slot`, [date]
            );
        } else {
            result = await pool.query(
                `SELECT time_slot, label, date FROM schedule_blocks ORDER BY date, time_slot`
            );
        }

        const blockedTimes = result.rows.map(row => ({
            timeSlot: row.time_slot.trim(),
            label: row.label ? row.label.trim() : "Blocked",
            date: row.date
        }));

        return res.json({ blockedTimes });

    } catch (error) {
        console.error("❌ Error fetching blocked times:", error);
        return res.status(500).json({ error: "Failed to fetch blocked times." });
    }
});

app.delete('/api/schedule/block', async (req, res) => {
    try {
        const { timeSlot, date } = req.body;

        if (!timeSlot || !date) {
            return res.status(400).json({ error: "Both timeSlot and date are required for deletion." });
        }

        const result = await pool.query(
            `DELETE FROM schedule_blocks WHERE time_slot = $1 AND date = $2 RETURNING *`,
            [timeSlot, date]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Blocked time not found." });
        }

        res.json({ success: true });

    } catch (error) {
        console.error("❌ Error deleting blocked time:", error);
        res.status(500).json({ error: "Failed to delete blocked time." });
    }
});


// ✅ Intake Form Submission Route (FULL — paste as-is)

app.post('/api/intake-form', async (req, res) => {
  const {
    fullName,
    email,
    phone,
    date,
    time,
    entityType,
    businessName,
    firstTimeBooking,
    eventType,
    ageRange,
    eventName,
    eventLocation,
    genderMatters,
    preferredGender,
    openBar,
    locationFeatures,
    staffAttire,
    eventDuration,
    onSiteParking,
    localParking,
    additionalPrepTime,
    ndaRequired,
    foodCatering,
    guestCount,
    homeOrVenue,
    venueName,
    bartendingLicenseRequired,
    insuranceRequired,
    liquorLicenseRequired,
    indoorsEvent,
    budget,
    addons,
    howHeard,
    referral,
    referralDetails,
    additionalComments,
    service, // optional

    // ✅ NEW: SMS opt-in from IntakeForm checkbox
    smsOptIn,
  } = req.body || {};

  // ✅ Basic required validation (prevents empty inserts + clear 400)
  const requiredMissing = [];
  if (!String(fullName || '').trim()) requiredMissing.push('fullName');
  if (!String(email || '').trim()) requiredMissing.push('email');
  if (!String(phone || '').trim()) requiredMissing.push('phone');
  if (!String(date || '').trim()) requiredMissing.push('date');
  if (!String(time || '').trim()) requiredMissing.push('time');
  if (!String(eventType || '').trim()) requiredMissing.push('eventType');
  if (!String(budget || '').trim()) requiredMissing.push('budget');
  if (!String(guestCount || '').trim()) requiredMissing.push('guestCount');
  if (!String(additionalComments || '').trim()) requiredMissing.push('additionalComments');

  if (requiredMissing.length) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing: requiredMissing,
    });
  }

  // ✅ Detect Event Staffing from service OR eventType
  const serviceLower = String(service || '').toLowerCase();
  const eventTypeLower = String(eventType || '').toLowerCase();
  const isEventStaffing =
    serviceLower.includes('event staffing') ||
    eventTypeLower.includes('event staffing');

  // ✅ Normalize addons into TEXT[] for your DB column (TEXT[])
  const normalizeAddonsToTextArray = (raw) => {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      // objects
      if (raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null) {
        return raw
          .filter(a => a)
          .map(a => {
            const name = String(
              a.name || a.key || a.label || a.title || a.itemName || ''
            ).trim();
            if (!name) return null;
            const qty = Math.max(1, parseInt(a.qty, 10) || 1);
            return `${name} x${qty}`;
          })
          .filter(Boolean);
      }

      // strings
      return raw
        .filter(Boolean)
        .map(x => String(x).trim());
    }

    return [String(raw).trim()];
  };

  const addonsTextArray = normalizeAddonsToTextArray(addons);

  // ✅ Server-side validation: Event Staffing requires at least one staff selection
  const staffRegex = /(bartender|server|bar\s*back|barback|help\s*staff|support\s*staff)/i;

  if (isEventStaffing) {
    const hasStaff = addonsTextArray.some(a => staffRegex.test(a));
    if (!hasStaff) {
      return res.status(400).json({
        error: "Event Staffing requires at least one staff selection (Bartender/Server/BarBack/Help Staff) with a quantity.",
        receivedAddons: addonsTextArray,
      });
    }
  }

  try {
    await pool.query("BEGIN");

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const optedIn = !!smsOptIn; // ✅ boolean

    // ✅ Insert Client if not exists
    // NOTE: email is unique, so ON CONFLICT works
    const clientInsertQuery = `
      INSERT INTO clients (full_name, email, phone)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING;
    `;
    await pool.query(clientInsertQuery, [String(fullName).trim(), cleanEmail, cleanPhone]);

    // ✅ Save SMS consent on client (matches your schema)
    // - sms_opt_in boolean
    // - sms_opt_in_at timestamptz
    // - sms_opt_out_at timestamptz
    // - sms_opt_source varchar(50)
    // - sms_opt_updated_at timestamp (no tz)
    await pool.query(
      `
      UPDATE clients
      SET
        sms_opt_in        = $3,
        sms_opt_in_at     = CASE WHEN $3 THEN NOW() ELSE sms_opt_in_at END,
        sms_opt_out_at    = CASE WHEN NOT $3 THEN NOW() ELSE sms_opt_out_at END,
        sms_opt_source    = 'intake-form',
        sms_opt_updated_at = NOW()
      WHERE LOWER(email) = $1 OR phone = $2;
      `,
      [cleanEmail, cleanPhone, optedIn]
    );

    // ✅ Insert Intake Form Data
    const locationFeaturesArray = Array.isArray(locationFeatures)
      ? locationFeatures.map(x => String(x).trim()).filter(Boolean)
      : [];

    const intakeFormQuery = `
      INSERT INTO intake_forms 
      (full_name, email, phone, event_date, event_time, entity_type, business_name, first_time_booking, event_type, age_range, event_name, 
       event_location, gender_matters, preferred_gender, open_bar, location_facilities, staff_attire, event_duration, on_site_parking, 
       local_parking, additional_prep, nda_required, food_catering, guest_count, home_or_venue, venue_name, bartending_license, 
       insurance_required, liquor_license, indoors, budget, addons, how_heard, referral, additional_details, additional_comments) 
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
       $12, $13, $14, $15, $16::TEXT[], $17, $18, $19,
       $20, $21, $22, $23, $24, $25, $26, $27,
       $28, $29, $30, $31, $32::TEXT[], $33, $34, $35, $36);
    `;

    await pool.query(intakeFormQuery, [
      String(fullName).trim(),
      cleanEmail,
      cleanPhone,
      String(date).trim(),
      String(time).trim(),
      String(entityType || '').trim() || null,
      String(businessName || '').trim() || null,
      String(firstTimeBooking || '').trim() || null,
      String(eventType).trim(),
      String(ageRange || '').trim() || null,
      String(eventName || '').trim() || null,
      String(eventLocation || '').trim() || null,
      String(genderMatters || '').trim() || null,
      String(preferredGender || '').trim() || null,
      String(openBar || '').trim() || null,
      locationFeaturesArray,
      String(staffAttire || '').trim() || null,
      String(eventDuration || '').trim() || null,
      String(onSiteParking || '').trim() || null,
      String(localParking || '').trim() || null,
      additionalPrepTime === true || additionalPrepTime === false ? additionalPrepTime : null,
      ndaRequired === true || ndaRequired === false ? ndaRequired : null,
      foodCatering === true || foodCatering === false ? foodCatering : null,
      String(guestCount).trim(),
      String(homeOrVenue || '').trim() || null,
      String(venueName || '').trim() || null,
      bartendingLicenseRequired === true || bartendingLicenseRequired === false ? bartendingLicenseRequired : null,
      insuranceRequired === true || insuranceRequired === false ? insuranceRequired : null,
      liquorLicenseRequired === true || liquorLicenseRequired === false ? liquorLicenseRequired : null,
      indoorsEvent === true || indoorsEvent === false ? indoorsEvent : null,
      String(budget).trim(),
      addonsTextArray,
      String(howHeard || '').trim() || null,
      String(referral || '').trim() || null,
      String(referralDetails || '').trim() || null,
      String(additionalComments).trim(),
    ]);

    await pool.query("COMMIT");

    // ✅ Send email (non-blocking)
    Promise.resolve()
      .then(() =>
        sendIntakeFormEmail({
          fullName,
          email,
          phone,
          date,
          time,
          entityType,
          businessName,
          firstTimeBooking,
          eventType,
          ageRange,
          eventName,
          eventLocation,
          genderMatters,
          preferredGender,
          openBar,
          locationFeatures: locationFeaturesArray,
          staffAttire,
          eventDuration,
          onSiteParking,
          localParking,
          additionalPrepTime,
          ndaRequired,
          foodCatering,
          guestCount,
          homeOrVenue,
          venueName,
          bartendingLicenseRequired,
          insuranceRequired,
          liquorLicenseRequired,
          indoorsEvent,
          budget,
          addons: addonsTextArray,
          howHeard,
          referral,
          referralDetails,
          additionalComments,
          service,
          smsOptIn: optedIn,
        })
      )
      .then(() => console.log("✅ Intake form email sent."))
      .catch((emailError) => console.error("❌ Error sending intake form email:", emailError?.message || emailError));

    return res.status(201).json({ message: 'Form submitted successfully!' });
  } catch (error) {
    try { await pool.query("ROLLBACK"); } catch (e) {}

    console.error('❌ Error saving form submission:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error?.message || String(error),
    });
  }
});

// Route to handle Craft Cocktails form submission
app.post('/api/craft-cocktails', async (req, res) => {
    const {
      fullName,
      email,
      phone,
      eventType,
      guestCount,
      addons = [],
      howHeard,
      referral,
      referralDetails,
      additionalComments,
      guestDetails = [],
      apronTexts = [],
      locationPreference,
      eventAddress,
      paymentPlan
    } = req.body;

    const finalAdditionalComments = [
      additionalComments,
      locationPreference
        ? `Location Preference: ${locationPreference === 'home' ? 'Home (Ready Bar Location)' : 'Client Location'}`
        : null,
      (locationPreference === 'home')
        ? `Address: 1030 NW 200th Terrace, Miami, FL 33169`
        : (eventAddress ? `Address: ${eventAddress}` : null),
      paymentPlan ? `Payment Plan: Yes` : null
    ].filter(Boolean).join('\n');

    if (!fullName || !email || !phone || !guestCount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING;
    `;

    const craftCocktailsInsertQuery = `
        INSERT INTO craft_cocktails (
            full_name, email, phone, event_type, guest_count, addons, how_heard, referral, referral_details, additional_comments, apron_texts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
    `;

    try {
        // Insert main client
        await pool.query(clientInsertQuery, [fullName, email, phone]);

        // Insert each guest if named
        for (const guest of guestDetails) {
            const { fullName: gName, email: gEmail, phone: gPhone } = guest;
            if (gName) {
                await pool.query(
                    `INSERT INTO clients (full_name, email, phone)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (email) DO NOTHING;`,
                    [gName, gEmail || null, gPhone || null]
                );
            }
        }

        // Insert form data
        const result = await pool.query(craftCocktailsInsertQuery, [
            fullName,
            email,
            phone,
            eventType || "Crafts & Cocktails (2 hours, @ $85.00)",
            guestCount,
            addons.map(a => a.name),
            howHeard,
            referral || null,
            referralDetails || null,
            finalAdditionalComments || null,
            apronTexts
        ]);

        // Send notification email
        try {
            await sendCraftsFormEmail({
                fullName,
                email,
                phone,
                eventType,
                guestCount,
                addons,
                howHeard,
                referral,
                referralDetails,
                additionalComments: finalAdditionalComments,
                apronTexts
            });
            console.log('📧 Email sent successfully!');
        } catch (emailError) {
            console.error('❌ Error sending email notification:', emailError);
        }

        res.status(201).json({
            message: 'Craft Cocktails form submitted successfully!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error saving Craft Cocktails form:', error);
        res.status(500).json({
            error: 'An error occurred while saving the form. Please try again.'
        });
    }
});

// Route to handle Mix N' Sip form submission
app.post('/api/mix-n-sip', async (req, res) => {
  const {
    fullName,
    email,
    phone,
    eventType,
    guestCount,
    addons = [],
    howHeard,
    referral,
    referralDetails,
    additionalComments,
    guestDetails = [],
    apronTexts = [],
    sessionMode = 'in_person',
    locationPreference,
    eventAddress,
    paymentPlan
  } = req.body;

  const finalAdditionalComments = [
    additionalComments,
    locationPreference
      ? `Location Preference: ${locationPreference === 'home' ? 'Home (Ready Bar Location)' : 'Client Location'}`
      : null,
    (locationPreference === 'home')
      ? `Address: 1030 NW 200th Terrace, Miami, FL 33169`
      : (eventAddress ? `Address: ${eventAddress}` : null),
    paymentPlan ? `Payment Plan: Yes` : null
  ].filter(Boolean).join('\n');

  // Normalize incoming addons to array of names (strings)
  const toName = (a) => (typeof a === 'string' ? a : a?.name)?.trim();
  let addonNames = (addons || []).map(toName).filter(Boolean);

  // ✅ If virtual, only allow these two add-ons
  const VIRTUAL_ALLOWED = new Set(['Bar Tools', 'Purchase Materials']);
  if (sessionMode === 'virtual') {
    addonNames = addonNames.filter(a => VIRTUAL_ALLOWED.has(a));
  }

  // ✅ If virtual, we also clear apron text input (since aprons aren’t offered)
  const finalApronTexts = sessionMode === 'virtual' ? [] : (apronTexts || []);

  const clientInsertQuery = `
    INSERT INTO clients (full_name, email, phone)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO NOTHING;
  `;

  const mixNsipInsertQuery = `
    INSERT INTO mix_n_sip (
      full_name, email, phone, event_type, guest_count, addons, how_heard, referral,
      referral_details, additional_comments, apron_texts, session_mode
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  try {
    // Save/ensure client row
    await pool.query(clientInsertQuery, [fullName, email, phone]);

    // Save guest contacts if provided
    for (const guest of guestDetails) {
      const { fullName: gName, email: gEmail, phone: gPhone } = guest || {};
      if (gName) {
        await pool.query(
          `INSERT INTO clients (full_name, email, phone)
           VALUES ($1, $2, $3)
           ON CONFLICT (email) DO NOTHING;`,
          [gName, gEmail || null, gPhone || null]
        );
      }
    }

    // Insert Mix N’ Sip submission
    const result = await pool.query(mixNsipInsertQuery, [
      fullName,
      email,
      phone,
      eventType || "Mix N' Sip (2 hours, @ $75.00)",
      guestCount,
      addonNames,                 // text[]
      howHeard,
      referral || null,
      referralDetails || null,
      finalAdditionalComments || null, // ✅ FIXED
      finalApronTexts,            // text[]
      sessionMode,
    ]);

    // Send notification email
    try {
      await sendMixNSipFormEmail({
        fullName,
        email,
        phone,
        eventType,
        guestCount,
        addons: addonNames.map(n => ({ name: n })),
        howHeard,
        referral,
        referralDetails,
        additionalComments: finalAdditionalComments, // ✅ FIXED
        apronTexts: finalApronTexts,
        sessionMode,
        paymentPlan: !!paymentPlan,
        locationPreference,
        eventAddress,
      });
      console.log('Email sent successfully!');
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    res.status(201).json({
      message: 'Mix N Sip form submitted successfully!',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error saving Mix N Sip form:', error);
    res.status(500).json({ error: 'An error occurred while saving the form. Please try again.' });
  }
});

app.post('/api/bartending-course', async (req, res) => {
    const {
        fullName,
        email,
        phone,
        isAdult,
        experience,
        setSchedule,
        preferredTime,
        paymentPlan,
        referral,
        referralDetails,
        addons = []
        } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING;
    `;

    const checkQuery = `
        SELECT 1 FROM bartending_course_inquiries WHERE email = $1
    `;
    const existing = await pool.query(checkQuery, [email]);

    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'You have already submitted this form.' });
    }

    const bartendingCourseInsertQuery = `
        INSERT INTO bartending_course_inquiries (
            full_name, email, phone, is_adult, experience, set_schedule, preferred_time,
            referral, referral_details, payment_plan, addons
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
    `;

    const values = [
        fullName,
        email,
        phone,
        isAdult,
        experience,
        setSchedule,
        preferredTime,
        referral,
        referralDetails || null,
        paymentPlan,
        JSON.stringify(addons)
    ];

    try {
        await pool.query(clientInsertQuery, [fullName, email, phone]);

        const result = await pool.query(bartendingCourseInsertQuery, values);

        await sendBartendingInquiryEmail({
            fullName,
            email,
            phone,
            isAdult,
            experience,
            setSchedule,
            preferredTime,
            referral,
            referralDetails,
            paymentPlan,
            addons
        });

        res.status(201).json({
            message: 'Bartending course inquiry submitted successfully!',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('❌ Error saving Bartending Course inquiry:', error);
        res.status(500).json({ error: 'An error occurred while saving the inquiry.' });
    }
});

app.post('/api/bartending-classes', async (req, res) => {
    const {
        fullName,
        email,
        phone,
        isAdult,
        experience,
        classCount,
        referral,
        referralDetails
    } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING;
    `;

    const bartendingClassesInsertQuery = `
        INSERT INTO bartending_classes_inquiries (
            full_name, email, phone, is_adult, experience, class_count, referral, referral_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;

    try {
        await pool.query(clientInsertQuery, [fullName, email, phone]);
        const result = await pool.query(bartendingClassesInsertQuery, [
            fullName,
            email,
            phone,
            isAdult,
            experience,
            classCount,
            referral,
            referralDetails || null,
        ]);

        await sendBartendingClassesEmail({
            fullName,
            email,
            phone,
            isAdult,
            experience,
            classCount,
            referral,
            referralDetails,
        });

        res.status(201).json({
            message: 'Bartending Classes inquiry submitted successfully!',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error saving Bartending Classes inquiry:', error);
        res.status(500).json({ error: 'An error occurred while saving the inquiry.' });
    }
});

app.post('/api/clients', async (req, res) => {
    const { full_name, email, phone } = req.body; // Destructure the incoming data

    // Validate input data
    if (!full_name) {
        return res.status(400).json({ error: 'Full name is required' });
    }

    try {
        // Insert the new client into the database
        const result = await pool.query(
            'INSERT INTO clients (full_name, email, phone) VALUES ($1, $2, $3) RETURNING *',
            [full_name, email || null, phone || null] // Default email and phone to NULL if not provided
        );

        res.status(201).json(result.rows[0]); // Respond with the created client
    } catch (error) {
        console.error('Error adding client:', error);
        res.status(500).json({ error: 'Failed to add client' });
    }
});

app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name, email, phone FROM clients ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

app.patch('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    let updateQuery = "UPDATE clients SET ";
    const values = [];
    let counter = 1;

    for (const key in updates) {
        updateQuery += `${key} = $${counter}, `;
        values.push(updates[key]);
        counter++;
    }

    updateQuery = updateQuery.slice(0, -2); // Remove trailing comma
    updateQuery += ` WHERE id = $${counter} RETURNING *`;
    values.push(id);

    try {
        const result = await pool.query(updateQuery, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Get client history (gigs, quotes, payments)
app.get('/api/client-history/:clientId', async (req, res) => {
    const { clientId } = req.params;

    try {
        // Log the clientId to ensure it's being passed correctly
        console.log("Fetching history for clientId:", clientId);

        const gigsResult = await pool.query(
            'SELECT * FROM gigs WHERE client = $1 ORDER BY date DESC',
            [clientId]
        );
        const quotesResult = await pool.query(
            'SELECT * FROM quotes WHERE client_id = $1 ORDER BY date DESC',
            [clientId]
        );
        const paymentsResult = await pool.query(
            `
            SELECT p.* 
            FROM payments p
            JOIN clients c ON c.email = p.email
            WHERE c.id = $1
            ORDER BY p.created_at DESC
            `,
            [clientId]
        );
        
        // Fetch appointments from the appointments table
        const appointmentsResult = await pool.query(
            'SELECT * FROM appointments WHERE client_id = $1 ORDER BY date DESC',
            [clientId]
        );

        const clientResult = await pool.query(
            'SELECT full_name, email FROM clients WHERE id = $1',
            [clientId]
        );

        const client = clientResult.rows[0] || {};  // Default to empty object if no client found

        // Return response with all the data
        res.status(200).json({
            client,
            gigs: gigsResult.rows,
            quotes: quotesResult.rows,
            payments: paymentsResult.rows,
            appointments: appointmentsResult.rows,  // Include appointments in the response
        });
    } catch (error) {
        // Log the error for debugging
        console.error('Error fetching client history:', error);
        
        // Send a detailed error message in the response
        res.status(500).json({
            error: 'Failed to fetch client history',
            details: error.message || error,
        });
    }
});

app.get('/api/clients/sms-consent', async (req, res) => {
  const { email, phone } = req.query;

  if (!email && !phone) {
    return res.status(400).json({ error: 'email or phone is required' });
  }

  try {
    const q = email
      ? `SELECT id, sms_opt_in, sms_opt_in_at, sms_opt_out_at FROM clients WHERE email = $1 LIMIT 1`
      : `SELECT id, sms_opt_in, sms_opt_in_at, sms_opt_out_at FROM clients WHERE phone = $1 ORDER BY id DESC LIMIT 1`;

    const v = email ? [String(email).trim().toLowerCase()] : [String(phone).trim()];

    const result = await pool.query(q, v);

    if (!result.rows.length) {
      return res.json({ found: false, smsOptIn: false });
    }

    return res.json({
      found: true,
      smsOptIn: !!result.rows[0].sms_opt_in,
      smsOptInAt: result.rows[0].sms_opt_in_at,
      smsOptOutAt: result.rows[0].sms_opt_out_at
    });
  } catch (err) {
    console.error('sms-consent status error:', err);
    res.status(500).json({ error: 'Failed to fetch sms consent status' });
  }
});  

// ==================================
// SMS CONSENT (single source of truth)
// ==================================

// GET /api/clients/sms-consent?email=... OR ?phone=...
app.get("/api/clients/sms-consent", async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  const phone = String(req.query.phone || "").trim();

  if (!email && !phone) {
    return res.status(400).json({ error: "Email or phone is required" });
  }

  try {
    const q = `
      SELECT
        id,
        email,
        phone,
        sms_opt_in_at  AS "smsOptInAt",
        sms_opt_out_at AS "smsOptOutAt",
        sms_opt_source AS "source"
      FROM clients
      WHERE ($1 <> '' AND LOWER(email) = $1)
         OR ($2 <> '' AND phone = $2)
      ORDER BY id DESC
      LIMIT 1;
    `;
    const r = await pool.query(q, [email, phone]);

    if (r.rowCount === 0) {
      return res.json({ found: false });
    }

    return res.json({ found: true, ...r.rows[0] });
  } catch (e) {
    console.error("❌ sms-consent GET error:", e);
    return res.status(500).json({ error: "Failed to fetch sms consent" });
  }
});

// POST /api/clients/sms-consent
app.post("/api/clients/sms-consent", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const smsOptIn = !!req.body.smsOptIn;
  const source = String(req.body.source || "").trim() || "unknown";

  if (!email && !phone) {
    return res.status(400).json({ error: "Email or phone is required" });
  }

  try {
    // Ensure a client exists (do not overwrite name here)
    if (email) {
      await pool.query(
        `
        INSERT INTO clients (full_name, email, phone)
        VALUES ('', $1, NULLIF($2,''))
        ON CONFLICT (email) DO NOTHING;
        `,
        [email, phone]
      );
    }

    // Update consent timestamps
    const update = `
      UPDATE clients
      SET
        sms_opt_in_at  = CASE WHEN $3 THEN NOW() ELSE sms_opt_in_at END,
        sms_opt_out_at = CASE WHEN NOT $3 THEN NOW() ELSE sms_opt_out_at END,
        sms_opt_source = $4,
        sms_opt_updated_at = NOW()
      WHERE ($1 <> '' AND LOWER(email) = $1)
         OR ($2 <> '' AND phone = $2)
      RETURNING
        id,
        email,
        phone,
        sms_opt_in_at  AS "smsOptInAt",
        sms_opt_out_at AS "smsOptOutAt",
        sms_opt_source AS "source";
    `;

    const r = await pool.query(update, [email, phone, smsOptIn, source]);
    return res.json({ ok: true, ...(r.rows[0] || {}) });
  } catch (e) {
    console.error("❌ sms-consent POST error:", e);
    return res.status(500).json({ error: "Failed to save sms consent" });
  }
});


app.post("/admin/client-preferences-link", async (req, res) => {
  const { client_id } = req.body;
  if (!client_id) return res.status(400).json({ error: "client_id required" });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

  await pool.query(
    `INSERT INTO client_magic_links (client_id, token, purpose, expires_at)
     VALUES ($1, $2, 'preferences', $3)`,
    [client_id, token, expiresAt]
  );

  const baseUrl = process.env.PUBLIC_SITE_URL || "http://localhost:3000";
  const link = `${baseUrl}/client/preferences?token=${token}`;

  res.json({ success: true, link, expires_at: expiresAt.toISOString() });
});

app.get("/client/preferences", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "token required" });

  const result = await pool.query(
    `SELECT c.id, c.full_name, c.phone, c.sms_opt_in, t.expires_at
     FROM client_magic_links t
     JOIN clients c ON c.id = t.client_id
     WHERE t.token = $1 AND t.purpose = 'preferences'`,
    [token]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Invalid link" });

  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) {
    return res.status(410).json({ error: "Link expired" });
  }

  res.json({
    client_name: row.full_name,
    phone: row.phone,
    sms_opt_in: row.sms_opt_in,
  });
});

app.patch("/client/preferences", async (req, res) => {
  const { token, sms_opt_in } = req.body;
  if (!token || typeof sms_opt_in !== "boolean") {
    return res.status(400).json({ error: "token + sms_opt_in(boolean) required" });
  }

  const tok = await pool.query(
    `SELECT client_id, expires_at
     FROM client_magic_links
     WHERE token = $1 AND purpose = 'preferences'`,
    [token]
  );

  if (tok.rowCount === 0) return res.status(404).json({ error: "Invalid link" });
  if (new Date(tok.rows[0].expires_at) < new Date()) {
    return res.status(410).json({ error: "Link expired" });
  }

  await pool.query(
    `UPDATE clients
     SET sms_opt_in = $1,
         sms_opt_in_date = NOW(),
         sms_opt_in_source = 'magic_link'
     WHERE id = $2`,
    [sms_opt_in, tok.rows[0].client_id]
  );

  res.json({ success: true, sms_opt_in });
});

// Client Profile via magic link (no login)
// GET /client/profile?token=...
app.get("/client/profile", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "token required" });

  try {
    // 1) Resolve token -> client_id (same pattern as /client/preferences)
    const tok = await pool.query(
      `SELECT client_id, expires_at
       FROM client_magic_links
       WHERE token = $1 AND purpose = 'preferences'`,
      [token]
    );

    if (tok.rowCount === 0) return res.status(404).json({ error: "Invalid link" });
    if (new Date(tok.rows[0].expires_at) < new Date()) {
      return res.status(410).json({ error: "Link expired" });
    }

    const clientId = tok.rows[0].client_id;

    // 2) Client basic info
    const clientRes = await pool.query(
      `SELECT id, full_name, email, phone, sms_opt_in
       FROM clients
       WHERE id = $1`,
      [clientId]
    );
    const client = clientRes.rows[0];
    if (!client) return res.status(404).json({ error: "Client not found" });

    // 3) Appointments (bookings) — most recent first
    const apptRes = await pool.query(
      `SELECT id, title, date, time, end_time, location, status, paid, price, total_cost
       FROM appointments
       WHERE client_id = $1
       ORDER BY date DESC, time DESC`,
      [clientId]
    );

    // 4) Payments linked by email (your existing join pattern)
    // (If your payments table uses different columns, tell me and I’ll adjust.)
    const payRes = await pool.query(
      `SELECT p.*
       FROM payments p
       WHERE p.email = $1
       ORDER BY p.created_at DESC`,
      [client.email]
    );

    // 5) Compute totals + split future/past
    const now = new Date();

    const normalizeApptDateTime = (row) => {
      // row.date assumed DATE or ISO; row.time like '18:00:00' or '18:00'
      const d = new Date(row.date);
      const t = (row.time || "00:00:00").toString();
      const [hh = "0", mm = "0"] = t.split(":");
      d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
      return d;
    };

    const allAppointments = apptRes.rows || [];
    const futureBookings = [];
    const pastBookings = [];

    for (const a of allAppointments) {
      const dt = normalizeApptDateTime(a);
      if (dt >= now) futureBookings.push(a);
      else pastBookings.push(a);
    }

    // totalSpent: prefer payments sum; fallback to paid appointments sum
    const totalFromPayments = (payRes.rows || []).reduce((sum, p) => {
      const amt = Number(p.amount ?? p.total ?? p.payment_amount ?? 0);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);

    const totalFromPaidAppointments = allAppointments.reduce((sum, a) => {
      const paid = a.paid === true || a.status === "finalized";
      const amt = Number(a.total_cost ?? a.price ?? 0);
      return sum + (paid && Number.isFinite(amt) ? amt : 0);
    }, 0);

    const totalSpent = totalFromPayments > 0 ? totalFromPayments : totalFromPaidAppointments;

    res.json({
      client,
      stats: {
        totalSpent: Number(totalSpent.toFixed(2)),
        totalBookings: allAppointments.length,
        upcomingBookings: futureBookings.length,
      },
      futureBookings,
      pastBookings,
      payments: payRes.rows || [],
    });
  } catch (err) {
    console.error("Error in /client/profile:", err);
    res.status(500).json({ error: "Failed to load client profile", details: err.message || err });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM clients WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

// Helper: read campaign_log.txt and return a Set of emails that already got a "sent" entry
const getCampaignSentEmails = () => {
  const logFile = path.join(process.cwd(), "campaign_log.txt");
  const sent = new Set();

  if (!fs.existsSync(logFile)) return sent;

  const lines = fs.readFileSync(logFile, "utf8").split("\n");

  for (const line of lines) {
    // Matches lines like: [timestamp] Email sent to someone@example.com
    const match = line.match(/Email sent to (.+@.+)$/);
    if (match && match[1]) {
      sent.add(match[1].trim().toLowerCase());
    }
  }

  return sent;
};


// NEW CAMPAIGN → send to ALL clients, ignore log
app.post("/api/send-campaign", campaignUpload.single("image"), async (req, res) => {
  const { subject, message, sendTo } = req.body;

  if (!message || !sendTo) {
    return res
      .status(400)
      .json({ error: "Message and recipient type are required" });
  }

  try {
    if (sendTo === "clients" || sendTo === "both") {
      const clientsResult = await pool.query(
        "SELECT full_name, email FROM clients WHERE email IS NOT NULL"
      );
      const clients = clientsResult.rows;
    await sendEmailCampaign(clients, subject, message, req.file || null);
    }

    // if you later add staff list, handle sendTo === "staff" here

    return res.status(200).json({ message: "Campaign sent successfully" });
  } catch (error) {
    console.error("❌ Error sending campaign:", error);
    return res.status(500).json({ error: "Failed to send campaign" });
  }
});

app.post("/admin/scheduled-campaigns", campaignUpload.single("image"), async (req, res) => {
  try {
    const { subject, message, sendTo = "clients", scheduledSendAt } = req.body || {};
    if (!subject || !message || !scheduledSendAt) {
      return res.status(400).json({ error: "subject, message, scheduledSendAt are required" });
    }

    const imageFile = req.file || null;

    const image_name = imageFile?.originalname || null;
    const image_base64 = imageFile?.buffer ? imageFile.buffer.toString("base64") : null;

    const ins = await pool.query(
      `
      INSERT INTO scheduled_campaigns (subject, message, send_to, scheduled_send_at, image_name, image_base64)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [subject, message, sendTo, scheduledSendAt, image_name, image_base64]
    );

    return res.json({ ok: true, campaign: ins.rows[0] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to schedule campaign" });
  }
});

app.get("/admin/scheduled-campaigns", async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM scheduled_campaigns ORDER BY created_at DESC LIMIT 100`
  );
  res.json({ campaigns: r.rows });
});

app.post("/admin/scheduled-campaigns/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  await pool.query(
    `UPDATE scheduled_campaigns SET status='cancelled' WHERE id=$1 AND status IN ('scheduled')`,
    [id]
  );
  res.json({ ok: true });
});

// SAME CAMPAIGN RETRY → send ONLY to clients who do NOT appear in campaign_log.txt
app.post("/admin/email-campaign-missed", campaignUpload.single("image"), async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res
      .status(400)
      .json({ error: "Subject and message are required." });
  }

  try {
    // 1) Get all clients with email
    const clientsResult = await pool.query(
      "SELECT full_name, email FROM clients WHERE email IS NOT NULL"
    );
    const allClients = clientsResult.rows;

    // 2) Emails that have already been logged as SENT
    const sentEmails = getCampaignSentEmails();

    let skippedAlreadySent = 0;

    // 3) Filter to those NOT in the sent set
    const pendingClients = allClients.filter((client) => {
      if (!client.email) return false;
      const lower = client.email.toLowerCase();
      if (sentEmails.has(lower)) {
        skippedAlreadySent++;
        return false;
      }
      return true;
    });

    console.log(
      `📣 Retrying campaign for ${pendingClients.length} clients (skipping ${skippedAlreadySent} already logged as sent).`
    );

    if (pendingClients.length === 0) {
      return res.status(200).json({
        success: true,
        attempted: 0,
        skippedAlreadySent,
        message: "No missed clients to send to.",
      });
    }

    // 4) Use the same Brevo sender
    await sendEmailCampaign(pendingClients, subject, message, req.file || null);

    return res.status(200).json({
      success: true,
      attempted: pendingClients.length,
      skippedAlreadySent,
      message: `Retry campaign attempted for ${pendingClients.length} clients.`,
    });
  } catch (err) {
    console.error("Email Campaign Missed Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send missed email campaign." });
  }
});

// VIEW SENT EMAIL LOG
app.get("/admin/email-campaign-log", (req, res) => {
  const logFile = path.join(process.cwd(), "campaign_log.txt");

  if (!fs.existsSync(logFile)) {
    return res.json({
      success: true,
      entries: [],
      message: "Log file does not exist yet."
    });
  }

  const logContent = fs.readFileSync(logFile, "utf8");
  const lines = logContent.trim().split("\n");

  // Parse into structured objects
  const parsed = lines.map(line => {
    const successMatch = line.match(/Email sent to (.+)$/);
    const failMatch = line.match(/FAILED to send to (.+)$/);

    return {
      raw: line,
      email: successMatch?.[1] || failMatch?.[1] || null,
      status: successMatch ? "sent" : failMatch ? "failed" : "unknown"
    };
  });

  res.json({
    success: true,
    total: parsed.length,
    sent: parsed.filter(e => e.status === "sent").length,
    failed: parsed.filter(e => e.status === "failed").length,
    entries: parsed
  });
});

// Helper to clean US phone numbers like (305) 555-1234 → 13055551234
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  // If it already starts with 1 and is 11 digits, keep it
  if (digits.length === 11 && digits.startsWith("1")) return digits;

  // If it's 10 digits, assume US and prefix 1
  if (digits.length === 10) return "1" + digits;

  // Otherwise skip it
  return null;
}

async function sendSmsCampaign(clients, smsContent) {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SMS_SENDER || "ReadyBart"; // <= 11 chars
  const url = "https://api.brevo.com/v3/transactionalSMS/send";

  if (!apiKey) {
    console.error("❌ Missing BREVO_API_KEY for SMS");
    return { attempted: 0, sent: 0, failed: 0, skipped: clients.length };
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const recipient = normalizePhone(client.phone);

    if (!recipient) {
      skipped++;
      console.log("Skipping invalid phone for client:", client.full_name, client.phone);
      continue;
    }

    attempted++;

    const footer = "\nReply STOP to opt out.";
    const smsContentFinal = (smsContent || "").trim() + footer;

    const body = {
      sender,
      recipient,
      content: smsContentFinal,
      type: "marketing", // supports STOP handling
    };


    try {
      await delay(400); // small delay so Brevo doesn’t rate-limit you
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        failed++;
        console.error(`❌ SMS failed for ${recipient}`, data);
      } else {
        sent++;
        console.log(`✅ SMS sent to ${recipient}`, data);
      }
    } catch (err) {
      failed++;
      console.error(`❌ Error sending SMS to ${recipient}`, err);
    }
  }

  return { attempted, sent, failed, skipped };
}

// NEW: SMS campaign endpoint (OPT-IN ONLY)
app.post("/api/send-sms-campaign", async (req, res) => {
  const { message, sendTo } = req.body;

  if (!message || !sendTo) {
    return res.status(400).json({ error: "Message and recipient type are required" });
  }

  try {
    if (sendTo === "clients" || sendTo === "both") {
      const result = await pool.query(`
        SELECT full_name, phone
        FROM clients
        WHERE phone IS NOT NULL
          AND sms_opt_in = true
      `);

      const clients = result.rows;
      console.log(`📱 Sending SMS campaign to ${clients.length} opted-in clients`);

      const stats = await sendSmsCampaign(clients, message);

      return res.status(200).json({
        message: "SMS campaign finished",
        ...stats,
        totalOptedIn: clients.length,
      });
    }

    return res.status(200).json({ message: "No recipients selected for SMS" });
  } catch (error) {
    console.error("❌ Error sending SMS campaign:", error);
    return res.status(500).json({ error: "Failed to send SMS campaign" });
  }
});

// ✅ GET endpoint to fetch all GENERAL intake forms
app.get('/api/intake-forms', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM intake_forms ORDER BY created_at DESC'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching intake forms:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to fetch all intake forms
app.get('/api/craft-cocktails', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM craft_cocktails ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching intake forms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to fetch all intake forms
app.get('/api/mix-n-sip', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mix_n_sip ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching intake forms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET endpoint to fetch all intake forms
app.get('/api/bartending-course', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bartending_course_inquiries ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bartending-course forms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/api/bartending-course/:id', async (req, res) => {
  const { id } = req.params;
  const { dropped } = req.body;

  try {
    const result = await pool.query(
      'UPDATE bartending_course_inquiries SET dropped = $1 WHERE id = $2 RETURNING *',
      [dropped, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({ error: 'Failed to update student status' });
  }
});

// GET endpoint to fetch all course intake forms
app.get('/api/bartending-classes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bartending_classes_inquiries ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bartending-classes forms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET endpoint to fetch all intake forms
app.get('/api/craft-cocktails', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM craft_cocktails ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching craft-cocktails forms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/intake-forms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Logic to delete the form from your database
        const result = await pool.query('DELETE FROM intake_forms WHERE id = $1', [id]);

        if (result.rowCount > 0) {
            res.status(200).send('Form deleted successfully');
        } else {
            res.status(404).send('Form not found');
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).send('Failed to delete form');
    }
});

app.delete('/api/bartending-course/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Logic to delete the form from your database
        const result = await pool.query('DELETE FROM bartending_course_inquiries WHERE id = $1', [id]);

        if (result.rowCount > 0) {
            res.status(200).send('Form deleted successfully');
        } else {
            res.status(404).send('Form not found');
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).send('Failed to delete form');
    }
});

app.delete('/api/bartending-classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Logic to delete the form from your database
        const result = await pool.query('DELETE FROM bartending_classes_inquiries WHERE id = $1', [id]);

        if (result.rowCount > 0) {
            res.status(200).send('Form deleted successfully');
        } else {
            res.status(404).send('Form not found');
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).send('Failed to delete form');
    }
});

app.delete('/api/craft-cocktails/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Logic to delete the form from your database
        const result = await pool.query('DELETE FROM craft_cocktails WHERE id = $1', [id]);

        if (result.rowCount > 0) {
            res.status(200).send('Form deleted successfully');
        } else {
            res.status(404).send('Form not found');
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).send('Failed to delete form');
    }
});

app.delete('/api/mix-n-sip/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Logic to delete the form from your database
        const result = await pool.query('DELETE FROM mix_n_sip WHERE id = $1', [id]);

        if (result.rowCount > 0) {
            res.status(200).send('Form deleted successfully');
        } else {
            res.status(404).send('Form not found');
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).send('Failed to delete form');
    }
});

// ONE unified Square client for ALL routes
const square = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment:
    process.env.NODE_ENV === "production"
      ? Environment.Production
      : Environment.Sandbox,
});

// Extract APIs ONCE. No duplicates.
const {
  customersApi,
  cardsApi,
  paymentsApi,
  checkoutApi,
} = square;

// Create a Square payment link (appointments OR events)
app.post('/api/create-payment-link', async (req, res) => {
  try {
    const {
      email,
      amount,
      itemName,
      flow = "appointment",
      appointmentData,
      eventData
    } = req.body || {};

    if (!email || !amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Email and valid amount are required.' });
    }

    // EVENTS absorb processing fee so flyer price = checkout price
    const passFeeToBuyer = flow !== "event";

    const processingFee = passFeeToBuyer
      ? (Number(amount) * 0.029) + 0.30
      : 0;

    const adjusted = Number(amount) + processingFee;
    const adjustedCents = Math.round(adjusted * 100);

    let eventOrderId = null;

    // ----------------------------------
    // CREATE EVENT ORDER IF EVENT FLOW
    // ----------------------------------
    if (flow === "event") {

      if (!eventData?.event_id || !eventData?.session_id || !eventData?.ticket_type_id) {
        return res.status(400).json({ error: "Missing required event data." });
      }

      const quantity = Number(eventData?.quantity || 1);
      const attendeeCount = Number(eventData?.attendee_count || quantity);

      const sessionRes = await pool.query(
        `
        SELECT id, capacity, tickets_sold, status
        FROM event_sessions
        WHERE id = $1
        LIMIT 1
        `,
        [eventData.session_id]
      );

      if (sessionRes.rowCount === 0) {
        return res.status(404).json({ error: "Event session not found." });
      }

      const session = sessionRes.rows[0];

      const remaining = Number(session.capacity) - Number(session.tickets_sold);

      if (session.status !== "active") {
        return res.status(400).json({ error: "Session is not active." });
      }

      if (attendeeCount > remaining) {
        return res.status(400).json({ error: "Not enough seats available." });
      }

      const orderRes = await pool.query(
        `
        INSERT INTO event_orders (
          event_id,
          session_id,
          ticket_type_id,
          client_name,
          client_email,
          client_phone,
          quantity,
          attendee_count,
          amount_paid,
          payment_status,
          notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
        RETURNING id
        `,
        [
          eventData.event_id,
          eventData.session_id,
          eventData.ticket_type_id,
          eventData.client_name || "",
          eventData.client_email || email,
          eventData.client_phone || null,
          quantity,
          attendeeCount,
          Number(amount),
          `${eventData.title || "Event"} - ${eventData.ticket_type_name || "Ticket"}`
        ]
      );

      eventOrderId = orderRes.rows[0].id;
    }

    // ----------------------------------
    // SUCCESS PAGE LOGIC
    // ----------------------------------

    const appointmentSuccessBase = process.env.NODE_ENV === 'production'
      ? `https://readybartending.com/rb/client-scheduling-success`
      : `http://localhost:3000/rb/client-scheduling-success`;

    const eventSuccessBase = process.env.NODE_ENV === 'production'
      ? `https://readybartending.com/events/success`
      : `http://localhost:3000/events/success`;

    const baseSuccess = flow === "event"
      ? eventSuccessBase
      : appointmentSuccessBase;

    const q = new URLSearchParams({
      email,
      amount: (adjustedCents / 100).toFixed(2),
      flow
    });

    // Appointment params
    if (flow === "appointment") {
      if (appointmentData?.title) q.set("title", appointmentData.title);
      if (appointmentData?.date) q.set("date", appointmentData.date);
      if (appointmentData?.time) q.set("time", appointmentData.time);
      if (appointmentData?.end_time) q.set("end", appointmentData.end_time);
      if (appointmentData?.cycleStart) q.set("cycleStart", appointmentData.cycleStart);

      if (/\bbartending course\b/i.test(appointmentData?.title || "")) {
        q.set("course", "1");
      }
    }

    // Event params
    if (flow === "event") {

      if (eventOrderId) {
        q.set("event_order_id", String(eventOrderId));
      }

      if (eventData?.title) q.set("title", eventData.title);
      if (eventData?.date) q.set("date", eventData.date);
      if (eventData?.time) q.set("time", eventData.time);
      if (eventData?.session_label) q.set("session", eventData.session_label);
      if (eventData?.ticket_type_name) q.set("ticket", eventData.ticket_type_name);
    }

    const redirectUrl = `${baseSuccess}?${q.toString()}`;

    // ----------------------------------
    // METADATA FOR SQUARE
    // ----------------------------------

    const metadataPayload =
      flow === "event"
        ? {
            flow: "event",
            eventOrderId: String(eventOrderId || ""),
            eventData: JSON.stringify(eventData || {})
          }
        : {
            flow: "appointment",
            appointmentData: JSON.stringify(appointmentData || {})
          };

    // ----------------------------------
    // CREATE PAYMENT LINK
    // ----------------------------------

    const response = await checkoutApi.createPaymentLink({
      idempotencyKey: `plink-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      quickPay: {
        name: itemName || (flow === "event" ? "Event Ticket" : "Payment for Services"),
        description: flow === "event"
          ? "Payment for event ticket(s)"
          : "Full payment for appointment",
        priceMoney: {
          amount: adjustedCents,
          currency: "USD"
        },
        locationId: process.env.SQUARE_LOCATION_ID
      },
      checkoutOptions: {
        redirectUrl,
        metadata: metadataPayload
      }
    });

    const paymentLink = response.result?.paymentLink?.url;
    const paymentLinkId = response.result?.paymentLink?.id || null;

    if (!paymentLink) {
      return res.status(500).json({ error: "Failed to create payment link" });
    }

    // ----------------------------------
    // SAVE SQUARE LINK TO EVENT ORDER
    // ----------------------------------

    if (flow === "event" && eventOrderId) {
      await pool.query(
        `
        UPDATE event_orders
        SET square_payment_link_id = $1,
            square_checkout_url = $2,
            updated_at = NOW()
        WHERE id = $3
        `,
        [paymentLinkId, paymentLink, eventOrderId]
      );
    }

    // ----------------------------------
    // OPTIONAL EMAIL LOGIC
    // ----------------------------------

    const source = String(
      appointmentData?.source || eventData?.source || ""
    ).toLowerCase();

    const shouldEmail = source === "paymentform";

    if (shouldEmail) {
      try {
        await sendPaymentEmail(email, paymentLink);
        console.log(`📧 Payment link email sent to ${email}`);
      } catch (mailErr) {
        console.error("❌ sendPaymentEmail failed:", mailErr?.message || mailErr);
      }
    }

    return res.status(200).json({
      url: paymentLink,
      event_order_id: eventOrderId
    });

  } catch (error) {
    console.error("❌ Error creating payment link:", error);
    return res.status(500).json({ error: "Failed to create payment link" });
  }
});


// ------------------------------
// SAVE CARD ON FILE (Corrected)
// ------------------------------
app.post("/api/save-card-on-file", async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: "Email and token are required." });
    }

    // Look up Square customer in DB
    const lookup = await pool.query(
      "SELECT square_customer_id FROM clients WHERE email = $1",
      [email]
    );

    let customerId = lookup.rows[0]?.square_customer_id;

    // If no customer, create one
    if (!customerId) {
      const created = await customersApi.createCustomer({ emailAddress: email });
      customerId = created.result.customer.id;

      await pool.query(
        "UPDATE clients SET square_customer_id = $1 WHERE email = $2",
        [customerId, email]
      );
    }

    // Save card to Square
    const cardResponse = await cardsApi.createCard({
      idempotencyKey: crypto.randomUUID(),
      sourceId: token,
      card: { customerId },
    });

    const cardId = cardResponse.result.card.id;

    await pool.query(
      "UPDATE clients SET card_id = $1 WHERE email = $2",
      [cardId, email]
    );

    return res.json({ success: true, cardId });

  } catch (err) {
    console.error("❌ save-card-on-file error:", err);

    // If it's a Square ApiError with errors array, surface that cleanly
    if (err.result?.errors?.length) {
      const sqErr = err.result.errors[0];
      return res.status(400).json({
        error:
          sqErr.detail ||
          "Your card could not be saved. Please double-check your card details or try another card.",
        code: sqErr.code,
        field: sqErr.field,
      });
    }

    return res.status(500).json({
      error:
        "Something went wrong saving your card. Please try again or use a different card.",
    });
  }
});

// Charge a client using their saved card on file
app.post("/api/charge-saved-card", async (req, res) => {
  try {
    const { email, amount, note } = req.body || {};

    if (!email || !amount || isNaN(amount)) {
      return res
        .status(400)
        .json({ error: "Email and valid amount are required." });
    }

    // 1️⃣ Look up card_id AND square_customer_id for this client
    const { rows } = await pool.query(
      `
      SELECT
        card_id,
        square_customer_id,
        full_name
      FROM clients
      WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    if (!rows.length || !rows[0].card_id) {
      return res
        .status(404)
        .json({ error: "No card on file for this client." });
    }

    const cardId = rows[0].card_id;
    const customerId = rows[0].square_customer_id;
    const clientName = rows[0].full_name || email;

    if (!customerId) {
      // Card exists but we never stored / synced the Square customer
      return res.status(400).json({
        error:
          "This saved card is missing its Square customer. Please save the card again, then retry the charge.",
      });
    }

    // 2️⃣ Charge the saved card (card on file requires customerId)
    const paymentResponse = await paymentsApi.createPayment({
  idempotencyKey: crypto.randomUUID(),
  sourceId: cardId,
  customerId,
  amountMoney: {
    amount: Math.round(Number(amount) * 100),
    currency: "USD",
  },
  note: note || `Manual charge for ${clientName}`,
});

const payment = paymentResponse.result.payment;

const safePayment = {
  id: payment.id,
  status: payment.status,
  receiptUrl: payment.receiptUrl || payment.receipt_url,
  amount: payment.amountMoney?.amount
    ? payment.amountMoney.amount.toString()
    : null,
  currency: payment.amountMoney?.currency || null,
  createdAt: payment.createdAt || payment.created_at,
};

console.log("✅ Charged saved card for", email, safePayment.id);

return res.json({
  success: true,
  payment: safePayment,
});

  } catch (err) {
    console.error("❌ charge-saved-card error:", err);

    // If it's a Square ApiError with structured errors, surface it
    if (err.result?.errors?.length) {
      const sqErr = err.result.errors[0];
      return res.status(400).json({
        error:
          sqErr.detail ||
          "Square could not process this charge. Ask the client to use a different card.",
        code: sqErr.code,
        field: sqErr.field,
      });
    }

    return res
      .status(500)
      .json({ error: "Charge failed. Please try again later." });
  }
});

//--------------------------------------
// EMAIL CAMPAIGN ROUTE
//--------------------------------------
app.post("/admin/email-campaign", async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    // Pull all clients with valid emails
    const clients = await pool.query(
      "SELECT full_name, email FROM clients WHERE email IS NOT NULL"
    );

    const clientList = clients.rows;

    console.log(`📣 Sending campaign to ${clientList.length} clients...`);

    // Use your existing email sender
    await sendEmailCampaign(clientList, subject, message);

    res.json({
      success: true,
      sent: clientList.length,
      message: `Campaign delivered to ${clientList.length} clients.`
    });

  } catch (err) {
    console.error("Email Campaign Error:", err);
    res.status(500).json({ error: "Failed to send email campaign." });
  }
});

//--------------------------------------
// EMAIL CAMPAIGN RETRY (ONLY MISSED)
//--------------------------------------
app.post("/admin/email-campaign-missed", async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res
        .status(400)
        .json({ error: "Subject and message are required." });
    }

    // All clients with emails
    const clientsResult = await pool.query(
      "SELECT full_name, email FROM clients WHERE email IS NOT NULL"
    );
    const allClients = clientsResult.rows;

    // Emails that already logged as successfully sent
    const sentEmails = getCampaignSentEmails();

    // Filter to clients *not* in the sent list
    const pendingClients = allClients.filter(
      (c) => c.email && !sentEmails.has(c.email.toLowerCase())
    );

    console.log(
      `📣 Retrying campaign for ${pendingClients.length} clients (skipping ${allClients.length - pendingClients.length} already logged as sent).`
    );

    await sendEmailCampaign(pendingClients, subject, message);

    return res.json({
      success: true,
      attempted: pendingClients.length,
      skippedAlreadySent: allClients.length - pendingClients.length,
      message: `Retry campaign attempted for ${pendingClients.length} clients.`,
    });
  } catch (err) {
    console.error("Email Campaign Missed Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to send missed email campaign." });
  }
});


// Get all clients that have a saved card on file
app.get("/api/clients-with-cards", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, full_name, email, card_id, square_customer_id
      FROM clients
      WHERE card_id IS NOT NULL
      ORDER BY full_name ASC, email ASC
      `
    );

    return res.json({ clients: rows });
  } catch (err) {
    console.error("❌ Error fetching clients with cards:", err);
    return res.status(500).json({
      error: "Failed to load clients with saved cards."
    });
  }
});


// ✅ Save payment record to the database
app.post('/api/payments', async (req, res) => {
  const { email, amount, description } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: 'Email and amount are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO payments (email, amount, description, status, created_at)
       VALUES ($1, $2, $3, 'Pending', NOW())
       RETURNING *`,
      [email, amount, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error saving payment:', error);
    res.status(500).json({ error: 'Failed to save payment record.' });
  }
});


app.post('/api/sync-clients-to-square', async (req, res) => {
  try {
    const clientsResult = await pool.query(`
      SELECT id, full_name, email
      FROM clients
      WHERE square_customer_id IS NULL AND email IS NOT NULL
    `);

    const clients = clientsResult.rows;
    const synced = [];

    for (const clientRow of clients) {
      try {
        const response = await client.customersApi.createCustomer({
          givenName: clientRow.full_name,
          emailAddress: clientRow.email,
          referenceId: clientRow.id.toString(),
        });

        const customerId = response.result.customer?.id;

        if (customerId) {
          await pool.query(
            'UPDATE clients SET square_customer_id = $1 WHERE id = $2',
            [customerId, clientRow.id]
          );
          synced.push({ name: clientRow.full_name, customerId });
        }
      } catch (err) {
        console.error(`❌ Failed to sync ${clientRow.full_name}:`, err.message);
      }
    }

    res.status(200).json({
      message: `✅ Synced ${synced.length} clients to Square`,
      synced,
    });
  } catch (err) {
    console.error('❌ Error syncing clients to Square:', err);
    res.status(500).json({ error: 'Failed to sync clients to Square' });
  }
});

app.post('/square-webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log("📢 Square Webhook Event Received:", event);

        // ✅ Extract Payment Details
        const paymentStatus = event.data.object.status;  // e.g., "COMPLETED"
        const paymentId = event.data.object.id;  // Unique Payment ID
        const amount = event.data.object.amount_money.amount / 100;  // Convert cents to dollars
        const email = event.data.object.buyer_email_address;  // Client email (if available)

        console.log(`💰 Payment Update: ${email} - Amount: $${amount} - Status: ${paymentStatus}`);

        // ✅ Only process successful payments
        if (paymentStatus === "COMPLETED") {
            console.log("✅ Payment is completed! Updating database...");

            // 1. ✅ Update the payments table to reflect the status
            await pool.query(
                `UPDATE payments SET status = $1, amount = $2 WHERE payment_id = $3`,
                [paymentStatus, amount, paymentId]
            );

            // 2. ✅ Find the appointment by email (or use another method like appointment_id if available)
            const appointmentResult = await pool.query(
                `SELECT * FROM appointments WHERE client_id = (SELECT id FROM clients WHERE email = $1) AND paid = false`,
                [email]
            );

            if (appointmentResult.rowCount > 0) {
                const appointment = appointmentResult.rows[0];

                // 3. ✅ Mark the appointment as paid
                await pool.query(
                    `UPDATE appointments SET paid = true WHERE id = $1`,
                    [appointment.id]
                );

                // 4. ✅ Insert the payment into the profits table
                await pool.query(
                    `INSERT INTO profits (category, description, amount, type)
                    VALUES ($1, $2, $3, $4)`,
                    ['Income', `Payment for appointment: ${appointment.title}`, amount, 'Appointment Payment']
                );

                console.log(`✅ Appointment marked as paid and profit recorded for: ${appointment.title}`);
            } else {
                console.log(`❌ No appointment found or already marked as paid for ${email}`);
            }
        }

        // ✅ Acknowledge Square's webhook receipt (200 OK)
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error handling Square webhook:", error);
        res.sendStatus(500);
    }
});

const squareWebhookSecret = 'YOUR_SQUARE_WEBHOOK_SECRET';

const validateWebhookSignature = (req) => {
    const signature = req.headers['x-square-signature'];
    const payload = JSON.stringify(req.body);

    const hmac = crypto.createHmac('sha256', squareWebhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
};


// Initialize Plaid client
const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox, // Change to 'development' or 'production' if needed
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

// Create Link Token
app.post('/api/plaid/create-link-token', async (req, res) => {
    try {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: req.body.userId || 'default-user-id' },
            client_name: 'Ready Bartending',
            products: ['transactions'],
            country_codes: ['US'],
            language: 'en',
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error creating link token:', error);
        res.status(500).json({ error: 'Failed to create link token' });
    }
});

// Exchange Public Token for Access Token
app.post('/api/plaid/exchange-token', async (req, res) => {
    try {
        const { public_token } = req.body;
        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        await pool.query(
            'INSERT INTO plaid_items (access_token, item_id) VALUES ($1, $2) ON CONFLICT (item_id) DO NOTHING',
            [accessToken, itemId]
        );
        res.json({ accessToken, itemId });
    } catch (error) {
        console.error('Error exchanging public token:', error);
        res.status(500).json({ error: 'Failed to exchange public token' });
    }
});

// Fetch Transactions
app.get('/api/plaid/transactions', async (req, res) => {
    try {
        const { itemId } = req.query;
        const result = await pool.query('SELECT access_token FROM plaid_items WHERE item_id = $1', [itemId]);
        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Invalid Item ID' });
        }
        const accessToken = result.rows[0].access_token;
        const response = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: '2024-01-01',
            end_date: '2024-02-01',
        });
        res.json(response.data.transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Helper function to get category by title
function getAppointmentCategory(title) {
    const appointment = appointmentTypes.find((type) => type.title === title);
    return appointment ? appointment.category : 'General'; // Default to 'General' if not found
}

// EXPENSES ROUTES
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, expense_date, category, amount, description, vendor, payment_method, notes, created_at
       FROM expenses
       ORDER BY expense_date DESC, id DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// EXPENSES ROUTES
app.post('/api/expenses', async (req, res) => {
  const client = await pool.connect();

  try {
    // Allow either a single expense object OR { expenses: [...] }
    const payload = req.body || {};
    const expensesArray = Array.isArray(payload.expenses)
      ? payload.expenses
      : [payload];

    if (!expensesArray.length) {
      return res.status(400).json({ error: 'No expenses provided' });
    }

    // Basic validation helper
    const normalizeExpense = (raw) => {
      const {
        expense_date,
        category,
        amount,
        description,
        vendor,
        payment_method,
        notes,
      } = raw || {};

      if (!expense_date || !category || amount === undefined || amount === null || !description) {
        return { error: 'Missing required fields (expense_date, category, amount, description)' };
      }

      const numericAmount = Number(amount);
      if (Number.isNaN(numericAmount)) {
        return { error: 'Invalid amount value' };
      }

      return {
        expense_date,
        category,
        amount: numericAmount,
        description,
        vendor: vendor || null,
        payment_method: payment_method || null,
        notes: notes || null,
      };
    };

    // Normalize + validate all rows before writing anything
    const normalized = expensesArray.map(normalizeExpense);
    const firstError = normalized.find((x) => x && x.error);
    if (firstError) {
      return res.status(400).json({ error: firstError.error });
    }

    await client.query('BEGIN');

    const insertedExpenses = [];

    for (const exp of normalized) {
      // 1) Insert into expenses
      const insertExpenseQuery = `
        INSERT INTO expenses (
          expense_date,
          category,
          amount,
          description,
          vendor,
          payment_method,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const expenseValues = [
        exp.expense_date,
        exp.category,
        exp.amount,
        exp.description,
        exp.vendor,
        exp.payment_method,
        exp.notes,
      ];

      const expenseResult = await client.query(insertExpenseQuery, expenseValues);
      const inserted = expenseResult.rows[0];
      insertedExpenses.push(inserted);

      // 2) Insert into profits as negative expense (same behavior you already have)
      const profitDescription = inserted.vendor
        ? `${inserted.description} (Vendor: ${inserted.vendor})`
        : inserted.description;

      const insertProfitQuery = `
        INSERT INTO profits (
          category,
          description,
          amount,
          type,
          paid_at
        )
        VALUES ($1, $2, $3, $4, $5);
      `;

      const profitValues = [
        inserted.category,
        profitDescription,
        -Math.abs(Number(inserted.amount)), // NEGATIVE
        'expense',
        inserted.expense_date,
      ];

      await client.query(insertProfitQuery, profitValues);
    }

    await client.query('COMMIT');

    // If it was a single object request, return a single record like before
    if (!Array.isArray(payload.expenses)) {
      return res.status(201).json(insertedExpenses[0]);
    }

    // Bulk response
    res.status(201).json({
      insertedCount: insertedExpenses.length,
      expenses: insertedExpenses,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating expense(s):', error);
    res.status(500).json({ error: 'Failed to create expense(s)' });
  } finally {
    client.release();
  }
});


// CREATE (single appt or 8-session Bartending Course)
app.post('/appointments', async (req, res) => {
  try {
    console.log("✅ Received appointment request:", req.body);

    const {
      title,
      client_id,
      client_name,
      client_email,
      date,
      time,
      end_time,
      description,
      assigned_staff,
      addons,
      status = 'pending',
      // metadata
      isAdmin = false,
      is_admin,
      admin,
      source,
      payment_method,
      client_phone,
      guestCount,
      classCount,

      // amount actually paid now (deposit or full)
      amount_paid,

      // may be sent by FE
      price
    } = req.body || {};

    // --- Client name/email resolution ---
    let finalClientName = client_name || '';
    let finalClientEmail = client_email || '';
    if (client_id && (!finalClientName || !finalClientEmail)) {
      const r = await pool.query(`SELECT full_name, email FROM clients WHERE id=$1`, [client_id]);
      if (r.rowCount > 0) {
        finalClientName = finalClientName || r.rows[0].full_name || '';
        finalClientEmail = finalClientEmail || r.rows[0].email || '';
      }
    }
    if (!finalClientName) finalClientName = finalClientEmail;

    // --- Required fields check ---
    if (!title || !finalClientEmail || !date || !time) {
      return res.status(400).json({ error: "Missing required appointment details." });
    }

    // --- Flags ---
    const isBarCourse = /Bartending Course/i.test(title);
    const isAdminOverride =
      isAdmin === true || is_admin === true || admin === true || source === 'course-auto' ||
      (req.headers['x-rb-admin'] &&
        process.env.RB_ADMIN_KEY &&
        req.headers['x-rb-admin'] === process.env.RB_ADMIN_KEY);

    // --- Normalize time ---
    const norm = (t) => t ? (t.length === 5 ? `${t}:00` : t) : null;
    const formattedTime = norm(time);
    const formattedEndTime = norm(end_time);

    // --- Client lookup/insert ---
    let finalClientId = client_id;
    const existingClient = await pool.query(`SELECT id FROM clients WHERE email=$1`, [finalClientEmail]);
    if (existingClient.rowCount === 0) {
      const ins = await pool.query(
        `INSERT INTO clients (full_name, email, phone)
         VALUES ($1,$2,$3) RETURNING id`,
        [finalClientName, finalClientEmail, client_phone || ""]
      );
      finalClientId = ins.rows[0].id;
    } else {
      finalClientId = existingClient.rows[0].id;
    }

    // --- Availability check (skip for admin/course) ---
    if (!isAdminOverride && !isBarCourse) {
      const hourSlot = formattedTime.split(':')[0];
      const blocked = await pool.query(
        `SELECT 1 FROM schedule_blocks WHERE date=$1 AND time_slot=$2`,
        [date, hourSlot]
      );
      if (blocked.rowCount > 0) return res.status(400).json({ error: "This time slot is blocked." });

      // ✅ Match your unique constraint: (client_id, date, time, title)
      const taken = await pool.query(
        `SELECT 1 FROM appointments
          WHERE client_id=$1 AND date=$2 AND time=$3 AND title=$4
          LIMIT 1`,
        [finalClientId, date, formattedTime, title]
      );
      if (taken.rowCount > 0) {
  const ex = await pool.query(
    `SELECT * FROM appointments
      WHERE client_id=$1 AND date=$2 AND time=$3 AND title=$4
      LIMIT 1`,
    [finalClientId, date, formattedTime, title]
  );
  return res.status(200).json({ duplicate: true, appointment: ex.rows[0] || null });
}

    }

    // --- Pricing & payment state ---
    const dollars = (v) => Math.max(0, Number.isFinite(+v) ? +v : 0);

    // amount actually paid now (may be deposit)
    const amountPaidNow = dollars(amount_paid);

    function extractPriceFromTitle(t) {
      const m = t && t.match(/\$(\d+(\.\d{1,2})?)/);
      return m ? parseFloat(m[1]) : 0;
    }
    let basePrice = extractPriceFromTitle(title);
    if (basePrice === 0) {
      if (title.includes('Mix N Sip')) basePrice = 75;
      else if (title.includes('Crafts & Cocktails')) basePrice = 85;
      else if (title.includes('Bartending Class')) basePrice = 60;
    }

    let addonList = [];
    try {
      addonList = addons && typeof addons === 'string'
        ? JSON.parse(addons)
        : Array.isArray(addons) ? addons : [];
    } catch (_) { addonList = []; }

    // NOTE: your current addons look like [{name, price, quantity}], and you were summing price only.
    // We'll keep your behavior, but if you want quantity-aware totals later, tell me.
    const addonTotal = addonList.reduce((s, a) => s + (a?.price || 0), 0);

    const multiplier = (classCount > 1 ? classCount : (guestCount || 1));
    const computedPrice = dollars(price !== undefined ? price : (basePrice * multiplier + addonTotal));

    const paidInFull = amountPaidNow >= (computedPrice - 0.005);
    const paidFlag = (payment_method === 'Square') && paidInFull;

    const computedStatus = paidFlag && status === 'pending' ? 'finalized' : status;

    const toISO = (d) => [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');

  


    // (Optional) Square payment link generator for this route
    const makePaymentLink = async (amountDollars) => {
      try {
        const processingFee = (Number(amountDollars) * 0.029) + 0.30;
        const adjusted = Number(amountDollars) + processingFee;
        const adjustedCents = Math.round(adjusted * 100);

        const baseSuccess = process.env.NODE_ENV === 'production'
          ? `https://readybartending.com/rb/client-scheduling-success`
          : `http://localhost:3000/rb/client-scheduling-success`;

        const q = new URLSearchParams({
          email: finalClientEmail,
          amount: (adjustedCents / 100).toFixed(2),
        });
        if (title) q.set('title', title);
        if (date) q.set('date', date);
        if (formattedTime) q.set('time', formattedTime);
        if (formattedEndTime) q.set('end', formattedEndTime);
        if (/\bbartending course\b/i.test(title || '')) q.set('course', '1');

        const redirectUrl = `${baseSuccess}?${q.toString()}`;

        const { result } = await checkoutApi.createPaymentLink({
          idempotencyKey: `plink-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          quickPay: {
            name: title || 'Payment for Services',
            description: 'Full payment for appointment',
            priceMoney: { amount: adjustedCents, currency: 'USD' },
            locationId: process.env.SQUARE_LOCATION_ID,
          },
          checkoutOptions: { redirectUrl }
        });

        return result?.paymentLink?.url || null;
      } catch (e) {
        console.error('❌ makePaymentLink error:', e?.message || e);
        return null;
      }
    };

    // ============== SINGLE (non-course) ==============
    if (!isBarCourse) {
      // ✅ Make SINGLE idempotent: if duplicate, fetch existing and return it (no 500)
      // ✅ Make SINGLE idempotent: if duplicate, fetch existing and return it
let appt;
let createdNew = false;

try {
  const insert = await pool.query(
    `INSERT INTO appointments
      (title, client_id, date, time, end_time, description, assigned_staff,
       price, status, paid)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      title, finalClientId, date, formattedTime, formattedEndTime,
      description || null, assigned_staff || null, computedPrice,
      computedStatus, paidFlag
    ]
  );

  appt = insert.rows[0];
  createdNew = true;
} catch (e) {
  if (e?.code === '23505' && e?.constraint === 'uniq_appt_client_date_time_title') {
    const existing = await pool.query(
      `SELECT * FROM appointments
         WHERE client_id=$1 AND date=$2 AND time=$3 AND title=$4
         LIMIT 1`,
      [finalClientId, date, formattedTime, title]
    );
    appt = existing.rows[0];
    if (!appt) throw e;

    createdNew = false;
    console.log("ℹ️ Duplicate appointment detected — returning existing:", appt.id);
  } else {
    throw e;
  }
}

// 🔹 PROFITS: only log money when NEW (prevents double profits on double-hit)
if (createdNew && amountPaidNow > 0) {
  const desc = `Payment from ${finalClientName} for ${appt.title} on ${toISO(new Date(appt.date))}`;
  const { rows: exists } = await pool.query(
    `SELECT 1 FROM profits
       WHERE description=$1 AND amount=$2 AND type=$3
         AND created_at >= NOW() - INTERVAL '1 day' LIMIT 1`,
    [desc, amountPaidNow, 'Appointment Income']
  );
  if (exists.length === 0) {
    await pool.query(
      `INSERT INTO profits (category, description, amount, type, created_at)
       VALUES ($1,$2,$3,$4,NOW())`,
      ['Income', desc, amountPaidNow, 'Appointment Income']
    );
  }
}

// ✅ Only do side effects when we actually created a NEW appointment
if (createdNew) {
  await makeCalEventFor(appt);

  try {
    await sendAppointmentEmail({
      title: appt.title,
      email: finalClientEmail,
      full_name: finalClientName,
      date: appt.date,
      time: appt.time,
      end_time: appt.end_time,
      description: appt.description,
      staff: appt.assigned_staff,
      price: appt.price,
      paid: appt.paid,
      payment_method: payment_method || null,
    });
  } catch (e) {
    console.error('❌ sendAppointmentEmail failed:', e?.message || e);
  }
} else {
  console.log("ℹ️ Skipping calendar + email (duplicate request).");
}

// Create payment link only if not fully paid AND only when NEW
let paymentLink = null;
if (createdNew && !appt.paid && appt.price > 0 && finalClientEmail) {
  paymentLink = await makePaymentLink(appt.price);
}

return res.status(createdNew ? 201 : 200).json({ appointment: appt, allAppointments: [appt], paymentLink });
    }
    // ============== BARTENDING COURSE (8 sessions) ==============
    let created = [];
    let first = null;

    const clientConn = await pool.connect();
    try {
      await clientConn.query('BEGIN');

      const wanted = new Date(`${date}T12:00:00`);

      // Decide if this is the Saturday track or the weekday track
      const day = wanted.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const isSaturdayStart = day === 6;

      const offs = isSaturdayStart
        ? [0, 7, 14, 21, 28, 35, 42, 49]    // 8 Saturdays
        : [0, 1, 2, 3, 7, 8, 9, 10];        // existing weekday pattern

      const sessionDates = offs.map(o => new Date(wanted.getTime() + o * 86400000));

      for (let i = 0; i < 8; i++) {
        const clsTitle = `${title.replace(/\bClass\s*\d+\b/gi, '').trim()} - Class ${i + 1}`;

        const clsPrice = i === 0 ? computedPrice : 0;

        const clsPaid =
          i === 0
            ? payment_method === "Square" && amountPaidNow >= computedPrice - 0.005
            : false;

        const clsStatus =
          i === 0
            ? (clsPaid && status === "pending" ? "finalized" : status)
            : status;

        const ins = await clientConn.query(
          `INSERT INTO appointments
            (title, client_id, date, time, end_time, description, assigned_staff,
             price, status, paid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (client_id, date, time, title) DO NOTHING
           RETURNING *`,
          [
            clsTitle,
            finalClientId,
            toISO(sessionDates[i]),
            formattedTime,
            formattedEndTime,
            description || null,
            assigned_staff || null,
            clsPrice,
            clsStatus,
            clsPaid,
          ]
        );

        let row = ins.rows[0];
        if (!row) {
          const sel = await clientConn.query(
            `SELECT * FROM appointments
               WHERE client_id=$1 AND date=$2 AND time=$3 AND title=$4 LIMIT 1`,
            [finalClientId, toISO(sessionDates[i]), formattedTime, clsTitle]
          );
          row = sel.rows[0];
        }

        created.push(row);
        if (!first) first = row;
      }

      await clientConn.query("COMMIT");
    } catch (e) {
      await clientConn.query("ROLLBACK");
      throw e;
    } finally {
      clientConn.release();
    }

    // Ensure Class 1 row reflects current paid/full state
    if (first && (first.price <= 0 || first.paid !== (amountPaidNow >= (computedPrice - 0.005)))) {
      const upd = await pool.query(
        `UPDATE appointments
           SET price=$1, paid=$2,
               status = CASE WHEN $2 THEN 'finalized' ELSE status END
         WHERE id=$3 RETURNING *`,
        [computedPrice, (amountPaidNow >= (computedPrice - 0.005)), first.id]
      );
      if (upd.rowCount > 0) first = upd.rows[0];
    }

    // PROFITS: record the money that actually came in now (deposit or full) against the course
    if (amountPaidNow > 0) {
      const desc = `Payment from ${finalClientName} for ${first.title} on ${toISO(new Date(first.date))}`;
      const { rows: exists } = await pool.query(
        `SELECT 1 FROM profits
           WHERE description=$1 AND amount=$2 AND type=$3
             AND created_at >= NOW() - INTERVAL '1 day' LIMIT 1`,
        [desc, amountPaidNow, 'Bar Course Income']
      );
      if (exists.length === 0) {
        await pool.query(
          `INSERT INTO profits (category, description, amount, type, created_at)
           VALUES ($1,$2,$3,$4,NOW())`,
          ['Income', desc, amountPaidNow, 'Bar Course Income']
        );
      }
    }

    // Calendar events for all sessions (calendar helper already try/catch)
    for (const row of created) {
      await makeCalEventFor(row);
    }

    // Email confirmation (overall course – info from first session)
    try {
      await sendAppointmentEmail({
        title: title,
        email: finalClientEmail,
        full_name: finalClientName,
        date: first.date,
        time: first.time,
        end_time: first.end_time,
        description: description,
        staff: assigned_staff || null,
        price: first.price,
        paid: first.paid,
        payment_method: payment_method || null,
      });
    } catch (e) {
      console.error('❌ sendAppointmentEmail (course) failed:', e?.message || e);
    }

    // Create payment link only if not fully paid (based on Class 1)
    let paymentLink = null;
    if (!first.paid && first.price > 0 && finalClientEmail) {
      paymentLink = await makePaymentLink(first.price);
    }

    return res.status(201).json({ appointment: first, allAppointments: created, paymentLink });

  } catch (err) {
    console.error("❌ Error saving appointment:", err);
    res.status(500).json({ error: "Failed to save appointment.", details: err.message });
  }
});


// List gigs that have NO attendance recorded yet (last 3 by date/time)
app.get('/gigs/unattended', async (req, res) => {
  try {
    const { q } = req.query; // optional
    const params = [];
    let whereSearch = '';

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      whereSearch = `
        AND (
          g.event_type ILIKE $${params.length}
          OR g.client ILIKE $${params.length}
          OR g.location ILIKE $${params.length}
        )
      `;
    }

    const sql = `
      SELECT
        g.id,
        g.event_type AS title,
        g.client       AS client_name,
        g.date::text   AS date,
        g."time"::text AS time,
        g.location
      FROM gigs g
      WHERE NOT EXISTS (
        SELECT 1 FROM gigattendance ga WHERE ga.gig_id = g.id
      )
      ${whereSearch}
      ORDER BY g.date DESC, g."time" DESC
      LIMIT 3;
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ /gigs/unattended failed', err);
    res.status(500).json({ error: 'Failed to load unattended gigs' });
  }
});

// 3 most recent past appointments + 2 most recent upcoming appointments
app.get('/appointments/unattended', async (req, res) => {
  try {
    const pastSql = `
      SELECT
        a.id,
        a.title,
        COALESCE(c.full_name, 'No Client') AS client_name,
        to_char(a.date, 'YYYY-MM-DD') AS date,
        to_char(COALESCE(a."time",'00:00'::time), 'HH24:MI:SS') AS time,
        '1030 NW 200th Terrace Miami, FL 33169' AS location
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE (a.date + COALESCE(a."time",'00:00'::time)) < (now() AT TIME ZONE 'America/New_York')
      ORDER BY a.date DESC, a."time" DESC
      LIMIT 3;
    `;

    const upcomingSql = `
      SELECT
        a.id,
        a.title,
        COALESCE(c.full_name, 'No Client') AS client_name,
        to_char(a.date, 'YYYY-MM-DD') AS date,
        to_char(COALESCE(a."time",'00:00'::time), 'HH24:MI:SS') AS time,
        '1030 NW 200th Terrace Miami, FL 33169' AS location
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE (a.date + COALESCE(a."time",'00:00'::time)) >= (now() AT TIME ZONE 'America/New_York')
      ORDER BY a.date ASC, a."time" ASC
      LIMIT 2;
    `;

    const past = await pool.query(pastSql);
    const upcoming = await pool.query(upcomingSql);

    res.json([...past.rows, ...upcoming.rows]);
  } catch (err) {
    console.error('❌ /appointments/unattended failed', err);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// Past + upcoming gigs (regardless of attendance)
app.get('/gigs/unattended-mix', async (req, res) => {
  try {
    const pastLimit = Math.min(parseInt(req.query.past || '25', 10) || 25, 100);
    const upcomingLimit = Math.min(parseInt(req.query.upcoming || '10', 10) || 10, 100);

    const pastSql = `
      SELECT
        g.id,
        g.event_type AS title,
        g.client AS client_name,
        to_char(g.date, 'YYYY-MM-DD') AS date,
        to_char(COALESCE(g."time",'00:00'::time), 'HH24:MI:SS') AS time,
        g.location
      FROM gigs g
      WHERE (g.date + COALESCE(g."time",'00:00'::time)) < (now() AT TIME ZONE 'America/New_York')
      ORDER BY g.date DESC, g."time" DESC
      LIMIT $1;
    `;

    const upcomingSql = `
      SELECT
        g.id,
        g.event_type AS title,
        g.client AS client_name,
        to_char(g.date, 'YYYY-MM-DD') AS date,
        to_char(COALESCE(g."time",'00:00'::time), 'HH24:MI:SS') AS time,
        g.location
      FROM gigs g
      WHERE (g.date + COALESCE(g."time",'00:00'::time)) >= (now() AT TIME ZONE 'America/New_York')
      ORDER BY g.date ASC, g."time" ASC
      LIMIT $1;
    `;

    const past = await pool.query(pastSql, [pastLimit]);
    const upcoming = await pool.query(upcomingSql, [upcomingLimit]);

    res.json([...past.rows, ...upcoming.rows]);
  } catch (err) {
    console.error('❌ /gigs/unattended-mix failed', err);
    res.status(500).json({ error: 'Failed to load gigs' });
  }
});

// GET /api/users/:id/payment-details  (tolerant of multiple column names)
app.get('/api/users/:id/payment-details', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id, username, full_name,

        -- primary columns
        preferred_payment_method,
        payment_method,
        payment_details,

        -- common alternates people use
        cash_app, cashapp, cashtag,
        zelle, zelle_email, zelle_phone
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = rows[0];

    // derive method & details from whatever columns you actually have filled
    const methodRaw =
      u.preferred_payment_method ||
      u.payment_method ||
      (u.cashtag || u.cashapp || u.cash_app ? 'Cash App' :
       (u.zelle || u.zelle_email || u.zelle_phone ? 'Zelle' : null));

    const detailsRaw =
      u.payment_details ||
      u.cashtag || u.cashapp || u.cash_app ||
      u.zelle || u.zelle_email || u.zelle_phone || null;

    const method = (methodRaw || '').toString().trim();
    const details = (detailsRaw || '').toString().trim();

    if (!method || !details) {
      return res.status(400).json({
        error: 'Missing payment details',
        message: 'Add a method and details for this user to enable one-click pay.',
        debug: {
          methodFound: !!methodRaw,
          detailsFound: !!detailsRaw
        }
      });
    }

    return res.json({
      user_id: u.id,
      username: u.username,
      full_name: u.full_name,
      preferred_payment_method: method,
      payment_details: details
    });
  } catch (e) {
    console.error('❌ /api/users/:id/payment-details failed:', e);
    return res.status(500).json({ error: 'Server error fetching payment details' });
  }
});

// Update appointment attendance times (edit)
app.patch('/appointments/:appointmentId/attendance/:attendanceId', async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  const attendanceId = Number(req.params.attendanceId);

  // Frontend should send ISO strings or null:
  // { check_in_time: "2025-12-17T23:10:00.000Z", check_out_time: "2025-12-17T23:45:00.000Z" }
  const { check_in_time, check_out_time } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE appointmentattendance
      SET
        check_in_time  = $1,
        check_out_time = $2
      WHERE id = $3 AND appointment_id = $4
      RETURNING *;
      `,
      [check_in_time || null, check_out_time || null, attendanceId, appointmentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Attendance record not found for that appointment' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to update appointment attendance', err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

app.get('/appointments/bartending-course', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, client_id, date, time, end_time, description, price
      FROM appointments
      WHERE title ILIKE '%Bartending Course%'
      ORDER BY date, time
    `);

    res.status(200).json({ appointments: result.rows });
  } catch (error) {
    console.error('❌ Error fetching Bartending Course appointments:', error);
    res.status(500).json({ error: 'Failed to load Bartending Course roster' });
  }
});

// ===============================
// BARTENDING COURSE ATTENDANCE
// Fixes sign-out not working by:
// 1) Using a deterministic inquiry match (ORDER BY created_at DESC)
// 2) Using ILIKE with wildcards for name matching
// 3) Preferring email matches over name matches
// 4) Using NY time consistently for both sign-in and sign-out
// ===============================

// POST /api/bartending-course/:userId/sign-in
app.post('/api/bartending-course/:userId/sign-in', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1) Get the user by ID
    const userRes = await pool.query(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const userName = (user.name || user.username || '').trim();
    const userEmail = (user.email || '').trim();

    // 2) Find the most recent matching inquiry (prefer email; fallback to name)
    let inquiryRes = await pool.query(
      `
      SELECT id
      FROM bartending_course_inquiries
      WHERE (email IS NOT NULL AND email <> '' AND email = $1)
         OR (full_name IS NOT NULL AND full_name <> '' AND full_name ILIKE ('%' || $2 || '%'))
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT 1
      `,
      [userEmail, userName]
    );

    // 3) If none, auto-create one
    if (inquiryRes.rowCount === 0) {
      inquiryRes = await pool.query(
        `
        INSERT INTO bartending_course_inquiries (full_name, email, created_at)
        VALUES ($1, $2, NOW())
        RETURNING id
        `,
        [userName || 'Unknown', userEmail || null]
      );
    }

    const inquiryId = inquiryRes.rows[0].id;

    // 4) Insert attendance with inquiryId using NY time
    await pool.query(
      `
      INSERT INTO bartending_course_attendance (student_id, sign_in_time)
      VALUES ($1, (NOW() AT TIME ZONE 'America/New_York')::timestamptz)
      `,
      [inquiryId]
    );

    res.json({ message: 'Student signed in successfully.', inquiryId });
  } catch (err) {
    console.error('❌ Error signing in student:', err);
    res.status(500).json({ error: 'Failed to sign in student.' });
  }
});

// POST /api/bartending-course/:userId/sign-out
app.post('/api/bartending-course/:userId/sign-out', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1) Get user
    const userRes = await pool.query(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const userName = (user.name || user.username || '').trim();
    const userEmail = (user.email || '').trim();

    // 2) Find the most recent matching inquiry (same logic as sign-in)
    const inquiryRes = await pool.query(
      `
      SELECT id
      FROM bartending_course_inquiries
      WHERE (email IS NOT NULL AND email <> '' AND email = $1)
         OR (full_name IS NOT NULL AND full_name <> '' AND full_name ILIKE ('%' || $2 || '%'))
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT 1
      `,
      [userEmail, userName]
    );

    if (inquiryRes.rowCount === 0) {
      return res.status(404).json({ error: 'No linked inquiry found for this user' });
    }
    const inquiryId = inquiryRes.rows[0].id;

    // 3) Find the most recent open session for that inquiryId
    const attendanceRes = await pool.query(
      `
      SELECT id, sign_in_time
      FROM bartending_course_attendance
      WHERE student_id = $1 AND sign_out_time IS NULL
      ORDER BY sign_in_time DESC
      LIMIT 1
      `,
      [inquiryId]
    );

    if (attendanceRes.rowCount === 0) {
      return res.status(404).json({ error: 'No open session found to sign out' });
    }

    const attendance = attendanceRes.rows[0];

    // 4) Close it using NY time + compute hours
    const signOutRes = await pool.query(
      `SELECT (NOW() AT TIME ZONE 'America/New_York')::timestamptz AS sign_out_time`
    );
    const signOut = signOutRes.rows[0].sign_out_time;

    const hours =
      (new Date(signOut).getTime() - new Date(attendance.sign_in_time).getTime()) /
      (1000 * 60 * 60);

    await pool.query(
      `
      UPDATE bartending_course_attendance
      SET sign_out_time = $1, session_hours = $2
      WHERE id = $3
      `,
      [signOut, hours, attendance.id]
    );

    res.json({ message: 'Signed out successfully.', hours: Number(hours).toFixed(2) });
  } catch (err) {
    console.error('❌ Error signing out student:', err);
    res.status(500).json({ error: 'Failed to sign out student.' });
  }
});


// GET /api/bartending-course/user-attendance?userId=#
app.get('/api/bartending-course/user-attendance', async (req, res) => {
  const { userId } = req.query;
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const u = await pool.query(
      `SELECT id, email, username, name FROM users WHERE id = $1`,
      [userId]
    );
    if (u.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const user = u.rows[0];

    const i = await pool.query(
      `SELECT id
         FROM bartending_course_inquiries
        WHERE (LOWER(email) = LOWER($1) AND $1 IS NOT NULL)
           OR (LOWER(full_name) = LOWER($2) AND $2 IS NOT NULL)
        LIMIT 1`,
      [user.email || null, (user.name || user.username || '').toLowerCase() || null]
    );

    if (i.rowCount === 0) return res.json([]);

    const inquiryId = i.rows[0].id;

    const sessions = await pool.query(
      `SELECT id, student_id, sign_in_time, sign_out_time, session_hours
         FROM bartending_course_attendance
        WHERE student_id = $1
        ORDER BY sign_in_time DESC`,
      [inquiryId]
    );

    res.json(sessions.rows);
  } catch (err) {
    console.error('❌ Error loading user attendance:', err);
    res.status(500).json({ error: 'Failed to load attendance.' });
  }
});

// (optional, for a summary/My Hours page)
// GET /api/bartending-course/user-hours?userId=#
app.get('/api/bartending-course/user-hours', async (req, res) => {
  const { userId } = req.query;
  if (!userId || isNaN(Number(userId))) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const u = await pool.query(
      `SELECT id, email, username, name FROM users WHERE id = $1`,
      [userId]
    );
    if (u.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const user = u.rows[0];

    const i = await pool.query(
      `SELECT id
         FROM bartending_course_inquiries
        WHERE (LOWER(email) = LOWER($1) AND $1 IS NOT NULL)
           OR (LOWER(full_name) = LOWER($2) AND $2 IS NOT NULL)
        LIMIT 1`,
      [user.email || null, (user.name || user.username || '').toLowerCase() || null]
    );
    if (i.rowCount === 0) return res.json({ totalHours: 0, sessions: [] });

    const inquiryId = i.rows[0].id;

    const total = await pool.query(
      `SELECT COALESCE(SUM(session_hours), 0)::float AS total_hours
         FROM bartending_course_attendance
        WHERE student_id = $1`,
      [inquiryId]
    );

    const sessions = await pool.query(
      `SELECT id, sign_in_time, sign_out_time, session_hours
         FROM bartending_course_attendance
        WHERE student_id = $1
        ORDER BY sign_in_time DESC`,
      [inquiryId]
    );

    res.json({
      totalHours: Number(total.rows[0].total_hours || 0),
      sessions: sessions.rows,
    });
  } catch (err) {
    console.error('❌ Error loading hours:', err);
    res.status(500).json({ error: 'Failed to load hours.' });
  }
});


// PATCH /api/bartending-course/:attendanceId/attendance
app.patch('/api/bartending-course/:attendanceId/attendance', async (req, res) => {
  const { attendanceId } = req.params;
  const { check_in_time, check_out_time } = req.body;

  try {
    const result = await pool.query(`
      UPDATE bartending_course_attendance
      SET 
        sign_in_time = $1::timestamptz,
        sign_out_time = $2::timestamptz,
        session_hours = CASE 
          WHEN $1 IS NOT NULL AND $2 IS NOT NULL 
          THEN ROUND(EXTRACT(EPOCH FROM ($2::timestamptz - $1::timestamptz)) / 3600, 2)
          ELSE NULL
        END
      WHERE id = $3
      RETURNING *;
    `, [check_in_time, check_out_time, attendanceId]);

    res.json({ message: "Updated attendance", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating attendance:", err);
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

// GET /api/bartending-course/attendance
app.get('/api/bartending-course/attendance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM bartending_course_attendance
      ORDER BY sign_in_time DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});


// Get all appointments
app.get('/appointments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                client_id,
                title,
                date,
                time,
                end_time,
                '1030 NW 200th Terrace Miami, FL 33169' AS location,
                description,
                paid,
                assigned_staff,
                price,
                'appointment' AS type
            FROM appointments
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.patch('/appointments/:id', async (req, res) => {
    const appointmentId = req.params.id;
    const {
        title,
        description,
        date,
        time,
        end_time,
        client_id,
        assigned_staff,
        skipEmail = false
    } = req.body;

    try {
        const existingResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (existingResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        const existingAppointment = existingResult.rows[0];

        const result = await pool.query(
            `UPDATE appointments SET title = $1, client_id = $2, date = $3, time = $4,
             end_time = $5, description = $6, assigned_staff = $7 WHERE id = $8 RETURNING *`,
            [title, client_id, date, time, end_time, description, assigned_staff, appointmentId]
        );

        const updatedAppointment = result.rows[0];

        const emailTriggerFields = ['title', 'date', 'time', 'end_time', 'description'];
        const meaningfulChange = emailTriggerFields.some(field =>
            updatedAppointment[field]?.toString() !== existingAppointment[field]?.toString()
        );

        if (!skipEmail && meaningfulChange) {
            const clientRes = await pool.query('SELECT email, full_name FROM clients WHERE id = $1', [client_id]);
            if (clientRes.rowCount === 0) {
                return res.status(400).json({ error: 'Client not found' });
            }

            const client = clientRes.rows[0];

            const rescheduleDetails = {
                title: updatedAppointment.title,
                email: client.email,
                full_name: client.full_name,
                old_date: existingAppointment.date,
                old_time: existingAppointment.time,
                new_date: updatedAppointment.date,
                new_time: updatedAppointment.time,
                end_time: updatedAppointment.end_time,
                description: updatedAppointment.description,
                staff: updatedAppointment.assigned_staff,
            };

            await sendRescheduleEmail(rescheduleDetails);
        }

        return res.status(200).json(updatedAppointment);
    } catch (error) {
        console.error('❌ Error updating appointment:', error);
        return res.status(500).json({ error: 'Failed to update appointment' });
    }
});

app.patch('/api/gigs/:gigId/attendance/:userId/pay', async (req, res) => {
  const { gigId, userId } = req.params;

  try {
    await pool.query(
      `UPDATE GigAttendance
       SET is_paid = TRUE
       WHERE gig_id = $1 AND user_id = $2`,
      [gigId, userId]
    );
    res.status(200).json({ message: 'Gig payment marked as paid' });
  } catch (err) {
    console.error('❌ Error updating gig payment status:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

app.patch('/appointments/:apptId/attendance/:userId/pay', async (req, res) => {
  const { apptId, userId } = req.params;

  try {
    await pool.query(
      `UPDATE AppointmentAttendance
       SET is_paid = TRUE
       WHERE appointment_id = $1 AND user_id = $2`,
      [apptId, userId]
    );
    res.status(200).json({ message: 'Appointment payment marked as paid' });
  } catch (err) {
    console.error('❌ Error updating appointment payment status:', err);
    res.status(500).json({ error: 'Failed to update appointment payment status' });
  }
});

// Get filtered appointments
app.get('/appointments/by-date', async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: "Date is required to fetch appointments." });
        }

        const appointments = await pool.query(
            `SELECT * FROM appointments WHERE date = $1`, 
            [date]
        );

        res.json(appointments.rows);
    } catch (error) {
        console.error("❌ Error fetching appointments by date:", error);
        res.status(500).json({ error: "Failed to fetch appointments." });
    }
});

app.get('/blocked-times', async (req, res) => {
    try {
      const { date } = req.query;
  
      if (!date) {
        return res.status(400).json({ error: "Date is required to fetch blocked times." });
      }
  
      // ✅ Get full rows from schedule_blocks (we need time_slot + label)
      const blockedTimesResult = await pool.query(
        `SELECT time_slot, label FROM schedule_blocks WHERE date = $1`,
        [date]
      );
  
      // ✅ Format each as full object
      const blockedTimes = blockedTimesResult.rows.map(row => ({
        timeSlot: row.time_slot,
        label: row.label
      }));
  
      // ✅ Also fetch booked appointments (optional, if needed here)
      const bookedTimesResult = await pool.query(
        `SELECT time FROM appointments WHERE date = $1`,
        [date]
      );
      const bookedTimes = bookedTimesResult.rows.map(row => row.time);
  
      // ✅ Just return blocked entries with full data
      res.json({ blockedTimes });
  
    } catch (error) {
      console.error("❌ Error fetching blocked times:", error);
      res.status(500).json({ error: "Failed to fetch blocked times." });
    }
  });

app.delete('/appointments/:id', async (req, res) => {
    const appointmentId = req.params.id;

    try {
        // Fetch the appointment details before deleting
        const appointmentResult = await pool.query(
            `SELECT * FROM appointments WHERE id = $1`,
            [appointmentId]
        );

        if (appointmentResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = appointmentResult.rows[0];

        // Fetch the client's email and full name
        const clientResult = await pool.query(
            `SELECT email, full_name FROM clients WHERE id = $1`,
            [appointment.client_id]
        );

        if (clientResult.rowCount === 0) {
            return res.status(400).json({ error: 'Client not found' });
        }

        const client = clientResult.rows[0];

        // Delete the appointment
        await pool.query(
            `DELETE FROM appointments WHERE id = $1`,
            [appointmentId]
        );

        // Send cancellation email
        await sendCancellationEmail({
            title: appointment.title,
            email: client.email,
            full_name: client.full_name,
            date: appointment.date,
            time: appointment.time,
            end_time: appointment.end_time,
            description: appointment.description,
        });

        res.status(200).json({ message: 'Appointment successfully deleted' });
    } catch (error) {
        console.error('Error deleting appointment:', error.message);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});

//Availability
// Endpoint to get available time slots
app.get('/schedule/availability', async (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    try {
        // Fetch blocked times for the given date
        const blockedTimesResult = await pool.query(
            `SELECT time_slot FROM schedule_blocks WHERE time_slot LIKE $1`,
            [`${date}-%`]
        );
        const blockedTimes = blockedTimesResult.rows.map(row => row.time_slot);

        // Fetch booked appointments for the given date
        const appointmentsResult = await pool.query(
            `SELECT time FROM appointments WHERE date = $1`,
            [date]
        );
        const bookedTimes = appointmentsResult.rows.map(row => `${date}-${row.time}`);

        // Define available slots (assuming time slots from 9 AM - 6 PM)
        const allSlots = Array.from({ length: 10 }, (_, i) => `${date}-${9 + i}`);

        // Filter available slots
        const availableSlots = allSlots.filter(slot => !blockedTimes.includes(slot) && !bookedTimes.includes(slot));

        res.json({ availableSlots });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Failed to fetch available time slots' });
    }
});

app.get('/admin-availability', async (req, res) => {
    try {
        console.log("📥 Fetching all availability for admin...");

        const result = await pool.query("SELECT * FROM weekly_availability ORDER BY weekday, start_time");

        console.log("✅ Sending Admin Availability Data:", result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error fetching admin availability:", error);
        res.status(500).json({ success: false, error: "Failed to fetch availability for admin." });
    }
});

app.post("/availability", async (req, res) => {
    const { weekday, start_time, end_time, appointment_type } = req.body;

    console.log("📥 Received request:", req.body); // Debugging log

    if (!weekday || !start_time || !end_time || !appointment_type) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO weekly_availability (weekday, start_time, end_time, appointment_type) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [weekday, start_time, end_time, appointment_type]
        );

        console.log("✅ Successfully added:", result.rows[0]); // Debugging log
        res.status(201).json({ success: true, availability: result.rows[0] });
    } catch (error) {
        console.error("❌ Error adding availability:", error);
        res.status(500).json({ error: "Failed to add availability." });
    }
});

app.get('/availability', async (req, res) => {
    try {
      const { weekday, appointmentType, date } = req.query;
  
      console.log(`📥 Fetching availability - Weekday: "${weekday}", Appointment Type: "${appointmentType}", Date: "${date}"`);
  
      if (!weekday || !appointmentType || !date) {
        return res.status(400).json({ error: "Weekday, appointmentType, and date are required." });
      }
  
      // Fetch slots from weekly availability
      const availabilityResult = await pool.query(`
        SELECT * FROM weekly_availability
        WHERE LOWER(weekday) = LOWER($1)
        AND LOWER(appointment_type) = LOWER($2)
        ORDER BY start_time
      `, [weekday.trim(), appointmentType.trim()]);
  
      if (availabilityResult.rowCount === 0) {
        console.log("⚠️ No weekly availability found.");
        return res.json([]);
      }
  
      const availableSlots = availabilityResult.rows;
  
      // Fetch booked appointments for the selected date
      const appointmentsResult = await pool.query(`
        SELECT time, end_time FROM appointments
        WHERE date = $1
      `, [date]);
  
      const bookedAppointments = appointmentsResult.rows;
  
      const normalizeTime = (time) => time.length === 5 ? `${time}:00` : time;
      const getMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };
  
      const filteredSlots = availableSlots.filter(slot => {
        const slotStartMin = getMinutes(normalizeTime(slot.start_time));
        const slotEndMin = getMinutes(normalizeTime(slot.end_time));
  
        const overlaps = bookedAppointments.some(app => {
          const bookedStartMin = getMinutes(normalizeTime(app.time));
          const bookedEndMin = getMinutes(normalizeTime(app.end_time));
  
          return (
            (slotStartMin < bookedEndMin && slotEndMin > bookedStartMin) // Full overlap check
          );
        });
  
        return !overlaps; // Only keep slots that don't overlap
      });
  
      console.log("✅ Final available slots:", filteredSlots);
      res.json(filteredSlots);
  
    } catch (error) {
      console.error("❌ Error fetching availability:", error);
      res.status(500).json({ error: "Failed to fetch availability." });
    }
  });
  
// Add to profits table
app.post('/profits', async (req, res) => {
  const { category, description, amount, type } = req.body;

  try {
    await pool.query(
      'INSERT INTO profits (category, description, amount, type, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [category, description, amount, type]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('❌ Error inserting into profits:', error);
    res.status(500).json({ error: 'Failed to insert profit' });
  }
});

app.get('/api/profits', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        category,
        description,
        amount,
        type,
        created_at,
        paid_at,
        quote_id,
        gross_amount,
        fee_amount,
        net_amount,
        payment_method,
        processor,
        processor_txn_id,
        appointment_id,
        client_email
      FROM profits
      ORDER BY COALESCE(paid_at, created_at) DESC;
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching profits data:', error);
    res.status(500).json({ error: 'Failed to fetch profits data.' });
  }
});

app.delete('/profits', async (req, res) => {
  const { description } = req.body;

  try {
    await pool.query('DELETE FROM profits WHERE description = $1', [description]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting from profits:', error);
    res.status(500).json({ error: 'Failed to delete profit' });
  }
});

app.post('/api/log-profit', async (req, res) => {
  const { full_name, email, amount, type, paymentPlan } = req.body;

  try {
    await pool.query(`
      INSERT INTO profits (category, description, amount, type)
      VALUES ($1, $2, $3, $4)
    `, [
      "Income",
      `Payment from ${full_name} (${paymentPlan}) for ${type}`,
      amount,
      type
    ]);

    res.status(200).json({ message: "Profit logged successfully" });
  } catch (err) {
    console.error("❌ Error logging profit:", err);
    res.status(500).json({ error: "Failed to log profit" });
  }
});

app.delete("/availability/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(`DELETE FROM availability WHERE id = $1`, [id]);
        res.json({ success: true, message: "Availability removed successfully" });
    } catch (error) {
        console.error("❌ Error deleting availability:", error);
        res.status(500).json({ error: "Failed to delete availability" });
    }
});

app.post('/sync-old-gigs', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM gigs ORDER BY date ASC`);
    const gigs = result.rows;
    const synced = [];

    for (const gig of gigs) {
      const { event_type, description, date, time, duration } = gig;

      if (!date || !time || !duration || !event_type) {
        console.warn('⚠️ Missing required fields:', gig);
        continue;
      }

      const formattedDate = new Date(date).toISOString().split('T')[0];
      const rawStart = String(time).trim();
      const startDateTime = new Date(`${formattedDate}T${rawStart}`);

      if (isNaN(startDateTime)) {
        console.warn('⚠️ Invalid start time:', { date, rawStart });
        continue;
      }

      const hours = parseFloat(duration);
      if (isNaN(hours)) {
        console.warn('⚠️ Invalid duration:', duration);
        continue;
      }

      const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);

      console.log('🟢 Preparing event:', {
        summary: event_type,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      });

      const event = {
  summary: event_type,
  description: description || gig.position || '',

  location: gig.location || '', // ✅ Add this line

  start: {
    dateTime: startDateTime.toISOString(),
    timeZone: 'America/New_York',
  },
  end: {
    dateTime: endDateTime.toISOString(),
    timeZone: 'America/New_York',
  },
};


      try {
        const response = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          resource: event,
        });
        console.log('✅ Event inserted:', response.data.id);
        synced.push(response.data.id);
      } catch (err) {
        console.error(`❌ Failed to insert gig: ${event_type}`, err.message);
      }
    }

    res.json({ success: true, message: `Synced ${synced.length} gigs to Google Calendar.` });
  } catch (err) {
    console.error('❌ Gig sync failed:', err.stack || err);
    res.status(500).json({ error: 'Gig sync failed' });
  }
});

// Add this route in app.js or routes file
app.post('/admin/fix-appointment-costs', async (req, res) => {
  try {
    const apptRes = await pool.query(`
      SELECT * FROM appointments 
      WHERE title ILIKE '%Mix N Sip%' OR title ILIKE '%Craft%'
    `);
    const appointments = apptRes.rows;

    const addonPrices = {
      'Customize Apron': 10,
      'Mimosa Bar': 50,
      'Cocktail Tower': 65,
      'Floral Ice Cubes': 15
    };

    for (const appt of appointments) {
      const clientResult = await pool.query(`SELECT email FROM clients WHERE id = $1`, [appt.client_id]);
      const clientEmail = clientResult.rows[0]?.email;
      if (!clientEmail) continue;

      const apptDate = new Date(appt.date).toISOString().split('T')[0];
      let guestCount = 1;
      let formResult;
      let basePrice = 0;

      if (appt.title.includes('Mix N Sip')) {
        basePrice = 125;
        formResult = await pool.query(`
          SELECT * FROM mix_n_sip 
          WHERE email = $1 AND created_at <= $2 
          ORDER BY created_at DESC LIMIT 1
        `, [clientEmail, apptDate]);
      } else {
        basePrice = 85;
        formResult = await pool.query(`
          SELECT * FROM craft_cocktails 
          WHERE email = $1 AND created_at <= $2 
          ORDER BY created_at DESC LIMIT 1
        `, [clientEmail, apptDate]);
      }

      if (formResult.rowCount === 0) {
        console.warn(`No matching form for ${clientEmail} — skipping`);
        continue;
      }

      const form = formResult.rows[0];
      guestCount = Number.isInteger(parseInt(form.guest_count)) ? parseInt(form.guest_count) : 1;

      let addons = [];
      try {
        const rawAddons = form.addons || '[]';
        const parsed = typeof rawAddons === 'string' ? JSON.parse(rawAddons) : rawAddons;
        addons = Array.isArray(parsed) ? parsed : JSON.parse(parsed);
      } catch (e) {
        console.error(`Failed to parse addons for ${clientEmail} on appointment ID ${appt.id}`, e);
        addons = [];
      }

      const addonTotal = addons.reduce((sum, addonName) => {
        const name = typeof addonName === 'string' ? addonName : String(addonName?.name || '');
        const price = addonPrices[name] || 0;
        return sum + price;
      }, 0);

      const total = (basePrice * guestCount) + addonTotal;

      if (isNaN(total)) {
        console.warn(`⚠️ Skipped updating appointment ID ${appt.id} due to invalid total calculation.`);
        continue;
      }

      await pool.query(`UPDATE appointments SET total_cost = $1 WHERE id = $2`, [total, appt.id]);
    }

    res.json({ success: true, updated: appointments.length });
  } catch (err) {
    console.error('Error fixing appointment costs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Campaign Scheduler (runs every minute)
cron.schedule("* * * * *", async () => {
  try {
    // pick campaigns due now
    const dueRes = await pool.query(
      `
      SELECT *
      FROM scheduled_campaigns
      WHERE status = 'scheduled'
        AND scheduled_send_at <= NOW()
      ORDER BY scheduled_send_at ASC
      LIMIT 3
      `
    );

    if (dueRes.rowCount === 0) return;

    for (const camp of dueRes.rows) {
      // lock this campaign
      await pool.query(
        `UPDATE scheduled_campaigns SET status='sending' WHERE id=$1 AND status='scheduled'`,
        [camp.id]
      );

      try {
        // build recipients list (reuse your existing logic)
        let clients = [];
        if (camp.send_to === "clients" || camp.send_to === "both") {
          const cRes = await pool.query(
            `SELECT full_name, email FROM clients WHERE email IS NOT NULL AND trim(email) <> ''`
          );
          clients = clients.concat(cRes.rows);
        }

        // optional: add staff later if you want
        // if (camp.send_to === "staff" || camp.send_to === "both") { ... }

        // rebuild imageFile shape expected by sendEmailCampaign
        let imageFile = null;
        if (camp.image_base64 && camp.image_name) {
          imageFile = {
            originalname: camp.image_name,
            buffer: Buffer.from(camp.image_base64, "base64"),
          };
        }

        await sendEmailCampaign(clients, camp.subject, camp.message, imageFile);

        await pool.query(
          `UPDATE scheduled_campaigns
             SET status='sent', sent_at=NOW(), last_error=NULL
           WHERE id=$1`,
          [camp.id]
        );
      } catch (err) {
        await pool.query(
          `UPDATE scheduled_campaigns
             SET status='failed', last_error=$2
           WHERE id=$1`,
          [camp.id, String(err?.message || err)]
        );
      }
    }
  } catch (err) {
    console.error("❌ Scheduler error:", err?.message || err);
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all route (NON-API only)
app.get(/^\/(?!api\/).*/, (req, res) => {
  console.log(`Serving index.html for route ${req.url}`);
  res.sendFile(
    path.join(__dirname, '../frontend/build', 'index.html'),
    (err) => {
      if (err) {
        res.status(500).send(err);
      }
    }
  );
});


// Export app for server startup
export default app;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});