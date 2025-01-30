import React from 'react';
import "../../../RB.css";

const cocktails = [
  {
    category: "Vodka Cocktails",
    drinks: [
      { name: "Lychee Martini", ingredients: "Vodka, Elderflower Liqueur, Lychee Juice or Liqueur, Lemon Juice, Simple Syrup" },
      { name: "Sex on the Beach", ingredients: "Vodka, Peach Schnapps, Cranberry, Orange Juice" },
      { name: "Apple Martini", ingredients: "Vodka, Apple Schnapps, Simple Syrup, Apple Juice, Lemon Juice" },
      { name: "Cosmopolitan (Cosmo)", ingredients: "Vodka, Triple Sec, Lime Juice, Cranberry" },
      { name: "Lemon Drop (Martini / Shot)", ingredients: "Vodka, Triple Sec, Lemon Juice, Simple Syrup" },
      { name: "Kamikaze (Vodka Margarita)", ingredients: "Vodka, Triple Sec, Lime Juice, Simple Syrup" },
      { name: "Moscow Mule", ingredients: "Vodka, Lime Juice, Ginger" },
      { name: "Blue Lagoon", ingredients: "Vodka, Blue Curaçao, Lemonade" }
    ]
  },
  {
    category: "Tequila Cocktails",
    drinks: [
      { name: "Margarita", ingredients: "Tequila, Triple Sec, Lime" },
      { name: "Paloma", ingredients: "Tequila, Lime Juice, Grapefruit Soda, or Grapefruit Juice and Soda Water (or Sprite)" },
      { name: "Tequila Sunset", ingredients: "Tequila, Grapefruit Juice, Grenadine" },
      { name: "Tequila Sunrise", ingredients: "Tequila, Orange Juice, Grenadine" }
    ]
  },
  {
    category: "Rum Cocktails",
    drinks: [
      { name: "Daiquiri", ingredients: "Rum, Lime Juice, Simple Syrup" },
      { name: "Rum Punch", ingredients: "Rum, Malibu, Pineapple Juice, Cranberry Juice, Peach Schnapps, Orange Juice, Lime Juice, Simple Syrup" },
      { name: "Mai-Tai", ingredients: "Light Rum, Dark Rum, Orange Curaçao or Liqueur, Orgeat and Simple Syrup, Lime Juice" },
      { name: "Mojito", ingredients: "Rum, Lime Juice, Mint, Simple Syrup and Soda water OR Rum, Lime Juice, Mint, Sprite" }
    ]
  },
  {
    category: "Gin Cocktails",
    drinks: [
      { name: "Gimlet", ingredients: "Gin, Lime, Simple Syrup" },
      { name: "French 75", ingredients: "Gin, Lemon Juice, Simple Syrup, Champagne" },
      { name: "Tom Collins", ingredients: "Gin, Lemon Juice, Simple Syrup, Soda Water (or Sprite)" },
      { name: "Gin N’ Tonic", ingredients: "Gin, Lime Juice, Tonic Water" },
      { name: "Negroni", ingredients: "Gin, Campari, Sweet Vermouth" }
    ]
  },
  {
    category: "Whiskey & Cognac Cocktails",
    drinks: [
      { name: "French Connection", ingredients: "Cognac, Amaretto" },
      { name: "Sidecar (Cognac Lemon Drop)", ingredients: "Cognac (Hennessy), Orange Liqueur (Grand Marnier), Lemon Juice, Simple Syrup" },
      { name: "Incredible Hulk", ingredients: "Hennessy, Hypnotic" },
      { name: "Manhattan", ingredients: "Whiskey, Sweet Vermouth, Simple Syrup, Argonauts Bitters" },
      { name: "Lynchburg Lemon", ingredients: "Whiskey (Jack Daniel’s), Triple Sec, Lemon Juice, Sprite" },
      { name: "Green Tea Shot", ingredients: "Whiskey (Jameson), Peach Schnapps, Sour Mix" },
      { name: "Old Fashion", ingredients: "Whiskey, Simple Syrup, Aromatic Bitters" }
    ]
  }
];

const CommonCocktails = () => {
  return (
    <div className="common-cocktails-container">
      <h1 className="fancy-heading">Common Cocktails Menu</h1>
      <p className="subtitle">Below are various cocktails and their ingredients. Use this to help guide you on item selection when preparing for an event!</p>
      {cocktails.map((category, index) => (
        <div key={index} className="cocktail-category">
          <h2>{category.category}</h2>
          <ul>
            {category.drinks.map((drink, idx) => (
              <li key={idx} className="cocktail-item">
                <strong>{drink.name}:</strong> {drink.ingredients}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default CommonCocktails;
