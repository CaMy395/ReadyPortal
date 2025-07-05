import React from 'react';
import { Link } from 'react-router-dom';
import '../../../RB.css';

const BartendingCourses = () => {
  return (
    <div className="bartending-page">  {/* ✅ Wrapped everything in a parent div */}
      {/* Hero Section */}
      <div className="hero-content-BCC">
          <p>Become A Bartender</p>
          <h1 className="fancy-heading">Bartending Course and Training Classes.</h1>
          <br />
          <p>Our team of bartending experts provide top-quality classes that can give you the skills required to become a successful bartender!</p>
      </div>
      <div className="gold-divider"></div>
   
      {/* Learn to Bartend with us Section */}
        <section className="why-choose-us">
          <h2 className="fancy-heading">Learn to Bartend with Us!</h2>
          <br></br>
          <p>
              At Ready Bartending, we believe that bartending is more than just pouring drinks—it’s an art form.
              Our experienced instructors will guide you through the ins and outs of the trade, teaching you everything
              from cocktail recipes to customer service skills so you can earn your bartending license!
          </p>
          <p>
              With hands-on training and a focus on practical knowledge, our bartending classes provide the perfect foundation
              for a successful career in the industry. Already have experience and just need some classes for practice? No worries!
              We’re ready to teach all levels of bartending!
          </p>
          <br></br><br></br>
          <div className="class-schedule">
              <h3>Course Schedule</h3>
              <ul>
                  <li>Weekdays: 6:00pm - 9:00pm</li>
                  <li>Saturdays: 11:00am - 2:00pm</li>
              </ul>
          </div>
        </section>
        <div className="gold-divider"></div>

        {/* The Ready Bar Course Section */}
        <section className="why-choose-us">
                <div className="bar-course-text">
                <h2 className="fancy-heading">The Ready Bar Course (Non-Bartenders) </h2>
                <p>
                    Our flagship program, The Ready Bar Course, is a 24-hour comprehensive training that covers all aspects of bartending.
                    With 8 two-hour classes, you’ll gain in-depth knowledge of mixology, learn essential bartending techniques, and
                    understand the importance of providing top-notch customer service. This class is $400 and $450 if a payment plan is needed.
                </p>
                <p>
                    Each class is designed to be interactive, allowing you to practice and perfect your skills under the guidance of our expert instructors.
                    This option comes with all the training tools needed to help you succeed!
                </p>
                <p>    Disclaimer: Failure to pass the exam will result in a $50.00 re-test fee. This is ONLY to join our team.</p>

                <video className="bar-course-video" controls loop playsInline>
                  <source src="/ReadyCourseInstructions.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p style={{ color: "red" }}>Watch Before Booking!</p>
                <br></br>
                <Link to="/bartending-course" className="book-button">BOOK COURSE</Link>
                </div>
                
            
            </section>

        {/* The Ready Bar Class Section */}
        <section className="why-choose-us">
                <h2 className="fancy-heading">Ready Bar Classes (For New/Old Bartenders)</h2>
                <p>
                    Ready Classes are 2-hour classes that cover whatever you want it to!
                    With our 2-hour classes, you can gain in-depth knowledge of mixology, learn essential bartending techniques, and
                    understand the importance of providing top-notch customer service.
                    Each class is customized to your wants while still being interactive, allowing you to practice and perfect your skills under the guidance of our expert instructors. 
                  </p>
                  <p>    Disclaimer: This class does not use real alcohol as we will be making mocktails. See our <Link to="/rb/mix-n-sip" className="link-style">Mix N Sip</Link> class or our <Link to="/rb/craft-cocktails" className="link-style">Crafts & Cocktails</Link> class to learn how to make real cocktails.
                  </p>
                  <video className="bar-course-video" controls loop playsInline>
                    <source src="/ReadyClassInstructions.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <p style={{ color: "red" }}>Watch Before Booking!</p>

                <br></br>
                <Link to="/bartending-classes" className="book-button">BOOK CLASSES</Link>          
            </section>

            <div className="gold-divider"></div>

        {/* Whats Included? */}
            <section className="why-choose-us">
          <h3 className="fancy-heading">What's Included ?</h3>
          <p>
            When you enroll in The Ready Bar Course, you'll receive a complete Ready Bartending Bar Kit </p>
            <p>— the ultimate toolkit for any aspiring bartender — </p>
            <p>This kit includes essential tools such as:
          </p>
          <ul>
            <li>Shaker Tin</li>
            <li>Strainer</li>
            <li>Muddler</li>
            <li>2 Pour Spouts</li>
            <li>Wine Key</li>
            <li>Stir Spoon</li>
            <li>Jigger</li>
            <li>Kit Holder</li>
          </ul>
          <p>
            You will also recieve:
            </p>
          <ul>
            <li>Hands on experience</li>
            <li>A State Issued Bartending Certificate (License to Bartend)</li>
            <li>A Spot on our Team!</li>
          </ul>
            <p>We believe that hands-on practice is crucial to mastering the craft,</p>
            <p> and having your own bar kit will
            allow you to practice at home and refine your skills even further.
          </p>
        <img src="/BarToolsKit.jpg" alt="Cocktail Icon" className="bar-course-image" />
    </section>
    </div>
  );
};

export default BartendingCourses;
