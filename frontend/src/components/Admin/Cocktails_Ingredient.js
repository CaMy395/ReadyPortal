import React, { useState } from 'react';
import '../../App.css';

const cocktails = [
    { name: 'Lychee Martini', ingredients: '1.5 oz Vodka, 0.5 oz Elderflower Liqueur, 1 oz Lychee Juice, 0.5 oz Sour Mix, 0.5 oz Simple Syrup' },
    { name: 'Sex on the Beach', ingredients: '1.5 oz Vodka, 0.5 oz Peach Schnapps, 2 oz Cranberry Juice, 2 oz Orange Juice' },
    { name: 'Apple Martini', ingredients: '1.5 oz Vodka, 0.5 oz Apple Schnapps, 0.5 oz Simple Syrup, 1 oz Apple Juice, 0.5 oz Lemon Juice' },
    { name: 'Cosmopolitan (Cosmo)', ingredients: '1.5 oz Vodka, 0.5 oz Triple Sec, , 0.5 oz Simple Syrup, 0.5 oz Lime Juice, 1 oz Cranberry Juice' },
    { name: 'Lemon Drop (Martini / Shot)', ingredients: '1.5 oz Vodka, 0.5 oz Triple Sec, 1 oz Lemon Juice, 1 oz Simple Syrup / ' },
    { name: 'Kamikaze (Vodka Margarita)', ingredients: '1.5 oz Vodka, 0.5 oz Triple Sec, 0.5 oz Lime Juice, 0.25 oz Simple Syrup' },
    { name: 'Moscow Mule', ingredients: '1.5 oz Vodka, 0.5 oz Lime Juice, 4 oz Ginger Beer' },
    { name: 'Blue Lagoon', ingredients: '1.5 oz Vodka, 0.5 oz Blue Curaçao, 4 oz Lemonade' },
    { name: 'Margarita', ingredients: '1.5 oz Tequila, 0.5 oz Triple Sec, 1 oz Lime Juice, 1 oz Simple Syrup' },
    { name: 'Paloma', ingredients: '1.5 oz Tequila, 0.5 oz Lime Juice, 4 oz Grapefruit Soda (or Grapefruit Juice and Soda Water or Sprite)' },
    { name: 'Tequila Sunset', ingredients: '1.5 oz Tequila, 4 oz Grapefruit Juice, 0.5 oz Grenadine' },
    { name: 'Tequila Sunrise', ingredients: '1.5 oz Tequila, 4 oz Orange Juice, 0.5 oz Grenadine' },
    { name: 'Daiquiri', ingredients: '2 oz Rum, 1 oz Lime Juice, 0.75 oz Simple Syrup' },
    { name: 'Rum Punch', ingredients: '1 oz Rum, 1 oz Malibu, 2 oz Pineapple Juice, 2 oz Cranberry Juice, 1 oz Peach Schnapps, 2 oz Orange Juice, 0.5 oz Lime Juice, 0.5 oz Simple Syrup' },
    { name: 'Mai-Tai', ingredients: '1 oz Light Rum, 1 oz Dark Rum, 0.5 oz Orange Curaçao, 0.5 oz Orgeat Syrup, 0.5 oz Simple Syrup, 1 oz Lime Juice' },
    { name: 'Mojito', ingredients: '1.5 oz Rum, 1 oz Lime Juice, Mint Leaves, 1 oz Simple Syrup, 2 oz Soda Water (or Sprite)' },
    { name: 'Gimlet', ingredients: '2 oz Gin, 0.75 oz Lime Juice, 0.5 oz Simple Syrup' },
    { name: 'French 75', ingredients: '1.5 oz Gin, 0.5 oz Lemon Juice, 0.5 oz Simple Syrup, 2 oz Champagne' },
    { name: 'Tom Collins', ingredients: '1.5 oz Gin, 1 oz Lemon Juice, 0.75 oz Simple Syrup, 2 oz Soda Water (or Sprite)' },
    { name: 'Gin N’ Tonic', ingredients: '1.5 oz Gin, 0.5 oz Lime Juice, 4 oz Tonic Water' },
    { name: 'Negroni', ingredients: '1 oz Gin, 1 oz Campari, 1 oz Sweet Vermouth' },
    { name: 'French Connection', ingredients: '1.5 oz Cognac, 1.5 oz Amaretto' },
    { name: 'Sidecar (Cognac Lemon Drop)', ingredients: '1.5 oz Cognac (Hennessy), 1 oz Orange Liqueur (Grand Marnier), 0.75 oz Lemon Juice, 0.5 oz Simple Syrup' },
    { name: 'Incredible Hulk', ingredients: '1 oz Hennessy, 1 oz Hypnotic' },
    { name: 'Manhattan', ingredients: '2 oz Whiskey, 1 oz Sweet Vermouth, 0.25 oz Simple Syrup, 2 dashes Angostura Bitters' },
    { name: 'Lynchburg Lemonade', ingredients: '1.5 oz Whiskey (Jack Daniel’s), 0.5 oz Triple Sec, 1 oz Lemon Juice, 2 oz Sprite' },
    { name: 'Green Tea Shot', ingredients: '1 oz Whiskey (Jameson), 0.5 oz Peach Schnapps, 1 oz Sour Mix' },
    { name: 'Old Fashioned', ingredients: '2 oz Whiskey, 0.5 Simple Syrup, 2 dashes Aromatic Bitters' },
  ];
  
  
// Sorting the cocktails array alphabetically by drink name
cocktails.sort((a, b) => a.name.localeCompare(b.name));


  function SupplementalItems() {
    const [selectedDrink, setSelectedDrink] = useState(null);
  
    const toggleDrink = (drinkName) => {
      if (selectedDrink === drinkName) {
        setSelectedDrink(null); // Close if the same drink is clicked
      } else {
        setSelectedDrink(drinkName); // Open the clicked drink
      }
    };
  
    return (
      <div className="supplemental-items">
        <h1>Cocktails & Ingredients</h1>
        <p>Select a drink below to see the ingredients.</p>
        <ul className="cocktail-list">
  {cocktails.map((cocktail) => {
    const isOpen = selectedDrink === cocktail.name;
    return (
      <li key={cocktail.name} className={`cocktail-item ${isOpen ? 'active' : ''}`}>
        <h3
          onClick={() => toggleDrink(cocktail.name)}
          className="cocktail-title"
          style={{ cursor: 'pointer' }}
          aria-expanded={isOpen}
        >
          {cocktail.name}
        </h3>

        {isOpen && (
          <p className="cocktail-ingredients">
            {cocktail.ingredients}
          </p>
        )}
      </li>
    );
  })}
</ul>

      </div>
    );
  }
  
  export default SupplementalItems;