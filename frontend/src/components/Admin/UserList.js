import React, { useEffect, useMemo, useState } from "react";

const UserList = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [users, setUsers] = useState([]);

  // ✅ staff/vendor toggle
  const [viewMode, setViewMode] = useState("staff"); // 'staff' | 'vendor'

  // ✅ add vendor modal
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    position: "Vendor",
    preferred_payment_method: "",
    payment_details: "",
  });

  // ✅ VIEW-ONLY PROFILE MODAL
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [selectedUser, setSelectedUser] = useState(null); // row user (id, name, etc.)
  const [selectedProfile, setSelectedProfile] = useState(null); // /api/users/:id/profile response
  const [photoBust, setPhotoBust] = useState(0); // cache-bust for avatar
  const [photoError, setPhotoError] = useState(false);

  // ✅ NEW: upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPhotoErr, setUploadPhotoErr] = useState("");
  const [uploadPhotoOk, setUploadPhotoOk] = useState("");

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();

      const sortedUsers = (data || []).sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        })
      );

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // Filter displayed users based on toggle
  const displayedUsers = useMemo(() => {
    if (viewMode === "vendor") {
      return users.filter((u) => (u.role || "").toLowerCase() === "vendor");
    }
    // staff view = everything except vendors
    return users.filter((u) => (u.role || "").toLowerCase() !== "vendor");
  }, [users, viewMode]);

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`${apiUrl}/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete user");

      await fetchUsers();
      alert("User deleted successfully!");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("There was an error deleting the user.");
    }
  };

  // ✅ Add Vendor submit
  const handleVendorField = (e) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };

  const submitNewVendor = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${apiUrl}/api/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(newVendor),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      setShowAddVendor(false);
      setNewVendor({
        name: "",
        email: "",
        phone: "",
        position: "Vendor",
        preferred_payment_method: "",
        payment_details: "",
      });

      await fetchUsers();
      setViewMode("vendor");
      alert("Vendor added!");
    } catch (err) {
      console.error("Add vendor failed:", err);
      alert("Failed to add vendor. Check name/email/username conflicts.");
    }
  };

  // ✅ OPEN PROFILE MODAL (view only)
  const openProfileModal = async (user) => {
    if (!user?.id) return;

    setSelectedUser(user);
    setSelectedProfile(null);
    setProfileErr("");
    setProfileOpen(true);
    setProfileLoading(true);

    // reset photo + upload states
    setPhotoError(false);
    setPhotoBust(Date.now());
    setUploadingPhoto(false);
    setUploadPhotoErr("");
    setUploadPhotoOk("");

    try {
      const res = await fetch(`${apiUrl}/api/users/${user.id}/profile`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data?.error || "Failed to load profile.");

      setSelectedProfile(data);
    } catch (e) {
      setProfileErr(e.message || "Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    setProfileOpen(false);
    setSelectedUser(null);
    setSelectedProfile(null);
    setProfileErr("");
    setProfileLoading(false);
    setPhotoError(false);

    // upload state reset
    setUploadingPhoto(false);
    setUploadPhotoErr("");
    setUploadPhotoOk("");
  };

  // ✅ NEW: upload/replace profile photo for this user
  const uploadProfilePhoto = async (file) => {
    if (!selectedUser?.id || !file) return;

    setUploadingPhoto(true);
    setUploadPhotoErr("");
    setUploadPhotoOk("");

    try {
      // basic guard (optional)
      const maxBytes = 6 * 1024 * 1024; // 6MB
      if (file.size > maxBytes) {
        throw new Error("Photo too large. Please use an image under 6MB.");
      }

      const fd = new FormData();
      fd.append("photo", file); // MUST match upload.single("photo") on backend :contentReference[oaicite:2]{index=2}

      const res = await fetch(`${apiUrl}/api/users/${selectedUser.id}/photo`, {
        method: "POST",
        headers: { ...authHeaders }, // DO NOT set Content-Type with FormData
        body: fd,
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data?.error || "Upload failed.");

      // Refresh avatar immediately
      setPhotoError(false);
      setPhotoBust(Date.now());

      // Keep profile in sync (optional)
      setSelectedProfile((prev) => ({
        ...(prev || {}),
        photo_drive_id: data?.photo_drive_id || prev?.photo_drive_id,
      }));

      setUploadPhotoOk("✅ Photo updated.");
    } catch (e) {
      setUploadPhotoErr(e?.message || "Upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ESC to close + lock scroll
  useEffect(() => {
    if (!profileOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") closeProfileModal();
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileOpen]);

  const getInitial = (u, p) => {
    const s = (p?.name || u?.name || p?.username || u?.username || "U").trim();
    return s ? s.slice(0, 1).toUpperCase() : "U";
  };

  const photoSrc =
    !photoError && selectedUser?.id
      ? `${apiUrl}/api/users/${selectedUser.id}/photo?t=${photoBust || 0}`
      : "";

  const formatRating = (u) => {
    const avg = Number(u?.staff_rating_avg || 0);
    const count = Number(u?.staff_rating_count || 0);
    if (!count) return "—";
    return `⭐ ${avg.toFixed(2)} (${count})`;
  };

  return (
    <div className="userlist-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{viewMode === "vendor" ? "Vendors" : "Our Team"}</h2>

        {/* ✅ Staff/Vendor toggle */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode("staff")}
            style={{
              fontWeight: viewMode === "staff" ? 700 : 400,
              opacity: viewMode === "staff" ? 1 : 0.75,
            }}
          >
            Staff
          </button>

          <button
            type="button"
            onClick={() => setViewMode("vendor")}
            style={{
              fontWeight: viewMode === "vendor" ? 700 : 400,
              opacity: viewMode === "vendor" ? 1 : 0.75,
            }}
          >
            Vendors
          </button>

          {/* ✅ Add Vendor button (only in vendor mode) */}
          {viewMode === "vendor" && (
            <button type="button" onClick={() => setShowAddVendor(true)} style={{ marginLeft: 8 }}>
              + Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* ✅ Add Vendor modal */}
      {showAddVendor && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add Vendor</h3>

          <form onSubmit={submitNewVendor} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <label>
              Name*
              <input name="name" value={newVendor.name} onChange={handleVendorField} required />
            </label>

            <label>
              Email
              <input name="email" value={newVendor.email} onChange={handleVendorField} />
            </label>

            <label>
              Phone
              <input name="phone" value={newVendor.phone} onChange={handleVendorField} />
            </label>

            <label>
              Pay Method
              <input
                name="preferred_payment_method"
                value={newVendor.preferred_payment_method}
                onChange={handleVendorField}
                placeholder="Cash App, Zelle, Venmo..."
              />
            </label>

            <label>
              Pay Details
              <input
                name="payment_details"
                value={newVendor.payment_details}
                onChange={handleVendorField}
                placeholder="$cashtag, email, phone, etc."
              />
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit">Save Vendor</button>
              <button type="button" onClick={() => setShowAddVendor(false)}>
                Cancel
              </button>
            </div>

            <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
              Vendors are saved as users with role = <b>vendor</b> (no login needed).
            </p>
          </form>
        </div>
      )}

      {/* Users table */}
      {displayedUsers.length > 0 ? (
        <div className="table-container" style={{ marginTop: 16 }}>
          <table className="userlist-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Position</th>
                <th>Role</th>

                {/* ✅ NEW */}
                <th>Rating</th>

                <th>Pay Method</th>
                <th>Pay Details</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {displayedUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => openProfileModal(user)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        color: "#111",
                        fontWeight: 800,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      title="View profile"
                    >
                      {user.name}
                    </button>
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.address}</td>
                  <td>{user.position}</td>
                  <td>{user.role}</td>

                  {/* ✅ NEW */}
                  <td>{viewMode === "vendor" ? "—" : formatRating(user)}</td>

                  <td>{user.preferred_payment_method}</td>
                  <td>{user.payment_details}</td>
                  <td>{user.comments}</td>
                  <td>
                    <button onClick={() => handleDelete(user.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-users" style={{ marginTop: 16 }}>
          No {viewMode === "vendor" ? "vendors" : "users"} found.
        </p>
      )}

      {/* ✅ VIEW PROFILE MODAL */}
      {profileOpen && (
        <div
          onClick={closeProfileModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(860px, 96vw)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#111",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              border: "1px solid #eee",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            {/* header */}
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt="Profile"
                    onError={() => setPhotoError(true)}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      objectFit: "cover",
                      border: "1px solid #eee",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      background: "#f3f3f3",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      color: "#666",
                      border: "1px solid #eee",
                    }}
                    title="No photo"
                  >
                    {getInitial(selectedUser, selectedProfile)}
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.1 }}>
                    {selectedProfile?.name || selectedUser?.name || "User"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                    @{selectedProfile?.username || selectedUser?.username || "—"} • ID: {selectedUser?.id || "—"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeProfileModal}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            {/* body */}
            <div style={{ padding: 16 }}>
              {profileLoading ? (
                <p style={{ marginTop: 0, color: "#666" }}>Loading profile…</p>
              ) : profileErr ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "#ffecec",
                    border: "1px solid #ffb8b8",
                    color: "#900",
                  }}
                >
                  {profileErr}
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <ReadOnlyField label="Name" value={selectedProfile?.name} />
                    <ReadOnlyField label="Username" value={selectedProfile?.username} />

                    <ReadOnlyField label="Email" value={selectedProfile?.email} />
                    <ReadOnlyField label="Phone" value={selectedProfile?.phone} />

                    <div style={{ gridColumn: "1 / -1" }}>
                      <ReadOnlyField label="Address" value={selectedProfile?.address} />
                    </div>

                    <ReadOnlyField label="Position" value={selectedProfile?.position} />
                    <ReadOnlyField label="Role" value={selectedProfile?.role} />

                    <ReadOnlyField label="Pay method" value={selectedProfile?.preferred_payment_method} />
                    <ReadOnlyField label="Pay details" value={selectedProfile?.payment_details} />

                    <div style={{ gridColumn: "1 / -1" }}>
                      <ReadOnlyTextarea label="Comments" value={selectedProfile?.comments} />
                    </div>
                  </div>

                  {/* ✅ NEW: Upload / Replace Photo */}
                  <div style={{ height: 14 }} />

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid #eee",
                      background: "#111",
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>Profile Photo</div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          background: uploadingPhoto ? "#f3f3f3" : "#fff",
                          cursor: uploadingPhoto ? "not-allowed" : "pointer",
                          fontWeight: 800,
                        }}
                      >
                        {uploadingPhoto ? "Uploading…" : "Upload / Replace Photo"}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPhoto}
                          style={{ display: "none" ,
                            background: "#111",
                          }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            uploadProfilePhoto(file);
                            e.target.value = ""; // allow re-upload same file
                          }}
                        />
                      </label>

                      <span style={{ fontSize: 12, color: "#666" }}>JPG/PNG recommended • under 6MB</span>
                    </div>

                    {uploadPhotoOk && (
                      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#0a7a2f" }}>
                        {uploadPhotoOk}
                      </div>
                    )}

                    {uploadPhotoErr && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 10,
                          background: "#ffecec",
                          border: "1px solid #ffb8b8",
                          color: "#900",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {uploadPhotoErr}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div style={{ height: 8 }} />
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#777" }}>
                View-only. (No edits from this screen.)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReadOnlyField = ({ label, value }) => (
  <div style={{ display: "grid", gap: 6 }}>
    <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>{label}</div>
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fafafa",
        color: "#111",
        minHeight: 40,
        display: "flex",
        alignItems: "center",
      }}
    >
      {value ? String(value) : <span style={{ color: "#999" }}>—</span>}
    </div>
  </div>
);

const ReadOnlyTextarea = ({ label, value }) => (
  <div style={{ display: "grid", gap: 6 }}>
    <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>{label}</div>
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #eee",
        background: "#fafafa",
        color: "#111",
        whiteSpace: "pre-wrap",
        minHeight: 90,
      }}
    >
      {value ? String(value) : <span style={{ color: "#999" }}>—</span>}
    </div>
  </div>
);

export default UserList;