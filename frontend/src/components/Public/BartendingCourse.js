import React, { useState } from "react";
import "../../App.css";
import ChatBox from "./ChatBox";
import { useNavigate } from "react-router-dom";

const BartendingCourse = () => {
    const navigate = useNavigate();

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

    const [showModal, setShowModal] = useState(false);
    const [confirmedSubmit, setConfirmedSubmit] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleChange = (e) => {
        const { name, value, multiple, options } = e.target;
        if (multiple) {
            const selectedOptions = Array.from(options)
                .filter((option) => option.selected)
                .map((option) => option.value);
            setFormData((prev) => ({
                ...prev,
                [name]: selectedOptions,
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

const handleSubmit = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${apiUrl}/api/bartending-course`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            console.error("❌ Error submitting inquiry");
            return;
        }

        alert("✅ Your form was successfully submitted! Redirecting to payment...");
    } catch (error) {
        console.error("❌ Error submitting inquiry:", error);
        return;
    }

    // 🔗 Convert setSchedule to actual class start date
    try {
    const convertSetScheduleToStartDate = (schedule) => {
        switch (schedule) {
            case "May 10 - 31":
                return "2025-05-10";
            case "June 14 - July 5":
                return "2025-06-14";
            case "July 19 - Aug 9":
                return "2025-07-19";
            default:
                return null;
        }
    };

    const startDateStr = convertSetScheduleToStartDate(formData.setSchedule);
    if (startDateStr) {
        const appointments = [];
        const startDate = new Date(startDateStr);

        for (let i = 0; i < 4; i++) {
            const classDate = new Date(startDate);
            classDate.setDate(startDate.getDate() + i * 7); // add 7 days for each week

            const dateISO = classDate.toISOString().split("T")[0];
            appointments.push({
                title: "Bartending Course (3 hours)",
                client_name: formData.fullName,
                client_email: formData.email,
                date: dateISO,
                time: "11:00:00",
                end_time: "14:00:00",
                description: `Student enrolled in course: ${formData.setSchedule} (Week ${i + 1})`,
                isAdmin: true,
            });
        }

        // Post each appointment one by one
        for (const appt of appointments) {
            await fetch(`${apiUrl}/appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(appt),
            });
        }
    }
} catch (error) {
    console.error("❌ Error creating recurring appointments:", error);
}


    // ✅ Create payment link
    try {
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
        const { url: checkoutUrl } = paymentData;

        if (checkoutUrl) {
            window.location.href = checkoutUrl;
        } else {
            console.error("❌ No checkout URL returned");
        }
    } catch (error) {
        console.error("❌ Error creating payment link:", error);
    }
};


    const getPaymentInfo = () => {
        if (formData.paymentPlan === "Yes") {
            return "$100 to Register. Then $70 per week ($450 total)";
        } else if (formData.paymentPlan === "No") {
            return "$400 full payment";
        } else {
            return "N/A";
        }
    };

    return (
        <div className="form-container">
            <h2>Bartending Course Inquiry</h2>
            <form>
                {/* All your fields */}
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
                {formData.referral === "Friend" && (
                    <label>
                        If referred by a friend, please tell us who!
                        <input type="text" name="referralDetails" value={formData.referralDetails} onChange={handleInputChange} required />
                    </label>
                )}
                {formData.referral === "Other" && (
                    <label>
                        If other, please elaborate, else N/A *
                        <textarea name="referralDetails" value={formData.referralDetails} onChange={handleInputChange} required />
                    </label>
                )}
                <button type="button" onClick={() => setShowModal(true)}>Submit</button>
            </form>

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Confirm Your Booking</h2>
                        <p><strong>Name:</strong> {formData.fullName}</p>
                        <p><strong>Class Schedule:</strong> {formData.setSchedule}</p>
                        <p><strong>Payment:</strong> {getPaymentInfo()}</p>
                        <p><strong>Estimated Total:</strong> (subject to small processing fees)</p>
                        <div className="modal-actions">
                            <button className="modal-button use" onClick={() => {
                                setConfirmedSubmit(true);
                                setShowModal(false);
                                setTimeout(() => handleSubmit(), 0);
                            }}>Yes, Continue</button>
                            <button className="modal-button cancel" onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <ChatBox />
        </div>
    );
};

export default BartendingCourse;