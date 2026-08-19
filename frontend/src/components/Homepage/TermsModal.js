import React, { useEffect, useMemo, useState } from "react";

const STAFF_HANDBOOK_VERSION = "2.0";
const STAFF_HANDBOOK_DATE = "August 2026";

const TermsModal = ({
  open = false,
  onClose,
  onW9Upload,
  onIDUpload,
  onSSUpload,
  role = "student",
  targetUserId,
}) => {
  const [isOpen, setIsOpen] = useState(!!open);

  useEffect(() => {
    setIsOpen(!!open);
  }, [open]);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const qs = useMemo(() => {
    return targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : "";
  }, [targetUserId]);

  const [w9Uploaded, setW9Uploaded] = useState(false);
  const [idUploaded, setIDUploaded] = useState(false);
  const [ssUploaded, setSsUploaded] = useState(false);

  const isStaff = role === "user";

  const close = () => {
    setIsOpen(false);
    if (typeof onClose === "function") onClose();
  };

  const handleUpload = async (endpoint, fieldName, file, onSuccess) => {
    if (!file) return;

    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const response = await fetch(`${apiUrl}${endpoint}${qs}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      console.log(
        `${fieldName} uploaded successfully:`,
        data?.message || data
      );

      onSuccess(true);
    } catch (err) {
      console.error(`Error uploading ${fieldName}:`, err);
      alert(`Failed to upload ${fieldName}. Please try again.`);
      onSuccess(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target.classList.contains("modal")) close();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 92vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#111",
          color: "#fff",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ marginBottom: 4 }}>
          {isStaff
            ? "Staff Handbook & Registration Terms"
            : "Terms and Conditions"}
        </h2>

        {isStaff && (
          <>
            <p
              style={{
                marginTop: 0,
                color: "#d4af37",
                fontWeight: 700,
              }}
            >
              Version {STAFF_HANDBOOK_VERSION} - {STAFF_HANDBOOK_DATE}
            </p>

            <p>
              Please read this information carefully before completing your
              registration. By registering with Ready Bartending LLC, you
              acknowledge that you have reviewed these staff rules and agree to
              follow Ready policies, event-specific instructions, and the
              standards below.
            </p>

            <h3>1. ReadyPortal & Communication</h3>
            <ul>
              <li>
                ReadyPortal is the primary system for staff registration,
                records, gig opportunities, and official posted event details.
              </li>
              <li>
                Keep your profile and contact information current and review all
                gig details before accepting.
              </li>
              <li>
                WhatsApp event chats are used for active event communication,
                updates, parking/access information, and staff coordination.
              </li>
              <li>
                Monitor ReadyPortal and the event WhatsApp chat after you are
                assigned to a gig.
              </li>
            </ul>

            <h3>2. Gig Opportunities & Commitments</h3>
            <ul>
              <li>Most gigs are first come, first served.</li>
              <li>
                Some gigs require Ready and/or client approval. Expressing
                interest does not guarantee assignment.
              </li>
              <li>
                Read ALL information before accepting a gig and only accept when
                you are available and committed to working it.
              </li>
              <li>
                Repeated cancellations, late cancellations, no-shows, lateness,
                or failure to communicate may affect future gig eligibility.
              </li>
            </ul>

            <h3>3. Uniform & Appearance</h3>
            <ul>
              <li>
                Sexy attire may include a Ready logo bodysuit, thigh-high socks,
                nude Hooters-style tights/stockings, approved black shoes, and
                event-specific pieces.
              </li>
              <li>
                Formal attire includes a black Ready logo button-down, black
                dress pants, and approved black shoes.
              </li>
              <li>
                Ready uniform pieces must display the Ready logo unless Ready
                gives different instructions.
              </li>
              <li>
                When a client provides attire, Ready supplies the requested
                staff sizes and assigned staff must wear the client-provided
                attire as instructed.
              </li>
              <li>
                Clothing must be clean and presentable. Hair and nails must be
                clean and well groomed.
              </li>
            </ul>

            <h3>4. Professional Conduct</h3>
            <ul>
              <li>
                Customer experience is a top priority. Be memorable,
                professional, respectful, and attentive.
              </li>
              <li>
                Excessive personal phone use must not interfere with guest
                service.
              </li>
              <li>
                Do not guess when you do not know an answer. Ask the event
                POC/host or appropriate Ready lead.
              </li>
              <li>
                Treat clients, guests, coworkers, vendors, and Ready leadership
                professionally.
              </li>
              <li>
                Ready staff may NOT consume alcohol while actively working a
                Ready event, even if a client, host, vendor, or guest offers it.
              </li>
            </ul>

            <h3>5. Arrival, Setup & Event Readiness</h3>
            <ul>
              <li>
                Follow the confirmed arrival time shown in the gig/event
                details.
              </li>
              <li>
                Unless instructed otherwise, staffing-only assignments may
                require arrival at least 15 minutes before service and
                full-bar-service assignments may require at least 30 minutes for
                setup.
              </li>
              <li>
                Report to the onsite POC/host or Ready lead, confirm your
                service area, and be completely ready before guests arrive.
              </li>
              <li>
                Keep the bar/service area clean, organized, stocked, and
                guest-ready throughout the event.
              </li>
            </ul>

            <h3>6. Responsible Alcohol Service</h3>
            <ul>
              <li>Serve alcohol legally and responsibly.</li>
              <li>Follow Ready's current ID-checking requirements.</li>
              <li>Use standard pours and do not intentionally overpour.</li>
              <li>Do not knowingly serve alcohol to an underage guest.</li>
              <li>
                If a guest appears intoxicated, stop service to that guest and
                notify the POC/host or Ready lead. Do not argue with an
                intoxicated or hostile guest.
              </li>
              <li>Do not serve alcohol after the bar is officially closed.</li>
            </ul>

            <h3>7. Payments, Tips & Client Boundaries</h3>
            <ul>
              <li>
                Review the stated gig compensation before accepting an
                opportunity.
              </li>
              <li>
                Payout timing and method may vary by event or third-party
                arrangement.
              </li>
              <li>
                Do not accept the client's event payment on Ready's behalf
                unless specifically authorized.
              </li>
              <li>Guest tips may be accepted when permitted for the event.</li>
              <li>
                If you are unsure whether money offered is a tip or payment owed
                to Ready, verify before accepting it.
              </li>
              <li>Do not negotiate Ready payout directly with the client.</li>
            </ul>

            <h3>8. Equipment, Closeout & Accountability</h3>
            <ul>
              <li>
                Return Ready/client tools, uniforms, props, supplies, and
                equipment as instructed and in the condition received.
              </li>
              <li>
                Report lost, damaged, or missing items and serious event issues
                promptly.
              </li>
              <li>
                If something goes wrong during an event, communicate. Do not
                hide the issue or wait until after the event when immediate
                action could help.
              </li>
              <li>
                Unprofessional conduct, repeated complaints, failure to follow
                instructions, lateness, no-shows, or uncooperative behavior may
                result in suspension from gigs or removal from the Ready team,
                subject to the circumstances and applicable law.
              </li>
            </ul>

            <h3>9. Handbook Acknowledgment</h3>
            <p>
              By completing registration and checking the agreement box on the
              registration page, you acknowledge that you have read and agree
              to the Ready Bartending LLC Staff Handbook & Registration Terms,
              Version {STAFF_HANDBOOK_VERSION} - {STAFF_HANDBOOK_DATE}. This
              version supersedes prior Ready staff handbook versions.
            </p>

            <hr style={{ margin: "22px 0", opacity: 0.3 }} />

            <h3>Required Registration Documents</h3>
            <p>
              Complete all required uploads below before returning to the
              registration form.
            </p>
          </>
        )}

        {!isStaff && (
          <>
            <p>
              Please take a moment to screenshot any important details and
              ensure you read all information carefully. By registering, you
              agree to the outlined terms and conditions.
            </p>
            <p>
              Users must uphold professionalism, follow safety protocols, and
              comply with Ready Bartending LLC policies that apply to their
              role.
            </p>
          </>
        )}

        {/* ================= ID UPLOAD (ALL USERS) ================= */}
        <div style={{ marginTop: 20 }}>
          <label>Upload Government ID:</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) =>
              handleUpload(
                "/api/upload-id",
                "idFile",
                e.target.files?.[0],
                (ok) => {
                  setIDUploaded(ok);
                  if (ok && typeof onIDUpload === "function") onIDUpload(true);
                }
              )
            }
          />
          {idUploaded && (
            <p style={{ color: "green" }}>ID successfully uploaded</p>
          )}
        </div>

        {/* ================= STAFF-ONLY DOCUMENTS ================= */}
        {isStaff && (
          <>
            <hr style={{ margin: "20px 0", opacity: 0.3 }} />

            <p>
              <strong>Staff only:</strong> Upload your completed W-9.
            </p>
            <a href="/w9-form.pdf" download>
              Download W-9 Form HERE!
            </a>

            <div style={{ marginTop: 8 }}>
              <label>Upload W-9:</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) =>
                  handleUpload(
                    "/api/upload-w9",
                    "w9File",
                    e.target.files?.[0],
                    (ok) => {
                      setW9Uploaded(ok);
                      if (ok && typeof onW9Upload === "function")
                        onW9Upload(true);
                    }
                  )
                }
              />
              {w9Uploaded && (
                <p style={{ color: "green" }}>W-9 successfully uploaded</p>
              )}
            </div>

            <hr style={{ margin: "20px 0", opacity: 0.3 }} />

            <p>
              <strong>Staff only:</strong> Upload your Social Security card for
              payroll verification.
            </p>

            <div style={{ marginTop: 8 }}>
              <label>Upload SS Card:</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) =>
                  handleUpload(
                    "/api/upload-ss",
                    "ssFile",
                    e.target.files?.[0],
                    (ok) => {
                      setSsUploaded(ok);
                      if (ok && typeof onSSUpload === "function")
                        onSSUpload(true);
                    }
                  )
                }
              />
              {ssUploaded && (
                <p style={{ color: "green" }}>SS card successfully uploaded</p>
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                padding: 12,
                background: "#1c1c1c",
                borderRadius: 8,
              }}
            >
              <strong>Registration document status:</strong>
              <div>ID: {idUploaded ? "✓ Complete" : "Not uploaded"}</div>
              <div>W-9: {w9Uploaded ? "✓ Complete" : "Not uploaded"}</div>
              <div>SS Card: {ssUploaded ? "✓ Complete" : "Not uploaded"}</div>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
