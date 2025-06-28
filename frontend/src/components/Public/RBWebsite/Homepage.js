import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";
/*                    {showModal && (
                        <div style={{
                            position: 'fixed',
                            top: 0, left: 0,
                            width: '100%', height: '100%',
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            zIndex: 9999,
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            fontFamily: 'inherit'
                        }}>
                            <div style={{
                            background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
                            padding: '40px',
                            borderRadius: '20px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                            maxWidth: '420px',
                            width: '90%',
                            textAlign: 'center',
                            border: '2px solid gold'
                            }}>
                            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem', color: '#333' }}>🍸 Age Verification</h2>
                            <p style={{ marginBottom: '20px', fontSize: '1rem', color: '#555' }}>
                                You must be 21 or older to enter Ready Bartending.
                            </p>

                            <input
                                type="date"
                                value={birthdate}
                                onChange={(e) => setBirthdate(e.target.value)}
                                style={{
                                padding: '10px',
                                fontSize: '1rem',
                                width: '100%',
                                borderRadius: '8px',
                                border: '1px solid #ccc',
                                marginBottom: '20px'
                                }}
                            />

                            <button
                                onClick={handleVerify}
                                style={{
                                padding: '12px 24px',
                                backgroundColor: '#000',
                                color: '#FFD700',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'background 0.3s ease'
                                }}
                            >
                                Enter Site
                            </button>
                            </div>
                        </div>
                        )} */

const HomePage = () => {
    const [showModal, setShowModal] = useState(false);
    const [birthdate, setBirthdate] = useState('');

    useEffect(() => {
    const isVerified = localStorage.getItem('age_verified');
    if (!isVerified) {
        setShowModal(true);
    }
    }, []);

    const handleVerify = () => {
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    const d = today.getDate() - birthDateObj.getDate();

    const is21OrOlder = age > 21 || (age === 21 && (m > 0 || (m === 0 && d >= 0)));

    if (is21OrOlder) {
        localStorage.setItem('age_verified', 'true');
        setShowModal(false);
    } else {
        alert('🚫 You must be at least 21 years old to enter this site.');
    }
    };

    return (
        <div className="homepage">
            {/* Hero Section */}
            
            <div className="hero">
            <p>Event Bartenders in Miami</p>

                <h1 className="fancy-heading">Take Your Event to The Next Level</h1>
                <img 
                    src="/ReadyBartending_scriptFont.png" 
                    alt="Private Bartending Script" 
                    className="private-bartending-image" 
                />
                <br />
                <p>We offer professional, friendly, and fun bartending services in Miami and the surrounding areas.</p>
                <div className="buttons">
                <a href="tel:3059827850" className="btn-primary">Call/Text Us: (305) 982-7850</a>
                </div>

            </div>
            <div className="gold-divider"></div>
            {/* Certifiation/Why Us Section */}
            <section className="certification-section">
            <div class="fancy-heading"><h3>WHY CHOOSE US?</h3></div>
                <div className="certification-container">
                    <div className="certification-logos">
                        <img src="/TrainedExpert.png" alt="Trained Expert Bartending" className="cert-logo"/>
                        <img src="/BBB_Accredited.png" alt="BBB Accredited Business" className="cert-logo"/>
                        <img src="/LocallyOwned.png" alt="Locally Owned & Operated" className="cert-logo"/>
                    </div>
                    
                    <div className="certification-text">
                        <p>
                            Looking for an event bartender in Miami who can take your party to the next level? 
                            Look no further than <strong>Ready Bartending!</strong> We are a premier bartending 
                            service that offers professional bartenders, servers, and other event staffing services. 
                            With our attention to detail, friendly attitudes, and extensive knowledge of craft cocktails, we create unforgettable experiences or you and your guests. Additionally, we offer flexible staffing options, competitive pricing, and the convenience of our mobile bartending service.
                            Whether you're hosting a corporate event, public party, or private celebration, we have 
                            the expertise and experience to make your event a memorable success.
                        </p>
                    </div>
                </div>
                <img 
                    src="/5Stars.png" 
                    alt="5 stars" 
                    className="stars-icon" 
                />
            </section>
            <div className="gold-divider"></div>

            {/* Event Bartending Services Section */}
            <section className="event-services">
                <div className="event-services-container">
                    <div className="event-services-icon">
                        <img src="/CocktailIcon.png" alt="Cocktail Icon" className="services-icon" />
                    </div>
                    <h2 className="fancy-heading">Our Event Bartending Services</h2>
                    
                    <p className="event-services-description">
                        At Ready Bartending, we pride ourselves on providing top-notch event bartending services that are 
                        tailored to your specific needs. Our team of skilled and certified bartenders is well-versed in 
                        creating a wide range of cocktails and can cater to parties of any size. From intimate gatherings 
                        to large-scale events with hundreds of guests, our bartenders are equipped to handle it all. 
                        With our comprehensive bar packages, including basic and premium options, you can choose the 
                        one that best suits your requirements and budget.
                    </p>
                </div>
            </section>

            {/* Services Section */}
            <section className="services">
                <div className="service-cards">
                    {/* Event Staffing */}
                    <Link to="/rb/event-staffing-packages" className="card-link">
                        <div className="card">
                            <img 
                                src="/Event_Staffing.jpg" 
                                alt="Event Staffing" 
                                className="service-image" 
                            />
                            <h3>Event Staffing/Packages</h3>
                            <p>Professional bartenders and staff to make your event unforgettable.</p>
                        </div>
                    </Link>

                    {/* Bartending Classes */}
                    <Link to="/rb/how-to-be-a-bartender" className="card-link">
                        <div className="card">
                            <img 
                                src="/BartendingClass_AI.png" 
                                alt="Bartending Classes" 
                                className="service-image" 
                            />
                            <h3>Bartending Course/Classes</h3>
                            <p>Learn the art of mixology with our professional training courses.</p>
                        </div>
                    </Link>

                    {/* Crafts & Cocktails Classes */}
                    <Link to="/rb/crafts-cocktails" className="card-link">
                        <div className="card">
                            <img 
                                src="/Craft&Cocktails.jpg" 
                                alt="Bartending Classes" 
                                className="service-image" 
                            />
                            <h3>Crafts & Cocktails</h3>
                            <p>Get creative and design your own reusable bottle while learning to make your favorite cocktail.</p>
                        </div>
                    </Link>

                     {/* Mix N Sip Classes */}
                     <Link to="/rb/mix-n-sip" className="card-link">
                        <div className="card">
                            <img 
                                src="/MixNSip_home.jpg" 
                                alt="Mix N Sip" 
                                className="service-image" 
                            />
                            <h3>Mix N' Sip</h3>
                            <p>Learn how to make 3 classic  or signature Ready Cocktails and enjoy some entertainment in between cocktails!</p>
                        </div>
                    </Link>
                </div>
            </section>
            {/* Gold Divider Above */}
            <div className="gold-divider"></div>
                            
                            {/* Video Section */}
                <section className="video-section">
                    <div className="video-container">
                    {/* Left side: Title & Text */}
                    <div className="video-text">
                    <h2>Mobile Bartenders You Can Trust</h2>
                        <p>
                        As a trusted mobile bar business, we bring the bar to you! Our
                        mobile bartending service allows you to enjoy the convenience of
                        having professional bartenders at any location. Whether it's your
                        backyard, office space, or rented venue, our bartenders will arrive
                        15 minutes early, dressed in our signature Ready Bartending
                        uniform, and ready to serve. With our mobile bar setup, complete
                        with all essential bar tools and supplies, you can sit back, relax,
                        and let our team handle everything with professionalism and flair.
                        </p>
                    </div>

                    {/* Right side: Embedded YouTube Video */}
                    <div className="video-frame">
                        <iframe
                        width="560"
                        height="315"
                        src="https://www.youtube.com/embed//I07riGwQ2Jc"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        ></iframe>
                    </div>
                    </div>
                </section>
                <div className="gold-divider"></div>
                    {/* Testimonials Section */}
            <section>
                <h2 className="fancy-heading">What Our Clients Are Saying</h2>                    
                <div className="testimonial-cards">
                    <div className="testimonial">
                        <h3 className="testimonial-header">Extremely Professional</h3>
                        <p>Ready Bartending was extremely professional & I can’t wait to book her again! 
                            We had a corporate event with more people than we expected and they made everything work out perfect. 
                            Thank you so much!</p>
                        <p className="testimonial-name">~ <em>Chantell M</em></p>
                    </div>
                    <div className="testimonial">
                        <h3 className="testimonial-header">Absolutely AMAZING!</h3>
                        <p>Absolutely AMAZING! I would recommend anyone to use Ready Bartending for their events. 
                            I booked Ready Bartending for a holiday party and was blown away by their professionalism. 
                            From arriving early ready with a positive attitude to their mixology skills and ability 
                            to interact with the crowd, they exceeded expectations.</p>
                        <p className="testimonial-name">~ <em>Lauren K</em></p>
                    </div>
                    <div className="testimonial">
                        <h3 className="testimonial-header">I Love Working with Ready Bartending</h3>
                        <p>I love working with Ready Bartending, their booking process for events is a breeze & their customer service is amazing! 
                            I greatly appreciate the business we’ve done together & look forward to booking in the future!</p>
                        <p className="testimonial-name">~ <em>Wintana S</em></p>
                    </div>



                </div>
            </section>
      </div>
    );
};

export default HomePage;
