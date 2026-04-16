import React from "react";
import { Helmet } from "react-helmet-async";

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/dtuqponwy/image/upload/photo_qsegmu.jpg";

export default function PageSEO({
  seo = {},
  fallbackTitle = "Ready Bartending",
  fallbackDescription = "",
  fallbackUrl = "https://readybartending.com/",
  fallbackImage = DEFAULT_IMAGE,
}) {
  const title = seo?.seo_title || fallbackTitle;
  const description = seo?.seo_description || fallbackDescription;
  const keywords = seo?.seo_keywords || "";

  const ogTitle = seo?.og_title || title;
  const ogDescription = seo?.og_description || description;
  const ogImage = seo?.og_image_url || fallbackImage;
  const canonicalUrl = seo?.canonical_url || fallbackUrl;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}

      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="canonical" href={canonicalUrl} />

      {seo?.noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
    </Helmet>
  );
}