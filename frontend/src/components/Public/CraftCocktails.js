import React, { useState, useMemo } from 'react';
import '../../App.css';
import ChatBox from './ChatBox';
import { useNavigate } from 'react-router-dom';

const CraftsForm = () => {
  const navigate = useNavigate();

  const basePricePerGuest = 85;
  const privateSessionFlatRate = 220;
  const privateSessionGuestThreshold = 4; // 1–3 guests use private-session pricing

  const MIN_DEPOSIT = 35;
  const READY_BAR_ADDRESS = "1030 NW 200th Terrace, Miami, FL 33169";
  const CLIENT_LOCATION_FEE_PER_PERSON = 10;
  const PRIVATE_SESSION_TRAVEL_FLAT = 25; // you can adjust (20–40 sweet spot)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    phone: '',
    eventType: '',
    guestCount: '1',
    addons: [],
    apronTexts: [],
    guestDetails: [],
    paymentMethod: 'Square',
    howHeard: '',
    referral: '',
    referralDetails: '',
    additionalComments: '',
    locationPreference: 'home',
    eventAddress: '',
    paymentPlan: false,
    depositOnly: false,
    depositAmount: ''
  });

  const isPrivateSessionPricing = () => getGuestCount() < privateSessionGuestThreshold;

  const [showModal, setShowModal] = useState(false);

  // ----------------------
  // Pricing helpers
  // ----------------------
  const getGuestCount = () => Math.max(1, parseInt(formData.guestCount, 10) || 1);

  const getBaseTotal = () => {
    const guestCount = getGuestCount();
    return isPrivateSessionPricing()
      ? privateSessionFlatRate
      : basePricePerGuest * guestCount;
  };

  const getAddonTotal = () => {
    return (formData.addons || []).reduce(
      (total, addon) => total + (Number(addon.price) || 0) * (addon.quantity || 1),
      0
    );
  };

    const getLightBitesPrice = () => {
    const count = getGuestCount();

    if (count <= 3) return 30;
    if (count <= 6) return 50;
    if (count <= 10) return 75;
    return 100;
  };

  const addonPrices = useMemo(() => ({
    "Add Light Bites to Your Experience": getLightBitesPrice(),
    "Custom Vinyl Apron Design": 15,
    "Extra Patron Bottle": 25,
    "Hookah with Refills": 60
  }), [formData.guestCount]);

  const getLocationFeeTotal = () => {
    if (formData.locationPreference !== 'client') return 0;

    const guestCount = getGuestCount();

    // Private session → flat fee
    if (isPrivateSessionPricing()) {
      return PRIVATE_SESSION_TRAVEL_FLAT;
    }

    // Group → per person
    return CLIENT_LOCATION_FEE_PER_PERSON * guestCount;
  };

  const getTotalPrice = () =>
    (getBaseTotal() + getAddonTotal() + getLocationFeeTotal()).toFixed(2);

  const getPayNowAmount = () => {
    const total = parseFloat(getTotalPrice());
    const usingDeposit = !!formData.depositOnly || !!formData.paymentPlan;

    if (!usingDeposit) return total;

    const raw = parseFloat(formData.depositAmount || '0') || 0;
    const clamped = Math.max(MIN_DEPOSIT, Math.min(raw, total));
    return Number.isFinite(clamped) ? clamped : MIN_DEPOSIT;
  };

  // ----------------------
  // Navigation to scheduling
  // ----------------------
  const proceedToScheduling = () => {
    const guestCount = getGuestCount();
    const appointmentType = isPrivateSessionPricing()
      ? "Crafts & Cocktails – Private Experience"
      : "Crafts & Cocktails – Group Experience";
    const locationAddon =
      formData.locationPreference === 'client'
        ? {
            name: isPrivateSessionPricing()
              ? 'Private Travel Fee'
              : 'Client Location Fee',
            price: isPrivateSessionPricing()
              ? PRIVATE_SESSION_TRAVEL_FLAT
              : CLIENT_LOCATION_FEE_PER_PERSON * guestCount,
            quantity: 1
          }
        : null;

    const finalAddons = locationAddon
      ? [...(formData.addons || []), locationAddon]
      : (formData.addons || []);

    const encodedAddons = encodeURIComponent(
      btoa(
        JSON.stringify(
          finalAddons.map((a) => ({
            name: a.name,
            price: a.price,
            quantity: a.quantity
          }))
        )
      )
    );

    const amountToPayNow = getPayNowAmount();

    navigate(
      `/rb/client-scheduling?` +
        `name=${encodeURIComponent(formData.fullName)}` +
        `&email=${encodeURIComponent(formData.email)}` +
        `&phone=${encodeURIComponent(formData.phone)}` +
        `&paymentMethod=${encodeURIComponent(formData.paymentMethod || 'Square')}` +
        `&price=${amountToPayNow}` +
        `&guestCount=${encodeURIComponent(formData.guestCount || 1)}` +
        `&locationPreference=${encodeURIComponent(formData.locationPreference || 'home')}` +
        `&eventAddress=${encodeURIComponent(
          formData.locationPreference === 'home'
            ? READY_BAR_ADDRESS
            : (formData.eventAddress || '')
        )}` +
        `&paymentPlan=${formData.paymentPlan ? '1' : '0'}` +
        `&appointmentType=${encodeURIComponent(appointmentType)}` +
        `&addons=${encodedAddons}` +
        `&depositOnly=${(formData.depositOnly || formData.paymentPlan) ? '1' : '0'}` +
        `&depositAmount=${encodeURIComponent(amountToPayNow.toFixed(2))}`,
      {
        state: {
          addons: finalAddons,
          depositOnly: formData.depositOnly || formData.paymentPlan,
          depositAmount: amountToPayNow,
          paymentPlan: formData.paymentPlan,
          locationPreference: formData.locationPreference,
          eventAddress:
            formData.locationPreference === 'home'
              ? READY_BAR_ADDRESS
              : (formData.eventAddress || ''),
          pricingModel: isPrivateSessionPricing() ? 'private_session' : 'per_person',
          calculatedBaseTotal: getBaseTotal(),
          calculatedOrderTotal: parseFloat(getTotalPrice())
        }
      }
    );
  };

  // ----------------------
  // Field handlers
  // ----------------------
  const handleApronTextChange = (index, value) => {
    setFormData((prev) => {
      const updatedTexts = [...prev.apronTexts];
      updatedTexts[index] = value;
      return { ...prev, apronTexts: updatedTexts };
    });
  };

  const handleGuestDetailChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedGuests = [...prev.guestDetails];
      updatedGuests[index] = { ...updatedGuests[index], [field]: value };
      return { ...prev, guestDetails: updatedGuests };
    });
  };

  const handleAddonSelection = (e) => {
    const { value, checked } = e.target;

    setFormData((prev) => {
      const price = addonPrices[value];
      const updatedAddons = checked
        ? [...prev.addons, { name: value, price, quantity: 1 }]
        : prev.addons.filter((addon) => addon.name !== value);

      const shouldClearApron =
        value === 'Take-Home Custom Vinyl Apron' &&
        !updatedAddons.some((a) => a.name === 'Take-Home Custom Vinyl Apron');

      return {
        ...prev,
        addons: updatedAddons,
        apronTexts: shouldClearApron ? [] : prev.apronTexts
      };
    });
  };

  const handleAddonQuantityChange = (addonName, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1);

    setFormData((prev) => {
      const updatedAddons = (prev.addons || []).map((addon) =>
        addon.name === addonName ? { ...addon, quantity: qty } : addon
      );

      const updatedAprons =
        addonName === "Take-Home Custom Vinyl Apron"
          ? Array(qty).fill('').map((_, i) => prev.apronTexts[i] || '')
          : prev.apronTexts;

      return { ...prev, addons: updatedAddons, apronTexts: updatedAprons };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ----------------------
  // Submit
  // ----------------------
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (formData.email !== formData.confirmEmail) {
      alert('Emails do not match.');
      return;
    }

    if (formData.depositOnly || formData.paymentPlan) {
      const total = parseFloat(getTotalPrice());
      const val = parseFloat(formData.depositAmount || '0') || 0;

      if (val < MIN_DEPOSIT) {
        alert(`Minimum deposit is $${MIN_DEPOSIT}.`);
        return;
      }

      if (val > total) {
        alert(`Deposit cannot exceed total of $${total.toFixed(2)}.`);
        return;
      }
    }

    proceedToScheduling();

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    try {
      const guestCount = getGuestCount();

      const locationAddon =
        formData.locationPreference === 'client'
          ? {
              name: isPrivateSessionPricing()
                ? 'Private Travel Fee'
                : 'Client Location Fee',
              price: isPrivateSessionPricing()
                ? PRIVATE_SESSION_TRAVEL_FLAT
                : CLIENT_LOCATION_FEE_PER_PERSON * guestCount,
              quantity: 1
            }
          : null;

      const baseAddons = formData.addons || [];
      const finalAddons = locationAddon ? [...baseAddons, locationAddon] : baseAddons;

      const payload = {
        ...formData,
        paymentPlan: !!formData.paymentPlan,
        locationPreference: formData.locationPreference,
        eventAddress:
          formData.locationPreference === 'home'
            ? READY_BAR_ADDRESS
            : (formData.eventAddress || ''),
        addons: finalAddons,
        apronTexts: (formData.addons || []).some((a) => a.name === 'Take-Home Custom Vinyl Apron')
          ? formData.apronTexts
          : [],
        pricingModel: isPrivateSessionPricing() ? 'private_session' : 'per_person',
        calculatedBaseTotal: getBaseTotal(),
        calculatedAddonTotal: getAddonTotal(),
        calculatedLocationFeeTotal: getLocationFeeTotal(),
        calculatedOrderTotal: parseFloat(getTotalPrice())
      };

      const response = await fetch(`${apiUrl}/api/craft-cocktails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to submit form');
    } catch (error) {
      console.error('❌ Submission error:', error);
    }
  };

  // ----------------------
  // Computed UI values
  // ----------------------
  const guestCount = getGuestCount();
  const usingPrivatePricing = isPrivateSessionPricing();
  const totalNow = getPayNowAmount().toFixed(2);
  const orderTotal = parseFloat(getTotalPrice()).toFixed(2);

  return (
    <div className="intake-form-container">
      <h1>Crafts and Cocktails Form</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Full Name*:
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Email*:
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
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
          <p style={{ color: 'red', fontSize: 13 }}>Emails do not match</p>
        )}

        <label>
          Phone*:
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </label>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Location Preference</h3>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name="locationPreference"
              value="home"
              checked={formData.locationPreference === 'home'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  locationPreference: e.target.value,
                  eventAddress: ''
                }))
              }
            />
            Home (Ready Bar Location): <strong>{READY_BAR_ADDRESS}</strong>
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input
              type="radio"
              name="locationPreference"
              value="client"
              checked={formData.locationPreference === 'client'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  locationPreference: e.target.value
                }))
              }
            />
            Client’s Location (+${CLIENT_LOCATION_FEE_PER_PERSON}/person)
          </label>

          {formData.locationPreference === 'client' && (
            <label style={{ marginTop: 10, display: 'block' }}>
              Event Address*
              <input
                type="text"
                name="eventAddress"
                value={formData.eventAddress}
                onChange={handleChange}
                placeholder="Street, City, State ZIP"
                required
              />
            </label>
          )}
        </div>

        <label>
          How many guests will be attending? *
          <input
            type="number"
            name="guestCount"
            value={formData.guestCount}
            onChange={handleChange}
            min="1"
            required
          />
        </label>

        {usingPrivatePricing && (
          <div
            className="card"
            style={{
              marginTop: 10,
              marginBottom: 12,
              padding: 12,
              border: '1px solid rgba(255,255,255,0.15)'
            }}
          >
            <strong>Private experience pricing applied.</strong>
            <p style={{ margin: '6px 0 0 0' }}>
              Smaller groups are booked as a private session at a flat rate of $
              {privateSessionFlatRate.toFixed(2)}.
            </p>
          </div>
        )}

        {guestCount > 1 &&
          [...Array(Math.max(0, guestCount - 1))].map((_, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <h4>Guest {idx + 2}</h4>
              <input
                type="text"
                placeholder="Full Name"
                onChange={(e) => handleGuestDetailChange(idx, 'fullName', e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                onChange={(e) => handleGuestDetailChange(idx, 'email', e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone"
                onChange={(e) => handleGuestDetailChange(idx, 'phone', e.target.value)}
              />
            </div>
          ))}

        <label>Would you like any of our add-ons? (Select quantity below)</label>

        {Object.keys(addonPrices).map((addon) => {
          const checked = (formData.addons || []).some((a) => a.name === addon);
          const current = (formData.addons || []).find((a) => a.name === addon);
          const qty = current?.quantity || 1;
          const price = addonPrices[addon];

          return (
            <div
              key={addon}
              style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
            >
              <input
                type="checkbox"
                id={addon}
                value={addon}
                checked={checked}
                onChange={handleAddonSelection}
              />
              <label htmlFor={addon} style={{ marginLeft: "8px" }}>
                {addon === "Light Bites Experience"
                  ? `${addon} (starting at $30)`
                  : `${addon} (+$${price})`}
              </label>
              <input
                type="number"
                min="1"
                disabled={!checked}
                value={qty}
                onChange={(e) => handleAddonQuantityChange(addon, parseInt(e.target.value, 10))}
                style={{ width: "60px", marginLeft: "10px" }}
              />
            </div>
          );
        })}

        {(formData.addons || []).some((a) => a.name === "Take-Home Custom Vinyl Apron") && (
          <div>
            <label>What would you like added to each apron? Please include wording and color preference (2 Colors Max).</label>
            {[...Array((formData.addons.find((a) => a.name === "Take-Home Custom Vinyl Apron")?.quantity || 1))].map((_, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Apron ${i + 1} text`}
                value={formData.apronTexts[i] || ''}
                onChange={(e) => handleApronTextChange(i, e.target.value)}
                required
              />
            ))}
          </div>
        )}

        <label>
          Anything else you’d like us to know? *
          <input
            type="text"
            name="additionalComments"
            value={formData.additionalComments}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          How did you hear about us? *
          <select
            name="howHeard"
            value={formData.howHeard}
            onChange={handleChange}
            required
          >
            <option value="">Select</option>
            <option value="Friend">Referred by a Friend</option>
            <option value="Advertisement">Advertisement</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Google">Google</option>
            <option value="Other">Other</option>
          </select>
        </label>

        {formData.howHeard === 'Friend' && (
          <label>
            Who referred you?
            <input
              type="text"
              name="referral"
              value={formData.referral}
              onChange={handleChange}
              required
            />
          </label>
        )}

        {formData.howHeard === 'Other' && (
          <label>
            If other, please elaborate.
            <textarea
              name="referralDetails"
              value={formData.referralDetails}
              onChange={handleChange}
              required
            />
          </label>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Payment Options</h3>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!formData.depositOnly}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  depositOnly: e.target.checked,
                  depositAmount: e.target.checked ? prev.depositAmount : ''
                }))
              }
            />
            Pay a deposit now (choose amount)
          </label>

          {(formData.depositOnly || formData.paymentPlan) && (
            <div style={{ marginTop: 10 }}>
              <label>
                Deposit amount (min ${MIN_DEPOSIT}, max ${getTotalPrice()}):
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN_DEPOSIT}
                  max={getTotalPrice()}
                  step="0.01"
                  value={formData.depositAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    const cleaned = v.replace(/[^\d.]/g, '');
                    setFormData((prev) => ({ ...prev, depositAmount: cleaned }));
                  }}
                  required
                  style={{ marginLeft: 8 }}
                />
              </label>

              {(() => {
                const tot = parseFloat(getTotalPrice());
                const val = parseFloat(formData.depositAmount || '0') || 0;

                if (val && val < MIN_DEPOSIT) {
                  return <p style={{ color: 'red', marginTop: 6 }}>Minimum deposit is ${MIN_DEPOSIT}.</p>;
                }
                if (val && val > tot) {
                  return (
                    <p style={{ color: 'red', marginTop: 6 }}>
                      Deposit can’t exceed your total (${tot.toFixed(2)}).
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <p style={{ marginTop: 10 }}>
            You’ll pay now: <strong>${totalNow}</strong> &nbsp;|&nbsp; Order total:{' '}
            <strong>${orderTotal}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="primary-btn"
          style={{ marginTop: 16 }}
        >
          Continue to Scheduling & Payment
        </button>
      </form>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Your Booking</h2>
            <p>To complete your booking continue to the final payment page after scheduling.</p>
            <p><strong>Name:</strong> {formData.fullName}</p>
            <p><strong>Guest Count:</strong> {formData.guestCount}</p>

            {usingPrivatePricing ? (
              <p>
                <strong>Base:</strong> Private experience rate for {guestCount} guest
                {guestCount > 1 ? 's' : ''} = ${getBaseTotal().toFixed(2)}
              </p>
            ) : (
              <p>
                <strong>Base:</strong> ${basePricePerGuest} × {guestCount} = ${getBaseTotal().toFixed(2)}
              </p>
            )}

            <p><strong>Add-ons:</strong> ${getAddonTotal().toFixed(2)}</p>
            <p>
              <strong>Location:</strong>{' '}
              {formData.locationPreference === 'home'
                ? READY_BAR_ADDRESS
                : (formData.eventAddress || 'Client location')}
            </p>
            <p><strong>Client location fee:</strong> ${getLocationFeeTotal().toFixed(2)}</p>
            <p><strong>Estimated Total:</strong> ${orderTotal} (subject to small processing fees)</p>
            <p><strong>Will pay now:</strong> ${totalNow}</p>

            <div className="modal-actions">
              <button
                className="modal-button use"
                onClick={() => {
                  setShowModal(false);
                  setTimeout(() => handleSubmit(), 0);
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

export default CraftsForm;