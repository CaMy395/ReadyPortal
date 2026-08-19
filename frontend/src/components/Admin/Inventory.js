import React, { useEffect, useState } from 'react';
import Quagga from 'quagga';
import '../../App.css';

const TYPE_KEYS = [
  { key: '', label: '— None —' },

  // ==========================
  // SPIRITS
  // ==========================
  { key: 'vodka', label: 'Vodka' },
  { key: 'tequila', label: 'Tequila' },
  { key: 'cognac', label: 'Cognac' },
  { key: 'whiskey', label: 'Whiskey' },
  { key: 'rum', label: 'Rum' },
  { key: 'gin', label: 'Gin' },
  { key: 'liqueur', label: 'Liqueur' },

  // ==========================
  // WINE
  // ==========================
  { key: 'red_wine', label: 'Red Wine' },
  { key: 'white_wine', label: 'White Wine' },
  { key: 'rose', label: 'Rosé' },
  { key: 'champagne', label: 'Champagne / Sparkling' },

  // ==========================
  // BEER
  // ==========================
  { key: 'light_beer', label: 'Light Beer' },
  { key: 'lager', label: 'Lager' },
  { key: 'ipa', label: 'IPA' },
  { key: 'hard_seltzer', label: 'Hard Seltzer' },

  // ==========================
  // MIXERS
  // ==========================
  { key: 'cola', label: 'Cola' },
  { key: 'diet_cola', label: 'Diet Cola' },
  { key: 'lemon_lime_soda', label: 'Lemon-Lime Soda' },
  { key: 'ginger_ale', label: 'Ginger Ale' },
  { key: 'ginger_beer', label: 'Ginger Beer' },
  { key: 'club_soda', label: 'Club Soda' },
  { key: 'tonic_water', label: 'Tonic Water' },
  { key: 'energy_drink', label: 'Energy Drink' },

  { key: 'cranberry_juice', label: 'Cranberry Juice' },
  { key: 'pineapple_juice', label: 'Pineapple Juice' },
  { key: 'orange_juice', label: 'Orange Juice' },
  { key: 'grapefruit_juice', label: 'Grapefruit Juice' },
  { key: 'lemonade', label: 'Lemonade' },
  { key: 'limeade', label: 'Limeade' },

  { key: 'water', label: 'Water' },

  // ==========================
  // SYRUPS
  // ==========================
  { key: 'simple_syrup', label: 'Simple Syrup' },
  { key: 'grenadine', label: 'Grenadine' },
  { key: 'syrup', label: 'Other Syrup' },

  // ==========================
  // GARNISHES
  // ==========================
  { key: 'limes', label: 'Limes' },
  { key: 'lemons', label: 'Lemons' },
  { key: 'oranges', label: 'Oranges' },
  { key: 'mint', label: 'Mint' },
  { key: 'garnish', label: 'Other Garnish' },

  // ==========================
  // DISPOSABLES
  // ==========================
  { key: 'cups', label: 'Cups' },
  { key: 'napkins', label: 'Napkins' },
  { key: 'straws', label: 'Straws' },

  // ==========================
  // ICE
  // ==========================
  { key: 'ice', label: 'Ice' },

  // ==========================
  // BAR TOOLS / EQUIPMENT
  // ==========================
  { key: 'tools', label: 'Bar Tools' },
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

const TRACKING_TYPE_OPTIONS = [
  { value: 'consumable', label: 'Consumable' },
  { value: 'reusable', label: 'Reusable Equipment' },
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
  const [trackingType, setTrackingType] = useState('consumable');
  const [availability, setAvailability] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [returnCheckout, setReturnCheckout] = useState(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [checkoutType, setCheckoutType] = useState('event');
  const [checkoutPerson, setCheckoutPerson] = useState('');
  const [checkoutGigId, setCheckoutGigId] = useState('');
  const [checkoutReturnDate, setCheckoutReturnDate] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnNotes, setReturnNotes] = useState('');

  // Inventory table filters
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeKeyFilter, setTypeKeyFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');

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

  const fetchEquipmentData = () => {
    Promise.all([
      fetch(`${apiUrl}/inventory-availability`).then(async (r) => {
        const d = await r.json().catch(() => []);
        if (!r.ok) throw new Error(d?.error || 'Failed to fetch equipment availability.');
        return d;
      }),
      fetch(`${apiUrl}/inventory-checkouts?status=all`).then(async (r) => {
        const d = await r.json().catch(() => []);
        if (!r.ok) throw new Error(d?.error || 'Failed to fetch equipment checkouts.');
        return d;
      }),
      fetch(`${apiUrl}/gigs`).then(async (r) => {
        const d = await r.json().catch(() => []);
        if (!r.ok) throw new Error(d?.error || 'Failed to fetch gigs.');
        return d;
      }),
    ])
      .then(([availabilityData, checkoutData, gigData]) => {
        setAvailability(Array.isArray(availabilityData) ? availabilityData : []);
        setCheckouts(Array.isArray(checkoutData) ? checkoutData : []);
        setGigs(Array.isArray(gigData) ? gigData : []);
      })
      .catch((equipmentError) => {
        console.error('Equipment tracking fetch error:', equipmentError);
        setError(equipmentError.message);
      });
  };

  const refreshAll = () => {
    fetchInventory();
    fetchEquipmentData();
  };

  const getAvailability = (itemId) =>
    availability.find((row) => Number(row.id) === Number(itemId));

  const formatGigDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  };

  const getGigLabel = (gig) => {
    if (!gig) return 'Unknown Event';

    const client = gig.client || 'No Client';
    const eventType = gig.event_type || 'Event';
    const date = formatGigDate(gig.date);

    return `${client} — ${eventType}${date ? ` — ${date}` : ''}`;
  };

  const getGigById = (gigId) =>
    gigs.find((gig) => Number(gig.id) === Number(gigId));

  const sortedGigs = [...gigs].sort((a, b) => {
    const aTime = a?.date ? new Date(a.date).getTime() : 0;
    const bTime = b?.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  const openCheckout = (item) => {
    const row = getAvailability(item.id);
    setCheckoutItem({ ...item, availability: row });
    setCheckoutQty(1);
    setCheckoutType('event');
    setCheckoutPerson('');
    setCheckoutGigId('');
    setCheckoutReturnDate('');
    setCheckoutNotes('');
  };

  const submitCheckout = (event) => {
    event.preventDefault();
    if (!checkoutItem) return;

    if (checkoutType === 'event' && !checkoutGigId) {
      setError('Please select the client / event for this checkout.');
      return;
    }

    setError('');

    fetch(`${apiUrl}/inventory-checkouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventory_item_id: checkoutItem.id,
        quantity: Math.max(1, parseInt(checkoutQty, 10) || 1),
        checkout_type: checkoutType,
        gig_id: checkoutGigId ? Number(checkoutGigId) : null,
        person_name: checkoutPerson.trim() || null,
        expected_return: checkoutReturnDate || null,
        condition_out: 'good',
        notes: checkoutNotes.trim() || null,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Checkout failed.');
        return data;
      })
      .then(() => {
        setCheckoutItem(null);
        setSuccess('Equipment checked out successfully.');
        refreshAll();
      })
      .catch((checkoutError) => setError(checkoutError.message));
  };

  const openReturn = (checkout) => {
    setReturnCheckout(checkout);
    setReturnQty(Math.max(1, Number(checkout.quantity_outstanding) || 1));
    setReturnCondition('good');
    setReturnNotes('');
  };

  const submitReturn = (event) => {
    event.preventDefault();
    if (!returnCheckout) return;

    fetch(`${apiUrl}/inventory-checkouts/${returnCheckout.id}/return`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        return_quantity: Math.max(1, parseInt(returnQty, 10) || 1),
        return_condition: returnCondition,
        notes: returnNotes.trim() || null,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Return failed.');
        return data;
      })
      .then(() => {
        setReturnCheckout(null);
        setSuccess('Equipment return recorded.');
        refreshAll();
      })
      .catch((returnError) => setError(returnError.message));
  };

  const markFound = (checkout) => {
    if (!checkout?.id) return;

    if (!window.confirm(`Mark "${checkout.item_name}" as found?`)) {
      return;
    }

    setError('');
    setSuccess('');

    fetch(`${apiUrl}/inventory-checkouts/${checkout.id}/found`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: 'Item was previously marked missing and has now been found.',
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to mark equipment found.');
        }
        return data;
      })
      .then(() => {
        setSuccess('Equipment marked as found.');
        refreshAll();
      })
      .catch((foundError) => {
        console.error('Failed to mark equipment found:', foundError);
        setError(foundError.message);
      });
  };

  const markMissing = (checkout) => {
    const notes = window.prompt(`Notes for missing ${checkout.item_name}:`, '');
    if (notes === null) return;
    fetch(`${apiUrl}/inventory-checkouts/${checkout.id}/missing`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Failed to mark missing.');
        return data;
      })
      .then(() => {
        setSuccess('Equipment marked missing.');
        refreshAll();
      })
      .catch((missingError) => setError(missingError.message));
  };

  const openCheckouts = checkouts.filter((c) => ['out', 'partial', 'missing'].includes(c.status));

  useEffect(() => {
    fetchInventory();
    fetchEquipmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const filteredInventory = inventory.filter((item) => {
    const name = norm(item?.item_name);
    const cat = norm(item?.category);
    const type = norm(item?.type_key);
    const storeName = norm(item?.store);
    const libraryType = norm(item?.item_type || 'product');
    const size = norm(item?.size_label);
    const barcodeValue = norm(item?.barcode);

    // Existing URL-driven filtering from Package Builder
    const liquorOk = mode === 'liquor' ? cat.includes('liquor') : true;
    const keywordOk = filterNames.length
      ? filterNames.some(
          (filterName) =>
            name.includes(filterName) ||
            type.includes(filterName) ||
            cat.includes(filterName)
        )
      : true;

    // New on-page filters
    const search = norm(searchFilter);
    const searchOk = search
      ? [name, cat, type, storeName, size, barcodeValue].some((value) =>
          value.includes(search)
        )
      : true;

    const categoryOk = categoryFilter
      ? item?.category === categoryFilter
      : true;

    const typeKeyOk = typeKeyFilter
      ? item?.type_key === typeKeyFilter
      : true;

    const storeOk = storeFilter
      ? item?.store === storeFilter
      : true;

    const itemTypeOk = itemTypeFilter
      ? libraryType === norm(itemTypeFilter)
      : true;

    const activeOk =
      activeFilter === 'all'
        ? true
        : activeFilter === 'inactive'
          ? item?.is_active === false
          : item?.is_active !== false;

    return (
      liquorOk &&
      keywordOk &&
      searchOk &&
      categoryOk &&
      typeKeyOk &&
      storeOk &&
      itemTypeOk &&
      activeOk
    );
  });

  const clearFilters = () => {
    setSearchFilter('');
    setCategoryFilter('');
    setTypeKeyFilter('');
    setStoreFilter('');
    setItemTypeFilter('');
    setActiveFilter('active');
  };

  const hasTableFilters =
    searchFilter ||
    categoryFilter ||
    typeKeyFilter ||
    storeFilter ||
    itemTypeFilter ||
    activeFilter !== 'active';

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
    setTrackingType('consumable');
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
        tracking_type: trackingType,
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
        tracking_type: editingItem.tracking_type || 'consumable',
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
      tracking_type: item.tracking_type || 'consumable',
    });
  };

  const duplicateItem = (item) => {
    setItemName(`${item.item_name} Copy`);
    setItemType(item.item_type || "product");
    setTrackingType(item.tracking_type || 'consumable');
    setCategory(item.category || "");
    setTypeKey(item.type_key || "");
    setSizeLabel(item.size_label || "");
    setStore(item.store || "");
    setUnitCost(item.unit_cost || "");
    setClientPrice(item.client_price || "");
    setQuantity(0);           // Start fresh
    setBarcode("");           // Must be unique
    setIsActive(item.is_active !== false);

    setError("");
    setSuccess("");
    setShowAddItemModal(true);
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

                {itemType === 'product' && (
                  <select
                    value={trackingType}
                    onChange={(event) => setTrackingType(event.target.value)}
                  >
                    {TRACKING_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

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

      <div style={{ margin: '18px 0 24px' }}>
        <h1 className="inventory-title">Outstanding Equipment</h1>
        {openCheckouts.length === 0 ? (
          <p>No reusable equipment is currently checked out.</p>
        ) : (
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead><tr><th>Equipment</th><th>Qty Out</th><th>Out To</th><th>Type</th><th>Date Out</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {openCheckouts.map((checkout) => (
                  <tr key={`checkout-${checkout.id}`}>
                    <td>{checkout.item_name}</td>
                    <td>{checkout.quantity_outstanding}</td>
                    <td>
                      {checkout.gig_id
                        ? getGigLabel(getGigById(checkout.gig_id))
                        : checkout.person_name || '—'}
                    </td>
                    <td>{checkout.checkout_type}</td>
                    <td>{checkout.date_out ? new Date(checkout.date_out).toLocaleString() : '—'}</td>
                    <td>{checkout.expected_return ? new Date(checkout.expected_return).toLocaleDateString() : '—'}</td>
                    <td style={{ fontWeight: 800, color: checkout.is_overdue ? '#ff4d4d' : undefined }}>
                      {checkout.status === 'missing' ? 'MISSING' : checkout.is_overdue ? 'OVERDUE' : checkout.status.toUpperCase()}
                    </td>
                    <td>
                      {checkout.status === 'missing' ? (
                        <button
                          type="button"
                          onClick={() => markFound(checkout)}
                        >
                          Found
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openReturn(checkout)}
                          >
                            Return
                          </button>

                          <button
                            type="button"
                            onClick={() => markMissing(checkout)}
                          >
                            Missing
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <div
        style={{
          margin: '12px 0 16px',
          padding: '14px',
          border: '1px solid rgba(0,0,0,0.15)',
          borderRadius: '12px',
          background: '#000000',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>Filter Inventory</div>
            <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '3px' }}>
              Showing {filteredInventory.length} of {inventory.length} items
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasTableFilters}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.2)',
              background: 'black',
              cursor: hasTableFilters ? 'pointer' : 'not-allowed',
              opacity: hasTableFilters ? 1 : 0.5,
              fontWeight: 700,
            }}
          >
            Clear Filters
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '10px',
          }}
        >
          <input
            type="search"
            placeholder="Search name, size, barcode..."
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            style={{ padding: '9px', borderRadius: '8px', border: '1px solid #ccc' }}
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            style={{ padding: '9px', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={typeKeyFilter}
            onChange={(event) => setTypeKeyFilter(event.target.value)}
            style={{ padding: '9px', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="">All Type Keys</option>
            {TYPE_KEYS.filter((type) => type.key).map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
            style={{ padding: '9px', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="">All Stores</option>
            {STORE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={itemTypeFilter}
            onChange={(event) => setItemTypeFilter(event.target.value)}
            style={{ padding: '9px', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="">All Item Types</option>
            {ITEM_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            style={{ padding: '9px', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">Active & Inactive</option>
          </select>
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Item Type</th>
              <th>Tracking</th>
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
                    {isEditing && (editingItem.item_type || 'product') === 'product' ? (
                      <select name="tracking_type" value={editingItem.tracking_type || 'consumable'} onChange={handleEditChange}>
                        {TRACKING_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (item.item_type || 'product') === 'product' ? (
                      item.tracking_type === 'reusable' ? 'Reusable' : 'Consumable'
                    ) : '—'}
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
                      ) : item.tracking_type === 'reusable' ? (
                        (() => {
                          const row = getAvailability(item.id);
                          return row ? `Owned ${row.total_owned} / Out ${row.checked_out} / Available ${row.available_quantity}` : item.quantity;
                        })()
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
                        {item.tracking_type === 'reusable' && (
                          <button type="button" onClick={() => openCheckout(item)}>
                            Check Out
                          </button>
                        )}

                        <button type="button" onClick={() => beginEdit(item)}>
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => duplicateItem(item)}
                        >
                          Duplicate
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

      {checkoutItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Check Out Equipment</h3>
            <p><strong>{checkoutItem.item_name}</strong></p>
            <p>Available: {checkoutItem.availability?.available_quantity ?? checkoutItem.quantity}</p>
            <form onSubmit={submitCheckout}>
              <input type="number" min="1" max={checkoutItem.availability?.available_quantity ?? checkoutItem.quantity} value={checkoutQty} onChange={(e) => setCheckoutQty(e.target.value)} required />
              <select
                value={checkoutType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setCheckoutType(nextType);
                  if (nextType !== 'event') setCheckoutGigId('');
                }}
              >
                <option value="event">Event</option>
                <option value="staff">Staff</option>
                <option value="other">Other</option>
              </select>
              {checkoutType === 'event' && (
                <>
                  <label>Client / Event</label>
                  <select
                    value={checkoutGigId}
                    onChange={(e) => setCheckoutGigId(e.target.value)}
                    required
                  >
                    <option value="">Select client / event...</option>
                    {sortedGigs.map((gig) => (
                      <option key={gig.id} value={gig.id}>
                        {getGigLabel(gig)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <input
                type="text"
                placeholder={
                  checkoutType === 'event'
                    ? 'Person responsible (optional)'
                    : 'Person responsible'
                }
                value={checkoutPerson}
                onChange={(e) => setCheckoutPerson(e.target.value)}
              />

              <label>Expected return</label>
              <input type="datetime-local" value={checkoutReturnDate} onChange={(e) => setCheckoutReturnDate(e.target.value)} />
              <textarea placeholder="Notes" value={checkoutNotes} onChange={(e) => setCheckoutNotes(e.target.value)} />
              <div className="modal-actions"><button type="button" onClick={() => setCheckoutItem(null)}>Cancel</button><button type="submit">Check Out</button></div>
            </form>
          </div>
        </div>
      )}

      {returnCheckout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Return Equipment</h3>
            <p><strong>{returnCheckout.item_name}</strong> — Outstanding: {returnCheckout.quantity_outstanding}</p>
            <form onSubmit={submitReturn}>
              <input type="number" min="1" max={returnCheckout.quantity_outstanding} value={returnQty} onChange={(e) => setReturnQty(e.target.value)} required />
              <select value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
                <option value="good">Good</option><option value="damaged">Damaged</option>
              </select>
              <textarea placeholder="Return notes" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
              <div className="modal-actions"><button type="button" onClick={() => setReturnCheckout(null)}>Cancel</button><button type="submit">Record Return</button></div>
            </form>
          </div>
        </div>
      )}

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
