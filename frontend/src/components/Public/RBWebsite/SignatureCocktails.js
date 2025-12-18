import React from 'react';
import "../../../RB.css";

const SignatureCocktails = () => {
  return (
    <div className="common-cocktails-container">
      <h1 className="fancy-heading">Signature Cocktails</h1>
      
      {/* cocktailss Section */}
      <section className="cocktails-section">
        <div className="cocktails-grid">
          <div className="cocktails-item">
            <img src="/1.png" alt="Ready Bar 5" />
          </div>
         
          <div className="cocktails-item">
            <img src="/2.png" alt="Ready Bar 1" />
          </div>
          <div className="cocktails-item">
            <img src="/3.png" alt="Ready Bar 2" />
          </div>
          <div className="cocktails-item">
            <img src="/4.png" alt="Custom Ready Bar 1" />
          </div>
          <div className="cocktails-item">
            <img src="/5.png" alt="Ready Bar 2" />
          </div>
          <div className="cocktails-item">
            <img src="/6.png" alt="Custom Ready Bar 1" />
          </div>
          <div className="cocktails-item">
            <img src="/7.png" alt="Custom Ready Bar 1" />
          </div>
          <div className="cocktails-item">
            <img src="/8.png" alt="Custom Ready Bar 1" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SignatureCocktails;
