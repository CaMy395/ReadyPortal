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
  type = "website",
  structuredData,
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
      <meta property="og:image:alt" content={ogTitle} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Ready Bartending" />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogTitle} />

      <link rel="canonical" href={canonicalUrl} />

      <meta
        name="robots"
        content={seo?.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"}
      />
      {structuredData ? (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      ) : null}
    </Helmet>
  );
}
