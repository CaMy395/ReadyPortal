import React, { useEffect, useMemo, useState } from 'react';
import '../../App.css';
import ChatBox from './ChatBox';
import { useNavigate } from 'react-router-dom';

const MixNsipForm = () => {
  const navigate = useNavigate();

  const appointmentType = "Mix N' Sip (2 hours, @ $75.00)";

  const [showModal, setShowModal] = useState(false);
  const [confirmedSubmit, setConfirmedSubmit] = useState(false);

  // NEW: sessionMode included here
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    guestCount: '',
    guestDetails: [],
    addons: [],            // [{ name, price, quantity }]
    paymentMethod: '',
    howHeard: '',
    referral: '',
    referralDetails: '',
    additionalComments: '',
    apronTexts: [],
    sessionMode: 'in_person' // 'in_person' | 'virtual'
  });

  // In-person base price: $75/guest (original)
  // Virtual base price: $50/guest (NEW)
  const getBasePricePerGuest = () =>
    formData.sessionMode === 'virtual' ? 50 : 75;

  // In-person add-ons + prices (unchanged from your list)
  const IN_PERSON_ADDON_PRICES = {
    'Customize Apron': 15,
    'Patron Reusable Cup': 25,
    'Hookah with refills': 60
  };

  // Virtual add-ons + prices (NEW)
  // Bar Tools = $40 (flat)
  // Purchase Materials = $25 per person
  const VIRTUAL_ADDON_PRICES = {
    'Bar Tools': 40,
    'Purchase Materials': 25
  };

  // derive which list to show
  const visibleAddonPrices = useMemo(
    () => (formData.sessionMode === 'virtual' ? VIRTUAL_ADDON_PRICES : IN_PERSON_ADDON_PRICES),
    [formData.sessionMode]
  );

  const getBaseTotal = () => {
    const guestCount = parseInt(formData.guestCount) || 1;
    return getBasePricePerGuest() * guestCount;
  };

  const getAddonTotal = () => {
    return (formData.addons || []).reduce(
      (total, addon) => total + (Number(addon.price) || 0) * (addon.quantity || 1),
      0
    );
  };

  const getTotalPrice = () => {
    return (getBaseTotal() + getAddonTotal()).toFixed(2);
  };

  // Keep “Purchase Materials” qty synced to guest count when virtual
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
  }, [formData.sessionMode, formData.guestCount]);

  const proceedToScheduling = () => {
    const allowedNames = new Set(Object.keys(visibleAddonPrices));
    const filteredAddons = (formData.addons || []).filter(a => allowedNames.has(a.name));

    const encodedAddons = encodeURIComponent(
      btoa(
        JSON.stringify(
          filteredAddons.map(a => ({
            name: a.name,
            price: a.price,
            quantity: a.quantity
          }))
        )
      )
    );

    navigate(
      `/rb/client-scheduling?name=${encodeURIComponent(formData.fullName)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}&paymentMethod=${encodeURIComponent(formData.paymentMethod)}&price=${getTotalPrice()}&guestCount=${formData.guestCount}&appointmentType=${encodeURIComponent(appointmentType)}&addons=${encodedAddons}`,
      {
        state: {
          addons: filteredAddons,
          sessionMode: formData.sessionMode
        }
      }
    );
  };

  const handleAddonSelection = (e) => {
    const { value, checked } = e.target;
    const price = visibleAddonPrices[value];

    setFormData(prev => {
      // Start from addons that are still allowed
      const allowed = new Set(Object.keys(visibleAddonPrices));
      const sanitized = (prev.addons || []).filter(a => allowed.has(a.name));

      let updatedAddons = sanitized;

      if (checked) {
        // default quantity
        let qty = 1;

        // Virtual special: Purchase Materials = $25 per person (qty = guestCount)
        if (prev.sessionMode === 'virtual' && value === 'Purchase Materials') {
          const guestCount = Math.max(1, parseInt(prev.guestCount) || 1);
          qty = guestCount;
        }

        updatedAddons = [...sanitized, { name: value, price, quantity: qty }];
      } else {
        updatedAddons = sanitized.filter(addon => addon.name !== value);
      }

      // If we uncheck "Customize Apron", clear apron texts
      const shouldClearApron =
        prev.sessionMode === 'in_person' &&
        !updatedAddons.some(a => a.name === 'Customize Apron');

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
      // Lock quantity for virtual “Purchase Materials”
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

      // Keep apron texts in sync with apron quantity (in-person only)
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

      // If switching to virtual, clear apron texts and normalize “Purchase Materials” qty
      let nextApronTexts = newMode === 'virtual' ? [] : prev.apronTexts;

      if (newMode === 'virtual') {
        const guestCount = Math.max(1, parseInt(prev.guestCount) || 1);
        sanitizedAddons = sanitizedAddons.map(a =>
          a.name === 'Purchase Materials'
            ? { ...a, quantity: guestCount, price: VIRTUAL_ADDON_PRICES['Purchase Materials'] }
            : a
        );
      }

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmedSubmit) {
      setShowModal(true);
      return;
    }

    proceedToScheduling();

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const allowedNames = new Set(Object.keys(visibleAddonPrices));
    const filteredAddons = (formData.addons || []).filter(a => allowedNames.has(a.name));

    // If virtual, do not send apron texts
    const payload = {
      ...formData,
      addons: filteredAddons,
      apronTexts: formData.sessionMode === 'virtual' ? [] : formData.apronTexts
    };

    try {
      const response = await fetch(`${apiUrl}/api/mix-n-sip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert('Next step, schedule your appointment!');
      } else {
        throw new Error('Failed to submit form');
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      alert('Something went wrong. Try again.');
    }
  };

  // Simple segmented toggle styles
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

  return (
    <div className="intake-form-container">
      <h1>Mix N&apos; Sip Form</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Full Name*:
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
        </label>

        <label>
          Email*:
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>

        <label>
          Phone*:
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
        </label>

        {/* NEW: segmented toggle for session mode */}
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Will this session be in person or virtual? *</div>
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
          [...Array(parseInt(formData.guestCount) - 1)].map((_, idx) => (
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

        {/* Add-ons (conditioned by session mode) */}
        <label>Would you like any of our add-ons? (Select quantity below)</label>
        {Object.keys(visibleAddonPrices).map((addon) => {
          const checked = formData.addons.some(a => a.name === addon);
          const current = formData.addons.find(a => a.name === addon);
          const qty = current?.quantity || 1;
          const price = visibleAddonPrices[addon];

          // Virtual + Purchase Materials = per person, lock qty to guest count
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
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
                  auto × guests
                </span>
              )}
            </div>
          );
        })}

        {/* Apron text only when in-person AND Customize Apron selected */}
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

        <button type="submit">Submit</button>
      </form>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Confirm Your Booking</h2>
            <p>To complete your booking continue to the final payment page after scheduling</p>
            <p><strong>Name:</strong> {formData.fullName}</p>
            <p><strong>Guest Count:</strong> {formData.guestCount}</p>
            <p>
              <strong>Base:</strong> ${getBasePricePerGuest()} × {formData.guestCount} = ${getBaseTotal()}
              {formData.sessionMode === 'virtual' && (
                <span style={{ marginLeft: 6 }}>(virtual rate)</span>
              )}
            </p>
            <p><strong>Add-ons:</strong> ${getAddonTotal()}</p>
            <p><strong>Estimated Total:</strong> ${getTotalPrice()} (subject to small processing fees)</p>
            <p><strong>Session Mode:</strong> {formData.sessionMode === 'virtual' ? 'Virtual' : 'In person'}</p>
            <button
              onClick={() => {
                setConfirmedSubmit(true);
                setShowModal(false);
                setTimeout(
                  () =>
                    document
                      .querySelector('form')
                      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })),
                  0
                );
              }}
            >
              Yes, Continue
            </button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      <ChatBox />
    </div>
  );
};

export default MixNsipForm;
