import React, { useState, useEffect } from 'react';
import Quagga from 'quagga';
import '../../App.css'; // Assuming you have a CSS file for styling

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [currentBarcode, setCurrentBarcode] = useState(null);

    const apiUrl = process.env.REACT_APP_API_URL;
    const LOW_QUANTITY_THRESHOLD = 1; // Define the threshold

    useEffect(() => {
        // Fetch inventory items
        fetch(`${apiUrl}/inventory`)
            .then((response) => response.json())
            .then((data) => {
                setInventory(data);
                checkLowInventory(data);
            })
            .catch((error) => console.error('Error fetching inventory:', error));
    }, [apiUrl]);

    // Function to check for low inventory and return the items
    const checkLowInventory = (inventory) => {
        return inventory.filter((item) => item.quantity <= LOW_QUANTITY_THRESHOLD);
    };

    // Start scanner
    const startScanner = () => {
        Quagga.init(
            {
                inputStream: {
                    type: 'LiveStream',
                    target: document.querySelector('#scanner'),
                    constraints: {
                        facingMode: 'environment',
                    },
                },
                decoder: {
                    readers: ['upc_reader'],
                },
                locate: true,
            },
            (err) => {
                if (err) {
                    console.error('Error initializing Quagga:', err);
                    return;
                }
                Quagga.start();
                setIsScanning(true);
            }
        );
    };

    // Stop scanner
    const stopScanner = () => {
        Quagga.stop();
        setIsScanning(false);
    };

    // Handle Barcode Detection
    Quagga.onDetected((data) => {
        const barcode = data.codeResult.code;
        setCurrentBarcode(barcode);
        setShowModal(true);
    });

    const handleModalAction = (action) => {
        if (action === 'cancel') {
            setShowModal(false);
            setCurrentBarcode(null);
            return;
        }

        const quantityChange = action === 'add' ? 1 : -1;

        fetch(`${apiUrl}/inventory/${currentBarcode}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: Math.abs(quantityChange), action }),
        })
            .then((response) => response.json())
            .then((item) => {
                if (item.error) {
                    alert(item.error);
                } else {
                    setInventory((prev) => {
                        const updatedInventory = prev.map((invItem) =>
                            invItem.barcode === currentBarcode
                                ? { ...invItem, quantity: item.quantity }
                                : invItem
                        );
                        checkLowInventory(updatedInventory); // Recheck for low inventory
                        return updatedInventory;
                    });
                }
            })
            .catch((error) => console.error('Error updating inventory:', error));
    };
    

    // Handle deleting an item
    const handleDeleteItem = (barcode) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            fetch(`${apiUrl}/inventory/${barcode}`, {
                method: 'DELETE',
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to delete item');
                    }
                    setInventory((prev) => prev.filter((item) => item.barcode !== barcode));
                    setEditingItem(null); // Exit edit mode
                    alert('Item deleted successfully!');
                })
                .catch((error) => console.error('Error deleting item:', error));
        }
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
        setEditingItem((prev) => ({
            ...prev,
            [name]: name === "barcode" ? value : prev[name],
        }));
    };
    

    return (
        <div className="inventory-page">
            <div className="scanner-container">
                <h1>Barcode Scanner</h1>
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
                        <tr
                            key={item.id}
                            className={item.quantity <= LOW_QUANTITY_THRESHOLD ? 'low-inventory' : ''}
                        >
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
                            <td>
    {editingItem && editingItem.barcode === item.barcode ? (
        <input
            type="text"
            name="barcode"
            value={editingItem.barcode}
            onChange={handleEditChange}
        />
    ) : (
        item.barcode
    )}
</td>

                            <td>
                                {editingItem && editingItem.barcode === item.barcode ? (
                                    <>
                                        <button className="save-button" onClick={handleSaveEdit}>
                                            Save
                                        </button>
                                        <button className="cancel-button" onClick={() => setEditingItem(null)}>
                                            Cancel
                                        </button>
                                        <button
                                            className="delete-button"
                                            onClick={() => handleDeleteItem(editingItem.barcode)}
                                        >
                                            Delete
                                        </button>
                                    </>
                                ) : (
                                    <button className="edit-button" onClick={() => setEditingItem(item)}>
                                        Edit
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}

                    </tbody>
                </table>
            </div>
    
            {/* Modal for Barcode Actions */}
            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Barcode Detected</h2>
                        <p>Detected Barcode: {currentBarcode}</p>
                        <div className="modal-actions">
                            <button
                                onClick={() => handleModalAction('add')}
                                className="modal-button add"
                            >
                                Add Quantity
                            </button>
                            <button
                                onClick={() => handleModalAction('use')}
                                className="modal-button use"
                            >
                                Use Quantity
                            </button>
                            <button
                                onClick={() => handleModalAction('cancel')}
                                className="modal-button cancel"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
