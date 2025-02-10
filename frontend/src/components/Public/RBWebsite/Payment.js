import React from "react";
import { useSearchParams } from "react-router-dom";
import "../../../RB.css";

const ZellePaymentPage = () => {
    const [searchParams] = useSearchParams();
    const amount = searchParams.get("amount") || "0.00";  // ✅ Extracts the amount from the URL
    const recipient = "readybarpay@gmail.com";  // ✅ Replace with your actual Zelle email
    const rawAppointmentType = searchParams.get("appointment_type") || "Appointment";  
    const appointmentType = decodeURIComponent(rawAppointmentType);  // ✅ Decodes special characters

        const zelleQR = "/zelle-qr.png";  // ✅ Correct way to reference public images
    const cashAppQR = "/cashapp-qr.png";
    
    return (
        <div style={styles.container}>
            <h2 className="payment-title">Zelle & CashApp Payment Instructions</h2>
            <p style={styles.text}>To complete your payment, please follow these steps:</p>

            <div style={styles.paymentContainer}>
                {/* ✅ Zelle Payment Section */}
                <div style={styles.paymentBox}>
                    <h3>Zelle Payment</h3>
                    <p>Send <strong>${amount}</strong> to <strong>{recipient}</strong> or scan QR below</p>
                    <p>Add to memo: <strong>Payment for {appointmentType}</strong></p>
                    <img src={zelleQR} alt="Zelle QR Code" style={styles.qrCode} />  {/* ✅ Displays Zelle QR */}
                </div>
                {/* ✅ CashApp Payment Section */}
                <div style={styles.paymentBox}>
                    <h3>CashApp Payment</h3>
                    <p>Scan the QR code below or send <strong>${amount}</strong> to <strong>$readybartending</strong></p>
                    <p>Add to memo: <strong>Payment for {appointmentType}</strong></p>
                    <img src={cashAppQR} alt="CashApp QR Code" style={styles.qrCode} />  {/* ✅ Displays CashApp QR */}
                </div>
            </div>

            <p style={styles.note}><strong>Note:</strong> Payments via Zelle and CashApp are instant and cannot be reversed.</p>
        </div>
    );
};

// ✅ Inline Styles
const styles = {
    container: {
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#fff",
        textAlign: "center",
    },
    text: {
        fontSize: "16px",
        color: "#333",
    },
    paymentContainer: {
        display: "flex",
        justifyContent: "space-around",
        flexWrap: "wrap",
        marginTop: "20px",
    },
    paymentBox: {
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "15px",
        width: "45%",
        textAlign: "center",
    },
    qrCode: {
        width: "150px",
        height: "150px",
        marginTop: "1 0px",
    },
    note: {
        marginTop: "20px",
        fontSize: "14px",
        color: "#666",
    },
};

export default ZellePaymentPage;
