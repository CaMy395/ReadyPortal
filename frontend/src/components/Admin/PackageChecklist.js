import React, { useEffect, useMemo, useState } from "react";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};


const READY_EXPERIENCE_RULES = {
  baseHours: 4,
  blockHours: 4,

  // For each additional 4-hour block:
  liquorIncreasePercent: 50,
  otherConsumablesIncreasePercent: 50,

  // This is what Ready Bartending charges the client for each bartender
  // working an additional 4-hour block. Actual gig payroll stays separate.
  bartenderClientChargePerBlock: 200,
};

const wholePackageQuantity = (value) => Math.max(1, Math.ceil(numberValue(value)));

const emptyPackage = () => ({
  id: null,
  package_name: "",
  tier: "basic",
  guest_count: 15,
  service_hours: 4,
  client_price: 0,
  bartenders: 1,
  support_staff: 0,
  servers: 0,
  mobile_bars: 0,
  setup_hours: 0.5,
  breakdown_minutes: 30,
  delivery_cost: 0,
  bar_cost: 0,
  labor_cost: 0,
  other_cost: 0,
  is_active: true,
  items: [],
});

export default function PackageChecklist() {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [pkg, setPkg] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [readyAdjustmentHours, setReadyAdjustmentHours] = useState(null);

  const fetchTemplates = async () => {
    const response = await fetch(`${apiUrl}/package-templates`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Failed to load package templates.");
    }

    const rows = Array.isArray(data) ? data : [];
    setTemplates(rows);

    if (!selectedTemplateId && rows.length > 0) {
      setSelectedTemplateId(String(rows[0].id));
    }
  };

  const fetchInventory = async () => {
    const response = await fetch(`${apiUrl}/inventory`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Failed to load inventory.");
    }

    setInventory(Array.isArray(data) ? data : []);
  };

  const fetchPackage = async (id) => {
    if (!id) {
      setPkg(null);
      return;
    }

    const response = await fetch(`${apiUrl}/package-templates/${id}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Failed to load package template.");
    }

    setPkg({
      ...data,
      items: Array.isArray(data.items) ? data.items : [],
    });
    setReadyAdjustmentHours(null);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([fetchTemplates(), fetchInventory()]);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  useEffect(() => {
    if (!selectedTemplateId) return;

    setError("");
    setSuccess("");

    fetchPackage(selectedTemplateId).catch((loadError) => {
      setError(loadError.message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  const inventoryByTypeKey = useMemo(() => {
    const map = new Map();

    for (const item of inventory) {
      const typeKey = String(item?.type_key || "").trim();
      if (!typeKey) continue;

      if (!map.has(typeKey)) map.set(typeKey, []);
      map.get(typeKey).push(item);
    }

    return map;
  }, [inventory]);

  const inventoryQuantityById = useMemo(() => {
    const map = new Map();

    for (const item of inventory) {
      map.set(Number(item.id), numberValue(item.quantity));
    }

    return map;
  }, [inventory]);

  const getItemOnHand = (item) => {
    const inventoryId =
      item.inventory_id ||
      item.matched_inventory_id ||
      null;

    if (!inventoryId) return 0;

    return numberValue(
      inventoryQuantityById.get(Number(inventoryId))
    );
  };

  const resolvedItems = useMemo(() => {
    if (!pkg) return [];

    return (pkg.items || []).map((item) => {
      const directInventory = inventory.find(
        (inventoryItem) => Number(inventoryItem.id) === Number(item.inventory_id)
      );

      const typeMatches = inventoryByTypeKey.get(item.type_key) || [];
      const typeInventory = typeMatches.find((row) => row.is_active !== false) || null;
      const matchedInventory = directInventory || typeInventory || null;

      const resolvedUnitCost =
        item.cost_override !== "" && item.cost_override != null
          ? numberValue(item.cost_override)
          : numberValue(
              item.resolved_unit_cost ??
                item.inventory_unit_cost ??
                matchedInventory?.unit_cost
            );

      const resolvedClientPrice =
        item.client_price_override !== "" && item.client_price_override != null
          ? numberValue(item.client_price_override)
          : numberValue(
              item.resolved_client_price ??
                item.inventory_client_price ??
                matchedInventory?.client_price ??
                resolvedUnitCost
            );

      return {
        ...item,
        matched_inventory_id:
          item.matched_inventory_id || matchedInventory?.id || null,
        inventory_item_name:
          item.inventory_item_name || matchedInventory?.item_name || null,
        inventory_size:  
          item.inventory_size ||  item.size_label ||  matchedInventory?.size_label ||  null,
        resolved_unit_cost: resolvedUnitCost,
        resolved_client_price: resolvedClientPrice,
        line_cost: numberValue(item.quantity) * resolvedUnitCost,
      };
    });
  }, [pkg, inventory, inventoryByTypeKey]);

  const itemCost = useMemo(
    () => resolvedItems.reduce((sum, item) => sum + numberValue(item.line_cost), 0),
    [resolvedItems]
  );

  const itemClientValue = useMemo(
    () =>
      resolvedItems.reduce(
        (sum, item) =>
          sum +
          numberValue(item.quantity) *
            numberValue(item.resolved_client_price),
        0
      ),
    [resolvedItems]
  );

  const laborClientAllocation = useMemo(() => {
    return (
      numberValue(pkg?.bartenders) * 200 +
      numberValue(pkg?.servers) * 160 +
      numberValue(pkg?.support_staff) * 160
    );
  }, [
    pkg?.bartenders,
    pkg?.servers,
    pkg?.support_staff,
  ]);

  const allocatedPackageValue = useMemo(() => {
    return itemClientValue + laborClientAllocation;
  }, [itemClientValue, laborClientAllocation]);

  const fixedCost = useMemo(() => {
    if (!pkg) return 0;

    return (
      numberValue(pkg.delivery_cost) +
      numberValue(pkg.bar_cost) +
      numberValue(pkg.labor_cost) +
      numberValue(pkg.other_cost)
    );
  }, [pkg]);

  const totalCost = itemCost + fixedCost;
  const clientPrice = numberValue(pkg?.client_price);
  const estimatedProfit = clientPrice - totalCost;
  const profitMargin = clientPrice > 0 ? (estimatedProfit / clientPrice) * 100 : 0;

  const inventoryCheckRows = useMemo(() => {
    return resolvedItems
      .filter((item) => item.type_key)
      .map((item) => {
        const need = numberValue(item.quantity);
        const onHand = numberValue(getItemOnHand(item));
        const short = Math.max(0, need - onHand);

        return {
          id: item.id,
          label: item.inventory_item_name || item.item_name || item.type_key,
          type_key: item.type_key,
          need,
          onHand,
          short,
        };
      });
  }, [resolvedItems, inventoryQuantityById]);

  const anyShort = inventoryCheckRows.some((row) => row.short > 0);

  const updatePackageField = (field, value) => {
    setPkg((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };

  const updateItem = (index, field, value) => {
    setPkg((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setSuccess("");
  };

  const removeItem = (index) => {
    setPkg((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSuccess("");
  };

  const addInventoryItem = () => {
    const selected = inventory.find(
      (item) => Number(item.id) === Number(selectedInventoryId)
    );

    if (!selected) return;

    const alreadyIncluded = (pkg?.items || []).some(
      (item) =>
        Number(item.inventory_id || item.matched_inventory_id) === Number(selected.id)
    );

    if (alreadyIncluded) {
      setError("That exact inventory item is already in this package. Increase its quantity instead.");
      return;
}

    setPkg((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          inventory_id: selected.id,
          type_key: selected.type_key || null,
          item_name: selected.item_name,
          category: selected.category,
          quantity: 1,
          cost_override: null,
          client_price_override: null,
          notes: null,
          inventory_item_name: selected.item_name,
          inventory_size: selected.size_label,
          inventory_unit_cost: selected.unit_cost,
          inventory_client_price: selected.client_price,
          resolved_unit_cost: selected.unit_cost,
          resolved_client_price: selected.client_price ?? selected.unit_cost,
        },
      ],
    }));

    setSelectedInventoryId("");
    setError("");
  };

  const startNewPackage = () => {
    setSelectedTemplateId("");
    setPkg(emptyPackage());
    setSelectedInventoryId("");
    setError("");
    setReadyAdjustmentHours(null);
    setSuccess("New package started. Fill it in, add items, then click Create Package.");
  };


  const applyReadyExperienceAdjustments = () => {
    if (!pkg) return;

    const serviceHours = numberValue(pkg.service_hours);
    const extraHours = serviceHours - READY_EXPERIENCE_RULES.baseHours;

    if (extraHours <= 0) {
      setError("Ready Experience adjustments only apply when service is longer than 4 hours.");
      return;
    }

    if (readyAdjustmentHours === serviceHours) {
      setError(`The ${serviceHours}-hour adjustment was already applied during this editing session.`);
      return;
    }

    const extraBlocks = Math.ceil(
      extraHours / READY_EXPERIENCE_RULES.blockHours
    );

    const confirmed = window.confirm(
      `Apply Ready Experience adjustments for ${serviceHours} hours?\n\n` +
      `This will increase liquor, mixers, ice, garnishes, and disposables, ` +
      `and add $${READY_EXPERIENCE_RULES.bartenderClientChargePerBlock} per bartender ` +
      `for each additional 4-hour block.\n\nApply only once to this package.`
    );

    if (!confirmed) return;

    let additionalProductClientValue = 0;

    const adjustedItems = resolvedItems.map((item) => {
      const category = String(item.category || "").toLowerCase();
      const currentQuantity = numberValue(item.quantity);

      let increasePercent = 0;

      if (category.includes("liquor")) {
        increasePercent =
          READY_EXPERIENCE_RULES.liquorIncreasePercent * extraBlocks;
      } else if (
        category.includes("mixer") ||
        category.includes("bar essential") ||
        category.includes("garnish") ||
        category.includes("disposable") ||
        category.includes("ice")
      ) {
        increasePercent =
          READY_EXPERIENCE_RULES.otherConsumablesIncreasePercent * extraBlocks;
      }

      if (increasePercent <= 0 || currentQuantity <= 0) return item;

      const addedQuantity = wholePackageQuantity(
        currentQuantity * (increasePercent / 100)
      );

      additionalProductClientValue +=
        addedQuantity * numberValue(item.resolved_client_price);

      return {
        ...item,
        quantity: currentQuantity + addedQuantity,
      };
    });

    const additionalBartenderCharge =
      numberValue(pkg.bartenders) *
      READY_EXPERIENCE_RULES.bartenderClientChargePerBlock *
      extraBlocks;

    const totalClientIncrease =
      additionalProductClientValue + additionalBartenderCharge;

    setPkg((current) => ({
      ...current,
      package_name:
        serviceHours >= 8 && !String(current.package_name || "").toLowerCase().includes("ready experience")
          ? `Ready Experience ${current.guest_count}`
          : current.package_name,
      items: adjustedItems,
      client_price: numberValue(current.client_price) + totalClientIncrease,
    }));

    setReadyAdjustmentHours(serviceHours);
    setError("");
    setSuccess(
      `Ready Experience adjustment applied: ${extraBlocks} additional 4-hour block` +
      `${extraBlocks === 1 ? "" : "s"}, ${money(additionalProductClientValue)} in product value, ` +
      `${money(additionalBartenderCharge)} in extended bartender charges. ` +
      `Review the quantities and client price before saving.`
    );
  };

  const duplicatePackage = () => {
    if (!pkg?.id) {
      setError("Select an existing package to duplicate.");
      return;
    }

    setPkg({
      ...pkg,
      id: null,
      package_name: `${pkg.package_name} Copy`,
      items: (pkg.items || []).map((item) => ({
        ...item,
        id: null,
      })),
    });

    setSelectedTemplateId("");
    setReadyAdjustmentHours(null);
    setError("");
    setSuccess(
      "Package copied. Change the tier, guest count, or service hours, then click Create Package."
    );
  };

  const deletePackage = async () => {
    if (!pkg?.id) {
      setError("Select a saved package to delete.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${pkg.package_name}"?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${apiUrl}/package-templates/${pkg.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to delete package."
        );
      }

      setPkg(null);
      setSelectedTemplateId("");
      setReadyAdjustmentHours(null);

      await fetchTemplates();

      setSuccess("Package deleted successfully.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const savePackage = async () => {
    if (!pkg) return;

    const isNewPackage = !pkg.id;

    if (!String(pkg.package_name || "").trim()) {
      setError("Package name is required.");
      return;
    }

    if (numberValue(pkg.guest_count) <= 0) {
      setError("Guest count must be greater than 0.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      package_name: pkg.package_name,
      tier: pkg.tier,
      guest_count: numberValue(pkg.guest_count),
      service_hours: numberValue(pkg.service_hours, 4),
      client_price: numberValue(pkg.client_price),
      bartenders: numberValue(pkg.bartenders),
      support_staff: numberValue(pkg.support_staff),
      servers: numberValue(pkg.servers),
      mobile_bars: numberValue(pkg.mobile_bars),
      setup_hours: numberValue(pkg.setup_hours),
      breakdown_minutes: numberValue(pkg.breakdown_minutes),
      delivery_cost: numberValue(pkg.delivery_cost),
      bar_cost: numberValue(pkg.bar_cost),
      labor_cost: numberValue(pkg.labor_cost),
      other_cost: numberValue(pkg.other_cost),
      is_active: pkg.is_active !== false,
      items: (pkg.items || []).map((item) => ({
        inventory_id: item.inventory_id || item.matched_inventory_id || null,
        type_key: item.type_key || null,
        item_name: item.item_name || item.inventory_item_name || null,
        category: item.category || item.inventory_category || null,
        quantity: numberValue(item.quantity),
        cost_override:
          item.cost_override === "" || item.cost_override == null
            ? null
            : numberValue(item.cost_override),
        client_price_override:
          item.client_price_override === "" || item.client_price_override == null
            ? null
            : numberValue(item.client_price_override),
        notes: item.notes || null,
      })),
    };

    try {
      const response = await fetch(
        isNewPackage
          ? `${apiUrl}/package-templates`
          : `${apiUrl}/package-templates/${pkg.id}`,
        {
          method: isNewPackage ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || data?.details || "Failed to save package.");
      }

      const savedId = data.id || pkg.id;
      await fetchTemplates();
      setSelectedTemplateId(String(savedId));
      await fetchPackage(savedId);
      setSuccess(isNewPackage ? "Package created successfully." : "Package saved successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deductFromInventory = async () => {
    if (!inventoryCheckRows.length) return;

    const message = anyShort
      ? "Some items are short. Deduct available inventory anyway?"
      : "Deduct this package from inventory now?";

    if (!window.confirm(message)) return;

    try {
      const response = await fetch(`${apiUrl}/inventory/bulk-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: inventoryCheckRows.map((row) => ({
            type_key: row.type_key,
            quantity: row.need,
            action: "use",
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to deduct inventory.");
      }

      await fetchInventory();
      setSuccess("Inventory deducted for this package.");
    } catch (deductError) {
      setError(deductError.message);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading Package Builder…</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Ready Bartending Package Builder</h2>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Build packages from live inventory costs and review estimated profit.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            style={inputStyle}
          >
            <option value="">Select package</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.package_name}
              </option>
            ))}
          </select>

          <button type="button" onClick={startNewPackage} disabled={saving} style={secondaryButton}>
            + New Package
          </button>

          <button
            type="button"
            onClick={duplicatePackage}
            disabled={!pkg?.id || saving}
            style={secondaryButton}
          >
            Duplicate Package
          </button>

          <button
            type="button"
            onClick={deletePackage}
            disabled={!pkg?.id || saving}
            style={dangerButton}
          >
            Delete Package
          </button>

          <button type="button" onClick={savePackage} disabled={!pkg || saving} style={primaryButton}>
            {saving ? "Saving…" : pkg?.id ? "Save Package" : "Create Package"}
          </button>

          <button type="button" onClick={deductFromInventory} disabled={!pkg} style={secondaryButton}>
            Deduct Inventory
          </button>
        </div>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}
      {success ? <div style={successBox}>{success}</div> : null}

      {!pkg ? (
        <div style={{ marginTop: 20 }}>No package selected.</div>
      ) : (
        <>
          <section style={sectionStyle}>
            <h3 style={sectionTitle}>Package Details</h3>
            <div style={gridStyle}>
              <Field label="Package Name">
                <input value={pkg.package_name || ""} onChange={(e) => updatePackageField("package_name", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Tier">
                <select value={pkg.tier || "basic"} onChange={(e) => updatePackageField("tier", e.target.value)} style={inputStyle}>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>

              <Field label="Guests">
                <input type="number" min="1" value={pkg.guest_count || 0} onChange={(e) => updatePackageField("guest_count", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Service Hours">
                <input type="number" min="0" step="0.5" value={pkg.service_hours || 0} onChange={(e) => updatePackageField("service_hours", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Client Package Price">
                <input type="number" min="0" step="0.01" value={pkg.client_price || 0} onChange={(e) => updatePackageField("client_price", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Bartenders">
                <input type="number" min="0" value={pkg.bartenders || 0} onChange={(e) => updatePackageField("bartenders", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Support Staff">
                <input type="number" min="0" value={pkg.support_staff || 0} onChange={(e) => updatePackageField("support_staff", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Servers">
                <input type="number" min="0" value={pkg.servers || 0} onChange={(e) => updatePackageField("servers", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Mobile Bars">
                <input type="number" min="0" value={pkg.mobile_bars || 0} onChange={(e) => updatePackageField("mobile_bars", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Setup Hours">
                <input type="number" min="0" step="0.5" value={pkg.setup_hours || 0} onChange={(e) => updatePackageField("setup_hours", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Breakdown Minutes">
                <input type="number" min="0" value={pkg.breakdown_minutes || 0} onChange={(e) => updatePackageField("breakdown_minutes", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Labor Allocation">
                <input type="number" min="0" step="0.01" value={pkg.labor_cost || 0} onChange={(e) => updatePackageField("labor_cost", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Bar Cost">
                <input type="number" min="0" step="0.01" value={pkg.bar_cost || 0} onChange={(e) => updatePackageField("bar_cost", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Delivery Cost">
                <input type="number" min="0" step="0.01" value={pkg.delivery_cost || 0} onChange={(e) => updatePackageField("delivery_cost", e.target.value)} style={inputStyle} />
              </Field>

              <Field label="Other Cost">
                <input type="number" min="0" step="0.01" value={pkg.other_cost || 0} onChange={(e) => updatePackageField("other_cost", e.target.value)} style={inputStyle} />
              </Field>
            </div>

            {numberValue(pkg.service_hours) > READY_EXPERIENCE_RULES.baseHours ? (
              <div style={readyExperienceBox}>
                <div>
                  <div style={{ fontWeight: 900 }}>Ready Experience adjustment</div>
                  <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
                    Adds 40% more liquor and 50% more mixers, ice, garnishes, and
                    disposables per additional 4-hour block. It also adds $200
                    per bartender for each additional 4 hours. Actual gig payroll
                    is not calculated here.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyReadyExperienceAdjustments}
                  disabled={readyAdjustmentHours === numberValue(pkg.service_hours)}
                  style={primaryButton}
                >
                  {readyAdjustmentHours === numberValue(pkg.service_hours)
                    ? "Adjustment Applied"
                    : "Apply Ready Experience"}
                </button>
              </div>
            ) : null}
          </section>

          <section style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <h3 style={sectionTitle}>Package Items</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)} style={inputStyle}>
                  <option value="">Add from inventory…</option>
                  {inventory
                    .filter((item) => item.is_active !== false)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} {item.size_label} — {money(item.unit_cost)}
                      </option>
                    ))}
                </select>
                <button type="button" onClick={addInventoryItem} disabled={!selectedInventoryId} style={secondaryButton}>
                  Add Item
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Item</th>
                    <th style={th}>Size</th>
                    <th style={th}>Type Key</th>
                    <th style={th}>Category</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Item Cost</th>
                    <th style={th}>Client Price</th>
                    <th style={th}>On Hand</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedItems.map((item, index) => {
                    const onHand = numberValue(getItemOnHand(item));
                    const isShort =
                      item.type_key &&
                      onHand < numberValue(item.quantity);

                    return (
                      <tr key={item.id || `${item.type_key}-${index}`}>
                        <td style={td}>
                          {item.inventory_item_name ||
                            item.item_name ||
                            "Unnamed item"}
                        </td>

                        <td style={td}>
                          {item.inventory_size || "—"}
                        </td>

                        <td style={td}>
                          {item.type_key || "—"}
                        </td>

                        <td style={td}>
                          {item.category || "—"}
                        </td>

                        <td style={td}>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={item.quantity ?? 0}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            style={{ ...inputStyle, width: 90 }}
                          />
                        </td>

                        <td style={td}>
                          {money(item.line_cost)}
                        </td>

                        <td style={td}>
                          {money(
                            numberValue(item.quantity) *
                              numberValue(item.resolved_client_price)
                          )}
                        </td>

                        <td style={{ ...td, fontWeight: 700 }}>
                          {isShort ? `⚠️ ${onHand}` : onHand}
                        </td>

                        <td style={td}>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            style={dangerButton}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section style={sectionStyle}>
  <h3 style={sectionTitle}>Cost & Profit</h3>

  <div style={summaryGroupStyle}>
    <h4 style={summaryGroupTitle}>Your Actual Costs</h4>

    <div style={summaryGridStyle}>
      <SummaryCard
        label="Inventory Cost"
        value={money(itemCost)}
      />

      <SummaryCard
        label="Fixed Costs"
        value={money(fixedCost)}
      />

      <SummaryCard
        label="Total Cost"
        value={money(totalCost)}
      />
    </div>
  </div>

  <div style={summaryGroupStyle}>
    <h4 style={summaryGroupTitle}>Client Package Allocation</h4>

    <div style={summaryGridStyle}>
      <SummaryCard
        label="Inventory Client Value"
        value={money(itemClientValue)}
      />

      <SummaryCard
        label="Labor Client Allocation"
        value={money(laborClientAllocation)}
      />

      <SummaryCard
        label="Allocated Package Value"
        value={money(allocatedPackageValue)}
      />
    </div>
  </div>

  <div style={summaryGroupStyle}>
    <h4 style={summaryGroupTitle}>Package Profit</h4>

    <div style={summaryGridStyle}>
      <SummaryCard
        label="Client Price"
        value={money(clientPrice)}
      />

      <SummaryCard
        label="Estimated Profit"
        value={money(estimatedProfit)}
      />

      <SummaryCard
        label="Profit Margin"
        value={`${profitMargin.toFixed(1)}%`}
      />
    </div>
  </div>
</section>

          <section style={sectionStyle}>
            <h3 style={sectionTitle}>Inventory Check</h3>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {anyShort ? "⚠️ Some items are short" : "✅ Inventory covers this package"}
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Item</th>
                    <th style={th}>Type Key</th>
                    <th style={th}>Need</th>
                    <th style={th}>On Hand</th>
                    <th style={th}>Short</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryCheckRows.map((row) => (
                    <tr key={`${row.type_key}-${row.id}`}>
                      <td style={td}>{row.label}</td>
                      <td style={td}>{row.type_key}</td>
                      <td style={td}>{row.need}</td>
                      <td style={td}>{row.onHand}</td>
                      <td style={td}>{row.short > 0 ? `⚠️ ${row.short}` : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 5 }}>{value}</div>
    </div>
  );
}

const sectionStyle = {
  marginTop: 16,
  padding: 14,
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 14,
};

const sectionTitle = {
  margin: 0,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const inputStyle = {
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.2)",
  background: "#fff",
  color: "#111",
};

const primaryButton = {
  padding: "10px 13px",
  borderRadius: 9,
  border: "none",
  cursor: "pointer",
  background: "#111",
  color: "#fff",
  fontWeight: 800,
};

const secondaryButton = {
  padding: "10px 13px",
  borderRadius: 9,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  background: "#fff",
  color: "#111",
  fontWeight: 800,
};

const dangerButton = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid rgba(150,0,0,0.25)",
  cursor: "pointer",
  background: "#fff",
  color: "#9b0000",
  fontWeight: 700,
};


const readyExperienceBox = {
  marginTop: 14,
  padding: 12,
  border: "1px solid rgba(0,0,0,0.15)",
  borderRadius: 12,
  background: "#fafafa",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const errorBox = {
  marginTop: 14,
  padding: 10,
  borderRadius: 10,
  background: "#fff1f1",
  color: "#8a0000",
  fontWeight: 700,
};

const successBox = {
  marginTop: 14,
  padding: 10,
  borderRadius: 10,
  background: "#effaf1",
  color: "#145d24",
  fontWeight: 700,
};

const th = {
  textAlign: "left",
  padding: "9px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.15)",
  whiteSpace: "nowrap",
};

const td = {
  padding: "9px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  verticalAlign: "middle",
};

const summaryGroupStyle = {
  marginTop: 18,
  padding: 14,
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 12,
  background: "#0000",
};

const summaryGroupTitle = {
  margin: "0 0 12px",
  fontSize: 15,
  fontWeight: 900,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};




