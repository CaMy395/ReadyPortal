import React, { useMemo, useState } from "react";

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

export default function PackageChecklist() {
  const [tier, setTier] = useState("premium"); // premium | basic
  const [size, setSize] = useState(200);

  const sizes = useMemo(() => [25, 50, 100, 150, 200, 250], []);

  const pkg = useMemo(() => {
    const tierObj = INTERNAL_PACKAGE_CHECKLIST[tier];
    return tierObj?.[size] || null;
  }, [tier, size]);

  const headerText = useMemo(() => {
    return `${INTERNAL_PACKAGE_CHECKLIST.meta.brand} • Admin Ops Checklist • ${tier.toUpperCase()} ${size}`;
  }, [tier, size]);

  const copyText = useMemo(() => {
    if (!pkg) return "";
    const m = INTERNAL_PACKAGE_CHECKLIST.meta;

    const lines = [
      headerText,
      `Timing: ${m.serviceTiming.setupHours}hr setup + ${m.serviceTiming.serviceHours}hr service + ${m.serviceTiming.breakdownMinutesIncluded}min breakdown`,
      `Pour: ${m.standardPourOz}oz | Tequila target: ${m.tequilaTargetPercent}`,
      `Labor: $${m.laborRatePerStaff}/staff | Bars allocation: $${m.barInternalAllocation}/bar`,
      `Travel: ${m.travel.milesIncludedRT}mi RT included; long-distance fee $${m.travel.longDistanceFee}`,
      `Drop-off/Pick-up fee (when applicable): $${m.dropoffPickupFee}`,
      `Leftovers: ${m.leftoversPolicy}`,
      "",
      "STAFF:",
      `- Bartenders: ${pkg.staff?.bartenders ?? 0}${(pkg.staff?.support ?? 0) ? ` | Support: ${pkg.staff.support}` : ""}`,
      "",
      "BARS:",
      `- Mobile bars: ${renderValue(pkg.bars)}`,
      "",
      "LIQUOR:",
      pkg.liquor ? Object.entries(pkg.liquor).map(([k, v]) => `- ${formatKey(k)}: ${renderValue(v)}`).join("\n") : "-",
      "",
      "BEER/WINE:",
      pkg.beerWine ? Object.entries(pkg.beerWine).map(([k, v]) => `- ${formatKey(k)}: ${renderValue(v)}`).join("\n") : "-",
      "",
      "ESSENTIALS:",
      pkg.essentials ? Object.entries(pkg.essentials).map(([k, v]) => `- ${formatKey(k)}: ${renderValue(v)}`).join("\n") : "-",
      "",
      "ICE:",
      `- Bag equivalent: ${pkg.iceBags ?? "-"}`,
      "",
      "NOTES:",
      pkg.notes?.length ? pkg.notes.map((n) => `- ${n}`).join("\n") : "-",
      "",
      tier === "basic" ? ["BASIC MENU RULES:", ...INTERNAL_PACKAGE_CHECKLIST.basic.menuRules.map((r) => `- ${r}`)].join("\n") : ""
    ].filter(Boolean);

    return lines.join("\n");
  }, [pkg, tier, size, headerText]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      alert("Copied checklist to clipboard ✅");
    } catch (e) {
      console.error(e);
      alert("Copy failed — your browser may block clipboard access.");
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

        <button
          onClick={handleCopy}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            cursor: "pointer",
            fontWeight: 700,
            background: "#111"
          }}
        >
          Copy to clipboard
        </button>
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
              fontWeight: 700
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
              fontWeight: 700
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tier === "basic" && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Basic Menu Rules</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {INTERNAL_PACKAGE_CHECKLIST.basic.menuRules.map((r) => (
              <li key={r} style={{ marginBottom: 4 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

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

        <Card title="Beer & Wine">
          {pkg.beerWine
            ? Object.entries(pkg.beerWine).map(([k, v]) => (
                <KV key={k} label={formatKey(k)} value={renderValue(v)} />
              ))
            : <div style={{ opacity: 0.7 }}>—</div>}
        </Card>

        <Card title="Essentials">
          {pkg.essentials
            ? Object.entries(pkg.essentials).map(([k, v]) => (
                <KV key={k} label={formatKey(k)} value={renderValue(v)} />
              ))
            : <div style={{ opacity: 0.7 }}>—</div>}
        </Card>

        <Card title="Ops Notes">
          <KV label="Travel" value={`${meta.travel.milesIncludedRT}mi RT incl • $${meta.travel.longDistanceFee} long-distance`} />
          <KV label="Drop-off/Pick-up fee" value={`$${meta.dropoffPickupFee} (when applicable)`} />
          <KV label="Cleanup overage" value={`$${meta.cleanupOveragePerHour}/hr after 30 min`} />
          <KV label="Leftovers" value={meta.leftoversPolicy} />
          {pkg.notes?.length ? (
            <>
              <div style={{ marginTop: 8, fontWeight: 800 }}>Package notes</div>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
                {pkg.notes.map((n, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {n}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div style={{ opacity: 0.7, marginTop: 8 }}>No extra notes.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Quick-share text (copied)</div>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.35 }}>{copyText}</pre>
      </div>
    </div>
  );
}

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
