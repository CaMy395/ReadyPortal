
import React, { useState, useEffect } from 'react';
import predefinedItems from '../../data/predefinedItems.json';
import { useLocation } from 'react-router-dom';


const QuotesPage = () => {
    
    const [quoteState, setQuote] = useState(() => {
        
    const saved = sessionStorage.getItem('preQuote');
        return saved ? JSON.parse(saved) : {
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            quoteNumber: '',
            quoteDate: new Date().toLocaleDateString(),
            eventDate: '',
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

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

    useEffect(() => {
        const storedQuote = sessionStorage.getItem('preQuote');
        if (storedQuote) {
            const parsed = JSON.parse(storedQuote);
            setQuote(parsed);

            // Save to backend if not already saved
            const saveQuote = async () => {
                try {
                    const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/quotes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                        ...parsed,
                        client_id: selectedClientState?.id ?? null,
                        quote_number: parsed.quoteNumber || `Q-${Date.now()}`,
                        total_amount: parsed.items?.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0).toFixed(2),
                        date: new Date().toISOString().split('T')[0], // format: YYYY-MM-DD
                        status: 'Pending'
                        }),
                    });
                    if (!res.ok) {
                        console.error('❌ Failed to save quote:', await res.text());
                    }
                } catch (error) {
                    console.error('❌ Error saving quote:', error);
                }
            };

            saveQuote();
            sessionStorage.removeItem('preQuote'); // Clean up
        }
    }, []);

    const calculateTotal = () =>
        quoteState.items.reduce((total, item) => total + (parseFloat(item.amount) || 0), 0).toFixed(2);

     const handleClientSelection = (e) => {
        const client = clients.find(c => c.id === parseInt(e.target.value));
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

    const handleEventDateChange = (e) => setQuote(prev => ({ ...prev, eventDate: e.target.value }));

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

            // Only add selected add-ons
            selectedAddOns.forEach(addOn => {
                items.push({
                name: addOn.name,
                description: '',
                unitPrice: addOn.price,
                quantity: 1,
                amount: addOn.price
                });
            });
            }
        }

        setQuote(prev => ({ ...prev, items }));
        setSelectedService(null);
        setSelectedAddOns([]);
        setNewItem({ name: '', description: '', unitPrice: 0, quantity: 1 });
        };

    const handleQuoteFieldChange = (field) => (e) => {
        setQuote(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSendQuote = async () => {
    if (!quoteState.clientName) return alert('Client information is missing.');
    if (!quoteState.items.length) return alert('Please add at least one item to the quote.');
    try {
        const payload = {
        ...quoteState,
        client_id: selectedClientState?.id ?? null,
        total_amount: calculateTotal(),
        status: 'Pending'
        };

        await fetch(`${apiUrl}/api/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
        });

        await fetch(`${apiUrl}/api/send-quote-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: quoteState.clientEmail, quote: quoteState })
        });

        alert('Quote sent successfully!');
    } catch (e) {
        console.error(e);
        alert('Error sending the quote.');
    }
    };


    const handleAddOnSelection = (isSelected, addOn) => {
        if (isSelected) {
            setSelectedAddOns([...selectedAddOns, addOn]);
        } else {
            setSelectedAddOns(selectedAddOns.filter(item => item.id !== addOn.id));
        }
    };
    
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: 'auto' }} >
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
                            <p><strong>Organization:</strong> <input value={quoteState.billToOrganization} onChange={handleQuoteFieldChange('billToOrganization')} /></p>
                            <p><strong>Attention:</strong> <input value={quoteState.billToContact} onChange={handleQuoteFieldChange('billToContact')} /></p>
                        </>
                    )}
                </div>

                <div style={{ flex: '1 1 30%' }}>
                    <h4>QUOTE DETAILS</h4>
                    <p><strong>Quote #:</strong> {quoteState.quoteNumber}</p>
                    <p><strong>Quote Date:</strong> {quoteState.quoteDate}</p>
                    <p><strong>Event Date:</strong> <input type="date" value={quoteState.eventDate} onChange={handleQuoteFieldChange('eventDate')} /></p>
                    <p><strong>Event Time:</strong> <input type="text" value={quoteState.eventTime} onChange={handleQuoteFieldChange('eventTime')} placeholder="e.g. 11:30am - 3:30pm" /></p>
                    <p><strong>Location:</strong> <textarea value={quoteState.location} onChange={handleQuoteFieldChange('location')} rows={3} /></p>
                </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
                <h4>Add Item</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Unified Dropdown for Items */}
                    <select
                onChange={(e) => {
                    const selectedId = parseInt(e.target.value);
                    const service = predefinedItems.find((item) => item.id === selectedId);
                    setSelectedService(service || null);
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
                            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
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

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <h4>Total: ${calculateTotal()}</h4>
            </div>
            <button
                onClick={handleSendQuote}
                style={{
                    backgroundColor: '#8B0000',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '20px',
                }}
            >
                Send Quote
            </button>

        </div>
    );
};

export default QuotesPage;
