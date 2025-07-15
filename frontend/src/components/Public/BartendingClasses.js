import React, { useState } from 'react';
import '../../App.css';
import ChatBox from './ChatBox';
import { useNavigate } from 'react-router-dom';

const BartendingClass = () => {
    const navigate = useNavigate(); // Initialize navigate
    const appointmentType = "Bartending Class (2 hours, @ $60.00)";
    const [showModal, setShowModal] = useState(false);
    const [confirmedSubmit, setConfirmedSubmit] = useState(false);

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
    const basePricePerClass = 60; // Fixed
    const getEstimatedTotal = () => {
        const classCount = parseInt(formData.classCount) || 0;
        return (classCount * basePricePerClass).toFixed(2);
    };
    
    const handleSubmit = async (e) => {
        if (e) e.preventDefault(); // safe

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const estimatedTotal = getEstimatedTotal();

        try {
            await fetch(`${apiUrl}/api/bartending-classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            // Save to localStorage to finalize later
            localStorage.setItem("pendingAppointment", JSON.stringify({
                title: appointmentType,
                client_name: formData.fullName,
                client_email: formData.email,
                client_phone: formData.phone,
                description: `Client booked a ${appointmentType}`,
                payment_method: "Square",
                classCount: formData.classCount,
                total_cost: parseFloat(estimatedTotal),
                addons: []
            }));

            alert('Next step, schedule your appointment!');

            navigate(
  `/rb/client-scheduling?` +
    `name=${encodeURIComponent(formData.fullName)}` +
    `&email=${encodeURIComponent(formData.email)}` +
    `&phone=${encodeURIComponent(formData.phone)}` +
    `&paymentMethod=${encodeURIComponent(formData.payment_method)}` +
    `&appointmentType=${encodeURIComponent(appointmentType)}` +
    `&classCount=${formData.classCount}` +
    `&price=${estimatedTotal}`
);



        } catch (error) {
            console.error('❌ Error submitting inquiry:', error);
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
                
                <button type="button" onClick={() => setShowModal(true)}>Submit</button>
            </form>
            {showModal && (
    <div className="modal">
        <div className="modal-content">
            <h2>Confirm Your Booking</h2>
            <p>To complete your booking, continue to the final payment page after scheduling.</p>
            <p><strong>Name:</strong> {formData.fullName}</p>
            <p><strong>Class Count:</strong> {formData.classCount}</p>
            <p><strong>Base Price:</strong> ${basePricePerClass} × {formData.classCount}</p>
            <p><strong>Estimated Total:</strong> ${getEstimatedTotal()} (subject to small processing fees)</p>

            <div className="modal-actions">
                <button className="modal-button use" onClick={() => {
                    setConfirmedSubmit(true);
                    setShowModal(false);
                    setTimeout(() => handleSubmit(), 0);
                }}>
                    Yes, Continue
                </button>
                <button className="modal-button cancel" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
        </div>
    </div>
)}


            {/* Add Chatbox */}
            <ChatBox />
        </div>
    );
};

export default BartendingClass;
