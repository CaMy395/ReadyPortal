import React, { useState } from 'react';

const TermsAndConditions = () => {
    const [w9Uploaded, setW9Uploaded] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null); // Store the selected file
    const [uploadStatus, setUploadStatus] = useState(''); // Feedback to the user

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setW9Uploaded(false); // Reset status on file change
        setUploadStatus(''); // Clear previous status
    };

    // Handle file upload when submit button is clicked
    const handleFileUpload = async () => {
        if (!selectedFile) {
            setUploadStatus('Please select a file before uploading.');
            return;
        }
    
        const formData = new FormData();
        formData.append('w9File', selectedFile);
    
        try {
            console.log('Uploading file to server...');
            const response = await fetch('https://ready-bartending-gigs-portal.onrender.com/api/upload-w9', {
                method: 'POST',
                body: formData,
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log('W-9 uploaded successfully:', data.message);
                setW9Uploaded(true);
                setUploadStatus('W-9 successfully uploaded!');
                localStorage.setItem('w9Uploaded', 'true');
                window.dispatchEvent(new Event('w9StatusUpdated'));
            } else {
                const error = await response.text();
                console.error('Failed to upload W-9:', error);
                setUploadStatus('Upload failed. Please try again.');
            }
        } catch (err) {
            console.error('Error uploading W-9:', err);
            setUploadStatus('An error occurred. Please try again.');
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
            {/* Upload Section */}
            <div style={styles.uploadSection}>
                <label htmlFor="w9-upload" style={styles.label}>
                    Upload W-9 Form:
                </label>
                <input
                    type="file"
                    id="w9-upload"
                    accept=".pdf,.jpg,.png"
                    onChange={handleFileChange}
                    style={styles.input}
                />
                <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={!selectedFile} // Disable until a file is selected
                    style={{ marginTop: '10px' }}
                >
                    Upload W-9
                </button>
            </div>
            {/* Display success message when w9Uploaded is true */}
            {uploadStatus && <p style={{ color: w9Uploaded ? 'green' : 'red' }}>{uploadStatus}</p>}
        </div>
    );
};

export default TermsAndConditions;

// Inline Styles
const styles = {
    downloadSection: {
        marginBottom: '20px',
    },
    uploadSection: {
        display: 'flex',
        flexDirection: 'column', // Stack elements vertically
        alignItems: 'center', // Center elements horizontally
        marginTop: '20px',
    },
    label: {
        marginBottom: '10px',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    input: {
        margin: '10px 0',
    },
};
