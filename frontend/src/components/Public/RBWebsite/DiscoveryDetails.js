import React from "react";
import { Link, useLocation } from "react-router-dom";
import pages from "../../../data/publicDiscovery.json";
import "./DiscoveryDetails.css";

export default function DiscoveryDetails() {
  const { pathname } = useLocation();
  const page = pages[pathname.replace(/\/$/, "")];
  if (!page || (!page.cta && !page.faqs)) return null;
  return (
    <section className="rb-discovery-details" aria-label="Service information">
      <h2>{page.heading}</h2>
      <p>{page.description}</p>
      {page.cta && <Link className="btn" to={page.cta.startsWith("/") ? page.cta : "/rb/" + page.cta}>{page.ctaLabel}</Link>}
      {page.faqs?.map(([question, answer]) => (
        <details key={question}><summary>{question}</summary><p>{answer}</p></details>
      ))}
      <h3>Related services</h3>
      <ul>{page.related.map(slug => {
        const url = "/rb/" + slug;
        return <li key={url}><Link to={url}>{pages[url].heading}</Link></li>;
      })}</ul>
    </section>
  );
}
