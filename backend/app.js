// backend/app.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path'; // Import path to handle static file serving
import { fileURLToPath } from 'url'; // Required for ES module __dirname
import bcrypt from 'bcrypt';
import pool from './db.js'; // Import the centralized pool connection
import { generateQuotePDF } from './emailService.js';
import { sendGigEmailNotification } from './emailService.js';
import { sendResetEmail } from './emailService.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import 'dotenv/config';
import { google } from 'googleapis';

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from specific origins
const allowedOrigins = [
    'http://localhost:3000',
    'https://ready-bartending-gigs-portal.onrender.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    credentials: true
}));

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
async function uploadToGoogleDrive(filePath, fileName) {
    const fileMetadata = {
        name: fileName,
        parents: ['1n_Jr7go5XHStzot7FNfWcIhUjmmQ0OXq'] // Replace with the ID of your target folder in Google Drive
    };

    const media = {
        mimeType: 'application/pdf', // Replace with the appropriate MIME type if needed
        body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
    });

    return response.data;
}

// File upload route
app.post('/api/upload-w9', upload.single('w9File'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = path.join(__dirname, req.file.path);
        const fileName = req.file.originalname;

        // Upload to Google Drive
        const driveResponse = await uploadToGoogleDrive(filePath, fileName);

        // Remove the temporary file
        fs.unlinkSync(filePath);

        console.log('File uploaded to Google Drive:', driveResponse);

        res.status(200).json({
            message: 'W-9 uploaded successfully',
            driveId: driveResponse.id,
            driveLink: driveResponse.webViewLink
        });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'Failed to upload file' });
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
    } = req.body;

    try {
        const query = `
            INSERT INTO gigs (
                client, event_type, date, time, duration, location, position, gender, pay, needs_cert, confirmed, staff_needed, claimed_by, backup_needed, backup_claimed_by, latitude, longitude  
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address
                pass: process.env.EMAIL_PASS, // Your app password
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Quote #${quote.quoteNumber}`,
            text: `Hi ${quote.clientName},\n\nPlease find your quote attached.\n\nThank you!`,
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
    const { name, username, email, phone, position, preferred_payment_method, payment_details, password, role } = req.body; // Get the data from the request body

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
            [name, username, email, phone, position, preferred_payment_method, payment_details, hashedPassword, role] // Use hashedPassword here
        );

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
        const updates = req.body; // Expecting { confirmation_email_sent, chat_created }
        
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

// PATCH endpoint to unclaim a backup spot for a gig
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
        console.error('Error unclaiming backup for gig:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /gigs/:gigId/check-in
app.post('/gigs/:gigId/check-in', async (req, res) => {
    const { gigId } = req.params;
    const { username } = req.body;

    try {
        // Find the user
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userId = userResult.rows[0].id;

        // Insert or update GigAttendance
        const attendanceResult = await pool.query(`
            INSERT INTO GigAttendance (gig_id, user_id, check_in_time, is_checked_in)
            VALUES ($1, $2, NOW(), TRUE)
            ON CONFLICT (gig_id, user_id)
            DO UPDATE SET check_in_time = NOW(), is_checked_in = TRUE
            RETURNING *;
        `, [gigId, userId]);

        res.status(200).json({ message: 'Checked in successfully.', attendance: attendanceResult.rows[0] });
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
        // Find the user
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userId = userResult.rows[0].id;

        // Update GigAttendance
        const attendanceResult = await pool.query(`
            UPDATE GigAttendance
            SET check_out_time = NOW(), is_checked_in = FALSE
            WHERE gig_id = $1 AND user_id = $2
            RETURNING *;
        `, [gigId, userId]);

        if (attendanceResult.rowCount === 0) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        res.status(200).json({ message: 'Checked out successfully.', attendance: attendanceResult.rows[0] });
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
                g.date, 
                g.time, 
                g.location, 
                g.pay,
                u.name
            FROM GigAttendance a
            INNER JOIN gigs g ON a.gig_id = g.id
            INNER JOIN users u ON a.user_id = u.id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching attendance data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
        let query = `
            SELECT p.id, u.name, g.client AS gig_name, p.payout_amount, p.payout_date, p.status, p.description
            FROM payouts p
            JOIN users u ON p.staff_id = u.id
            JOIN gigs g ON p.gig_id = g.id
            WHERE 1=1
        `;
        const params = [];

        // Apply filters
        if (staffId) {
            query += ` AND p.staff_id = $${params.length + 1}`;
            params.push(staffId);
        }
        if (gigId) {
            query += ` AND p.gig_id = $${params.length + 1}`;
            params.push(gigId);
        }
        if (startDate) {
            query += ` AND p.payout_date >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.payout_date <= $${params.length + 1}`;
            params.push(endDate);
        }

        query += ` ORDER BY p.payout_date DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payouts:', error);
        res.status(500).json({ error: 'Internal server error' });
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


/*app.post('/add-client', (req, res) => {
    const newClient = req.body;
    const csvFilePath = './ClientCatalog.csv';

    // Read the existing clients in the CSV to find the highest CRM ID
    fs.readFile(csvFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading CSV:', err);
            return res.status(500).send('Failed to read client data.');
        }

        // Parse the existing CSV data to get all clients
        const clients = data.trim().split('\n').map(line => {
            const [crmId, firstName, lastName, phone, email] = line.split(',');
            return { crmId, firstName, lastName, phone, email };
        });

        // Find the highest CRM ID and generate the next one
        const highestId = clients.reduce((maxId, client) => {
            return Math.max(maxId, parseInt(client.crmId));
        }, 0);

        const newCRMId = highestId + 1; // Increment the highest ID

        // Convert the new client object to CSV format
        const csvLine = `${newCRMId},${newClient['First Name']},${newClient['Last Name']},${newClient['Phone']},${newClient['Email']}\n`;

        // Append the new client data to the CSV file
        fs.appendFile(csvFilePath, csvLine, (err) => {
            if (err) {
                console.error('Error writing to CSV:', err);
                return res.status(500).send('Failed to add client.');
            }
            res.status(200).send('Client added successfully.');
        });
    });
});8*/


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
    const { item_name, category, quantity } = req.body;

    try {
        const result = await pool.query(
            `UPDATE inventory
             SET item_name = $1, category = $2, quantity = $3, updated_at = NOW()
             WHERE barcode = $4 RETURNING *`,
            [item_name, category, quantity, barcode]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating item:', error.message);
        res.status(500).json({ error: 'Failed to update item', details: error.message });
    }
});

app.delete('/inventory/:barcode', (req, res) => {
    const { barcode } = req.params;

    pool.query('DELETE FROM inventory WHERE barcode = $1', [barcode])
        .then(() => res.status(200).send({ message: 'Item deleted successfully' }))
        .catch((error) => res.status(500).send({ error: 'Failed to delete item' }));
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