import nodemailer from 'nodemailer';
import 'dotenv/config';
import { google } from 'googleapis';






// Configure SMTP transport for sending gig notifications
const smtpTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Replace with your email
        pass: process.env.EMAIL_PASS, // Replace with your app password
    },
});
smtpTransporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Transporter verification failed:', error);
    } else {
        console.log('SMTP Transporter is ready to send emails.');
    }
});


// Function to send notification email for a new gig
const sendGigEmailNotification = async (email, gig) => {
    try {
        const message = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'New Gig Added!',
            html: `
                <p>Hello,</p>
                <p>A new gig has been added to the platform:</p>
                <p><strong>Client:</strong> ${gig.client}</p>
                <p><strong>Date:</strong> ${gig.date}</p>
                <p><strong>Time:</strong> ${gig.time}</p>
                <p><strong>Location:</strong> ${gig.location}</p>
                <p><strong>Pay:</strong> ${gig.pay}</p>
                <p>
                    <a href="https://ready-bartending-gigs-portal.onrender.com/" style="color: #1a73e8; text-decoration: none;">
                        Log in
                    </a>
                    to claim the gig!
                </p>
            `,
        };

        await smtpTransporter.sendMail(message);
        console.log(`Gig email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending email to ${email}:`, error.stack || error);
        throw new Error('Failed to send gig email');
    }
};




// Function to send a quote email
import PDFDocument from 'pdfkit';
import fs from 'fs';

const generateQuotePDF = (quote, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Helper function to draw a table row
        const drawRow = (x, y, row) => {
            const [qty, item, description, unitPrice, amount] = row;
            doc.text(qty, x, y, { width: 50, align: 'center' });
            doc.text(item, x + 50, y, { width: 150, align: 'left' });
            doc.text(description, x + 200, y, { width: 200, align: 'left' });
            doc.text(`$${unitPrice.toFixed(2)}`, x + 400, y, { width: 80, align: 'right' });
            doc.text(`$${amount.toFixed(2)}`, x + 480, y, { width: 80, align: 'right' });
        };

        // Header
        doc.fontSize(18).text('Ready Bartending LLC.', { align: 'center' });
        doc.fontSize(12).text('1030 NW 200th Terrace, Miami, FL 33169', { align: 'center' });
        doc.moveDown();

        // Quote Details
        doc.fontSize(14).text(`Quote #: ${quote.quoteNumber}`);
        doc.text(`Quote Date: ${quote.quoteDate}`);
        doc.text(`Event Date: ${quote.eventDate || 'TBD'}`);
        doc.moveDown();

        // Bill To Section
        doc.fontSize(12).text('BILL TO:', { underline: true });
        doc.text(quote.clientName);
        doc.text(quote.clientAddress);
        doc.moveDown();

        // Add Items Table Header
        doc.fontSize(12).text('ITEMS', { underline: true });
        doc.moveDown();

        // Draw table header
        doc.text('QTY', 50, doc.y, { width: 50, align: 'center' });
        doc.text('ITEM', 100, doc.y, { width: 150, align: 'left' });
        doc.text('DESCRIPTION', 250, doc.y, { width: 200, align: 'left' });
        doc.text('UNIT PRICE', 450, doc.y, { width: 80, align: 'right' });
        doc.text('AMOUNT', 530, doc.y, { width: 80, align: 'right' });
        doc.moveDown();

        // Draw items
        let y = doc.y + 10;
        quote.items.forEach((item) => {
            drawRow(50, y, [
                item.quantity,
                item.name,
                item.description || '',
                item.unitPrice,
                item.amount,
            ]);
            y += 20; // Add spacing between rows
        });

        // Subtotal and Total
        doc.moveDown();
        const subtotal = quote.items.reduce((sum, item) => sum + item.amount, 0);
        doc.text(`Subtotal: $${subtotal.toFixed(2)}`, { align: 'right' });

        if (quote.includeTax) {
            const salesTax = subtotal * (quote.salesTaxRate / 100);
            doc.text(`Sales Tax (${quote.salesTaxRate}%): $${salesTax.toFixed(2)}`, { align: 'right' });
            doc.text(`Total: $${(subtotal + salesTax).toFixed(2)}`, { align: 'right' });
        } else {
            doc.text(`Total: $${subtotal.toFixed(2)}`, { align: 'right' });
        }

        // Terms and Footer
        doc.moveDown();
        doc.text('Terms: A deposit is due within 2 days.', { align: 'left' });
        doc.text('Payment Options:', { align: 'left' });
        // Add the clickable link for the website
        doc.text('- Website: ', { continued: true, align: 'left' });
        doc.fillColor('blue').text('Readybartending.com', {
            link: 'https://readybartending.com',
            underline: true
        }).fillColor('black'); // Reset color back to default
        doc.text('- Zelle: readybarpay@gmail.com', { align: 'left' });
        doc.text('- CashApp: $readybartending', { align: 'left' });
        doc.moveDown();

        doc.text('Thank you for your business!', { align: 'center' });

        doc.end();

        stream.on('finish', resolve);
        stream.on('error', reject);
    });
};



export { sendGigEmailNotification, generateQuotePDF };
