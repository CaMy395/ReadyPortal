import React, { useState, useEffect } from 'react';
import TermsModal from './TermsModal';
import '../../App.css';

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
    const [showModal, setShowModal] = useState(false);
    const [w9Uploaded, setW9Uploaded] = useState(false);
    const [modalOpened, setModalOpened] = useState(false); // Track if modal was opened

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        // Add registration logic here
    };

    useEffect(() => {
        const updateW9Status = () => {
            const isW9Uploaded = localStorage.getItem('w9Uploaded') === 'true';
            setW9Uploaded(isW9Uploaded);
        };

        window.addEventListener('w9StatusUpdated', updateW9Status);

        return () => {
            window.removeEventListener('w9StatusUpdated', updateW9Status);
        };
    }, []);

    return (
        <div className="register-page">
            <div className="register-container">
                <form onSubmit={handleSubmit}>
                    <h2>Register</h2>
                    <label>
                        Full Name:
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
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
                    {/* Add other form fields here */}
                    <div>
                        <input
                            type="checkbox"
                            checked={agreeToTerms}
                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                            disabled={!modalOpened || !w9Uploaded} // Disable checkbox until modal is opened and W-9 is uploaded
                        />
                        <span>
                            I agree to the{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(true);
                                    setModalOpened(true);
                                }}
                                style={{
                                    textDecoration: 'underline',
                                    background: 'none',
                                    border: 'none',
                                    color: 'gold',
                                    cursor: 'pointer',
                                }}
                            >
                                Terms and Conditions
                            </button>
                        </span>
                    </div>
                    <button type="submit" disabled={!agreeToTerms}>
                        Register
                    </button>
                </form>

                {showModal && (
                    <TermsModal
                        onClose={() => setShowModal(false)}
                        onW9Upload={(uploaded) => setW9Uploaded(uploaded)}
                    />
                )}
            </div>
        </div>
    );
};

export default Register;
