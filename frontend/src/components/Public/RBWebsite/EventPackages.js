import React from 'react';
import { Link } from 'react-router-dom';
import '../../../RB.css';

const EventPackages = () => {
  // Helper: consistent note used across packages
  const setupNote = "Includes 1 hour of setup and breakdown. Service time begins after setup is complete.";

  const packages = [
    {
      title: "Event Staffing",
      description: "Click the book an event button to book our staff!",
      details: [],
      isButtonOnly: true,
    },
    {
      title: "Custom Package",
      description: "Click the book an event button to customize your booking by telling us in our form!",
      details: [],
      isButtonOnly: true,
    },

    // ✅ BASIC PACKAGES (updated liquor scope + pricing messaging)
    {
      title: "The Bare Necessities (25 Guests) (5 hours)",
      priceLabel: "$460",
      tier: "basic",
      description:
        "Classic cocktails and clean service for parties up to 25 guests. Includes 1 bartender, 1 hour setup, liquor, and chasers for basic cocktails (vodka cran, tequila & soda, cognac & coke, etc.).",
      details: [
        setupNote,
        "Liquors (Basic): Vodka, Tequila, Cognac OR Whiskey",
        "Chasers: Pineapple, Cranberry, Lemonade, Orange Juice, Coke, Sprite, Ginger Ale, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (50 Guests) (5 hours)",
      priceLabel: "$650",
      tier: "basic",
      description:
        "Classic cocktails and clean service for parties up to 50 guests. Includes 1 bartender, 1 hour setup, liquor, and chasers for basic cocktails.",
      details: [
        setupNote,
        "Liquors (Basic): Vodka, Tequila, Cognac OR Whiskey",
        "Chasers: Pineapple, Cranberry, Lemonade, Orange Juice, Coke, Sprite, Ginger Ale, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (100 Guests) (5 hours)",
      priceLabel: "$1,200",
      tier: "basic",
      description:
        "Classic cocktails for parties up to 100 guests. Includes 2 bar staff, 1 hour setup, liquor, and chasers for basic cocktails.",
      details: [
        setupNote,
        "Liquors (Basic): Vodka, Tequila, Cognac OR Whiskey",
        "Chasers: Pineapple, Cranberry, Lemonade, Orange Juice, Coke, Sprite, Ginger Ale, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Bare Necessities (200 Guests) (5 hours)",
      priceLabel: "$2,100",
      tier: "basic",
      description:
        "Basic bar service for parties up to 200 guests. Includes 3 bartenders + 1 barback, 1 hour setup, liquor, and chasers for basic cocktails.",
      details: [
        setupNote,
        "Liquors (Basic): Vodka, Tequila, Cognac OR Whiskey",
        "Chasers: Pineapple, Cranberry, Lemonade, Orange Juice, Coke, Sprite, Ginger Ale, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      // ✅ NEW Basic 250
      title: "The Bare Necessities (250 Guests) (5 hours)",
      priceLabel: "$2,550",
      tier: "basic",
      description:
        "High-volume basic bar service for parties up to 250 guests. Includes 4–5 bar staff, 1 hour setup, liquor, and chasers for basic cocktails.",
      details: [
        setupNote,
        "Liquors (Basic): Vodka, Tequila, Cognac OR Whiskey",
        "Chasers: Pineapple, Cranberry, Lemonade, Orange Juice, Coke, Sprite, Ginger Ale, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Lime",
        "Mobile Bar: No (upgrade/add-on available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },

    // ✅ PREMIUM PACKAGES (Ready Experience) — Miami-correct pricing + consistency
    {
      title: "The Ready Experience (25 Guests) (5 hours)",
      priceLabel: "$795",
      tier: "premium",
      description:
        "Elevated mobile bar experience for up to 25 guests. Includes 1 bartender, 1 hour premium setup, premium liquor selection, and our premium menu (17+ classic cocktails).",
      details: [
        setupNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups (Acrylic option available), Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (50 Guests) (5 hours)",
      priceLabel: "$1,095",
      tier: "premium",
      description:
        "Premium mobile bar for up to 50 guests. Includes 1 bartender, 1 hour premium setup, premium liquor selection, mobile bar drop-off/pick-up, and our premium menu (17+ classic cocktails).",
      details: [
        setupNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint",
        "Mobile Bar: Included",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (100 Guests) (5 hours)",
      priceLabel: "$1,795",
      tier: "premium",
      description:
        "Premium mobile bar for up to 100 guests. Includes 2 bar staff, 1 hour premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        setupNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint",
        "Mobile Bar: Included",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      title: "The Ready Experience (200 Guests) (5 hours)",
      priceLabel: "$3,250",
      tier: "premium",
      description:
        "Large-event premium bar for up to 200 guests. Includes 3 bartenders + 1 barback, 1 hour premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        setupNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint",
        "Mobile Bar: Included",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
    {
      // ✅ NEW Premium 250
      title: "The Ready Experience (250 Guests) (5 hours)",
      priceLabel: "$3,750",
      tier: "premium",
      description:
        "High-volume premium bar for up to 250 guests. Includes 5 bar staff, 1 hour premium setup, premium liquor selection, mobile bar, and our premium menu (17+ classic cocktails).",
      details: [
        setupNote,
        "Liquors (Premium): Vodka, Tequila, Cognac, Whiskey",
        "Chasers & Mixers: Pineapple, Cranberry, Grapefruit, Orange Juice, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda, Water",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Premium Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint",
        "Mobile Bar: Included",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },

    // Mocktail packages left as-is
    {
      title: "Mocktail 50",
      priceLabel: "",
      tier: "mocktail",
      description:
        "This package is for parties up to 50 guests and includes: 1 bartender and mixes for mocktails including a menu.",
      details: [
        setupNote,
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
        setupNote,
        "Mixers: Lemonade, All Berries, Coke, Sprite, Ginger Ale, Coconut, Pineapple, Cranberry",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Limes, Berries, Rosemary",
        "Mobile bar: No (options available)",
        "All leftover items (opened/unopened) are yours to keep!",
      ],
    },
  ];

  // ✅ Derived groups (THIS is what fixes the ordering + prevents mixing)
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

      {/* ✅ Basic vs Premium comparison cards */}
      <div className="package-compare-wrap">
        <div className="package-compare-card basic">
          <div className="package-compare-top">
            <h3 className="package-compare-title">Basic Bar</h3>
            <p className="package-compare-subtitle">Classic cocktails • Clean service</p>
          </div>

          <ul className="package-compare-list">
            <li><b>1 hour</b> setup + breakdown</li>
            <li>Liquors: <b>Vodka, Tequila, Cognac OR Whiskey</b></li>
            <li>Standard chasers (juices/sodas/water)</li>
            <li>Cups, napkins, straws, ice + basic garnishes</li>
            <li><b>Mobile bar:</b> Add-on available</li>
          </ul>

          <div className="package-compare-prices">
            <div>
              <span className="price-label">Guests</span>
              <b>25</b>
              <span className="price-amount">$460</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>50</b>
              <span className="price-amount">$650</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>100</b>
              <span className="price-amount">$1,200</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>200</b>
              <span className="price-amount">$2,100</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>250</b>
              <span className="price-amount">$2,550</span>
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
            <li><b>1 hour</b> premium setup + breakdown</li>
            <li>Liquors: <b>Vodka, Tequila, Cognac, Whiskey</b></li>
            <li><b>17+ cocktail</b> premium menu</li>
            <li>Cups, napkins, straws, ice + premium garnishes</li>
            <li><b>Mobile bar:</b> Included (50+)</li>
          </ul>

          <div className="package-compare-prices">
            <div>
              <span className="price-label">Guests</span>
              <b>25</b>
              <span className="price-amount">$795</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>50</b>
              <span className="price-amount">$1,095</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>100</b>
              <span className="price-amount">$1,795</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>200</b>
              <span className="price-amount">$3,250</span>
            </div>
            <div>
              <span className="price-label">Guests</span>
              <b>250</b>
              <span className="price-amount">$3,750</span>
            </div>
          </div>

          <a className="book-button" href="#premium-packages">VIEW PREMIUM PACKAGES</a>
        </div>
      </div>

      {/* =========================
          ORDERED SECTIONS
         ========================= */}
         
      {/* OTHER OPTIONS (Event Staffing + Custom Package) */}
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

      {/* MOCKTAIL */}
      <div id="mocktail-packages" style={{ height: 1 }} />
      <h2 className="fancy-heading" style={{ marginTop: 20 }}>Mocktail Packages</h2>
      {mocktailPkgs.map((pkg, index) => renderPackageCard(pkg, "mocktail", index))}

      {/* OTHER OPTIONS (Event Staffing + Custom Package) */}
      <div id="other-packages" style={{ height: 1 }} />
      <h2 className="fancy-heading" style={{ marginTop: 20 }}>Other Booking Options</h2>
      {otherOptions.map((pkg, index) => renderPackageCard(pkg, "other", index))}

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
        </ul>
      </div>
    </div>
  );
};

export default EventPackages;
