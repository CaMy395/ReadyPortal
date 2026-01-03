import React, { useState } from 'react';

const TermsModal = ({
  onClose,
  onW9Upload,
  onIDUpload,
  onSSUpload,
  role = 'student',
  targetUserId,
}) => {
  const [w9Uploaded, setW9Uploaded] = useState(false);
  const [idUploaded, setIDUploaded] = useState(false);
  const [ssUploaded, setSsUploaded] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const qs = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';

  const handleUpload = async (endpoint, fieldName, file, onSuccess) => {
    if (!file) return;

    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const response = await fetch(`${apiUrl}${endpoint}${qs}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log(`${fieldName} uploaded successfully:`, data.message);
      onSuccess(true);
    } catch (err) {
      console.error(`Error uploading ${fieldName}:`, err);
      alert(`Failed to upload ${fieldName}. Please try again.`);
      onSuccess(false);
    }
  };

  const isStaff = role === 'user';

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Terms and Conditions</h2>

        <p>
          Please take a moment to screenshot any important details and ensure you read all
          information carefully. By registering, you agree to become part of our team and
          adhere to the outlined terms and conditions.
        </p>

        <p>
          Staff must uphold professionalism, arrive on time, follow safety protocols, and
          comply with all Ready Bartending LLC policies.
        </p>

        {/* ================= ID UPLOAD (ALL USERS) ================= */}
        <div style={{ marginTop: 20 }}>
          <label>Upload Government ID:</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) =>
              handleUpload('/api/upload-id', 'idFile', e.target.files?.[0], (ok) => {
                setIDUploaded(ok);
                if (ok && typeof onIDUpload === 'function') onIDUpload(true);
              })
            }
          />
          {idUploaded && <p style={{ color: 'green' }}>ID successfully uploaded</p>}
        </div>

        {/* ================= STAFF-ONLY DOCUMENTS ================= */}
        {isStaff && (
          <>
            <hr style={{ margin: '20px 0', opacity: 0.3 }} />

            {/* W-9 */}
            <p><strong>Staff only:</strong> Upload your completed W-9.</p>
            <a href="/w9-form.pdf" download>
              Download W-9 Form
            </a>

            <div style={{ marginTop: 8 }}>
              <label>Upload W-9:</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) =>
                  handleUpload('/api/upload-w9', 'w9File', e.target.files?.[0], (ok) => {
                    setW9Uploaded(ok);
                    if (ok && typeof onW9Upload === 'function') onW9Upload(true);
                  })
                }
              />
              {w9Uploaded && <p style={{ color: 'green' }}>W-9 successfully uploaded</p>}
            </div>

            {/* SS CARD */}
            <hr style={{ margin: '20px 0', opacity: 0.3 }} />
            <p>
              <strong>Staff only:</strong> Upload your Social Security card for payroll
              verification.
            </p>

            <div style={{ marginTop: 8 }}>
              <label>Upload SS Card:</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) =>
                  handleUpload('/api/upload-ss', 'ssFile', e.target.files?.[0], (ok) => {
                    setSsUploaded(ok);
                    if (ok && typeof onSSUpload === 'function') onSSUpload(true);
                  })
                }
              />
              {ssUploaded && <p style={{ color: 'green' }}>SS card successfully uploaded</p>}
            </div>
          </>
        )}

        <div style={{ marginTop: 24 }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
