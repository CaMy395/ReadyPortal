import React, { useState } from 'react';
import '../../App.css';
import ChatBox from './ChatBox';
import { useNavigate } from 'react-router-dom';

const CraftsForm = () => {
    const navigate = useNavigate();
    const basePricePerGuest = 85;
    const appointmentType = "Crafts & Cocktails (2 hours, @ $85.00)";

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        eventType: '',
        guestCount: '',
        addons: [],
        apronTexts: [],           // ✅ add this
        guestDetails: [],         // ✅ add this
        paymentMethod: '',
        howHeard: '',
        referral: '',
        referralDetails: '',
        additionalComments: '',
        });


    const addonPrices = {
        "Customize Apron": 15,
        "Extra Patron Bottle": 25,
        "Hookah with Refills": 75
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
        const encodedAddons = encodeURIComponent(
            btoa(JSON.stringify(formData.addons.map(a => ({
                name: a.name,
                price: a.price,
                quantity: a.quantity
            }))))
        );

        navigate(
            `/rb/client-scheduling?` +
            `name=${encodeURIComponent(formData.fullName)}` +
            `&email=${encodeURIComponent(formData.email)}` +
            `&phone=${encodeURIComponent(formData.phone)}` +
            `&paymentMethod=${encodeURIComponent(formData.paymentMethod)}` +
            `&price=${getTotalPrice()}` +
            `&guestCount=${formData.guestCount}` +
            `&appointmentType=${encodeURIComponent(appointmentType)}` +
            `&addons=${encodedAddons}`,
            {
                state: { addons: formData.addons }
            }
        );
    };

    
    const handleApronTextChange = (index, value) => {
        setFormData(prev => {
            const updatedTexts = [...prev.apronTexts];
            updatedTexts[index] = value;
            return { ...prev, apronTexts: updatedTexts };
        });
    };

        const handleGuestDetailChange = (index, field, value) => {
        setFormData(prev => {
            const updatedGuests = [...prev.guestDetails];
            updatedGuests[index] = { ...updatedGuests[index], [field]: value };
            return { ...prev, guestDetails: updatedGuests };
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
            const updatedAprons = addonName === "Customize Apron" ? Array(quantity).fill('').map((_, i) => prev.apronTexts[i] || '') : prev.apronTexts;
            return { ...prev, addons: updatedAddons, apronTexts: updatedAprons };
        });
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault(); // ✅ Prevent crash if manually called

        proceedToScheduling();

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        try {
            const response = await fetch(`${apiUrl}/api/craft-cocktails`, {
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
            <h1>Crafts and Cocktails Form</h1>
            <form>
                <label>Full Name*: <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required /></label>
                <label>Email*: <input type="email" name="email" value={formData.email} onChange={handleChange} required /></label>
                <label>Phone*: <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required /></label>
               
                 <label>How many guests will be attending? *<input type="number" name="guestCount" value={formData.guestCount} onChange={handleChange} required /></label>

                {parseInt(formData.guestCount) > 1 &&
                    [...Array(parseInt(formData.guestCount) - 1)].map((_, idx) => (
                        <div key={idx} style={{ marginBottom: '15px' }}>
                            <h4>Guest {idx + 2}</h4>
                            <input type="text" placeholder="Full Name" onChange={(e) => handleGuestDetailChange(idx, 'fullName', e.target.value)} required />
                            <input type="email" placeholder="Email" onChange={(e) => handleGuestDetailChange(idx, 'email', e.target.value)} />
                            <input type="tel" placeholder="Phone" onChange={(e) => handleGuestDetailChange(idx, 'phone', e.target.value)} />
                        </div>
                    ))
                }

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

                {formData.addons.some(a => a.name === "Customize Apron") && (
                    <div>
                        <label>What would you like printed on each apron? color?</label>
                        {[...Array(formData.addons.find(a => a.name === "Customize Apron")?.quantity || 1)].map((_, i) => (
                            <input
                                key={i}
                                type="text"
                                placeholder={`Apron ${i + 1} text`}
                                value={formData.apronTexts[i] || ''}
                                onChange={(e) => handleApronTextChange(i, e.target.value)}
                                required
                            />
                        ))}
                    </div>
                )}

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

                <button type="button" onClick={() => setShowModal(true)}>Submit</button>
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

            <ChatBox />
        </div>
    );
};

export default CraftsForm;
