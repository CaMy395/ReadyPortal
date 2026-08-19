import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TermsModal from './TermsModal';
import '../../App.css';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    confirmEmail: '',
    phone: '',
    address: '',
    position: '',
    preferred_payment_method: '',
    payment_details: '',
    password: '',
    inviteCode: '',
    role: 'user',
  });

  const [showInstructionModal, setShowInstructionModal] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [w9Uploaded, setW9Uploaded] = useState(false);
  const [ssUploaded, setSsUploaded] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const apiUrl =
    process.env.REACT_APP_API_URL || 'http://localhost:3001';

  /*
   * ---------------------------------------------------------
   * HANDLE INPUT CHANGES
   * ---------------------------------------------------------
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  /*
   * ---------------------------------------------------------
   * LOAD CURRENT REGISTRATION DOCUMENT STATUS
   * ---------------------------------------------------------
   *
   * sessionStorage is used instead of localStorage so another
   * person using the browser later does not automatically
   * inherit the previous registrant's upload status.
   */
  useEffect(() => {
    const loadDocumentStatus = () => {
      setIdUploaded(
        sessionStorage.getItem('registrationIdUploaded') === 'true'
      );
      setW9Uploaded(
        sessionStorage.getItem('registrationW9Uploaded') === 'true'
      );
      setSsUploaded(
        sessionStorage.getItem('registrationSsUploaded') === 'true'
      );
    };

    loadDocumentStatus();

    window.addEventListener(
      'registrationDocsUpdated',
      loadDocumentStatus
    );

    return () => {
      window.removeEventListener(
        'registrationDocsUpdated',
        loadDocumentStatus
      );
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * FORM VALIDATION
   * ---------------------------------------------------------
   */
  const emailsMatch =
    formData.email.trim().toLowerCase() ===
    formData.confirmEmail.trim().toLowerCase();

  const requiredDocumentsComplete =
    idUploaded && w9Uploaded && ssUploaded;

  const termsCheckboxDisabled = !requiredDocumentsComplete;

  /*
   * ---------------------------------------------------------
   * REGISTER
   * ---------------------------------------------------------
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailsMatch) {
      alert('Email addresses do not match.');
      return;
    }

    if (!requiredDocumentsComplete) {
      alert(
        'Please complete your Government ID, W-9, and Social Security card uploads in the Staff Handbook & Registration Terms before registering.'
      );
      return;
    }

    if (!agreeToTerms) {
      alert('Please agree to the Terms and Conditions.');
      return;
    }

    if (!formData.inviteCode.trim()) {
      alert('A valid staff invite code is required.');
      return;
    }

    setSubmitting(true);

    try {
      /*
       * Do NOT validate the invite code in React.
       *
       * The backend /register route should compare:
       *
       * req.body.inviteCode
       *
       * against something like:
       *
       * process.env.STAFF_REGISTRATION_INVITE_CODE
       */

      const submissionData = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        position: formData.position,
        preferred_payment_method:
          formData.preferred_payment_method,
        payment_details: formData.payment_details.trim(),
        password: formData.password,

        // Staff registration only
        role: 'user',

        // Backend must validate this
        inviteCode: formData.inviteCode.trim(),

        // Registration/onboarding information
        termsAccepted: agreeToTerms,
        handbookVersion: '2.0',
        handbookAcknowledgedAt: new Date().toISOString(),
        idUploaded,
        w9Uploaded,
        ssUploaded,
      };

      console.log('Submitting staff registration...');

      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        console.error('Registration failed:', data);

        alert(
          data.message ||
            data.error ||
            'Registration failed. Please check your information and try again.'
        );

        return;
      }

      console.log('Registration successful:', data);

      /*
       * Clear temporary registration status so another person
       * using this browser cannot inherit the W-9 completion.
       */
      sessionStorage.removeItem('registrationIdUploaded');
      sessionStorage.removeItem('registrationW9Uploaded');
      sessionStorage.removeItem('registrationSsUploaded');

      setIdUploaded(false);
      setW9Uploaded(false);
      setSsUploaded(false);
      setAgreeToTerms(false);

      navigate('/login', {
        state: {
          registrationSuccess: true,
        },
      });
    } catch (error) {
      console.error('Error during registration:', error);

      alert(
        'Unable to complete registration. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <form onSubmit={handleSubmit}>
          <h2>Staff Registration</h2>

          <p
            style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            Ready Bartending Staff Portal
          </p>

          {/* FULL NAME */}
          <label>
            Full Name:
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </label>

          {/* USERNAME */}
          <label>
            Username:
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </label>

          {/* EMAIL */}
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          {/* CONFIRM EMAIL */}
          <label>
            Confirm Email:
            <input
              type="email"
              name="confirmEmail"
              value={formData.confirmEmail}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          {formData.confirmEmail && !emailsMatch && (
            <p
              style={{
                color: '#b00020',
                fontSize: '13px',
                marginTop: '-8px',
              }}
            >
              Emails do not match.
            </p>
          )}

          {/* PHONE */}
          <label>
            Phone:
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              autoComplete="tel"
              required
            />
          </label>

          {/* ADDRESS */}
          <label>
            Address:
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, City, State, ZIP"
              autoComplete="street-address"
              required
            />
          </label>

          {/* POSITION */}
          <label>
            Position:
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select a position
              </option>

              <option value="Bartender">
                Bartender
              </option>

              <option value="Server">
                Server
              </option>

              <option value="Barback">
                Barback
              </option>
            </select>
          </label>

          {/* PAYMENT METHOD */}
          <label>
            Preferred Payment Method:
            <select
              name="preferred_payment_method"
              value={formData.preferred_payment_method}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select a payment method
              </option>

              <option value="CashApp">
                Cash App
              </option>

              <option value="Zelle">
                Zelle
              </option>
            </select>
          </label>

          {/* PAYMENT DETAILS */}
          <label>
            Payment Details:
            <input
              type="text"
              name="payment_details"
              value={formData.payment_details}
              onChange={handleChange}
              placeholder={
                formData.preferred_payment_method === 'Zelle'
                  ? 'Zelle phone number or email'
                  : formData.preferred_payment_method ===
                    'CashApp'
                  ? '$Cashtag'
                  : 'Payment account information'
              }
              required
            />
          </label>

          {/* PASSWORD */}
          <label>
            Password:
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {/* INVITE CODE */}
          <label>
            Staff Invite Code:
            <input
              type="password"
              name="inviteCode"
              value={formData.inviteCode}
              onChange={handleChange}
              placeholder="Enter your invite code"
              autoComplete="off"
              required
            />
          </label>

          <p
            style={{
              fontSize: '12px',
              marginTop: '-5px',
              marginBottom: '15px',
            }}
          >
            Registration is available to authorized Ready
            Bartending staff only.
          </p>

          {/* TERMS */}
          <div className="agreement">
            <input
              id="termsAgreement"
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) =>
                setAgreeToTerms(e.target.checked)
              }
              disabled={termsCheckboxDisabled}
            />

            <span>
              I agree to the{' '}
              <Link
                to="#"
                className="custom-link"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTermsModal(true);
                }}
              >
                Staff Handbook & Registration Terms
              </Link>
            </span>
          </div>

          {!w9Uploaded && (
            <p
              style={{
                color: '#8B0000',
                fontSize: '12px',
                marginTop: '7px',
              }}
            >
              Complete all required documents in the Staff Handbook &
              Registration Terms to unlock this checkbox.
            </p>
          )}

          {requiredDocumentsComplete && (
            <p
              style={{
                fontSize: '12px',
                marginTop: '7px',
              }}
            >
              ✓ Required staff documents completed.
            </p>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={
              submitting ||
              !agreeToTerms ||
              !requiredDocumentsComplete ||
              !emailsMatch
            }
            style={{
              backgroundColor:
                submitting ||
                !agreeToTerms ||
                !requiredDocumentsComplete ||
                !emailsMatch
                  ? '#777'
                  : '#8B0000',

              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',

              cursor:
                submitting ||
                !agreeToTerms ||
                !requiredDocumentsComplete ||
                !emailsMatch
                  ? 'not-allowed'
                  : 'pointer',

              opacity:
                submitting ||
                !agreeToTerms ||
                !requiredDocumentsComplete ||
                !emailsMatch
                  ? 0.7
                  : 1,
            }}
          >
            {submitting
              ? 'Registering...'
              : 'Register'}
          </button>
        </form>

        <p className="link-to-other">
          Already have an account?{' '}
          <Link to="/login">Login here</Link>
        </p>
      </div>

      {/* TERMS MODAL */}
      {showTermsModal && (
        <TermsModal
          open={showTermsModal}
          role="user"
          onClose={() => setShowTermsModal(false)}
          onIDUpload={(uploaded) => {
            const completed = Boolean(uploaded);
            setIdUploaded(completed);

            if (completed) {
              sessionStorage.setItem(
                'registrationIdUploaded',
                'true'
              );
            } else {
              sessionStorage.removeItem(
                'registrationIdUploaded'
              );
            }

            window.dispatchEvent(
              new Event('registrationDocsUpdated')
            );
          }}
          onW9Upload={(uploaded) => {
            const completed = Boolean(uploaded);
            setW9Uploaded(completed);

            if (completed) {
              sessionStorage.setItem(
                'registrationW9Uploaded',
                'true'
              );
            } else {
              sessionStorage.removeItem(
                'registrationW9Uploaded'
              );
            }

            window.dispatchEvent(
              new Event('registrationDocsUpdated')
            );
          }}
          onSSUpload={(uploaded) => {
            const completed = Boolean(uploaded);
            setSsUploaded(completed);

            if (completed) {
              sessionStorage.setItem(
                'registrationSsUploaded',
                'true'
              );
            } else {
              sessionStorage.removeItem(
                'registrationSsUploaded'
              );
            }

            window.dispatchEvent(
              new Event('registrationDocsUpdated')
            );
          }}
        />
      )}

      {/* REGISTRATION INSTRUCTIONS */}
      {showInstructionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              How to Complete Your Registration
            </h3>

            <ul>
              <li>
                ✅ Enter your staff information.
              </li>

              <li>
                ✅ Enter the invite code provided by Ready
                Bartending.
              </li>

              <li>
                ✅ Read the Staff Handbook & Registration Terms.
              </li>

              <li>
                ✅ Upload your Government ID.
              </li>

              <li>
                ✅ Upload your W-9 and Social Security card.
              </li>

              <li>
                ✅ Return to registration and check the handbook
                agreement box once all required documents are complete.
              </li>

              <li>
                ✅ Click Register to create your account.
              </li>
            </ul>

            <button
              type="button"
              onClick={() =>
                setShowInstructionModal(false)
              }
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#8B0000',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;