import React, { useState } from 'react';

const TermsAndConditions = ({ onW9Upload }) => {
    const [w9Uploaded, setW9Uploaded] = useState(false); // Add setter function

    const handleW9Upload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('w9File', file);
    
            try {
                const response = await fetch('http://localhost:3001/api/upload-w9', {
                    method: 'POST',
                    body: formData,
                });
    
                if (response.ok) {
                    const data = await response.json();
                    console.log('W-9 uploaded successfully:', data.message);
                    setW9Uploaded(true); // Shows the green message
                    localStorage.setItem('w9Uploaded', 'true'); // Sync with Register
                    window.dispatchEvent(new Event('w9StatusUpdated')); // Notify Register
                } else {
                    console.error('Failed to upload W-9');
                    setW9Uploaded(false);
                    localStorage.setItem('w9Uploaded', 'false');
                }
                
                
            } catch (err) {
                console.error('Error uploading W-9:', err);
                localStorage.setItem('w9Uploaded', false);
            }
        }
    };
    

    return (
        <div className="terms-container">
            <h2>Terms and Conditions</h2>
            <p>Please take a moment to screenshot any important details and ensure you read all information carefully.</p> <p>By registering, you agree to become part of our team and adhere to the outlined terms and conditions.</p> <p>These terms apply to all staff associated with Ready Bartending LLC. We reserve the right to modify, suspend, or cancel any gigs without prior notice. We are committed to complying with all applicable federal, state, and local laws in our operations. Staff are required to obtain their own Certificate of Insurance (COI) for events requiring this documentation unless employed as a W-2 worker.</p> <p>As part of our Event Services, bartenders and servers must uphold the highest standards of professionalism and cleanliness at all events. Proper ID verification is mandatory for guests appearing under 30 years of age, and over-serving alcohol is strictly prohibited. Staff must prioritize the safety and well-being of all guests at all times.</p> <p>Regarding uniform and appearance, event staff must comply with the dress code provided by Ready Bartending LLC and maintain a polished and professional look throughout the event.</p> <p>Our mission is to deliver an exceptional and memorable experience for every client. All staff are expected to act professionally, courteously, and with a strong focus on guest satisfaction.</p> <p>Staff must arrive at least 15 minutes before the scheduled event start time (as listed for gigs). Late arrivals, inappropriate behavior, or failure to follow policies may result in penalties, including pay deductions or exclusion from future events.</p> <p>All company-provided materials or equipment must be returned in their original condition either at the end of the event or within 24-48 hours. Failure to comply may result in replacement charges.</p> <p>Payments will be processed via CashApp or Zelle. Tips are yours to keep; however, tipping out staff (e.g., servers or barbacks) who contributed to the shift is mandatory and left to your discretion.</p>
            {/* Download W-9 Form */}
            <div style={styles.downloadSection}>
                <p>
                    To complete the registration, download the W-9 form below, fill it out, and then upload it back here.
                </p>
                <a
                    href="/w9-form.pdf" // Replace with the actual file path
                    download
                    style={styles.downloadLink}
                >
                    Download W-9 Form
                </a>
            </div>
            <div style={styles.uploadSection}>
                <label htmlFor="w9-upload" style={styles.label}>
                    Upload W-9 Form:
                </label>
                <input
                    type="file"
                    id="w9-upload"
                    accept=".pdf,.jpg,.png"
                    onChange={handleW9Upload}
                    style={styles.input}
                />
            </div>
            {/* Display success message when w9Uploaded is true */}
            {w9Uploaded && (
                <p style={{ color: 'green' }}>W-9 successfully uploaded!</p>
            )}
        </div>
    );
};

export default TermsAndConditions;


// Inline Styles for Centering
const styles = {
    container: {
        textAlign: 'center', // Center all text inside the container
        padding: '20px',
    },
    uploadSection: {
        display: 'flex',
        flexDirection: 'column', // Stack label and input vertically
        alignItems: 'center', // Center label and input horizontally
        marginTop: '20px',
    },
    label: {
        display: 'block',
        marginBottom: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    input: {
        display: 'block',
        margin: '0 auto', // Center the input element
    },
    successMessage: {
        color: 'green',
        marginTop: '10px',
        fontSize: '16px',
    },
};