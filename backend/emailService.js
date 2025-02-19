import nodemailer from 'nodemailer';
import 'dotenv/config';

const formatTime = (time) => {
    if (!time || typeof time !== 'string') return 'N/A'; // Return 'N/A' if time is invalid
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    }).format(date);
};


const sendGigEmailNotification = async (email, gig) => {
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
        subject: `New Gig Added: ${gig.event_type}`,
        html: `
            <p>Hi,</p>
            <p>A new gig has been added:</p>
            <ul>
                <li><strong>Client:</strong> ${gig.client}</li>
                <li><strong>Date:</strong> ${gig.date}</li>
                <li><strong>Time:</strong> ${formatTime(gig.time)}</li>
                <li><strong>Location:</strong> ${gig.location}</li>
                <li><strong>Pay:</strong> $${gig.pay}/hr +tips</li>
            </ul>
            <p><a href="https://ready-bartending-gigs-portal.onrender.com/">Click here to log in and claim this gig!</a></p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}: ${info.response}`);
    } catch (error) {
        console.error(`Error sending email to ${email}:`, error.message);
    }
};

export { sendGigEmailNotification };

const sendGigUpdateEmailNotification = async (email, oldGig, newGig) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    // Format functions for date and time
    const formatTime = (time) => {
        if (!time) return 'N/A';
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(date);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Relevant fields for `UserGigs.js`
    const relevantFields = [
        { key: 'client', label: 'Client' },
        { key: 'event_type', label: 'Event Type' },
        { key: 'date', label: 'Date', format: formatDate },
        { key: 'time', label: 'Time', format: formatTime },
        { key: 'duration', label: 'Duration', unit: 'hours' },
        { key: 'location', label: 'Location' },
        { key: 'position', label: 'Position' },
        { key: 'pay', label: 'Pay', format: (value) => `$${value}/hr + tips` },
        { key: 'gender', label: 'Gender' },
        { key: 'attire', label: 'Attire' },
        { key: 'indoor', label: 'Indoor', format: (value) => (value ? 'Yes' : 'No') },
        { key: 'approval_needed', label: 'Approval Needed', format: (value) => (value ? 'Yes' : 'No') },
        { key: 'on_site_parking', label: 'On-Site Parking', format: (value) => (value ? 'Yes' : 'No') },
        { key: 'local_parking', label: 'Local Parking' },
        { key: 'NDA', label: 'NDA Required', format: (value) => (value ? 'Yes' : 'No') },
        { key: 'establishment', label: 'Establishment' },
        { key: 'claimed_by', label: 'Claimed By', format: (value) => (value.length > 0 ? value.join(', ') : 'None') },
        { key: 'staff_needed', label: 'Staff Needed' },
        { key: 'backup_needed', label: 'Backup Needed' },
        { key: 'backup_claimed_by', label: 'Backup Claimed By', format: (value) => (value.length > 0 ? value.join(', ') : 'None') },
        { key: 'needs_cert', label: 'Certification', format: (value) => (value ? 'Yes' : 'No') },
        { key: 'confirmed', label: 'Confirmed', format: (value) => (value ? 'Yes' : 'No') },
    ];

    // Detect changes in relevant fields
    const changes = relevantFields
        .map(({ key, label, format, unit }) => {
            const oldValue = format ? format(oldGig[key]) : oldGig[key];
            const newValue = format ? format(newGig[key]) : newGig[key];

            if (oldValue !== newValue) {
                return {
                    label,
                    oldValue: oldValue || 'N/A',
                    newValue: newValue || 'N/A',
                    unit: unit || '',
                };
            }
            return null;
        })
        .filter(Boolean);

    // Skip sending email if no relevant changes
    if (changes.length === 0) {
        console.log('No relevant changes detected, email will not be sent.');
        return;
    }

    // Generate table rows for the changes
    const updatedFieldsTable = changes
        .map(({ label, oldValue, newValue, unit }) => `
            <tr>
                <td style="border: 1px solid #dddddd; padding: 8px;"><strong>${label}</strong></td>
                <td style="border: 1px solid #dddddd; padding: 8px;">${oldValue}</td>
                <td style="border: 1px solid #dddddd; padding: 8px;">${newValue}${unit ? ` ${unit}` : ''}</td>
            </tr>
        `)
        .join('');

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Gig Updated: ${newGig.event_type}`,
        html: `
            <p>Hi,</p>
            <p>The following gig has been updated:</p>
            <p><strong>Client:</strong> ${newGig.client}</p>
            <p><strong>Event Type:</strong> ${newGig.event_type}</p>
            <table style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">Field</th>
                        <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">Old Value</th>
                        <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">New Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${updatedFieldsTable}
                </tbody>
            </table>
            <p><a href="https://ready-bartending-gigs-portal.onrender.com/">Click here to log in and view the updates!</a></p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}: ${info.response}`);
    } catch (error) {
        console.error(`Error sending email to ${email}:`, error.message);
    }
};

export { sendGigUpdateEmailNotification };



// Function to send a quote email
import PDFDocument from 'pdfkit';
import fs from 'fs';

const generateQuotePDF = (quote, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'LETTER', // Standard page size
            margin: 30, // Reduced margin to maximize content area
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header Section: Company Name and Address
        doc.fontSize(18).font('Helvetica-Bold').text('Ready Bartending LLC.', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('1030 NW 200th Terrace, Miami, FL 33169', { align: 'center' });
        doc.moveDown(2);

        // Quote Details Section
        doc.fontSize(12).font('Helvetica-Bold').text(`Quote #: ${quote.quoteNumber}`, { align: 'left' });
        doc.fontSize(10).font('Helvetica').text(`Quote Date: ${quote.quoteDate}`, { align: 'left' });
        doc.text(`Event Date: ${quote.eventDate || 'TBD'}`, { align: 'left' });
        doc.moveDown(2);

        // Bill To Section
        doc.fontSize(12).font('Helvetica-Bold').text('BILL TO:', { align: 'left', underline: true });
        doc.fontSize(10).font('Helvetica').text(quote.clientName, { align: 'lfet' });
        doc.moveDown(4);



        // Table Header: QTY, ITEM, DESCRIPTION, UNIT PRICE, AMOUNT
        const tableHeaderY = doc.y;
        doc.fontSize(12).font('Helvetica-Bold').text('QTY', 50, tableHeaderY, { width: 40, align: 'center', fontSize: 9 });
        doc.fontSize(12).font('Helvetica-Bold').text('ITEM', 90, tableHeaderY, { width: 130, align: 'center', fontSize: 9 });
        doc.fontSize(12).font('Helvetica-Bold').text('DESCRIPTION', 220, tableHeaderY, { width: 180, align: 'center', fontSize: 9 });
        doc.fontSize(12).font('Helvetica-Bold').text('UNIT PRICE', 400, tableHeaderY, { width: 90, align: 'center', fontSize: 9 }); // Centered column
        doc.fontSize(12).font('Helvetica-Bold').text('AMOUNT', 490, tableHeaderY, { width: 90, align: 'center', fontSize: 9 });  // Centered column
        doc.moveDown();

        // Dynamic Row Height & Text Wrapping for DESCRIPTION and ITEM
        let y = doc.y + 5;
        let subtotal = 0; // Initialize subtotal here
        quote.items.forEach((item) => {
            // Ensure that validAmount is a number
            const validAmount = isNaN(item.amount) || item.amount == null ? 0 : Number(item.amount); // Convert to number and default to 0 if invalid
            
            // Calculate dynamic height based on content (if no description, increase row height)
            const descHeight = item.description ? doc.heightOfString(item.description, { width: 180, align: 'left', fontSize: 9 }) : 15;
            const itemHeight = item.name ? doc.heightOfString(item.name, { width: 130, align: 'left', fontSize: 9 }) : 15;

            // Draw QTY, ITEM, DESCRIPTION, UNIT PRICE, AMOUNT (removed extra spacing)
            doc.rect(50, y, 40, Math.max(descHeight, itemHeight)).stroke();
            doc.text(item.quantity, 55, y + 2, { width: 40, align: 'center', fontSize: 9 });

            doc.rect(90, y, 130, Math.max(descHeight, itemHeight)).stroke();
            doc.text(item.name, 95, y + 2, { width: 130, align: 'left', fontSize: 9, lineBreak: true });

            doc.rect(220, y, 180, Math.max(descHeight, itemHeight)).stroke();
            doc.text(item.description || "", 225, y + 2, { width: 180, align: 'left', fontSize: 9 });

            doc.rect(400, y, 90, Math.max(descHeight, itemHeight)).stroke();
            doc.text(`$${item.unitPrice.toFixed(2)}`, 405, y + 2, { width: 90, align: 'center', fontSize: 9 });

            doc.rect(490, y, 90, Math.max(descHeight, itemHeight)).stroke();
            doc.text(`$${validAmount.toFixed(2)}`, 495, y + 2, { width: 90, align: 'center', fontSize: 9 });

            // Update the subtotal
            subtotal += validAmount;

            y += Math.max(descHeight, itemHeight); // Adjust y position based on content height

            // Add page break if necessary
            if (y > doc.page.height - 100) { // Avoid running out of space
                doc.addPage();
                y = doc.y + 5; // Reset y position for new page
            }
        });

        // Ensure subtotal is a number before using toFixed
        const salesTax = quote.includeTax ? (subtotal * (quote.salesTaxRate / 100)) : 0;
        const total = subtotal + salesTax;

        // Add space after table content to avoid overlap with subtotal and total
        y += 20; // Add extra space before subtotal

        // Now you can safely use toFixed on subtotal and total
        doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 400, y, { align: 'right', fontSize: 9 });
        y += 15; // Move the y-position down after subtotal
        doc.text(`Total: $${total.toFixed(2)}`, 400, y, { align: 'right', fontSize: 12, font: 'Helvetica-Bold' });

        // Add space after total
        y += 20; // Move further down before displaying terms and footer

        // Display terms and payment options, aligned to the right
        doc.fontSize(9).font('Helvetica').text('Terms: A deposit is due within 2 days.', { align: 'right' });
        doc.text('Payment Options:', { align: 'right', fontSize: 9 });
        doc.text('- Square: Just reply to this email to accept the quote', { align: 'right', fontSize: 9 });
        doc.text('- Zelle: readybarpay@gmail.com', { align: 'right', fontSize: 9 });
        doc.text('- CashApp: $readybartending', { align: 'right', fontSize: 9 });
        doc.moveDown(2); // Add some space after the payment options

        // Footer Section - Display text as a regular line across the page
        doc.fontSize(9).font('Helvetica').text('Thank you for your business!', { align: 'right' });
        doc.moveDown(2); // Add space after the thank you message
        doc.fontSize(8).font('Helvetica').text('Ready Bartending LLC.', { align: 'right' });

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
    });
};

export { generateQuotePDF };

// Function to send the password reset email
const transporter = nodemailer.createTransport({
    service: 'gmail',  // You can replace this with another email provider if necessary
    auth: {
        user: process.env.ADMIN_EMAIL,  // Your email address
        pass: process.env.ADMIN_PASS,  // Your email password
    },
});
const sendResetEmail = (email, resetLink) => {
    const mailOptions = {
        from: process.env.MY_EMAIL_USER,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <h3>Password Reset</h3>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">${resetLink}</a>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

export { sendResetEmail };


// Registration-specific email notification
const sendRegistrationEmail = async (recipient, username, name) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email provider
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_PASS,
        },
    });

    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: recipient,
        subject: 'Welcome to Our Platform!',
        html: `
            <p>Hello ${name},</p>
            <p>Welcome to our platform! Your account has been created successfully.</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Email:</strong> ${recipient}</p>
            <p>Thank you for registering with us.</p>
            <p>Best regards,</p>
            <p>Your Team</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Registration email sent to ${recipient}: ${info.response}`);
    } catch (error) {
        console.error(`Error sending registration email to ${recipient}:`, error.message);
    }
};

export { sendRegistrationEmail };


//Send client intake form
const sendIntakeFormEmail = async (formData) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });
    

    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: process.env.EMAIL_USER, // Email of the admin who receives the form details
        subject: 'New Client Intake Form Submission',
        html: `
            <h3>New Client Intake Form Submission</h3>
            <p><strong>Full Name:</strong> ${formData.fullName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Phone:</strong> ${formData.phone}</p>
            <p><strong>Date:</strong> ${formData.date}</p>
            <p><strong>Time:</strong> ${formatTime(formData.time)}</p>
            <p><strong>Entity Type:</strong> ${formData.entityType}</p>
            <p><strong>Business Name:</strong> ${formData.businessName || 'N/A'}</p>
            <p><strong>First-Time Booking:</strong> ${formData.firstTimeBooking ? 'Yes' : 'No'}</p>
            <p><strong>Event Type:</strong> ${formData.eventType}</p>
            <p><strong>Age Range:</strong> ${formData.ageRange}</p>
            <p><strong>Event Name:</strong> ${formData.eventName}</p>
            <p><strong>Event Location:</strong> ${formData.eventLocation}</p>
            <p><strong>Gender Preference:</strong> ${formData.genderMatters ? formData.preferredGender : 'No preference'}</p>
            <p><strong>Open Bar:</strong> ${formData.openBar ? 'Yes' : 'No'}</p>
            <p><strong>Facilities:</strong> ${formData.locationFeatures?.join(', ') || 'None'}</p>
            <p><strong>Staff Attire:</strong> ${formData.staffAttire}</p>
            <p><strong>Event Duration:</strong> ${formData.eventDuration}</p>
            <p><strong>On-Site Parking:</strong> ${formData.onSiteParking ? 'Yes' : 'No'}</p>
            <p><strong>Local Parking:</strong> ${formData.localParking ? 'Yes' : 'No'}</p>
            <p><strong>Additional Prep Time:</strong> ${formData.additionalPrepTime ? 'Yes' : 'No'}</p>
            <p><strong>NDA Required:</strong> ${formData.ndaRequired ? 'Yes' : 'No'}</p>
            <p><strong>Food Catering:</strong> ${formData.foodCatering ? 'Yes' : 'No'}</p>
            <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
            <p><strong>Home or Venue:</strong> ${formData.homeOrVenue}</p>
            <p><strong>Venue Name:</strong> ${formData.venueName || 'N/A'}</p>
            <p><strong>Bartending License Required:</strong> ${formData.bartendingLicenseRequired ? 'Yes' : 'No'}</p>
            <p><strong>Insurance Required:</strong> ${formData.insuranceRequired ? 'Yes' : 'No'}</p>
            <p><strong>Liquor License Required:</strong> ${formData.liquorLicenseRequired ? 'Yes' : 'No'}</p>
            <p><strong>Indoors Event:</strong> ${formData.indoorsEvent ? 'Yes' : 'No'}</p>
            <p><strong>Budget:</strong> ${formData.budget}</p>
            <p><strong>Add-ons:</strong> ${formData.addons?.join(', ') || 'None'}</p>
            <p><strong>How Heard:</strong> ${formData.howHeard}</p>
            <p><strong>Referral:</strong> ${formData.referral || 'None'}</p>
            <p><strong>Referral Details:</strong> ${formData.referralDetails || 'None'}</p>
            <p><strong>Additional Comments:</strong> ${formData.additionalComments || 'None'}</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Intake form email sent: ${info.response}`);
    } catch (error) {
        console.error(`Error sending intake form email: ${error.message}`);
    }
};

export { sendIntakeFormEmail };

//Send crafts intake form
const sendCraftsFormEmail = async (formData) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });
    

    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: process.env.EMAIL_USER, // Email of the admin who receives the form details
        subject: 'New Crafts and Cocktails Form Submission',
        html: `
            <h3>New Crafts and Cocktails Form Submission</h3>
            <p><strong>Full Name:</strong> ${formData.fullName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Phone:</strong> ${formData.phone}</p>
            <p><strong>Date:</strong> ${formData.date}</p>
            <p><strong>Time:</strong> ${formatTime(formData.time)}</p>
            <p><strong>Event Type:</strong> ${formData.eventType}</p>
            <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
            <p><strong>Add-ons:</strong> ${
                formData.addons && formData.addons.length > 0 
                    ? formData.addons.join(', ') 
                    : 'None'
            }</p>
            <p><strong>How Heard:</strong> ${formData.howHeard}</p>
            <p><strong>Referral:</strong> ${formData.referral || 'None'}</p>
            <p><strong>Referral Details:</strong> ${formData.referralDetails || 'None'}</p>
            <p><strong>Additional Comments:</strong> ${formData.additionalComments || 'None'}</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Crafts form email sent: ${info.response}`);
    } catch (error) {
        console.error(`Error sending crafts form email: ${error.message}`);
    }
};

export { sendCraftsFormEmail };

//Send course intake form
const sendBartendingInquiryEmail = async (formData) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });
    

    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: process.env.EMAIL_USER, // Email of the admin who receives the form details
        subject: 'Bartending Course Inquiry',
        html: `
            <h3>Bartending Course Inquiry</h3>
        <p><strong>Full Name:</strong> ${formData.fullName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
        <p><strong>Are you at least 18 years old?:</strong> ${formData.isAdult}</p>
        <p><strong>Do you have any experience?:</strong> ${formData.experience}</p>
        <p><strong>Are you able to dedicate time to a set schedule?:</strong> ${formData.setSchedule}</p>
        <p><strong>Referral:</strong> ${formData.referral}</p>
        <p><strong>Referral Details:</strong> ${formData.referralDetails || 'None'}</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Course form email sent: ${info.response}`);
    } catch (error) {
        console.error(`Error sending course form email: ${error.message}`);
    }
};

export { sendBartendingInquiryEmail };

//Send bar class intake form
const sendBartendingClassesEmail = async (formData) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });
    

    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: process.env.EMAIL_USER, // Email of the admin who receives the form details
        subject: 'Bartending Classes Inquiry',
        html: `
            <h3>Bartending Classes Inquiry</h3>
        <p><strong>Full Name:</strong> ${formData.fullName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
        <p><strong>Are you at least 18 years old?:</strong> ${formData.isAdult}</p>
        <p><strong>Do you have any experience?:</strong> ${formData.experience}</p>
        <p><strong>How many classes do you want to book?:</strong> ${formData.classCount}</p>
        <p><strong>Referral:</strong> ${formData.referral}</p>
        <p><strong>Referral Details:</strong> ${formData.referralDetails || 'None'}</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Bar Class form email sent: ${info.response}`);
    } catch (error) {
        console.error(`Error sending bar class form email: ${error.message}`);
    }
};

export { sendBartendingClassesEmail };

const sendTutoringIntakeEmail = async (formData) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.MY_EMAIL_USER,
            pass: process.env.MY_EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });

    // Additional recipient for United Mentors Organization
    const additionalRecipient = formData.whyHelp === 'United Mentors Organization'
        ? 'easylearning@stemwithlyn.com' // Replace with the correct email address
        : null;

    const recipients = [process.env.EMAIL_USER];
    if (additionalRecipient) {
        recipients.push(additionalRecipient);
    }

    const mailOptions = {
        from: process.env.MY_EMAIL_USER,
        to: recipients.join(','), // Send to multiple recipients
        subject: `Tutoring Intake Form Submission`,
        html: `
            <h3>Tutoring Intake Form Submission</h3>
            <p><strong>Full Name:</strong> ${formData.fullName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Phone:</strong> ${formData.phone}</p>
            <p><strong>Have Booked Before:</strong> ${formData.haveBooked}</p>
            <p><strong>Service Requested:</strong> ${formData.whyHelp}</p>
            ${formData.learnDisable ? `<p><strong>Learning Disability:</strong> ${formData.whatDisable || 'None'}</p>` : ''}
            <p><strong>Age:</strong> ${formData.age}</p>
            <p><strong>Grade:</strong> ${formData.grade}</p>
            <p><strong>Subject:</strong> ${formData.subject}</p>
            ${
                formData.subject === 'Math'
                    ? `<p><strong>Math Subject:</strong> ${formData.mathSubject}</p>`
                    : formData.subject === 'Science'
                    ? `<p><strong>Science Subject:</strong> ${formData.scienceSubject}</p>`
                    : ''
            }
            <p><strong>Current Grade:</strong> ${formData.currentGrade}</p>
            <p><strong>Payment Method:</strong> ${formData.paymentMethod}</p>
            <p><strong>Additional Details:</strong> ${formData.additionalDetails || 'None'}</p>
        `,
    };

    try {
        console.log('Final recipients:', recipients);

        const info = await transporter.sendMail(mailOptions);
        console.log(`Tutoring intake email sent: ${info.response}`);
    } catch (error) {
        console.error(`Error sending tutoring intake email: ${error.message}`);
    }
};

export { sendTutoringIntakeEmail };



const sendPaymentEmail = async (email, link) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Payment Link',
        html: `<p>Please complete your payment using the following link:</p><a href="${link}" target="_blank">${link}</a>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Payment link sent to ${email}`);
    } catch (error) {
        console.error(`Error sending payment link to ${email}:`, error.message);
    }
};

export { sendPaymentEmail };


// Function specifically for appointment emails
const sendAppointmentEmail = async ({ title, email, full_name, date, time, end_time, description }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
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
        subject: `Appointment Confirmation: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>Your appointment has been scheduled. If you need to cancel or reschedule, please reply to this email.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${formatTime(time)} - ${end_time ? formatTime(end_time) : 'TBD'}</li>
                <li><strong>Description:</strong> ${description || 'No additional details'}</li>
            </ul>
            <p> If you have a virtual meeting or interview please join here Caitlyn Myland is inviting you to a scheduled Zoom meeting.</p>

            <p> Topic: Ready Bartending Meeting Room</p>
            <p> Join Zoom Meeting</p>
            <p> https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09</p>

            <p> Meeting ID: 369 774 6091</p>
            <p> Passcode: Lyn</p>

            <p>Thank you!</p>
            <p>Best regards,<br>Your Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Appointment email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending appointment email to ${email}:`, error.message);
    }
};

export { sendAppointmentEmail };

// Function specifically for appointment emails
const sendRescheduleEmail = async ({ title, email, full_name, date, time, end_time, description }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
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
        subject: `Appointment Confirmation: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>Your appointment has been rescheduled. If you need to cancel or reschedule, please reply to this email.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${formatTime(time)} - ${end_time ? formatTime(end_time) : 'TBD'}</li>
                <li><strong>Description:</strong> ${description || 'No additional details'}</li>
            </ul>
            <p> If you have a virtual meeting or interview please join here Caitlyn Myland is inviting you to a scheduled Zoom meeting.</p>

            <p> Topic: Ready Bartending Meeting Room</p>
            <p> Join Zoom Meeting</p>
            <p> https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09</p>

            <p> Meeting ID: 369 774 6091</p>
            <p> Passcode: Lyn</p>

            <p>Thank you!</p>
            <p>Best regards,<br>Your Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Appointment email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending appointment email to ${email}:`, error.message);
    }
};

export { sendRescheduleEmail };


const sendTutoringApptEmail = async ({ title, email, full_name, date, time, end_time, description }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MY_EMAIL_USER,
            pass: process.env.MY_EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });

    const mailOptions = {
        from: process.env.MY_EMAIL_USER,
        to: email,
        subject: `Appointment Confirmation: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>Your appointment has been scheduled. If you need to cancel or reschedule, please reply to this email.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${formatTime(time)} - ${end_time ? formatTime(end_time) : 'TBD'}</li>
                <li><strong>Description:</strong> ${description || 'No additional details'}</li>
            </ul>
            <p>If you have a virtual meeting or interview, please join here:</p>
            <p>Caitlyn Myland is inviting you to a scheduled Zoom meeting.</p>
            <p><strong>Topic:</strong> Stem with Lyn Meeting Room</p>
            <p><strong>Join Zoom Meeting:</strong></p>
            <p><a href="https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09">https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09</a></p>
            <p><strong>Meeting ID:</strong> 369 774 6091</p>
            <p><strong>Passcode:</strong> Lyn</p>
            <p>Thank you!</p>
            <p>Best regards,<br>Your Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Tutoring appointment email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending tutoring appointment email to ${email}:`, error.message);
    }
};

export { sendTutoringApptEmail };


// Function specifically for appointment emails
const sendTutoringRescheduleEmail = async ({ title, email, full_name, old_date, old_time, new_date, new_time, end_time, description }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MY_EMAIL_USER,
            pass: process.env.MY_EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });

    const mailOptions = {
        from: process.env.MY_EMAIL_USER,
        to: email,
        subject: `Appointment Rescheduled: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>Your appointment has been rescheduled. Please see the updated details below:</p>
            <p><strong>Old Details:</strong></p>
            <ul>
                <li><strong>Date:</strong> ${old_date}</li>
                <li><strong>Time:</strong> ${formatTime(old_time)}</li>
            </ul>
            <p><strong>New Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${new_date}</li>
                <li><strong>Time:</strong> ${formatTime(new_time)} - ${end_time ? formatTime(end_time) : 'TBD'}</li>
                <li><strong>Description:</strong> ${description || 'No additional details'}</li>
            </ul>
            <p>If you have a virtual meeting or interview, please join here:</p>
            <p>Caitlyn Myland is inviting you to a scheduled Zoom meeting.</p>
            <p><strong>Topic:</strong> Stem with Lyn Meeting Room</p>
            <p><strong>Join Zoom Meeting:</strong></p>
            <p><a href="https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09">https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09</a></p>
            <p><strong>Meeting ID:</strong> 369 774 6091</p>
            <p><strong>Passcode:</strong> Lyn</p>
            <p>Thank you!</p>
            <p>Best regards,<br>Your Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Tutoring reschedule email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending tutoring reschedule email to ${email}:`, error.message);
    }
};

export { sendTutoringRescheduleEmail };

const sendCancellationEmail = async ({ title, email, full_name, date, time, description }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MY_EMAIL_USER,
            pass: process.env.MY_EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });

    const mailOptions = {
        from: process.env.MY_EMAIL_USER,
        to: email,
        subject: `Appointment Cancellation: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>We regret to inform you that your appointment has been cancelled. Please see the details below:</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${formatTime(time)}</li>
                <li><strong>Description:</strong> ${description || 'No additional details'}</li>
            </ul>
            <p>If you have any questions or would like to reschedule, please contact us.</p>
            <p>Thank you!</p>
            <p>Best regards,<br>Your Team</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Cancellation email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending cancellation email to ${email}:`, error.message);
    }
};

export { sendCancellationEmail };


const sendTextMessage = async ({ phone, carrier, message }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Replace with your email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // Allow self-signed certificates
        },
    });

    // Map of carrier domains
    const carrierDomains = {
        att: 'txt.att.net',
        verizon: 'vtext.com',
        tmobile: 'tmomail.net',
        boost: 'sms.myboostmobile.com',
        metro: 'mymetropcs.com',
    };

    const carrierDomain = carrierDomains[carrier.toLowerCase()];
    if (!carrierDomain) {
        throw new Error(`Unsupported carrier: ${carrier}`);
    }
    

    const recipient = `${phone}@${carrierDomain}`;

    const mailOptions = {
        from: process.env.MY_EMAIL_USER,
        to: recipient,
        subject: 'Task Reminder!', // Subject is ignored by SMS
        text: message, // SMS content goes here
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Text message sent to ${recipient}`);
    } catch (error) {
        console.error(`Error sending text message to ${recipient}:`, error.message);
    }
};

export { sendTextMessage };

const sendGigReminderText = async (phone, gig) => {
    if (!phone) {
        console.error('❌ No phone number provided for clock-in reminder.');
        return;
    }

    // Format the text message
    const message = `🚨 Time to clock in! 🚨\nYour gig (${gig.event_type}) starts now at ${gig.location}. Please check in!`;

    // Define carrier domains for different mobile providers
    const carrierDomains = ['txt.att.net', 'tmomail.net', 'vtext.com', 'messaging.sprintpcs.com', 'email.uscc.net'];

    for (const carrier of carrierDomains) {
        const smsEmail = `${phone}@${carrier}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: smsEmail,
            subject: '',
            text: message,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`📩 Clock-in reminder sent to ${smsEmail}`);
        } catch (error) {
            console.error(`❌ Failed to send clock-in reminder to ${smsEmail}:`, error.message);
        }
    }
};

export { sendGigReminderText };
