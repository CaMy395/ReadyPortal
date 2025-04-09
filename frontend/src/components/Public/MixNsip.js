import React, { useState } from 'react';
import '../../App.css';
import ChatBox from './ChatBox'; 
import { useNavigate } from 'react-router-dom';

const MixNsipForm = () => {
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        eventType: '',
        guestCount: '',
        addons: [],
        paymentMethod: '',
        howHeard: '',
        referral: '',
        referralDetails: '',
        additionalComments: '',
    });

    // Add-on prices
    const addonPrices = {
        "Customize Apron": 10,
        "Patron Reusable Cup": 25
    };

    
    // Navigate to Payment.js and include addons
    const proceedToScheduling = () => {
        const basePrice = extractPriceFromTitle(formData.eventType);
        const encodedAddons = encodeURIComponent(btoa(JSON.stringify(formData.addons.map(a => ({
            name: a.name,
            price: a.price,
            quantity: a.quantity
        })))));
            
        navigate(`/rb/client-scheduling?name=${encodeURIComponent(formData.fullName)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}&paymentMethod=${encodeURIComponent(formData.paymentMethod)}&price=${basePrice}&guestCount=${formData.guestCount}&addons=${encodedAddons}`, {
            state: { addons: formData.addons }
        });
    };
    
    const handleAddonSelection = (e) => {
        const { value, checked } = e.target;
    
        setFormData(prev => {
            let updatedAddons;
            if (checked) {
                // Add the addon with default quantity 1
                updatedAddons = [...prev.addons, { name: value, price: addonPrices[value], quantity: 1 }];
            } else {
                // Remove addon if unchecked
                updatedAddons = prev.addons.filter(addon => addon.name !== value);
            }
            return { ...prev, addons: updatedAddons };
        });
    };
    const handleAddonQuantityChange = (addonName, quantity) => {
        setFormData(prev => {
            const updatedAddons = prev.addons.map(addon =>
                addon.name === addonName ? { ...addon, quantity: quantity } : addon
            );
            return { ...prev, addons: updatedAddons };
        });
    };
    
    // Function to extract base price from title
    const extractPriceFromTitle = (title) => {
        const match = title.match(/\$(\d+(\.\d{1,2})?)/); // Match price in title
        return match ? parseFloat(match[1]) : 0; // Default to 0 if no price is found
    };

    // Calculate total price (Base Price + Add-ons)
    const getTotalPrice = () => {
        let basePrice = extractPriceFromTitle(formData.eventType);
        const guestCount = formData.guestCount || 1; // Default to 1 guest if not provided

        let addonTotal = (Array.isArray(formData.addons) ? formData.addons : []).reduce(
            (total, addon) => total + (addon.price * (addon.quantity || 1)), // Multiply by quantity
            0
        );
        
        return ((basePrice * guestCount) + addonTotal).toFixed(2); // Multiply by the number of guests
    };
    
    // Handle input changes
    const handleChange = (e) => {
        const { name, value, options } = e.target;

        if (name === "guestCount") {
            console.log("Guest count changed:", value); // Add this log to debug
        }

        if (name === "addons") {
            const selectedOptions = Array.from(options)
                .filter((option) => option.selected)
                .map((option) => option.value);
    
            setFormData((prev) => {
                // Create a new array to update add-on quantities
                const updatedAddons = selectedOptions.map(addon => {
                    const existingAddon = prev.addons.find(a => a.name === addon);
                    return existingAddon
                        ? { ...existingAddon, quantity: existingAddon.quantity + 1 } // Increment if exists
                        : { name: addon, price: addonPrices[addon] || 0, quantity: 1 }; // Add new
                });
    
                return {
                    ...prev,
                    [name]: updatedAddons
                };
            });
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };
    
    
    // Form Submission
    // Call `proceedToScheduling()` inside `handleSubmit` instead of `proceedToPayment`
    const handleSubmit = async (e) => {
        e.preventDefault();
        proceedToScheduling(); // ✅ Redirects to Scheduling Page first
    
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
        try {
            const response = await fetch(`${apiUrl}/api/mix-n-sip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
    
            if (response.ok) {
                alert('Next step, schedule your appointment!');
                console.log("📤 Navigating to Client Scheduling with Add-ons:", formData.addons);

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
            <h1>Mix N' Sip Form</h1>
            <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <label>
                    Full Name*:
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
                </label>
                <label>
                    Email*:
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </label>
                <label>
                    Phone*:
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                </label>    
                <label>
                    What type of event is this? *
                    <input type="text" name="eventType" value={formData.eventType} onChange={handleChange} required />
                </label>
               
                <label>
                    How many guests will be attending? *
                    <input type="number" name="guestCount" value={formData.guestCount} onChange={handleChange} required />
                </label>
    
                {/* Add-ons */}
                <label>
    Would you like any of our add-ons? (Select quantity below) *
</label>
{Object.keys(addonPrices).map((addon) => (
    <div key={addon} style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <input
            type="checkbox"
            id={addon}
            name="addons"
            value={addon}
            onChange={handleAddonSelection}
        />
        <label htmlFor={addon} style={{ marginLeft: "8px" }}>{addon} (+${addonPrices[addon]})</label>
        <input
            type="number"
            min="1"
            value={formData.addons.find(a => a.name === addon)?.quantity || 1}
            disabled={!formData.addons.some(a => a.name === addon)}
            onChange={(e) => handleAddonQuantityChange(addon, parseInt(e.target.value))}
            style={{ width: "50px", marginLeft: "10px" }}
        />
    </div>
))}

                {/* Display Total Price */}
                <p><strong>Total Add-on Price:</strong> ${getTotalPrice()}</p>

                {/* Payment Method */}
                <label>
                    How will you be paying? *
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                        <option value="">Select</option>
                        <option value="Square">Square - Payment Link</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Cashapp">Cashapp</option>
                    </select>
                </label>

                {/* Additional Comments */}
                <label>
                    Anything else you would like for us to know? *
                    <input type="text" name="additionalComments" value={formData.additionalComments} onChange={handleChange} required />
                </label>
                
                <label>
                    How did you hear about us? *
                    <select name="howHeard" value={formData.howHeard} onChange={handleChange} required>
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
                        <input type="text" name="referral" value={formData.referral} onChange={handleChange} required />
                    </label>
                )}

                {formData.howHeard === 'Other' && (
                    <label>
                        If other, please elaborate, else N/A *
                        <textarea name="referralDetails" value={formData.referralDetails} onChange={handleChange} required />
                    </label>
                )}

                {/* Submit Button */}
                <button type="submit">Submit</button>
            </form>
            {/* Chatbox */}
            <ChatBox />
        </div>
    );
};

export default MixNsipForm;
