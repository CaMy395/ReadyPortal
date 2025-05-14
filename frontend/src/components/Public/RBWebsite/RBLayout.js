import React from "react";
import { Link } from "react-router-dom";
import { FaGoogle, FaInstagram, FaFacebook, FaYoutube } from "react-icons/fa";
import ChatBox from "../../../components/Public/ChatBox"; 
import "../../../RB.css";

const RBLayout = ({ children }) => {
    return (
        <div>
            {/* Navigation Menu */}
            <nav className="rb-nav">
                {/* Logo */}
                <div className="rb-logo">
                    <Link to="/rb/home">
                        <img src="/RB_Logo_menu.png" alt="Ready Bartending Logo" />
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="rb-links">
                    <Link to="/rb/home">Home</Link>

                    {/* Our Services Dropdown */}
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

                    {/* Events Dropdown 
                    <div className="dropdown">
                        <span className="dropdown-toggle">Events ▼</span>
                        <div className="dropdown-content">
                            <Link to="/rb/event-staffing">Event Bar Staffing in Miami</Link>
                            <Link to="/rb/baby-showers">Baby Showers & Gender Reveals</Link>
                            <Link to="/rb/corporate-events">Corporate Events</Link>
                            <Link to="/rb/public-events">Public Events & Festivals</Link>
                            <Link to="/rb/holiday-events">Holiday Events</Link>
                            <Link to="/rb/weddings">Weddings</Link>
                            <Link to="/rb/birthday-celebrations">Birthday Celebrations</Link>
                            <Link to="/rb/graduations">Graduations</Link>
                        </div>
                    </div>*/}

                    {/* More Dropdown */}
                    <div className="dropdown">
                        <span className="dropdown-toggle">More ▼</span>
                        <div className="dropdown-content">
                            <Link to="/rb/common-cocktails">Common Cocktails Menu</Link>
                            <Link to="/rb/apply">Apply</Link>
                              {/* More Dropdown
                            <Link to="/rb/gallery">Gallery</Link>
                            <Link to="/rb/about-us">About Us</Link>
                            
                            <Link to="/rb/leave-review">Leave Review</Link>
                            <Link to="/rb/contact">Contact Us</Link> */}
                        </div>
                    </div>
                </div>

                {/* Right-Side Buttons */}
                <div className="rb-buttons">
                    <Link to="/login" className="btn">Ready Portal</Link>
                    <Link to="/rb/event-staffing-packages" className="btn">Book an Event</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="homepage">
                {children}
            </div>

            {/* Add Chatbox */}
            <ChatBox />

            <div className="gold-divider"></div>

            {/* Footer */}
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
