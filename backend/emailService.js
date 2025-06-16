import nodemailer from 'nodemailer';
import 'dotenv/config';
import path from "path";

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

// emailService.js

const generateQuotePDF = (quote) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 30 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Header Section
    doc.fontSize(18).font('Helvetica-Bold').text('Ready Bartending LLC.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('1030 NW 200th Terrace, Miami, FL 33169', { align: 'center' });
    doc.moveDown(2);

    // Quote Details
    doc.fontSize(12).font('Helvetica-Bold').text(`Quote #: ${quote.quote_number || 'N/A'}`);
    doc.fontSize(10).font('Helvetica').text(`Quote Date: ${quote.quote_date || 'N/A'}`);
    doc.text(`Event Date: ${
    quote.event_date 
        ? new Date(quote.event_date).toLocaleDateString('en-US') 
        : 'TBD'
    }`);
    doc.text(`Event Time: ${quote.event_time || 'TBD'}`);
    doc.text(`Location: ${quote.location || 'TBD'}`);
    doc.moveDown(2);

    // Bill To
    doc.text('Bill To:', { underline: true });
    doc.text(`Client: ${quote.client_name || ''}`);
    doc.text(`Email: ${quote.client_email || ''}`);
    doc.text(`Phone: ${quote.client_phone || ''}`);
    if (quote.entity_type === 'business') {
      doc.text(`Organization: ${quote.bill_to_organization || ''}`);
      doc.text(`Attention: ${quote.bill_to_contact || ''}`);
    }
    doc.moveDown();

    // Items Table
    doc.text('Items:', { underline: true });
    const items = Array.isArray(quote.items) ? quote.items : [];

    let subtotal = 0;
    if (items.length === 0) {
      doc.text('No items listed.');
    } else {
      // Table headers
    // === Column setup ===
    const columnWidths = {
    qty: 40,
    item: 80,
    desc: 180,
    unit: 90,
    amount: 90,
    };

    const columnPositions = {
    qty: 50,
    item: 50 + columnWidths.qty,
    desc: 50 + columnWidths.qty + columnWidths.item,
    unit: 50 + columnWidths.qty + columnWidths.item + columnWidths.desc,
    amount: 50 + columnWidths.qty + columnWidths.item + columnWidths.desc + columnWidths.unit,
    };

    let y = doc.y + 10;
    const rowHeight = 30;
    const baseRowHeight = 30;

    // === Draw table header ===
    doc.font('Helvetica-Bold');
    doc.rect(50, y, 500, rowHeight).stroke();
    // Vertical column lines
    const xLines = [
    columnPositions.qty,
    columnPositions.item,
    columnPositions.desc,
    columnPositions.unit,
    columnPositions.amount,
    550 // right edge of table
    ];

    xLines.forEach(x => {
    doc.moveTo(x, y)
        .lineTo(x, y + rowHeight)
        .stroke();
    });


    doc.text('QTY', columnPositions.qty + 5, y + 8, { width: columnWidths.qty - 10 });
    doc.text('ITEM', columnPositions.item + 5, y + 8, { width: columnWidths.item - 10 });
    doc.text('DESCRIPTION', columnPositions.desc + 5, y + 8, { width: columnWidths.desc - 10 });
    doc.text('UNIT PRICE', columnPositions.unit + 5, y + 8, { width: columnWidths.unit - 10, align: 'right' });
    doc.text('AMOUNT', columnPositions.amount + 5, y + 8, { width: columnWidths.amount - 10, align: 'right' });

    y += rowHeight; // Move to next row for items
    doc.font('Helvetica'); // switch back to normal font

    items.forEach((item) => {
    const quantity = isNaN(item.quantity) ? 1 : Number(item.quantity);
    const unitPrice = isNaN(item.unitPrice) ? 0 : Number(item.unitPrice);
    const amount = isNaN(item.amount) ? quantity * unitPrice : Number(item.amount);
    subtotal += amount;

    // Estimate required row height based on wrapped description
    const descHeight = doc.heightOfString(item.description || '', {
        width: columnWidths.desc - 10,
    });

    const rowHeight = Math.max(baseRowHeight, descHeight + 10);

    // Draw row box
    doc.rect(50, y, 500, rowHeight).stroke();
    // Vertical lines for each column in this row
    [
    columnPositions.qty,
    columnPositions.item,
    columnPositions.desc,
    columnPositions.unit,
    columnPositions.amount,
    550 // far right edge
    ].forEach(x => {
    doc.moveTo(x, y)
        .lineTo(x, y + rowHeight)
        .stroke();
    });

    // Use consistent vertical offset inside the row
    const textY = y + 8;

    doc.text(quantity.toString(), columnPositions.qty + 5, textY, {
        width: columnWidths.qty - 10,
    });

    doc.text(item.name || '', columnPositions.item + 5, textY, {
        width: columnWidths.item - 10,
    });

    doc.text(item.description || '', columnPositions.desc + 5, textY, {
        width: columnWidths.desc - 10,
    });

    doc.text(`$${unitPrice.toFixed(2)}`, columnPositions.unit + 5, textY, {
        width: columnWidths.unit - 10,
        align: 'right',
    });

    doc.text(`$${amount.toFixed(2)}`, columnPositions.amount + 5, textY, {
        width: columnWidths.amount - 10,
        align: 'right',
    });

    y += rowHeight;
    });

    // Add spacing after table to prevent overlap with totals
    doc.moveDown(2);
    doc.moveTo(50, y).lineTo(550, y).stroke(); // Optional final border under table
    doc.moveDown(2);
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Subtotal: $${subtotal.toFixed(2)}`, 350, doc.y, { align: 'right', width: 200 });
    doc.text(`Total: $${Number(quote.total_amount || subtotal).toFixed(2)}`, 350, doc.y + 15, { align: 'right', width: 200 });

    if (quote.deposit_amount) {
      doc.font('Helvetica').text(`Deposit Paid: $${Number(quote.deposit_amount).toFixed(2)}`, { align: 'right' });
    }
    if (quote.deposit_date) {
      doc.font('Helvetica').text(`Deposit Date: ${quote.deposit_date}`, { align: 'right' });
    }
    if (quote.paid_in_full) {
      doc.fillColor('green').font('Helvetica-Bold').text('✅ Paid in Full', { align: 'right' }).fillColor('black');
    }

    doc.moveDown(2);

    // Terms and Payment Info
    doc.fontSize(9).font('Helvetica').text('Terms: A minimum deposit of $35 or 25% of the package total is due within 2 days of quote receipt. $35 from deposits are Non-Refundable.', { align: 'right' });
    doc.text('Payment Options:', { align: 'right', fontSize: 9 });
    doc.text('- Square: Just reply to this email to accept the quote', { align: 'right', fontSize: 9 });
    doc.text('- Zelle: readybarpay@gmail.com', { align: 'right', fontSize: 9 });
    doc.text('- CashApp: $readybartending', { align: 'right', fontSize: 9 });

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').text('Thank you for your business!', { align: 'right' });
    doc.fontSize(8).font('Helvetica').text('Ready Bartending LLC.', { align: 'right' });

    doc.end();
  });
};

const sendQuoteEmail = async (recipientEmail, quote) => {
  const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // ⛔ allow self-signed certs (DEV ONLY)
  }
});


  const pdfBuffer = await generateQuotePDF(quote);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: 'Your Quote from Ready Bartending',
    text: 'Attached is your quote.',
    attachments: [
      {
        filename: `Quote-${quote.quote_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

export { sendQuoteEmail, generateQuotePDF };


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
            <p><strong>Event Type:</strong> ${formData.eventType}</p>
            <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
            <p><strong>Add-ons:</strong> ${
            Array.isArray(formData.addons)
                ? formData.addons.map(a =>
                    typeof a === 'string'
                    ? a
                    : `${a.name} (x${a.quantity || 1} @ $${a.price || 0})`
                ).join(', ')
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


//Send crafts intake form
const sendMixNSipFormEmail = async (formData) => {
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
        subject: 'New Mix N Sip Form Submission',
        html: `
            <h3>New Mix N Sip Form Submission</h3>
            <p><strong>Full Name:</strong> ${formData.fullName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Phone:</strong> ${formData.phone}</p>
            <p><strong>Event Type:</strong> ${formData.eventType}</p>
            <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
            <p><strong>Add-ons:</strong> ${
            Array.isArray(formData.addons)
                ? formData.addons.map(a =>
                    typeof a === 'string'
                    ? a
                    : `${a.name} (x${a.quantity || 1} @ $${a.price || 0})`
                ).join(', ')
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
        console.log(`Mix N Sip form email sent: ${info.response}`);
    } catch (error) {
        console.error(`Error sending Mix N Sip form email: ${error.message}`);
    }
};

export { sendMixNSipFormEmail };


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
        subject: `Bartending Course Inquiry - ${formData.setSchedule}`, 
        html: `
            <h3>Bartending Course Inquiry</h3>
        <p><strong>Full Name:</strong> ${formData.fullName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
        <p><strong>Are you at least 18 years old?:</strong> ${formData.isAdult}</p>
        <p><strong>Do you have any experience?:</strong> ${formData.experience}</p>
        <p><strong>Which upcoming class would you like to enroll? (All classes are Saturdays 11AM-2:00PM):</strong> ${formData.setSchedule}</p>
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

    const schedulingEmail = "readybartending.schedule@gmail.com"; // ✅ Replace with your email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: [email, schedulingEmail],
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
const sendRescheduleEmail = async ({ title, email, full_name, new_date, new_time, end_time, description }) => {

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

    const schedulingEmail = "readybartending.schedule@gmail.com"; // ✅ Replace with your email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: [email, schedulingEmail],
        subject: `Appointment Confirmation: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>Your appointment has been rescheduled. If you need to cancel or reschedule, please reply to this email.</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${new_date}</li>
                <li><strong>Time:</strong> ${formatTime(new_time)} - ${end_time ? formatTime(end_time) : 'TBD'}</li>
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


const sendCancellationEmail = async ({ title, email, full_name, date, time, end_time, description }) => {
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

    const schedulingEmail = "readybartending.schedule@gmail.com"; // ✅ Replace with your email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: [email, schedulingEmail],
        subject: `Appointment Cancellation: ${title}`,
        html: `
            <p>Hello ${full_name},</p>
            <p>We regret to inform you that your appointment has been cancelled. Please see the details below:</p>
            <p><strong>Details:</strong></p>
            <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${formatTime(time)} - ${end_time ? formatTime(end_time) : 'TBD'}</li>
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

//Task Alerts
const sendTaskTextMessage = async ({ phone, carrier, task, due_date }) => {
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

    // Carrier domains mapping
    const carrierDomains = {
        att: 'txt.att.net',
        verizon: 'vtext.com',
        tmobile: 'tmomail.net',
        boost: 'sms.myboostmobile.com',
        metro: 'mymetropcs.com',
    };

    const carrierDomain = carrierDomains[carrier.toLowerCase()];
    if (!carrierDomain) {
        console.error(`Unsupported carrier: ${carrier}`);
        return;
    }

    const recipient = `${phone}@${carrierDomain}`;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: 'New Task Assigned', // Subject is ignored in SMS
        text: `New Task Alert!\nTask: "${task}"\nDue: ${due_date}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Task text message sent to ${recipient}`);
    } catch (error) {
        console.error(`Error sending task text message to ${recipient}:`, error.message);
    }
};
export { sendTaskTextMessage };

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




// Function to Send Email Campaign
const sendEmailCampaign = async (clients, subject, message) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      });

  const logFile = path.join(process.cwd(), "campaign_log.txt");

  for (const client of clients) {
    if (!client.email) continue;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: client.email,
      subject: subject,
      text: message,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${client.email}`);
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] Email sent to ${client.email}\n`);
    } catch (error) {
      console.error(`❌ Error sending email to ${client.email}:`, error.message);
    }
  }
};

export { sendEmailCampaign };
