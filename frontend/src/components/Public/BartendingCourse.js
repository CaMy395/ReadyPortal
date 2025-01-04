import React, { useState } from 'react';
import '../../App.css';

const BartendingCourse = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        isAdult: '',
        experience: '',
        setSchedule: '',
        paymentPlan: '',
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
            const response = await fetch(`${apiUrl}/api/bartending-course`, {
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
                isAdult: '',
                experience: '',
                setSchedule: '',
                paymentPlan: '',
                referral: '',
                referralDetails: '',
            });
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            alert('There was an issue submitting your inquiry. Please try again.');
        }
    };
    

    return (
        <div className="form-container">
            <h2>Bartending Course Inquiry</h2>
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
                    Are you able to dedicate time to a set schedule? *
                    <select name="setSchedule" value={formData.setSchedule} onChange={handleInputChange} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </label>
                <label>
                    Will you need a payment plan? *
                    <select name="paymentPlan" value={formData.paymentPlan} onChange={handleInputChange} required>
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
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
                            value={formData.referral}
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
        </div>
    );
};

export default BartendingCourse;
