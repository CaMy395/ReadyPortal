import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

const VerifyCertificate = () => {
  const { token } = useParams();

  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!token) {
        setError("A certificate verification token is required.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${apiUrl}/api/certificates/verify/${encodeURIComponent(
            token
          )}`
        );

        setCertificate(response.data?.certificate || null);
      } catch (err) {
        console.error("Certificate verification error:", err);

        setError(
          err?.response?.data?.error ||
            "This certificate could not be verified."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [apiUrl, token]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "Not provided";

    return new Date(dateValue).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const getStatusDetails = () => {
    const status = certificate?.status || "unknown";

    if (status === "valid") {
      return {
        label: "Valid Certificate",
        symbol: "✓",
        background: "#e8f5e9",
        border: "#81c784",
        color: "#1b5e20",
      };
    }

    if (status === "expired") {
      return {
        label: "Expired Certificate",
        symbol: "!",
        background: "#fff8e1",
        border: "#ffd54f",
        color: "#795548",
      };
    }

    if (status === "revoked") {
      return {
        label: "Revoked Certificate",
        symbol: "×",
        background: "#ffebee",
        border: "#ef9a9a",
        color: "#b71c1c",
      };
    }

    if (status === "replaced") {
      return {
        label: "Certificate Replaced",
        symbol: "!",
        background: "#e3f2fd",
        border: "#90caf9",
        color: "#0d47a1",
      };
    }

    return {
      label: "Certificate Status Unknown",
      symbol: "?",
      background: "#eeeeee",
      border: "#bdbdbd",
      color: "#424242",
    };
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.brand}>Ready Training Institute</h1>
          <p style={styles.subtitle}>
            A Division of Ready Bartending LLC
          </p>
          <p style={styles.loading}>Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.brand}>Ready Training Institute</h1>
          <p style={styles.subtitle}>
            A Division of Ready Bartending LLC
          </p>

          <div
            style={{
              ...styles.statusBox,
              background: "#ffebee",
              borderColor: "#ef9a9a",
              color: "#b71c1c",
            }}
          >
            <div style={styles.statusSymbol}>×</div>
            <div>
              <div style={styles.statusTitle}>
                Certificate Not Verified
              </div>
              <div style={styles.statusText}>
                {error || "Certificate not found."}
              </div>
            </div>
          </div>

          <Link to="/verify" style={styles.linkButton}>
            Search Another Certificate
          </Link>
        </div>
      </div>
    );
  }

  const statusDetails = getStatusDetails();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.logoCircle}>RTI</div>

          <div>
            <h1 style={styles.brand}>Ready Training Institute</h1>
            <p style={styles.subtitle}>
              A Division of Ready Bartending LLC
            </p>
          </div>
        </header>

        <div
          style={{
            ...styles.statusBox,
            background: statusDetails.background,
            borderColor: statusDetails.border,
            color: statusDetails.color,
          }}
        >
          <div style={styles.statusSymbol}>
            {statusDetails.symbol}
          </div>

          <div>
            <div style={styles.statusTitle}>
              {statusDetails.label}
            </div>

            <div style={styles.statusText}>
              This credential was found in the Ready Training
              Institute verification system.
            </div>
          </div>
        </div>

        <section style={styles.details}>
          <DetailRow
            label="Student"
            value={certificate.student_name}
          />

          <DetailRow
            label="Certificate Number"
            value={certificate.certificate_number}
          />

          <DetailRow
            label="Course"
            value={certificate.course_name}
          />

          <DetailRow
            label="Course Hours"
            value={
              certificate.course_hours
                ? `${Number(certificate.course_hours).toFixed(
                    2
                  )} hours`
                : "Not provided"
            }
          />

          <DetailRow
            label="Issue Date"
            value={formatDate(certificate.issue_date)}
          />

          {certificate.expiration_date && (
            <DetailRow
              label="Expiration Date"
              value={formatDate(
                certificate.expiration_date
              )}
            />
          )}

          <DetailRow
            label="Instructor"
            value={certificate.instructor_name}
          />

          <DetailRow
            label="Status"
            value={certificate.status}
            capitalize
          />
        </section>

        <div style={styles.notice}>
          This page verifies the certificate record maintained by
          Ready Training Institute. Personal contact information
          and examination scores are not displayed publicly.
        </div>

        <div style={styles.actions}>
          <Link to="/verify" style={styles.linkButton}>
            Search Another Certificate
          </Link>

          <a
            href="https://readybartending.com"
            style={styles.secondaryButton}
          >
            Visit Ready Bartending
          </a>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  capitalize = false,
}) => (
  <div style={styles.detailRow}>
    <div style={styles.detailLabel}>{label}</div>
    <div
      style={{
        ...styles.detailValue,
        textTransform: capitalize ? "capitalize" : "none",
      }}
    >
      {value || "Not provided"}
    </div>
  </div>
);

const styles = {
  page: {
    minHeight: "100vh",
    padding: "120px 16px 50px",
    background:
      "radial-gradient(circle at top, rgba(139, 0, 0, 0.35), transparent 45%), #050505",
    color: "#ffffff",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: 720,
    background: "#151515",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 16px 45px rgba(0,0,0,0.55)",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#8b0000",
    border: "2px solid rgba(255,235,119,0.65)",
    color: "#ffffff",
    fontWeight: 800,
    letterSpacing: 1,
    flexShrink: 0,
  },

  brand: {
    margin: 0,
    color: "rgba(255,235,119,0.85)",
    fontSize: 28,
    lineHeight: 1.15,
  },

  subtitle: {
    margin: "5px 0 0",
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },

  loading: {
    marginTop: 28,
    color: "rgba(255,255,255,0.8)",
  },

  statusBox: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 16,
    border: "1px solid",
    borderRadius: 12,
    marginBottom: 24,
  },

  statusSymbol: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    border: "2px solid currentColor",
    fontSize: 24,
    fontWeight: 900,
    flexShrink: 0,
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: 800,
  },

  statusText: {
    marginTop: 3,
    fontSize: 13,
    opacity: 0.85,
  },

  details: {
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    overflow: "hidden",
  },

  detailRow: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 0.7fr) 1.3fr",
    gap: 14,
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  detailLabel: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  detailValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    wordBreak: "break-word",
  },

  notice: {
    marginTop: 18,
    padding: 14,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 1.5,
  },

  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },

  linkButton: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 6,
    background: "#8b0000",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
  },

  secondaryButton: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 6,
    background: "#333333",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
  },
};

export default VerifyCertificate;