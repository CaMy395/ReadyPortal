import React from 'react';
import "../../../RB.css";

const RentalsProducts = () => {
  return (
    <div className="rentals-products-container">
      <h1 className="fancy-heading">Products & Rentals</h1>
      
      {/* Rentals Section */}
      <section className="rentals-section">
        <h2>Rentals</h2>
        <div className="rentals-grid">
          <div className="rental-item">
            <img src="/ReadyBarLive.png" alt="Ready Bar 5" />
            <p>Ready Bar Live</p>
          </div>
          <div className="rental-item">
            <img src="/ReadyBar1.png" alt="Ready Bar 1" />
            <p>Ready Bar Front View</p>
          </div>
          <div className="rental-item">
            <img src="/ReadyBar2.png" alt="Ready Bar 2" />
            <p>Ready Bar Side View</p>
          </div>
          <div className="rental-item">
            <img src="/CustomReadyBar1.png" alt="Custom Ready Bar 1" />
            <p>Custom Bar Front View</p>
          </div>
          <div className="rental-item">
            <img src="/Portable_Bar.jpg" alt="Ready Bar 2" />
            <p>Quick Bar Front View</p>
          </div>
          <div className="rental-item">
            <img src="/Portable_Bar_Back.jpg" alt="Custom Ready Bar 1" />
            <p>Quick Bar Rear View</p>
          </div>
          <div className="rental-item">
            <img src="/Bar_Stools.jpg" alt="Round High Table" />
            <p>Round High Tables</p>
          </div>
          <div className="rental-item">
            <img src="/Bar_Stools_with_Cover.jpg" alt="Round High Table" />
            <p>Round High Tables with Covers</p>
          </div>
        </div>
      </section>
      
      {/* Products Section */}
<section className="products-section">
  <h2>Products for Sale</h2>
  <div className="products-grid">
    {/* Bar Tools Kit */}
    <a className="products-item" href="https://square.link/u/Yv91nZWp" target="_blank" rel="noopener noreferrer">
      <img src="/TheBarTools.png" alt="Bar Tools Kit" />
      <p>Bar Tools Kit</p>
    </a>

    {/* Dehydrated Limes */}
    <a className="products-item" href="https://square.link/u/GgT32IIs" target="_blank" rel="noopener noreferrer">
      <img src="/DehydratedLimes.png" alt="Dehydrated Limes" />
      <p>Dehydrated Limes</p>
    </a>

    {/* Dehydrated Lemons */}
    <a className="products-item" href="https://square.link/u/P794DdVE" target="_blank" rel="noopener noreferrer">
      <img src="/DehydratedLemons.png" alt="Dehydrated Lemons" />
      <p>Dehydrated Lemons</p>
    </a>

    {/* Dehydrated Oranges */}
    <a className="products-item" href="https://square.link/u/sK3UncVt" target="_blank" rel="noopener noreferrer">
      <img src="/DehydratedOranges.png" alt="Dehydrated Oranges" />
      <p>Dehydrated Oranges</p>
    </a>

    {/* Bartender Manual */}
    <a className="products-item" href="https://square.link/u/oLy4EWPQ" target="_blank" rel="noopener noreferrer">
      <img src="/ReadyManualCover.png" alt="Bartender Manual" />
      <p>Bartender Manual</p>
    </a>

    {/* Bartender eManual */}
    <a className="products-item" href="https://square.link/u/9mHOsmzc" target="_blank" rel="noopener noreferrer">
      <img src="/ReadyManualCover.png" alt="Bartender Manual" />
      <p>Bartender e-Manual</p>
    </a>

    {/* Shop All Products Link to Square Store */}
    <a className="products-item" href="https://readybartending.square.site" target="_blank" rel="noopener noreferrer">
      <p>Shop All Products</p>
    </a>
  </div>
</section>

    </div>
  );
};

export default RentalsProducts;
