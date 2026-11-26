import React from "react";
import { Link, useLocation } from "react-router-dom";
import pages from "../../../data/publicDiscovery.json";
import "./DiscoveryDetails.css";

export default function DiscoveryDetails() {
  const { pathname } = useLocation();
  const page = pages[pathname.replace(/\/$/, "")];
  if (!page || (!page.cta && !page.faqs)) return null;
  return (
    <section className="rb-event-success-card rb-discovery-details" aria-label="Service information">
      <h2>{page.points ? "Plan your experience" : page.heading}</h2>
      {page.points ? (
        <ul className="rb-discovery-points">{page.points.map(point => <li key={point}>{point}</li>)}</ul>
      ) : <p>{page.description}</p>}
      {page.cta && (
        <Link className="rb-event-btn rb-discovery-cta" to={page.cta.startsWith("/") ? page.cta : "/rb/" + page.cta}>
          {page.ctaLabel}
        </Link>
      )}
      {page.faqs?.length > 0 && (
        <div className="rb-discovery-faqs">
          <h3>Frequently asked questions</h3>
          {page.faqs.map(([question, answer]) => (
            <details key={question}><summary>{question}</summary><p>{answer}</p></details>
          ))}
        </div>
      )}
      <h3>Related services</h3>
      <ul className="rb-discovery-links">{page.related.map(slug => {
        const url = "/rb/" + slug;
        return <li key={url}><Link to={url}>{pages[url].heading}</Link></li>;
      })}</ul>
    </section>
  );
}
