import React, { useState, useEffect } from 'react';
import Quagga from 'quagga';
import '../../App.css'; // Assuming you have a CSS file for styling

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [newItem, setNewItem] = useState({
        item_name: '',
        category: '',
        quantity: 0,
        barcode: '',
    });
    const [editingItem, setEditingItem] = useState(null); // Track the item being edited
    const [isScanning, setIsScanning] = useState(false);

    const apiUrl = process.env.REACT_APP_API_URL;

    // Fetch inventory items
    useEffect(() => {
        fetch(`${apiUrl}/inventory`)
            .then((response) => response.json())
            .then((data) => setInventory(data))
            .catch((error) => console.error('Error fetching inventory:', error));
    }, [apiUrl]);

    // Handle adding a new item manually
    const handleAddItem = () => {
        fetch(`${apiUrl}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem),
        })
            .then((response) => response.json())
            .then((data) => {
                setInventory((prev) => [...prev, data]);
                setNewItem({ item_name: '', category: '', quantity: 0, barcode: '' });
            })
            .catch((error) => console.error('Error adding item:', error));
    };

    // Start scanner
    const startScanner = () => {
        console.log('Initializing QuaggaJS...');
        Quagga.init(
            {
                inputStream: {
                    type: 'LiveStream',
                    target: document.querySelector('#scanner'), // Use the styled container
                    constraints: {
                        facingMode: 'environment',
                    },
                    area: {
                        top: "0%", right: "0%", left: "0%", bottom: "0%",
                    },
                },
                decoder: {
                    readers: ['upc_reader'], // Supported formats
                },
                locate: true,
            },
            (err) => {
                if (err) {
                    console.error('Error initializing Quagga:', err);
                    return;
                }
                console.log('Quagga initialized. Starting scanner...');
                Quagga.start();
                setIsScanning(true);
            }
        );

        Quagga.onDetected((data) => {
            console.log('Barcode detected:', data.codeResult.code);
            const barcode = data.codeResult.code;
            const action = window.confirm('Click OK to Add or Cancel to Remove') ? 'add' : 'remove';

            fetch(`${apiUrl}/inventory/${barcode}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: 1, action }),
            })
                .then((response) => response.json())
                .then((item) => {
                    if (item.error) {
                        alert(item.error);
                    } else {
                        setInventory((prev) => {
                            const existingItem = prev.find((invItem) => invItem.barcode === barcode);
                            if (existingItem) {
                                return prev.map((invItem) =>
                                    invItem.barcode === barcode
                                        ? { ...invItem, quantity: item.quantity }
                                        : invItem
                                );
                            } else {
                                return [...prev, item];
                            }
                        });
                    }
                })
                .catch((error) => console.error('Error updating inventory:', error));
        });
    };

    // Stop scanner
    const stopScanner = () => {
        console.log('Stopping QuaggaJS...');
        Quagga.stop();
        setIsScanning(false);
    };

    // Handle Edit Button Click
    const handleEditClick = (item) => {
        setEditingItem({ ...item }); // Set the item to be edited
    };

    // Handle Save Edit
    const handleSaveEdit = () => {
        if (!editingItem) return;

        fetch(`${apiUrl}/inventory/${editingItem.barcode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingItem),
        })
            .then((response) => response.json())
            .then((updatedItem) => {
                setInventory((prev) =>
                    prev.map((item) =>
                        item.barcode === updatedItem.barcode ? updatedItem : item
                    )
                );
                setEditingItem(null); // Exit edit mode
                alert('Item updated successfully!');
            })
            .catch((error) => console.error('Error updating item:', error));
    };

    // Handle Input Change During Editing
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingItem((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="inventory-page">
            <h1 className="inventory-title">Inventory Management</h1>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Barcode</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    {editingItem && editingItem.barcode === item.barcode ? (
                                        <input
                                            type="text"
                                            name="item_name"
                                            value={editingItem.item_name}
                                            onChange={handleEditChange}
                                        />
                                    ) : (
                                        item.item_name
                                    )}
                                </td>
                                <td>
                                    {editingItem && editingItem.barcode === item.barcode ? (
                                        <select
                                        name="category"
                                        value={editingItem.category}
                                        onChange={handleEditChange}
                                    >
                                        <option value="Bar Essentials">Bar Essentials</option>
                                        <option value="Liquor">Liquor</option>
                                        <option value="Uncategorized">Uncategorized</option>
                                    </select>
                                    ) : (
                                        item.category
                                    )}
                                </td>
                                <td>
                                    {editingItem && editingItem.barcode === item.barcode ? (
                                        <input
                                            type="number"
                                            name="quantity"
                                            value={editingItem.quantity}
                                            onChange={handleEditChange}
                                        />
                                    ) : (
                                        item.quantity
                                    )}
                                </td>
                                <td>{item.barcode}</td>
                                <td>
                                    {editingItem && editingItem.barcode === item.barcode ? (
                                        <>
                                            <button
                                                className="save-button"
                                                onClick={handleSaveEdit}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className="cancel-button"
                                                onClick={() => setEditingItem(null)}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="edit-button"
                                            onClick={() => handleEditClick(item)}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="scanner-container">
                <h2>Barcode Scanner</h2>
                {!isScanning ? (
                    <button className="scanner-button" onClick={startScanner}>
                        Start Scanner
                    </button>
                ) : (
                    <button className="scanner-button" onClick={stopScanner}>
                        Stop Scanner
                    </button>
                )}
                <div id="scanner" className="scanner-box"></div>
            </div>

            <div className="add-item-container">
                <h2>Add New Item</h2>
                <input
                    type="text"
                    placeholder="Item Name"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                />
                <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                    <option value="">Select Category</option>
                    <option value="Bar Essentials">Bar Essentials</option>
                    <option value="Liquor">Liquor</option>
                </select>
                <input
                    type="number"
                    placeholder="Quantity"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                />
                <input
                    type="text"
                    placeholder="Barcode"
                    value={newItem.barcode}
                    onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                />
                <button onClick={handleAddItem}>Add Item</button>
            </div>
        </div>
    );
};

export default Inventory;
