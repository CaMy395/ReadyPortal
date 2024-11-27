// backend/app.js
import express from 'express';
import cors from 'cors';
import path from 'path';  // Import path to handle static file serving
import { fileURLToPath } from 'url';  // Required for ES module __dirname
import bcrypt from 'bcrypt';
import pool from './db.js'; // Import the centralized pool connection
import tasksRouter from './routes/tasks.js'; // Adjust path as needed
import nodemailer from 'nodemailer'
import { google } from 'googleapis';

//import passport from 'passport';
//import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
//import session from 'express-session'; // Import express-session


const app = express();
const PORT = process.env.PORT || 3001;




// Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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




/*
// Configure Passport with Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create the user logic here
    } catch (err) {
      console.error(err);
      return done(err, null);
    }
  }
));

// Middleware to initialize passport
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use(passport.session());

// Route to start Google authentication
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Initialize oAuth2Client
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, // Replace with your Client ID
    process.env.CLIENT_SECRET, // Replace with your Client Secret
    'http://localhost:3000/auth/google/callback' // Replace with your redirect URI
);

 Google OAuth callback route
app.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;

    if (code) {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Use tokens.refresh_token in future requests
            console.log('Tokens acquired:', tokens);
            res.redirect('http://localhost:3000/login'); // redirect to your app’s desired page
        } catch (error) {
            console.error('Error retrieving tokens:', error);
            res.status(500).send('Authentication failed');
        }
    } else {
        res.status(400).send('Code not provided');
    }
});*/


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
    methods: ['GET', 'POST', 'PATCH', 'DELETE'], // Include all necessary methods
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));


app.use(express.json()); // Middleware to parse JSON bodies
app.use('/tasks', tasksRouter); // Register the `/tasks` route
//app.use('/appointments', appointmentRouter);// Register the appointment routes


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
    const { username, email, password, role } = req.body; // Get the data from the request body

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
            'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, email, hashedPassword, role]
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
        backup_claimed_by
    } = req.body;

    try {
        // Geocode the location
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.YOUR_GOOGLE_GEOCODING_API_KEY}`;
        const response = await fetch(geocodeUrl);
        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Geocoding failed: ${data.status}`);
        }

        const { lat, lng } = data.results[0].geometry.location;
        
        const query = `
            INSERT INTO gigs (
                client, event_type, date, time, duration, location, position, gender, pay, needs_cert, confirmed, staff_needed, claimed_by, backup_needed, backup_claimed_by, latitude, longitude
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *;
        `;

        const values = [
            client, event_type, date, time, duration, location, position, gender, pay, needs_cert, confirmed, staff_needed, claimed_by || '{}', backup_needed, backup_claimed_by || '{}', lat, lng
        ];

        const result = await pool.query(query, values);
        const newGig = result.rows[0]; // Get the newly created gig

        /* Retrieve all user emails
        const usersResult = await pool.query('SELECT email FROM users');
        const users = usersResult.rows;*/

        /* Send email notifications to all users
        await Promise.all(users.map(user => sendEmailNotification(user.email, newGig)));
        */
        res.status(201).json(newGig); // Return the newly created gig
    } catch (error) {
        console.error('Detailed Error adding new gig:', error.message || error); // Log the detailed error message
        res.status(500).json({ error: 'Error adding new gig', details: error.message || error });
    }
});

app.patch('/gigs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Expecting { confirmation_email_sent, chatCreated, paid }
        const updatedGig = await Gig.update(updates, { where: { id } });
        res.status(200).json(updatedGig);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update gig' });
    }
});

// PATCH endpoint to claim a gig
app.patch('/gigs/:id/claim', async (req, res) => {
    const gigId = req.params.id;
    const { username } = req.body; // This should be username now

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
    const { username } = req.query; // Assuming username is sent as a query parameter

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        // Fetch the user ID from the database based on the username
        const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResult.rows[0].id;

        // Fetch the attendance data for the user
        const attendanceResult = await pool.query(
            `
            SELECT 
                a.*, 
                g.client, 
                g.event_type, 
                g.date, 
                g.time, 
                g.location
                g.pay
            FROM GigAttendance a
            INNER JOIN Gigs g ON a.gig_id = g.id
            WHERE a.user_id = $1
            `,
            [userId]
        );

        // If no records are found, return an empty array
        if (attendanceResult.rowCount === 0) {
            return res.json([]); // Return an empty array instead of an error
        }

        res.json(attendanceResult.rows); // Return the attendance records
    } catch (error) {
        console.error('Error fetching user attendance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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

    try {
        const result = await pool.query('DELETE FROM gigs WHERE id = $1', [gigId]);

        if (result.rowCount > 0) {
            res.status(200).send({ message: 'Gig deleted successfully' });
        } else {
            res.status(404).send({ message: 'Gig not found' });
        }
    } catch (error) {
        console.error('Error deleting gig:', error);
        res.status(500).send({ error: 'Failed to delete the gig' });
    }
});

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI 
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'], // Scope for sending emails
    prompt: 'consent'
});

//console.log('Authorize this app by visiting this url:', authUrl);

// Set the refresh token
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const sendEmailNotification = async (email, gig) => {
    try {
        // Get a fresh access token using the refresh token
        const { token: accessToken } = await oauth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const message = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'New Gig Added!',
            html: `<p>Hello,</p>
                   <p>A new gig has been added to the platform:</p>
                   <p><strong>Client: </strong> ${gig.client}</p>
                   <p><strong>Date: </strong> ${gig.date}</p>
                   <p><strong>Time: </strong> ${gig.time}</p>
                   <p><strong>Location: </strong> ${gig.location}</p>
                   <p><strong>Pay: </strong> ${gig.pay}</p>
                   <p>Log in to claim the gig!</p>`,
        };

        await transporter.sendMail(message);
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
    };
    // Example route to send an email notification
    app.post('/send-email', async (req, res) => {
        const email = req.body.email; // assuming email is sent in the body
        const gig = req.body.gig; // assuming gig data is sent in the body

        await sendEmailNotification(email, gig);
        res.status(200).send('Email sent!');
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