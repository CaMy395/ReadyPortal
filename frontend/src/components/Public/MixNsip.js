import React, { useEffect, useMemo, useState } from 'react';
import '../../App.css';
import { useNavigate } from 'react-router-dom';

const MixNsip = () => {
  const navigate = useNavigate();

  // Display name used downstream for appointmentType
  const appointmentType = "Mix N' Sip (2 hours, @ $75.00)";

  // Minimum deposit constraint
  const MIN_DEPOSIT = 35;
  const READY_BAR_ADDRESS = "1030 NW 200th Terrace, Miami, FL 33169";
  const CLIENT_LOCATION_FEE_PER_PERSON = 10;

  // -----------------------
  // State
  // -----------------------
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    guestCount: '1',
    guestDetails: [],
    addons: [],
    paymentMethod: 'Square',
    howHeard: '',
    referral: '',
    referralDetails: '',
    additionalComments: '',
    apronTexts: [],
    sessionMode: 'in_person', // 'in_person' | 'virtual'

    // NEW (location)
    locationPreference: 'home', // 'home' | 'client'
    eventAddress: '',

    // NEW (payment plan)
    paymentPlan: false,

    // NEW (deposits)
    depositOnly: false,
    depositAmount: '' // string to allow partial typing; we clamp on submit
  });

  // -----------------------
  // Pricing
  // -----------------------
  const getBasePricePerGuest = () =>
    formData.sessionMode === 'virtual' ? 50 : 75;

  const IN_PERSON_ADDON_PRICES = {
    'Customize Apron': 15,
    'Patron Reusable Cup': 25,
    'Hookah with refills': 60
  };

  const VIRTUAL_ADDON_PRICES = {
    'Bar Tools': 40,
    'Purchase Materials': 25 // per person (auto = guestCount)
  };

  const visibleAddonPrices = useMemo(
    () => (formData.sessionMode === 'virtual' ? VIRTUAL_ADDON_PRICES : IN_PERSON_ADDON_PRICES),
    [formData.sessionMode]
  );

  const getBaseTotal = () => {
    const guestCount = Math.max(1, parseInt(formData.guestCount) || 1);
    return getBasePricePerGuest() * guestCount;
  };

  const getAddonTotal = () => {
    return (formData.addons || []).reduce(
      (total, addon) => total + (Number(addon.price) || 0) * (addon.quantity || 1),
      0
    );
  };

  const getLocationFeeTotal = () => {
    if (formData.sessionMode !== 'in_person') return 0;
    const guestCount = Math.max(1, parseInt(formData.guestCount) || 1);
    return formData.locationPreference === 'client'
      ? CLIENT_LOCATION_FEE_PER_PERSON * guestCount
      : 0;
  };

  const getTotalPrice = () => (getBaseTotal() + getAddonTotal() + getLocationFeeTotal()).toFixed(2);

  // Amount the client will pay *now* (deposit or full)
  const getPayNowAmount = () => {
    const total = parseFloat(getTotalPrice());

    // Payment plan always behaves like a deposit now (we save card on file later in the flow)
    const usingDeposit = !!formData.depositOnly || !!formData.paymentPlan;
    if (!usingDeposit) return total;

    const raw = parseFloat(formData.depositAmount || '0') || 0;
    const clamped = Math.max(MIN_DEPOSIT, Math.min(raw, total));
    return Number.isFinite(clamped) ? clamped : MIN_DEPOSIT;
  };

  // -----------------------
  // Effects
  // -----------------------

  // Keep "Purchase Materials" quantity synced to guestCount when virtual
  useEffect(() => {
    if (formData.sessionMode !== 'virtual') return;
    const guestCount = Math.max(1, parseInt(formData.guestCount) || 1);
    setFormData(prev => {
      const updated = (prev.addons || []).map(a => {
        if (a.name === 'Purchase Materials') {
          return { ...a, quantity: guestCount, price: VIRTUAL_ADDON_PRICES['Purchase Materials'] };
        }
        return a;
      });
      return { ...prev, addons: updated };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sessionMode, formData.guestCount]);

  // -----------------------
  // Handlers
  // -----------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setSessionMode = (newMode) => {
    setFormData(prev => {
      const allowed = new Set(
        Object.keys(newMode === 'virtual' ? VIRTUAL_ADDON_PRICES : IN_PERSON_ADDON_PRICES)
      );
      let sanitizedAddons = (prev.addons || []).filter(a => allowed.has(a.name));
      let nextApronTexts = newMode === 'virtual' ? [] : prev.apronTexts;

      if (newMode === 'virtual') {
        const guestCount = Math.max(1, parseInt(prev.guestCount) || 1);
        sanitizedAddons = sanitizedAddons.map(a =>
          a.name === 'Purchase Materials'
            ? { ...a, quantity: guestCount, price: VIRTUAL_ADDON_PRICES['Purchase Materials'] }
            : a
        );
      }

      // If switching to virtual, location fee doesn’t apply, and location UI hides anyway.
      return {
        ...prev,
        sessionMode: newMode,
        addons: sanitizedAddons,
        apronTexts: nextApronTexts
      };
    });
  };

  const handleGuestDetailChange = (index, field, value) => {
    setFormData(prev => {
      const updatedGuests = [...prev.guestDetails];
      updatedGuests[index] = { ...updatedGuests[index], [field]: value };
      return { ...prev, guestDetails: updatedGuests };
    });
  };

  const handleAddonSelection = (e) => {
    const { value, checked } = e.target;
    const price = visibleAddonPrices[value];

    setFormData(prev => {
      const allowed = new Set(Object.keys(visibleAddonPrices));
      const sanitized = (prev.addons || []).filter(a => allowed.has(a.name));
      let updatedAddons = sanitized;

      if (checked) {
        let qty = 1;
        if (prev.sessionMode === 'virtual' && value === 'Purchase Materials') {
          const guestCount = Math.max(1, parseInt(prev.guestCount) || 1);
          qty = guestCount;
        }
        updatedAddons = [...sanitized, { name: value, price, quantity: qty }];
      } else {
        updatedAddons = sanitized.filter(addon => addon.name !== value);
      }

      const shouldClearApron =
        prev.sessionMode === 'in_person' && !updatedAddons.some(a => a.name === 'Customize Apron');

      return {
        ...prev,
        addons: updatedAddons,
        apronTexts: shouldClearApron ? [] : prev.apronTexts
      };
    });
  };

  const handleAddonQuantityChange = (addonName, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setFormData(prev => {
      if (prev.sessionMode === 'virtual' && addonName === 'Purchase Materials') {
        const guestCount = Math.max(1, parseInt(prev.guestCount) || 1);
        const updatedForVirtualPM = (prev.addons || []).map(addon =>
          addon.name === 'Purchase Materials'
            ? { ...addon, quantity: guestCount, price: VIRTUAL_ADDON_PRICES['Purchase Materials'] }
            : addon
        );
        return { ...prev, addons: updatedForVirtualPM };
      }
      const updatedAddons = (prev.addons || []).map(addon =>
        addon.name === addonName ? { ...addon, quantity: qty } : addon
      );
      const updatedAprons =
        addonName === 'Customize Apron' && prev.sessionMode === 'in_person'
          ? Array(qty)
              .fill('')
              .map((_, i) => prev.apronTexts[i] || '')
          : prev.apronTexts;

      return { ...prev, addons: updatedAddons, apronTexts: updatedAprons };
    });
  };

  const handleApronTextChange = (index, value) => {
    setFormData(prev => {
      const updatedTexts = [...prev.apronTexts];
      updatedTexts[index] = value;
      return { ...prev, apronTexts: updatedTexts };
    });
  };

  // -----------------------
  // Navigation to scheduling (passes deposit info forward)
  // -----------------------
  const proceedToScheduling = () => {
    const allowedNames = new Set(Object.keys(visibleAddonPrices));
    const filteredAddons = (formData.addons || []).filter(a => allowedNames.has(a.name));

    // Add auto location fee line item if they chose client location (in-person only)
    const guestCount = Math.max(1, parseInt(formData.guestCount) || 1);
    const locationAddon =
      formData.sessionMode === 'in_person' && formData.locationPreference === 'client'
        ? { name: 'Client Location Fee', price: CLIENT_LOCATION_FEE_PER_PERSON * guestCount, quantity: 1 }
        : null;

    const finalAddons = locationAddon ? [...filteredAddons, locationAddon] : filteredAddons;

    // Encode addons compactly
    const encodedAddons = encodeURIComponent(
      btoa(
        JSON.stringify(
          finalAddons.map(a => ({
            name: a.name,
            price: a.price,
            quantity: a.quantity
          }))
        )
      )
    );

    // Amount to charge now
    const amountToPayNow = getPayNowAmount();

    navigate(
      `/rb/client-scheduling` +
        `?name=${encodeURIComponent(formData.fullName)}` +
        `&email=${encodeURIComponent(formData.email)}` +
        `&phone=${encodeURIComponent(formData.phone)}` +
        `&paymentMethod=${encodeURIComponent(formData.paymentMethod || 'Square')}` +
        `&price=${amountToPayNow}` +
        `&guestCount=${encodeURIComponent(formData.guestCount || 1)}` +
        `&locationPreference=${encodeURIComponent(formData.locationPreference || 'home')}` +
        `&eventAddress=${encodeURIComponent(formData.locationPreference === 'home' ? READY_BAR_ADDRESS : (formData.eventAddress || ''))}` +
        `&paymentPlan=${formData.paymentPlan ? '1' : '0'}` +
        `&appointmentType=${encodeURIComponent(appointmentType)}` +
        `&addons=${encodedAddons}` +
        `&depositOnly=${(formData.depositOnly || formData.paymentPlan) ? '1' : '0'}` +
        `&depositAmount=${encodeURIComponent(amountToPayNow.toFixed(2))}`,
      {
        state: {
          addons: finalAddons,
          sessionMode: formData.sessionMode,
          depositOnly: formData.depositOnly || formData.paymentPlan,
          depositAmount: amountToPayNow,
          paymentPlan: formData.paymentPlan,
          locationPreference: formData.locationPreference,
          eventAddress: (formData.locationPreference === 'home' ? READY_BAR_ADDRESS : (formData.eventAddress || ''))
        }
      }
    );
  };

  // -----------------------
  // Submit
  // -----------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate deposit constraints if selected
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

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    try {
      const allowedNames = new Set(Object.keys(visibleAddonPrices));
      const filteredAddons = (formData.addons || []).filter(a => allowedNames.has(a.name));

      const guestCount = Math.max(1, parseInt(formData.guestCount) || 1);
      const locationAddon =
        formData.sessionMode === 'in_person' && formData.locationPreference === 'client'
          ? { name: 'Client Location Fee', price: CLIENT_LOCATION_FEE_PER_PERSON * guestCount, quantity: 1 }
          : null;

      const finalAddons = locationAddon ? [...filteredAddons, locationAddon] : filteredAddons;

      const payload = {
        ...formData,
        paymentPlan: !!formData.paymentPlan,
        locationPreference: formData.locationPreference,
        eventAddress: formData.locationPreference === 'home' ? READY_BAR_ADDRESS : (formData.eventAddress || ''),
        addons: finalAddons,
        apronTexts: formData.sessionMode === 'virtual' ? [] : formData.apronTexts
      };

      fetch(`${apiUrl}/api/mix-n-sip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {
      // swallow errors; scheduling continues regardless
    }

    proceedToScheduling();
  };

  // -----------------------
  // UI helpers
  // -----------------------
  const toggleWrap = {
    display: 'inline-flex',
    border: '1px solid #ddd',
    borderRadius: '9999px',
    overflow: 'hidden',
    margin: '8px 0'
  };
  const toggleBtn = (active) => ({
    padding: '8px 14px',
    cursor: 'pointer',
    border: 'none',
    background: active ? '#111' : 'transparent',
    color: active ? '#fff' : '#111',
    fontWeight: 600
  });

  const totalNow = getPayNowAmount().toFixed(2);
  const orderTotal = parseFloat(getTotalPrice()).toFixed(2);

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="intake-form-container">
      <h1>Mix N&apos; Sip Form</h1>

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
          Phone*:
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </label>

        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>
            Will this session be in person or virtual? *
          </div>
          <div style={toggleWrap} role="tablist" aria-label="Session mode">
            <button
              type="button"
              role="tab"
              aria-selected={formData.sessionMode === 'in_person'}
              onClick={() => setSessionMode('in_person')}
              style={toggleBtn(formData.sessionMode === 'in_person')}
            >
              In person
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={formData.sessionMode === 'virtual'}
              onClick={() => setSessionMode('virtual')}
              style={toggleBtn(formData.sessionMode === 'virtual')}
            >
              Virtual
            </button>
          </div>
        </div>

        {formData.sessionMode === 'in_person' && (
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
        )}

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

        {parseInt(formData.guestCount) > 1 &&
          [...Array(Math.max(0, parseInt(formData.guestCount) - 1))].map((_, idx) => (
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
        {Object.keys(visibleAddonPrices).map((addon) => {
          const checked = formData.addons.some(a => a.name === addon);
          const current = formData.addons.find(a => a.name === addon);
          const qty = current?.quantity || 1;
          const price = visibleAddonPrices[addon];
          const isVirtualPerPerson = formData.sessionMode === 'virtual' && addon === 'Purchase Materials';
          const guestCount = Math.max(1, parseInt(formData.guestCount) || 1);
          const lockedQty = isVirtualPerPerson ? guestCount : qty;

          return (
            <div key={addon} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="checkbox"
                id={addon}
                value={addon}
                checked={checked}
                onChange={handleAddonSelection}
              />
              <label htmlFor={addon} style={{ marginLeft: 8 }}>
                {addon}{' '}
                {formData.sessionMode === 'virtual' && addon === 'Purchase Materials'
                  ? `(+$${price} per person)`
                  : `(+$${price})`}
              </label>
              <input
                type="number"
                min="1"
                disabled={!checked || isVirtualPerPerson}
                value={lockedQty}
                onChange={(e) => handleAddonQuantityChange(addon, parseInt(e.target.value))}
                style={{ width: 60, marginLeft: 10 }}
              />
              {isVirtualPerPerson && checked && (
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>auto × guests</span>
              )}
            </div>
          );
        })}

        {formData.sessionMode === 'in_person' &&
          formData.addons.some(a => a.name === 'Customize Apron') && (
            <div>
              <label>What would you like printed on each apron? color?</label>
              {[...Array(formData.addons.find(a => a.name === 'Customize Apron')?.quantity || 1)].map((_, i) => (
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
          <select name="howHeard" value={formData.howHeard} onChange={handleChange} required>
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

        {/* ---------------------- */}
        {/* PAYMENT OPTIONS (Deposit + Payment Plan) */}
        {/* ---------------------- */}
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={!!formData.paymentPlan}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentPlan: e.target.checked,
                  // payment plan = deposit now + card-on-file next
                  depositOnly: e.target.checked ? true : prev.depositOnly,
                  depositAmount: e.target.checked
                    ? (prev.depositAmount || String(MIN_DEPOSIT))
                    : prev.depositAmount
                }))
              }
            />
            Payment plan (we’ll save your card on file for scheduled charges)
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

        <button type="submit" className="primary-btn" style={{ marginTop: 16 }}>
          Continue to Scheduling & Payment
        </button>
      </form>
    </div>
  );
};

export default MixNsip;
