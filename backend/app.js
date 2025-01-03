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
import { generateQuotePDF } from './emailService.js';
import { sendGigEmailNotification } from './emailService.js';
import { sendRegistrationEmail } from './emailService.js';
import { sendResetEmail } from './emailService.js';
import { sendIntakeFormEmail } from './emailService.js';
import { sendPaymentEmail } from './emailService.js';
import { sendAppointmentEmail } from './emailService.js';
import { sendRescheduleEmail } from './emailService.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import 'dotenv/config';
import { google } from 'googleapis';
import {WebSocketServer} from 'ws';
import http from 'http';


const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Allow requests from specific origins
const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://ready-bartending-gigs-portal.onrender.com',
    'https://effective-spoon-wr7j5jqp7rjqcr4g-3001.app.github.dev',
    'https://effective-spoon-wr7j5jqp7rjqcr4g-3000.app.github.dev'
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
                needs_cert, confirmed, staff_needed, claimed_by, backup_needed, backup_claimed_by, 
                latitude, longitude, attire, indoor, approval_needed, on_site_parking, local_parking, 
                NDA, establishment
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 
                $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21, $22, 
                $23, $24
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

        // Send email notifications
        const emailPromises = users.map(async (user) => {
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

// app.js

// Update a gig by ID
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
        gender,
        pay,
        claimed_by,
        staff_needed,
        backup_needed,
        backup_claimed_by,
        confirmed,
    } = req.body;

    try {
        const updatedGig = await pool.query(
            `
            UPDATE gigs
            SET 
                client = $1,
                event_type = $2,
                date = $3,
                time = $4,
                duration = $5,
                location = $6,
                position = $7,
                gender = $8,
                pay = $9,
                claimed_by = $10,
                staff_needed = $11,
                backup_needed = $12,
                backup_claimed_by = $13,
                confirmed = $14
            WHERE id = $15
            RETURNING *;
            `,
            [
                client,
                event_type,
                date,
                time,
                duration,
                location,
                position,
                gender,
                pay,
                claimed_by,
                staff_needed,
                backup_needed,
                backup_claimed_by,
                confirmed,
                gigId,
            ]
        );

        if (updatedGig.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }

        res.json(updatedGig.rows[0]);
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

app.patch('/gigs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Expecting { confirmation_email_sent, chat_created, review_sent }
        
        // Dynamically build the query to update fields
        const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`);
        const values = Object.values(updates);
        
        const query = `UPDATE gigs SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`;
        const result = await pool.query(query, [...values, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gig not found' });
        }
        
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating gig:', error);
        res.status(500).json({ error: 'Failed to update gig', details: error.message });
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


app.post('/api/payouts', async (req, res) => {
    const { staff_id, gig_id, payout_amount, description } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO payouts (staff_id, gig_id, payout_amount, description) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [staff_id, gig_id, payout_amount, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error saving payout:', error);
        res.status(500).json({ error: 'Internal server error' });
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

    if (!userId || !gigId || !amount || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const extraPayoutQuery = `
            INSERT INTO extra_payouts (user_id, gig_id, amount, description)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const extraPayoutValues = [userId, gigId, amount, description];
        const extraPayoutResult = await pool.query(extraPayoutQuery, extraPayoutValues);

        res.status(201).json(extraPayoutResult.rows[0]);
    } catch (error) {
        console.error('Error adding extra payout:', error);
        res.status(500).send('Server Error');
    }
});




app.patch('/api/gigs/:gigId/attendance/:userId/pay', async (req, res) => {
    const { gigId, userId } = req.params;

    console.log('Received request to mark as paid:', { gigId, userId });

    try {
        const result = await pool.query(
            `UPDATE GigAttendance
             SET is_paid = TRUE
             WHERE gig_id = $1 AND user_id = $2
             RETURNING *`,
            [gigId, userId]
        );

        if (result.rowCount === 0) {
            console.log('No attendance record found to update.');
            return res.status(404).json({ error: 'Gig attendance record not found.' });
        }

        console.log('Updated record:', result.rows[0]);
        res.json({ message: 'Payment marked as completed.', attendance: result.rows[0] });
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
        const result = await pool.query('SELECT * FROM tasks');
        res.status(200).json(result.rows);  // Send tasks as JSON response
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
        additionalComments
    } = req.body;

    const clientInsertQuery = `
        INSERT INTO clients (full_name, email, phone)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING;
    `;

    try {
        // Insert client data
        await pool.query(clientInsertQuery, [fullName, email, phone]);
        // Insert data into the database
        await pool.query(
            `INSERT INTO intake_forms 
            (full_name, email, phone, event_date, event_time, entity_type, business_name, first_time_booking, event_type, age_range, event_name, 
             event_location, gender_matters, preferred_gender, open_bar, location_facilities, staff_attire, event_duration, on_site_parking, 
             local_parking, additional_prep, nda_required, food_catering, guest_count, home_or_venue, venue_name, bartending_license, 
             insurance_required, liquor_license, indoors, budget, addons, how_heard, referral, additional_details, additional_comments) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::TEXT[], $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 
            $27, $28, $29, $30, $31, $32::TEXT[], $33, $34, $35, $36)`,
            [
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
                additionalComments
            ]
        );

        // Send email notification
        try {
            await sendIntakeFormEmail({
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
                additionalComments
            });

            console.log(`Intake form email sent to admin.`);
        } catch (emailError) {
            console.error('Error sending intake form email:', emailError.message);
        }

        res.status(201).json({ message: 'Form submitted successfully!' });
    } catch (error) {
        console.error('Error saving form submission:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
        // Generate the payment link using Square's API
        const response = await checkoutApi.createPaymentLink({
            idempotencyKey: new Date().getTime().toString(), // Unique key for this request
            quickPay: {
                name: 'Payment for Services',
                description: description || 'Please complete your payment.',
                priceMoney: {
                    amount: Math.round(parseFloat(amount) * 100), // Convert dollars to cents
                    currency: 'USD',
                },
                locationId: process.env.SQUARE_LOCATION_ID, // Add the locationId
            },
        });

        const paymentLink = response.result.paymentLink.url;

        // Optionally send the payment link via email
        await sendPaymentEmail(email, paymentLink);

        res.status(200).json({ url: paymentLink });
    } catch (error) {
        console.error('Error creating payment link:', error);
        res.status(500).json({ error: 'Failed to create payment link' });
    }
});


// Get all appointments
app.get('/appointments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY date, time');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/appointments', async (req, res) => {
    const { title, description, date, time, end_time, client_id } = req.body;

    try {
        // Fetch client details
        const client = await pool.query('SELECT * FROM clients WHERE id = $1', [client_id]);

        if (client.rowCount === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const clientEmail = client.rows[0].email;
        const clientName = client.rows[0].name;

        // Insert the new appointment
        const result = await pool.query(
            'INSERT INTO appointments (title, description, date, time, end_time, client_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, description, date, time, end_time, client_id]
        );

        // Send confirmation email
        await sendAppointmentEmail(clientEmail, clientName, {
            title,
            date,
            time,
            end_time,
            description,
        });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/appointments/:id', async (req, res) => {
    const appointmentId = req.params.id;
    const { title, description, date, time, end_time, client_id } = req.body;

    try {
        // Check if the appointment exists
        const existingAppointment = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (existingAppointment.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // Update the appointment
        const result = await pool.query(
            `UPDATE appointments 
            SET title = $1, description = $2, date = $3, time = $4, end_time = $5, client_id = $6 
            WHERE id = $7 
            RETURNING *`,
            [title, description, date, time, end_time, client_id, appointmentId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const updatedAppointment = result.rows[0];

        // Fetch the client's email and name
        const clientResult = await pool.query(
            `SELECT email, full_name FROM clients WHERE id = $1`,
            [client_id]
        );

        if (clientResult.rowCount === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = clientResult.rows[0];

        // Send the email
        await sendRescheduleEmail(
            client.email,
            client.full_name,
            updatedAppointment
        );

        res.status(200).json(updatedAppointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});


// Delete an appointment
app.delete('/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ error: 'Internal server error' });
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