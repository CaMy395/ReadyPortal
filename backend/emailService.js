import nodemailer from 'nodemailer';
import 'dotenv/config';


const sendGigEmailNotification = async (email, gig) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
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
                <li><strong>Time:</strong> ${gig.time}</li>
                <li><strong>Location:</strong> ${gig.location}</li>
                <li><strong>Pay:</strong> ${gig.pay}</li>
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
        doc.text('- Website: Readybartending.com', { align: 'right', fontSize: 9 });
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
        user: process.env.EMAIL_USER,  // Your email address
        pass: process.env.EMAIL_PASS,  // Your email password
    },
});
const sendResetEmail = (email, resetLink) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
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
