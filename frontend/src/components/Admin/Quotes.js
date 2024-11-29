import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom'; // Ensure you're using react-router-dom
import predefinedItems from '../../data/predefinedItems.json';


const QuotesPage = () => {
    const navigate = useNavigate();
    const [quote, setQuote] = useState({
        clientName: '',
        clientAddress: '',
        shipToName: '',
        shipToAddress: '',
        quoteNumber: '',
        quoteDate: new Date().toLocaleDateString(),
        eventDate: '',
        items: [],
        salesTaxRate: 6.25,
        includeTax: false,
    });

    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        unitPrice: 0,
        quantity: 1,
    });
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [newClient, setNewClient] = useState({ firstName: '', lastName: '', email: '', address: '' });


    
    useEffect(() => {
        if (!quote.quoteNumber) {
            setQuote((prev) => ({
                ...prev,
                quoteNumber: `Q-${Date.now()}`,
            }));
        }
    }, [quote.quoteNumber]);

    // Automatically load client data from the CSV file
    useEffect(() => {
        fetch('/ClientCatalog.csv') // Adjust the path if needed
            .then((response) => response.text())
            .then((data) => {
                Papa.parse(data, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setClients(results.data); // Update the state with parsed CSV data
                    },
                });
            })
            .catch((error) => console.error('Error loading client data:', error));
    }, []);
    
    
    // Handle Client Selection
    const handleClientSelection = (clientId) => {
        const client = clients.find((c) => c['CRM ID'] === clientId);
        if (client) {
            setNewClient({
                firstName: client['First Name'],
                lastName: client['Last Name'],
                email: client.Email,
                address: client.Address,
            });
            setQuote((prev) => ({
                ...prev,
                clientName: `${client['First Name']} ${client['Last Name']}`,
                clientEmail: client.Email,
                clientAddress: client.Address,
            }));
        }
        setSelectedClient(clientId);
    };
    

    const handleAddNewClient = () => {
        const { firstName, lastName, email, address } = newClient;
    
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !address.trim()) {
            alert('Please fill in all required fields for the new client.');
            return;
        }
    
        const newClientEntry = {
            'CRM ID': clients.length + 1, // Generate a unique ID
            'First Name': firstName,
            'Last Name': lastName,
            'Email': email,
            'Address': address,
        };
    
        // Send the new client to the backend
        fetch('http://localhost:3001/add-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClientEntry),
        })
            .then((response) => {
                if (response.ok) {
                    // Update the frontend state
                    setClients((prevClients) => [...prevClients, newClientEntry]);
                    alert('New client added successfully!');
                } else {
                    alert('Failed to add client. Please try again.');
                }
            })
            .catch((error) => console.error('Error adding client:', error));
    };
        fetch('http://localhost:3001/ClientCatalog.csv')
            .then((response) => response.text())
            .then((data) => {
                Papa.parse(data, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setClients(results.data); // Update the state with parsed CSV data
                    },
                });
            })
            .catch((error) => console.error('Error reloading client data:', error));

    
const calculateSubtotal = () =>
    quote.items
        .reduce((total, item) => total + (parseFloat(item.amount) || 0), 0)
        .toFixed(2);

    
    const calculateSalesTax = () =>
        ((calculateSubtotal() * quote.salesTaxRate) / 100).toFixed(2);
    
    const calculateTotal = () =>
        quote.includeTax
            ? (parseFloat(calculateSubtotal()) + parseFloat(calculateSalesTax())).toFixed(2)
            : calculateSubtotal();
    

    const handleAddItem = (item) => {
        setQuote({
            ...quote,
            items: [...quote.items, { ...item, amount: item.unitPrice * item.quantity }],
        });
    };

    const handleRemoveItem = (index) => {
        const updatedItems = [...quote.items];
        updatedItems.splice(index, 1);
        setQuote({ ...quote, items: updatedItems });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...quote.items];
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
        const quoteItems = [...quote.items];
    
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
    
    const handleSendQuote = async () => {
        // Validate required fields
        if (!quote.clientName || !quote.clientAddress || !quote.clientEmail) {
            alert('Please fill in all client details to send the quote.');
            return;
        }
    
        if (quote.items.length === 0) {
            alert('Please add at least one item to the quote.');
            return;
        }
    
        try {
            // Send the quote
            const response = await fetch('http://localhost:3001/send-quote-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: quote.clientEmail, // Client's email address
                    quote, // Entire quote state
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
            alert('Error sending the quote. Please try again.');
        }
    };
    
    
    

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: 'auto' }} >
            <header style={{ textAlign: 'center', marginBottom: '20px' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)} // Go back to the previous page
                    style={{
                        position: 'absolute',
                        top: '25px',
                        right: '1395px',
                        backgroundColor: '#8B0000',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    Back
                </button>
                <h1 style={{ color: '#8B0000' }}>QUOTE</h1>
                <p>Ready Bartending LLC.</p>
                <p>1030 NW 200th Terrace, Miami, FL 33169</p>
            </header>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '20px', gap: '20px' }}>
            <div style={{ flex: '1 1 30%' }}>
                <div>
                <h4>BILL TO</h4>
                {/* Dropdown to select a client from the catalog */}
                {clients.length > 0 && (
                    <select
                        value={selectedClient}
                        onChange={(e) => handleClientSelection(e.target.value)}
                        style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
                    >
                        <option value="">Select a Client</option>
                        {clients
                        .sort((a, b) => {
                            const nameA = `${a['First Name']} ${a['Last Name']}`.toLowerCase();
                            const nameB = `${b['First Name']} ${b['Last Name']}`.toLowerCase();
                            return nameA.localeCompare(nameB); // Alphabetical order
                        })
                        .map((client, index) => (
                            <option key={index} value={client['CRM ID']}>
                                {`${client['First Name']} ${client['Last Name']}`}
                            </option>
                        ))}
                    </select>
                )}
                </div>

                {/* Input for First Name */}
                <input
                    type="text"
                    placeholder="First Name"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                    style={{ width: '100%', marginBottom: '10px' }}
                    required
                />

                {/* Input for Last Name */}
                <input
                    type="text"
                    placeholder="Last Name"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                    style={{ width: '100%', marginBottom: '10px' }}
                    required
                />

                {/* Input for Client Email */}
                <input
                    type="email"
                    placeholder="Client Email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    style={{ width: '100%', marginBottom: '10px' }}
                    required
                />

                {/* Input for Client Address */}
                <textarea
                    placeholder="Client Address"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    style={{ width: '100%' }}
                    required
                ></textarea>
 
                <button
                    onClick={handleAddNewClient}
                    style={{
                        backgroundColor: '#8B0000',
                        color: 'white',
                        padding: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        width: '40%',
                        }}
                    >
                        Add New Client
                    </button>
                </div>

                <div style={{ flex: '1 1 30%' }}>
                    <h4>SHIP TO</h4>
                    <input
                        type="text"
                        placeholder="Ship To Name"
                        value={quote.shipToName}
                        onChange={(e) => setQuote({ ...quote, shipToName: e.target.value })}
                        style={{ width: '100%', marginBottom: '10px' }}
                    />
                    <textarea
                        placeholder="Ship To Address"
                        value={quote.shipToAddress}
                        onChange={(e) => setQuote({ ...quote, shipToAddress: e.target.value })}
                        style={{ width: '100%' }}
                    ></textarea>
                </div>
                <div style={{ flex: '1 1 30%' }}>
                    <h4>QUOTE DETAILS</h4>
                    <p>
                        <strong>Quote #:</strong> {quote.quoteNumber}
                    </p>
                    <p>
                        <strong>Quote Date:</strong> {quote.quoteDate}
                    </p>
                    <p>
                        <strong>Event Date:</strong>
                        <input
                            type="date"
                            value={quote.eventDate || ''}
                            onChange={(e) => setQuote({ ...quote, eventDate: e.target.value })}
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
                    {quote.items.map((item, index) => (
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
                <label>
                    <input
                        type="checkbox"
                        checked={quote.includeTax}
                        onChange={(e) => setQuote({ ...quote, includeTax: e.target.checked })}
                    />
                    Apply Sales Tax ({quote.salesTaxRate}%)
                </label>
                <p>Subtotal: ${calculateSubtotal()}</p>
                {quote.includeTax && <p>Sales Tax ({quote.salesTaxRate}%): ${calculateSalesTax()}</p>}
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

            <footer style={{ textAlign: 'center', marginTop: '40px', color: '#8B0000' }}>
                <p>Thank you for your business!</p>
                <p>
                    Terms: A deposit is due within 2 days. 
                    <br></br>
                    <br></br>
                    *Please make a payment through: <br></br><br></br> the website: Readybartending.com,   Zelle: readybarpay@gmail.com, or  CashApp: $readybartending  <br></br><br></br> <strong>Ready Bartending LLC.</strong>
                </p>
            </footer>
        </div>
    );
};

export default QuotesPage;
