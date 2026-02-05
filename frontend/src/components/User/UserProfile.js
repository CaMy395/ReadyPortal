import React, { useEffect, useMemo, useState, useCallback } from "react";
import Cropper from "react-easy-crop";

const UserProfilePage = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const loggedInUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("loggedInUser"));
    } catch {
      return null;
    }
  }, []);

  const userId = loggedInUser?.id || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [profile, setProfile] = useState(null);

  // Editable fields
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    role: "",
    is_active: true,
  });

  // Password change
  const [pw, setPw] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  // Upload + crop
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  // Crop UI state
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null); // data URL for cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setErr("No logged in user found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr("");
      setOk("");

      try {
        const res = await fetch(`${apiUrl}/api/users/${userId}/profile`, {
          headers: { "Content-Type": "application/json", ...authHeaders },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load profile.");

        setProfile(data);

        setForm({
          full_name: data.full_name || data.name || "",
          username: data.username || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          role: data.role || "",
          is_active: data.is_active ?? true,
        });
      } catch (e) {
        setErr(e.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiUrl, userId, authHeaders]);

  const roleBadge = (role) => {
    const r = String(role || "").toLowerCase();
    const base = {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 0.2,
    };

    if (r === "admin") return <span style={{ ...base, background: "#111", color: "#fff" }}>ADMIN</span>;
    if (r === "vendor") return <span style={{ ...base, background: "#06c", color: "#fff" }}>VENDOR</span>;
    if (r === "student") return <span style={{ ...base, background: "#7a3", color: "#fff" }}>STUDENT</span>;
    return <span style={{ ...base, background: "#f5f5f5", color: "#111", border: "1px solid #ddd" }}>{role || "USER"}</span>;
  };

  const onChange = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload = {
        full_name: form.full_name?.trim(),
        username: form.username?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim(),
        address: form.address?.trim(),
      };

      const res = await fetch(`${apiUrl}/api/users/${userId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update profile.");

      setProfile(data);
      setOk("Profile updated.");
      setTimeout(() => setOk(""), 2500);

      const updatedLocal = { ...(loggedInUser || {}), ...data };
      localStorage.setItem("loggedInUser", JSON.stringify(updatedLocal));
    } catch (e) {
      setErr(e.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwMsg("");
    setErr("");

    if (!pw.currentPassword || !pw.newPassword) {
      setPwMsg("Enter your current password and a new password.");
      return;
    }
    if (pw.newPassword.length < 8) {
      setPwMsg("New password must be at least 8 characters.");
      return;
    }
    if (pw.newPassword !== pw.confirmNewPassword) {
      setPwMsg("New passwords do not match.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to change password.");

      setPw({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setPwMsg("Password updated.");
    } catch (e) {
      setPwMsg(e.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  // ---- Crop handlers ----
  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const onChoosePhoto = async (file) => {
    if (!file) return;
    setErr("");
    setOk("");

    // basic validation (optional)
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image is too large (max 8MB).");
      return;
    }

    setPhotoFile(file);

    const dataUrl = await readFileAsDataURL(file);
    setImageSrc(dataUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  };

  const uploadCroppedPhoto = async () => {
    if (!photoFile || !imageSrc || !croppedAreaPixels) {
      setErr("Pick a photo and crop it first.");
      return;
    }

    setPhotoSaving(true);
    setErr("");
    setOk("");

    try {
      const croppedBlob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 512); // 512x512 circle-friendly
      const croppedFile = new File([croppedBlob], `profile_${Date.now()}.jpg`, { type: "image/jpeg" });

      const fd = new FormData();
      fd.append("photo", croppedFile);

      const res = await fetch(`${apiUrl}/api/users/${userId}/photo`, {
        method: "POST",
        headers: { ...authHeaders },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to upload photo.");

      setOk("Photo updated.");
      setTimeout(() => setOk(""), 2500);

      // Refresh the streamed photo (cache-buster)
      setProfile((p) => ({ ...(p || {}), _photoRefresh: Date.now(), photo_drive_id: data.photo_drive_id || p?.photo_drive_id }));

      setCropOpen(false);
      setPhotoFile(null);
      setImageSrc(null);
    } catch (e) {
      setErr(e.message || "Failed to upload photo.");
    } finally {
      setPhotoSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ margin: 0 }}>Profile</h2>
        <p style={{ color: "#666" }}>Loading…</p>
      </div>
    );
  }

  const photoSrc = `${apiUrl}/api/users/${userId}/photo?t=${profile?._photoRefresh || 0}`;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            {roleBadge(form.role)}
            <span style={{ fontSize: 12, color: "#666" }}>
              Status:{" "}
              <b style={{ color: form.is_active ? "#0b5" : "#c00" }}>
                {form.is_active ? "Active" : "Inactive"}
              </b>
            </span>
          </div>
        </div>

        <img
          src={photoSrc}
          alt="Profile"
          onError={(e) => {
            // If no photo exists yet, show fallback letter instead of broken icon
            e.currentTarget.style.display = "none";
          }}
          style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", border: "1px solid #eee" }}
        />
      </div>

      {(err || ok) && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: err ? "#ffecec" : "#ecffef",
            border: `1px solid ${err ? "#ffb8b8" : "#b8ffcc"}`,
            color: err ? "#900" : "#064",
          }}
        >
          {err || ok}
        </div>
      )}

      {/* Profile Details */}
      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Your info</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Full name" value={form.full_name} onChange={onChange("full_name")} />
          <Field label="Username" value={form.username} onChange={onChange("username")} />
          <Field label="Email" value={form.email} onChange={onChange("email")} />
          <Field label="Phone" value={form.phone} onChange={onChange("phone")} />

          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Address" value={form.address} onChange={onChange("address")} />
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Update profile"}
          </button>

          <button
            onClick={() => {
              setErr("");
              setOk("");
              setForm((p) => ({
                ...p,
                full_name: profile?.full_name || profile?.name || "",
                username: profile?.username || "",
                email: profile?.email || "",
                phone: profile?.phone || "",
                address: profile?.address || "",
              }));
            }}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Photo Upload */}
      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Profile photo (crop before upload)</h3>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onChoosePhoto(e.target.files?.[0] || null)}
          />
        </div>

        <p style={{ marginBottom: 0, color: "#666", fontSize: 12 }}>
          You can drag to reposition and zoom before uploading.
        </p>
      </div>

      {/* Password Change */}
      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Change password</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field
            label="Current password"
            value={pw.currentPassword}
            onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
            type="password"
          />
          <div />
          <Field
            label="New password"
            value={pw.newPassword}
            onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
            type="password"
          />
          <Field
            label="Confirm new password"
            value={pw.confirmNewPassword}
            onChange={(e) => setPw((p) => ({ ...p, confirmNewPassword: e.target.value }))}
            type="password"
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={changePassword}
            disabled={pwSaving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 800,
              cursor: pwSaving ? "not-allowed" : "pointer",
            }}
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
          {pwMsg && <span style={{ color: pwMsg.includes("updated") ? "#064" : "#900", fontWeight: 700 }}>{pwMsg}</span>}
        </div>
      </div>

      <div style={{ height: 30 }} />

      {/* Crop Modal */}
      {cropOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !photoSaving && setCropOpen(false)}
        >
          <div
            style={{
              width: "min(720px, 96vw)",
              background: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 14, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Crop your photo</b>
              <button
                onClick={() => !photoSaving && setCropOpen(false)}
                style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "6px 10px", fontWeight: 800, cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            <div style={{ position: "relative", width: "100%", height: 360, background: "#111" }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div style={{ padding: 14, display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => !photoSaving && setCropOpen(false)}
                  disabled={photoSaving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    fontWeight: 800,
                    cursor: photoSaving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={uploadCroppedPhoto}
                  disabled={photoSaving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: photoSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {photoSaving ? "Uploading…" : "Save crop & upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text" }) => {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>{label}</span>
      <input
        value={value}
        onChange={onChange}
        type={type}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #ddd",
          outline: "none",
        }}
      />
    </label>
  );
};

export default UserProfilePage;

/** ---------- helpers ---------- */

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

// Crops to a square and exports JPEG blob
async function getCroppedImageBlob(imageSrc, cropPixels, outSize = 512) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const sx = cropPixels.x * scaleX;
  const sy = cropPixels.y * scaleY;
  const sWidth = cropPixels.width * scaleX;
  const sHeight = cropPixels.height * scaleY;

  ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outSize, outSize);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}
