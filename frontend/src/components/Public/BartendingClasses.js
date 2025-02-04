import React, { useState } from 'react';
import '../../App.css';
import ChatBox from './ChatBox';
import { useNavigate } from 'react-router-dom';

const BartendingClass = () => {
    const navigate = useNavigate(); // Initialize navigate
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        payment_method: '',
        isAdult: '',
        experience: '',
        classCount: '',
        referral: '',
        referralDetails: '',
    });


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleChange = (e) => {
        const { name, value, multiple, options } = e.target;
    
        if (multiple) {
            // Handle multi-select dropdown
            const selectedOptions = Array.from(options)
                .filter((option) => option.selected)
                .map((option) => option.value);
            setFormData((prev) => ({
                ...prev,
                [name]: selectedOptions, // Update the array in state
            }));

        } else {
            // Handle all other input types
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
        try {
            const response = await fetch(`${apiUrl}/api/bartending-classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
    
            alert('Your inquiry has been submitted successfully!');
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                paymentMethod: '',
                isAdult: '',
                experience: '',
                classCount: '',
                referral: '',
                referralDetails: '',
            });
            navigate('/rb/client-scheduling'); // Replace with the correct route
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            alert('There was an issue submitting your inquiry. Please try again.');
        }
    };
    

    return (
        <div className="form-container">
            <h2>Bartending Classes Inquiry</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Full Name:
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                    />
                </label>
                <label>
                    Email:
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                </label>
                <label>
                    Phone:
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                    />
                </label>
    
                <label>
                    Are you at least 18 years old? *
                    <select name="isAdult" value={formData.isAdult} onChange={handleInputChange} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </label>
                <label>
                    Do you have any experience? *
                    <select name="experience" value={formData.experience} onChange={handleInputChange} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </label>
                <label>
                    How many classes do you want to book? *
                    <input 
                        type="number"
                        name="classCount" 
                        value={formData.classCount} 
                        onChange={handleInputChange}
                        required
                    />
                </label>
                                {/* Payment Method */}
                                <label>
                    How will you be paying? *
                    <select
                        name="paymentMethod"
                        value={formData.paymentMethod} // Bind the array from state
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="Square">Square - Payment Link</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Cashapp">Cashapp</option>
                    </select>
                </label>
                <label>
                    How did you hear about us? *
                    <select
                        name="referral"
                        value={formData.referral}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="Friend">Referred by a Friend</option>
                        <option value="Advertisement">Advertisement</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">Tik Tok</option>
                        <option value="Google">Google</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                {formData.referral === 'Friend' && (
                    <label>
                        If referred by a friend, please tell us who!
                        <input
                            type="text"
                            name="referralDetails"
                            value={formData.referralDetails}
                            onChange={handleChange}
                            required
                        />
                    </label>
                )}

                {formData.referral === 'Other' && (
                    <label>
                        If other, please elaborate, else N/A *
                        <textarea
                            name="referralDetails"
                            value={formData.referralDetails}
                            onChange={handleChange}
                            required
                        />
                    </label>
                )}
                
                <button type="submit">Submit</button>
            </form>
            {/* Add Chatbox */}
            <ChatBox />
        </div>
    );
};

export default BartendingClass;
