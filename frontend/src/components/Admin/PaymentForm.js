import React, { useState, useEffect } from 'react';

/**
 * PaymentForm
 * - Pick a client (auto-fills email) OR type an email manually
 * - Enter amount, a short item/description, and select the Profit "Type"
 * - Generates a Square payment link that, when paid, can be logged correctly
 *   as Appointment Income / Gig Income / Bar Course Income / Product Income / Other Income.
 */
const PaymentForm = () => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [itemName, setItemName] = useState('Payment for services');
  const [profitType, setProfitType] = useState('Appointment Income');
  const [link, setLink] = useState('');

  // Load clients
  useEffect(() => {
    const fetchClients = async () => {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      try {
        const res = await fetch(`${apiUrl}/api/clients`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    fetchClients();
  }, []);

  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => String(c.id) === String(clientId));
    setEmail(client?.email || '');
  };

  const validate = () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email.');
      return false;
    }
    const a = Number.parseFloat(amount);
    if (!a || a <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return false;
    }
    if (!itemName || !itemName.trim()) {
      alert('Please enter a short description (item name).');
      return false;
    }
    if (!profitType) {
      alert('Please select a profit Type.');
      return false;
    }
    return true;
  };

  const generatePaymentLink = async () => {
    if (!validate()) return;

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      // 1) Save a lightweight “pending” payment record (optional; keeps your Payments table coherent)
      const saveRes = await fetch(`${apiUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: Number.parseFloat(amount),
          description: itemName || 'Payment for services',
        }),
      });
      if (!saveRes.ok) {
        const txt = await saveRes.text();
        alert(`Error saving payment record: ${txt}`);
        return;
      }

      // 2) Ask backend to create a Square payment link
      //    We include appointmentData with type + source so your success page/webhook can label it correctly.
      const linkRes = await fetch(`${apiUrl}/api/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: Number.parseFloat(amount),
          itemName: itemName,
          appointmentData: {
            type: profitType,           // <-- IMPORTANT: tell the system what this payment is
            source: 'PaymentForm',      // helps you branch logic if needed later
            title: itemName,            // some of your flows look at `title`
            paymentPlan: 'Full',        // or 'Deposit' if you ever add that here
          },
        }),
      });

      const data = await linkRes.json();
      if (!linkRes.ok) {
        alert(`Error generating payment link: ${data?.error || 'Unknown error'}`);
        return;
      }

      setLink(data.url);
      alert('Payment link generated!');
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Create Payment Link</h2>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Client (optional)</label>
          <select
            value={selectedClientId}
            onChange={(e) => handleClientChange(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="">— Select client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name ? `${c.full_name} — ${c.email}` : c.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@email.com"
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Amount (USD)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 75"
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Item / Description</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Payment for services"
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Profit Type</label>
          <select
            value={profitType}
            onChange={(e) => setProfitType(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="Appointment Income">Appointment Income</option>
            <option value="Appointment Balance Income">Appointment Balance Income</option>
            <option value="Gig Income">Gig Income</option>
            <option value="Bar Course Income">Bar Course Income</option>
            <option value="Product Income">Product Income</option>
            <option value="Other Income">Other Income</option>
          </select>
        </div>

        <button onClick={generatePaymentLink} style={{ padding: '10px 14px', fontWeight: 700 }}>
          Generate Payment Link
        </button>

        {link && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Payment Link</div>
            <a href={link} target="_blank" rel="noreferrer">{link}</a>
          </div>
        )}
      </div>
    </div>
  );
};

// If you previously showed a payments table below, keep your existing component here.
// For brevity, not re-implementing it since it doesn't affect the profits/type bug.
const PaymentPage = () => {
  return (
    <div>
      <PaymentForm />
    </div>
  );
};

export default PaymentPage;
