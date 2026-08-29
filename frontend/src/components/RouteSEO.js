import React from "react";
import { useLocation } from "react-router-dom";
import PageSEO from "./PageSEO";

const SITE_URL = "https://readybartending.com";

const PUBLIC_ROUTES = {
  "/rb/home": {
    title: "Miami Mobile Bartending Services | Ready Bartending",
    description: "Hire professional mobile bartenders for weddings, parties, and corporate events across Miami and South Florida.",
  },
  "/rb/event-staffing-packages": {
    title: "Event Bartending Packages in Miami | Ready Bartending",
    description: "Compare professional bartender staffing and mobile bar packages for weddings, private parties, and corporate events in South Florida.",
  },
  "/rb/how-to-be-a-bartender": {
    title: "Bartending Classes in Miami | Ready Bartending",
    description: "Build practical bartending skills with hands-on cocktail, bar service, and responsible alcohol service training in Miami.",
  },
  "/rb/crafts-cocktails": {
    title: "Crafts & Cocktails Experiences in Miami | Ready Bartending",
    description: "Create custom bottle art while learning to mix cocktails in a guided Miami experience for celebrations, groups, and private events.",
  },
  "/rb/mix-n-sip": {
    title: "Mix N Sip Cocktail Classes in Miami | Ready Bartending",
    description: "Book an interactive in-person or virtual mixology experience and learn to make cocktails with Ready Bartending.",
  },
  "/rb/common-cocktails": {
    title: "Classic Cocktail Menu | Ready Bartending",
    description: "Browse popular classic cocktails for your Ready Bartending event and find drink ideas your guests will love.",
  },
  "/rb/signature-cocktails": {
    title: "Signature Cocktail Menu | Ready Bartending",
    description: "Explore Ready Bartending signature cocktails and choose memorable drinks for your wedding, party, or special event.",
  },
  "/rb/rentals-products": {
    title: "Event Bar Rentals in Miami | Ready Bartending",
    description: "Rent portable bars, coolers, bar tools, and event essentials for celebrations throughout Miami and South Florida.",
  },
  "/rb/rental-inquiry": {
    title: "Request Event Bar Rentals | Ready Bartending",
    description: "Request portable bars and bartending equipment for your upcoming Miami or South Florida event.",
  },
  "/rb/baby-showers": {
    title: "Baby Shower Bartending in Miami | Ready Bartending",
    description: "Make your baby shower special with polished bartending service, custom drinks, and alcohol-free options in South Florida.",
  },
  "/rb/weddings": {
    title: "Wedding Bartenders in Miami | Ready Bartending",
    description: "Book professional wedding bartenders and mobile bar service for celebrations across Miami and South Florida.",
  },
  "/rb/events": {
    title: "Miami Cocktail Classes & Events | Ready Bartending",
    description: "Discover upcoming Ready Bartending cocktail classes, themed experiences, and special events in Miami.",
  },
  "/rb/staff": {
    title: "Meet the Ready Bartending Team | Miami Bartenders",
    description: "Meet the trained bartenders and event professionals behind Ready Bartending's South Florida services.",
  },
  "/rb/apply": {
    title: "Join the Ready Bartending Team | Apply Online",
    description: "Apply to join Ready Bartending's team of hospitality and event professionals in South Florida.",
  },
  "/rb/privacy-policy": {
    title: "Privacy Policy | Ready Bartending",
    description: "Read how Ready Bartending collects, uses, and protects information submitted through its website and services.",
  },
  "/rb/connect": {
    title: "Connect with Ready Bartending | Miami, Florida",
    description: "Contact and follow Ready Bartending for mobile bar services, cocktail classes, rentals, and events in South Florida.",
  },
};

const businessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Ready Bartending",
  url: `${SITE_URL}/rb/home`,
  image: "https://res.cloudinary.com/dtuqponwy/image/upload/photo_qsegmu.jpg",
  areaServed: ["Miami", "South Florida"],
  description: "Mobile bartending, event staffing, cocktail classes, and bar rentals in Miami and South Florida.",
};

export default function RouteSEO() {
  const { pathname } = useLocation();
  const route = PUBLIC_ROUTES[pathname];
  const isEventDetail = /^\/rb\/events\/[^/]+$/.test(pathname);
  if (route) {
    return (
      <PageSEO
        fallbackTitle={route.title}
        fallbackDescription={route.description}
        fallbackUrl={`${SITE_URL}${pathname}`}
        structuredData={pathname === "/rb/home" ? businessSchema : undefined}
      />
    );
  }

  if (isEventDetail) {
    return (
      <PageSEO
        fallbackTitle="Ready Bartending Event | Miami"
        fallbackDescription="View event details, available sessions, and ticket options for this Ready Bartending experience."
        fallbackUrl={`${SITE_URL}${pathname}`}
      />
    );
  }

  return (
    <PageSEO
      seo={{ noindex: true }}
      fallbackTitle="Ready Bartending Portal"
      fallbackDescription="Secure Ready Bartending account and service portal."
      fallbackUrl={`${SITE_URL}${pathname}`}
    />
  );
}
