import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaGoogle, FaInstagram, FaFacebook, FaYoutube, FaBars, FaTimes } from "react-icons/fa";
import ChatBox from "../../../components/Public/ChatBox";
import "../../../RB.css";

const RBLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
    if (mobileMenuOpen) {
      setOpenDropdown(null);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
        setOpenDropdown(null);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="rb-layout">
      <nav className="rb-nav">
        <div className="rb-logo">
          <Link to="/rb/home" onClick={closeMobileMenu}>
            <img src="/RB_Logo_menu.png" alt="Ready Bartending Logo" />
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="rb-links rb-links-desktop">
          <Link to="/rb/home">Home</Link>

          <div className="dropdown">
            <span className="dropdown-toggle">Our Services ▼</span>
            <div className="dropdown-content">
              <Link to="/rb/event-staffing-packages">Event Staffing & Packages</Link>
              <Link to="/rb/crafts-cocktails">Crafts & Cocktails</Link>
              <Link to="/rb/mix-n-sip">Mix N' Sip</Link>
              <Link to="/rb/how-to-be-a-bartender">Bartending Course & Classes</Link>
              <Link to="/rb/rentals-products">Rentals & Products</Link>
            </div>
          </div>

          <div className="dropdown">
            <span className="dropdown-toggle">Menus ▼</span>
            <div className="dropdown-content">
              <Link to="/rb/common-cocktails">Classic Cocktails Menu</Link>
              <Link to="/rb/signature-cocktails">Signature Cocktails Menu</Link>
            </div>
          </div>

          <div className="dropdown">
            <span className="dropdown-toggle">Events ▼</span>
            <div className="dropdown-content">
              <Link to="/rb/events">Ready Bar Events</Link>
              {/*<Link to="/rb/baby-showers">Baby Showers & Gender Reveals</Link>
              <Link to="/rb/weddings">Weddings</Link>*/}
            </div>
          </div>

          <div className="dropdown">
            <span className="dropdown-toggle">More ▼</span>
            <div className="dropdown-content">
              <Link to="/rb/staff">Staff</Link>
              <Link to="/rb/apply">Apply</Link>
            </div>
          </div>
        </div>

        {/* Desktop Buttons */}
        <div className="rb-buttons rb-buttons-desktop">
          <Link to="/login" className="btn">Ready Portal</Link>
          <Link to="/rb/event-staffing-packages" className="btn">Book an Event</Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="rb-mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          type="button"
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`rb-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <Link to="/rb/home" onClick={closeMobileMenu} className="rb-mobile-link">
          Home
        </Link>

        <div className="rb-mobile-group">
          <button
            type="button"
            className="rb-mobile-dropdown-toggle"
            onClick={() => toggleDropdown("services")}
          >
            Our Services <span>{openDropdown === "services" ? "▲" : "▼"}</span>
          </button>
          {openDropdown === "services" && (
            <div className="rb-mobile-submenu">
              <Link to="/rb/event-staffing-packages" onClick={closeMobileMenu}>Event Staffing & Packages</Link>
              <Link to="/rb/crafts-cocktails" onClick={closeMobileMenu}>Crafts & Cocktails</Link>
              <Link to="/rb/mix-n-sip" onClick={closeMobileMenu}>Mix N&apos; Sip</Link>
              <Link to="/rb/how-to-be-a-bartender" onClick={closeMobileMenu}>Bartending Course & Classes</Link>
              <Link to="/rb/rentals-products" onClick={closeMobileMenu}>Rentals & Products</Link>
            </div>
          )}
        </div>

        <div className="rb-mobile-group">
          <button
            type="button"
            className="rb-mobile-dropdown-toggle"
            onClick={() => toggleDropdown("menus")}
          >
            Menus <span>{openDropdown === "menus" ? "▲" : "▼"}</span>
          </button>
          {openDropdown === "menus" && (
            <div className="rb-mobile-submenu">
              <Link to="/rb/common-cocktails" onClick={closeMobileMenu}>Classic Cocktails Menu</Link>
              <Link to="/rb/signature-cocktails" onClick={closeMobileMenu}>Signature Cocktails Menu</Link>
            </div>
          )}
        </div>

        <div className="rb-mobile-group">
          <button
            type="button"
            className="rb-mobile-dropdown-toggle"
            onClick={() => toggleDropdown("events")}
          >
            Events <span>{openDropdown === "events" ? "▲" : "▼"}</span>
          </button>
          {openDropdown === "events" && (
            <div className="rb-mobile-submenu">
              <Link to="/rb/events" onClick={closeMobileMenu}>Ready Bar Events</Link>
              <Link to="/rb/baby-showers" onClick={closeMobileMenu}>Baby Showers & Gender Reveals</Link>
              <Link to="/rb/weddings" onClick={closeMobileMenu}>Weddings</Link>
            </div>
          )}
        </div>

        <div className="rb-mobile-group">
          <button
            type="button"
            className="rb-mobile-dropdown-toggle"
            onClick={() => toggleDropdown("more")}
          >
            More <span>{openDropdown === "more" ? "▲" : "▼"}</span>
          </button>
          {openDropdown === "more" && (
            <div className="rb-mobile-submenu">
              <Link to="/rb/staff" onClick={closeMobileMenu}>Staff</Link>
              <Link to="/rb/apply" onClick={closeMobileMenu}>Apply</Link>
            </div>
          )}
        </div>

        <div className="rb-mobile-buttons">
          <Link to="/login" className="btn" onClick={closeMobileMenu}>Ready Portal</Link>
          <Link to="/rb/event-staffing-packages" className="btn" onClick={closeMobileMenu}>Book an Event</Link>
        </div>
      </div>

      <div className="homepage">
        {children}
      </div>

      <ChatBox />

      <div className="gold-divider"></div>

      <footer className="footer">
        <div className="footer-icons">
          <a href="https://www.google.com/search?q=ready+bartending" target="_blank" rel="noopener noreferrer">
            <FaGoogle />
          </a>
          <a href="https://www.instagram.com/readybartending/" target="_blank" rel="noopener noreferrer">
            <FaInstagram />
          </a>
          <a href="https://www.facebook.com/readybartending/" target="_blank" rel="noopener noreferrer">
            <FaFacebook />
          </a>
          <a href="https://www.youtube.com/channel/UCuKXPxA4x9oOU_XaXXyXL7g" target="_blank" rel="noopener noreferrer">
            <FaYoutube />
          </a>
        </div>
        <div className="footer-links">
          <a href="/rb/home">Home</a> |
          <a href="/rb/event-staffing-packages">Book an Event</a> |
          <a href="/rb/privacy-policy">Privacy Policy</a> |
          <a href="/rb/faqs">Contact</a>
        </div>
        <p>&copy; 2024 Ready Bartending LLC - All rights reserved</p>
        <p>Created by Caitlyn Myland</p>
      </footer>
    </div>
  );
};

export default RBLayout;