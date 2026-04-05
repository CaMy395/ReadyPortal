import React, { useState } from "react";
import "../../App.css";
import ChatBox from "./ChatBox";
import { addDays, format, startOfWeek, nextSaturday } from "date-fns";

const BartendingCourse = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    isAdult: "",
    experience: "",
    setSchedule: "",
    preferredTime: "",
    referral: "",
    referralDetails: "",
    addons: [],
  });

  const [showModal, setShowModal] = useState(false);

  const addonPrices = {
    "Supreme Kit": 50,
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

    localStorage.setItem("pendingBartendingCourse", JSON.stringify(formData));

    try {
      const amount = 500 + getAddonTotal();
      const itemName = "Bartending Course Full Payment";

      const paymentLinkResponse = await fetch(`${apiUrl}/api/create-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          email: formData.email,
          itemName,
          course: true,
          fullName: formData.fullName,
          phone: formData.phone,
          setSchedule: formData.setSchedule,
          preferredTime: formData.preferredTime,
          addons: formData.addons,
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
    return "$500 full payment";
  };

  const generateClassCycles = (preferredTime) => {
    const cycles = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
      let start, end;

      if (preferredTime.includes("Weekdays")) {
        start = startOfWeek(addDays(today, i * 14), { weekStartsOn: 1 });
        end = addDays(start, 13);
      } else if (preferredTime.includes("Saturdays")) {
        start = nextSaturday(addDays(today, i * 56));
        end = addDays(start, 49);
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
          Confirm Email*:
          <input
            type="email"
            name="confirmEmail"
            value={formData.confirmEmail}
            onChange={handleChange}
            required
          />
        </label>

        {formData.confirmEmail && formData.email !== formData.confirmEmail && (
          <p style={{ color: "red", fontSize: 13 }}>Emails do not match</p>
        )}

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
          <select
            name="isAdult"
            value={formData.isAdult}
            onChange={handleInputChange}
            required
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <label>
          Do you have any experience? *
          <select
            name="experience"
            value={formData.experience}
            onChange={handleInputChange}
            required
          >
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
            <option value="Weekdays 6:00pm - 9:00pm">
              Weekdays 6:00pm - 9:00pm
            </option>
            <option value="Saturdays 11:00am - 2:00pm">
              Saturdays 11:00am - 2:00pm
            </option>
          </select>
        </label>

        <label>
          Which upcoming class cycle would you like to enroll? *
          <select
            name="setSchedule"
            value={formData.setSchedule}
            onChange={handleInputChange}
            required
          >
            <option value="">Select</option>
            {generateClassCycles(formData.preferredTime).map((cycle, idx) => (
              <option key={idx} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>
        </label>

        <br />

        <label>Would you like to add the Supreme Kit? (Optional)</label>
        {Object.keys(addonPrices).map((addon) => (
          <div
            key={addon}
            style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
          >
            <input
              type="checkbox"
              id={addon}
              value={addon}
              onChange={(e) => {
                const { checked } = e.target;
                setFormData((prev) => {
                  const updatedAddons = checked
                    ? [
                        ...prev.addons,
                        { name: addon, price: addonPrices[addon], quantity: 1 },
                      ]
                    : prev.addons.filter((a) => a.name !== addon);

                  return { ...prev, addons: updatedAddons };
                });
              }}
            />
            <label htmlFor={addon} style={{ marginLeft: "8px" }}>
              {addon} (+${addonPrices[addon]})
            </label>
          </div>
        ))}

        <br />

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

        {formData.referral === "Friend" && (
          <label>
            If referred by a friend, please tell us who!
            <input
              type="text"
              name="referralDetails"
              value={formData.referralDetails}
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
              value={formData.referralDetails}
              onChange={handleInputChange}
              required
            />
          </label>
        )}

        <button type="button" onClick={() => setShowModal(true)}>
          Submit
        </button>
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
                    <li key={index}>{addon.name}</li>
                  ))}
                </ul>
                <p><strong>Add-on Total:</strong> ${getAddonTotal()}</p>
              </>
            )}

            <p>
              <strong>Estimated Total:</strong> ${500 + getAddonTotal()} (subject to small processing fees)
            </p>

            <div className="modal-actions">
              <button
                className="modal-button use"
                onClick={() => {
                  setShowModal(false);
                  handleSubmit();
                }}
              >
                Yes, Continue
              </button>
              <button
                className="modal-button cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatBox />
    </div>
  );
};

export default BartendingCourse;