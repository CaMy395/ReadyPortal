// backend/app.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { Client } from 'square';
import crypto from 'crypto';
import moment from 'moment-timezone';
import path from 'path'; // Import path to handle static file serving
import { fileURLToPath } from 'url'; // Required for ES module __dirname
import bcrypt from 'bcryptjs';
import pool from './db.js'; // Import the centralized pool connection
import axios from "axios"; // ✅ Import axios
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import {
    sendQuoteEmail, generateQuotePDF,sendGigEmailNotification,sendGigUpdateEmailNotification,sendRegistrationEmail,sendResetEmail,sendIntakeFormEmail,sendCraftsFormEmail,sendMixNSipFormEmail,sendPaymentEmail,sendAppointmentEmail,sendRescheduleEmail,sendBartendingInquiryEmail,sendBartendingClassesEmail,sendCancellationEmail, sendEmailCampaign
} from './emailService.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import 'dotenv/config';
import { google } from 'googleapis';
import {WebSocketServer} from 'ws';
import http from 'http';
import appointmentTypes from '../frontend/src/data/appointmentTypes.json' assert { type: 'json' };
import chatbotRouter from './routes/chatbot.js'; 

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
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        'https://www.googleapis.com/auth/drive.file', // existing
    ],
});


const drive = google.drive({ version: 'v3', auth });
const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

// Function to upload file to Google Drive
async function uploadToGoogleDrive(filePath, fileName, mimeType) {
    const fileMetadata = {
        name: fileName,
        parents: ['1n_Jr7go5XHStzot7FNfWcIhUjmmQ0OXq'], // Replace with your folder ID
    };

    const media = {
        mimeType: mimeType, // Use the passed mimeType
        body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    return response.data;
}

async function addEventToGoogleCalendar({ summary, description, startDateTime, endDateTime }) {
    const event = {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: 'America/New_York' },
        end: { dateTime: endDateTime, timeZone: 'America/New_York' },
    };

    const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        // You can use a specific calendar ID if desired
        resource: event,
    });

    return response.data;
}

app.post('/api/upload-w9', upload.single('w9File'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.join(__dirname, req.file.path);
        const fileName = req.file.originalname;

        // Upload to Google Drive
        const driveResponse = await uploadToGoogleDrive(filePath, fileName, req.file.mimetype);

        // Remove the temporary file
        fs.unlinkSync(filePath);

        console.log('File uploaded to Google Drive:', driveResponse);

        res.status(200).json({
            message: 'W-9 uploaded successfully',
            driveId: driveResponse.id,
            driveLink: driveResponse.webViewLink,
        });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// File upload route for ID
app.post('/api/upload-id', upload.single('idFile'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.join(__dirname, req.file.path);
        const fileName = req.file.originalname;

        // Upload to Google Drive
        const driveResponse = await uploadToGoogleDrive(filePath, fileName, req.file.mimetype);

        // Remove the temporary file
        fs.unlinkSync(filePath);

        console.log('File uploaded to Google Drive:', driveResponse);

        res.status(200).json({
            message: 'ID uploaded successfully',
            driveId: driveResponse.id,
            driveLink: driveResponse.webViewLink,
        });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'Failed to upload ID file' });
    }
});


// Test route to check server health
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Server is running and healthy!' });
});

// POST endpoint to add a new gig
app.post('/gigs', async (req, res) => {
  const {
    client,
    event_type,
    date,
    time,
    duration,
    location,
    position,
    gender,
    pay,
    client_payment,
    payment_method,
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
    establishment
  } = req.body;

  try {
    const query = `
      INSERT INTO gigs (
        client, event_type, date, time, duration, location, position, gender, pay,
        client_payment, payment_method, needs_cert, confirmed, staff_needed, claimed_by,
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
      event_type,
      date,
      time,
      duration,
      location,
      position,
      gender,
      pay,
      client_payment,
      payment_method,
      needs_cert ?? false,
      confirmed ?? false,
      staff_needed,
      Array.isArray(claimed_by) ? `{${claimed_by.join(',')}}` : '{}',
      backup_needed,
      Array.isArray(backup_claimed_by) ? `{${backup_claimed_by.join(',')}}` : '{}',
      latitude ?? null,
      longitude ?? null,
      attire ?? null,
      indoor ?? false,
      approval_needed ?? false,
      on_site_parking ?? false,
      local_parking ?? 'N/A',
      NDA ?? false,
      establishment ?? 'home'
    ];

    const result = await pool.query(query, values);
    const newGig = result.rows[0];
    console.log('Gig successfully added:', newGig);

    // ✅ Add to Google Calendar
    try {
      const formattedDate = new Date(newGig.date).toISOString().split('T')[0];
      const rawStart = String(newGig.time).trim();
      const startDateTime = new Date(`${formattedDate}T${rawStart}`);
      const hours = parseFloat(newGig.duration);
      const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);

      const event = {
        summary: newGig.event_type,
        description: newGig.position || '',
        location: newGig.location || '',
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
      };
      const calendarOAuth = google.calendar({ version: 'v3', auth: oAuth2Client });

      const calendarResponse = await calendarOAuth.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: event,
      });

      console.log('📅 Google Calendar event created for new gig:', calendarResponse.data.id);

      // OPTIONAL: Save the event ID for future sync support
      await pool.query(
        'UPDATE gigs SET google_event_id = $1 WHERE id = $2',
        [calendarResponse.data.id, newGig.id]
      );

    } catch (calendarErr) {
      console.error('❌ Failed to create Google Calendar event for gig:', calendarErr.message);
    }

    // ✅ Notify Users
    const usersResult = await pool.query('SELECT email FROM users');
    const users = usersResult.rows;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const emailPromises = users.map(async (user, index) => {
      await delay(index * 500);
      try {
        await sendGigEmailNotification(user.email, newGig);
        console.log(`Email sent to ${user.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error.message);
      }
    });

    await Promise.all(emailPromises);

    res.status(201).json(newGig);

  } catch (error) {
    console.error('Error adding gig:', error.message);
    res.status(500).json({ error: 'Failed to add gig', details: error.message });
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
        client_payment,
        payment_method,
    } = req.body;

    try {
        // Fetch the old gig details
        const oldGigResult = await pool.query('SELECT * FROM gigs WHERE id = $1', [gigId]);
        if (oldGigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }
        const oldGig = oldGigResult.rows[0];

        // Update the gig
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
                client_payment = $23,
                payment_method = $24
            WHERE id = $25
            RETURNING *`,
            [
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
                client_payment,
                payment_method,
                gigId,
            ]
        );

        if (updatedGigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }
        const updatedGig = updatedGigResult.rows[0];

        // Compare the fields and generate the update summary
        const updatedFields = [];
        for (const key in updatedGig) {
            if (oldGig[key] !== updatedGig[key]) {
                updatedFields.push({
                    field: key,
                    oldValue: oldGig[key],
                    newValue: updatedGig[key],
                });
            }
        }

        // Fetch all users to notify
        const usersResult = await pool.query('SELECT email FROM users WHERE email IS NOT NULL');
        const users = usersResult.rows;

        // Send update emails
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        for (const [index, user] of users.entries()) {
            if (!user.email) continue;

            await delay(index * 500); // Add a delay between emails
            try {
                await sendGigUpdateEmailNotification(user.email, oldGig, updatedGig);
                console.log(`Email sent to ${user.email}`);
            } catch (error) {
                console.error(`Error sending email to ${user.email}:`, error.message);
            }
        }

        res.status(200).json(updatedGig);
    } catch (error) {
        console.error('Error updating gig:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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



const GEOCODING_API_KEY = process.env.YOUR_GOOGLE_GEOCODING_API_KEY;

async function updateGigCoordinates() {
  try {
    const res = await pool.query('SELECT id, location FROM Gigs WHERE latitude IS NULL OR longitude IS NULL');
    const gigs = res.rows;

    for (const gig of gigs) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(gig.location)}&key=${GEOCODING_API_KEY}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status === 'OK') {
        const { lat, lng } = data.results[0].geometry.location;
        await pool.query('UPDATE Gigs SET latitude = $1, longitude = $2 WHERE id = $3', [lat, lng, gig.id]);
        console.log(`Updated Gig ID ${gig.id} with coordinates: (${lat}, ${lng})`);
        } else if (data.status === 'REQUEST_DENIED') {
        console.error(`Geocoding failed for Gig ID ${gig.id}: REQUEST_DENIED. Check your API key and billing setup.`);
      } else {  
        console.error(`Geocoding failed for Gig ID ${gig.id}: ${data.status}`);
      }
    }
  } catch (error) {
    console.error('Error updating gig coordinates:', error);
  } 
}

updateGigCoordinates();


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
    const { name, username, email, phone, position, preferred_payment_method, payment_details, password, role } = req.body;

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
            'INSERT INTO users (name, username, email, phone, position, preferred_payment_method, payment_details, password, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [name, username, email, phone, position, preferred_payment_method, payment_details, hashedPassword, role]
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

// GET /api/me
app.get('/api/me', async (req, res) => {
  try {
    const userIdFromAuth = req.user?.id; // future-proof
    const qId = req.query.id ? Number(req.query.id) : null;
    const qUsername = req.query.username || null;

    if (!userIdFromAuth && !qId && !qUsername) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const select = `
      SELECT id, username, email, name, role,
             COALESCE(w9_uploaded, FALSE) AS w9_uploaded,
             COALESCE(staff_terms_required, FALSE) AS staff_terms_required
      FROM users
    `;

    const { rows } = userIdFromAuth || qId
      ? await pool.query(`${select} WHERE id = $1 LIMIT 1`, [userIdFromAuth ?? qId])
      : await pool.query(`${select} WHERE username = $1 LIMIT 1`, [qUsername]);

    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('/api/me error:', e);
    res.status(500).json({ error: 'Failed to load user' });
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

// Example route for getting users
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users'); // Adjust the query as necessary
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server Error');
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

// PATCH endpoint to claim a gig
app.patch('/gigs/:id/claim', async (req, res) => {
    const gigId = req.params.id;
    const { username } = req.body; 
    try {
        const gigResult = await pool.query('SELECT claimed_by, staff_needed FROM gigs WHERE id = $1', [gigId]);
        if (gigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        const gig = gigResult.rows[0];
        const claimedCount = gig.claimed_by ? gig.claimed_by.length : 0;

        // Check if gig has already been fully claimed
        if (claimedCount >= gig.staff_needed) {
            return res.status(400).json({ error: 'Max staff claimed for this gig' });
        }

        // Check if the user already claimed the gig
        if (gig.claimed_by && gig.claimed_by.includes(username)) {
            return res.status(400).json({ error: 'User has already claimed this gig' });
        }

        // Add the user to the claimed_by array
        await pool.query(
            'UPDATE gigs SET claimed_by = array_append(claimed_by, $1) WHERE id = $2',
            [username, gigId]
        );

        // Return the updated gig information
        const updatedGigResult = await pool.query(`
            SELECT g.*, ARRAY_AGG(u.username) AS claimed_usernames 
            FROM gigs g 
            LEFT JOIN users u ON u.username = ANY(g.claimed_by)
            WHERE g.id = $1
            GROUP BY g.id
        `, [gigId]);

        res.json(updatedGigResult.rows[0]);
    } catch (error) {
        console.error('Error claiming gig:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH endpoint to claim a backup spot for a gig
app.patch('/gigs/:id/claim-backup', async (req, res) => {
    const gigId = req.params.id;
    const { username } = req.body; // Get the username from the request body

    try {
        const gigResult = await pool.query('SELECT backup_claimed_by, backup_needed FROM gigs WHERE id = $1', [gigId]);
        if (gigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        const gig = gigResult.rows[0];
        const backupClaimedCount = gig.backup_claimed_by ? gig.backup_claimed_by.length : 0;

        // Check if the backup spots have already been fully claimed
        if (backupClaimedCount >= gig.backup_needed) {
            return res.status(400).json({ error: 'Max backup staff claimed for this gig' });
        }

        // Check if the user has already claimed a backup spot
        if (gig.backup_claimed_by && gig.backup_claimed_by.includes(username)) {
            return res.status(400).json({ error: 'User has already claimed a backup spot for this gig' });
        }

        // Add the user to the backup_claimed_by array
        await pool.query(
            'UPDATE gigs SET backup_claimed_by = array_append(backup_claimed_by, $1) WHERE id = $2',
            [username, gigId]
        );

        // Return the updated gig information
        const updatedGigResult = await pool.query(`
            SELECT g.*, ARRAY_AGG(u.username) AS backup_claimed_usernames 
            FROM gigs g 
            LEFT JOIN users u ON u.username = ANY(g.backup_claimed_by)
            WHERE g.id = $1
            GROUP BY g.id
        `, [gigId]);

        res.json(updatedGigResult.rows[0]);
    } catch (error) {
        console.error('Error claiming backup for gig:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH endpoint to unclaim a gig
app.patch('/gigs/:id/unclaim', async (req, res) => {
    const gigId = req.params.id;
    const { username } = req.body; // Get the username from the request body

    try {
        const gigResult = await pool.query('SELECT claimed_by FROM gigs WHERE id = $1', [gigId]);
        if (gigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        const gig = gigResult.rows[0];

        // Check if the user has claimed the gig
        if (!gig.claimed_by || !gig.claimed_by.includes(username)) {
            return res.status(400).json({ error: 'User has not claimed this gig' });
        }

        // Remove the user from the claimed_by array
        await pool.query(
            'UPDATE gigs SET claimed_by = array_remove(claimed_by, $1) WHERE id = $2',
            [username, gigId]
        );

        // Return the updated gig information
        const updatedGigResult = await pool.query(`
            SELECT g.*, ARRAY_AGG(u.username) AS claimed_usernames 
            FROM gigs g 
            LEFT JOIN users u ON u.username = ANY(g.claimed_by)
            WHERE g.id = $1
            GROUP BY g.id
        `, [gigId]);

        res.json(updatedGigResult.rows[0]);
    } catch (error) {
        console.error('Error unclaiming gig:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.patch('/gigs/:id/unclaim-backup', async (req, res) => {
    const gigId = req.params.id;
    const { username } = req.body; // Get the username from the request body

    try {
        const gigResult = await pool.query('SELECT backup_claimed_by FROM gigs WHERE id = $1', [gigId]);
        if (gigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        const gig = gigResult.rows[0];

        // Check if the user has claimed a backup spot
        if (!gig.backup_claimed_by || !gig.backup_claimed_by.includes(username)) {
            return res.status(400).json({ error: 'User has not claimed a backup spot for this gig' });
        }

        // Remove the user from the backup_claimed_by array
        await pool.query(
            'UPDATE gigs SET backup_claimed_by = array_remove(backup_claimed_by, $1) WHERE id = $2',
            [username, gigId]
        );

        // Return the updated gig information
        const updatedGigResult = await pool.query(`
            SELECT g.*, ARRAY_AGG(u.username) AS backup_claimed_usernames 
            FROM gigs g 
            LEFT JOIN users u ON u.username = ANY(g.backup_claimed_by)
            WHERE g.id = $1
            GROUP BY g.id
        `, [gigId]);

        res.json(updatedGigResult.rows[0]);
    } catch (error) {
        console.error('Error unclaiming backup gig:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/appointments/:id/check-in', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Update the appointment record
    await pool.query(
      'UPDATE appointments SET checked_in = true, check_in_time = NOW(), checked_in_by = $1 WHERE id = $2',
      [username, id]
    );

    // Insert or update attendance in AppointmentAttendance
    await pool.query(`
      INSERT INTO AppointmentAttendance (user_id, appointment_id, check_in_time, is_checked_in)
      VALUES ($1, $2, NOW(), TRUE)
      ON CONFLICT (user_id, appointment_id)
      DO UPDATE SET check_in_time = NOW(), is_checked_in = TRUE;
    `, [userId, id]);

    res.status(200).json({ message: 'Checked in to appointment successfully' });
  } catch (err) {
    console.error('❌ Error checking in to appointment:', err);
    res.status(500).json({ error: 'Failed to check in to appointment' });
  }
});

app.post('/appointments/:id/check-out', async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Update the appointment record
    await pool.query(
      'UPDATE appointments SET checked_out = true, check_out_time = NOW(), checked_out_by = $1 WHERE id = $2',
      [username, id]
    );

    // Update attendance in AppointmentAttendance
    await pool.query(`
      UPDATE AppointmentAttendance
      SET check_out_time = NOW(), is_checked_in = FALSE
      WHERE user_id = $1 AND appointment_id = $2;
    `, [userId, id]);

    res.status(200).json({ message: 'Checked out of appointment successfully' });
  } catch (err) {
    console.error('❌ Error checking out of appointment:', err);
    res.status(500).json({ error: 'Failed to check out of appointment' });
  }
});

// POST /gigs/:gigId/check-in
app.post('/gigs/:gigId/check-in', async (req, res) => {
    const { gigId } = req.params;
    const { username } = req.body;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userId = userResult.rows[0].id;

        const attendanceResult = await pool.query(`
            INSERT INTO GigAttendance (gig_id, user_id, check_in_time, is_checked_in)
            VALUES ($1, $2, NOW(), TRUE)
            ON CONFLICT (gig_id, user_id)
            DO UPDATE SET check_in_time = NOW(), is_checked_in = TRUE
            RETURNING check_in_time;
        `, [gigId, userId]);

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

// POST /gigs/:gigId/check-out
app.post('/gigs/:gigId/check-out', async (req, res) => {
    const { gigId } = req.params;
    const { username } = req.body;

    try {
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userId = userResult.rows[0].id;

        const attendanceResult = await pool.query(`
            UPDATE GigAttendance
            SET check_out_time = NOW(), is_checked_in = FALSE
            WHERE gig_id = $1 AND user_id = $2
            RETURNING check_out_time;
        `, [gigId, userId]);

        const checkOutTimeUTC = attendanceResult.rows[0].check_out_time;

        res.status(200).json({
            message: 'Checked out successfully.',
            check_out_time: moment.utc(checkOutTimeUTC).tz('America/New_York').format('YYYY-MM-DD hh:mm A'),
        });
    } catch (error) {
        console.error('Error during check-out:', error);
        res.status(500).json({ error: 'Error during check-out' });
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

// POST: Add extra income
app.post('/api/extra-income', async (req, res) => {
    const { clientId, gigId, amount, description } = req.body;

    try {
        const insertIncomeQuery = `
            INSERT INTO extra_income (client_id, gig_id, amount, description)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await pool.query(insertIncomeQuery, [clientId, gigId, amount, description]);

        // Add as **income** to the profits table
        const insertProfitQuery = `
            INSERT INTO profits (category, description, amount, type)
            VALUES ($1, $2, $3, $4);
        `;
        await pool.query(insertProfitQuery, [
            'Income',
            `Extra income from Client ${clientId}: ${description}`,
            amount, // **Positive value** for income
            'Extra Income',
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding extra income:', error);
        res.status(500).json({ error: 'Failed to add extra income.' });
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

    try {
        const insertPayoutQuery = `
            INSERT INTO extra_payouts (user_id, gig_id, amount, description)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const result = await pool.query(insertPayoutQuery, [userId, gigId, amount, description]);

        // Add expense to profits table
        const insertProfitQuery = `
            INSERT INTO profits (category, description, amount, type)
            VALUES ($1, $2, $3, $4);
        `;
        await pool.query(insertProfitQuery, [
            'Expense',
            `Extra payout to User ${userId}: ${description}`,
            -amount,
            'Extra Payout',
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding extra payout:', error);
        res.status(500).json({ error: 'Failed to add extra payout.' });
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

  // Map incoming body keys -> DB column names
  const fieldMap = {
    client_id: 'client_id',
    quoteDate: 'date',               // expects yyyy-mm-dd
    total_amount: 'total_amount',
    status: 'status',
    quote_number: 'quote_number',
    clientName: 'client_name',
    clientEmail: 'client_email',
    clientPhone: 'client_phone',
    eventDate: 'event_date',         // expects yyyy-mm-dd
    eventTime: 'event_time',
    location: 'location',
    items: 'items',                  // JSON
    deposit_amount: 'deposit_amount',
    deposit_date: 'deposit_date',    // expects yyyy-mm-dd
    paid_in_full: 'paid_in_full'
  };

  try {
    const payload = req.body || {};
    const setParts = [];
    const values = [];
    let idx = 1;

    // Build SET clauses only for keys that are present in the body
    for (const [incomingKey, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(payload, incomingKey)) {
        let value = payload[incomingKey];

        // Normalize special fields
        if (incomingKey === 'items' && Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        // Allow explicit null to clear a field
        if (value === '') value = null;

        setParts.push(`${column} = $${idx++}`);
        values.push(value);
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    values.push(id); // WHERE id = $n

    const sql = `
      UPDATE quotes
      SET ${setParts.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const result = await pool.query(sql, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error patching quote:', error);
    res.status(500).json({ error: 'Failed to edit quote' });
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

    if (paid_in_full && profitCheck.rowCount === 0) {
      // Add profit record
      await pool.query(`
        INSERT INTO profits (category, description, amount, type, quote_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'Income',
        `Payment from ${updatedQuote.client_name} for ${updatedQuote.event_type || 'Event'} on ${updatedQuote.event_date || 'TBD'}`,
        updatedQuote.total_amount,
        'Gig Income',
        id
      ]);
    } else if (!paid_in_full && profitCheck.rowCount > 0) {
      // Remove profit record if marked unpaid
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
    const { text, priority, dueDate, category } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO tasks (text, priority, due_date, category) VALUES ($1, $2, $3, $4) RETURNING *',
            [text, priority, dueDate, category]
        );

        const newTask = result.rows[0];
        console.log("✅ New Task Created:", newTask); // Debugging


        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error adding task:', error);
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

// PATCH /admin/students/:studentId/graduate
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

    // 3) Promote to staff + require W‑9 at next login
    const updated = await client.query(
      `UPDATE users
          SET role = 'user',
              staff_terms_required = TRUE,
              w9_uploaded = FALSE
        WHERE id = $1
        RETURNING id, email, role, staff_terms_required, w9_uploaded`,
      [user.id]
    );

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

// Fetch all inventory
app.get('/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory ORDER BY item_name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
    }
});

app.post('/inventory', async (req, res) => {
    const { item_name, category, quantity, barcode } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO inventory (item_name, category, quantity, barcode) VALUES ($1, $2, $3, $4) RETURNING *',
            [item_name, category, quantity, barcode]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add item', details: error.message });
    }
});

app.patch('/inventory/:barcode', async (req, res) => {
    const { barcode } = req.params;
    const { quantity, action } = req.body; // `action` can be "add" or "remove"

    try {
        if (action === 'add') {
            // Increment quantity
            const result = await pool.query(
                `UPDATE inventory SET quantity = quantity + $1, updated_at = NOW()
                 WHERE barcode = $2 RETURNING *`,
                [quantity, barcode]
            );

            if (result.rowCount > 0) {
                return res.json(result.rows[0]);
            }

            // If no rows were updated, insert the item as new
            const newItem = await pool.query(
                `INSERT INTO inventory (item_name, category, quantity, barcode)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                ['Unknown Item', 'Uncategorized', quantity, barcode]
            );
            return res.status(201).json(newItem.rows[0]);
        } else if (action === 'use') {
            // Decrement quantity
            const result = await pool.query(
                `UPDATE inventory SET quantity = quantity - $1, updated_at = NOW()
                 WHERE barcode = $2 AND quantity >= $1 RETURNING *`,
                [quantity, barcode]
            );

            if (result.rowCount > 0) {
                return res.json(result.rows[0]);
            } else {
                return res.status(400).json({ error: 'Insufficient quantity or item not found' });
            }
        }

        res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update inventory', details: error.message });
    }
});

app.put('/inventory/:barcode', async (req, res) => {
    const { barcode } = req.params;
    const { item_name, category, quantity, new_barcode } = req.body;

    try {
        await pool.query(
            `UPDATE inventory SET item_name = $1, category = $2, quantity = $3, barcode = $4 WHERE barcode = $5`,
            [item_name, category, quantity, new_barcode || barcode, barcode]
        );
        const updatedItem = await pool.query(`SELECT * FROM inventory WHERE barcode = $1`, [new_barcode || barcode]);
        res.json(updatedItem.rows[0]);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).send('Server Error');
    }
});

app.delete('/inventory/:barcode', (req, res) => {
    const { barcode } = req.params;

    pool.query('DELETE FROM inventory WHERE barcode = $1', [barcode])
        .then(() => res.status(200).send({ message: 'Item deleted successfully' }))
        .catch((error) => res.status(500).send({ error: 'Failed to delete item' }));
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
        paymentMethod,
        addons,
        howHeard,
        referral,
        referralDetails,
        additionalComments
    } = req.body;

    try {
        await pool.query("BEGIN"); // ✅ Start a transaction

        // ✅ Insert Client if not exists
        const clientInsertQuery = `
            INSERT INTO clients (full_name, email, phone, payment_method)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO NOTHING;
        `;
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);

        // ✅ Insert Intake Form Data
        const intakeFormQuery = `
            INSERT INTO intake_forms 
            (full_name, email, phone, event_date, event_time, entity_type, business_name, first_time_booking, event_type, age_range, event_name, 
             event_location, gender_matters, preferred_gender, open_bar, location_facilities, staff_attire, event_duration, on_site_parking, 
             local_parking, additional_prep, nda_required, food_catering, guest_count, home_or_venue, venue_name, bartending_license, 
             insurance_required, liquor_license, indoors, budget, payment_method, addons, how_heard, referral, additional_details, additional_comments) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::TEXT[], $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 
            $27, $28, $29, $30, $31, $32, $33::TEXT[], $34, $35, $36, $37);
        `;
        await pool.query(intakeFormQuery, [
            fullName, email, phone, date, time, entityType, businessName, firstTimeBooking, eventType, ageRange, eventName, 
            eventLocation, genderMatters, preferredGender, openBar, locationFeatures, staffAttire, eventDuration, onSiteParking, 
            localParking, additionalPrepTime, ndaRequired, foodCatering, guestCount, homeOrVenue, venueName, bartendingLicenseRequired, 
            insuranceRequired, liquorLicenseRequired, indoorsEvent, budget, paymentMethod, addons, howHeard, referral, referralDetails, additionalComments
        ]);

        await pool.query("COMMIT"); // ✅ Commit Transaction

        // ✅ Send Email Notification (non-blocking)
        sendIntakeFormEmail({
            fullName, email, phone, date, time, entityType, businessName, firstTimeBooking,
            eventType, ageRange, eventName, eventLocation, genderMatters, preferredGender,
            openBar, locationFeatures, staffAttire, eventDuration, onSiteParking, localParking,
            additionalPrepTime, ndaRequired, foodCatering, guestCount, homeOrVenue, venueName,
            bartendingLicenseRequired, insuranceRequired, liquorLicenseRequired, indoorsEvent,
            budget, paymentMethod, addons, howHeard, referral, referralDetails, additionalComments
        }).then(() => console.log("✅ Intake form email sent."))
          .catch((emailError) => console.error("❌ Error sending intake form email:", emailError.message));

        // ✅ Only One Response
        res.status(201).json({ message: 'Form submitted and added to gigs successfully!' });

    } catch (error) {
        await pool.query("ROLLBACK"); // ❌ Rollback Transaction on Error
        console.error('❌ Error saving form submission:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
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
        paymentMethod,
        guestDetails = [],
        apronTexts = []
    } = req.body;

    if (!fullName || !email || !phone || !guestCount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone, payment_method)
        VALUES ($1, $2, $3, $4)
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
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);

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
            additionalComments || null,
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
                additionalComments,
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


// Route to handle Craft Cocktails form submission
app.post('/api/mix-n-sip', async (req, res) => {
    const {
        fullName,
        email,
        phone,
        eventType,
        guestCount,
        addons,
        howHeard,
        referral,
        referralDetails,
        additionalComments,
        paymentMethod,
        guestDetails = [],
        apronTexts = []
    } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone, payment_method)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
    `;

    const mixNsipInsertQuery = `
        INSERT INTO mix_n_sip (
            full_name, email, phone, event_type, guest_count, addons, how_heard, referral, referral_details, additional_comments, apron_texts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
    `;

    try {
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);

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

        const result = await pool.query(mixNsipInsertQuery, [
            fullName,
            email,
            phone,
            eventType || "Mix N' Sip (2 hours, @ $75.00)",
            guestCount,
            addons.map(a => a.name),
            howHeard,
            referral || null,
            referralDetails || null,
            additionalComments || null,
            apronTexts
        ]);

        try {
            await sendMixNSipFormEmail({
                fullName,
                email,
                phone,
                eventType,
                guestCount,
                addons,
                howHeard,
                referral,
                referralDetails,
                additionalComments,
                apronTexts
            });
            console.log('Email sent successfully!');
        } catch (emailError) {
            console.error('Error sending email notification:', emailError);
        }

        res.status(201).json({
            message: 'Mix N Sip form submitted successfully!',
            data: result.rows[0]
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
        referralDetails,
        paymentMethod
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
    const { full_name, email, phone, payment_method } = req.body; // Destructure the incoming data

    // Validate input data
    if (!full_name) {
        return res.status(400).json({ error: 'Full name is required' });
    }

    try {
        // Insert the new client into the database
        const result = await pool.query(
            'INSERT INTO clients (full_name, email, phone, payment_method) VALUES ($1, $2, $3, $4) RETURNING *',
            [full_name, email || null, phone || null, payment_method || null] // Default email and phone to NULL if not provided
        );

        res.status(201).json(result.rows[0]); // Respond with the created client
    } catch (error) {
        console.error('Error adding client:', error);
        res.status(500).json({ error: 'Failed to add client' });
    }
});

app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, full_name, email, phone, payment_method FROM clients ORDER BY id DESC');
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

app.post("/api/send-campaign", async (req, res) => {
    const { subject, message, sendTo } = req.body;

    if (!message || !sendTo) {
        return res.status(400).json({ error: "MessageCati and recipient type are required" });
    }

    try {
        if (sendTo === "clients" || sendTo === "both") {
            const clientsResult = await pool.query("SELECT full_name, email FROM clients WHERE email IS NOT NULL");
            const clients = clientsResult.rows;
            await sendEmailCampaign(clients, subject, message);
        }

        res.status(200).json({ message: "Campaign sent successfully" });
    } catch (error) {
        console.error("❌ Error sending campaign:", error);
        res.status(500).json({ error: "Failed to send campaign" });
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
app.get('/api/intake-forms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM intake_forms ORDER BY created_at DESC');
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

const client = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN, // Use the token from environment variables
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

const checkoutApi = client.checkoutApi;

app.post('/api/create-payment-link', async (req, res) => {
  const { email, amount, itemName, appointmentData } = req.body;

  if (!email || !amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Email and valid amount are required.' });
  }

  try {
    const processingFee = (amount * 0.029) + 0.30;
    const adjustedAmount = Math.round((parseFloat(amount) + processingFee) * 100); // cents

    const redirectUrl = process.env.NODE_ENV === "production"
      ? `https://stemwithlyn.onrender.com/payment-success`
      : `http://localhost:3000/payment-success`;

    const response = await checkoutApi.createPaymentLink({
      idempotencyKey: new Date().getTime().toString(),
      quickPay: {
        name: itemName || 'Payment for Services',
        description: "Full payment for appointment",
        priceMoney: {
          amount: adjustedAmount,
          currency: 'USD',
        },
        locationId: process.env.SQUARE_LOCATION_ID,
      },
      checkoutOptions: {
        redirectUrl: `${redirectUrl}?paymentLinkId=temp`, // placeholder, won't be used
        metadata: {
          appointmentData: JSON.stringify(appointmentData || {})
        }
      }
    });

    const paymentLink = response.result.paymentLink.url;
    await sendPaymentEmail(email, paymentLink);

    res.status(200).json({ url: paymentLink });
  } catch (error) {
    console.error('❌ Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});


app.post('/api/save-card-on-file', async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Missing email or token' });
  }

  try {
    // Get customer ID
    const result = await pool.query(
      'SELECT square_customer_id FROM clients WHERE email = $1',
      [email]
    );

    const squareCustomerId = result.rows[0]?.square_customer_id;
    if (!squareCustomerId) {
      return res.status(404).json({ error: 'Square customer not found for email' });
    }

    // Save card on file with Square
    const response = await client.customersApi.createCustomerCard(squareCustomerId, {
      cardNonce: token,
    });

    const cardId = response.result.card?.id;
    console.log(`✅ Card saved for ${email}: ${cardId}`);

    // Store card_id in clients table
    await pool.query(
      'UPDATE clients SET card_id = $1 WHERE email = $2',
      [cardId, email]
    );

    res.status(200).json({ message: 'Card saved successfully', cardId });
  } catch (error) {
    console.error('❌ Error saving card on file:', error);
    res.status(500).json({ error: 'Failed to save card on file' });
  }
});


app.post('/api/charge-card-on-file', async (req, res) => {
  const { email, amount, description } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: 'Email and amount required' });
  }

  try {
    const clientRes = await pool.query(
      'SELECT square_customer_id, card_id FROM clients WHERE email = $1',
      [email]
    );

    const clientData = clientRes.rows[0];
    if (!clientData || !clientData.square_customer_id || !clientData.card_id) {
      return res.status(404).json({ error: 'Missing card or customer info for this email' });
    }

    const processingFee = (amount * 0.029) + 0.30;
    const totalCents = Math.round((parseFloat(amount) + processingFee) * 100);

    const paymentRes = await client.paymentsApi.createPayment({
      idempotencyKey: Date.now().toString(),
      sourceId: clientData.card_id,
      customerId: clientData.square_customer_id,
      amountMoney: {
        amount: totalCents,
        currency: 'USD'
      },
      note: description || 'Charge on file',
    });

    res.status(200).json({ success: true, payment: paymentRes.result.payment });
  } catch (err) {
    console.error('❌ Charge error:', err);
    res.status(500).json({ error: 'Charge failed', details: err.message });
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
      isAdmin = false,
      payment_method,
      client_phone,
      guestCount,
      classCount
    } = req.body;

    let finalClientName = client_name;
    let finalClientEmail = client_email;

    if (client_id && (!client_name || !client_email)) {
      const clientResult = await pool.query(`SELECT full_name, email FROM clients WHERE id = $1`, [client_id]);
      if (clientResult.rowCount > 0) {
        finalClientName = clientResult.rows[0].full_name;
        finalClientEmail = clientResult.rows[0].email;
      }
    }

    if (!title || !finalClientName || !finalClientEmail || !date || !time) {
      console.error("❌ Missing required appointment details:", { title, client_name: finalClientName, client_email: finalClientEmail, date, time });
      return res.status(400).json({ error: "Missing required appointment details." });
    }

    console.log("🔍 Checking client in DB:", client_email);

    let clientResult = await pool.query(`SELECT id, payment_method FROM clients WHERE email = $1`, [client_email]);
    let finalClientId = client_id;

    if (clientResult.rowCount === 0) {
      console.log("🆕 New client detected:", finalClientName);
      const newClient = await pool.query(
        `INSERT INTO clients (full_name, email, phone, payment_method) VALUES ($1, $2, $3, $4) RETURNING id`,
        [finalClientName, finalClientEmail, client_phone || "", payment_method]
      );
      finalClientId = newClient.rows[0].id;
    } else {
      console.log("✅ Existing client found:", clientResult.rows[0]);
      finalClientId = clientResult.rows[0].id;
    }

    const formattedTime = time.length === 5 ? `${time}:00` : time;
    const formattedEndTime = end_time.length === 5 ? `${end_time}:00` : end_time;
    const appointmentDate = new Date(date + "T12:00:00");

    if (!isAdmin && !status) {
      console.log("🔍 Checking availability and blocked times for non-admin booking...");

      const blockedCheck = await pool.query(
        `SELECT * FROM schedule_blocks WHERE date = $1 AND time_slot = $2`,
        [date, `${formattedTime.split(":")[0]}`]
      );
      if (blockedCheck.rowCount > 0) {
        console.error("❌ This time slot is blocked and cannot be booked:", title, date, formattedTime);
        return res.status(400).json({ error: "This time slot is blocked and cannot be booked." });
      }

      const existingAppointment = await pool.query(
        `SELECT * FROM appointments WHERE date = $1 AND time = $2`,
        [date, formattedTime]
      );
      if (existingAppointment.rowCount > 0) {
        console.error("❌ This time slot is already booked:", title, date, formattedTime);
        
        // ✅ Instead of 400, return 200 with a duplicate flag
        return res.status(200).json({
            duplicate: true,
            existing: existingAppointment.rows[0],
            message: "Appointment already exists"
        });
        }

      const appointmentWeekday = appointmentDate.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "America/New_York"
      }).trim();

      const availabilityCheck = await pool.query(
        `SELECT * FROM weekly_availability WHERE weekday = $1 AND appointment_type ILIKE $2 AND start_time = $3`,
        [appointmentWeekday, `%${title}%`, formattedTime]
      );
      if (availabilityCheck.rowCount === 0) {
        console.error("❌ No available slot found for", title, date, formattedTime);
        return res.status(400).json({ error: "The selected time slot is not available for this appointment type." });
      }

      console.log("✅ Slot is available! Proceeding with booking...");
    } else {
      console.log("🔓 Admin scheduling — bypassing availability check.");
    }

    // ✅ Deduplication check
    if (!title.includes("Bartending Course")) {
  const duplicateCheck = await pool.query(
    `SELECT * FROM appointments WHERE client_id = $1 AND title = $2 AND date = $3 AND time = $4`,
    [finalClientId, title, date, formattedTime]
  );
  if (duplicateCheck.rowCount > 0) {
    console.warn("⚠️ Duplicate appointment blocked.");
    return res.status(409).json({ error: "This appointment already exists." });
  }
} else {
  console.log("ℹ️ Skipping duplicate check for Bartending Course.");
}


    if (time && end_time) {
      const startDateTime = new Date(`${date}T${time}`).toISOString();
      const endDateTime = new Date(`${date}T${end_time}`).toISOString();
      try {
        const eventResponse = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          auth: oAuth2Client,
          resource: {
            summary: title,
            description,
            start: { dateTime: startDateTime, timeZone: 'America/New_York' },
            end: { dateTime: endDateTime, timeZone: 'America/New_York' },
          },
        });

        const tokenInfo = await oAuth2Client.getTokenInfo(oAuth2Client.credentials.access_token);
        console.log("🔐 Authenticated Google user:", tokenInfo.email);
        console.log("📅 Google Calendar Event Created:", eventResponse.data.htmlLink);
      } catch (calendarError) {
        console.error("❌ Failed to create Google Calendar event:", calendarError);
      }
    } else {
      console.warn("⏰ Skipping calendar sync — time or end_time missing");
    }

    function extractPriceFromTitle(title) {
  const match = title.match(/\$(\d+(\.\d{1,2})?)/);
  return match ? parseFloat(match[1]) : 0;
}

let basePrice = extractPriceFromTitle(title);
if (basePrice === 0) {
  if (title.includes('Mix N Sip')) basePrice = 75;
  else if (title.includes('Crafts & Cocktails')) basePrice = 85;
  else if (title.includes('Bartending Class')) basePrice = 60;
}

let addonList = [];
try {
  addonList = addons && typeof addons === "string"
    ? JSON.parse(addons)
    : Array.isArray(addons) ? addons : [];
} catch (error) {
  console.error("❌ Error parsing add-ons:", error);
}
if (!Array.isArray(addonList)) addonList = [];

const multiplier = classCount > 1 ? classCount : guestCount || 1;

let priceToInsert;
if (req.body.price !== undefined) {
  priceToInsert = parseFloat(req.body.price);
  console.log(`💰 Using frontend price: $${priceToInsert}`);
} else {
  const addonTotal = addonList.reduce((sum, addon) => sum + (addon.price || 0), 0);
  priceToInsert = basePrice * multiplier + addonTotal;
  console.log(`💰 Base Price: $${basePrice}, Multiplier: ${multiplier}, Add-ons: $${addonTotal}, Total: $${priceToInsert}`);
}

let newAppointment;
try {
  const insertAppointment = await pool.query(
  `INSERT INTO appointments (title, client_id, date, time, end_time, description, assigned_staff, price, status)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
  [title, finalClientId, date, formattedTime, formattedEndTime, description, assigned_staff, priceToInsert, status]
);

  newAppointment = insertAppointment.rows[0];
  console.log("🎉 Appointment successfully created:", newAppointment);
  if (
  newAppointment.price > 0 &&
  newAppointment.status === 'finalized'
) {
  const clientRes = await pool.query(
    `SELECT full_name FROM clients WHERE id = $1`,
    [finalClientId]
  );
  const clientName = clientRes.rows[0]?.full_name || "Client";

  await pool.query(
    `INSERT INTO profits (category, description, amount, type, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [
      'Income',
      `Payment from ${clientName} for ${newAppointment.title} on ${newAppointment.date.toISOString().split('T')[0]}`,
      newAppointment.price,
      'Gig Income'
    ]
  );

  console.log("💵 Profit logged for", newAppointment.title);
}

} catch (insertErr) {
  console.error("❌ Failed to insert appointment:", insertErr);
  return res.status(500).json({ error: "Failed to insert appointment." });
}


    const appointmentDetails = {
      title: newAppointment.title,
      email: client_email,
      full_name: client_name,
      date: newAppointment.date,
      time: newAppointment.time,
      end_time: newAppointment.end_time,
      description: newAppointment.description,
      payment_method
    };
    if (title?.includes("Class 1") || title?.includes("Main")) {
      await sendAppointmentEmail({ title, email, full_name, date, time, end_time, description });
    }

    console.log("🔗 Generated Payment URL:", "No payment required");

    res.status(201).json({
      appointment: newAppointment,
      paymentLink: null
    });

  } catch (error) {
    console.error("❌ Error saving appointment:", error);
    res.status(500).json({ error: "Failed to save appointment.", details: error.message });
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

// POST /api/bartending-course/:id/sign-in
// POST /api/bartending-course/:userId/sign-in
app.post('/api/bartending-course/:userId/sign-in', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Get the user by ID
    const userRes = await pool.query(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // 2. Find a matching inquiry (by email or full_name)
    let inquiryRes = await pool.query(
      `SELECT id FROM bartending_course_inquiries WHERE email = $1 OR full_name ILIKE $2 LIMIT 1`,
      [user.email, user.name || user.username]
    );

    // 3. If none, auto-create one
    if (inquiryRes.rowCount === 0) {
      inquiryRes = await pool.query(
        `INSERT INTO bartending_course_inquiries (full_name, email, created_at)
         VALUES ($1, $2, NOW()) RETURNING id`,
        [user.name || user.username, user.email]
      );
    }
    const inquiryId = inquiryRes.rows[0].id;

    // 4. Insert attendance with inquiryId
    await pool.query(
      `INSERT INTO bartending_course_attendance (student_id, sign_in_time)
       VALUES ($1, (NOW() AT TIME ZONE 'America/New_York')::timestamptz)`,
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
    // 1. Get user
    const userRes = await pool.query(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // 2. Find inquiry
    const inquiryRes = await pool.query(
      `SELECT id FROM bartending_course_inquiries WHERE email = $1 OR full_name ILIKE $2 LIMIT 1`,
      [user.email, user.name || user.username]
    );
    if (inquiryRes.rowCount === 0) {
      return res.status(404).json({ error: 'No linked inquiry found for this user' });
    }
    const inquiryId = inquiryRes.rows[0].id;

    // 3. Find the open session
    const attendanceRes = await pool.query(
      `SELECT * FROM bartending_course_attendance
       WHERE student_id = $1 AND sign_out_time IS NULL
       ORDER BY sign_in_time DESC LIMIT 1`,
      [inquiryId]
    );
    if (attendanceRes.rowCount === 0) {
      return res.status(404).json({ error: 'No open session found to sign out' });
    }
    const attendance = attendanceRes.rows[0];

    // 4. Close it
    const signOut = new Date();
    const hours = (signOut - new Date(attendance.sign_in_time)) / (1000 * 60 * 60);

    await pool.query(
      `UPDATE bartending_course_attendance
       SET sign_out_time = $1, session_hours = $2
       WHERE id = $3`,
      [signOut, hours, attendance.id]
    );

    res.json({ message: 'Signed out successfully.', hours: hours.toFixed(2) });
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

// PATCH /admin/students/:id/graduate
app.patch('/admin/students/:id/graduate', async (req, res) => {
  const { id } = req.params;
  try {
    // promote the student’s linked user row to staff role, and require staff terms/W‑9
    await pool.query(`
      UPDATE users
      SET role = 'user',
          staff_terms_required = TRUE,
          w9_uploaded = FALSE
      WHERE id = (
        SELECT user_id
        FROM bartending_course_students
        WHERE id = $1
      )
    `, [id]);

    // optionally stamp graduated_at on your students table, if you haven’t already
    await pool.query(`
      UPDATE bartending_course_students
      SET graduated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ ok: true });
  } catch (e) {
    console.error('graduate error:', e);
    res.status(500).json({ error: 'Failed to graduate student' });
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

app.get('/api/profits', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM profits ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching profits:', error);
        res.status(500).json({ error: 'Failed to fetch profits' });
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



// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all route to serve index.html for any unknown routes
app.get('*', (req, res) => {
    console.log(`Serving index.html for route ${req.url}`);
    res.sendFile(path.join(__dirname,  '../frontend/build', 'index.html'), (err) => {
        if (err) {
            res.status(500).send(err);
        }
    });
});

// Export app for server startup
export default app;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});