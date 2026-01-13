import React, { useState } from "react";
import "../../App.css";
import ChatBox from "./ChatBox";
import { useNavigate } from "react-router-dom";
import { addDays, format, startOfWeek, nextSaturday } from "date-fns";


const BartendingCourse = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        confirmEmail: "",
        phone: "",
        isAdult: "",
        experience: "",
        setSchedule: "",
        preferredTime: "",
        paymentMethod: "",
        paymentPlan: "Full",
        referral: "",
        referralDetails: "",
        addons: [],
    });

    const [showModal, setShowModal] = useState(false);

    const addonPrices = {
    "Supreme Kit": 50
    };

const getAddonTotal = () => {
  return (formData.addons || []).reduce(
    (total, addon) => total + addon.price * (addon.quantity || 1),
    0
  );
};

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

  // 1) Submit the course form (unchanged)
  try {
    await fetch(`${apiUrl}/api/bartending-course`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    alert("✅ Your form was successfully submitted! Redirecting to payment... DO NOT NAVIGATE AWAY");
  } catch (error) {
    console.error("❌ Error submitting inquiry:", error);
    return;
  }

  // Persist locally if you already do this
  localStorage.setItem("pendingBartendingCourse", JSON.stringify(formData));

  // 2) Payment routing
  try {
    const isPaymentPlan = formData.paymentPlan === "Payment Plan";

    if (isPaymentPlan) {
  const deposit = 100 + getAddonTotal();

  // 👇 Use the SAME shape you use in the full-payment flow
  const pendingAppointment = {
    title: "Bartending Course",
    client_name: formData.name,       // or whatever field you use
    client_email: formData.email,
    phone: formData.phone,
    courseFlag: true,                 // important so success page knows it's a course
    cycleStart: formData.cycleStart,  // or however you store the chosen cycle
    // include any other fields you normally use for course auto-scheduling
  };

  window.localStorage.setItem(
    "pendingAppointment",
    JSON.stringify(pendingAppointment)
  );

  const q = new URLSearchParams({
    email: formData.email,
    amount: String(deposit),
    itemName: "Bartending Course Deposit",
    title: "Bartending Course",
    course: "1", // optional but helps success page recognize this as a course flow
  });

  window.location.href = `/save-card?${q.toString()}`;
  return;
}


    // Full payment (unchanged): go build a Square Payment Link
    const amount = 400 + getAddonTotal(); // your full price + addons
    const itemName = "Bartending Course Full Payment";

    const paymentLinkResponse = await fetch(`${apiUrl}/api/create-payment-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        email: formData.email,
        itemName,
        paymentPlan: formData.paymentPlan,
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

    const generateClassCycles = (preferredTime) => {
    const cycles = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
    let start, end;

    if (preferredTime.includes("Weekdays")) {
        // Start on next Monday
        start = startOfWeek(addDays(today, i * 14), { weekStartsOn: 1 }); // 2-week gap between sessions
        end = addDays(start, 13); // 2 weeks = 14 days total, but end date is inclusive so 13
    } else if (preferredTime.includes("Saturdays")) {
        // Start on next Saturday
        start = nextSaturday(addDays(today, i * 56)); // 8-week spacing
        end = addDays(start, 49); // 8 weeks
    } else {
        return [];
    }

    const formatted = `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
    cycles.push(formatted);
    }


  return cycles;
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
  Confirm Email*:
  <input
    type="email"
    name="confirmEmail"
    value={formData.confirmEmail}
    onChange={handleChange}
    required
  />
</label>

{formData.confirmEmail &&
  formData.email !== formData.confirmEmail && (
    <p style={{ color: 'red', fontSize: 13 }}>
      Emails do not match
    </p>
)}

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
  Which upcoming class cycle would you like to enroll? *
  <select name="setSchedule" value={formData.setSchedule} onChange={handleInputChange} required>
    <option value="">Select</option>
    {generateClassCycles(formData.preferredTime).map((cycle, idx) => (
      <option key={idx} value={cycle}>
        {cycle}
      </option>
    ))}
  </select>
</label>

                <label>
                    Payment Option *
                    <select name="paymentPlan" value={formData.paymentPlan} onChange={handleInputChange} required>
                        <option value="Full">Full Payment ($400)</option>
                        <option value="Payment Plan">Payment Plan ($100 deposit)</option>
                    </select>
                </label>
                <br></br>
                <label>Would you like to add the Supreme Kit? (Optional)</label>
{Object.keys(addonPrices).map((addon) => (
  <div key={addon} style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
    <input
      type="checkbox"
      id={addon}
      value={addon}
      onChange={(e) => {
        const { checked } = e.target;
        setFormData((prev) => {
          let updatedAddons = checked
            ? [...prev.addons, { name: addon, price: addonPrices[addon], quantity: 1 }]
            : prev.addons.filter(a => a.name !== addon);
          return { ...prev, addons: updatedAddons };
        });
      }}
    />
    <label htmlFor={addon} style={{ marginLeft: "8px" }}>
      {addon} (+${addonPrices[addon]})
    </label>
  </div>
))}
                <br></br>

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

      {formData.addons.length > 0 && (
        <>
          <p><strong>Add-ons:</strong></p>
          <ul>
            {formData.addons.map((addon, index) => (
              <li key={index}>
                {addon.name}
              </li>
            ))}
          </ul>
          <p><strong>Add-on Total:</strong> ${getAddonTotal()}</p>
        </>
      )}

      <p><strong>Estimated Total:</strong> ${(formData.paymentPlan === "Payment Plan" ? 100 : 400) + getAddonTotal()} (subject to small processing fees)</p>

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
