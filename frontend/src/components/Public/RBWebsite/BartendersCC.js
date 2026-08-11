import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

import { Helmet } from "react-helmet-async";
import useSitePageContent from "../../../hooks/useSitePageContent";

const BartendingCourses = () => {
  const { loading, seo } = useSitePageContent("bartending_course");

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {/* ✅ SEO */}
      <Helmet>
        <title>
          {seo?.seo_title ||
            "Bartending & Responsible Alcohol Service Courses in Miami | Ready Bartending"}
        </title>

        <meta
          name="description"
          content={seo?.seo_description || ""}
        />

        <meta
          name="keywords"
          content={seo?.seo_keywords || ""}
        />

        <meta
          property="og:title"
          content={seo?.og_title || ""}
        />

        <meta
          property="og:description"
          content={seo?.og_description || ""}
        />

        <meta
          property="og:image"
          content={seo?.og_image_url || ""}
        />

        <link
          rel="canonical"
          href={seo?.canonical_url || ""}
        />

        {seo?.noindex && (
          <meta
            name="robots"
            content="noindex,nofollow"
          />
        )}
      </Helmet>

      {/* ===================================================== */}
      {/* HERO SECTION */}
      {/* ===================================================== */}
      <div className="hero-content-BCC">
  <p>Professional Bar & Alcohol Service Training</p>

  <h1 className="fancy-heading">
    Bartending & Responsible Alcohol Service Courses in Miami
  </h1>

  <br />

  <p>
    Train with Ready Bartending through hands-on bartending education,
    responsible alcohol service training, manager training, and
    bartender refresher classes.
  </p>
</div>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* LEARN SECTION */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <h2 className="fancy-heading">
          Learn to Bartend with Us!
        </h2>

        <br />

        <p>
          At Ready Bartending, we believe that
          bartending is more than just pouring
          drinks—it’s an art form. Our experienced
          instructors will guide you through the ins
          and outs of the trade, teaching you
          everything from cocktail recipes and
          bartending techniques to responsible alcohol
          service and customer service skills.
        </p>

        <p>
          Whether you are looking for complete
          bartending training, responsible alcohol
          service education, manager training, or just
          a refresher class, Ready Bartending offers
          training options for different experience
          levels and industry needs.
        </p>

        <br />
        <br />

        <div className="class-schedule">
          <h3>Course Schedule</h3>

          <ul>
            <h3>2 Weeks</h3>

            <li>
              Weekdays (Mon-Thurs): 12:00pm - 3:00pm |
              6:00pm - 9:00pm
            </li>

            <h3>1 Month</h3>

            <li>
              Saturdays: 12:00pm - 6:30pm (30-min
              break)
            </li>
          </ul>
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* COMPLETE READY BAR COURSE */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <div className="bar-course-text">
          <h2 className="fancy-heading">
            The Ready Bar Course
          </h2>

          <h3>
            Complete Bartending Training & Certification
          </h3>

          <p>
            Our flagship program, The Ready Bar Course,
            is a 24-hour comprehensive bartending
            training program that covers the essential
            knowledge and practical skills needed to
            work behind the bar.
          </p>

          <p>
            With 8 three-hour classes, you’ll gain
            hands-on experience in mixology, free
            pouring, cocktail preparation, bartending
            techniques, wine and beer service,
            garnishing, customer service, and
            responsible alcohol service.
          </p>

          <p>
            The Responsible Alcohol Service curriculum
            is incorporated directly into the complete
            Ready Bar Course, giving students both
            practical bartending education and
            responsible alcohol service training.
          </p>

          <p>
            Each class is interactive, allowing you to
            practice and perfect your skills under the
            guidance of our instructors. Training tools
            are provided to help you develop confidence
            behind the bar.
          </p>

          <p>
            <strong>Course Length:</strong> 24 Hours
          </p>

          <p>
            <strong>Course Price:</strong> $500
          </p>

          <p>For course disclaimers see below.</p>

          <Link
            to="/bartending-course?course=READY-24"
            className="book-button"
          >
            BOOK COMPLETE COURSE
          </Link>
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* RESPONSIBLE ALCOHOL SERVICE */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <div className="bar-course-text">
          <h2 className="fancy-heading">
            Responsible Alcohol Service
          </h2>

          <h3>RAS Training</h3>

          <p>
            Our Responsible Alcohol Service course is
            designed for bartenders, servers, and
            hospitality professionals who need focused
            education on the safe and responsible
            service of alcoholic beverages.
          </p>

          <p>
            This course covers important responsible
            alcohol service topics including Florida
            alcohol laws and regulations, proper
            identification, recognizing signs of
            impairment, refusal of service, incident
            reporting, drug awareness, and responsible
            service procedures.
          </p>

          <p>
            Students complete the Responsible Alcohol
            Service curriculum and must pass the
            required written assessment with a minimum
            score of 80%.
          </p>

          <p>
            <strong>Course Length:</strong> 3 Hours
          </p>

          <p>
            <strong>Curriculum:</strong>{" "}
            FL-RAS-2026.1
          </p>

          <Link
            to="/bartending-course?course=RAS"
            className="book-button"
          >
            BOOK RAS COURSE
          </Link>
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* RESPONSIBLE VENDOR MANAGER TRAINING */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <div className="bar-course-text">
          <h2 className="fancy-heading">
            Responsible Vendor Manager Training
          </h2>

          <h3>Manager-Level Responsible Service Training</h3>

          <p>
            Our Responsible Vendor Manager Training
            course is designed for managers,
            supervisors, and hospitality leaders
            responsible for overseeing employees who
            sell or serve alcoholic beverages.
          </p>

          <p>
            Manager training expands on responsible
            alcohol service by focusing on management
            responsibilities, employee supervision,
            alcohol-service policies, underage service
            prevention, controlled-substance and drug
            procedures, incident documentation,
            employee training records, and manager
            response scenarios.
          </p>

          <p>
            Students must successfully complete the
            manager training curriculum and assessment
            with a minimum passing score of 80%.
          </p>

          <p>
            <strong>Course Length:</strong> 3 Hours
          </p>

          <p>
            <strong>Curriculum:</strong>{" "}
            FL-RVM-2026.1
          </p>

          <Link
            to="/bartending-course?course=RAS-MGR"
            className="book-button"
          >
            BOOK MANAGER COURSE
          </Link>
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* BARTENDER REFRESHER CLASS */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <h2 className="fancy-heading">
          Bartender Refresher Class
        </h2>

        <p>
          Already have bartending experience but want
          additional practice? Our Bartender Refresher
          Class is a 2-hour class that can focus on the
          bartending skills or topics you want to
          improve.
        </p>

        <p>
          With our 2-hour classes, you can gain
          additional knowledge on the topic of your
          choice. Each class is customized to your
          needs while remaining interactive, allowing
          you to practice and perfect your skills
          under the guidance of our instructors.
        </p>

        <p>
          Disclaimer: This class does not use real
          alcohol as we will be making mocktails. See
          our{" "}
          <Link
            to="/rb/mix-n-sip"
            className="link-style"
          >
            Mix N Sip
          </Link>{" "}
          class or our{" "}
          <Link
            to="/rb/craft-cocktails"
            className="link-style"
          >
            Crafts & Cocktails
          </Link>{" "}
          class to learn how to make real cocktails.
        </p>

        <video
          className="bar-course-video"
          controls
          loop
          playsInline
        >
          <source
            src="/ReadyClassInstructions.mp4"
            type="video/mp4"
          />
        </video>

        <p style={{ color: "red" }}>
          Watch Before Booking!
        </p>

        <br />

        <Link
          to="/bartending-classes"
          className="book-button"
        >
          BOOK REFRESHER CLASS
        </Link>
      </section>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* WHAT'S INCLUDED */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <h3 className="fancy-heading">
          What's Included?
        </h3>

        <p>
          When you enroll in The Ready Bar Course,
          you'll receive a complete Ready Bartending
          Bar Kit
        </p>

        <p>
          — the ultimate toolkit for any aspiring
          bartender —
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

        <p>You will also receive:</p>

        <ul>
          <li>Hands-on experience</li>
          <li>Certificate of Completion</li>
          <li>
            Opportunity to be considered for Ready
            Bartending staffing opportunities
          </li>
        </ul>
      </section>

      <div className="gold-divider"></div>

      {/* ===================================================== */}
      {/* DISCLAIMERS */}
      {/* ===================================================== */}
      <section className="why-choose-us">
        <h3 className="fancy-heading">
          Course Disclaimers
        </h3>

        <ul>
          <li>
            Students must meet the passing requirements
            established for their selected course.
          </li>

          <li>
            Retesting may require an additional exam
            fee.
          </li>

          <li>Only 2 reschedules allowed.</li>

          <li>No refunds after course start.</li>

          <li>Partial refunds within 2 weeks.</li>

          <li>Full refunds before 2 weeks.</li>
        </ul>
      </section>
    </div>
  );
};

export default BartendingCourses;