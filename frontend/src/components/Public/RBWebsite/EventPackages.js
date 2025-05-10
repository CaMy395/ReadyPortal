import React from 'react';
import { Link } from 'react-router-dom';
import '../../../RB.css';


const EventPackages = () => {
  const packages = [
    {
      title: "Event Staffing",
      description: "Click the book an event button to book our staff!",
      details: [],
      isButtonOnly: true
    },
    {
      title: "Custom Package",
      description: "Click the book an event button to customize your booking by telling us in our forum!",
      details: [],
      isButtonOnly: true
    },
    {
      title: "The Bare Necessities (25 Guests) (5 hours)",
      description: "This package is for parties up to 25 guests and includes 1 Bartender, liquor, 1 hour for prep, and chasers for basic cocktails such as rum and coke, vodka cranberry, etc.",
      details: [
        "Chasers: Pineapple, Cranberry, Lemonade, OJ, Coke, Sprite, Ginger Ale",
        "Liquors: Vodka, Tequila, Cognac",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lime",
        "Mobile Bar: No - options available"
      ]
    },
    {
      title: "The Bare Necessities (50 Guests) (5 hours)",
      description: "This package is for parties up to 50 guests and includes 1 Bartender, liquor, 1 hour for prep, and chasers for basic cocktails such as rum and coke, vodka cranberry, etc.",
      details: [
        "Chasers: Pineapple, Cranberry, Lemonade, OJ, Coke, Sprite, Ginger Ale",
        "Liquors: Vodka, Tequila, Cognac",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lime",
        "Mobile Bar: No - options available"
      ]
    },
    {
      title: "The Bare Necessities (100 Guests) (5 hours)",
      description: "This package is for parties up to 100 guests and includes 2 Bartenders, liquor, 1 hour for prep, and chasers for basic cocktails such as rum and coke, vodka cranberry, etc.",
      details: [
        "Chasers: Pineapple, Cranberry, Lemonade, OJ, Coke, Sprite, Ginger Ale",
        "Liquors: Vodka, Tequila, Cognac",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lime",
        "Mobile Bar: No - options available"
      ]
    },
    {
      title: "The Bare Necessities (200 Guests) (5 hours)",
      description: "This package is for parties up to 200 guests and includes 3 Bartenders, 1 Barback, 1 hour for prep, liquor, and chasers for basic cocktails such as rum and coke, vodka cranberry, etc.",
      details: [
        "Chasers: Pineapple, Cranberry, Lemonade, OJ, Coke, Sprite, Ginger Ale",
        "Liquors: Vodka, Tequila, Cognac",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lime",
        "Mobile Bar: No - options available"
      ]
    },
    {
      title: "The Ready Experience (25 Guests) (5 hours)",
      description: "This package is for parties up to 25 guests and includes 1 Bartender, 1 hour for prep, liquor, and chasers, mobile bar (with drop-off and pick-up) and our premium menu. This package can make 17+ classic cocktails.",
      details: [
        "Chasers: Pineapple, Cranberry, Grapefruit, OJ, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda",
        "Liquors: Vodka, Tequila, Cognac, Whiskey, Triple Sec, Peach Schnapps",
        "Bar Essentials: Cups (Acrylic option available), Napkins, Straws, Ice, Water",
        "Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint"
      ]
    },
    {
      title: "The Ready Experience (50 Guests) (5 hours)",
      description: "This package is for parties up to 50 guests and includes 1 Bartender, 1 hour for prep, liquor, and chasers, mobile bar (with drop-off and pick-up) and our premium menu. This package can make 17+ classic cocktails.",
      details: [
        "Chasers: Pineapple, Cranberry, Grapefruit, OJ, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda",
        "Liquors: Vodka, Tequila, Cognac, Whiskey, Triple Sec, Peach Schnapps",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint"
      ]
    },
    {
      title: "The Ready Experience (100 Guests) (5 hours)",
      description: "This package is for parties up to 100 guests and includes 2 bar staff, 1 hour for prep, liquor, and chasers, mobile bar (with drop-off and pick-up) and our premium menu. This package can make 17+ classic cocktails.",
      details: [
        "Chasers: Pineapple, Cranberry, Grapefruit, OJ, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda",
        "Liquors: Vodka, Tequila, Cognac, Whiskey, Triple Sec, Peach Schnapps",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint"
      ]
    },
    {
      title: "The Ready Experience (200 Guests) (5 hours)",
      description: "This package is for parties up to 200 guests and includes 3 Bartenders, 1 Barback, 1 hour for prep, liquor, and chasers, mobile bar (with drop-off and pick-up) and our premium menu. This package can make 17+ classic cocktails.",
      details: [
        "Chasers: Pineapple, Cranberry, Grapefruit, OJ, Sour, Coke, Sprite, Ginger Ale, Ginger Beer, Tonic Water, Club Soda",
        "Liquors: Vodka, Tequila, Cognac, Whiskey, Triple Sec, Peach Schnapps",
        "Bar Essentials: Cups, Napkins, Straws, Ice, Water",
        "Garnishes: Lemons, Limes, Cherries, Oranges, Berries, Mint"
      ]
    },
    {
      title: "Mocktail 50",
      description: "This package is for parties up to 50 guests and includes: 1 Bartender, and Mixes for mocktails including a menu.",
      details: [
        "Mixers: Lemonade, All Berries, Coke, Sprite, Ginger Ale, Coconut, Pineapple, Cranberry",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Limes, Berries, Rosemary",
        "All leftover items (opened/unopened) are yours to keep!",
        "Mobile bar: No - options available"
      ]
    },
    {
      title: "Mocktail 100",
      description: "This package is for parties up to 100 guests and includes: 1 Bartender, 1 Bar-Back, and Mixes for mocktails including a menu.",
      details: [
        "Mixers: Lemonade, All Berries, Coke, Sprite, Ginger Ale, Coconut, Pineapple, Cranberry",
        "Bar Essentials: Cups, Napkins, Straws, Ice",
        "Garnishes: Limes, Berries, Rosemary",
        "All leftover items (opened/unopened) are yours to keep!",
        "Mobile bar: No - options available"
      ]
    }
  ];

  return (
    <div className="event-packages">
       <h2 className="fancy-heading">Event Packages</h2>
      <p className="packages-description">Take a look at our services below and select the book an event button at the bottom!</p>
      <h2>DISCLAIMERS</h2>
      <p className="disclaimer">
        <ul>
          <li style={{ color: 'red' }}>Holiday bookings include a $150 fee and same day bookings a $100 fee.</li>
          <li> Add-ons are available to view once you select 'Book an Event'.</li>
          <li>
            Cocktail item list or quantities aren't provided for event staffing or custom packages. For ingredients list, refer to our
            <a href="/rb/common-cocktails" target="_blank" rel="noopener noreferrer"> Common Cocktails Menu</a>.
          </li>

        </ul>  
      </p>
      {packages.map((pkg, index) => (
        <div key={index} className="package-card">
          <h3 className="package-title">{pkg.title}</h3>
          <p className="package-description">{pkg.description}</p>
          {pkg.details.length > 0 && (
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
      ))}
    </div>
  );
};

export default EventPackages;

  