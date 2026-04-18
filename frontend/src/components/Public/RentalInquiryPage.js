import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "../../RB.css";
import useSitePageContent from "../../hooks/useSitePageContent";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return [...items]
    .filter((item) => item && item.is_active !== false)
    .sort((a, b) => {
      const aOrder =
        typeof a.sort_order === "number"
          ? a.sort_order
          : Number(a.sort_order) || 0;
      const bOrder =
        typeof b.sort_order === "number"
          ? b.sort_order
          : Number(b.sort_order) || 0;
      return aOrder - bOrder;
    });
}

export default function RentalInquiryPage() {
  const query = useQuery();
  const { loading, sectionsByKey } = useSitePageContent("rentals-products");

  const prefilledType = query.get("type") || "rental";
  const prefilledItem = query.get("item") || "";

  const rentalOptions = normalizeItems(
    sectionsByKey?.rentals_items?.content_json || []
  );

  const rentalNames = rentalOptions
    .map((item) => item?.name)
    .filter(Boolean);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    entityType: "",
    primaryItem: "",
    additionalItems: [],
    eventDate: "",
    eventTime: "",
    guestCount: "",
    eventLocation: "",
    message: "",
    sourcePage: "rentals-products",
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!prefilledItem) return;
    if (loading) return;

    setForm((prev) => {
      if (prev.primaryItem === prefilledItem) return prev;

      const matchedName =
        rentalNames.find(
          (name) =>
            String(name).trim().toLowerCase() ===
            String(prefilledItem).trim().toLowerCase()
        ) || prefilledItem;

      return {
        ...prev,
        inquiryType: prefilledType,
        primaryItem: matchedName,
      };
    });
  }, [prefilledItem, prefilledType, loading, rentalNames]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "primaryItem"
        ? {
            additionalItems: prev.additionalItems.filter(
              (item) => item !== value
            ),
          }
        : {}),
    }));
  }

  function handleAdditionalItemsChange(e) {
    const selectedValues = Array.from(e.target.selectedOptions).map(
      (option) => option.value
    );

    setForm((prev) => ({
      ...prev,
      additionalItems: selectedValues.filter(
        (item) => item && item !== prev.primaryItem
      ),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload = {
        ...form,
        selectedItems: [
          ...(form.primaryItem ? [form.primaryItem] : []),
          ...form.additionalItems.filter(
            (item) => item && item !== form.primaryItem
          ),
        ],
      };

      const res = await fetch(`${API_URL}/api/rental-inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry.");
      }

      setSuccessMsg("Thanks! Your inquiry was submitted.");

      setForm((prev) => ({
        ...prev,
        fullName: "",
        email: "",
        phone: "",
        entityType: "",
        eventDate: "",
        eventTime: "",
        guestCount: "",
        eventLocation: "",
        message: "",
        additionalItems: [],
      }));
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rb-inquiry-page">
        <div className="rb-inquiry-card">
          <h1>Loading inquiry form...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="rb-inquiry-page">
      <div className="rb-inquiry-card">
        <h1>Rental Inquiry</h1>

        <p className="rb-inquiry-subtext">
          Tell us what you’re interested in and we’ll follow up with pricing,
          availability, and next steps.
        </p>

        <form onSubmit={handleSubmit} className="rb-inquiry-form">
          <label>Entity Type</label>
          <select
          name="entityType"
          value={form.entityType}
          onChange={handleChange}
          >
          <option value="">Select one</option>
          <option value="Individual">Individual</option>
          <option value="Business">Business</option>
          </select>

          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />

          <label>Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />

          <label>Main Rental</label>
          <select
            name="primaryItem"
            value={form.primaryItem}
            onChange={handleChange}
          >
            <option value="">Select one</option>

            {rentalNames.map((itemName) => (
              <option key={itemName} value={itemName}>
                {itemName}
              </option>
            ))}
          </select>

          <label>Additional Rentals</label>
          <select
            multiple
            value={form.additionalItems}
            onChange={handleAdditionalItemsChange}
            className="rb-multi-select"
          >
            {rentalNames
              .filter((itemName) => itemName !== form.primaryItem)
              .map((itemName) => (
                <option key={itemName} value={itemName}>
                  {itemName}
                </option>
              ))}
          </select>

          <div className="rb-multi-help">
            Hold Ctrl or Command to select more than one.
          </div>

          <label>Event Date</label>
          <input
            type="date"
            name="eventDate"
            value={form.eventDate}
            onChange={handleChange}
          />

          <label>Event Time</label>
          <input
            type="time"
            name="eventTime"
            value={form.eventTime}
            onChange={handleChange}
          />

          <label>Guest Count</label>
          <input
            type="number"
            min="1"
            name="guestCount"
            value={form.guestCount}
            onChange={handleChange}
          />

          <label>Event Location</label>
          <input
            type="text"
            name="eventLocation"
            value={form.eventLocation}
            onChange={handleChange}
          />

          <label>Additional Notes</label>
          <textarea
            name="message"
            rows="5"
            value={form.message}
            onChange={handleChange}
            placeholder="Example: Also need setup, breakdown, staffing, or custom branding."
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Inquiry"}
          </button>

          {successMsg ? (
            <div className="rb-form-success">{successMsg}</div>
          ) : null}

          {errorMsg ? (
            <div className="rb-form-error">{errorMsg}</div>
          ) : null}
        </form>
      </div>
    </div>
  );
}