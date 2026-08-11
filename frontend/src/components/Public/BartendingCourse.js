import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../App.css";
import ChatBox from "./ChatBox";
import axios from "axios";
import { addDays, format, startOfWeek, nextSaturday } from "date-fns";

const COURSE_CONFIG = {
  "READY-24": {
    code: "READY-24",
    name: "The Ready Bar Course",
    appointmentType: "Bartending Course",
    hours: 24,
    price: 500,
    curriculumVersion: "FL-RAS-2026.1",
    allowAddons: true,
    multiSession: true,
    description:
      "Complete 24-hour bartending training with hands-on skills, mixology, responsible alcohol service, and practical testing.",
    passingText: "Written + practical exam requirements apply.",
  },

  RAS: {
    code: "RAS",
    name: "Responsible Alcohol Service",
    appointmentType: "Training Course - 3 Hours",
    hours: 3,
    price: 50,
    curriculumVersion: "FL-RAS-2026.1",
    allowAddons: false,
    multiSession: false,
    description:
      "Focused responsible alcohol service training for bartenders, servers, and hospitality professionals.",
    passingText: "80% minimum written assessment score.",
  },

  "RAS-MGR": {
    code: "RAS-MGR",
    name: "Responsible Vendor Manager Training",
    appointmentType: "Training Course - 3 Hours",
    hours: 3,
    price: 75,
    curriculumVersion: "FL-RVM-2026.1",
    allowAddons: false,
    multiSession: false,
    description:
      "Manager-level responsible vendor training covering supervision, policies, documentation, and compliance responsibilities.",
    passingText: "80% minimum written assessment score.",
  },
};

const BOOKING_CUTOFF_HOURS = 12;

const BartendingCourse = () => {
  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [searchParams] = useSearchParams();
  const requestedCourse = searchParams.get("course") || "";

  const initialCourseCode = COURSE_CONFIG[requestedCourse]
    ? requestedCourse
    : "";

  const [formData, setFormData] = useState({
    courseCode: initialCourseCode,
    fullName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    isAdult: "",
    experience: "",
    setSchedule: "",
    preferredTime: "",
    selectedDate: "",
    selectedStartTime: "",
    selectedEndTime: "",
    referral: "",
    referralDetails: "",
    addons: [],
  });

  const [showModal, setShowModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const addonPrices = {
    "Supreme Kit": 50,
  };

  const selectedCourse = useMemo(
    () => COURSE_CONFIG[formData.courseCode] || null,
    [formData.courseCode]
  );

  useEffect(() => {
    if (!requestedCourse || !COURSE_CONFIG[requestedCourse]) return;

    setFormData((prev) => ({
      ...prev,
      courseCode: requestedCourse,
      preferredTime: "",
      setSchedule: "",
      selectedDate: "",
      selectedStartTime: "",
      selectedEndTime: "",
      addons:
        requestedCourse === "READY-24" ? prev.addons : [],
    }));

    setAvailableSlots([]);
  }, [requestedCourse]);

  const getAddonTotal = () => {
    if (!selectedCourse?.allowAddons) return 0;

    return (formData.addons || []).reduce(
      (total, addon) =>
        total +
        Number(addon.price || 0) *
          Number(addon.quantity || 1),
      0
    );
  };

  const getTotal = () =>
    Number(selectedCourse?.price || 0) + getAddonTotal();

  const getPreferredTimeLabel = (value) => {
    if (value === "WEEKDAYS_DAY") {
      return "Weekdays 12:00pm - 3:00pm";
    }

    if (value === "WEEKDAYS_EVENING") {
      return "Weekdays 6:00pm - 9:00pm";
    }

    if (value === "WEEKENDS") {
      return "Saturdays 12:00pm - 6:30pm";
    }

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

  const formatTime = (time) => {
    if (!time) return "";

    const [hours, minutes] = String(time).split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes || 0), 0, 0);

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const isWithinBookingCutoff = (date, startTime) => {
    if (!date || !startTime) return true;

    const appointmentDateTime = new Date(
      `${date}T${String(startTime).slice(0, 8)}`
    );

    if (Number.isNaN(appointmentDateTime.getTime())) {
      return false;
    }

    const cutoffTime = addDays(
      new Date(),
      BOOKING_CUTOFF_HOURS / 24
    );

    return appointmentDateTime > cutoffTime;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "courseCode") {
        next.preferredTime = "";
        next.setSchedule = "";
        next.selectedDate = "";
        next.selectedStartTime = "";
        next.selectedEndTime = "";

        if (value !== "READY-24") {
          next.addons = [];
        }

        setAvailableSlots([]);
      }

      if (name === "preferredTime") {
        next.setSchedule = "";
      }

      if (name === "selectedDate") {
        next.selectedStartTime = "";
        next.selectedEndTime = "";
      }

      return next;
    });
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
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const generateClassCycles = (preferredTime) => {
    const cycles = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
      let start;
      let end;

      if (
        preferredTime === "WEEKDAYS_DAY" ||
        preferredTime === "WEEKDAYS_EVENING"
      ) {
        start = startOfWeek(addDays(today, i * 14), {
          weekStartsOn: 1,
        });

        end = addDays(start, 13);
      } else if (preferredTime === "WEEKENDS") {
        start = nextSaturday(addDays(today, i * 56));
        end = addDays(start, 49);
      } else {
        return [];
      }

      cycles.push(
        `${format(start, "MMM d")} - ${format(
          end,
          "MMM d"
        )}`
      );
    }

    return cycles;
  };

  const fetchAvailability = useCallback(async () => {
    if (
      !formData.selectedDate ||
      !selectedCourse ||
      selectedCourse.multiSession
    ) {
      setAvailableSlots([]);
      return;
    }

    const selectedDateObj = new Date(
      `${formData.selectedDate}T12:00:00`
    );

    if (Number.isNaN(selectedDateObj.getTime())) {
      setAvailableSlots([]);
      return;
    }

    const weekday = selectedDateObj.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

    setLoadingAvailability(true);

    try {
      const response = await axios.get(
        `${apiUrl}/availability`,
        {
          params: {
            weekday,
            appointmentType:
              selectedCourse.appointmentType,
            date: formData.selectedDate,
          },
        }
      );

      const rawSlots = Array.isArray(response.data)
        ? response.data
        : [];

      const filteredSlots = rawSlots.filter((slot) =>
        isWithinBookingCutoff(
          formData.selectedDate,
          slot.start_time
        )
      );

      setAvailableSlots(filteredSlots);
    } catch (error) {
      console.error(
        "❌ Error fetching course availability:",
        error
      );

      setAvailableSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [
    apiUrl,
    formData.selectedDate,
    selectedCourse,
  ]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleSlotChange = (e) => {
    const startTime = e.target.value;

    const slot = availableSlots.find(
      (item) => item.start_time === startTime
    );

    setFormData((prev) => ({
      ...prev,
      selectedStartTime: startTime,
      selectedEndTime: slot?.end_time || "",
    }));
  };

  const validateBeforeConfirm = () => {
    if (!selectedCourse) {
      alert("Please select a course.");
      return false;
    }

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.confirmEmail ||
      !formData.phone ||
      !formData.isAdult ||
      !formData.experience ||
      !formData.referral
    ) {
      alert("Please complete all required fields.");
      return false;
    }

    if (formData.email !== formData.confirmEmail) {
      alert("Please make sure both email fields match.");
      return false;
    }

    if (selectedCourse.multiSession) {
      if (!formData.preferredTime || !formData.setSchedule) {
        alert("Please select a valid class schedule.");
        return false;
      }
    } else {
      if (
        !formData.selectedDate ||
        !formData.selectedStartTime ||
        !formData.selectedEndTime
      ) {
        alert(
          "Please select an available date and time."
        );
        return false;
      }

      if (
        !isWithinBookingCutoff(
          formData.selectedDate,
          formData.selectedStartTime
        )
      ) {
        alert(
          "This course must be booked at least 24 hours in advance."
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateBeforeConfirm()) return;

    const cycleStartDate = selectedCourse.multiSession
      ? getCycleStartDate()
      : formData.selectedDate;

    const scheduleLabel = selectedCourse.multiSession
      ? formData.setSchedule
      : `${formData.selectedDate} ${formatTime(
          formData.selectedStartTime
        )}`;

    const preferredTimeLabel =
      selectedCourse.multiSession
        ? getPreferredTimeLabel(formData.preferredTime)
        : `${formatTime(
            formData.selectedStartTime
          )} - ${formatTime(formData.selectedEndTime)}`;

    const coursePayload = {
      ...formData,
      courseCode: selectedCourse.code,
      courseName: selectedCourse.name,
      courseHours: selectedCourse.hours,
      curriculumVersion:
        selectedCourse.curriculumVersion,

      setSchedule: scheduleLabel,
      preferredTime: selectedCourse.multiSession
        ? formData.preferredTime
        : preferredTimeLabel,

      preferredTimeLabel,
      courseTrack: selectedCourse.multiSession
        ? formData.preferredTime
        : "WEEKLY_AVAILABILITY",

      cycleStart: cycleStartDate,
      cycleLabel: scheduleLabel,

      addons: selectedCourse.allowAddons
        ? formData.addons
        : [],
    };

    try {
      const inquiryResponse = await fetch(
        `${apiUrl}/api/bartending-course`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(coursePayload),
        }
      );

      const inquiryData = await inquiryResponse
        .json()
        .catch(() => ({}));

      if (!inquiryResponse.ok) {
        throw new Error(
          inquiryData?.error ||
            "The course inquiry could not be submitted."
        );
      }

      alert(
        "✅ Your form was successfully submitted! Redirecting to payment... DO NOT NAVIGATE AWAY"
      );
    } catch (error) {
      console.error(
        "❌ Error submitting inquiry:",
        error
      );

      alert(
        error?.message ||
          "The course inquiry could not be submitted."
      );

      return;
    }

    localStorage.setItem(
      "pendingBartendingCourse",
      JSON.stringify(coursePayload)
    );

    try {
      const amount = getTotal();

      const itemName =
        selectedCourse.code === "READY-24"
          ? "Ready Bar Course Full Payment"
          : `${selectedCourse.name} Full Payment`;

      const appointmentData = {
        title: selectedCourse.appointmentType,

        date: cycleStartDate,
        cycleStart: cycleStartDate,
        cycleLabel: scheduleLabel,
        setSchedule: scheduleLabel,

        time: selectedCourse.multiSession
          ? formData.preferredTime ===
            "WEEKDAYS_EVENING"
            ? "18:00:00"
            : "12:00:00"
          : formData.selectedStartTime,

        end_time: selectedCourse.multiSession
          ? formData.preferredTime ===
            "WEEKDAYS_EVENING"
            ? "21:00:00"
            : formData.preferredTime ===
              "WEEKENDS"
            ? "18:30:00"
            : "15:00:00"
          : formData.selectedEndTime,

        fullName: formData.fullName,
        client_name: formData.fullName,
        client_email: formData.email,
        client_phone: formData.phone,
        phone: formData.phone,

        course: true,
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
        courseHours: selectedCourse.hours,
        curriculumVersion:
          selectedCourse.curriculumVersion,

        preferredTime: selectedCourse.multiSession
          ? formData.preferredTime
          : preferredTimeLabel,

        preferredTimeLabel,

        courseTrack: selectedCourse.multiSession
          ? formData.preferredTime
          : "WEEKLY_AVAILABILITY",

        addons: selectedCourse.allowAddons
          ? formData.addons
          : [],

        source: "bartending-course",
        price: amount,
      };

      localStorage.setItem(
        "pendingAppointment",
        JSON.stringify(appointmentData)
      );

      const paymentLinkResponse = await fetch(
  `${apiUrl}/api/create-payment-link`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      email: formData.email,
      itemName,
      appointmentData,
    }),
  }
);

const paymentData = await paymentLinkResponse
  .json()
  .catch(() => ({}));

if (!paymentLinkResponse.ok) {
  alert(
    paymentData?.error ||
      "Payment could not be started. Please try again."
  );
  return;
}

const checkoutUrl =
  paymentData?.paymentLinkUrl ||
  paymentData?.url;

if (checkoutUrl) {
  window.location.href = checkoutUrl;
} else {
  alert(
    "Payment link could not be created. Please try again."
  );
}

    } catch (error) {
      console.error(
        "❌ Error creating payment link:",
        error
      );

      alert(
        error?.message ||
          "Payment link could not be created. Please try again."
      );
    }
  };

  const getPaymentInfo = () => {
    if (!selectedCourse) return "Select a course";

    return `$${selectedCourse.price} full payment`;
  };

  return (
    <div className="form-container">
      <h2>Training Course Enrollment</h2>

      <form>
        <label>
          Which course would you like to enroll in? *
          <select
            name="courseCode"
            value={formData.courseCode}
            onChange={handleInputChange}
            required
          >
            <option value="">Select a Course</option>

            <option value="READY-24">
              Complete Ready Bar Course - 24 Hours
            </option>

            <option value="RAS">
              Responsible Alcohol Service - 3 Hours
            </option>

            <option value="RAS-MGR">
              Responsible Vendor Manager Training - 3 Hours
            </option>
          </select>
        </label>

        {selectedCourse && (
          <div
            style={{
              margin: "12px 0 20px",
              padding: 14,
              border:
                "1px solid rgba(255, 215, 0, 0.45)",
              borderRadius: 8,
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {selectedCourse.name}
            </h3>

            <p>{selectedCourse.description}</p>

            <p>
              <strong>Course Length:</strong>{" "}
              {selectedCourse.hours} Hours
            </p>

            <p>
              <strong>Course Price:</strong> $
              {selectedCourse.price}
            </p>

            <p>
              <strong>Passing Requirement:</strong>{" "}
              {selectedCourse.passingText}
            </p>

            <p>
              <strong>Curriculum:</strong>{" "}
              {selectedCourse.curriculumVersion}
            </p>

            {!selectedCourse.multiSession && (
              <p>
                <strong>Booking Notice:</strong>{" "}
                Must be booked at least 24 hours in advance.
              </p>
            )}
          </div>
        )}

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

        {formData.confirmEmail &&
          formData.email !==
            formData.confirmEmail && (
            <p
              style={{
                color: "red",
                fontSize: 13,
              }}
            >
              Emails do not match
            </p>
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

        {selectedCourse?.multiSession ? (
          <>
            <label>
              Preferred Class Days *
              <select
                name="preferredTime"
                value={
                  formData.preferredTime || ""
                }
                onChange={handleInputChange}
                required
              >
                <option value="">
                  Select
                </option>

                <option value="WEEKDAYS_DAY">
                  Weekdays 12:00pm - 3:00pm
                </option>

                <option value="WEEKDAYS_EVENING">
                  Weekdays 6:00pm - 9:00pm
                </option>

                <option value="WEEKENDS">
                  Saturdays 12:00pm - 6:30pm
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
                disabled={
                  !formData.preferredTime
                }
              >
                <option value="">
                  {formData.preferredTime
                    ? "Select"
                    : "Select class days first"}
                </option>

                {generateClassCycles(
                  formData.preferredTime
                ).map((cycle, idx) => (
                  <option
                    key={idx}
                    value={cycle}
                  >
                    {cycle}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : selectedCourse ? (
          <>
            <label>
              Select Training Date *
              <input
                type="date"
                name="selectedDate"
                value={formData.selectedDate}
                onChange={handleInputChange}
                min={format(
                  addDays(new Date(), 1),
                  "yyyy-MM-dd"
                )}
                required
              />
            </label>

            <label>
              Available Time *
              <select
                name="selectedStartTime"
                value={
                  formData.selectedStartTime
                }
                onChange={handleSlotChange}
                required
                disabled={
                  !formData.selectedDate ||
                  loadingAvailability
                }
              >
                <option value="">
                  {!formData.selectedDate
                    ? "Select a date first"
                    : loadingAvailability
                    ? "Loading availability..."
                    : availableSlots.length
                    ? "Select a time"
                    : "No available times"}
                </option>

                {availableSlots.map((slot) => (
                  <option
                    key={`${slot.start_time}-${slot.end_time}`}
                    value={slot.start_time}
                  >
                    {formatTime(
                      slot.start_time
                    )}{" "}
                    -{" "}
                    {formatTime(slot.end_time)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {selectedCourse?.allowAddons && (
          <>
            <br />

            <label>
              Would you like to add the Supreme Kit? (Optional)
            </label>

            {Object.keys(
              addonPrices
            ).map((addon) => (
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
                  checked={formData.addons.some(
                    (a) => a.name === addon
                  )}
                  onChange={(e) => {
                    const { checked } = e.target;

                    setFormData(
                      (prev) => {
                        const updatedAddons =
                          checked
                            ? [
                                ...prev.addons,
                                {
                                  name: addon,
                                  price:
                                    addonPrices[
                                      addon
                                    ],
                                  quantity: 1,
                                },
                              ]
                            : prev.addons.filter(
                                (a) =>
                                  a.name !==
                                  addon
                              );

                        return {
                          ...prev,
                          addons:
                            updatedAddons,
                        };
                      }
                    );
                  }}
                />

                <label
                  htmlFor={addon}
                  style={{
                    marginLeft: "8px",
                  }}
                >
                  {addon} (+$
                  {addonPrices[addon]})
                </label>
              </div>
            ))}
          </>
        )}

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

            <option value="Friend">
              Referred by a Friend
            </option>

            <option value="Advertisement">
              Advertisement
            </option>

            <option value="Instagram">
              Instagram
            </option>

            <option value="TikTok">
              Tik Tok
            </option>

            <option value="Google">
              Google
            </option>

            <option value="Other">
              Other
            </option>
          </select>
        </label>

        {formData.referral ===
          "Friend" && (
          <label>
            If referred by a friend, please tell us who!
            <input
              type="text"
              name="referralDetails"
              value={
                formData.referralDetails
              }
              onChange={handleInputChange}
              required
            />
          </label>
        )}

        {formData.referral ===
          "Other" && (
          <label>
            If other, please elaborate, else N/A *
            <textarea
              name="referralDetails"
              value={
                formData.referralDetails
              }
              onChange={handleInputChange}
              required
            />
          </label>
        )}

        <button
          type="button"
          onClick={() => {
            if (!validateBeforeConfirm()) {
              return;
            }

            setShowModal(true);
          }}
        >
          Submit
        </button>
      </form>

      {showModal &&
        selectedCourse && (
          <div className="modal">
            <div className="modal-content">
              <h2>
                Confirm Your Booking
              </h2>

              <p>
                <strong>
                  Course:
                </strong>{" "}
                {selectedCourse.name}
              </p>

              <p>
                <strong>
                  Name:
                </strong>{" "}
                {formData.fullName}
              </p>

              {selectedCourse.multiSession ? (
                <>
                  <p>
                    <strong>
                      Class Schedule:
                    </strong>{" "}
                    {
                      formData.setSchedule
                    }
                  </p>

                  <p>
                    <strong>
                      Preferred Class Days:
                    </strong>{" "}
                    {getPreferredTimeLabel(
                      formData.preferredTime
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>
                      Training Date:
                    </strong>{" "}
                    {
                      formData.selectedDate
                    }
                  </p>

                  <p>
                    <strong>
                      Training Time:
                    </strong>{" "}
                    {formatTime(
                      formData.selectedStartTime
                    )}{" "}
                    -{" "}
                    {formatTime(
                      formData.selectedEndTime
                    )}
                  </p>
                </>
              )}

              <p>
                <strong>
                  Payment:
                </strong>{" "}
                {getPaymentInfo()}
              </p>

              {selectedCourse.allowAddons &&
                formData.addons
                  .length > 0 && (
                  <>
                    <p>
                      <strong>
                        Add-ons:
                      </strong>
                    </p>

                    <ul>
                      {formData.addons.map(
                        (
                          addon,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                          >
                            {
                              addon.name
                            }
                          </li>
                        )
                      )}
                    </ul>

                    <p>
                      <strong>
                        Add-on Total:
                      </strong>{" "}
                      $
                      {getAddonTotal()}
                    </p>
                  </>
                )}

              <p>
                <strong>
                  Estimated Total:
                </strong>{" "}
                ${getTotal()}{" "}
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
                  onClick={() =>
                    setShowModal(false)
                  }
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
