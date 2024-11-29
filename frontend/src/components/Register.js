import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        phone: '',
        position: '',
        preferred_payment_method: '',
        payment_details: '',
        password: '',
        role: 'user',
    });

    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [termsClicked, setTermsClicked] = useState(false);
    const [w9Uploaded, setW9Uploaded] = useState(false); // Track W-9 status


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

        try {
            const response = await fetch(`${apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Registration successful! You can now log in.');
                setFormData({
                    name: '',
                    username: '',
                    email: '',
                    phone: '',
                    position: '',
                    preferred_payment_method: '',
                    payment_details: '',
                    password: '',
                    role: 'user',
                });
                setAgreeToTerms(false);
                setTermsClicked(false);
            } else {
                setErrorMessage(data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during registration:', error);
            setErrorMessage('An error occurred. Please try again later.');
        }
    };

    useEffect(() => {
    const updateW9Status = () => {
        const isW9Uploaded = localStorage.getItem('w9Uploaded') === 'true';
        console.log('W-9 Uploaded Status in Register:', isW9Uploaded); // Debugging
        setW9Uploaded(isW9Uploaded);
    };

    // Check W-9 status on mount
    updateW9Status();

    // Listen for updates to W-9 status
    window.addEventListener('w9StatusUpdated', updateW9Status);

    // Cleanup listener on unmount
    return () => {
        window.removeEventListener('w9StatusUpdated', updateW9Status);
    };
}, []);

    

    return (
        <div className="register-page">
            <div className="register-container">
                <form onSubmit={handleSubmit}>
                    <h2>Register</h2>
                    {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                    {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
                    <label>
                        Full Name:
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Username:
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Email:
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Phone:
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Position:
                        <select
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>Select a position</option>
                            <option value="Bartender">Bartender</option>
                            <option value="Server">Server</option>
                            <option value="Barback">Barback</option>
                        </select>
                    </label>
                    <label>
                        Preferred Payment Method:
                        <select
                            name="preferred_payment_method"
                            value={formData.preferred_payment_method}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>Select a payment method</option>
                            <option value="CashApp">CashApp</option>
                            <option value="Zelle">Zelle</option>
                        </select>
                    </label>
                    <label>
                        Payment Details:
                        <input
                            type="text"
                            name="payment_details"
                            value={formData.payment_details}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Password:
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    <label>
                        Role:
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </label>
      
                    {/* Agreement Checkbox */}
                    <div className="agreement">
                        <input
                            type="checkbox"
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                            disabled={!termsClicked || !w9Uploaded} // Disable until terms and W-9 are satisfied
                        />
                        <span>
                            I agree to the{' '}
                            <Link
                                to="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setTermsClicked(true)}
                            >
                                Terms and Conditions
                            </Link>
                        </span>
                    </div>
                    <button type="submit" disabled={!agreeToTerms}>
                        Register
                    </button>
                </form>
                <p className="link-to-other">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;



