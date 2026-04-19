import React, { useState } from "react";
import "../../../RB.css";
import useSitePageContent from "../../../hooks/useSitePageContent";

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return [...items]
    .filter((item) => item && item.is_active !== false)
    .sort((a, b) => {
      const aOrder =
        typeof a.sort_order === "number"
          ? a.sort_order
          : Number(a.sort_order) || 0;
      const bOrder =
        typeof b.sort_order === "number"
          ? b.sort_order
          : Number(b.sort_order) || 0;
      return aOrder - bOrder;
    });
}

function ItemCard({ item, className = "rental-item", fallbackLinkText = "" }) {
  const hasLink = !!item.button_link;
  const isExternal =
    hasLink &&
    (item.button_link.startsWith("http://") ||
      item.button_link.startsWith("https://"));

  const galleryImages = [
    item.image_url,
    ...(Array.isArray(item.images) ? item.images : []),
  ].filter(Boolean);

  const uniqueGalleryImages = [...new Set(galleryImages)];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const currentImage =
    uniqueGalleryImages[currentImageIndex] || item.image_url || "";

  const goPrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? uniqueGalleryImages.length - 1 : prev - 1
    );
  };

  const goNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === uniqueGalleryImages.length - 1 ? 0 : prev + 1
    );
  };

  const content = (
    <>
      {currentImage ? (
        <div className="catalog-image-wrapper">
          <img
            src={currentImage}
            alt={item.image_alt || item.name || "Item image"}
          />

          {uniqueGalleryImages.length > 1 && (
            <>
              <button
                type="button"
                className="catalog-arrow catalog-arrow-left"
                onClick={goPrev}
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                className="catalog-arrow catalog-arrow-right"
                onClick={goNext}
                aria-label="Next image"
              >
                ›
              </button>

              <div className="catalog-dots">
                {uniqueGalleryImages.map((_, idx) => (
                  <span
                    key={idx}
                    className={`catalog-dot ${
                      idx === currentImageIndex ? "active" : ""
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {item.badge ? <div className="catalog-badge">{item.badge}</div> : null}

      <p>{item.name || "Untitled Item"}</p>

      {item.price ? <div className="catalog-price">{item.price}</div> : null}

      {item.description ? (
        <div className="catalog-description">{item.description}</div>
      ) : null}

      {hasLink ? (
        <span className="catalog-link-text">
          {item.button_text || fallbackLinkText}
        </span>
      ) : null}
    </>
  );

  if (hasLink) {
    return (
      <a
        className={className}
        href={item.button_link}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

const RentalsProducts = () => {
  const { loading, sectionsByKey } = useSitePageContent("rentals-products");

  const hero = sectionsByKey?.hero || {};
  const rentalsSection = sectionsByKey?.rentals_items || {};
  const productsSection = sectionsByKey?.products_items || {};

  const rentals = normalizeItems(rentalsSection.content_json || []);
  const products = normalizeItems(productsSection.content_json || []);

  if (loading) {
    return (
      <div className="rentals-products-container">
        <h1 className="fancy-heading">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="rentals-products-container">
      <h1 className="fancy-heading">
        {hero.title || "Products & Rentals"}
      </h1>

      {hero.subtitle ? <p className="hero-subtitle">{hero.subtitle}</p> : null}
      {hero.body ? <p className="hero-body">{hero.body}</p> : null}

      <section className="rentals-section">
        <h2>{rentalsSection.title || "Rentals"}</h2>
        {rentalsSection.subtitle ? <p>{rentalsSection.subtitle}</p> : null}

        <div className="rentals-grid">
          {rentals.length > 0 ? (
            rentals.map((item) => (
              <ItemCard
                key={item.id || item.name}
                item={item}
                className="rental-item"
                fallbackLinkText="Rent This"
              />
            ))
          ) : (
            <p>No rentals available right now.</p>
          )}
        </div>
      </section>

      <section className="products-section">
        <h2>{productsSection.title || "Products for Sale"}</h2>
        {productsSection.subtitle ? <p>{productsSection.subtitle}</p> : null}

        <div className="products-grid">
          {products.length > 0 ? (
            products.map((item) => (
              <ItemCard
                key={item.id || item.name}
                item={item}
                className="products-item"
                fallbackLinkText="Buy Now"
              />
            ))
          ) : (
            <p>No products available right now.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default RentalsProducts;