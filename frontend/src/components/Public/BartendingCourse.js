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
            const response = await fetch(`${apiUrl}/api/bartending-course`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            // ✅ Extract response data
            const { fullName, email, phone, paymentMethod } = formData;

            alert("Your inquiry has been submitted successfully!");

            // ✅ Reset form data
            setFormData({
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

            // ✅ Redirect to scheduling page with client details in the URL
            navigate(
                `/rb/client-scheduling?name=${encodeURIComponent(fullName)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&paymentMethod=${encodeURIComponent(paymentMethod)}`
            );
        } catch (error) {
            console.error("❌ Error submitting inquiry:", error);
            alert("There was an issue submitting your inquiry. Please try again.");
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

                {/* ✅ Payment Method */}
                <label>
                    How will you be paying? *
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                        <option value="">Select</option>
                        <option value="Square">Square - Payment Link</option>
                        <option value="Zelle">Zelle</option>
                        <option value="Cashapp">Cashapp</option>
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
