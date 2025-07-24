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
        preferredTime: "",
        paymentMethod: "",
        paymentPlan: "Full",
        referral: "",
        referralDetails: "",
    });

    const [showModal, setShowModal] = useState(false);

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
            await fetch(`${apiUrl}/api/bartending-course`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            alert("✅ Your form was successfully submitted! Redirecting to payment...");
        } catch (error) {
            console.error("❌ Error submitting inquiry:", error);
            return;
        }

        localStorage.setItem("pendingBartendingCourse", JSON.stringify(formData));

        try {
            const isPaymentPlan = formData.paymentPlan === "Payment Plan";
            const amount = isPaymentPlan ? 100 : 400;
            const itemName = isPaymentPlan
                ? "Bartending Course Deposit"
                : "Bartending Course Full Payment";

            const paymentLinkResponse = await fetch(`${apiUrl}/api/create-payment-link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    email: formData.email,
                    itemName,
                    paymentPlan: formData.paymentPlan
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
        return formData.paymentPlan === "Payment Plan"
            ? "$100 deposit, balance split across classes"
            : "$400 full payment";
    };

    return (
        <div className="form-container">
            <h2>Bartending Course Inquiry</h2>
            <form>
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
                    Which upcoming class cycle would you like to enroll? *
                    <select name="setSchedule" value={formData.setSchedule} onChange={handleInputChange} required>
                        <option value="">Select</option>
                        <option value="Aug 23 - Sep 13">Aug 23 - Sep 13</option>
                        <option value="Sep 27 - Oct 18">Sep 27 - Oct 18</option>
                        <option value="Nov 1 - Nov 22">Nov 1 - Nov 22</option>
                    </select>
                </label>
                <label>
                    Preferred Class Days *
                    <select
                        name="preferredTime"
                        value={formData.preferredTime || ""}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="Weekdays 6:00pm - 9:00pm">Weekdays 6:00pm - 9:00pm</option>
                        <option value="Saturdays 11:00am - 2:00pm">Saturdays 11:00am - 2:00pm</option>
                    </select>
                </label>
                <label>
                    Payment Option *
                    <select name="paymentPlan" value={formData.paymentPlan} onChange={handleInputChange} required>
                        <option value="Full">Full Payment ($400)</option>
                        <option value="Payment Plan">Payment Plan ($100 deposit)</option>
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
                        <p><strong>Preferred Class Days:</strong> {formData.preferredTime}</p>
                        <p><strong>Payment:</strong> {getPaymentInfo()}</p>
                        <p><strong>Estimated Total:</strong> (subject to small processing fees)</p>
                        <div className="modal-actions">
                            <button className="modal-button use" onClick={() => {
                                setShowModal(false);
                                handleSubmit();
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
