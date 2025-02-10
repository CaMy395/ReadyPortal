// backend/app.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { Client } from 'square';
import crypto from 'crypto';
import moment from 'moment-timezone';
import path from 'path'; // Import path to handle static file serving
import { fileURLToPath } from 'url'; // Required for ES module __dirname
import bcrypt from 'bcrypt';
import pool from './db.js'; // Import the centralized pool connection
import axios from "axios"; // ✅ Import axios

import {
    generateQuotePDF,sendGigEmailNotification,sendGigUpdateEmailNotification,sendRegistrationEmail,sendResetEmail,sendIntakeFormEmail,sendCraftsFormEmail,sendPaymentEmail,sendAppointmentEmail,sendRescheduleEmail,sendBartendingInquiryEmail,sendBartendingClassesEmail,
    sendTutoringIntakeEmail, sendTutoringApptEmail, sendTutoringRescheduleEmail,sendCancellationEmail, sendTextMessage
} from './emailService.js';
import cron from 'node-cron';
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

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

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
                client_payment, payment_method, needs_cert, confirmed, staff_needed, claimed_by, backup_needed, backup_claimed_by, 
                latitude, longitude, attire, indoor, approval_needed, on_site_parking, local_parking, NDA, establishment
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 
                $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
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
            Array.isArray(claimed_by) ? `{${claimed_by.join(',')}}` : '{}', // Ensure it's an array
            backup_needed,
            Array.isArray(backup_claimed_by) ? `{${backup_claimed_by.join(',')}}` : '{}', // Ensure it's an array
            latitude ?? null,   // If latitude is not provided, set to NULL
            longitude ?? null,  // If longitude is not provided, set to NULL
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

        // Fetch all user emails
        const usersResult = await pool.query('SELECT email FROM users');
        const users = usersResult.rows;

        // Send emails with delay adjustments
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const emailPromises = users.map(async (user, index) => {
            await delay(index * 500); // 500ms delay between emails
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

app.post('/send-quote-email', async (req, res) => {
    const { email, quote } = req.body;

    try {
        // Ensure the quotes directory exists
        const quotesDir = path.join(__dirname, 'quotes');
        if (!fs.existsSync(quotesDir)) {
            fs.mkdirSync(quotesDir); // Create the directory if it doesn't exist
        }

        // Generate the file path for the PDF
        const filePath = path.join(quotesDir, `Quote-${quote.quoteNumber}.pdf`);

        // Generate the PDF
        await generateQuotePDF(quote, filePath);

        // Send the email with the PDF attached
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Replace with the correct email service if not Gmail
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false, // Allow self-signed certificates
            },
        });        

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Quote #${quote.quoteNumber}`,
            text: `Hi ${quote.clientName},\n\nPlease find your quote attached. To accept this quote, please reply to this email.\n\nThank you!`,
            attachments: [
                {
                    filename: `Quote-${quote.quoteNumber}.pdf`,
                    path: filePath,
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        res.status(200).send('Quote email sent successfully!');
    } catch (error) {
        console.error('Error sending quote email:', error);
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

        // Send registration email
        try {
            await sendRegistrationEmail(email, username, name);
            console.log(`Welcome email sent to ${email}`);
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

app.post('/login', async (req, res) => {
    console.log('Login request received:', req.body); // Log the request body
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        console.log('Database query result:', result.rows); // Log the query result

        if (result.rowCount === 0) {
            return res.status(404).send('User not found');
        }

        const user = result.rows[0];
        console.log('User found:', user); // Log the user details

        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', passwordMatch); // Log password comparison result

        if (!passwordMatch) {
            return res.status(401).send('Invalid password');
        }

        res.status(200).json({ role: user.role });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error');
    }
});

// Forgot Password Route
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

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
            VALUES ($1, $2, TIMEZONE('UTC', NOW()), TRUE)
            ON CONFLICT (gig_id, user_id)
            DO UPDATE SET check_in_time = TIMEZONE('UTC', NOW()), is_checked_in = TRUE
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
            SET check_out_time = TIMEZONE('UTC', NOW()), is_checked_in = FALSE
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
        const result = await pool.query(`
            SELECT 
                a.*, 
                g.client, 
                g.event_type, 
                g.date AS gig_date, 
                g.time AS gig_time, 
                g.location, 
                g.pay,
                u.preferred_payment_method,
                u.name
            FROM GigAttendance a
            INNER JOIN gigs g ON a.gig_id = g.id
            INNER JOIN users u ON a.user_id = u.id;
        `);

        // Send response
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching attendance data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.patch('/api/gigs/:gigId/attendance', async (req, res) => {
    const { gigId } = req.params; // gigId should be extracted as a string
    const { check_in_time, check_out_time } = req.body;

    if (!gigId || isNaN(parseInt(gigId))) {
        return res.status(400).json({ error: 'Invalid or missing gigId.' });
    }

    try {
        const query = `
            UPDATE gigattendance
            SET check_in_time = $1, check_out_time = $2
            WHERE gig_id = $3
            RETURNING *;
        `;
        const values = [check_in_time, check_out_time, parseInt(gigId)];

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
    const { staff_id, gig_id, payout_amount, description } = req.body;

    try {
        // Insert payout into the payouts table
        const result = await pool.query(
            `INSERT INTO payouts (staff_id, gig_id, payout_amount, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [staff_id, gig_id, payout_amount, description]
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
        const result = await pool.query('SELECT * FROM Quotes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add a new quote
app.post('/api/quotes', async (req, res) => {
    const { text, author } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Quote text is required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO Quotes (text, author) VALUES ($1, $2) RETURNING *',
            [text, author || 'Anonymous']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ error: 'Failed to add task' });
    }
});

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

const users = {
    "Lyn": { phone: "3059655863", carrier: "att" },
    "Ace": { phone: "7863509775", carrier: "att" },
    "Red": { phone: "7865424400", carrier: "att" }
};

// Function to check for upcoming tasks and send reminders
async function checkAndSendTaskReminders() {
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        const formattedToday = now.toISOString().split('T')[0];
        const formattedTomorrow = tomorrow.toISOString().split('T')[0];


        const tasksResult = await pool.query(
            "SELECT * FROM tasks WHERE (due_date = $1 OR due_date = $2) AND completed = false",
            [formattedToday, formattedTomorrow]
        );       

        for (const task of tasksResult.rows) {
            const user = users[task.category];

            if (user) {
                const message = `Reminder: You have an upcoming task "${task.text}" due on ${task.due_date}.`;
                await sendTextMessage({ phone: user.phone, carrier: user.carrier, message });
                console.log(`Reminder sent to ${task.category} for task: ${task.text}`);
            }
        }
    } catch (error) {
        console.error('Error sending task reminders:', error);
    }
}

// Schedule the function to run every day at 8 AM
cron.schedule('0 9 * * *', () => {
    console.log('Checking and sending task reminders...');
    checkAndSendTaskReminders();
}, {
    timezone: "America/New_York"
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
        console.log("📥 Received blockedTimes:", req.body);
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
    
        console.log("✅ Inserting Blocked Time:", formattedTimeSlot, entry.label, entry.date);
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
            console.log("📆 Fetching blocked times for date:", date);
            result = await pool.query(
                `SELECT time_slot, label, date FROM schedule_blocks WHERE date = $1 ORDER BY time_slot`, [date]
            );
        } else {
            console.log("📆 Fetching all blocked times...");
            result = await pool.query(
                `SELECT time_slot, label, date FROM schedule_blocks ORDER BY date, time_slot`
            );
        }

        const blockedTimes = result.rows.map(row => ({
            timeSlot: row.time_slot.trim(),
            label: row.label ? row.label.trim() : "Blocked",
            date: row.date
        }));

        console.log("✅ Blocked Times from DB:", blockedTimes);
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

        console.log(`🗑️ Deleting blocked time: ${timeSlot} on ${date}`);

        const result = await pool.query(
            `DELETE FROM schedule_blocks WHERE time_slot = $1 AND date = $2 RETURNING *`,
            [timeSlot, date]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Blocked time not found." });
        }

        console.log(`✅ Blocked time deleted: ${timeSlot} on ${date}`);
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

        // ✅ Insert Gig Data Automatically
        /*const gigInsertQuery = `
            INSERT INTO gigs (
                client, event_type, date, time, duration, location, position, gender, pay, 
                client_payment, payment_method, needs_cert, confirmed, staff_needed, claimed_by, 
                backup_needed, backup_claimed_by, latitude, longitude, attire, indoor, 
                approval_needed, on_site_parking, local_parking, NDA, establishment
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 
                $10, $11, $12, $13, $14, 
                $15, $16, $17, $18, $19, 
                $20, $21, $22, $23, $24, $25, $26
            )
            RETURNING *;
        `;

        const gigValues = [
            fullName, eventType, date, time, eventDuration, eventLocation, 'bartender', preferredGender || 'Any', 
            20, 0, paymentMethod || 'N/A', 
            bartendingLicenseRequired ? 1 : 0, 
            0, guestCount > 50 ? 2 : 1, '{}', 0, '{}', 
            null, null, staffAttire || 'Casual', indoorsEvent ? 1 : 0, ndaRequired ? 1 : 0, 
            onSiteParking ? 1 : 0, localParking || 'N/A', ndaRequired ? 1 : 0, homeOrVenue || 'home'
        ];

        const gigResult = await pool.query(gigInsertQuery, gigValues);
        console.log("✅ Gig successfully added:", gigResult.rows[0]);*/

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
        res.status(201).json({ message: 'Form submitted and added to gigs successfully!', gig: gigResult.rows[0] });

    } catch (error) {
        await pool.query("ROLLBACK"); // ❌ Rollback Transaction on Error
        console.error('❌ Error saving form submission:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

app.post('/api/tutoring-intake', async (req, res) => {
    const {
        fullName,
        email,
        phone,
        haveBooked,
        whyHelp,
        learnDisable,
        whatDisable,
        age,
        grade,
        subject,
        mathSubject,
        scienceSubject,
        currentGrade,
        paymentMethod,
        additionalDetails
    } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone, payment_method)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
    `;

    try {
        // Insert client data
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);

        // Insert tutoring intake form data
        await pool.query(
            `INSERT INTO tutoring_intake_forms (
                full_name,
                email,
                phone,
                have_booked,
                why_help,
                learn_disability,
                what_disability,
                age,
                grade,
                subject,
                math_subject,
                science_subject,
                current_grade,
                additional_details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
                fullName,
                email,
                phone,
                haveBooked,
                whyHelp,
                haveBooked === 'no' ? learnDisable : null,
                haveBooked === 'no' && learnDisable === 'yes' ? whatDisable : null,
                haveBooked === 'no' ? age : null,
                haveBooked === 'no' ? grade : null,
                haveBooked === 'no' ? subject : null,
                subject === 'Math' && haveBooked === 'no' ? mathSubject : null,
                subject === 'Science' && haveBooked === 'no' ? scienceSubject : null,
                currentGrade,
                additionalDetails || null // Save the additional details or null if empty
            ]
        );
       

        // Send email notification
        try {
            await sendTutoringIntakeEmail({
                fullName,
                email,
                phone,
                haveBooked,
                whyHelp,
                learnDisable,
                whatDisable,
                age,
                grade,
                subject,
                mathSubject,
                scienceSubject,
                currentGrade,
                additionalDetails
            });

            console.log(`Tutoring intake form email sent to admin.`);
        } catch (emailError) {
            console.error('Error sending tutoring intake form email:', emailError.message);
        }

        res.status(201).json({ message: 'Tutoring Intake Form submitted successfully!' });
    } catch (error) {
        console.error('Error saving tutoring intake form submission:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to handle Craft Cocktails form submission
app.post('/api/craft-cocktails', async (req, res) => {
    const {
        fullName,
        email,
        phone,
        date,
        time,
        eventType,
        guestCount,
        addons,
        howHeard,
        referral,
        referralDetails,
        additionalComments,
        paymentMethod 
    } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone, payment_method)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
    `;

    const craftCocktailsInsertQuery = `
        INSERT INTO craft_cocktails (
            full_name, email, phone, date, time, event_type, guest_count, addons, how_heard, referral, referral_details, additional_comments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
    `;

    try {
        // Insert client info into the clients table
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);

        // Insert craft cocktails form into the craft_cocktails table
        const result = await pool.query(craftCocktailsInsertQuery, [
            fullName,
            email,
            phone,
            date,
            time,
            eventType,
            guestCount,
            addons, // Array of add-ons
            howHeard,
            referral || null, // Optional field
            referralDetails || null, // Optional field
            additionalComments || null,
        ]);

        // Send email notification
        try {
            await sendCraftsFormEmail({
                fullName,
                email,
                phone,
                date,
                time,
                eventType,
                guestCount,
                addons,
                howHeard,
                referral,
                referralDetails,
                additionalComments,
            });

            console.log('Email sent successfully!');
        } catch (emailError) {
            console.error('Error sending email notification:', emailError);
        }

        res.status(201).json({ message: 'Craft Cocktails form submitted successfully!', data: result.rows[0] });
    } catch (error) {
        console.error('Error saving Craft Cocktails form:', error);
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
        paymentPlan,
        paymentMethod,
        referral,
        referralDetails,
    } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone, payment_method)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
    `;

    const bartendingCourseInsertQuery = `
        INSERT INTO bartending_course_inquiries (
            full_name, email, phone, is_adult, experience, set_schedule, payment_plan, referral, referral_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;


    try {
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);
        const result = await pool.query(bartendingCourseInsertQuery, [
            fullName,
            email,
            phone,
            isAdult,
            experience,
            setSchedule,
            paymentPlan,
            referral,
            referralDetails || null,
        ]);

        await sendBartendingInquiryEmail({
            fullName,
            email,
            phone,
            isAdult,
            experience,
            setSchedule,
            paymentPlan,
            referral,
            referralDetails,
        });

        res.status(201).json({
            message: 'Bartending course inquiry submitted successfully!',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error saving Bartending Course inquiry:', error);
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
        INSERT INTO clients (full_name, email, phone, payment_method)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
    `;

    const bartendingClassesInsertQuery = `
        INSERT INTO bartending_classes_inquiries (
            full_name, email, phone, is_adult, experience, class_count, referral, referral_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;

    try {
        await pool.query(clientInsertQuery, [fullName, email, phone, paymentMethod]);
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
app.get('/api/tutoring-intake', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tutoring_intake_forms ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tutroing intake forms:', error);
        res.status(500).json({ error: 'Internal server error' });
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

app.delete('/api/tutoring-intake/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Logic to delete the form from your database
        const result = await pool.query('DELETE FROM tutoring_intake_forms WHERE id = $1', [id]);

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
    const { email, amount, description } = req.body;

    if (!email || !amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Email and valid amount are required.' });
    }

    try {
        // ✅ Calculate Square Fees: 2.9% + $0.30
        const processingFee = (amount * 0.029) + 0.30;
        const adjustedAmount = Math.round((parseFloat(amount) + processingFee) * 100); // Convert to cents

        console.log(`💰 Original Amount: $${amount}, Adjusted Amount: $${(adjustedAmount / 100).toFixed(2)}`);

        const response = await checkoutApi.createPaymentLink({
            idempotencyKey: new Date().getTime().toString(),
            quickPay: {
                name: 'Payment for Services',
                description: description || 'Please complete your payment.',
                priceMoney: {
                    amount: adjustedAmount, // ✅ Use adjusted amount to cover Square fees
                    currency: 'USD',
                },
                locationId: process.env.SQUARE_LOCATION_ID,
            },
        });

        const paymentLink = response.result.paymentLink.url;

        // Send the payment link via email
        await sendPaymentEmail(email, paymentLink);

        res.status(200).json({ url: paymentLink });
    } catch (error) {
        console.error('Error creating payment link:', error);
        res.status(500).json({ error: 'Failed to create payment link' });
    }
});

function extractPriceFromTitle(title) {
    const match = title.match(/@ \$(\d+(\.\d{1,2})?)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return 0.00; // Default to 0 if no price is found
}

// Helper function to get category by title
function getAppointmentCategory(title) {
    const appointment = appointmentTypes.find((type) => type.title === title);
    return appointment ? appointment.category : 'General'; // Default to 'General' if not found
}

app.post('/appointments', async (req, res) => {
    try {
        console.log("✅ Received appointment request:", req.body);

        // Extract values from request body
        const { title, client_id, client_name, client_email, date, time, end_time, description } = req.body;

        let finalClientName = client_name;
        let finalClientEmail = client_email;

        // ✅ If `client_id` exists but `client_name` and `client_email` are missing, fetch them from DB
        if (client_id && (!client_name || !client_email)) {
            const clientResult = await pool.query(
                `SELECT full_name, email FROM clients WHERE id = $1`, [client_id]
            );
        
            if (clientResult.rowCount > 0) {
                finalClientName = clientResult.rows[0].full_name;
                finalClientEmail = clientResult.rows[0].email;
            }
        }
        
        // ✅ Validate Required Fields
        if (!title || !finalClientName || !finalClientEmail || !date || !time) {
            console.error("❌ Missing required appointment details:", { title, client_name: finalClientName, client_email: finalClientEmail, date, time });
            return res.status(400).json({ error: "Missing required appointment details." });
        }
        

        console.log("🔍 Checking client in DB:", client_email);

        let clientResult = await pool.query(
            `SELECT id, payment_method FROM clients WHERE email = $1`,
            [client_email]
        );

        let finalClientId = client_id; // ✅ Use `finalClientId` instead of redefining `client_id`
        let payment_method = req.body.payment_method; // ✅ Use client-selected method if provided

        if (clientResult.rowCount === 0) {
            console.log("🆕 New client detected:", finalClientName);
            const finalClientPhone = req.body.client_phone || ""; // ✅ Default to empty string if undefined

            const newClient = await pool.query(
                `INSERT INTO clients (full_name, email, phone, payment_method) VALUES ($1, $2, $3, $4) RETURNING id`,
                [finalClientName, finalClientEmail, finalClientPhone, payment_method]
            );

            finalClientId = newClient.rows[0].id; // ✅ Now works since `finalClientId` is `let`
        } else {
            console.log("✅ Existing client found:", clientResult.rows[0]);
            finalClientId = clientResult.rows[0].id; // ✅ Now works since `finalClientId` is `let`
        }
        

        // ✅ Ensure `time` format matches PostgreSQL `TIME` type (`HH:MM:SS`)
        const formattedTime = time.length === 5 ? `${time}:00` : time;
        const formattedEndTime = end_time.length === 5 ? `${end_time}:00` : end_time;

        // ✅ Define `isAdmin` based on request data (if applicable)
        const isAdmin = req.body.isAdmin || false; // ✅ Use `isAdmin` from request body
        
        // ✅ Convert UTC date to local date
        const appointmentDate = new Date(date + "T12:00:00"); // ✅ Ensures appointmentDate is defined

                // ✅ Skip availability and duplicate checks for admins
                if (!isAdmin) {  
                    console.log("🔍 Checking availability and blocked times for non-admin booking...");
                
                    // ✅ Check if the slot is blocked
                    const blockedCheck = await pool.query(
                        `SELECT * FROM schedule_blocks WHERE date = $1 AND time_slot = $2`,
                        [date, `${formattedTime.split(":")[0]}`] // ✅ Check blocked times using `YYYY-MM-DD-HH`
                    );
                
                    if (blockedCheck.rowCount > 0) {
                        console.error("❌ This time slot is blocked and cannot be booked:", title, date, formattedTime);
                        return res.status(400).json({ error: "This time slot is blocked and cannot be booked." });
                    }
                
                    // ✅ Check if the slot is already booked
                    const existingAppointment = await pool.query(
                        `SELECT * FROM appointments WHERE date = $1 AND time = $2`,
                        [date, formattedTime]
                    );
                
                    if (existingAppointment.rowCount > 0) {
                        console.error("❌ This time slot is already booked:", title, date, formattedTime);
                        return res.status(400).json({ error: "This time slot is already booked." });
                    }     
                    
                    const appointmentWeekday = appointmentDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        timeZone: "America/New_York"
                    }).trim();
                
                    console.log(`📆 Corrected Appointment Weekday: ${appointmentWeekday}`);
                    console.log(`🕒 Checking availability for time: ${time}, formatted as: ${formattedTime}`);
                    console.log(`🔎 Querying for: ${appointmentWeekday}, ${title}, ${formattedTime}`);
                
                    const availabilityCheck = await pool.query(
                        `SELECT * FROM weekly_availability 
                        WHERE weekday = $1 
                        AND appointment_type ILIKE $2 
                        AND start_time = $3`,
                        [appointmentWeekday, `%${title}%`, formattedTime]
                    );
                
                    console.log("📜 Query Result:", availabilityCheck.rows);
                
                    if (availabilityCheck.rowCount === 0) {
                        console.error("❌ No available slot found for", title, date, formattedTime);
                        return res.status(400).json({ error: "The selected time slot is not available for this appointment type." });
                    }
                
                    console.log("✅ Slot is available! Proceeding with booking...");
                } else {
                    console.log("🔓 Admin scheduling — bypassing availability check.");
                }
        
        
        // ✅ Insert appointment (Admin & Normal Users)
        const insertAppointment = await pool.query(
            `INSERT INTO appointments (title, client_id, date, time, end_time, description)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, finalClientId, date, formattedTime, formattedEndTime, description]
        );

        const newAppointment = insertAppointment.rows[0];
        console.log("🎉 Appointment successfully created:", newAppointment);

        // ✅ Determine payment method and generate the appropriate link
        // Extract price from title (e.g., "Virtual Tutoring (1 hour, $50)")
        function extractPriceFromTitle(title) {
            const match = title.match(/\$(\d+(\.\d{1,2})?)/); // Match dollar amount in title
            return match ? parseFloat(match[1]) : 0; // Default to $0 if no price is found
        }

        const price = extractPriceFromTitle(title); // Get price from title

        let paymentUrl = null;

        if (price > 0) {
            if (payment_method === "Square") {
                try {
                    // Call your existing Square Payment Link API
                    const apiUrl = process.env.API_URL || "http://localhost:3001";  // ✅ Fallback to localhost
                    const squareResponse = await axios.post(`${apiUrl}/api/create-payment-link`, {
                        email: client_email,
                        amount: price,
                        description: `Payment for ${title} on ${date} at ${time}`
                    });

                    paymentUrl = squareResponse.data.url; // ✅ Get generated Square link
                } catch (error) {
                    console.error("❌ Error generating Square payment link:", error);
                }
            } else if (payment_method === "Zelle") {
                const encodedTitle = encodeURIComponent(title.trim());  // ✅ Trim & encode safely
                paymentUrl = `${process.env.API_URL || 'http://localhost:3000'}/rb/payment?amount=${price}&appointment_type=${encodedTitle}`;
                
            } else if (payment_method === "CashApp") {
                const encodedTitle = encodeURIComponent(title.trim());  // ✅ Trim & encode safely
                paymentUrl = `${process.env.API_URL || 'http://localhost:3000'}/rb/payment?amount=${price}&appointment_type=${encodedTitle}`;
                            }
        }

        console.log("🔗 Generated Payment URL:", paymentUrl || "No payment required");

        // ✅ Send confirmation email
        const appointmentDetails = {
            title: newAppointment.title,
            email: client_email,
            full_name: client_name,
            date: newAppointment.date,
            time: newAppointment.time,
            description: newAppointment.description,
            payment_method: payment_method
        };

        if (title.includes("Tutoring")) {
            await sendTutoringApptEmail(appointmentDetails);
        } else {
            await sendAppointmentEmail(appointmentDetails);
        }

        // ✅ Return the payment link based on selected method
        res.status(201).json({
            appointment: newAppointment,
            paymentLink: paymentUrl,
            paymentMethod: payment_method 
        });

    } catch (error) {
        console.error("❌ Error saving appointment:", error);
        res.status(500).json({ error: "Failed to save appointment.", details: error.message });
    }
});

// Get all appointments
app.get('/appointments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY date, time');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching all appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
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

        // ✅ Fetch manually blocked times from `schedule_blocks`
        const blockedTimesResult = await pool.query(
            `SELECT time_slot FROM schedule_blocks WHERE date = $1`,
            [date]
        );
        const blockedTimes = blockedTimesResult.rows.map(row => row.time_slot);

        // ✅ Fetch already booked appointments from `appointments`
        const bookedTimesResult = await pool.query(
            `SELECT time FROM appointments WHERE date = $1`,
            [date]
        );
        const bookedTimes = bookedTimesResult.rows.map(row => row.time);

        // ✅ Merge both lists and remove duplicates
        const allUnavailableTimes = [...new Set([...blockedTimes, ...bookedTimes])];

        console.log(`✅ Blocked & Booked Times for ${date}:`, allUnavailableTimes);
        res.json({ blockedTimes: allUnavailableTimes });

    } catch (error) {
        console.error("❌ Error fetching blocked times:", error);
        res.status(500).json({ error: "Failed to fetch blocked times." });
    }
});

app.patch('/appointments/:id', async (req, res) => {
    const appointmentId = req.params.id;
    const { title, description, date, time, end_time, client_id } = req.body;

    try {
        // Check if the appointment exists
        const existingAppointmentResult = await pool.query(
            'SELECT * FROM appointments WHERE id = $1',
            [appointmentId]
        );

        if (existingAppointmentResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const existingAppointment = existingAppointmentResult.rows[0];

        // Update the appointment
        const result = await pool.query(
            `UPDATE appointments 
             SET title = $1, description = $2, date = $3, time = $4, end_time = $5, client_id = $6 
             WHERE id = $7 
             RETURNING *`,
            [title, description, date, time, end_time, client_id, appointmentId]
        );

        const updatedAppointment = result.rows[0];

        // Fetch the client's email and full name
        const clientResult = await pool.query(
            `SELECT email, full_name FROM clients WHERE id = $1`,
            [client_id]
        );

        if (clientResult.rowCount === 0) {
            return res.status(400).json({ error: 'Client not found' });
        }

        const client = clientResult.rows[0];

        // Send the appropriate reschedule email based on the category
        const category = existingAppointment.category;

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
        };

        if (category === 'Tutoring') {
            await sendTutoringRescheduleEmail(rescheduleDetails);
        } else if (category === 'Ready Bar') {
            await sendRescheduleEmail(rescheduleDetails); // Assuming `sendRescheduleEmail` handles Ready Bar
        }

        // Send success response
        return res.status(200).json(updatedAppointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        return res.status(500).json({ error: 'Failed to update appointment' });
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
            description: appointment.description,
        });

        res.status(200).json({ message: 'Appointment successfully deleted' });
    } catch (error) {
        console.error('Error deleting appointment:', error.message);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});

app.patch('/appointments/:id/paid', async (req, res) => {
    const { id } = req.params;
    const { paid } = req.body;

    try {
        // Fetch appointment details
        const appointmentResult = await pool.query(
            'SELECT * FROM appointments WHERE id = $1',
            [id]
        );

        if (appointmentResult.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = appointmentResult.rows[0];
        const price = appointment.price || 0;

        // Fetch payment method from clients table
        const clientResult = await pool.query(
            'SELECT payment_method FROM clients WHERE id = $1',
            [appointment.client_id]
        );

        if (clientResult.rowCount === 0) {
            return res.status(404).json({ error: 'Client not found for this appointment.' });
        }

        const paymentMethod = clientResult.rows[0].payment_method || 'Other';

        // Update the paid status in the appointments table
        await pool.query('UPDATE appointments SET paid = $1 WHERE id = $2', [paid, id]);

        if (paid && price > 0) {
            // Calculate net payment based on payment method
            let netPayment = price;

            if (price > 0 && paymentMethod === 'Square') {
                const squareFees = (price * 0.029) + 0.30; // Square fees: 2.9% + $0.30
                netPayment -= squareFees;
            }

            // Add to profits table
            const description = `Payment for appointment: ${appointment.title}`;
            await pool.query(
                `INSERT INTO profits (category, description, amount, type)
                 VALUES ($1, $2, $3, $4)`,
                ['Income', description, netPayment, 'Appointment Income']
            );
        } else {
            // Remove from profits table if unpaid
            const description = `Payment for appointment: ${appointment.title}`;
            await pool.query(
                'DELETE FROM profits WHERE description = $1 AND category = $2',
                [description, 'Income']
            );
        }

        res.json({ message: 'Appointment payment status updated successfully.' });
    } catch (error) {
        console.error('Error updating appointment paid status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
        const { weekday, appointmentType } = req.query;

        console.log(`📥 Fetching availability - Weekday: "${weekday}", Appointment Type: "${appointmentType}"`);

        const availabilityQuery = `
            SELECT * FROM weekly_availability
            WHERE LOWER(weekday) = LOWER($1) 
            AND LOWER(appointment_type) = LOWER($2)
            ORDER BY start_time
        `;
        
        const queryParams = [weekday.trim(), appointmentType.trim()];
        console.log("🔎 Query Params:", queryParams);

        const result = await pool.query(availabilityQuery, queryParams);

        if (result.rowCount === 0) {
            console.log("⚠️ No availability found for the given filters.");
            return res.json([]); // ✅ Return empty array instead of 400 error
        }

        console.log("✅ Sending Availability Data:", result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error fetching availability:", error);
        res.status(500).json({ error: "Failed to fetch availability." });
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

// Update paid status for a gig
app.patch('/gigs/:id/paid', async (req, res) => {
    const { id } = req.params;
    const { paid } = req.body;

    try {
        // Fetch gig details
        const gigResult = await pool.query(
            'SELECT client_payment, event_type, client, payment_method FROM gigs WHERE id = $1',
            [id]
        );

        if (gigResult.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        const gig = gigResult.rows[0];

        // Update the paid status in the gigs table
        await pool.query('UPDATE gigs SET paid = $1 WHERE id = $2', [paid, id]);

        if (paid) {
            // Calculate net payment based on payment method
            let netClientPayment = gig.client_payment;

            if (gig.payment_method === 'Square') {
                const squareFees = (gig.client_payment * 0.029) + 0.30;
                netClientPayment -= squareFees;
            }

            // Add to profits table
            const description = `Payment for gig: ${gig.event_type} with ${gig.client}`;
            await pool.query(
                `INSERT INTO profits (category, description, amount, type)
                 VALUES ($1, $2, $3, $4)`,
                ['Income', description, netClientPayment, 'Gig Income']
            );
        } else {
            // Remove from profits table if unpaid
            const description = `Payment for gig: ${gig.event_type} with ${gig.client}`;
            await pool.query(
                'DELETE FROM profits WHERE description = $1 AND category = $2',
                [description, 'Income']
            );
        }

        res.json({ message: 'Gig payment status updated successfully.' });
    } catch (error) {
        console.error('Error updating gig payment status:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

app.post('/api/payments', async (req, res) => {
    const { email, amount, description } = req.body;

    try {
        const insertPaymentQuery = `
            INSERT INTO payments (email, amount, description)
            VALUES ($1, $2::FLOAT, $3)
            RETURNING *;
        `;

        const result = await pool.query(insertPaymentQuery, [email, amount, description]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error saving payment:', error);
        res.status(500).json({ error: 'Failed to save payment.' });
    }
});

app.get('/api/payments', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, email, amount::FLOAT, description, status, created_at
            FROM payments
            ORDER BY created_at DESC`
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
});

app.post('/api/profits', async (req, res) => {
    const { category, description, amount, type } = req.body;

    if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Valid amount is required.' });
    }

    try {
        const query = `
            INSERT INTO profits (category, description, amount, type)
            VALUES ($1, $2, $3::FLOAT, $4)
            RETURNING *;
        `;
        const values = [category, description, amount, type];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding to profits:', error);
        res.status(500).json({ error: 'Failed to add to profits.' });
    }
});

app.get('/api/profits', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT category, description, amount, type, created_at
            FROM profits
            ORDER BY created_at DESC;
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching profits data:', error);
        res.status(500).json({ error: 'Failed to fetch profits data.' });
    }
});

app.post('/api/update-profits-for-old-payments', async (req, res) => {
    try {
        // Fetch paid gigs not in profits
        const gigsResult = await pool.query(`
            SELECT id, client, client_payment, payment_method
            FROM gigs
            WHERE paid = true
              AND NOT EXISTS (
                  SELECT 1
                  FROM profits
                  WHERE profits.type = 'Gig Payment'
                  AND profits.description = CONCAT('Payment for gig: ', gigs.client)
              )
        `);

        // Insert corresponding records into the profits table for gigs
        for (const gig of gigsResult.rows) {
            let netClientPayment = gig.client_payment;

            // Apply Square fees only for Square transactions
            if (gig.payment_method === 'Square') {
                const squareFees = (gig.client_payment * 0.029) + 0.30;
                netClientPayment -= squareFees;
            }

            await pool.query(
                `INSERT INTO profits (category, description, amount, type)
                VALUES ($1, $2, $3, $4)`,
                [
                    'Income',
                    `Payment for gig: ${gig.client}`,
                    netClientPayment,
                    'Gig Payment',
                ]
            );
        }

        // Fetch paid appointments not in profits
        const appointmentsResult = await pool.query(`
            SELECT id, title, price
            FROM appointments
            WHERE paid = true
              AND NOT EXISTS (
                  SELECT 1 FROM profits
                  WHERE profits.description LIKE CONCAT('%', appointments.title, '%')
                  AND profits.amount = appointments.price
              )
        `);

        // Insert appointments into profits
        for (const appt of appointmentsResult.rows) {
            await pool.query(
                `INSERT INTO profits (category, description, amount, type)
                 VALUES ($1, $2, $3, $4)`,
                [
                    'Income',
                    `Payment for appointment: ${appt.title}`,
                    appt.price,
                    'Appointment Payment',
                ]
            );
        }

        // Fetch staff payouts not in profits
        const staffPayoutsResult = await pool.query(`
            SELECT payouts.id, users.name AS staff_name, payouts.payout_amount, payouts.description
            FROM payouts
            JOIN users ON payouts.staff_id = users.id
            WHERE payouts.status = 'Paid'
              AND NOT EXISTS (
                  SELECT 1 FROM profits
                  WHERE profits.description LIKE CONCAT('%', users.name, '%')
                  AND profits.amount = payouts.payout_amount
              )
        `);

        // Insert staff payouts into profits
        for (const payout of staffPayoutsResult.rows) {
            await pool.query(
                `INSERT INTO profits (category, description, amount, type)
                VALUES ($1, $2, $3, $4)`,
                [
                    'Expense',
                    `Staff payment for: ${payout.staff_name} - ${payout.description || 'No description provided'}`,
                    -Math.abs(payout.payout_amount), // Ensure the amount is negative
                    'Staff Payment',
                ]
            );
        }

        res.json({ message: 'Profits table updated with old payments and payouts.' });
    } catch (error) {
        console.error('Error updating profits for old payments and payouts:', error);
        res.status(500).json({ error: 'Failed to update profits for old payments and payouts.' });
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