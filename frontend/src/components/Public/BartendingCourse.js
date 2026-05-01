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

  const getPreferredTimeLabel = (value) => {
    if (value === "WEEKDAYS") return "Weekdays 6:00pm - 9:00pm";
    if (value === "WEEKENDS") return "Saturdays 11:00am - 2:00pm";
    return "";
  };

  const getCycleStartDate = () => {
    if (!formData.setSchedule) return "";

    const startText = formData.setSchedule.split(" - ")[0];
    const currentYear = new Date().getFullYear();
    const parsed = new Date(`${startText} ${currentYear}`);

    if (Number.isNaN(parsed.getTime())) return "";

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "preferredTime" ? { setSchedule: "" } : {}),
    }));
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

    if (!formData.email || formData.email !== formData.confirmEmail) {
      alert("Please make sure both email fields match.");
      return;
    }

    const cycleStartDate = getCycleStartDate();

    if (!cycleStartDate) {
      alert("Please select a valid class cycle.");
      return;
    }

    const coursePayload = {
      ...formData,
      preferredTimeLabel: getPreferredTimeLabel(formData.preferredTime),
      courseTrack: formData.preferredTime,
      cycleStart: cycleStartDate,
      cycleLabel: formData.setSchedule,
    };

    try {
      await fetch(`${apiUrl}/api/bartending-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coursePayload),
      });

      alert(
        "✅ Your form was successfully submitted! Redirecting to payment... DO NOT NAVIGATE AWAY"
      );
    } catch (error) {
      console.error("❌ Error submitting inquiry:", error);
      return;
    }

    localStorage.setItem(
      "pendingBartendingCourse",
      JSON.stringify(coursePayload)
    );

    try {
      const amount = 500 + getAddonTotal();
      const itemName = "Bartending Course Full Payment";

      const paymentLinkResponse = await fetch(
        `${apiUrl}/api/create-payment-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            email: formData.email,
            itemName,
            flow: "appointment",
            course: true,
            fullName: formData.fullName,
            phone: formData.phone,

            setSchedule: formData.setSchedule,
            cycleStart: cycleStartDate,
            cycleLabel: formData.setSchedule,

            preferredTime: formData.preferredTime,
            preferredTimeLabel: getPreferredTimeLabel(formData.preferredTime),
            courseTrack: formData.preferredTime,

            addons: formData.addons,

            appointmentData: {
              title: "Bartending Course",

              date: cycleStartDate,
              cycleStart: cycleStartDate,
              cycleLabel: formData.setSchedule,
              setSchedule: formData.setSchedule,

              time:
                formData.preferredTime === "WEEKENDS"
                  ? "11:00:00"
                  : "18:00:00",
              end_time:
                formData.preferredTime === "WEEKENDS"
                  ? "14:00:00"
                  : "21:00:00",

              fullName: formData.fullName,
              client_name: formData.fullName,
              client_email: formData.email,
              phone: formData.phone,

              preferredTime: formData.preferredTime,
              preferredTimeLabel: getPreferredTimeLabel(formData.preferredTime),
              courseTrack: formData.preferredTime,

              addons: formData.addons,
              source: "bartending-course",
            },
          }),
        }
      );

      const paymentData = await paymentLinkResponse.json();
      const { url: checkoutUrl } = paymentData;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        console.error("❌ No checkout URL returned", paymentData);
        alert("Payment link could not be created. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error creating payment link:", error);
      alert("Payment link could not be created. Please try again.");
    }
  };

  const getPaymentInfo = () => {
    return "$500 full payment";
  };

  const generateClassCycles = (preferredTime) => {
    const cycles = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
      let start;
      let end;

      if (preferredTime === "WEEKDAYS") {
        start = startOfWeek(addDays(today, i * 14), { weekStartsOn: 1 });
        end = addDays(start, 13);
      } else if (preferredTime === "WEEKENDS") {
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
            <option value="WEEKDAYS">Weekdays 6:00pm - 9:00pm</option>
            <option value="WEEKENDS">Saturdays 11:00am - 2:00pm</option>
          </select>
        </label>

        <label>
          Which upcoming class cycle would you like to enroll? *
          <select
            name="setSchedule"
            value={formData.setSchedule}
            onChange={handleInputChange}
            required
            disabled={!formData.preferredTime}
          >
            <option value="">
              {formData.preferredTime ? "Select" : "Select class days first"}
            </option>
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
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <input
              type="checkbox"
              id={addon}
              value={addon}
              checked={formData.addons.some((a) => a.name === addon)}
              onChange={(e) => {
                const { checked } = e.target;

                setFormData((prev) => {
                  const updatedAddons = checked
                    ? [
                        ...prev.addons,
                        {
                          name: addon,
                          price: addonPrices[addon],
                          quantity: 1,
                        },
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

            <p>
              <strong>Name:</strong> {formData.fullName}
            </p>

            <p>
              <strong>Class Schedule:</strong> {formData.setSchedule}
            </p>

            <p>
              <strong>Preferred Class Days:</strong>{" "}
              {getPreferredTimeLabel(formData.preferredTime)}
            </p>

            <p>
              <strong>Payment:</strong> {getPaymentInfo()}
            </p>

            {formData.addons.length > 0 && (
              <>
                <p>
                  <strong>Add-ons:</strong>
                </p>
                <ul>
                  {formData.addons.map((addon, index) => (
                    <li key={index}>{addon.name}</li>
                  ))}
                </ul>
                <p>
                  <strong>Add-on Total:</strong> ${getAddonTotal()}
                </p>
              </>
            )}

            <p>
              <strong>Estimated Total:</strong> ${500 + getAddonTotal()}{" "}
              (subject to small processing fees)
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