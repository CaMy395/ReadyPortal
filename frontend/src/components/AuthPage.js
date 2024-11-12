import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user', // Default role is user
    });
    const [isRegister, setIsRegister] = useState(true); // Toggle between register/login
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isRegister ? 'http://localhost:3001/register' : 'http://localhost:3001/login';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            console.log(data); // Log the response

            if (response.ok) {
                // If login or registration is successful, redirect to gigs page based on role
                if (data.role === 'admin') {
                    navigate('/admin-gigs');
                } else {
                    navigate('/user-gigs');
                }
            } else {
                alert(data || 'Authentication failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during authentication:', error);
        }
    };

    return (
        <div>
            <h1>{isRegister ? 'Register' : 'Login'}</h1>
            <form onSubmit={handleSubmit}>
                {isRegister && (
                    <>
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
                    </>
                )}
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
                {isRegister && (
                    <label>
                        Role:
                        <select name="role" value={formData.role} onChange={handleChange}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </label>
                )}
                <br />
                <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
            </form>
            <p onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? 'Already have an account? Login here' : 'Need an account? Register here'}
            </p>
        </div>
    );
};

export default AuthPage;
