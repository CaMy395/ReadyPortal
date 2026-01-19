import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import '../../App.css';
import ChatBox from './ChatBox';

const ADDON_CATALOG = [
  { key: 'bartender', label: 'Bartender', type: 'staff' },
  { key: 'server', label: 'Server', type: 'staff' },
  { key: 'barback', label: 'BarBack', type: 'staff' },
  { key: 'helpstaff', label: 'Help Staff', type: 'staff' },

  { key: 'drink_toppers', label: 'Drink Toppers', type: 'addon' },
  { key: 'ready_bar', label: 'Ready Bar', type: 'addon' },
  { key: 'quick_bar', label: 'Quick Bar', type: 'addon' },
  { key: 'ninja', label: 'Ninja Slushi', type: 'addon' },
  { key: 'dry_ice', label: 'Dry Ice', type: 'addon' },
  { key: 'mixers', label: 'Mixers', type: 'addon' },
  { key: 'liquor', label: 'Liquor', type: 'addon' },
  { key: 'hookah', label: 'Hookah', type: 'addon' },
  { key: 'round_high_tables', label: 'Round High Tables', type: 'addon' },
  { key: 'round_high_tables_cover', label: 'Round High Tables w/ Cover', type: 'addon' },
  { key: 'signature_cocktails', label: 'Signature Cocktails', type: 'addon' },
];

function AddonsPicker({ service, addons, setAddons }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [qty, setQty] = useState(1);

  const isEventStaffing = (service || '').toLowerCase().includes('event staffing');
  const isCustom = (service || '').toLowerCase().includes('custom package');

  const visibleOptions = useMemo(() => {
    if (isEventStaffing) return ADDON_CATALOG.filter((x) => x.type === 'staff');
    if (isCustom) return ADDON_CATALOG;
    return ADDON_CATALOG;
  }, [isEventStaffing, isCustom]);

  const addItem = () => {
    if (!selectedKey) return;

    const item = visibleOptions.find((x) => x.key === selectedKey);
    if (!item) return;

    const cleanQty = Math.max(1, parseInt(qty, 10) || 1);

    const existing = addons.find((a) => a.key === selectedKey);
    let next;

    if (existing) {
      next = addons.map((a) =>
        a.key === selectedKey ? { ...a, qty: (a.qty || 1) + cleanQty } : a
      );
    } else {
      next = [...addons, { key: item.key, name: item.label, qty: cleanQty }];
    }

    setAddons(next);
    setSelectedKey('');
    setQty(1);
  };

  const updateQty = (key, nextQty) => {
    const q = Math.max(1, parseInt(nextQty, 10) || 1);
    setAddons(addons.map((a) => (a.key === key ? { ...a, qty: q } : a)));
  };

  const removeItem = (key) => setAddons(addons.filter((a) => a.key !== key));

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Add-on</div>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8 }}
          >
            <option value="">Select an option</option>
            {visibleOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: 140 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Quantity</div>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8 }}
          />
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={!selectedKey}
          style={{ padding: '10px 14px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
        >
          Add
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        {addons.length === 0 ? (
          <div style={{ opacity: 0.8, fontSize: 14 }}>No add-ons selected.</div>
        ) : (
          addons.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 10,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <div style={{ fontWeight: 700 }}>{item.name}</div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(e) => updateQty(item.key, e.target.value)}
                  style={{ width: 80, padding: 8, borderRadius: 8 }}
                />
                <button type="button" onClick={() => removeItem(item.key)}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isEventStaffing && addons.length === 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: '#ffcccc' }}>
          *Event Staffing requires at least one staff selection.
        </div>
      )}
    </div>
  );
}

const IntakeForm = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const selectedService = params.get('service') || '';
  const baseService = selectedService || '';

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    confirmEmail: '',
    phone: '',
    date: '',
    time: '',
    entityType: '',
    businessName: '',
    firstTimeBooking: '',
    eventType: selectedService,
    ageRange: '',
    eventName: '',
    eventLocation: '',
    genderMatters: '',
    preferredGender: '',
    openBar: '',
    locationFeatures: [],
    staffAttire: '',
    eventDuration: '',
    onSiteParking: '',
    localParking: '',
    additionalPrepTime: '', // will be converted to boolean on submit
    ndaRequired: '',
    foodCatering: '',
    guestCount: '',
    homeOrVenue: '',
    venueName: '',
    bartendingLicenseRequired: '',
    insuranceRequired: '',
    liquorLicenseRequired: '',
    indoorsEvent: '',
    budget: '',
    addons: [],
    howHeard: '',
    referral: '',
    referralDetails: '',
    additionalComments: '',
    service: selectedService,
  });

  useEffect(() => {
    if (selectedService) {
      setFormData((prev) => ({
        ...prev,
        eventType: selectedService,
        service: selectedService,
      }));
    }
  }, [selectedService]);

  const isEventStaffing = (formData.service || formData.eventType || '')
    .toLowerCase()
    .includes('event staffing');

  const hasStaffSelection = formData.addons.some((a) =>
    /bartender|server|barback|help staff/i.test(String(a?.name || a?.key || ''))
  );

  const handleChange = (e) => {
    const { name, value, multiple, options } = e.target;

    if (multiple) {
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);

      setFormData((prev) => ({ ...prev, [name]: selectedOptions }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEventTypeChange = (e) => {
    const inputValue = e.target.value;
    if (!inputValue.startsWith(baseService)) return;

    setFormData((prev) => ({
      ...prev,
      eventType: inputValue,
      service: baseService || inputValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    // ✅ hard blocks so backend doesn't 400 on clients
    if (formData.email !== formData.confirmEmail) {
      alert('Emails do not match.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.locationFeatures || formData.locationFeatures.length === 0) {
      alert('Please select at least one location feature.');
      setIsSubmitting(false);
      return;
    }

    if (isEventStaffing && !hasStaffSelection) {
      alert('Event Staffing requires at least 1 staff selection (Bartender/Server/BarBack/Help Staff).');
      setIsSubmitting(false);
      return;
    }

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // ✅ convert yes/no select values to strict booleans so backend stops rejecting null/strings
    const payload = {
      ...formData,
      additionalPrepTime: String(formData.additionalPrepTime).toLowerCase() === 'yes',
      ndaRequired: String(formData.ndaRequired).toLowerCase() === 'yes',
      foodCatering: String(formData.foodCatering).toLowerCase() === 'yes',
      bartendingLicenseRequired: String(formData.bartendingLicenseRequired).toLowerCase() === 'yes',
      insuranceRequired: String(formData.insuranceRequired).toLowerCase() === 'yes',
      liquorLicenseRequired: String(formData.liquorLicenseRequired).toLowerCase() === 'yes',
      indoorsEvent: String(formData.indoorsEvent).toLowerCase() === 'yes',
    };

    try {
      console.log('📤 Intake form payload:', payload);

      const resp = await fetch(`${apiUrl}/api/intake-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      console.log('📥 Intake form response:', resp.status, data);

      if (!resp.ok) {
        throw new Error(
          data?.error || data?.details || data?.message || data?.raw || `Request failed (${resp.status})`
        );
      }

      alert('Form submitted successfully!');

      // optional: reset form (keep service)
      setFormData((prev) => ({
        ...prev,
        fullName: '',
        email: '',
        confirmEmail: '',
        phone: '',
        date: '',
        time: '',
        entityType: '',
        businessName: '',
        firstTimeBooking: '',
        eventType: selectedService,
        ageRange: '',
        eventName: '',
        eventLocation: '',
        genderMatters: '',
        preferredGender: '',
        openBar: '',
        locationFeatures: [],
        staffAttire: '',
        eventDuration: '',
        onSiteParking: '',
        localParking: '',
        additionalPrepTime: '',
        ndaRequired: '',
        foodCatering: '',
        guestCount: '',
        homeOrVenue: '',
        venueName: '',
        bartendingLicenseRequired: '',
        insuranceRequired: '',
        liquorLicenseRequired: '',
        indoorsEvent: '',
        budget: '',
        addons: [],
        howHeard: '',
        referral: '',
        referralDetails: '',
        additionalComments: '',
        service: selectedService,
      }));
    } catch (err) {
      console.error('❌ Error handling form submission:', err);
      alert(err?.message || 'Failed to submit the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="intake-form-container">
      <h1>Client Intake Form</h1>

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
          Confirm Email*:
          <input type="email" name="confirmEmail" value={formData.confirmEmail} onChange={handleChange} required />
        </label>

        {formData.confirmEmail && formData.email !== formData.confirmEmail && (
          <p style={{ color: 'red', fontSize: 13 }}>Emails do not match</p>
        )}

        <label>
          Phone*:
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
        </label>

        <label>
          Date*:
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </label>

        <label>
          Time*:
          <input type="time" name="time" value={formData.time} onChange={handleChange} required />
        </label>

        <label>
          What type of entity are you? *
          <select name="entityType" value={formData.entityType} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="Individual">Individual</option>
            <option value="Business">Business</option>
          </select>
        </label>

        {formData.entityType === 'Business' && (
          <label>
            What is the name of your business? *
            <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required />
          </label>
        )}

        <label>
          Is this your first time booking? *
          <select name="firstTimeBooking" value={formData.firstTimeBooking} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          What type of event is this? You can add text to selected service *
          <input type="text" name="eventType" value={formData.eventType} onChange={handleEventTypeChange} required />
        </label>

        <label>
          What is the age range for this event? *
          <input type="text" name="ageRange" value={formData.ageRange} onChange={handleChange} required />
        </label>

        <label>
          Name of the Event:
          <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} />
        </label>

        <label>
          What is the event location&apos;s FULL address? *
          <input name="eventLocation" value={formData.eventLocation} onChange={handleChange} required />
        </label>

        <label>
          Does gender matter? *
          <select name="genderMatters" value={formData.genderMatters} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        {formData.genderMatters === 'yes' && (
          <label>
            If so, which gender would you prefer?
            <select name="preferredGender" value={formData.preferredGender} onChange={handleChange}>
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </label>
        )}

        <label>
          Will this be an open bar event? *
          <select name="openBar" value={formData.openBar} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Will the location have any of the following? (hold Ctrl to select multiple options)*
          <select name="locationFeatures" multiple value={formData.locationFeatures} onChange={handleChange}>
            <option value="Built-in Bar">Built-in Bar</option>
            <option value="Sink">Sink</option>
            <option value="Refrigerator/Cooler">Refrigerator/Cooler</option>
            <option value="Ice">Ice</option>
            <option value="None of the above">None of the above</option>
          </select>
        </label>

        <label>
          What is the attire for the staff? *
          <select name="staffAttire" value={formData.staffAttire} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="sexy">Sexy</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
            <option value="custom">Client Provided</option>
          </select>
        </label>

        <label>
          How many hours is the staff needed? *
          <input type="number" name="eventDuration" value={formData.eventDuration} onChange={handleChange} required />
        </label>

        <label>
          Is there on-site parking? *
          <select name="onSiteParking" value={formData.onSiteParking} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        {formData.onSiteParking === 'no' && (
          <label>
            If not, is there local parking or street parking?
            <textarea name="localParking" value={formData.localParking} onChange={handleChange} />
          </label>
        )}

        <label>
          Is additional prep time required? *
          <select name="additionalPrepTime" value={formData.additionalPrepTime} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Will an NDA be required? *
          <select name="ndaRequired" value={formData.ndaRequired} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Do you need food catering services? *
          <select name="foodCatering" value={formData.foodCatering} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          How many guests will be attending? *
          <input type="number" name="guestCount" value={formData.guestCount} onChange={handleChange} required />
        </label>

        <label>
          Is this a home or venue? *
          <input type="text" name="homeOrVenue" value={formData.homeOrVenue} onChange={handleChange} required />
        </label>

        {String(formData.homeOrVenue || '').toLowerCase() === 'venue' && (
          <label>
            If venue, what&apos;s the name?
            <input type="text" name="venueName" value={formData.venueName} onChange={handleChange} />
          </label>
        )}

        <label>
          Does the venue require a bartending license? *
          <select
            name="bartendingLicenseRequired"
            value={formData.bartendingLicenseRequired}
            onChange={handleChange}
            required
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Does this event require insurance? *
          <select
            name="insuranceRequired"
            value={formData.insuranceRequired}
            onChange={handleChange}
            required
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Will a liquor license be required? *
          <select
            name="liquorLicenseRequired"
            value={formData.liquorLicenseRequired}
            onChange={handleChange}
            required
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Will this event be indoors? *
          <select name="indoorsEvent" value={formData.indoorsEvent} onChange={handleChange} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          Do you have a budget? Please provide a number*
          <input type="text" name="budget" value={formData.budget} onChange={handleChange} required />
        </label>

        <label>
          Select staff/add-on items and set the quantity.
          <AddonsPicker
            service={formData.service || formData.eventType}
            addons={formData.addons}
            setAddons={(next) => setFormData((prev) => ({ ...prev, addons: next }))}
          />
        </label>

        <label>
          Please provide any necessary information. (ex: how many high tables would you like? or how many servers?)*
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
            <option value="TikTok">Tik Tok</option>
            <option value="Google">Google</option>
            <option value="Other">Other</option>
          </select>
        </label>

        {formData.howHeard === 'Friend' && (
          <label>
            If referred by a friend, please tell us who!
            <input type="text" name="referral" value={formData.referral} onChange={handleChange} required />
          </label>
        )}

        {formData.howHeard === 'Other' && (
          <label>
            If other, please elaborate, else N/A *
            <textarea
              name="referralDetails"
              value={formData.referralDetails}
              onChange={handleChange}
              required
            />
          </label>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>

        {isEventStaffing && !hasStaffSelection && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#ffcccc' }}>
            You must add at least 1 staff item (Bartender/Server/BarBack/Help Staff) to submit.
          </div>
        )}
      </form>

      <ChatBox />
    </div>
  );
};

export default IntakeForm;
