// Updated Quotes.js with robust Event Date transfer/normalization + auto-select client
import React, { useState, useEffect } from 'react';
import predefinedItems from '../../data/predefinedItems.json';
import { useLocation } from 'react-router-dom';

const toYMD = (raw) => {
  if (!raw) return '';
  // If it's already YYYY-MM-DD, keep it
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Try to parse common formats
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // Try M/D/YYYY or MM/DD/YY quick parse
  const mdyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdyyyy) {
    const [, m, d2, y2] = mdyyyy;
    const year = y2.length === 2 ? `20${y2}` : y2;
    return `${year}-${String(m).padStart(2,'0')}-${String(d2).padStart(2,'0')}`;
  }

  // Fallback
  return '';
};

const todayLocalYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// simple phone normalizer for matching
const digits = (s) => String(s || '').replace(/\D+/g, '');

const QuotesPage = () => {
  const [quoteState, setQuote] = useState(() => {
    const saved = sessionStorage.getItem('preQuote');
    return saved ? JSON.parse(saved) : {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      quoteNumber: '',
      quoteDate: todayLocalYMD(), // ✅ NY local date, not UTC
      eventDate: '',       // <-- will be YYYY-MM-DD once normalized
      eventTime: '',
      location: '',
      items: [],
    };
  });

  const selectedClient = quoteState.clientName ? {
    name: quoteState.clientName,
    email: quoteState.clientEmail,
    phone: quoteState.clientPhone
  } : null;

  const [clients, setClients] = useState([]);
  const [selectedClientState, setSelectedClientState] = useState(selectedClient || null);
  const [newItem, setNewItem] = useState({ name: '', description: '', unitPrice: 0, quantity: 1 });
  const [selectedService, setSelectedService] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  // Package Builder integration
  const [packageTemplates, setPackageTemplates] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageError, setPackageError] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const location = useLocation();

  // Pull data coming from the intake form → normalize Event Date into YYYY-MM-DD
  useEffect(() => {
    const stateData = location.state?.preQuoteData;
    const stored = sessionStorage.getItem('preQuote');

    if (!stored && stateData) {
      // Try multiple keys that your form might use for the event date
      const rawEventDate =
        stateData.event_date ??
        stateData.eventDate ??
        stateData.date ??
        stateData.selected_date ??
        stateData.selected_class ?? // you were using this before
        '';

      const mappedQuote = {
        clientName: stateData.full_name || '',
        clientEmail: stateData.email || '',
        clientPhone: stateData.phone || '',
        quoteNumber: `Q-${Date.now()}`,
        quoteDate: new Date().toLocaleDateString(),
        eventDate: toYMD(rawEventDate),                // <-- normalized for <input type="date">
        eventTime: stateData.event_time || stateData.time || '',
        location: stateData.location || stateData.address || '',
        items: [],
      };

      sessionStorage.setItem('preQuote', JSON.stringify(mappedQuote));
      setQuote(mappedQuote);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Rehydrate from session storage (keep items if we had some already)
  useEffect(() => {
    const storedQuote = sessionStorage.getItem('preQuote');
    if (storedQuote) {
      const parsed = JSON.parse(storedQuote);
      // Make sure eventDate remains normalized if something else wrote it
      parsed.eventDate = toYMD(parsed.eventDate);
      setQuote(prev => ({
        ...prev,
        ...parsed,
        items: parsed.items && parsed.items.length ? parsed.items : prev.items
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/clients`);
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, [apiUrl]);

  // Load active package templates for the quote package selector
  useEffect(() => {
    let ignore = false;

    const fetchPackageTemplates = async () => {
      try {
        setPackageError('');
        const response = await fetch(`${apiUrl}/package-templates`);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load package templates.');
        }

        if (!ignore) {
          setPackageTemplates(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error loading package templates:', error);
        if (!ignore) setPackageError(error.message || 'Failed to load packages.');
      }
    };

    fetchPackageTemplates();

    return () => {
      ignore = true;
    };
  }, [apiUrl]);

  // 🔁 Auto-select client based on pre-filled name/email/phone (no click needed)
  useEffect(() => {
    if (!clients.length) return;
    // don't override if already selected
    if (selectedClientState?.id) return;

    // Prefer email match (strongest), then phone, then full name
    const email = String(quoteState.clientEmail || '').toLowerCase().trim();
    const phone = digits(quoteState.clientPhone);
    const name = String(quoteState.clientName || '').toLowerCase().trim();

    let match = null;
    if (email) {
      match = clients.find(c => String(c.email || '').toLowerCase().trim() === email);
    }
    if (!match && phone) {
      match = clients.find(c => digits(c.phone) === phone && phone.length >= 7);
    }
    if (!match && name) {
      match = clients.find(c => String(c.full_name || '').toLowerCase().trim() === name);
    }

    if (match) {
      setSelectedClientState(match);
      setQuote(prev => ({
        ...prev,
        clientName: match.full_name || prev.clientName,
        clientEmail: match.email || prev.clientEmail,
        clientPhone: match.phone || prev.clientPhone,
        billToOrganization: match.business_name || prev.billToOrganization || '',
        billToContact: match.contact_name || prev.billToContact || '',
        entityType: match.entity_type || prev.entityType || ''
      }));
    }
  }, [clients, quoteState.clientEmail, quoteState.clientPhone, quoteState.clientName, selectedClientState]);

  const calculateTotal = () =>
    quoteState.items.reduce((total, item) => total + (parseFloat(item.amount) || 0), 0).toFixed(2);

  const handleClientSelection = (e) => {
    const client = clients.find(c => c.id === parseInt(e.target.value, 10));
    if (!client) {
      setSelectedClientState(null);
      return;
    }
    setSelectedClientState(client);
    setQuote(prev => ({
      ...prev,
      clientName: client.full_name,
      clientEmail: client.email,
      clientPhone: client.phone,
      billToOrganization: client.business_name || '',
      billToContact: client.contact_name || '',
      entityType: client.entity_type || ''
    }));
  };

  const handleAddItem = (item) => setQuote(prev => ({ ...prev, items: [...prev.items, { ...item, amount: item.unitPrice * item.quantity }] }));
  const handleRemoveItem = (index) => setQuote(prev => {
    const items = [...prev.items];
    items.splice(index, 1);
    return { ...prev, items };
  });

  const handleItemChange = (index, field, value) => setQuote(prev => {
    const items = [...prev.items];
    items[index][field] = ['unitPrice', 'quantity'].includes(field) ? parseFloat(value) || 0 : value;
    items[index].amount = (items[index].quantity * items[index].unitPrice).toFixed(2);
    return { ...prev, items };
  });

  const handleAddToQuote = () => {
    const items = [...quoteState.items];
    if (selectedService?.name === "Custom Item") {
      items.push({ name: '', description: '', unitPrice: 0, quantity: 1, amount: 0 });
    } else if (selectedService) {
      const idx = items.findIndex(item => item.name === selectedService.name);
      if (idx !== -1) {
        items[idx].quantity += 1;
        items[idx].amount = items[idx].quantity * items[idx].unitPrice;
      } else {
        items.push({
          name: selectedService.name,
          description: selectedService.description,
          unitPrice: selectedService.unitPrice,
          quantity: 1,
          amount: selectedService.unitPrice
        });
        selectedAddOns.forEach(addOn => {
          items.push({ name: addOn.name, description: '', unitPrice: addOn.price, quantity: 1, amount: addOn.price });
        });
      }
    }
    setQuote(prev => ({ ...prev, items }));
    setSelectedService(null);
    setSelectedAddOns([]);
    setNewItem({ name: '', description: '', unitPrice: 0, quantity: 1 });
  };

  const handleQuoteFieldChange = (field) => (e) => {
    const val = field === 'eventDate' ? toYMD(e.target.value) : e.target.value;
    setQuote(prev => ({ ...prev, [field]: val }));
  };

  const handleSendQuote = async () => {
    try {
      const updatedItems = quoteState.items.map(i => ({
        ...i,
        amount: i.unitPrice * i.quantity,
      }));
      const totalAmount = updatedItems.reduce((sum, i) => sum + i.amount, 0).toFixed(2);

      const payload = {
        ...quoteState,
        items: updatedItems,
        total_amount: totalAmount,
        deposit_amount: quoteState.depositAmount || 0,
        deposit_date: quoteState.depositDate || null,
        paid_in_full: quoteState.paidInFull || false,
        client_id: selectedClientState?.id ?? null,
        quote_number: quoteState.quoteNumber || `Q-${Date.now()}`,
        quoteDate: new Date().toISOString().split('T')[0],
        status: 'Pending',

        // Ensure backend receives snake_case keys if that's what it expects:
        event_date: quoteState.eventDate,   // <-- normalized YYYY-MM-DD
        event_time: quoteState.eventTime,
        location: quoteState.location,
      };

      const res = await fetch(`${apiUrl}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('❌ Failed to save quote:', await res.text());
        alert("❌ Failed to save quote.");
        return;
      }

      alert("✅ Quote saved successfully!");
      sessionStorage.removeItem('preQuote');
    } catch (err) {
      console.error("❌ Error sending quote:", err);
      alert("❌ Could not send quote.");
    }
  };

  const handleImportPackage = async () => {
    if (!selectedPackageId) {
      alert('Select a package first.');
      return;
    }

    try {
      setPackageLoading(true);
      setPackageError('');

      const response = await fetch(`${apiUrl}/package-templates/${selectedPackageId}`);
      const pkg = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(pkg?.error || 'Failed to load the selected package.');
      }

      const packagePrice = Number(pkg.client_price || 0);
      if (packagePrice <= 0) {
        const proceed = window.confirm(
          `${pkg.package_name} currently has a client price of $0. Import it anyway so you can enter the price on the quote?`
        );
        if (!proceed) return;
      }

      const includedParts = [
        `Up to ${pkg.guest_count} guests`,
        `${Number(pkg.service_hours || 0)} hours of service`,
        `${Number(pkg.bartenders || 0)} bartender${Number(pkg.bartenders || 0) === 1 ? '' : 's'}`,
      ];

      if (Number(pkg.servers || 0) > 0) {
        includedParts.push(`${pkg.servers} server${Number(pkg.servers) === 1 ? '' : 's'}`);
      }
      if (Number(pkg.support_staff || 0) > 0) {
        includedParts.push(`${pkg.support_staff} support staff`);
      }
      if (Number(pkg.mobile_bars || 0) > 0) {
        includedParts.push(`${pkg.mobile_bars} mobile bar${Number(pkg.mobile_bars) === 1 ? '' : 's'}`);
      }

      const categoryNames = Array.from(
        new Set(
          (Array.isArray(pkg.items) ? pkg.items : [])
            .map((item) => String(item.category || '').trim())
            .filter(Boolean)
        )
      );

      if (categoryNames.length) {
        includedParts.push(categoryNames.join(', '));
      }

      const quoteItem = {
        name: pkg.package_name,
        description: includedParts.join(' • '),
        unitPrice: packagePrice,
        quantity: 1,
        amount: packagePrice,
        packageTemplateId: pkg.id,
        packageSnapshot: {
          id: pkg.id,
          package_name: pkg.package_name,
          tier: pkg.tier,
          guest_count: pkg.guest_count,
          service_hours: pkg.service_hours,
          bartenders: pkg.bartenders,
          support_staff: pkg.support_staff,
          servers: pkg.servers,
          mobile_bars: pkg.mobile_bars,
          client_price: pkg.client_price,
          items: pkg.items,
          calculations: pkg.calculations,
        },
      };

      setQuote((previous) => {
        const existingIndex = previous.items.findIndex(
          (item) => Number(item.packageTemplateId) === Number(pkg.id)
        );

        let nextItems;
        if (existingIndex >= 0) {
          nextItems = [...previous.items];
          nextItems[existingIndex] = quoteItem;
        } else {
          nextItems = [...previous.items, quoteItem];
        }

        return {
          ...previous,
          packageTemplateId: pkg.id,
          packageSnapshot: quoteItem.packageSnapshot,
          items: nextItems,
        };
      });
    } catch (error) {
      console.error('Error importing package:', error);
      setPackageError(error.message || 'Failed to import package.');
      alert(error.message || 'Failed to import package.');
    } finally {
      setPackageLoading(false);
    }
  };

  const handleAddOnSelection = (isSelected, addOn) => {
    if (isSelected) setSelectedAddOns([...selectedAddOns, addOn]);
    else setSelectedAddOns(selectedAddOns.filter(item => item.id !== addOn.id));
  };

  return (
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          padding: '20px',
          maxWidth: '1000px',
          margin: 'auto',
          minHeight: '100vh',
          paddingBottom: '40px',
        }}
      >
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white' }}>QUOTE</h1>
        <p>Ready Bartending LLC.</p>
        <p>1030 NW 200th Terrace, Miami, FL 33169</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '20px', gap: '20px' }}>
        <div style={{ flex: '1 1 30%' }}>
          <h4>BILL TO</h4>
          <select onChange={handleClientSelection} value={selectedClientState?.id || ''}>
            <option value=''>-- Select Client --</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.full_name}</option>)}
          </select>
          <p><strong>Client Name:</strong> {quoteState.clientName || 'N/A'}</p>
          <p><strong>Client Email:</strong> {quoteState.clientEmail || 'N/A'}</p>
          <p><strong>Client Phone:</strong> {quoteState.clientPhone || 'N/A'}</p>
          {quoteState.entityType === 'business' && (
            <>
              <p><strong>Organization:</strong> <input value={quoteState.billToOrganization || ''} onChange={handleQuoteFieldChange('billToOrganization')} /></p>
              <p><strong>Attention:</strong> <input value={quoteState.billToContact || ''} onChange={handleQuoteFieldChange('billToContact')} /></p>
            </>
          )}
        </div>

        <div style={{ flex: '1 1 30%' }}>
          <h4>QUOTE DETAILS</h4>
          <p><strong>Quote #:</strong> {quoteState.quoteNumber}</p>
          <p><strong>Quote Date:</strong> {quoteState.quoteDate}</p>
          <p>
            <strong>Event Date:</strong>{' '}
            <input
              type="date"
              value={quoteState.eventDate || ''}
              onChange={handleQuoteFieldChange('eventDate')}
            />
          </p>
          <p>
            <strong>Event Time:</strong>{' '}
            <input
              type="text"
              value={quoteState.eventTime || ''}
              onChange={handleQuoteFieldChange('eventTime')}
              placeholder="e.g. 11:30am - 3:30pm"
            />
          </p>
          <p>
            <strong>Location:</strong>{' '}
            <textarea
              value={quoteState.location || ''}
              onChange={handleQuoteFieldChange('location')}
              rows={3}
            />
          </p>
        </div>
      </div>

      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h4 style={{ marginTop: 0 }}>Build From Package</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={selectedPackageId}
            onChange={(event) => setSelectedPackageId(event.target.value)}
            style={{ flex: '1 1 300px', padding: '8px' }}
          >
            <option value="">Select a package</option>
            {packageTemplates.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.package_name} — {pkg.guest_count} guests / {Number(pkg.service_hours)} hrs
                {Number(pkg.client_price || 0) > 0
                  ? ` — $${Number(pkg.client_price).toFixed(2)}`
                  : ' — Price not set'}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleImportPackage}
            disabled={!selectedPackageId || packageLoading}
            style={{
              padding: '8px 14px',
              backgroundColor: '#8B0000',
              color: 'white',
              border: 'none',
              cursor: !selectedPackageId || packageLoading ? 'not-allowed' : 'pointer',
              opacity: !selectedPackageId || packageLoading ? 0.6 : 1,
            }}
          >
            {packageLoading ? 'Importing…' : 'Import Package'}
          </button>
        </div>

        {packageError && (
          <p style={{ color: 'crimson', marginBottom: 0 }}>{packageError}</p>
        )}
        <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: 0 }}>
          Imports one clean client-facing package line. Internal costs and profit stay out of the quote.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4>Add Item</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Unified Dropdown for Items */}
          <select
            onChange={(e) => {
              const selectedId = parseInt(e.target.value, 10);
              const service = predefinedItems.find((item) => item.id === selectedId);
              if (!selectedService || selectedService.id !== selectedId) {
                setSelectedService(service || null);
              } else {
                setSelectedService(null);
                setTimeout(() => setSelectedService(service || null), 0);
              }
            }}
            style={{ padding: '5px', width: '100%' }}
          >
            <option value="">Select an Item</option>
            {predefinedItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          {/* Display Add-Ons for Selected Service */}
          {selectedService?.addOns && (
            <div style={{ marginTop: '20px' }}>
              <h4>Available Add-Ons</h4>
              <ul>
                {selectedService.addOns.map(addOn => (
                  <li key={addOn.id}>
                    <label>
                      <input
                        type="checkbox"
                        value={addOn.id}
                        onChange={(e) => handleAddOnSelection(e.target.checked, addOn)}
                      />
                      {addOn.name} - ${addOn.price.toFixed(2)}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={handleAddToQuote}>Add to Quote</button>

          {/* Custom Item Input Fields */}
          {newItem.name !== '' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                style={{ flex: 1, padding: '5px' }}
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                style={{ flex: 2, padding: '5px' }}
              />
              <input
                type="number"
                placeholder="Unit Price"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                style={{ flex: 1, padding: '5px' }}
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value, 10) || 1 })}
                style={{ flex: 1, padding: '5px' }}
              />
              <button
                style={{
                  backgroundColor: '#8B0000',
                  color: 'white',
                  padding: '5px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (newItem.name && newItem.unitPrice > 0 && newItem.quantity > 0) {
                    handleAddItem({ ...newItem, amount: newItem.unitPrice * newItem.quantity });
                    setNewItem({ name: '', description: '', unitPrice: 0, quantity: 1 });
                  } else {
                    alert('Please fill out all fields for the custom item.');
                  }
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
  <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          tableLayout: 'fixed',
          border: '1px solid #ddd',
        }}>
        <thead>
          <tr style={{ backgroundColor: '#8B0000', color: 'white', textAlign: 'center' }}>
            <th style={{ width: '10%', padding: '8px' }}>QTY</th>
            <th style={{ width: '20%', padding: '8px' }}>ITEM</th>
            <th style={{ width: '30%', padding: '8px' }}>DESCRIPTION</th>
            <th style={{ width: '15%', padding: '8px' }}>UNIT PRICE</th>
            <th style={{ width: '15%', padding: '8px' }}>AMOUNT</th>
            <th style={{ width: '10%', padding: '8px' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {quoteState.items.map((item, index) => (
            <tr key={index} style={{ textAlign: 'center', border: '1px solid #ddd' }}>
              <td>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '5px',
                    border: '1px solid #ddd',
                  }}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  placeholder="Enter Item Name"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '5px',
                    border: '1px solid #ddd',
                  }}
                />
              </td>
              <td>
                <textarea
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  placeholder="Enter Description"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '5px',
                    resize: 'none',
                    border: '1px solid #ddd',
                  }}
                ></textarea>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  placeholder="Enter Price"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '5px',
                    border: '1px solid #ddd',
                  }}
                />
              </td>
              <td>${(item.quantity * item.unitPrice).toFixed(2)}</td>
              <td>
                <button
                  style={{
                    backgroundColor: '#8B0000',
                    color: 'white',
                    padding: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  onClick={() => handleRemoveItem(index)}
                >
                  Remove
                </button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
</div>

      <div style={{ textAlign: 'right', marginTop: '20px' }}>
        <h4>Total: ${calculateTotal()}</h4>
      </div>
      <div style={{ marginTop: '20px' }}>
    <button
    onClick={handleSendQuote}
    style={{
      backgroundColor: '#8B0000',
      color: 'white',
      padding: '12px 18px',
      border: 'none',
      cursor: 'pointer',
      marginTop: '20px',
      width: '100%',
      maxWidth: '300px',
    }}
  >
    Send Quote
  </button>
</div>

    </div>
  );
};

export default QuotesPage;
