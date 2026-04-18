import React, { useEffect, useState } from "react";

const STORAGE_KEY = "hidden_rental-inquiries";

const RentalInquirySection = ({ rentalInquiries }) => {
  const [hiddenIds, setHiddenIds] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  const toggleShowHidden = () => setShowHidden((prev) => !prev);

  const handleRemove = (id) => {
    setHiddenIds((prev) => [...new Set([...prev, id])]);
  };

  const handleRestore = (id) => {
    setHiddenIds((prev) => prev.filter((hiddenId) => hiddenId !== id));
  };

  const visibleForms = (rentalInquiries || []).filter(
    (form) => showHidden || !hiddenIds.includes(form.id)
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US");
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US");
  };

  const renderSelectedItems = (form) => {
    if (Array.isArray(form.selected_items) && form.selected_items.length > 0) {
      return form.selected_items.join(", ");
    }

    if (typeof form.selected_items === "string") {
      try {
        const parsed = JSON.parse(form.selected_items);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.join(", ");
        }
      } catch (e) {}
    }

    if (Array.isArray(form.additional_items) && form.additional_items.length > 0) {
      return [
        form.primary_item,
        ...form.additional_items.filter(Boolean),
      ]
        .filter(Boolean)
        .join(", ");
    }

    if (typeof form.additional_items === "string") {
      try {
        const parsed = JSON.parse(form.additional_items);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [form.primary_item, ...parsed.filter(Boolean)]
            .filter(Boolean)
            .join(", ");
        }
      } catch (e) {}
    }

    return form.primary_item || "N/A";
  };

  return (
    <div className="table-scroll-container">
      <h2>Rental Inquiry Forms</h2>

      <button
        onClick={toggleShowHidden}
        style={{ margin: "10px 0", padding: "5px 10px" }}
      >
        {showHidden ? "Hide Removed" : "Show Hidden"}
      </button>

      {visibleForms.length > 0 ? (
        <table className="intake-forms-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Selected Items</th>
              <th>Event Date</th>
              <th>Event Time</th>
              <th>Guest Count</th>
              <th>Event Location</th>
              <th>Notes</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleForms.map((form) => (
              <tr
                key={form.id}
                style={hiddenIds.includes(form.id) ? { opacity: 0.5 } : {}}
              >
                <td>{form.full_name}</td>
                <td>{form.email || "N/A"}</td>
                <td>{form.phone || "N/A"}</td>
                <td>{renderSelectedItems(form)}</td>
                <td>{formatDate(form.event_date)}</td>
                <td>
                {form.event_time
                    ? new Date(`1970-01-01T${form.event_time}`).toLocaleTimeString(
                        "en-US",
                        {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        }
                    )
                    : "N/A"}
                </td>
                <td>{form.guest_count || "N/A"}</td>
                <td>{form.event_location || "N/A"}</td>
                <td>{form.message || "None"}</td>
                <td>{formatDateTime(form.created_at)}</td>
                <td>
                  {!hiddenIds.includes(form.id) ? (
                    <button
                      onClick={() => handleRemove(form.id)}
                      style={{
                        backgroundColor: "#8B0000",
                        color: "white",
                        padding: "5px 10px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  ) : (
                    showHidden && (
                      <button
                        onClick={() => handleRestore(form.id)}
                        style={{
                          backgroundColor: "green",
                          color: "white",
                          padding: "5px 10px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Restore
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No Rental Inquiry forms submitted yet.</p>
      )}
    </div>
  );
};

export default RentalInquirySection;