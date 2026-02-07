import React, { useState, useEffect } from 'react';
import Quagga from 'quagga';
import '../../App.css';

const TYPE_KEYS = [
  { key: '', label: '— none —' },
  { key: 'vodka_750', label: 'Vodka 750ml (Tito’s)' },
  { key: 'vodka_175', label: 'Vodka 1.75L (Tito’s)' },
  { key: 'tequila_750', label: 'Tequila 750ml (Espolón)' },
  { key: 'tequila_175', label: 'Tequila 1.75L (Espolón)' },
  { key: 'cognac_750', label: 'Cognac 750ml (Hennessy)' },
  { key: 'rum_750', label: 'Rum 750ml (Bacardi / Wray & Nephew)' },
  { key: 'rum_175', label: 'Rum 1.75L (Bacardi / Wray & Nephew)' },
  { key: 'whiskey_750', label: 'Whiskey 750ml (Maker’s / Crown)' },
  { key: 'whiskey_175', label: 'Whiskey 1.75L (Maker’s / Crown)' },
  { key: 'triple_sec_750', label: 'Triple Sec 750ml' },
  { key: 'triple_sec_175', label: 'Triple Sec 1.75L' },
  { key: 'sweet_sour_175', label: 'Sweet & Sour 1.75L' },
];

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [barcode, setBarcode] = useState('');
  const [typeKey, setTypeKey] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL;

  // ✅ Read query params from BrowserRouter OR HashRouter
  const getQueryString = () => {
    if (window.location.search && window.location.search.includes("?")) return window.location.search;

    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex !== -1) return hash.slice(qIndex);
    return "";
  };

  const queryString = getQueryString();
  const params = new URLSearchParams(queryString);

  const itemsParam = params.get("items") || "";
  const mode = (params.get("mode") || "").toLowerCase();

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const filterNames = itemsParam
    .split(",")
    .map((s) => norm(s))
    .filter(Boolean);

  useEffect(() => {
    fetch(`${apiUrl}/inventory`)
      .then((response) => response.json())
      .then((data) => setInventory(Array.isArray(data) ? data : []))
      .catch((error) => console.error('Error fetching inventory:', error));
  }, [apiUrl]);

  // ✅ Filtered list (liquor-only + keyword match)
  const filteredInventory = inventory.filter((item) => {
    const name = norm(item?.item_name);
    const cat = norm(item?.category);

    const liquorOk = mode === "liquor" ? cat.includes("liquor") : true;
    const keywordOk = filterNames.length ? filterNames.some((f) => name.includes(f)) : true;

    return liquorOk && keywordOk;
  });

  const handleAddItem = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    fetch(`${apiUrl}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: itemName,
        category,
        quantity: parseInt(quantity, 10),
        barcode,
        type_key: typeKey || null,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Failed to add item.');
        return data;
      })
      .then((data) => {
        setInventory((prev) => [...prev, data]);
        setSuccess('Item added successfully!');
        setItemName('');
        setCategory('');
        setQuantity(0);
        setBarcode('');
        setTypeKey('');
        setShowAddItemModal(false);
      })
      .catch((error) => setError(error.message));
  };

  const openAddItemModal = () => {
    setItemName('');
    setCategory('');
    setQuantity(0);
    setBarcode('');
    setTypeKey('');
    setError('');
    setSuccess('');
    setShowAddItemModal(true);
  };

  const closeAddItemModal = () => setShowAddItemModal(false);

  // Start scanner
  const startScanner = () => {
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: document.querySelector("#scanner"),
          constraints: { facingMode: "environment" },
        },
        decoder: { readers: ["upc_reader"] },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("Error initializing Quagga:", err);
          return;
        }
        Quagga.start();
        setIsScanning(true);
        Quagga.onDetected(handleDetected);
      }
    );
  };

  const handleDetected = (data) => {
    const code = data.codeResult.code;
    Quagga.offDetected(handleDetected);
    setCurrentBarcode(code);
    setShowModal(true);
  };

  const stopScanner = () => {
    Quagga.stop();
    Quagga.offDetected(handleDetected);
    setIsScanning(false);
  };

  const handleModalAction = (action) => {
    if (action === 'cancel') {
      setShowModal(false);
      setCurrentBarcode(null);
      return;
    }

    fetch(`${apiUrl}/inventory/${currentBarcode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1, action }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `Update failed (${response.status})`);
        return data;
      })
      .then((item) => {
        setInventory((prev) => {
          const exists = prev.some((inv) => inv.barcode === item.barcode);
          if (exists) return prev.map((inv) => (inv.barcode === item.barcode ? { ...inv, ...item } : inv));
          return [...prev, item];
        });

        setShowModal(false);
        setCurrentBarcode(null);
      })
      .catch((err) => {
        console.error('Error updating inventory:', err);
        alert(err.message || 'Error updating inventory');
      });
  };

  const handleDeleteItem = (barcodeToDelete) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    fetch(`${apiUrl}/inventory/${barcodeToDelete}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to delete item');
        setInventory((prev) => prev.filter((item) => item.barcode !== barcodeToDelete));
        setEditingItem(null);
        alert('Item deleted successfully!');
      })
      .catch((error) => console.error('Error deleting item:', error));
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    fetch(`${apiUrl}/inventory/${editingItem.barcode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: editingItem.item_name,
        category: editingItem.category,
        quantity: parseInt(editingItem.quantity, 10) || 0,
        type_key: editingItem.type_key || null,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `Failed to save changes (${response.status})`);
        return data;
      })
      .then((updated) => {
        setInventory((prev) => prev.map((it) => (it.barcode === updated.barcode ? { ...it, ...updated } : it)));
        setEditingItem(null);
        alert('Item updated successfully!');
      })
      .catch((error) => {
        console.error('Error saving changes:', error);
        alert(error.message || 'Error saving changes');
      });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingItem((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="inventory-page">
      <div className="scanner-container">
        <h1>Barcode Scanner</h1>
        {!isScanning ? (
          <button className="scanner-button" onClick={startScanner}>Start Scanner</button>
        ) : (
          <button className="scanner-button" onClick={stopScanner}>Stop Scanner</button>
        )}
        <div id="scanner" className="scanner-box"></div>

        <button onClick={openAddItemModal} className="add-item-button">
          Add New Item
        </button>

        {showAddItemModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Add New Item</h3>
              {error && <p style={{ color: 'red' }}>{error}</p>}
              {success && <p style={{ color: 'green' }}>{success}</p>}

              <form onSubmit={handleAddItem}>
                <input
                  type="text"
                  placeholder="Item Name (Brand + size)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="Category (ex: Liquor)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />

                <select value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
                  {TYPE_KEYS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="Barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  required
                />

                <div className="modal-actions">
                  <button type="button" onClick={closeAddItemModal}>Cancel</button>
                  <button type="submit">Add Item</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <h1 className="inventory-title">Inventory Management</h1>

      {(filterNames.length > 0 || mode === "liquor") && (
        <div style={{ margin: "8px 0", fontWeight: 700 }}>
          Filtered view: showing {filteredInventory.length} item{filteredInventory.length === 1 ? "" : "s"}
          {mode === "liquor" ? " (Liquor only)" : ""}
        </div>
      )}

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Type Key</th>
              <th>Quantity</th>
              <th>Barcode</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredInventory.map((item) => (
              <tr key={item.barcode}>
                <td>
                  {editingItem && editingItem.barcode === item.barcode ? (
                    <input
                      type="text"
                      name="item_name"
                      value={editingItem.item_name || ''}
                      onChange={handleEditChange}
                    />
                  ) : item.item_name}
                </td>

                <td>
                  {editingItem && editingItem.barcode === item.barcode ? (
                    <select
                      name="category"
                      value={editingItem.category || ''}
                      onChange={handleEditChange}
                    >
                      <option value="Bar Essentials">Bar Essentials</option>
                      <option value="Liquor">Liquor</option>
                      <option value="Uncategorized">Uncategorized</option>
                    </select>
                  ) : item.category}
                </td>

                <td>
                  {editingItem && editingItem.barcode === item.barcode ? (
                    <select
                      name="type_key"
                      value={editingItem.type_key || ''}
                      onChange={handleEditChange}
                    >
                      {TYPE_KEYS.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  ) : (item.type_key || '—')}
                </td>

                <td>
                  {editingItem && editingItem.barcode === item.barcode ? (
                    <input
                      type="number"
                      name="quantity"
                      value={editingItem.quantity ?? 0}
                      onChange={handleEditChange}
                    />
                  ) : item.quantity}
                </td>

                <td>{item.barcode}</td>

                <td>
                  {editingItem && editingItem.barcode === item.barcode ? (
                    <>
                      <button onClick={handleSaveEdit}>Save</button>
                      <button onClick={() => setEditingItem(null)}>Cancel</button>
                      <button onClick={() => handleDeleteItem(item.barcode)}>Delete</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingItem(item)}>Edit</button>
                      <button onClick={() => handleDeleteItem(item.barcode)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Barcode Detected</h2>
            <p>Detected Barcode: {currentBarcode}</p>
            <div className="modal-actions">
              <button onClick={() => handleModalAction('add')} className="modal-button add">Add Quantity</button>
              <button onClick={() => handleModalAction('use')} className="modal-button use">Use Quantity</button>
              <button onClick={() => handleModalAction('cancel')} className="modal-button cancel">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
