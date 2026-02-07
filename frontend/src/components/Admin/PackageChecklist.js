import React, { useEffect, useMemo, useState } from "react";

/**
 * INTERNAL ONLY (Admin)
 * Tequila-forward allocations + standardized staffing/bars/ice.
 */
const INTERNAL_PACKAGE_CHECKLIST = {
  meta: {
    brand: "Ready Bartending",
    standardPourOz: 1.5,
    serviceTiming: { setupHours: 1, serviceHours: 4, breakdownMinutesIncluded: 30 },
    laborRatePerStaff: 110,
    tequilaTargetPercent: "35–40%",
    travel: { milesIncludedRT: 25, longDistanceFee: 150, longDistanceDefinition: "≈1 hour+ each way" },
    dropoffPickupFee: 150,
    cleanupOveragePerHour: 100,
    leftoversPolicy: "Client keeps all opened/unopened items",
    barInternalAllocation: 125
  },

  premium: {
    25: {
      staff: { bartenders: 1, support: 0 },
      bars: 1,
      liquor: {
        tequila750: 2,
        vodka750: 1,
        hennessy750: 1,
        whiskey750: 1,
        tripleSec750: 1,
        sweetSour175L: 1
      },
      beerWine: { beerCases: 0, beerOptionalIfRequested: true, wine: { red: 1, white: 1 } },
      essentials: {
        sodasItems: "4–6 items",
        juices: ["Cran", "Pine", "OJ", "Grapefruit"],
        sparkling: ["Club soda", "Tonic", "Ginger beer"],
        waterCases: "1 case",
        garnish: ["Limes", "Lemons", "Oranges", "Mint (1–2 packs)", "Cherries"],
        supplies: { cups: "2 packs", napkins: "2 packs", stirrers: "1 pack" }
      },
      iceBags: 4,
      notes: ["Beer is optional for Premium 25 (sell as add-on if requested)."]
    },

    50: {
      staff: { bartenders: 1, support: 0 },
      bars: 1,
      liquor: {
        tequila750: 3,
        vodka750: 1,
        whiskey750: 1,
        hennessy750: 1,
        rumBacardi750: 1,
        tripleSec750: 1,
        sweetSour175L: 1
      },
      beerWine: { beerCases: 1, wine: { red: 1, white: 1 } },
      essentials: {
        sodasItems: "6–8 items",
        juices: ["Cran", "Pine", "OJ", "Grapefruit"],
        sparkling: ["Club soda", "Tonic", "Ginger beer"],
        waterCases: "1–2 cases",
        garnish: ["Limes", "Lemons", "Oranges", "Mint (2 packs)", "Cherries"],
        supplies: { cups: "2–3 packs", napkins: "2 packs", stirrers: "1 pack" }
      },
      iceBags: 6
    },

    100: {
      staff: { bartenders: 2, support: 0 },
      bars: 1,
      liquor: {
        tequila: { bottles750: 2, handles175L: 1 },
        vodka: { bottles750: 2, handles175L: 1 },
        whiskey750: 2,
        hennessy750: 3,
        rumBacardi750: 1,
        tripleSecHandles: 1,
        sweetSour175L: "1–2",
        realSyrups: ["Mango", "Passion", "Strawberry", "Coconut"]
      },
      beerWine: { beerCases: 2, wine: { red: 2, white: 1 } },
      essentials: { scaleNote: "Scale Premium 50 × 1.6" },
      iceBags: 10
    },

    150: {
      staff: { bartenders: 3, support: 0 },
      bars: "1–2",
      liquor: {
        tequila: { bottles750: 3, handles175L: 2 },
        vodka: { bottles750: 2, handles175L: 2 },
        whiskey: { bottles750: 2, handles175L: 1 },
        hennessy750: 4,
        rumBacardi: { bottles750: 1, handles175L: 1 },
        tripleSec: { bottles750: 1, handles175L: 1 },
        sweetSour175L: 2,
        realSyrups: ["Mango", "Passion", "Strawberry", "Coconut", "Blackberry"]
      },
      beerWine: { beerCases: 3, wine: { red: 2, white: 2 } },
      essentials: { scaleNote: "Scale Premium 100 × 1.3" },
      iceBags: 15
    },

    200: {
      staff: { bartenders: 3, support: 1 },
      bars: 2,
      liquor: {
        tequila: { bottles750: 3, handles175L: 3 },
        vodka: { bottles750: 2, handles175L: 2 },
        whiskey: { bottles750: 2, handles175L: 1 },
        hennessy750: 5,
        rumBacardi: { bottles750: 1, handles175L: 1 },
        tripleSec: { bottles750: 1, handles175L: 1 },
        sweetSour175L: 2,
        realSyrups: ["Mango", "Passion", "Strawberry", "Coconut", "Blackberry"]
      },
      beerWine: { beerCases: 3, wine: { red: 2, white: 2 } },
      essentials: {
        sodasItems: "12–15 items (mix 12pk + 2L)",
        juices: ["Cran x4", "Pine x3", "OJ x2", "Grapefruit x2–3"],
        sparkling: ["Club soda x1–2", "Tonic x1–2", "Ginger beer (8pk) x2"],
        waterCases: "4–5 cases",
        garnish: [
          "Lemons x3",
          "Limes x3",
          "Oranges x3",
          "Mint x4 packs",
          "Cherries x3",
          "Strawberries x1",
          "Raspberries x2",
          "Lychee x1"
        ],
        supplies: ["Cups x8", "Napkins x6", "Stirrers x4", "Sugar x2", "Lemon juice x6", "Lime juice x6"]
      },
      iceBags: 20,
      notes: ["200+ requires 2 bars minimum.", "Assign support to ice + restock + trash."]
    },

    250: {
      staff: { bartenders: 4, support: 1 },
      bars: "2–3",
      liquor: {
        tequila: { bottles750: 3, handles175L: 4 },
        vodka: { bottles750: 2, handles175L: 3 },
        whiskey: { bottles750: 2, handles175L: 2 },
        hennessy750: 6,
        rumBacardi: { bottles750: 1, handles175L: 1 },
        tripleSecHandles: 2,
        sweetSour175L: 3,
        realSyrups: ["Mango", "Passion", "Strawberry", "Coconut", "Blackberry"]
      },
      beerWine: { beerCases: 4, wine: { red: 3, white: 3 } },
      essentials: { scaleNote: "Scale Premium 200 × 1.25" },
      iceBags: 25
    }
  },

  basic: {
    menuRules: [
      "Simple builds only (Paloma, Vodka Cran, Vodka Pineapple, Henny & Coke, Henny Lemonade).",
      "No syrups, no specialty cocktails.",
      "Add-ons available for upgrades (bar, beer/wine, margarita upgrade, extra hour, extra staff)."
    ],

    25: { staff: { bartenders: 1, support: 0 }, bars: 0, liquor: { tequila750: 2, vodka750: 1, hennessy750: 2 }, iceBags: 4 },
    50: { staff: { bartenders: 1, support: 0 }, bars: 0, liquor: { tequila750: 3, vodka750: 2, hennessy750: 2 }, iceBags: 6 },
    100: { staff: { bartenders: 2, support: 0 }, bars: 0, liquor: { tequila750: 5, vodka750: 4, hennessy750: 3 }, iceBags: 10 },
    150: { staff: { bartenders: 2, support: 0 }, bars: 0, liquor: { tequila750: 7, vodka750: 6, hennessy750: 4 }, iceBags: 15 },
    200: { staff: { bartenders: 3, support: 0 }, bars: 0, liquor: { tequila750: 8, vodka750: 7, hennessy750: 4 }, iceBags: 20 },
    250: { staff: { bartenders: 4, support: 0 }, bars: 0, liquor: { tequila750: 10, vodka750: 9, hennessy750: 5 }, iceBags: 25 }
  }
};

function formatKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/750/g, " 750ml")
    .replace(/175L/g, " 1.75L")
    .trim();
}

function renderValue(v) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([k, val]) => `${formatKey(k)}: ${renderValue(val)}`)
      .join(" | ");
  }
  return String(v);
}

// ✅ map any checklist liquor label -> type_key
function toTypeKey(label) {
  const s = String(label || "").toLowerCase().replace(/\s+/g, " ").trim();

  // tequila
  if (s.includes("tequila") && s.includes("750")) return "tequila_750";
  if (s.includes("tequila") && (s.includes("1.75") || s.includes("175"))) return "tequila_175";

  // vodka
  if (s.includes("vodka") && s.includes("750")) return "vodka_750";
  if (s.includes("vodka") && (s.includes("1.75") || s.includes("175"))) return "vodka_175";

  // whiskey
  if (s.includes("whiskey") && s.includes("750")) return "whiskey_750";
  if (s.includes("whiskey") && (s.includes("1.75") || s.includes("175"))) return "whiskey_175";

  // cognac (hennessy)
  if (s.includes("hennessy") && s.includes("750")) return "cognac_750";

  // rum
  if (s.includes("rum") && s.includes("bacardi") && s.includes("750")) return "rum_750";
  if (s.includes("rum") && s.includes("bacardi") && (s.includes("1.75") || s.includes("175"))) return "rum_175";

  // triple sec
  if (s.includes("triple") && s.includes("sec") && s.includes("750")) return "triple_sec_750";
  if (s.includes("triple") && s.includes("sec") && (s.includes("1.75") || s.includes("175"))) return "triple_sec_175";

  // sweet sour
  if (s.includes("sweet") && s.includes("sour") && (s.includes("1.75") || s.includes("175"))) return "sweet_sour_175";

  return null;
}

// Convert package "liquor" object into flat list with type_key
function flattenLiquorRequirements(liquorObj) {
  const req = [];

  const push = (label, quantity) => {
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) return;

    const type_key = toTypeKey(label);
    if (!type_key) return;

    req.push({ label, type_key, quantity: q, action: "use" });
  };

  const walk = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;

    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;

      if (Array.isArray(v)) continue;
      if (typeof v === "string") continue;

      // numeric leaf like tequila750: 3
      if (typeof v === "number") {
        push(formatKey(k), v);
        continue;
      }

      // object leaf like tequila: { bottles750: 3, handles175L: 2 }
      if (typeof v === "object") {
        for (const [kk, vv] of Object.entries(v)) {
          if (typeof vv === "number") {
            push(formatKey(`${k} ${kk}`), vv);
          }
        }
      }
    }
  };

  walk(liquorObj);
  return req;
}

export default function PackageChecklist() {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [tier, setTier] = useState("premium");
  const [size, setSize] = useState(200);

  const [inventory, setInventory] = useState([]);
  const [invErr, setInvErr] = useState("");

  const sizes = useMemo(() => [25, 50, 100, 150, 200, 250], []);

  const pkg = useMemo(() => {
    const tierObj = INTERNAL_PACKAGE_CHECKLIST[tier];
    return tierObj?.[size] || null;
  }, [tier, size]);

  const headerText = useMemo(() => {
    return `${INTERNAL_PACKAGE_CHECKLIST.meta.brand} • Admin Ops Checklist • ${tier.toUpperCase()} ${size}`;
  }, [tier, size]);

  useEffect(() => {
    let ignore = false;
    setInvErr("");

    fetch(`${apiUrl}/inventory`)
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error(data?.error || `Inventory fetch failed (${r.status})`);
        return data;
      })
      .then((data) => {
        if (!ignore) setInventory(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error(e);
        if (!ignore) setInvErr(e.message || "Failed to load inventory");
      });

    return () => { ignore = true; };
  }, [apiUrl]);

  const requirements = useMemo(() => {
    if (!pkg?.liquor) return [];
    return flattenLiquorRequirements(pkg.liquor);
  }, [pkg]);

  // sum inventory quantities by type_key
  const invByTypeKey = useMemo(() => {
    const m = new Map();
    for (const it of inventory) {
      const tk = String(it?.type_key || "").trim();
      if (!tk) continue;
      const prev = m.get(tk) || 0;
      m.set(tk, prev + Number(it?.quantity || 0));
    }
    return m;
  }, [inventory]);

  const inventoryCheckRows = useMemo(() => {
    return requirements.map((r) => {
      const onHand = Number(invByTypeKey.get(r.type_key) || 0);
      const need = Number(r.quantity || 0);
      const short = Math.max(0, need - onHand);
      return {
        label: r.label,
        type_key: r.type_key,
        need,
        onHand,
        short
      };
    });
  }, [requirements, invByTypeKey]);

  const anyShort = useMemo(() => inventoryCheckRows.some((x) => x.short > 0), [inventoryCheckRows]);

  function openInventoryFiltered() {
    const base = "/admin/inventory";

    // keyword filters so brand names match
    const keywords = Array.from(
      new Set(
        inventoryCheckRows
          .map((r) => r.type_key)
          .map((tk) => tk.split("_")[0]) // "tequila_750" -> "tequila"
          .filter(Boolean)
      )
    );

    const target = `${base}?items=${encodeURIComponent(keywords.join(","))}&mode=liquor`;

    if (window.location.hash && window.location.hash.startsWith("#/")) {
      window.location.hash = `#${target}`;
      return;
    }
    window.history.pushState({}, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function deductFromInventory() {
    if (!inventoryCheckRows.length) return;

    if (anyShort) {
      const ok = window.confirm("Some items are SHORT in inventory. Deduct anyway?");
      if (!ok) return;
    } else {
      const ok = window.confirm("Deduct these package items from inventory now?");
      if (!ok) return;
    }

    const payload = {
      items: inventoryCheckRows.map((r) => ({
        type_key: r.type_key,
        action: "use",
        quantity: r.need
      }))
    };

    try {
      const resp = await fetch(`${apiUrl}/inventory/bulk-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Bulk adjust failed (${resp.status})`);

      // Refresh inventory
      const invResp = await fetch(`${apiUrl}/inventory`);
      const invData = await invResp.json().catch(() => []);
      setInventory(Array.isArray(invData) ? invData : []);

      alert("✅ Inventory deducted for this package.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to deduct inventory");
    }
  }

  if (!pkg) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Internal Package Checklist</h2>
        <p>Package not found for {tier} {size}.</p>
      </div>
    );
  }

  const meta = INTERNAL_PACKAGE_CHECKLIST.meta;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{headerText}</h2>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
            Timing: {meta.serviceTiming.setupHours}hr setup • {meta.serviceTiming.serviceHours}hr service • {meta.serviceTiming.breakdownMinutesIncluded}min breakdown
            {" • "}Pour: {meta.standardPourOz}oz • Tequila target: {meta.tequilaTargetPercent}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={openInventoryFiltered}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              cursor: "pointer",
              fontWeight: 700,
              background: "#111"
            }}
          >
            Open Inventory (filtered)
          </button>

          <button
            onClick={deductFromInventory}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              cursor: "pointer",
              fontWeight: 900,
              background: anyShort ? "#fff" : "#111",
              color: anyShort ? "#111" : "#fff"
            }}
            title={anyShort ? "Some items are short — still allowed" : "Deduct package items from inventory"}
          >
            Deduct from Inventory
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>Tier:</span>
          <button
            onClick={() => setTier("premium")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: tier === "premium" ? "2px solid #111" : "1px solid rgba(0,0,0,0.15)",
              background: "#111",
              cursor: "pointer",
              fontWeight: 700,
              color: "#fff"
            }}
          >
            Premium
          </button>
          <button
            onClick={() => setTier("basic")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: tier === "basic" ? "2px solid #111" : "1px solid rgba(0,0,0,0.15)",
              background: "#111",
              cursor: "pointer",
              fontWeight: 700,
              color: "#fff"
            }}
          >
            Basic
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>Size:</span>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
          >
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Inventory Check (type_key based)</div>
          {invErr ? <div style={{ color: "crimson", fontWeight: 800 }}>{invErr}</div> : null}
          {anyShort ? <div style={{ fontWeight: 900 }}>⚠️ Shortages detected</div> : <div style={{ fontWeight: 900 }}>✅ All liquor covered</div>}
        </div>

        {!requirements.length ? (
          <div style={{ marginTop: 8, opacity: 0.8 }}>No liquor requirements detected for this package.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Requirement</th>
                  <th style={th}>Type Key</th>
                  <th style={th}>Need</th>
                  <th style={th}>On hand (sum)</th>
                  <th style={th}>Short</th>
                </tr>
              </thead>
              <tbody>
                {inventoryCheckRows.map((r) => (
                  <tr key={`${r.type_key}-${r.label}`}>
                    <td style={td}>{r.label}</td>
                    <td style={td}>{r.type_key}</td>
                    <td style={tdNum}>{r.need}</td>
                    <td style={tdNum}>{r.onHand}</td>
                    <td style={{ ...tdNum, fontWeight: 900 }}>{r.short > 0 ? `⚠️ ${r.short}` : "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              This uses <b>type_key</b> so brand names (Espolón, Tito’s, Maker’s, Crown, etc.) still count correctly.
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Card title="Staff">
          <KV label="Bartenders" value={pkg.staff?.bartenders ?? 0} />
          <KV label="Support" value={pkg.staff?.support ?? 0} />
          <KV label="Labor rate (per staff)" value={`$${meta.laborRatePerStaff}`} />
        </Card>

        <Card title="Bars">
          <KV label="Mobile bars" value={renderValue(pkg.bars)} />
          <KV label="Internal allocation (per bar)" value={`$${meta.barInternalAllocation}`} />
        </Card>

        <Card title="Ice">
          <KV label="Bag equivalent" value={pkg.iceBags ?? "-"} />
          <KV label="Note" value="Ice machine equiv; plan cooler space." />
        </Card>

        <Card title="Liquor">
          {pkg.liquor
            ? Object.entries(pkg.liquor).map(([k, v]) => (
                <KV key={k} label={formatKey(k)} value={renderValue(v)} />
              ))
            : <div style={{ opacity: 0.7 }}>—</div>}
        </Card>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.12)",
  fontWeight: 900
};

const td = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.08)"
};

const tdNum = {
  ...td,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums"
};

function Card({ title, children }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>{children}</div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
      <div style={{ opacity: 0.8 }}>{label}</div>
      <div style={{ fontWeight: 800, textAlign: "right" }}>{value}</div>
    </div>
  );
}
