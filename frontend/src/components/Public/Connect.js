// RBWebsite/Connect.js
import React from "react";

const links = [
  {
    title: "🍸 Ready Bartending Site",
    url: "/rb/home",
    primary: true,
  },
  {
    title: "📋 Get a Quote",
    url: "/event-staffing-packages",
  },
  {
    title: "🥂 Mix N Sip (Cocktail Class)",
    url: "/mix-n-sip",
  },
  {
    title: "🎨 Crafts & Cocktails",
    url: "/crafts-cocktails",
  },
  {
    title: "🎓 Bartending Course",
    url: "/how-to-be-a-bartender",
  },
  {
    title: "📸 Instagram",
    url: "https://instagram.com/readybartending",
  },
  /*
    title: "⭐ Leave a Review",
    url: "/review",
  */,
  {
    title: "📞 Call Us",
    url: "tel:+13059827850",
  },
];

export default function RBConnectPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img
          src="/ReadyBarSign.png"
          alt="Ready Bartending"
          style={styles.logo}
        />

        <h1 style={styles.title}>Stay Ready. Book Ready.</h1>
        <p style={styles.subtitle}>
          Bartending Services • Cocktail Classes • Events
        </p>

        <div style={styles.links}>
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              style={{
                ...styles.link,
                ...(link.primary ? styles.primary : {}),
              }}
            >
              {link.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #000, #1a1a1a)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    textAlign: "center",
  },
  logo: {
    width: "100%",
    maxWidth: "320px",
    height: "auto",
    display: "block",
    margin: "0 auto 20px auto",
    objectFit: "contain",
    },
  title: {
    color: "#fff",
    marginBottom: "10px",
  },
  subtitle: {
    color: "#aaa",
    marginBottom: "30px",
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  link: {
    padding: "14px",
    borderRadius: "10px",
    background: "#222",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "bold",
  },
  primary: {
    background: "#C59D5F", // gold accent
    color: "#000",
  },
};