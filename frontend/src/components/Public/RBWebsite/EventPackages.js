import React from 'react';
import { Link } from 'react-router-dom';
import '../../../RB.css';

const EventPackages = () => {
  /**
   * POLICY (client-facing, consistent across all packages)
   * Keep wording professional (no vehicle details).
   */
  const serviceTimingNote =
    "Includes 1 hour of setup/prep, 4 hours of service, and up to 30 minutes of breakdown/cleanup after service. Service time begins once setup is complete. Additional cleanup time is billed at $100 per hour (or any portion thereof).";

  const transportNote =
    "Mobile Bar Transport (Drop-Off & Pick-Up): $150 when applicable (required when the bar must be delivered separately or a second vehicle is needed).";

  const travelNote =
    "Travel within 25 miles round trip is included. Long-distance events may require a travel fee. Events requiring ~1+ hour of travel each way incur a $150 long-distance fee.";

  const packages = [
    {
      title: "Event Staffing",
      description: "Click the book an event button to book our staff!",
      details: [],
      isButtonOnly: true,
    },
    {
      title: "Custom Package",
      description:
        "Click the book an event button to customize your booking by telling us in our form!",
      details: [],
      isButtonOnly: true,
    },

    // =========================
    // BASIC PACKAGES
    // =========================
    {
      title: "The Bare Necessities (25 Guests) (5 hours)",
      priceLabel: "$750",
      tier: "basic",
      description:
        "Classic cocktails and clean service for parties up to 25 guests. Includes 1 bartender, setup, liquor, and chasers for basic cocktails (vodka cran, tequila & soda, cognac & coke, etc.).",
      details: [
        serviceTimingNote,
        travelNote,
        "Liquors (Basic): Vodka, Tequila, Cognac",
        "Chasers: Lemonade, Coke, Sprite, Ginger Ale, Pineapple, OJ, Cranberry, Grapefruit, Lime Juice, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (50 Guests) (5 hours)",
      priceLabel: "$900",
      tier: "basic",
      description:
        "Classic cocktails and clean service for parties up to 50 guests. Includes 1 bartender, setup, liquor, and chasers for basic cocktails.",
      details: [
        serviceTimingNote,
        travelNote,
        "Liquors (Basic): Vodka, Tequila, Cognac",
        "Chasers: Lemonade, Coke, Sprite, Ginger Ale, Pineapple, OJ, Cranberry, Grapefruit, Lime Juice, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (100 Guests) (5 hours)",
      priceLabel: "$1,450",
      tier: "basic",
      description:
        "Classic cocktails for parties up to 100 guests. Includes 2 bar staff, setup, liquor, and chasers for basic cocktails.",
      details: [
        serviceTimingNote,
        travelNote,
        "Liquors (Basic): Vodka, Tequila, Cognac",
        "Chasers: Lemonade, Coke, Sprite, Ginger Ale, Pineapple, OJ, Cranberry, Grapefruit, Lime Juice, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (150 Guests) (5 hours)",
      priceLabel: "$1,900",
      tier: "basic",
      description:
        "Classic cocktails for parties up to 150 guests. Includes 3 bar staff, setup, liquor, and chasers for basic cocktails.",
      details: [
        serviceTimingNote,
        travelNote,
        "Liquors (Basic): Vodka, Tequila, Cognac",
        "Chasers: Lemonade, Coke, Sprite, Ginger Ale, Pineapple, OJ, Cranberry, Grapefruit, Lime Juice, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (200 Guests) (5 hours)",
      priceLabel: "$2,350",
      tier: "basic",
      description:
        "High-volume basic bar service for parties up to 200 guests. Includes 3 bartenders + 1 barback, setup, liquor, and chasers for basic cocktails.",
      details: [
        serviceTimingNote,
        travelNote,
        "Liquors (Basic): Vodka, Tequila, Cognac",
        "Chasers: Lemonade, Coke, Sprite, Ginger Ale, Pineapple, OJ, Cranberry, Grapefruit, Lime Juice, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (250 Guests) (5 hours)",
      priceLabel: "$2,875",
      tier: "basic",
      description:
        "High-volume basic bar service for parties up to 250 guests. Includes 4–5 bar staff, setup, liquor, and chasers for basic cocktails.",
      details: [
        serviceTimingNote,
        travelNote,
        "Liquors (Basic): Vodka, Tequila, Cognac",
        "Chasers: Lemonade, Coke, Sprite, Ginger Ale, Pineapple, OJ, Cranberry, Grapefruit, Lime Juice, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },

    // =========================
    // PREMIUM PACKAGES (Ready Experience)
    // Adds Rum + Beer + Wine + policies
    // =========================
    {
      title: "The Ready Experience (25 Guests) (5 hours)",
      priceLabel: "$1045",
      tier: "premium",
      description:
        "Elevated mobile bar experience for up to 25 guests. Includes 1 bartender, premium setup, premium liquor selection, and our premium menu (17+ classic cocktails).",
      details: [
        serviceTimingNote,
        travelNote,
        transportNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey, Rum",
        "Beer & Wine: Included",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups (Acrylic option available), Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Strawberries, Raspberries, Lychee, Mint",
        "Syrups: Simple Syrup, Grenadine, REAL Mango, REAL Passion Fruit, REAL Strawberry, REAL Coconut, REAL Blackberry",
        "Mobile Bar: Included (2 mobile bars for 200+ guests)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (50 Guests) (5 hours)",
      priceLabel: "$1,345",
      tier: "premium",
      description:
        "Premium mobile bar for up to 50 guests. Includes 1 bartender, premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        serviceTimingNote,
        travelNote,
        transportNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey, Rum",
        "Beer & Wine: Included",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Strawberries, Raspberries, Lychee, Mint",
        "Syrups: Simple Syrup, Grenadine, REAL Mango, REAL Passion Fruit, REAL Strawberry, REAL Coconut, REAL Blackberry",
        "Mobile Bar: Included (2 mobile bars for 200+ guests)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (100 Guests) (5 hours)",
      priceLabel: "$2,095",
      tier: "premium",
      description:
        "Premium mobile bar for up to 100 guests. Includes 2 bar staff, premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        serviceTimingNote,
        travelNote,
        transportNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey, Rum",
        "Beer & Wine: Included",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Strawberries, Raspberries, Lychee, Mint",
        "Syrups: Simple Syrup, Grenadine, REAL Mango, REAL Passion Fruit, REAL Strawberry, REAL Coconut, REAL Blackberry",
        "Mobile Bar: Included (2 mobile bars for 200+ guests)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (150 Guests) (5 hours)",
      priceLabel: "$2,875",
      tier: "premium",
      description:
        "Premium mobile bar for up to 150 guests. Includes 3–4 bar staff, premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        serviceTimingNote,
        travelNote,
        transportNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey, Rum",
        "Beer & Wine: Included",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Strawberries, Raspberries, Lychee, Mint",
        "Syrups: Simple Syrup, Grenadine, REAL Mango, REAL Passion Fruit, REAL Strawberry, REAL Coconut, REAL Blackberry",
        "Mobile Bar: Included (2 mobile bars for 200+ guests)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (200 Guests) (5 hours)",
      priceLabel: "$3,600",
      tier: "premium",
      description:
        "Large-event premium bar for up to 200 guests. Includes 3 bartenders + 1 barback, premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        serviceTimingNote,
        travelNote,
        transportNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey, Rum",
        "Beer & Wine: Included",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Strawberries, Raspberries, Lychee, Mint",
        "Syrups: Simple Syrup, Grenadine, REAL Mango, REAL Passion Fruit, REAL Strawberry, REAL Coconut, REAL Blackberry",
        "Mobile Bar: Included (2 mobile bars for 200+ guests)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (250 Guests) (5 hours)",
      priceLabel: "$4,150",
      tier: "premium",
      description:
        "High-volume premium bar for up to 250 guests. Includes 5 bar staff, premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        serviceTimingNote,
        travelNote,
        transportNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey, Rum",
        "Beer & Wine: Included",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Strawberries, Raspberries, Lychee, Mint",
        "Syrups: Simple Syrup, Grenadine, REAL Mango, REAL Passion Fruit, REAL Strawberry, REAL Coconut, REAL Blackberry",
        "Mobile Bar: Included (2 mobile bars for 200+ guests)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },

    // =========================
    // MOCKTAIL PACKAGES (left as-is except timing/travel notes)
    // =========================
    {
      title: "Mocktail 50",
      priceLabel: "",
      tier: "mocktail",
      description:
        "This package is for parties up to 50 guests and includes: 1 bartender and mixes for mocktails including a menu.",
      details: [
        serviceTimingNote,
        travelNote,
        "Mixers: Lemonade, All Berries, Coke, Sprite, Ginger Ale, Coconut, Pineapple, Cranberry",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Limes, Berries, Rosemary",
        "Mobile bar: No (options available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "Mocktail 100",
      priceLabel: "",
      tier: "mocktail",
      description:
        "This package is for parties up to 100 guests and includes: 1 bartender, 1 bar-back, and mixes for mocktails including a menu.",
      details: [
        serviceTimingNote,
        travelNote,
        "Mixers: Lemonade, All Berries, Coke, Sprite, Ginger Ale, Coconut, Pineapple, Cranberry",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Limes, Berries, Rosemary",
        "Mobile bar: No (options available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
  ];

  // Derived groups (prevents mixing + controls ordering)
  const otherOptions = packages.filter((p) => p.isButtonOnly);
  const basicPkgs = packages.filter((p) => p.tier === "basic");
  const premiumPkgs = packages.filter((p) => p.tier === "premium");
  const mocktailPkgs = packages.filter((p) => p.tier === "mocktail");

  const renderPackageCard = (pkg, keyPrefix, index) => (
    <div key={`${keyPrefix}-${index}`} className="package-card">
      <div className="package-card-header">
        <h3 className="package-title">{pkg.title}</h3>
        {pkg.priceLabel ? (
          <span className="package-price-badge">{pkg.priceLabel}</span>
        ) : null}
      </div>

      <p className="package-description">{pkg.description}</p>

      {pkg.details?.length > 0 && (
        <ul className="package-details">
          {pkg.details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      )}

      <Link
        to={`/intake-form?service=${encodeURIComponent(pkg.title)}`}
        className="book-button"
      >
        BOOK AN EVENT
      </Link>
    </div>
  );

  return (
    <div className="event-packages">
      <h2 className="fancy-heading">Event Packages</h2>
      <p className="packages-description">
        Compare our packages below, then select <b>BOOK AN EVENT</b> under the option you want.
      </p>

      <div className="packages-cta">
        <p style={{ marginTop: 8 }}>
          Prefer something different? <b>Book Staff or Customize your own package</b> — choose <a href="#other-packages">Custom Package</a> below, or click
          <b> BOOK AN EVENT</b> under any option to select add-ons.
        </p>
      </div>

      {/* Basic vs Premium comparison cards */}
      <div className="package-compare-wrap">
        <div className="package-compare-card basic">
          <div className="package-compare-top">
            <h3 className="package-compare-title">Basic Bar</h3>
            <p className="package-compare-subtitle">Classic cocktails • Clean service</p>
          </div>

          <ul className="package-compare-list">
            <li><b>1 hour setup + 4 hour service + 30 min breakdown</b></li>
            <li>Overage cleanup billed at <b>$100/hr</b></li>
            <li>Liquors: <b>Vodka, Tequila, Cognac</b></li>
            <li>Standard chasers (juices/sodas/water)</li>
            <li>Cups, napkins, straws, ice + basic garnishes</li>
            <li><b>Mobile bar:</b> Add-on available</li>
            <li><b>Travel:</b> 25 miles round trip included • long-distance fee may apply</li>
          </ul>

          <div className="package-compare-prices">
            <div>
              <span className="price-label">Guests</span>
              <b>25</b>
              <span className="price-amount">$750</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>50</b>
              <span className="price-amount">$900</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>100</b>
              <span className="price-amount">$1,450</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>150</b>
              <span className="price-amount">$1,900</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>200</b>
              <span className="price-amount">$2,350</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>250</b>
              <span className="price-amount">$2,875</span>
            </div>
          </div>

          <a className="book-button" href="#basic-packages">VIEW BASIC PACKAGES</a>
        </div>

        <div className="package-compare-card premium">
          <div className="package-compare-top">
            <h3 className="package-compare-title">Premium Bar</h3>
            <p className="package-compare-subtitle">Expanded menu • Elevated ingredients</p>
          </div>

          <ul className="package-compare-list">
            <li><b>1 hour premium setup + 4 hour service + 30 min breakdown</b></li>
            <li>Overage cleanup billed at <b>$100/hr</b></li>
            <li>Liquors: <b>Vodka, Tequila, Cognac, Whiskey, Rum</b></li>
            <li><b>Beer + Wine</b> included</li>
            <li><b>17+ cocktail</b> premium menu</li>
            <li>Cups, napkins, straws, ice + premium garnishes</li>
            <li><b>Mobile bar:</b> Included (2 bars for 200+ guests)</li>
            <li><b>Transport:</b> $150 drop-off/pick-up when applicable</li>
            <li><b>Travel:</b> 25 miles round trip included • long-distance fee may apply</li>
          </ul>

          <div className="package-compare-prices">
            <div>
              <span className="price-label">Guests</span>
              <b>25</b>
              <span className="price-amount">$1,045</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>50</b>
              <span className="price-amount">$1,345</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>100</b>
              <span className="price-amount">$2,095</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>150</b>
              <span className="price-amount">$2,875</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>200</b>
              <span className="price-amount">$3,600</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>250</b>
              <span className="price-amount">$4,150</span>
            </div>
          </div>

          <a className="book-button" href="#premium-packages">VIEW PREMIUM PACKAGES</a>
        </div>
      </div>

      {/* OTHER OPTIONS */}
      <div id="other-packages" style={{ height: 1 }} />
      <h2 className="fancy-heading" style={{ marginTop: 20 }}>Other Booking Options</h2>
      {otherOptions.map((pkg, index) => renderPackageCard(pkg, "other", index))}

      {/* BASIC */}
      <div id="basic-packages" style={{ height: 1 }} />
      <h2 className="fancy-heading" style={{ marginTop: 20 }}>Basic Packages</h2>
      {basicPkgs.map((pkg, index) => renderPackageCard(pkg, "basic", index))}

      {/* PREMIUM */}
      <div id="premium-packages" style={{ height: 1 }} />
      <h2 className="fancy-heading" style={{ marginTop: 20 }}>Premium Packages</h2>
      {premiumPkgs.map((pkg, index) => renderPackageCard(pkg, "premium", index))}

      {/* MOCKTAIL 
      <div id="mocktail-packages" style={{ height: 1 }} />
      <h2 className="fancy-heading" style={{ marginTop: 20 }}>Mocktail Packages</h2>
      {mocktailPkgs.map((pkg, index) => renderPackageCard(pkg, "mocktail", index))}*/}

      {/* DISCLAIMERS LAST */}
      <h2 style={{ marginTop: 28 }}>DISCLAIMERS</h2>
      <div className="disclaimer">
        <ul>
          <li style={{ color: 'red' }}>Holiday bookings include a $150 fee and same day bookings a $100 fee.</li>
          <li>Add-ons are available to view once you select 'Book an Event'.</li>
          <li>
            Cocktail item list or quantities aren't provided for event staffing or custom packages. For ingredients list, refer to our{" "}
            <a href="/rb/common-cocktails" target="_blank" rel="noopener noreferrer">
              Common Cocktails Menu
            </a>.
          </li>
          <li><b>Pricing shown is for new bookings.</b> Existing contracts are honored.</li>
          <li><b>Cleanup/Ontime:</b> Packages include 30 minutes breakdown. Extended cleanup billed at $100/hr.</li>
          <li><b>Travel:</b> 25 miles round trip included. Long-distance fee may apply (1+ hour each way = $150).</li>
          <li><b>Transport:</b> Mobile bar drop-off/pick-up may require a $150 transport fee when applicable.</li>
          <li>Alcohol service is subject to venue requirements. Any required permits or licensing fees will be added if applicable.</li>
        </ul>
      </div>
    </div>
  );
};

export default EventPackages;
