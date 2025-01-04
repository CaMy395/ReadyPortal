import React, { useState } from 'react';
import '../../App.css';

const CraftsForm = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        eventType: '',
        guestCount: '',
        addons: [],
        howHeard: '',
        referral: '',
        referralDetails: '',
        additionalComments: '',
    });

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
            const response = await fetch(`${apiUrl}/api/craft-cocktails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert('Form submitted successfully!');
                setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    date: '',
                    time: '',
                    eventType: '',
                    guestCount: '',
                    addons: [],
                    howHeard: '',
                    referral: '',
                    referralDetails: '',
                    additionalComments: '',
                });
            } else {
                throw new Error('Failed to submit the form');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred while submitting the form. Please try again.');
        }
    };

    return (
        <div className="intake-form-container">
            <h1>Crafts and Cocktails Form</h1>
            <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <label>
                    Full Name*:
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Email*:
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Phone*:
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Date*:
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Time*:
                    <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        required
                    />
                </label>
    
                <label>
                    What type of event is this? *
                    <input
                        type="text"
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleChange}
                        required
                    />
                </label>
               
                <label>
                    How many guests will be attending? *
                    <input
                        type="number"
                        name="guestCount"
                        value={formData.guestCount}
                        onChange={handleChange}
                        required
                    />
                </label>
    
                {/* Add-ons */}
                    <label>
                    Would you like any of our add-ons? (if using a computer hold 'Ctrl' to select multiple options)*
                    <select
                        name="addons"
                        multiple
                        value={formData.addons} // Bind the array from state
                        onChange={handleChange}
                        required
                    >
                        <option value="Customize Apron">Customize Apron</option>
                        <option value="Bottle Image">Image for Bottle</option>
                        <option value="Patron Bottle">Reusable Patron Bottle</option>
                    </select>
                </label>
                {/* Additional Comments */}
                <label>
                    Anything else you would like for us to know? *
                    <input
                        type="text"
                        name="additionalComments"
                        value={formData.additionalComments}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    How did you hear about us? *
                    <select
                        name="howHeard"
                        value={formData.howHeard}
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

                {formData.howHeard === 'Friend' && (
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

                {formData.howHeard === 'Other' && (
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

                {/* Submit Button */}
                <button type="submit">Submit</button>
            </form>
        </div>
    );
    
};

export default CraftsForm;