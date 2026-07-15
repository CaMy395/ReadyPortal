import React, { useEffect, useState } from 'react';
import Quagga from 'quagga';
import '../../App.css';

const TYPE_KEYS = [
  { key: '', label: '— None —' },

  // Spirits
  { key: 'vodka', label: 'Vodka' },
  { key: 'tequila', label: 'Tequila' },
  { key: 'cognac', label: 'Cognac' },
  { key: 'whiskey', label: 'Whiskey' },
  { key: 'rum', label: 'Rum' },
  { key: 'gin', label: 'Gin' },
  { key: 'liqueur', label: 'Liqueur' },

  // Wine
  { key: 'red_wine', label: 'Red Wine' },
  { key: 'white_wine', label: 'White Wine' },
  { key: 'rose', label: 'Rosé' },
  { key: 'champagne', label: 'Champagne / Sparkling' },

  // Beer
  { key: 'beer', label: 'Beer' },

  // Mixers
  { key: 'soda', label: 'Soda' },
  { key: 'juice', label: 'Juice' },
  { key: 'water', label: 'Water' },

  // Syrups
  { key: 'syrup', label: 'Syrup' },

  // Garnishes
  { key: 'garnish', label: 'Garnish' },

  // Disposables
  { key: 'cups', label: 'Cups' },
  { key: 'napkins', label: 'Napkins' },
  { key: 'straws', label: 'Straws' },

  // Ice
  { key: 'ice', label: 'Ice' },
];

const CATEGORY_OPTIONS = [
  'Liquor',
  'Mixers',
  'Bar Essentials',
  'Garnishes',
  'Ice',
  'Disposables',
  'Beer',
  'Wine',
  'Equipment',
  'Uncategorized',
];

const STORE_OPTIONS = [
  'Total Wine',
  'Walmart',
  "Sam's Club",
  'Webstaurant',
  'Publix',
  'Restaurant Depot',
  'Other',
];

const ITEM_TYPE_OPTIONS = [
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'rental', label: 'Rental' },
  { value: 'fee', label: 'Fee' },
];


const money = (value) => `$${Number(value || 0).toFixed(2)}`;

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
  const [sizeLabel, setSizeLabel] = useState('');
  const [store, setStore] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [clientPrice, setClientPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [itemType, setItemType] = useState('product');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL;

  const getQueryString = () => {
    if (window.location.search && window.location.search.includes('?')) {
      return window.location.search;
    }

    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) return hash.slice(qIndex);
    return '';
  };

  const queryString = getQueryString();
  const params = new URLSearchParams(queryString);
  const itemsParam = params.get('items') || '';
  const mode = (params.get('mode') || '').toLowerCase();

  const norm = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const filterNames = itemsParam
    .split(',')
    .map((value) => norm(value))
    .filter(Boolean);

  const fetchInventory = () => {
    fetch(`${apiUrl}/inventory`)
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to fetch inventory.');
        }
        return data;
      })
      .then((data) => setInventory(Array.isArray(data) ? data : []))
      .catch((fetchError) => {
        console.error('Error fetching inventory:', fetchError);
        setError(fetchError.message);
      });
  };

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const filteredInventory = inventory.filter((item) => {
    const name = norm(item?.item_name);
    const cat = norm(item?.category);

    const liquorOk = mode === 'liquor' ? cat.includes('liquor') : true;
    const keywordOk = filterNames.length
      ? filterNames.some((filterName) => name.includes(filterName))
      : true;

    return liquorOk && keywordOk;
  });

  const resetAddForm = () => {
    setItemName('');
    setCategory('');
    setQuantity(0);
    setBarcode('');
    setTypeKey('');
    setSizeLabel('');
    setStore('');
    setUnitCost('');
    setClientPrice('');
    setIsActive(true);
    setItemType('product');
  };

  const handleAddItem = (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    fetch(`${apiUrl}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: itemName.trim(),
        item_type: itemType,
        category,
        quantity: itemType === 'product' ? Math.max(0, parseInt(quantity, 10) || 0) : 0,
        barcode: itemType === 'product' ? barcode.trim() : `LIB-${Date.now()}`,
        type_key: typeKey || null,
        size_label: sizeLabel.trim() || null,
        store: store || null,
        unit_cost: Math.max(0, Number(unitCost) || 0),
        client_price:
          clientPrice === '' ? null : Math.max(0, Number(clientPrice) || 0),
        is_active: isActive,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Failed to add item.');
        return data;
      })
      .then((data) => {
        setInventory((previous) =>
          [...previous, data].sort((a, b) =>
            String(a.item_name || '').localeCompare(String(b.item_name || ''))
          )
        );
        setSuccess('Item added successfully!');
        resetAddForm();
        setShowAddItemModal(false);
      })
      .catch((addError) => setError(addError.message));
  };

  const openAddItemModal = () => {
    resetAddForm();
    setError('');
    setSuccess('');
    setShowAddItemModal(true);
  };

  const closeAddItemModal = () => {
    setShowAddItemModal(false);
    setError('');
  };

  const startScanner = () => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: document.querySelector('#scanner'),
          constraints: { facingMode: 'environment' },
        },
        decoder: { readers: ['upc_reader'] },
        locate: true,
      },
      (scannerError) => {
        if (scannerError) {
          console.error('Error initializing Quagga:', scannerError);
          setError('Unable to start the barcode scanner.');
          return;
        }

        Quagga.start();
        setIsScanning(true);
        Quagga.onDetected(handleDetected);
      }
    );
  };

  const handleDetected = (data) => {
    const code = data?.codeResult?.code;
    if (!code) return;

    Quagga.offDetected(handleDetected);
    setCurrentBarcode(code);
    setShowModal(true);
  };

  const stopScanner = () => {
    try {
      Quagga.stop();
      Quagga.offDetected(handleDetected);
    } catch (scannerError) {
      console.error('Error stopping scanner:', scannerError);
    }

    setIsScanning(false);
  };

  const handleModalAction = (action) => {
    if (action === 'cancel') {
      setShowModal(false);
      setCurrentBarcode(null);
      return;
    }

    fetch(`${apiUrl}/inventory/${encodeURIComponent(currentBarcode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1, action }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || `Update failed (${response.status})`);
        }
        return data;
      })
      .then((item) => {
        setInventory((previous) => {
          const exists = previous.some(
            (inventoryItem) => inventoryItem.barcode === item.barcode
          );

          if (exists) {
            return previous.map((inventoryItem) =>
              inventoryItem.barcode === item.barcode
                ? { ...inventoryItem, ...item }
                : inventoryItem
            );
          }

          return [...previous, item];
        });

        setShowModal(false);
        setCurrentBarcode(null);
      })
      .catch((updateError) => {
        console.error('Error updating inventory:', updateError);
        alert(updateError.message || 'Error updating inventory');
      });
  };

  const handleDeleteItem = (barcodeToDelete) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    fetch(`${apiUrl}/inventory/${encodeURIComponent(barcodeToDelete)}`, {
      method: 'DELETE',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to delete item');
        }

        setInventory((previous) =>
          previous.filter((item) => item.barcode !== barcodeToDelete)
        );
        setEditingItem(null);
        alert('Item deleted successfully!');
      })
      .catch((deleteError) => {
        console.error('Error deleting item:', deleteError);
        alert(deleteError.message || 'Error deleting item');
      });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const originalBarcode = editingItem.original_barcode || editingItem.barcode;

    fetch(`${apiUrl}/inventory/${encodeURIComponent(originalBarcode)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name: editingItem.item_name,
        item_type: editingItem.item_type || 'product',
        category: editingItem.category,
        quantity:
          (editingItem.item_type || 'product') === 'product'
            ? Math.max(0, parseInt(editingItem.quantity, 10) || 0)
            : 0,
        new_barcode: editingItem.barcode,
        type_key: editingItem.type_key || null,
        size_label: editingItem.size_label || null,
        store: editingItem.store || null,
        unit_cost: Math.max(0, Number(editingItem.unit_cost) || 0),
        client_price:
          editingItem.client_price === '' || editingItem.client_price == null
            ? null
            : Math.max(0, Number(editingItem.client_price) || 0),
        is_active: editingItem.is_active !== false,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || `Failed to save changes (${response.status})`);
        }
        return data;
      })
      .then((updated) => {
        setInventory((previous) =>
          previous.map((item) =>
            item.barcode === originalBarcode ? { ...item, ...updated } : item
          )
        );
        setEditingItem(null);
        alert('Item updated successfully!');
      })
      .catch((saveError) => {
        console.error('Error saving changes:', saveError);
        alert(saveError.message || 'Error saving changes');
      });
  };

  const handleEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditingItem((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const beginEdit = (item) => {
    setEditingItem({
      ...item,
      original_barcode: item.barcode,
      unit_cost: item.unit_cost ?? 0,
      client_price: item.client_price ?? '',
      size_label: item.size_label ?? '',
      store: item.store ?? '',
      is_active: item.is_active !== false,
      item_type: item.item_type || 'product',
    });
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

        <div id="scanner" className="scanner-box" />

        <button onClick={openAddItemModal} className="add-item-button">
          Add New Item
        </button>

        {showAddItemModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Add New Inventory Item</h3>

              {error && <p style={{ color: 'red' }}>{error}</p>}
              {success && <p style={{ color: 'green' }}>{success}</p>}

              <form onSubmit={handleAddItem}>
                <input
                  type="text"
                  placeholder="Item Name (brand + product)"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  required
                />

                <select
                  value={itemType}
                  onChange={(event) => setItemType(event.target.value)}
                  required
                >
                  {ITEM_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                >
                  <option value="">Select Category</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={typeKey}
                  onChange={(event) => setTypeKey(event.target.value)}
                >
                  {TYPE_KEYS.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Size (example: 750 mL or 500 count)"
                  value={sizeLabel}
                  onChange={(event) => setSizeLabel(event.target.value)}
                />

                <select value={store} onChange={(event) => setStore(event.target.value)}>
                  <option value="">Select Store</option>
                  {STORE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ready Cost"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  required
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Client Price (optional)"
                  value={clientPrice}
                  onChange={(event) => setClientPrice(event.target.value)}
                />

                {itemType === 'product' && (
                  <>
                    <input
                      type="number"
                      min="0"
                      placeholder="Quantity"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                    />

                    <input
                      type="text"
                      placeholder="Barcode"
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      required
                    />
                  </>
                )}

                <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                  />
                  Active item
                </label>

                <div className="modal-actions">
                  <button type="button" onClick={closeAddItemModal}>
                    Cancel
                  </button>
                  <button type="submit">Add Item</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <h1 className="inventory-title">Inventory & Pricing Library</h1>

      {(filterNames.length > 0 || mode === 'liquor') && (
        <div style={{ margin: '8px 0', fontWeight: 700 }}>
          Filtered view: showing {filteredInventory.length} item
          {filteredInventory.length === 1 ? '' : 's'}
          {mode === 'liquor' ? ' (Liquor only)' : ''}
        </div>
      )}

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Item Type</th>
              <th>Category</th>
              <th>Type Key</th>
              <th>Size</th>
              <th>Store</th>
              <th>Ready Cost</th>
              <th>Client Price</th>
              <th>Quantity</th>
              <th>Barcode</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredInventory.map((item) => {
              const isEditing =
                editingItem &&
                editingItem.original_barcode === item.barcode;

              return (
                <tr key={item.id || item.barcode}>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        name="item_name"
                        value={editingItem.item_name || ''}
                        onChange={handleEditChange}
                      />
                    ) : (
                      item.item_name
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <select
                        name="item_type"
                        value={editingItem.item_type || 'product'}
                        onChange={handleEditChange}
                      >
                        {ITEM_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      editingItem?.item_type || item.item_type || 'product'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <select
                        name="category"
                        value={editingItem.category || ''}
                        onChange={handleEditChange}
                      >
                        <option value="">Select Category</option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.category || '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <select
                        name="type_key"
                        value={editingItem.type_key || ''}
                        onChange={handleEditChange}
                      >
                        {TYPE_KEYS.map((type) => (
                          <option key={type.key} value={type.key}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.type_key || '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        name="size_label"
                        value={editingItem.size_label || ''}
                        onChange={handleEditChange}
                      />
                    ) : (
                      item.size_label || '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <select
                        name="store"
                        value={editingItem.store || ''}
                        onChange={handleEditChange}
                      >
                        <option value="">Select Store</option>
                        {STORE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.store || '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="unit_cost"
                        value={editingItem.unit_cost ?? 0}
                        onChange={handleEditChange}
                      />
                    ) : (
                      money(item.unit_cost)
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="client_price"
                        value={editingItem.client_price ?? ''}
                        onChange={handleEditChange}
                      />
                    ) : item.client_price == null ? (
                      '—'
                    ) : (
                      money(item.client_price)
                    )}
                  </td>

                  <td>
                    {(isEditing ? editingItem.item_type : item.item_type) === 'product' ? (
                      isEditing ? (
                        <input
                          type="number"
                          min="0"
                          name="quantity"
                          value={editingItem.quantity ?? 0}
                          onChange={handleEditChange}
                        />
                      ) : (
                        item.quantity
                      )
                    ) : (
                      '—'
                    )}
                  </td>

                  <td>
                    {(isEditing ? editingItem.item_type : item.item_type) === 'product' ? (
                      isEditing ? (
                        <input
                          type="text"
                          name="barcode"
                          value={editingItem.barcode || ''}
                          onChange={handleEditChange}
                        />
                      ) : (
                        item.barcode || '—'
                      )
                    ) : (
                      '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={editingItem.is_active !== false}
                        onChange={handleEditChange}
                      />
                    ) : item.is_active === false ? (
                      'No'
                    ) : (
                      'Yes'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <>
                        <button type="button" onClick={handleSaveEdit}>
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingItem(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.barcode)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => beginEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.barcode)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
