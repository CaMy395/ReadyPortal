import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;

/*
 * Final certificate layout coordinates.
 * PDFKit uses coordinates measured from the top-left corner.
 *
 * Change only these values later if you want to nudge an item.
 */
const LAYOUT = {
  studentName: {
    x: 90,
    y: 225,
    width: 612,
    maxWidth: 610,
    startingSize: 34,
    minimumSize: 21,
  },

  certificationName: {
    x: 110,
    y: 313,
    width: 572,
    height: 58,
    maxWidth: 570,
    startingSize: 23,
    minimumSize: 15,
  },

  qrCode: {
    x: 354,
    y: 410,
    size: 76,
  },

  /*
   * The date now prints directly ABOVE the gold line,
   * matching the signature placement on the left.
   */
  issueDate: {
    x: 510,
    y: 402,
    width: 170,
    startingSize: 11,
    minimumSize: 8.5,
  },

  certificateNumber: {
    x: 495,
    y: 491,
    width: 180,
    startingSize: 10.5,
    minimumSize: 8,
  },

  /*
   * Optional curriculum version:
   * printed subtly along the bottom center of the certificate.
   * It only appears when a curriculum version exists.
   */
  curriculumVersion: {
    x: 196,
    y: 535,
    width: 400,
    fontSize: 8.5,
  },
};

function formatCertificateDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function fitFontSize(
  doc,
  text,
  maxWidth,
  startingSize,
  minimumSize = 16
) {
  let size = startingSize;

  while (size > minimumSize) {
    doc.fontSize(size);

    if (doc.widthOfString(text) <= maxWidth) {
      return size;
    }

    size -= 1;
  }

  return minimumSize;
}

export async function generateTrainingCertificatePDF({
  templatePath,
  studentName,
  courseName,
  curriculumVersion,
  certificateNumber,
  issueDate,
  verificationToken,
}) {
  if (!templatePath) {
    throw new Error("Certificate template path is required.");
  }

  if (!studentName) {
    throw new Error("Student name is required.");
  }

  if (!courseName) {
    throw new Error("Course name is required.");
  }

  if (!certificateNumber) {
    throw new Error("Certificate number is required.");
  }

  if (!verificationToken) {
    throw new Error("Verification token is required.");
  }

  const cleanStudentName = String(studentName)
    .trim()
    .replace(/\s+/g, " ");

  const cleanCourseName = String(courseName)
    .trim()
    .replace(/\s+/g, " ");

  const cleanCertificateNumber = String(certificateNumber)
    .trim();

  const cleanCurriculumVersion = curriculumVersion
    ? String(curriculumVersion).trim()
    : "";

  const verificationUrl =
    `https://readybartending.com/verify/${verificationToken}`;

  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    type: "png",
    width: 420,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      layout: "landscape",
      margin: 0,
      info: {
        Title:
          `Ready Training Institute Certificate - ${cleanCertificateNumber}`,
        Author: "Ready Training Institute",
        Subject: cleanCourseName,
        Keywords:
          [
            "Ready Training Institute",
            cleanCertificateNumber,
            verificationToken,
            cleanCurriculumVersion,
          ]
            .filter(Boolean)
            .join(", "),
        Creator: "ReadyPortal",
        Producer: "ReadyPortal Certificate Generator",
      },
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    /*
     * Permanent Canva background.
     */
    doc.image(templatePath, 0, 0, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    });

    /*
     * Student name:
     * centered below "This certifies that."
     */
    const nameFontSize = fitFontSize(
      doc,
      cleanStudentName,
      LAYOUT.studentName.maxWidth,
      LAYOUT.studentName.startingSize,
      LAYOUT.studentName.minimumSize
    );

    doc
      .font("Times-BoldItalic")
      .fontSize(nameFontSize)
      .fillColor("#202020")
      .text(
        cleanStudentName,
        LAYOUT.studentName.x,
        LAYOUT.studentName.y,
        {
          width: LAYOUT.studentName.width,
          align: "center",
          lineBreak: false,
        }
      );

    /*
     * Certification name:
     * stays AFTER the permanent sentence
     * "has successfully completed the requirements for the
     * following certification:"
     *
     * Long combination-course names may wrap to two lines.
     */
    const certificationFontSize = fitFontSize(
      doc,
      cleanCourseName,
      LAYOUT.certificationName.maxWidth,
      LAYOUT.certificationName.startingSize,
      LAYOUT.certificationName.minimumSize
    );

    doc
      .font("Times-Bold")
      .fontSize(certificationFontSize)
      .fillColor("#202020")
      .text(
        cleanCourseName,
        LAYOUT.certificationName.x,
        LAYOUT.certificationName.y,
        {
          width: LAYOUT.certificationName.width,
          height: LAYOUT.certificationName.height,
          align: "center",
          lineGap: 2,
          ellipsis: false,
        }
      );

    /*
     * Verification QR:
     * centered inside the permanent gold seal.
     */
    doc.image(
      qrBuffer,
      LAYOUT.qrCode.x,
      LAYOUT.qrCode.y,
      {
        width: LAYOUT.qrCode.size,
        height: LAYOUT.qrCode.size,
      }
    );

    /*
     * Issue date:
     * printed directly above the right-side gold line,
     * matching the signature arrangement.
     */
    const formattedIssueDate =
      formatCertificateDate(issueDate);

    const dateFontSize = fitFontSize(
      doc,
      formattedIssueDate,
      LAYOUT.issueDate.width,
      LAYOUT.issueDate.startingSize,
      LAYOUT.issueDate.minimumSize
    );

    doc
      .font("Helvetica")
      .fontSize(dateFontSize)
      .fillColor("#202020")
      .text(
        formattedIssueDate,
        LAYOUT.issueDate.x,
        LAYOUT.issueDate.y,
        {
          width: LAYOUT.issueDate.width,
          align: "center",
          lineBreak: false,
        }
      );

    /*
     * Certificate number:
     * centered beneath the permanent "Certificate No." label.
     */
    const certificateNumberFontSize = fitFontSize(
      doc,
      cleanCertificateNumber,
      LAYOUT.certificateNumber.width,
      LAYOUT.certificateNumber.startingSize,
      LAYOUT.certificateNumber.minimumSize
    );

    doc
      .font("Helvetica-Bold")
      .fontSize(certificateNumberFontSize)
      .fillColor("#202020")
      .text(
        cleanCertificateNumber,
        LAYOUT.certificateNumber.x,
        LAYOUT.certificateNumber.y,
        {
          width: LAYOUT.certificateNumber.width,
          align: "center",
          lineBreak: false,
        }
      );

    /*
     * Curriculum version:
     * shown only when the issued certificate has a saved version.
     * Example: Curriculum: FL-RAS-2026.1
     */
    if (cleanCurriculumVersion) {
      doc
        .font("Helvetica")
        .fontSize(LAYOUT.curriculumVersion.fontSize)
        .fillColor("#555555")
        .text(
          `Curriculum: ${cleanCurriculumVersion}`,
          LAYOUT.curriculumVersion.x,
          LAYOUT.curriculumVersion.y,
          {
            width: LAYOUT.curriculumVersion.width,
            align: "center",
            lineBreak: false,
          }
        );
    }

    doc.end();
  });
}
