import React, { useState } from 'react';
import '../../App.css';
import ChatBox from './ChatBox'; 
import { useNavigate } from 'react-router-dom';

const MixNsipForm = () => {
    const navigate = useNavigate();

    const basePricePerGuest = 75;
    const appointmentType = "Mix N' Sip (2 hours, @ $75.00)"; // ✅ FIXED APPOINTMENT TYPE

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        guestCount: '',
        addons: [],
        paymentMethod: '',
        howHeard: '',
        referral: '',
        referralDetails: '',
        additionalComments: '',
    });

    const addonPrices = {
        "Customize Apron": 10,
        "Patron Reusable Cup": 25
    };

    const [showModal, setShowModal] = useState(false);
    const [confirmedSubmit, setConfirmedSubmit] = useState(false);

    const getBaseTotal = () => {
        const guestCount = parseInt(formData.guestCount) || 1;
        return basePricePerGuest * guestCount;
    };

    const getAddonTotal = () => {
        return (formData.addons || []).reduce(
            (total, addon) => total + addon.price * (addon.quantity || 1),
            0
        );
    };

    const getTotalPrice = () => {
        return (getBaseTotal() + getAddonTotal()).toFixed(2);
    };

    const proceedToScheduling = () => {
        const encodedAddons = encodeURIComponent(btoa(JSON.stringify(formData.addons.map(a => ({
            name: a.name,
            price: a.price,
            quantity: a.quantity
        })))));

        navigate(`/rb/client-scheduling?name=${encodeURIComponent(formData.fullName)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}&paymentMethod=${encodeURIComponent(formData.paymentMethod)}&price=${getBaseTotal()}&guestCount=${formData.guestCount}&appointmentType=${encodeURIComponent(appointmentType)}&addons=${encodedAddons}`, {
            state: { addons: formData.addons }
        });
    };

    const handleAddonSelection = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            let updatedAddons = checked
                ? [...prev.addons, { name: value, price: addonPrices[value], quantity: 1 }]
                : prev.addons.filter(addon => addon.name !== value);
            return { ...prev, addons: updatedAddons };
        });
    };

    const handleAddonQuantityChange = (addonName, quantity) => {
        setFormData(prev => {
            const updatedAddons = prev.addons.map(addon =>
                addon.name === addonName ? { ...addon, quantity } : addon
            );
            return { ...prev, addons: updatedAddons };
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!confirmedSubmit) {
            setShowModal(true);
            return;
        }

        proceedToScheduling();

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        try {
            const response = await fetch(`${apiUrl}/api/mix-n-sip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                alert('Next step, schedule your appointment!');
            } else {
                throw new Error('Failed to submit form');
            }
        } catch (error) {
            console.error('❌ Submission error:', error);
            alert('Something went wrong. Try again.');
        }
    };

    return (
        <div className="intake-form-container">
            <h1>Mix N' Sip Form</h1>
            <form onSubmit={handleSubmit}>
                <label>Full Name*: <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required /></label>
                <label>Email*: <input type="email" name="email" value={formData.email} onChange={handleChange} required /></label>
                <label>Phone*: <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required /></label>
                <label>How many guests will be attending? *<input type="number" name="guestCount" value={formData.guestCount} onChange={handleChange} required /></label>

                <label>Would you like any of our add-ons? (Select quantity below)</label>
                {Object.keys(addonPrices).map((addon) => (
                    <div key={addon} style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                        <input type="checkbox" id={addon} value={addon} onChange={handleAddonSelection} />
                        <label htmlFor={addon} style={{ marginLeft: "8px" }}>{addon} (+${addonPrices[addon]})</label>
                        <input
                            type="number"
                            min="1"
                            disabled={!formData.addons.some(a => a.name === addon)}
                            value={formData.addons.find(a => a.name === addon)?.quantity || 1}
                            onChange={(e) => handleAddonQuantityChange(addon, parseInt(e.target.value))}
                            style={{ width: "50px", marginLeft: "10px" }}
                        />
                    </div>
                ))}
                
                <label>Anything else you’d like us to know? *<input type="text" name="additionalComments" value={formData.additionalComments} onChange={handleChange} required /></label>

                <label>How did you hear about us? *
                    <select name="howHeard" value={formData.howHeard} onChange={handleChange} required>
                        <option value="">Select</option>
                        <option value="Friend">Referred by a Friend</option>
                        <option value="Advertisement">Advertisement</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Google">Google</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                {formData.howHeard === 'Friend' && (
                    <label>Who referred you? <input type="text" name="referral" value={formData.referral} onChange={handleChange} required /></label>
                )}
                {formData.howHeard === 'Other' && (
                    <label>If other, please elaborate. <textarea name="referralDetails" value={formData.referralDetails} onChange={handleChange} required /></label>
                )}

                <button type="submit">Submit</button>
            </form>

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Confirm Your Booking</h2>
                        <p>To complete your booking continue to the final payment page after scheduling</p>
                        <p><strong>Name:</strong> {formData.fullName}</p>
                        <p><strong>Guest Count:</strong> {formData.guestCount}</p>
                        <p><strong>Base:</strong> ${basePricePerGuest} × {formData.guestCount} = ${getBaseTotal()}</p>
                        <p><strong>Add-ons:</strong> ${getAddonTotal()}</p>
                        <p><strong>Estimated Total:</strong> ${getTotalPrice()} (subject to small processing fees)</p>
                        <button onClick={() => {
                            setConfirmedSubmit(true);
                            setShowModal(false);
                            setTimeout(() => document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 0);
                        }}>Yes, Continue</button>
                        <button onClick={() => setShowModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <ChatBox />
        </div>
    );
};

export default MixNsipForm;
