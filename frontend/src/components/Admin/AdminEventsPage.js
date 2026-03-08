import React, { useEffect, useMemo, useState } from "react";
import "../../App.css";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

const emptyEvent = {
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  location_name: "",
  address_line1: "",
  city: "",
  state: "FL",
  zip: "",
  event_date: "",
  image_url: "",
  flyer_url: "",
  video_url: "",
  status: "draft",
  is_featured: false,
};

const emptySession = {
  session_label: "",
  start_time: "",
  end_time: "",
  capacity: 20,
  status: "active",
};

const emptyTicket = {
  name: "",
  price: "",
  quantity_per_purchase: 1,
  is_active: true,
};

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

async function getJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);

  const [eventForm, setEventForm] = useState(emptyEvent);
  const [sessionForm, setSessionForm] = useState(emptySession);
  const [ticketForm, setTicketForm] = useState(emptyTicket);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingSessionForm, setEditingSessionForm] = useState(emptySession);
  const [savingSession, setSavingSession] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const selectedEvent = useMemo(() => {
    return events.find((e) => String(e.id) === String(selectedEventId)) || null;
  }, [events, selectedEventId]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const haystack = [
        event.title,
        event.slug,
        event.subtitle,
        event.location_name,
        event.city,
        event.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/admin/events`);
      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load events.");
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch admin events:", err);
      alert(err.message || "Failed to load events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEventDetails(eventId) {
    if (!eventId) {
      setSelectedEventDetails(null);
      return;
    }

    try {
      setDetailsLoading(true);
      const res = await fetch(`${apiUrl}/api/admin/events/${eventId}`);
      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load event details.");
      }

      setSelectedEventDetails(data);
    } catch (err) {
      console.error("Failed to fetch event details:", err);
      alert(err.message || "Failed to load event details.");
      setSelectedEventDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetails(selectedEventId);
    } else {
      setSelectedEventDetails(null);
    }
  }, [selectedEventId]);

  function handleEventField(field, value) {
    setEventForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "title" && (!prev.slug || prev.slug === slugify(prev.title))) {
        next.slug = slugify(value);
      }

      return next;
    });
  }

  function resetAllForms() {
    setEventForm(emptyEvent);
    setSessionForm(emptySession);
    setTicketForm(emptyTicket);
    setEditingSessionId("");
    setEditingSessionForm(emptySession);
  }

  function startCreateEvent() {
    setSelectedEventId("");
    setSelectedEventDetails(null);
    resetAllForms();
    setShowEventForm(true);
  }

  async function startEditEvent(eventId) {
    try {
      const res = await fetch(`${apiUrl}/api/admin/events/${eventId}`);
      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to load event.");
      }

      const ev = data?.event || {};

      setSelectedEventId(String(eventId));
      setSelectedEventDetails(data);
      setEventForm({
        title: ev.title || "",
        slug: ev.slug || "",
        subtitle: ev.subtitle || "",
        description: ev.description || "",
        location_name: ev.location_name || "",
        address_line1: ev.address_line1 || "",
        city: ev.city || "",
        state: ev.state || "FL",
        zip: ev.zip || "",
        event_date: ev.event_date ? String(ev.event_date).slice(0, 10) : "",
        image_url: ev.image_url || "",
        flyer_url: ev.flyer_url || "",
        video_url: ev.video_url || "",
        status: ev.status || "draft",
        is_featured: !!ev.is_featured,
      });
      setShowEventForm(true);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load event.");
    }
  }

  async function handleSaveEvent(e) {
    e.preventDefault();

    if (!eventForm.title.trim()) {
      alert("Title is required.");
      return;
    }

    if (!eventForm.event_date) {
      alert("Event date is required.");
      return;
    }

    if (!eventForm.slug.trim()) {
      alert("Slug is required.");
      return;
    }

    try {
      setSavingEvent(true);

      const isEditing = Boolean(selectedEventId);
      const url = isEditing
        ? `${apiUrl}/api/admin/events/${selectedEventId}`
        : `${apiUrl}/api/admin/events`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          slug: slugify(eventForm.slug),
        }),
      });

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to save event.");
      }

      const savedId = data?.id || data?.event?.id || selectedEventId || "";

      await fetchEvents();

      if (savedId) {
        setSelectedEventId(String(savedId));
        await fetchEventDetails(String(savedId));
      }

      alert(isEditing ? "Event updated." : "Event created.");
      setShowEventForm(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save event.");
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(id) {
    if (!window.confirm("Delete this event?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/admin/events/${id}`, {
        method: "DELETE",
      });

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete event.");
      }

      if (String(selectedEventId) === String(id)) {
        setSelectedEventId("");
        setSelectedEventDetails(null);
        resetAllForms();
        setShowEventForm(false);
      }

      await fetchEvents();
      alert("Event deleted.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete event.");
    }
  }

  async function handleQuickStatus(eventId, status) {
    try {
      const res = await fetch(`${apiUrl}/api/admin/events/${eventId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status.");
      }

      await fetchEvents();
      if (String(selectedEventId) === String(eventId)) {
        await fetchEventDetails(eventId);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update status.");
    }
  }

  async function handleMediaUpload(file, fieldName) {
    if (!file) return;

    try {
      setUploadingField(fieldName);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fieldName);

      const res = await fetch(`${apiUrl}/api/admin/events/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file.");
      }

      setEventForm((prev) => ({
        ...prev,
        [fieldName]: data.url || "",
      }));
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to upload file.");
    } finally {
      setUploadingField("");
    }
  }

  async function handleAddSession(e) {
    e.preventDefault();

    if (!selectedEventId) {
      alert("Select an event first.");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/admin/events/${selectedEventId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionForm),
      });

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to add session.");
      }

      alert("Session added.");
      setSessionForm(emptySession);
      await fetchEventDetails(selectedEventId);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add session.");
    }
  }

  function startEditSession(session) {
    setEditingSessionId(String(session.id));
    setEditingSessionForm({
      session_label: session.session_label || "",
      start_time: toDateTimeLocal(session.start_time),
      end_time: toDateTimeLocal(session.end_time),
      capacity: session.capacity ?? 20,
      status: session.status || "active",
    });
  }

  function cancelEditSession() {
    setEditingSessionId("");
    setEditingSessionForm(emptySession);
  }

  async function handleUpdateSession(sessionId) {
    if (!selectedEventId || !sessionId) return;

    try {
      setSavingSession(true);

      const res = await fetch(
        `${apiUrl}/api/admin/events/${selectedEventId}/sessions/${sessionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingSessionForm),
        }
      );

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to update session.");
      }

      alert("Session updated.");
      cancelEditSession();
      await fetchEventDetails(selectedEventId);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update session.");
    } finally {
      setSavingSession(false);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!selectedEventId) return;
    if (!window.confirm("Delete this session?")) return;

    try {
      const res = await fetch(
        `${apiUrl}/api/admin/events/${selectedEventId}/sessions/${sessionId}`,
        { method: "DELETE" }
      );

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete session.");
      }

      if (String(editingSessionId) === String(sessionId)) {
        cancelEditSession();
      }

      await fetchEventDetails(selectedEventId);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete session.");
    }
  }

  async function handleAddTicketType(e) {
    e.preventDefault();

    if (!selectedEventId) {
      alert("Select an event first.");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/admin/events/${selectedEventId}/ticket-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketForm),
      });

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to add ticket type.");
      }

      alert("Ticket type added.");
      setTicketForm(emptyTicket);
      await fetchEventDetails(selectedEventId);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add ticket type.");
    }
  }

  async function handleDeleteTicketType(ticketTypeId) {
    if (!selectedEventId) return;
    if (!window.confirm("Delete this ticket type?")) return;

    try {
      const res = await fetch(
        `${apiUrl}/api/admin/events/${selectedEventId}/ticket-types/${ticketTypeId}`,
        { method: "DELETE" }
      );

      const data = await getJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete ticket type.");
      }

      await fetchEventDetails(selectedEventId);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete ticket type.");
    }
  }

  return (
    <div className="page-container">
      <div
        className="flex-row-wrap"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Admin Events</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
            Create, edit, publish, upload media, manage sessions, and ticket types.
          </p>
        </div>

        <div
          className="flex-row-wrap"
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <button type="button" onClick={startCreateEvent}>
            + Create Event
          </button>
          <button type="button" onClick={fetchEvents}>
            Refresh
          </button>
        </div>
      </div>

      {showEventForm && (
        <div className="dashboard-card" style={{ padding: 20, marginBottom: 24 }}>
          <div
            className="flex-row-wrap"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>{selectedEventId ? "Edit Event" : "Create Event"}</h2>
            <button
              type="button"
              onClick={() => {
                setShowEventForm(false);
                if (!selectedEventId) {
                  resetAllForms();
                }
              }}
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSaveEvent} style={{ display: "grid", gap: 12 }}>
            <div className="form-grid-2" style={{ display: "grid", gap: 12 }}>
              <input
                placeholder="Title"
                value={eventForm.title}
                onChange={(e) => handleEventField("title", e.target.value)}
              />
              <input
                placeholder="Slug"
                value={eventForm.slug}
                onChange={(e) => handleEventField("slug", slugify(e.target.value))}
              />
            </div>

            <input
              placeholder="Subtitle"
              value={eventForm.subtitle}
              onChange={(e) => handleEventField("subtitle", e.target.value)}
            />

            <textarea
              placeholder="Description"
              rows={5}
              value={eventForm.description}
              onChange={(e) => handleEventField("description", e.target.value)}
            />

            <div className="form-grid-2" style={{ display: "grid", gap: 12 }}>
              <input
                placeholder="Location Name"
                value={eventForm.location_name}
                onChange={(e) => handleEventField("location_name", e.target.value)}
              />
              <input
                type="date"
                value={eventForm.event_date}
                onChange={(e) => handleEventField("event_date", e.target.value)}
              />
            </div>

            <input
              placeholder="Address Line 1"
              value={eventForm.address_line1}
              onChange={(e) => handleEventField("address_line1", e.target.value)}
            />

            <div
              className="form-grid-3"
              style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 12 }}
            >
              <input
                placeholder="City"
                value={eventForm.city}
                onChange={(e) => handleEventField("city", e.target.value)}
              />
              <input
                placeholder="State"
                value={eventForm.state}
                onChange={(e) => handleEventField("state", e.target.value)}
              />
              <input
                placeholder="Zip"
                value={eventForm.zip}
                onChange={(e) => handleEventField("zip", e.target.value)}
              />
            </div>

            <div className="dashboard-card" style={{ padding: 20, marginBottom: 24 }}>
              <h3 style={{ marginTop: 0 }}>Media Uploads</h3>

              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label className="admin-field-label">Event Image</label>
                  <input
                    className="admin-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMediaUpload(e.target.files?.[0], "image_url")}
                  />
                  {eventForm.image_url ? (
                    <img
                      src={eventForm.image_url}
                      alt="Event"
                      style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: 420,
                        objectFit: "contain",
                        borderRadius: 12,
                        background: "#f5f5f5",
                      }}
                    />
                  ) : null}
                </div>

                <div>
                  <label className="admin-field-label">Flyer</label>
                  <input
                    className="admin-file-input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleMediaUpload(e.target.files?.[0], "flyer_url")}
                  />
                  {eventForm.flyer_url &&
                  !String(eventForm.flyer_url).toLowerCase().endsWith(".pdf") ? (
                    <img
                      src={eventForm.flyer_url}
                      alt="Flyer"
                      style={{
                        marginTop: 10,
                        width: "100%",
                        maxHeight: 260,
                        objectFit: "contain",
                        borderRadius: 12,
                      }}
                    />
                  ) : eventForm.flyer_url ? (
                    <p style={{ marginTop: 10 }}>Flyer uploaded.</p>
                  ) : null}
                </div>

                <div>
                  <label className="admin-field-label">Promo Video</label>
                  <input
                    className="admin-file-input"
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleMediaUpload(e.target.files?.[0], "video_url")}
                  />
                  {eventForm.video_url ? (
                    <video
                      src={eventForm.video_url}
                      controls
                      style={{
                        marginTop: 10,
                        width: "100%",
                        maxHeight: 320,
                        borderRadius: 12,
                      }}
                    />
                  ) : null}
                </div>

                {uploadingField ? (
                  <p style={{ margin: 0 }}>Uploading {uploadingField.replace("_url", "")}...</p>
                ) : null}
              </div>
            </div>

            <div className="form-grid-2" style={{ display: "grid", gap: 12 }}>
              <select
                value={eventForm.status}
                onChange={(e) => handleEventField("status", e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="sold_out">Sold Out</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <input
                  type="checkbox"
                  checked={eventForm.is_featured}
                  onChange={(e) => handleEventField("is_featured", e.target.checked)}
                />
                Featured Event
              </label>
            </div>

            <div
              className="flex-row-wrap"
              style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
              <button type="submit" disabled={savingEvent}>
                {savingEvent
                  ? "Saving..."
                  : selectedEventId
                  ? "Update Event"
                  : "Create Event"}
              </button>

              {selectedEventId ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus(selectedEventId, "published")}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickStatus(selectedEventId, "draft")}
                  >
                    Move to Draft
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </div>
      )}

      <div className="two-col-layout" style={{ display: "grid", gap: 24 }}>
        <div className="dashboard-card" style={{ padding: 20 }}>
          <div
            className="flex-row-wrap"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Existing Events</h2>

            <div
              className="flex-row-wrap"
              style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
            >
              <input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 220 }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: 160 }}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="sold_out">Sold Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p>Loading events...</p>
          ) : filteredEvents.length === 0 ? (
            <p>No events found.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    border:
                      String(selectedEventId) === String(event.id)
                        ? "2px solid #8B0000"
                        : "1px solid #ddd",
                    borderRadius: 12,
                    padding: 14,
                    background: "#111",
                  }}
                >
                  <div
                    className="flex-row-wrap"
                    style={{
                      display: "grid",
                      gridTemplateColumns: event.image_url ? "110px 1fr" : "1fr",
                      gap: 14,
                      alignItems: "start",
                    }}
                  >
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        style={{
                          width: "100%",
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 10,
                        }}
                      />
                    ) : null}

                    <div>
                      <div
                        className="flex-row-wrap"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "start",
                        }}
                      >
                        <div>
                          <p style={{ margin: 0 }}>
                            <strong>{event.title}</strong>
                          </p>
                          <p style={{ margin: "4px 0 0", opacity: 0.75 }}>{event.slug}</p>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0 }}>{formatDate(event.event_date)}</p>
                          <p style={{ margin: "4px 0 0" }}>Status: {event.status}</p>
                        </div>
                      </div>

                      {event.location_name ? (
                        <p style={{ margin: "8px 0 0" }}>
                          {event.location_name}
                          {event.city ? ` • ${event.city}` : ""}
                        </p>
                      ) : null}

                      <div
                        className="flex-row-wrap"
                        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
                      >
                        <button type="button" onClick={() => startEditEvent(event.id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEventId(String(event.id))}
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(event.id, "published")}
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatus(event.id, "draft")}
                        >
                          Draft
                        </button>
                        <button type="button" onClick={() => handleDeleteEvent(event.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div className="dashboard-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>Manage Event</h2>

            {!selectedEventId ? (
              <p>Select an event from the list to manage sessions and ticket types.</p>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 10,
                    background: "#111",
                    border: "1px solid #eee",
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong>{selectedEvent?.title || "Selected Event"}</strong>
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    Date: {formatDate(selectedEvent?.event_date)}
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    Status: {selectedEvent?.status || "—"}
                  </p>
                </div>

                <h3>Add Session</h3>
                <form onSubmit={handleAddSession} style={{ display: "grid", gap: 12 }}>
                  <input
                    placeholder="Session Label"
                    value={sessionForm.session_label}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        session_label: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="datetime-local"
                    value={sessionForm.start_time}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="datetime-local"
                    value={sessionForm.end_time}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        end_time: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Capacity"
                    value={sessionForm.capacity}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        capacity: e.target.value,
                      }))
                    }
                  />
                  <select
                    value={sessionForm.status}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="sold_out">Sold Out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="submit">Add Session</button>
                </form>

                <div style={{ marginTop: 18 }}>
                  <h3>Existing Sessions</h3>
                  {detailsLoading ? (
                    <p>Loading sessions...</p>
                  ) : !selectedEventDetails?.sessions?.length ? (
                    <p>No sessions yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedEventDetails.sessions.map((session) => {
                        const isEditing = String(editingSessionId) === String(session.id);

                        return (
                          <div
                            key={session.id}
                            style={{
                              border: "1px solid #ddd",
                              borderRadius: 10,
                              padding: 12,
                              background: "#111",
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <input
                                  placeholder="Session Label"
                                  value={editingSessionForm.session_label}
                                  onChange={(e) =>
                                    setEditingSessionForm((prev) => ({
                                      ...prev,
                                      session_label: e.target.value,
                                    }))
                                  }
                                />
                                <input
                                  type="datetime-local"
                                  value={editingSessionForm.start_time}
                                  onChange={(e) =>
                                    setEditingSessionForm((prev) => ({
                                      ...prev,
                                      start_time: e.target.value,
                                    }))
                                  }
                                />
                                <input
                                  type="datetime-local"
                                  value={editingSessionForm.end_time}
                                  onChange={(e) =>
                                    setEditingSessionForm((prev) => ({
                                      ...prev,
                                      end_time: e.target.value,
                                    }))
                                  }
                                />
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Capacity"
                                  value={editingSessionForm.capacity}
                                  onChange={(e) =>
                                    setEditingSessionForm((prev) => ({
                                      ...prev,
                                      capacity: e.target.value,
                                    }))
                                  }
                                />
                                <select
                                  value={editingSessionForm.status}
                                  onChange={(e) =>
                                    setEditingSessionForm((prev) => ({
                                      ...prev,
                                      status: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="active">Active</option>
                                  <option value="sold_out">Sold Out</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>

                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSession(session.id)}
                                    disabled={savingSession}
                                  >
                                    {savingSession ? "Saving..." : "Save Session"}
                                  </button>
                                  <button type="button" onClick={cancelEditSession}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p style={{ margin: 0 }}>
                                  <strong>{session.session_label || "Session"}</strong>
                                </p>
                                <p style={{ margin: "6px 0 0" }}>
                                  {formatDateTime(session.start_time)}
                                </p>
                                <p style={{ margin: "6px 0 0" }}>
                                  {formatDateTime(session.end_time)}
                                </p>
                                <p style={{ margin: "6px 0 0" }}>
                                  Capacity: {session.capacity} | Sold: {session.tickets_sold || 0}
                                </p>
                                <p style={{ margin: "6px 0 0" }}>Status: {session.status}</p>
                                {session.google_event_id ? (
                                  <p style={{ margin: "6px 0 0", opacity: 0.75 }}>
                                    Synced to Google Calendar
                                  </p>
                                ) : null}

                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() => startEditSession(session)}
                                  >
                                    Edit Session
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSession(session.id)}
                                  >
                                    Delete Session
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="dashboard-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>Ticket Types</h2>

            {!selectedEventId ? (
              <p>Select an event first.</p>
            ) : (
              <>
                <form onSubmit={handleAddTicketType} style={{ display: "grid", gap: 12 }}>
                  <input
                    placeholder="Ticket Name"
                    value={ticketForm.name}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={ticketForm.price}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Quantity Per Purchase"
                    value={ticketForm.quantity_per_purchase}
                    onChange={(e) =>
                      setTicketForm((prev) => ({
                        ...prev,
                        quantity_per_purchase: e.target.value,
                      }))
                    }
                  />
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={ticketForm.is_active}
                      onChange={(e) =>
                        setTicketForm((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    Active
                  </label>
                  <button type="submit">Add Ticket Type</button>
                </form>

                <div style={{ marginTop: 18 }}>
                  <h3>Existing Ticket Types</h3>
                  {detailsLoading ? (
                    <p>Loading ticket types...</p>
                  ) : !selectedEventDetails?.ticketTypes?.length ? (
                    <p>No ticket types yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedEventDetails.ticketTypes.map((ticket) => (
                        <div
                          key={ticket.id}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            padding: 12,
                            background: "#111",
                          }}
                        >
                          <p style={{ margin: 0 }}>
                            <strong>{ticket.name}</strong>
                          </p>
                          <p style={{ margin: "6px 0 0" }}>
                            ${Number(ticket.price || 0).toFixed(2)}
                          </p>
                          <p style={{ margin: "6px 0 0" }}>
                            Qty per purchase: {ticket.quantity_per_purchase}
                          </p>
                          <p style={{ margin: "6px 0 0" }}>
                            {ticket.is_active ? "Active" : "Inactive"}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicketType(ticket.id)}
                            style={{ marginTop: 8 }}
                          >
                            Delete Ticket Type
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}