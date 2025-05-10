
import React, { useState, useEffect } from 'react';
import predefinedItems from '../../data/predefinedItems.json';
import { useLocation } from 'react-router-dom';


const QuotesPage = () => {
    const location = useLocation();
    
    const { quote } = location.state || {};  // Access the quote passed in Navigate

    // Initialize the quote state
    const [quoteState, setQuote] = useState(quote || {
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        quoteNumber: '',
        quoteDate: new Date().toLocaleDateString(),
        eventDate: '',
        items: [],
    });
    console.log("quoteState:", quoteState);

 


    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        unitPrice: 0,
        quantity: 1,
    });

    const [newClient, setNewClient] = useState({ firstName: '', lastName: '', phone: '', email: ''});

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001;';

    // Fetch clients if necessary
    useEffect(() => {
        // If the quote does not have a client, initialize the selectedClient to the first one
        if (!quoteState.clientName && clients.length > 0) {
            setSelectedClient(clients[0]); // Default to the first client if none is selected
        }
    }, [clients, quoteState.clientName]);
    
const calculateTotal = () =>
    quoteState.items
        .reduce((total, item) => total + (parseFloat(item.amount) || 0), 0)
        .toFixed(2);



    const handleAddItem = (item) => {
        setQuote({
            ...quote,
            items: [...quoteState.items, { ...item, amount: item.unitPrice * item.quantity }],
        });
    };

    const handleRemoveItem = (index) => {
        const updatedItems = [...quoteState.items];
        updatedItems.splice(index, 1);
        setQuote({ ...quote, items: updatedItems });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...quoteState.items];
        updatedItems[index][field] = field === 'unitPrice' || field === 'quantity' ? parseFloat(value) || 0 : value;
        updatedItems[index].amount = (updatedItems[index].quantity * updatedItems[index].unitPrice).toFixed(2);
        setQuote({ ...quote, items: updatedItems });
    };

    const [selectedService, setSelectedService] = useState(null);
    const [selectedAddOns, setSelectedAddOns] = useState([]);
    
    const handleAddOnSelection = (isSelected, addOn) => {
        if (isSelected) {
            setSelectedAddOns([...selectedAddOns, addOn]);
        } else {
            setSelectedAddOns(selectedAddOns.filter(item => item.id !== addOn.id));
        }
    };
    
    const handleAddToQuote = () => {
        const quoteItems = [...quoteState.items];
    
        // Check if selectedService is "Custom Item"
        if (selectedService && selectedService.name === "Custom Item") {
            // Add a single blank row for "Custom Item"
            quoteItems.push({
                name: '',
                description: '',
                unitPrice: 0,
                quantity: 1,
                amount: 0,
            });
    
            // Reset selectedService to prevent duplicate entries
            setSelectedService(null);
        } else if (selectedService) {
            // Check if the selected item already exists (match by name)
            const existingItemIndex = quoteItems.findIndex(
                (item) => item.name === selectedService.name
            );
    
            if (existingItemIndex !== -1) {
                // Update the quantity and amount for existing items
                quoteItems[existingItemIndex].quantity += 1;
                quoteItems[existingItemIndex].amount =
                    quoteItems[existingItemIndex].quantity * quoteItems[existingItemIndex].unitPrice;
            } else {
                // Add the selected item as a new entry
                quoteItems.push({
                    name: selectedService.name,
                    description: selectedService.description,
                    unitPrice: selectedService.unitPrice,
                    quantity: 1,
                    amount: selectedService.unitPrice,
                });
    
                // Add selected add-ons as separate items
                selectedAddOns.forEach((addOn) => {
                    quoteItems.push({
                        name: addOn.name,
                        description: '',
                        unitPrice: addOn.price,
                        quantity: 1,
                        amount: addOn.price,
                    });
                });
            }
        }
    
        // Update the state with modified items
        setQuote({
            ...quote,
            items: quoteItems,
        });
    
        // Reset states
        setSelectedService(null);
        setSelectedAddOns([]);
        setNewItem({ name: '', description: '', unitPrice: 0, quantity: 1 });
    };
    
     // Fetch clients
     useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/clients`);
                if (response.ok) {
                    const data = await response.json();
                    setClients(data);
                } else {
                    console.error('Failed to fetch clients');
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };

        fetchClients();
    }, [apiUrl]);

    // Handle client selection
    // Handle client selection
    const handleClientSelection = (e) => {
        const clientId = e.target.value;
        const client = clients.find((c) => c.id === parseInt(clientId));
        setSelectedClient(client);
        setQuote({
            ...quote,
            clientName: client.full_name,
            clientEmail: client.email,
            clientPhone: client.phone,
        });
    };

    // Handle event date change
    const handleEventDateChange = (e) => {
        const updatedEventDate = e.target.value;
        setQuote((prevState) => ({
            ...prevState,
            eventDate: updatedEventDate,
        }));
    };

    const handleSendQuote = async () => {
        if (!selectedClient) {
            alert('Please select a client to send the quoteState.');
            return;
        }

        if (quoteState.items.length === 0) {
            alert('Please add at least one item to the quoteState.');
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/send-quote-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: quoteState.clientEmail,
                    quote,
                }),
            });

            if (response.ok) {
                alert('Quote sent successfully!');
            } else {
                const errorMessage = await response.text();
                alert(`Failed to send the quote: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error sending quote:', error);
            alert('Error sending the quoteState. Please try again.');
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

                    <h4>Select Client</h4>
                <select onChange={handleClientSelection} value={selectedClient?.id || ''}>
                    <option value="">-- Select Client --</option>
                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.full_name}
                        </option>
                    ))}
                </select>
                <p>
                        <strong>Client Name:</strong> {quoteState.clientName || 'N/A'}
                    </p>
                    <p>
                        <strong>Client Email:</strong> {quoteState.clientEmail || 'N/A'}
                    </p>
                    <p>
                        <strong>Client Phone:</strong> {quoteState.clientPhone || 'N/A'}
                    </p>
            </div>

            <div style={{ flex: '1 1 30%' }}>
                <h4>QUOTE DETAILS</h4>
                <p>
                    <strong>Quote #:</strong> {quoteState.quoteNumber}
                </p>
                <p>
                    <strong>Quote Date:</strong> {quoteState.quoteDate}
                </p>
                <p>
                    <strong>Event Date:</strong>
                    <input
                        type="date"
                        value={quoteState.eventDate || ''} // If eventDate is not passed, allow manual entry
                        onChange={handleEventDateChange}
                        style={{ width: '100%' }}
                    />
                </p>
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
