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
        </div>
      </section>
      
      {/* Products Section */}
      <section className="products-section">
        <h2>Products for Sale</h2>
        <p>Coming soon...</p>
      </section>
    </div>
  );
};

export default RentalsProducts;
