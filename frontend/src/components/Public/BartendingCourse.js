import React, { useState } from "react";
import "../../App.css";
import ChatBox from "./ChatBox";
import { useNavigate } from "react-router-dom";

const BartendingCourse = () => {
    const navigate = useNavigate(); // ✅ Define once inside the component

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        isAdult: "",
        experience: "",
        setSchedule: "",
        paymentPlan: "",
        paymentMethod: "",
        referral: "",
        referralDetails: "",
    });

    /** ✅ Handle input changes **/
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    /** ✅ Handle dropdown/multi-select changes **/
    const handleChange = (e) => {
        const { name, value, multiple, options } = e.target;

        if (multiple) {
            // Handle multi-select dropdown
            const selectedOptions = Array.from(options)
                .filter((option) => option.selected)
                .map((option) => option.value);
            setFormData((prev) => ({
                ...prev,
                [name]: selectedOptions, // ✅ Store array values correctly
            }));
        } else {
            // Handle all other input types
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    /** ✅ Handle form submission **/
    const handleSubmit = async (e) => {
        e.preventDefault();
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
    
        try {
            // 1. Submit inquiry
            const response = await fetch(`${apiUrl}/api/bartending-course`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
    
            if (!response.ok) {
                console.error("❌ Error submitting inquiry");
                return; // just stop, no alert
            }
        } catch (error) {
            console.error("❌ Error submitting inquiry:", error);
            return; // just stop, no alert
        }
    
        try {
            // 2. Create payment link
            const amount = formData.paymentPlan === "Yes" ? 100 : 400;
    
            const paymentLinkResponse = await fetch(`${apiUrl}/api/create-payment-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: amount,
                    email: formData.email,
                    itemName: formData.paymentPlan === "Yes" ? "Bartending Course Deposit" : "Bartending Course Full Payment",
                }),
            });
    
            const paymentData = await paymentLinkResponse.json();
            console.log("Payment data received:", paymentData);
    
            const { checkoutUrl } = paymentData;
    
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
                return; // stop immediately
            } else {
                console.error("❌ No checkout URL returned");
                return; // just stop, no alert
            }
        } catch (error) {
            console.error("❌ Error creating payment link:", error);
            return; // just stop, no alert
        }
    };
    
    

    
    

    return (
        <div className="form-container">
            <h2>Bartending Course Inquiry</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Full Name:
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
                </label>
                <label>
                    Email:
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </label>
                <label>
                    Phone:
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required />
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
                    Which upcoming class would you like to enroll? (All classes are Saturdays 11AM-2:00PM) *
                    <select name="setSchedule" value={formData.setSchedule} onChange={handleInputChange} required>
                        <option value="">Select</option>
                        <option value="May 10 - 31">May 10 - 31</option>
                        <option value="June 14 - July 5">June 14 - July 5</option>
                        <option value="July 19 - Aug 9">July 19 - Aug 9</option>
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

                {/* ✅ Referral */}
                <label>
                    How did you hear about us? *
                    <select name="referral" value={formData.referral} onChange={handleChange} required>
                        <option value="">Select</option>
                        <option value="Friend">Referred by a Friend</option>
                        <option value="Advertisement">Advertisement</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">Tik Tok</option>
                        <option value="Google">Google</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                {/* ✅ Show referral details if needed */}
                {formData.referral === "Friend" && (
                    <label>
                        If referred by a friend, please tell us who!
                        <input
                            type="text"
                            name="referralDetails"
                            value={formData.referralDetails} // ✅ Corrected
                            onChange={handleInputChange}
                            required
                        />
                    </label>
                )}

                {formData.referral === "Other" && (
                    <label>
                        If other, please elaborate, else N/A *
                        <textarea
                            name="referralDetails"
                            value={formData.referralDetails} // ✅ Corrected
                            onChange={handleInputChange}
                            required
                        />
                    </label>
                )}

                <button type="submit">Submit</button>
            </form>

            {/* ✅ Add Chatbox */}
            <ChatBox />
        </div>
    );
};

export default BartendingCourse;
