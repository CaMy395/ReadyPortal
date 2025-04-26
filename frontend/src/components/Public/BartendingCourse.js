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
            // 1. Submit inquiry to your backend (same)
            const response = await fetch(`${apiUrl}/api/bartending-course`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
    
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
    
            // 2. Figure out the amount
            const amount = formData.paymentPlan === "Yes" ? 100 : 400;

            // 3. Create the payment link
            const paymentLinkResponse = await fetch(`${apiUrl}/api/create-payment-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: amount,
                    email: formData.email, // ✅ Add this line
                    itemName: formData.paymentPlan === "Yes" ? "Bartending Course Deposit" : "Bartending Course Full Payment",
                }),
            });

            // 🔥 Log the raw response
            const paymentData = await paymentLinkResponse.json();
            console.log("Payment data received:", paymentData);

            if (!paymentLinkResponse.ok) {
                console.error("Payment Link Error:", paymentData);
                throw new Error(`Payment Link Error: ${paymentLinkResponse.statusText}`);
            }

            const { checkoutUrl } = paymentData;

            if (!checkoutUrl) {
                console.error("❌ checkoutUrl missing!", paymentData);
                throw new Error("Checkout URL is missing in payment link response.");
            }

            // 4. Redirect to payment page
            window.location.href = checkoutUrl;

    
        } catch (error) {
            console.error("❌ Error submitting:", error);
            alert("There was an issue submitting your enrollment. Please try again.");
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
