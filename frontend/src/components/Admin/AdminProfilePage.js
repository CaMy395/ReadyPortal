// AdminProfilePage.js (FULL — paste as-is)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";

const AdminUserProfilePage = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // ✅ accept /admin/users/:userId OR /admin/users/:id OR /admin/users/:userid
  const params = useParams();
  const userId = String(params.userId || params.userid || params.id || "").trim();

  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    role: "",
    preferred_payment_method: "",
    payment_details: "",
    comments: "",
  });

  // Crop/upload
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  // ✅ prevents broken-image icon
  const [imgError, setImgError] = useState(false);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const onChange = (k) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setErr("Missing user id in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");
    setOk("");
    setImgError(false);

    try {
      const res = await fetch(`${apiUrl}/api/users/${userId}/profile`, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data?.error || "Failed to load profile.");

      setProfile(data);
      setForm({
        name: data.name || "",
        username: data.username || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        position: data.position || "",
        role: data.role || "",
        preferred_payment_method: data.preferred_payment_method || "",
        payment_details: data.payment_details || "",
        comments: data.comments || "",
      });
    } catch (e) {
      setErr(e.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId, authHeaders]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async () => {
    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload = {
        name: form.name?.trim(),
        username: form.username?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim(),
        address: form.address?.trim(),
        position: form.position?.trim(),
        role: form.role?.trim(),
        preferred_payment_method: form.preferred_payment_method?.trim(),
        payment_details: form.payment_details?.trim(),
        comments: form.comments?.trim(),
      };

      const res = await fetch(`${apiUrl}/api/users/${userId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders }, // ✅ FIXED
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data?.error || "Failed to update profile.");

      setProfile((p) => ({ ...(p || {}), ...data }));
      setOk("Saved.");
      setTimeout(() => setOk(""), 2000);
    } catch (e) {
      setErr(e.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ----- Crop / upload -----
  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const onChoosePhoto = async (file) => {
    if (!file) return;
    setErr("");
    setOk("");

    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image too large (max 8MB).");
      return;
    }

    const dataUrl = await readFileAsDataURL(file);
    setImageSrc(dataUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  };

  const uploadCroppedPhoto = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setErr("Crop the photo first.");
      return;
    }

    if (!userId) {
      setErr("Missing user id in URL.");
      return;
    }

    setPhotoSaving(true);
    setErr("");
    setOk("");

    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, 512);
      const croppedFile = new File([blob], `profile_${userId}_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const fd = new FormData();
      fd.append("photo", croppedFile);

      const res = await fetch(`${apiUrl}/api/users/${userId}/photo`, {
        method: "POST",
        headers: { ...authHeaders }, // don't set content-type for formdata
        body: fd,
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) throw new Error(data?.error || "Failed to upload photo.");

      // ✅ Update local state + force refresh
      setProfile((p) => ({
        ...(p || {}),
        photo_url: data.photo_url || p?.photo_url || "",
        photo_drive_id: data.photo_drive_id || p?.photo_drive_id || "",
        _photoRefresh: Date.now(),
      }));

      setImgError(false);
      setOk("Photo updated.");
      setTimeout(() => setOk(""), 2000);

      setCropOpen(false);
      setImageSrc(null);
    } catch (e) {
      setErr(e.message || "Failed to upload photo.");
    } finally {
      setPhotoSaving(false);
    }
  };

  // ✅ BEST FIX: always render via your stream endpoint
  // (prevents broken links from stored drive URLs)
  const photoSrc =
    !imgError && userId
      ? `${apiUrl}/api/users/${userId}/photo?t=${profile?._photoRefresh || 0}`
      : "";

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ margin: 0 }}>Admin: User Profile</h2>
        <p style={{ color: "#666" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin: User Profile</h2>
          <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
            ID: <b>{userId || "N/A"}</b>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {photoSrc ? (
            <img
              src={photoSrc}
              alt="Profile"
              onError={() => setImgError(true)} // ✅ fallback instead of broken icon
              style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", border: "1px solid #eee" }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "#f3f3f3",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                color: "#666",
                border: "1px solid #eee",
              }}
              title="No photo"
            >
              {(form.name || form.username || "U").trim().slice(0, 1).toUpperCase()}
            </div>
          )}

          <button
            onClick={() => nav(-1)}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 800,
            }}
          >
            Back
          </button>
        </div>
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

      {/* Admin editable fields */}
      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>User details</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Name" value={form.name} onChange={onChange("name")} />
          <Field label="Username" value={form.username} onChange={onChange("username")} />

          <Field label="Email" value={form.email} onChange={onChange("email")} />
          <Field label="Phone" value={form.phone} onChange={onChange("phone")} />

          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Address" value={form.address} onChange={onChange("address")} />
          </div>

          <Field label="Position" value={form.position} onChange={onChange("position")} />
          <Field label="Role" value={form.role} onChange={onChange("role")} />

          <Field label="Pay method" value={form.preferred_payment_method} onChange={onChange("preferred_payment_method")} />
          <Field label="Pay details" value={form.payment_details} onChange={onChange("payment_details")} />

          <div style={{ gridColumn: "1 / -1" }}>
            <TextArea label="Comments" value={form.comments} onChange={onChange("comments")} />
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
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            onClick={fetchProfile}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>

      {/* Photo (cropped) */}
      <div style={{ marginTop: 16, padding: 16, border: "1px solid #eee", borderRadius: 16, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Profile photo (crop)</h3>

        <input type="file" accept="image/*" onChange={(e) => onChoosePhoto(e.target.files?.[0] || null)} />
        <p style={{ marginBottom: 0, color: "#666", fontSize: 12 }}>
          Drag to position, zoom, then upload.
        </p>
      </div>

      {/* Crop modal */}
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
            <div style={{ padding: 14, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
              <b>Crop photo</b>
              <button
                onClick={() => !photoSaving && setCropOpen(false)}
                style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "6px 10px", fontWeight: 800 }}
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
                <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => !photoSaving && setCropOpen(false)}
                  style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 800 }}
                >
                  Cancel
                </button>

                <button
                  onClick={uploadCroppedPhoto}
                  disabled={photoSaving}
                  style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800 }}
                >
                  {photoSaving ? "Uploading…" : "Save crop & upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 30 }} />
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text" }) => (
  <label style={{ display: "grid", gap: 6 }}>
    <span style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>{label}</span>
    <input
      value={value}
      onChange={onChange}
      type={type}
      style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", outline: "none" }}
    />
  </label>
);

const TextArea = ({ label, value, onChange }) => (
  <label style={{ display: "grid", gap: 6 }}>
    <span style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>{label}</span>
    <textarea
      value={value}
      onChange={onChange}
      rows={4}
      style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", outline: "none", resize: "vertical" }}
    />
  </label>
);

export default AdminUserProfilePage;

// ------- helpers -------
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
    image.src = url;
  });
}

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
