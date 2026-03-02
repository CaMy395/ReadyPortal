// emailService.js (DROP-IN REPLACEMENT)

import nodemailer from "nodemailer";
import "dotenv/config";
import path from "path";
import brevo from "@getbrevo/brevo";
import fs from "fs";
import PDFDocument from "pdfkit";

/* =========================================================
   Helpers: formatting
========================================================= */

const formatTime = (time) => {
  if (!time || typeof time !== "string") return "N/A";
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "N/A";
  const date = new Date();
  date.setHours(hours, minutes);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
};

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/* =========================================================
   Shared Transporters (cached)
   - ONE transporter per sending account
   - No per-function createTransport()
========================================================= */

const transporters = {};

function getTransporter(kind) {
  if (transporters[kind]) return transporters[kind];

  const make = (user, pass, label) => {
    if (!user || !pass) {
      console.warn(
        `⚠️ Missing SMTP creds for ${label}. Check your env vars: user=${Boolean(
          user
        )}, pass=${Boolean(pass)}`
      );
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      // keep this if you were seeing cert issues on Render/other hosts
      tls: { rejectUnauthorized: false },
    });
  };

  if (kind === "ADMIN") {
    transporters[kind] = make(
      process.env.ADMIN_EMAIL,
      process.env.ADMIN_PASS,
      "ADMIN"
    );
    return transporters[kind];
  }

  if (kind === "EMAIL_USER") {
    transporters[kind] = make(
      process.env.EMAIL_USER,
      process.env.EMAIL_PASS,
      "EMAIL_USER"
    );
    return transporters[kind];
  }

  if (kind === "PAY") {
    transporters[kind] = make(
      process.env.PAY_EMAIL,
      process.env.PAY_PASS,
      "PAY"
    );
    return transporters[kind];
  }

  throw new Error(`Unknown transporter kind: ${kind}`);
}

/* =========================================================
   Gigs: notifications
========================================================= */

const sendGigEmailNotification = async (email, gig) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `New Gig Added: ${gig?.event_type ?? "Gig"}`,
    html: `
      <p>Hi,</p>
      <p>A new gig has been added:</p>
      <ul>
        <li><strong>Client:</strong> ${gig?.client ?? ""}</li>
        <li><strong>Date:</strong> ${gig?.date ?? ""}</li>
        <li><strong>Time:</strong> ${formatTime(gig?.time)}</li>
        <li><strong>Location:</strong> ${gig?.location ?? ""}</li>
        <li><strong>Pay:</strong> $${gig?.pay ?? ""}/hr +tips</li>
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

const sendGigUpdateEmailNotification = async (email, oldGig, newGig) => {
  const transporter = getTransporter("EMAIL_USER");

  const relevantFields = [
    { key: "client", label: "Client" },
    { key: "event_type", label: "Event Type" },
    { key: "date", label: "Date", format: formatDate },
    { key: "time", label: "Time", format: formatTime },
    { key: "duration", label: "Duration", unit: "hours" },
    { key: "location", label: "Location" },
    { key: "position", label: "Position" },
    { key: "pay", label: "Pay", format: (v) => `$${v}/hr + tips` },
    { key: "gender", label: "Gender" },
    { key: "attire", label: "Attire" },
    { key: "indoor", label: "Indoor", format: (v) => (v ? "Yes" : "No") },
    {
      key: "approval_needed",
      label: "Approval Needed",
      format: (v) => (v ? "Yes" : "No"),
    },
    { key: "on_site_parking", label: "On-Site Parking", format: (v) => (v ? "Yes" : "No") },
    { key: "local_parking", label: "Local Parking" },
    { key: "NDA", label: "NDA Required", format: (v) => (v ? "Yes" : "No") },
    { key: "establishment", label: "Establishment" },
    {
      key: "claimed_by",
      label: "Claimed By",
      format: (v) => (Array.isArray(v) && v.length ? v.join(", ") : "None"),
    },
    { key: "staff_needed", label: "Staff Needed" },
    { key: "backup_needed", label: "Backup Needed" },
    {
      key: "backup_claimed_by",
      label: "Backup Claimed By",
      format: (v) => (Array.isArray(v) && v.length ? v.join(", ") : "None"),
    },
    { key: "needs_cert", label: "Certification", format: (v) => (v ? "Yes" : "No") },
    { key: "confirmed", label: "Confirmed", format: (v) => (v ? "Yes" : "No") },
  ];

  const changes = relevantFields
    .map(({ key, label, format, unit }) => {
      const oldValueRaw = oldGig?.[key];
      const newValueRaw = newGig?.[key];
      const oldValue = format ? format(oldValueRaw) : oldValueRaw;
      const newValue = format ? format(newValueRaw) : newValueRaw;

      if (oldValue !== newValue) {
        return {
          label,
          oldValue: oldValue ?? "N/A",
          newValue: newValue ?? "N/A",
          unit: unit || "",
        };
      }
      return null;
    })
    .filter(Boolean);

  if (changes.length === 0) {
    console.log("No relevant changes detected, email will not be sent.");
    return;
  }

  const updatedFieldsTable = changes
    .map(
      ({ label, oldValue, newValue, unit }) => `
        <tr>
          <td style="border: 1px solid #dddddd; padding: 8px;"><strong>${label}</strong></td>
          <td style="border: 1px solid #dddddd; padding: 8px;">${oldValue || "N/A"}</td>
          <td style="border: 1px solid #dddddd; padding: 8px;">${newValue || "N/A"}${
        unit ? ` ${unit}` : ""
      }</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Gig Updated: ${newGig?.event_type ?? "Gig"}`,
    html: `
      <p>Hi,</p>
      <p>The following gig has been updated:</p>
      <p><strong>Client:</strong> ${newGig?.client ?? ""}</p>
      <p><strong>Event Type:</strong> ${newGig?.event_type ?? ""}</p>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">Field</th>
            <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">Old Value</th>
            <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">New Value</th>
          </tr>
        </thead>
        <tbody>${updatedFieldsTable}</tbody>
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

/* =========================================================
   Quotes (PDF)
========================================================= */

// normalize quote keys once
function normalizeQuote(quote = {}) {
  const normalized = {
    ...quote,
quoteNumber:
  (typeof quote.quoteNumber === "string" && quote.quoteNumber.trim())
    || (typeof quote.quote_number === "string" && quote.quote_number.trim())
    || quote.id
    || quote.quote_id
    || `Q-${Date.now()}`,
    quoteDate:   quote.quoteDate   ?? quote.quote_date ?? quote.date,
    eventDate:   quote.eventDate   ?? quote.event_date,
    eventTime:   quote.eventTime   ?? quote.event_time,
    clientName:  quote.clientName  ?? quote.client_name,
    clientEmail: quote.clientEmail ?? quote.client_email,
    clientPhone: quote.clientPhone ?? quote.client_phone,
    total_amount: quote.total_amount ?? quote.totalAmount,
    bill_to_organization: quote.bill_to_organization ?? quote.billToOrganization,
    bill_to_contact:      quote.bill_to_contact      ?? quote.billToContact,
    items: Array.isArray(quote.items) ? quote.items : [],
    deposit_amount: quote.deposit_amount ?? 0,
    deposit_date: quote.deposit_date ?? null,
    paid_in_full: Boolean(quote.paid_in_full),
    location: quote.location ?? ""
  };

  return normalized;
}


// ✅ DROP-IN: replace your ENTIRE generateQuotePDF with this version
// Keeps your existing layout but fixes:
// 1) Deposit logic (25% min $100)
// 2) Blank/extra page gaps (proper table pagination)
// 3) Cleaner totals + footer policy

// ✅ FULL DROP-IN generateQuotePDF (NO forced page 2, no weird spacing, headers only where needed)
// Paste this whole function in place of your current generateQuotePDF.
// Assumes you already have: normalizeQuote() and PDFDocument imported.

const generateQuotePDF = (quote) =>
  new Promise((resolve) => {
    const q = normalizeQuote(quote);
    const doc = new PDFDocument({ size: "LETTER", margin: 30 });

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentW = right - left;

    const pageBottomY = () => doc.page.height - doc.page.margins.bottom;

    const addPage = () => {
      doc.addPage();
      // keep top spacing consistent
      doc.moveDown(0.15);
    };

    // ------------------------------------------------------------
    // Policy (your final rules)
    // ------------------------------------------------------------
    const termsLines = [
      "Quotes are valid for 7 days unless otherwise stated.",
      "Deposit to secure date: 25% of total (minimum $100). Deposit is non-refundable unless invoice states otherwise.",
      "Remaining balance due no later than 48 hours before event start time, unless paid in full.",
      "Overtime: 30-minute grace period. Time beyond 30 minutes is billed at $100/hr, prorated.",
      "Travel / parking / special location fees (if applicable) are listed on the quote or invoice.",
      "Reschedules: 1 courtesy reschedule if requested at least 72 hours prior (subject to availability). Additional reschedules may incur a fee.",
      "Cancellations: deposit is non-refundable. Cancellations within 72 hours may incur additional charges based on staffing/prep completed.",
      "Client is responsible for alcohol and legal compliance unless alcohol service is explicitly included on the quote.",
    ];

    // ------------------------------------------------------------
    // Header
    // ------------------------------------------------------------
    doc.fontSize(18).font("Helvetica-Bold").text("Ready Bartending LLC.", { align: "center" });
    doc.fontSize(10).font("Helvetica").text("1030 NW 200th Terrace, Miami, FL 33169", {
      align: "center",
    });
    doc.moveDown(1.0);

    // ------------------------------------------------------------
    // Quote Details
    // ------------------------------------------------------------
    doc.fontSize(12).font("Helvetica-Bold").text(`Quote #: ${q.quoteNumber || "N/A"}`);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Quote Date: ${q.quoteDate ? new Date(q.quoteDate).toLocaleDateString("en-US") : "TBD"}`
      );
    doc.text(`Event Date: ${q.eventDate ? new Date(q.eventDate).toLocaleDateString("en-US") : "TBD"}`);
    doc.text(`Event Time: ${q.eventTime ?? "TBD"}`);
    doc.text(`Location: ${q.location || "TBD"}`);
    doc.moveDown(0.7);

    // ------------------------------------------------------------
    // Bill To
    // ------------------------------------------------------------
    doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", { underline: true });
    doc.font("Helvetica").text(`Client: ${q.clientName || ""}`);
    doc.text(`Email: ${q.clientEmail || ""}`);
    doc.text(`Phone: ${q.clientPhone || ""}`);
    if (q.entity_type === "business") {
      doc.text(`Organization: ${q.bill_to_organization || ""}`);
      doc.text(`Attention: ${q.bill_to_contact || ""}`);
    }
    doc.moveDown(0.55);

    // ------------------------------------------------------------
    // Items Table (tight spacing, page breaks only when needed)
    // ------------------------------------------------------------
    const items = Array.isArray(q.items) ? q.items : [];
    let subtotal = 0;

    doc.fontSize(11).font("Helvetica-Bold").text("Items:", { underline: true });
    doc.moveDown(0.05); // ✅ minimal gap under title

    // Table columns
    const columnWidths = { qty: 45, item: 120, desc: 240, unit: 80, amount: 85 };
    const colX = {
      qty: left,
      item: left + columnWidths.qty,
      desc: left + columnWidths.qty + columnWidths.item,
      unit: left + columnWidths.qty + columnWidths.item + columnWidths.desc,
      amount:
        left + columnWidths.qty + columnWidths.item + columnWidths.desc + columnWidths.unit,
    };
    const tableWidth =
      columnWidths.qty +
      columnWidths.item +
      columnWidths.desc +
      columnWidths.unit +
      columnWidths.amount;

    const drawRowBox = (y, h) => {
      doc.rect(colX.qty, y, tableWidth, h).stroke();
      doc.moveTo(colX.item, y).lineTo(colX.item, y + h).stroke();
      doc.moveTo(colX.desc, y).lineTo(colX.desc, y + h).stroke();
      doc.moveTo(colX.unit, y).lineTo(colX.unit, y + h).stroke();
      doc.moveTo(colX.amount, y).lineTo(colX.amount, y + h).stroke();
    };

    const drawTableHeader = () => {
      const headerH = 18;
      // If header can't fit, add page (only if needed)
      if (doc.y + headerH + 4 > pageBottomY()) addPage();

      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(9);
      drawRowBox(y, headerH);

      doc.text("QTY", colX.qty + 6, y + 4, { width: columnWidths.qty - 12 });
      doc.text("ITEM", colX.item + 6, y + 4, { width: columnWidths.item - 12 });
      doc.text("DESCRIPTION", colX.desc + 6, y + 4, { width: columnWidths.desc - 12 });
      doc.text("UNIT", colX.unit + 6, y + 4, { width: columnWidths.unit - 12, align: "right" });
      doc.text("AMOUNT", colX.amount + 6, y + 4, {
        width: columnWidths.amount - 12,
        align: "right",
      });

      doc.font("Helvetica").fontSize(9);
      doc.y = y + headerH + 2; // ✅ tight spacing after header
    };

    if (!items.length) {
      doc.font("Helvetica").fontSize(10).text("No items listed.");
      doc.moveDown(0.4);
    } else {
      drawTableHeader();

      for (const item of items) {
        const quantity = Number.isNaN(Number(item?.quantity)) ? 1 : Number(item.quantity);
        const unitPrice = Number.isNaN(Number(item?.unitPrice)) ? 0 : Number(item.unitPrice);
        const amount = Number.isNaN(Number(item?.amount))
          ? quantity * unitPrice
          : Number(item.amount);

        subtotal += amount;

        const name = item?.name ?? "";
        const desc = item?.description ?? "";

        doc.font("Helvetica").fontSize(9);
        const nameHeight = doc.heightOfString(name, { width: columnWidths.item - 12 });
        const descHeight = doc.heightOfString(desc, { width: columnWidths.desc - 12 });

        // ✅ tight row sizing
        const rowH = Math.max(16, Math.max(nameHeight, descHeight) + 6);

        // Page break ONLY if the next row doesn't fit
        if (doc.y + rowH + 2 > pageBottomY()) {
          addPage();
          drawTableHeader();
        }

        const y = doc.y;
        drawRowBox(y, rowH);

        doc.text(String(quantity), colX.qty + 6, y + 3, { width: columnWidths.qty - 12 });
        doc.text(name, colX.item + 6, y + 3, { width: columnWidths.item - 12 });
        doc.text(desc, colX.desc + 6, y + 3, { width: columnWidths.desc - 12 });

        doc.text(`$${unitPrice.toFixed(2)}`, colX.unit + 6, y + 3, {
          width: columnWidths.unit - 12,
          align: "right",
        });
        doc.text(`$${amount.toFixed(2)}`, colX.amount + 6, y + 3, {
          width: columnWidths.amount - 12,
          align: "right",
        });

        doc.y = y + rowH + 2; // ✅ minimal gap between line items
      }

      doc.moveDown(0.2);
    }

    // ------------------------------------------------------------
    // Totals + Footer (measure first, then only add page if needed)
    // ------------------------------------------------------------
    const totalAmount = Number(q.total_amount || subtotal);

    // deposit = 25% min $100 unless q.deposit_amount already set
    const calculatedDeposit = Math.max(totalAmount * 0.25, 100);
    const deposit =
      q.deposit_amount && Number(q.deposit_amount) > 0 ? Number(q.deposit_amount) : calculatedDeposit;

    const remaining = Math.max(totalAmount - deposit, 0);

    // --- Footer sizing (so we don't force page 2 unless needed) ---
    const labelX = 390;
    const valueWidth = 160;

    // Terms box measure
    const termsTitle = "TERMS & POLICIES";
    const termsText = termsLines.map((l) => `• ${l}`).join("\n");

    const boxPadding = 8;
    const radius = 8;

    doc.font("Helvetica-Bold").fontSize(9);
    const termsTitleH = doc.heightOfString(termsTitle, { width: contentW - boxPadding * 2 });

    doc.font("Helvetica").fontSize(8);
    const termsTextH = doc.heightOfString(termsText, {
      width: contentW - boxPadding * 2,
      lineGap: 2,
    });

    const termsBoxH = boxPadding + termsTitleH + 6 + termsTextH + boxPadding;

    const payBoxH = 52;
    const closingH = 24;
    const totalsH = 60;

    const neededForTotalsAndFooter =
      6 + totalsH + 10 + termsBoxH + 10 + payBoxH + 10 + closingH + 6;

    // If totals + footer won’t fit, THEN we add a new page
    if (doc.y + neededForTotalsAndFooter > pageBottomY()) {
      addPage();
    }

    // ------------------------------------------------------------
    // Totals
    // ------------------------------------------------------------
    const writeLine = (label, value, bold = false) => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(10)
        .text(`${label}: $${value}`, labelX, doc.y, { width: valueWidth, align: "right" });
    };

    doc.moveDown(0.35);
    writeLine("Total", totalAmount.toFixed(2), true);
    writeLine("Deposit Due", deposit.toFixed(2), true);

    if (remaining > 0) {
      writeLine("Remaining Balance", remaining.toFixed(2), true);
    } else {
      // ✅ no weird checkmark glyph
      doc.font("Helvetica-Bold").fontSize(10).text("PAID IN FULL", labelX, doc.y, {
        width: valueWidth,
        align: "right",
      });
    }

    doc.moveDown(0.6);

    // ------------------------------------------------------------
    // Terms box (styled)
    // ------------------------------------------------------------
    const termsY = doc.y;
    doc.roundedRect(left, termsY, contentW, termsBoxH, radius).stroke();

    doc.font("Helvetica-Bold").fontSize(9).text(termsTitle, left + boxPadding, termsY + boxPadding, {
      width: contentW - boxPadding * 2,
    });

    doc.font("Helvetica").fontSize(8).text(termsText, left + boxPadding, termsY + boxPadding + termsTitleH + 6, {
      width: contentW - boxPadding * 2,
      lineGap: 2,
    });

    doc.y = termsY + termsBoxH + 10;

    // ------------------------------------------------------------
    // Payment options box (3 columns, styled)
    // ------------------------------------------------------------
    const payTitle = "PAYMENT OPTIONS";
    const payItems = [
      { title: "Square", body: "Reply to this email to accept the quote" },
      { title: "Zelle", body: "readybarpay@gmail.com" },
      { title: "CashApp", body: "$readybartending" },
    ];

    const colGap = 10;
    const colW = (contentW - colGap * 2 - boxPadding * 2) / 3;

    const payY = doc.y;
    doc.roundedRect(left, payY, contentW, payBoxH, radius).stroke();

    doc.font("Helvetica-Bold").fontSize(9).text(payTitle, left + boxPadding, payY + 8, {
      width: contentW - boxPadding * 2,
    });

    doc.font("Helvetica").fontSize(8);
    payItems.forEach((p, i) => {
      const x = left + boxPadding + i * (colW + colGap);
      doc.font("Helvetica-Bold").text(p.title, x, payY + 24, { width: colW });
      doc.font("Helvetica").text(p.body, x, payY + 36, { width: colW });
    });

    doc.y = payY + payBoxH + 10;

    // ------------------------------------------------------------
    // Closing
    // ------------------------------------------------------------
    doc.font("Helvetica-Bold").fontSize(10).text("Thank you for your business!", { align: "right" });
    doc.font("Helvetica").fontSize(9).text("Ready Bartending LLC.", { align: "right" });

    doc.end();
  });



const sendQuoteEmail = async (recipientEmail, quote) => {
  const transporter = getTransporter("PAY");
  const q = normalizeQuote(quote);

  const pdfBuffer = await generateQuotePDF(q);

  const mailOptions = {
    from: process.env.PAY_EMAIL,
    to: recipientEmail,
    subject: "Your Quote from Ready Bartending",
    text: "Attached is your quote.",
    attachments: [
      {
        filename: `Quote-${q.quoteNumber || q.quote_number || "RB"}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

/* =========================================================
   Auth Emails: Reset + Registration (shared ADMIN transporter)
========================================================= */

const sendResetEmail = (email, resetLink) => {
  const transporter = getTransporter("ADMIN");

  const mailOptions = {
    from: `"Ready Portal" <${process.env.ADMIN_EMAIL}>`,
    to: email,
    subject: "Password Reset Request",
    html: `
      <h3>Password Reset</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Error sending reset email:", error);
    else console.log("Reset email sent:", info.response);
  });
};

const sendRegistrationEmail = (recipient, username, name) => {
  const transporter = getTransporter("ADMIN");

  const mailOptions = {
    from: `"Ready Portal" <${process.env.ADMIN_EMAIL}>`,
    to: recipient,
    subject: "Welcome to Our Platform!",
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Error sending registration email:", error);
    else console.log("Registration email sent:", info.response);
  });
};

/* =========================================================
   Intake / Forms (EMAIL_USER transporter)
========================================================= */

const sendIntakeFormEmail = async (formData) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: process.env.EMAIL_USER,
    subject: "New Client Intake Form Submission",
    html: `
      <h3>New Client Intake Form Submission</h3>
      <p><strong>Full Name:</strong> ${formData.fullName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Date:</strong> ${formData.date}</p>
      <p><strong>Time:</strong> ${formatTime(formData.time)}</p>
      <p><strong>Entity Type:</strong> ${formData.entityType}</p>
      <p><strong>Business Name:</strong> ${formData.businessName || "N/A"}</p>
      <p><strong>First-Time Booking:</strong> ${formData.firstTimeBooking ? "Yes" : "No"}</p>
      <p><strong>Event Type:</strong> ${formData.eventType}</p>
      <p><strong>Age Range:</strong> ${formData.ageRange}</p>
      <p><strong>Event Name:</strong> ${formData.eventName}</p>
      <p><strong>Event Location:</strong> ${formData.eventLocation}</p>
      <p><strong>Gender Preference:</strong> ${
        formData.genderMatters ? formData.preferredGender : "No preference"
      }</p>
      <p><strong>Open Bar:</strong> ${formData.openBar ? "Yes" : "No"}</p>
      <p><strong>Facilities:</strong> ${formData.locationFeatures?.join(", ") || "None"}</p>
      <p><strong>Staff Attire:</strong> ${formData.staffAttire}</p>
      <p><strong>Event Duration:</strong> ${formData.eventDuration}</p>
      <p><strong>On-Site Parking:</strong> ${formData.onSiteParking ? "Yes" : "No"}</p>
      <p><strong>Local Parking:</strong> ${formData.localParking ? "Yes" : "No"}</p>
      <p><strong>Additional Prep Time:</strong> ${formData.additionalPrepTime ? "Yes" : "No"}</p>
      <p><strong>NDA Required:</strong> ${formData.ndaRequired ? "Yes" : "No"}</p>
      <p><strong>Food Catering:</strong> ${formData.foodCatering ? "Yes" : "No"}</p>
      <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
      <p><strong>Home or Venue:</strong> ${formData.homeOrVenue}</p>
      <p><strong>Venue Name:</strong> ${formData.venueName || "N/A"}</p>
      <p><strong>Bartending License Required:</strong> ${
        formData.bartendingLicenseRequired ? "Yes" : "No"
      }</p>
      <p><strong>Insurance Required:</strong> ${formData.insuranceRequired ? "Yes" : "No"}</p>
      <p><strong>Liquor License Required:</strong> ${formData.liquorLicenseRequired ? "Yes" : "No"}</p>
      <p><strong>Indoors Event:</strong> ${formData.indoorsEvent ? "Yes" : "No"}</p>
      <p><strong>Budget:</strong> ${formData.budget}</p>
      <p><strong>Add-ons:</strong> ${formData.addons?.join(", ") || "None"}</p>
      <p><strong>How Heard:</strong> ${formData.howHeard}</p>
      <p><strong>Referral:</strong> ${formData.referral || "None"}</p>
      <p><strong>Referral Details:</strong> ${formData.referralDetails || "None"}</p>
      <p><strong>Additional Comments:</strong> ${formData.additionalComments || "None"}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Intake form email sent: ${info.response}`);
  } catch (error) {
    console.error(`Error sending intake form email: ${error.message}`);
  }
};

const sendCraftsFormEmail = async (formData) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: process.env.EMAIL_USER,
    subject: "New Crafts and Cocktails Form Submission",
    html: `
      <h3>New Crafts and Cocktails Form Submission</h3>
      <p><strong>Full Name:</strong> ${formData.fullName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
      <p><strong>Add-ons:</strong> ${
        Array.isArray(formData.addons)
          ? formData.addons
              .map((a) =>
                typeof a === "string"
                  ? a
                  : `${a.name} (x${a.quantity || 1} @ $${a.price || 0})`
              )
              .join(", ")
          : "None"
      }</p>
      <p><strong>How Heard:</strong> ${formData.howHeard}</p>
      <p><strong>Referral:</strong> ${formData.referral || "None"}</p>
      <p><strong>Referral Details:</strong> ${formData.referralDetails || "None"}</p>
      <p><strong>Additional Comments:</strong> ${formData.additionalComments || "None"}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Crafts form email sent: ${info.response}`);
  } catch (error) {
    console.error(`Error sending crafts form email: ${error.message}`);
  }
};

const sendMixNSipFormEmail = async (formData) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: process.env.EMAIL_USER,
    subject: "New Mix N Sip Form Submission",
    html: `
      <h3>New Mix N Sip Form Submission</h3>
      <p><strong>Full Name:</strong> ${formData.fullName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Guest Count:</strong> ${formData.guestCount}</p>
      <p><strong>Add-ons:</strong> ${
        Array.isArray(formData.addons)
          ? formData.addons
              .map((a) =>
                typeof a === "string"
                  ? a
                  : `${a.name} (x${a.quantity || 1} @ $${a.price || 0})`
              )
              .join(", ")
          : "None"
      }</p>
      <p><strong>How Heard:</strong> ${formData.howHeard}</p>
      <p><strong>Referral:</strong> ${formData.referral || "None"}</p>
      <p><strong>Referral Details:</strong> ${formData.referralDetails || "None"}</p>
      <p><strong>Additional Comments:</strong> ${formData.additionalComments || "None"}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Mix N Sip form email sent: ${info.response}`);
  } catch (error) {
    console.error(`Error sending Mix N Sip form email: ${error.message}`);
  }
};

const sendBartendingInquiryEmail = async (formData) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: formData.email,
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
      <p><strong>Referral Details:</strong> ${formData.referralDetails || "None"}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Course form email sent: ${info.response}`);
  } catch (error) {
    console.error(`Error sending course form email: ${error.message}`);
  }
};

const sendBartendingClassesEmail = async (formData) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: process.env.EMAIL_USER,
    subject: "Bartending Classes Inquiry",
    html: `
      <h3>Bartending Classes Inquiry</h3>
      <p><strong>Full Name:</strong> ${formData.fullName}</p>
      <p><strong>Email:</strong> ${formData.email}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Are you at least 18 years old?:</strong> ${formData.isAdult}</p>
      <p><strong>Do you have any experience?:</strong> ${formData.experience}</p>
      <p><strong>How many classes do you want to book?:</strong> ${formData.classCount}</p>
      <p><strong>Referral:</strong> ${formData.referral}</p>
      <p><strong>Referral Details:</strong> ${formData.referralDetails || "None"}</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Bar Class form email sent: ${info.response}`);
  } catch (error) {
    console.error(`Error sending bar class form email: ${error.message}`);
  }
};

const sendPaymentEmail = async (email, link) => {
  const transporter = getTransporter("EMAIL_USER");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Payment Link",
    html: `<p>Please complete your payment using the following link:</p><a href="${link}" target="_blank">${link}</a>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment link sent to ${email}`);
  } catch (error) {
    console.error(`Error sending payment link to ${email}:`, error.message);
  }
};

/* =========================================================
   Appointments (EMAIL_USER transporter)
========================================================= */

const sendAppointmentEmail = async ({
  title,
  email,
  full_name,
  date,
  time,
  end_time,
  description,
}) => {
  const transporter = getTransporter("EMAIL_USER");
  const schedulingEmail = "readybartending.schedule@gmail.com";

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
        <li><strong>Date:</strong> ${formatDate(date)}</li>
        <li><strong>Time:</strong> ${formatTime(time)} - ${end_time ? formatTime(end_time) : "TBD"}</li>
        <li><strong>Description:</strong> ${description || "No additional details"}</li>
      </ul>

      <p>If you have an in person meeting, the location details: 1030 NW 200th Terrace Miami, FL, 33169.</p>

      <p>If you have a virtual meeting or interview please join here Caitlyn Myland is inviting you to a scheduled Zoom meeting.</p>
      <p>Topic: Ready Bartending Meeting Room</p>
      <p>Join Zoom Meeting</p>
      <p>https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09</p>
      <p>Meeting ID: 369 774 6091</p>
      <p>Passcode: Lyn</p>

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

const sendRescheduleEmail = async ({
  title,
  email,
  full_name,
  new_date,
  new_time,
  end_time,
  description,
}) => {
  const transporter = getTransporter("EMAIL_USER");
  const schedulingEmail = "readybartending.schedule@gmail.com";

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
        <li><strong>Time:</strong> ${formatTime(new_time)} - ${end_time ? formatTime(end_time) : "TBD"}</li>
        <li><strong>Description:</strong> ${description || "No additional details"}</li>
      </ul>

      <p>If you have an in person meeting, the location details: 1030 NW 200th Terrace Miami, FL, 33169.</p>

      <p>If you have a virtual meeting or interview please join here Caitlyn Myland is inviting you to a scheduled Zoom meeting.</p>
      <p>Topic: Ready Bartending Meeting Room</p>
      <p>Join Zoom Meeting</p>
      <p>https://us06web.zoom.us/j/3697746091?pwd=YXkyaUhKM3AzKzJpcitUNWRCMjNOdz09</p>
      <p>Meeting ID: 369 774 6091</p>
      <p>Passcode: Lyn</p>

      <p>Thank you!</p>
      <p>Best regards,<br>Your Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reschedule email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending reschedule email to ${email}:`, error.message);
  }
};

const sendCancellationEmail = async ({
  title,
  email,
  full_name,
  date,
  time,
  end_time,
  description,
}) => {
  const transporter = getTransporter("EMAIL_USER");
  const schedulingEmail = "readybartending.schedule@gmail.com";

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
        <li><strong>Date:</strong> ${formatDate(date)}</li>
        <li><strong>Time:</strong> ${formatTime(time)} - ${end_time ? formatTime(end_time) : "TBD"}</li>
        <li><strong>Description:</strong> ${description || "No additional details"}</li>
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

/* =========================================================
   Brevo Campaign (unchanged)
========================================================= */
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEmailCampaign = async (clients, subject, message, imageFile = null) => {
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );

  const logFile = path.join(process.cwd(), "campaign_log.txt");

  for (const client of clients) {
    if (!client?.email) continue;

    const toEmail = String(client.email).trim();
    if (!toEmail) continue;

    const emailData = {
      sender: {
        name: process.env.BREVO_FROM_NAME || "Ready Bartending",
        email: process.env.BREVO_FROM_EMAIL || process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: toEmail, name: client.full_name || "" }],
      subject: subject || "Ready Bartending",
      htmlContent: `
        <div style="font-family: Arial, sans-serif;">
          <p>${String(message || "").replace(/\n/g, "<br/>")}</p>
        </div>
      `,
    };

    // ✅ Attach uploaded image (Brevo expects base64)
    if (imageFile?.buffer && imageFile?.originalname) {
      emailData.attachment = [
        {
          name: imageFile.originalname,
          content: imageFile.buffer.toString("base64"),
        },
      ];
    }

    try {
      await apiInstance.sendTransacEmail(emailData);
      console.log(`✅ [Brevo] Sent to: ${toEmail}`);
      fs.appendFileSync(
        logFile,
        `[${new Date().toISOString()}] Email sent to ${toEmail}\n`
      );
    } catch (error) {
      console.error(`❌ [Brevo] Error sending to ${toEmail}:`, error?.message || error);
      fs.appendFileSync(
        logFile,
        `[${new Date().toISOString()}] FAILED to send to ${toEmail}\n`
      );
    }

    await pause(150);
  }
};

// =========================================================
// ✅ Feedback Request Email (EMAIL_USER transporter)
// =========================================================
const sendFeedbackRequestEmail = async ({
  email,
  clientName,
  feedbackLink,
  eventType,
  eventDate,
}) => {
  const transporter = getTransporter("EMAIL_USER");

  const safeName = clientName ? String(clientName).trim() : "";
  const safeEvent = eventType ? String(eventType).trim() : "your event";

  // eventDate can be Date/string; keep it simple & safe
  let dateLine = "";
  try {
    if (eventDate) {
      const d = new Date(eventDate);
      if (!Number.isNaN(d.getTime())) {
        dateLine = d.toLocaleDateString("en-US");
      }
    }
  } catch {}

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "How did we do? 🥂 Quick feedback",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi${safeName ? ` ${safeName}` : ""},</p>

        <p>Thank you again for choosing <strong>Ready Bartending</strong> for ${safeEvent}.</p>

        <p>Would you take 60 seconds to rate your experience?</p>

        <p style="margin: 16px 0;">
          <a href="${feedbackLink}"
             style="display:inline-block;padding:12px 16px;border-radius:10px;background:#000;color:#fff;text-decoration:none;font-weight:700;">
            Leave Feedback
          </a>
        </p>

        <p style="color:#555;font-size:12px;margin-top:18px;">
          ${safeEvent}${dateLine ? ` • ${dateLine}` : ""}
        </p>

        <p style="margin-top:18px;">— Ready Bartending LLC</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Feedback request email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Error sending feedback request email to ${email}:`, error?.message || error);
    throw error;
  }
};

/* =========================================================
   Exports (single, clean)
========================================================= */

export {
  // gigs
  sendGigEmailNotification,
  sendGigUpdateEmailNotification,

  // quotes
  sendQuoteEmail,
  generateQuotePDF,

  // auth
  sendResetEmail,
  sendRegistrationEmail,

  // forms
  sendIntakeFormEmail,
  sendCraftsFormEmail,
  sendMixNSipFormEmail,
  sendBartendingInquiryEmail,
  sendBartendingClassesEmail,
  sendPaymentEmail,
  sendFeedbackRequestEmail,

  // appointments
  sendAppointmentEmail,
  sendRescheduleEmail,
  sendCancellationEmail,

  // campaigns
  sendEmailCampaign,
};
