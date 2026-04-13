import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function useSitePageContent(pageKey) {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [seo, setSeo] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/site/pages/${pageKey}`);
        const data = await res.json();

        setSections(data.sections || []);
        setSeo(data.seo || {});
      } catch (err) {
        console.error("Failed to load site content:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [pageKey]);

  const sectionsByKey = useMemo(() => {
    const map = {};
    sections.forEach((s) => {
      map[s.section_key] = s;
    });
    return map;
  }, [sections]);

  return { loading, sectionsByKey, seo };
}