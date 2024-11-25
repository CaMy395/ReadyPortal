// src/components/Register.js
import React, { useState } from 'react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'user', // Default role is user
    });
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(''); // Reset error message
        setSuccessMessage(''); // Reset success message
        
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001'
        
        try {
            const response = await fetch(`${apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
    
            // Log the response for debugging
            const text = await response.text(); // Get the response as text
            console.log('Raw Response:', text); // Log the raw response
    
            // Check if the response is not empty before parsing
            if (text) {
                const data = JSON.parse(text); // Now parse the text as JSON
    
                if (response.ok) {
                    setSuccessMessage('Registration successful! You can now log in.');
                    setFormData({
                        username: '',
                        email: '',
                        password: '',
                        role: 'user', // Reset to default
                    });
                } else {
                    setErrorMessage(data.message || 'Registration failed. Please try again.');
                }
            } else {
                setErrorMessage('Empty response from server. Please try again.');
            }
        } catch (error) {
            console.error('Error during registration:', error);
            setErrorMessage('An error occurred. Please try again later.');
        }
    };
    
    
    return (
        <div>
            <h1>Register</h1>
            <form onSubmit={handleSubmit}>
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
                <br />
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
                <br />
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
                <br />
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
                <br />
                <label>
                    Role:
                    <select name="role" value={formData.role} onChange={handleChange}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </label>
                <br />
                <button type="submit">Register</button>
            </form>
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        </div>
    );
};

export default Register;