import React, { useEffect, useMemo, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

async function handleJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function fetchAdminSitePages(userId) {
  const res = await fetch(`${API_URL}/api/site/admin/pages?userId=${userId}`, {
    credentials: "include",
  });
  return handleJson(res);
}

async function fetchSitePage(pageKey) {
  const res = await fetch(`${API_URL}/api/site/pages/${pageKey}`, {
    credentials: "include",
  });
  return handleJson(res);
}

async function fetchSiteGlobals() {
  const res = await fetch(`${API_URL}/api/site/globals`, {
    credentials: "include",
  });
  return handleJson(res);
}

async function updateSiteSection(pageKey, sectionKey, payload, userId) {
  const res = await fetch(
    `${API_URL}/api/site/admin/pages/${pageKey}/sections/${sectionKey}?userId=${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleJson(res);
}

async function updateSiteSEO(pageKey, payload, userId) {
  const res = await fetch(
    `${API_URL}/api/site/admin/pages/${pageKey}/seo?userId=${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleJson(res);
}

async function updateSiteGlobal(globalKey, payload, userId) {
  const res = await fetch(
    `${API_URL}/api/site/admin/globals/${globalKey}?userId=${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleJson(res);
}

function createEmptyCatalogItem(categoryLabel = "") {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    category: categoryLabel || "",
    price: "",
    image_url: "",
    images: [],
    image_alt: "",
    description: "",
    is_active: true,
    sort_order: 0,
    button_text: "Inquire Now",
    button_link: "",
    badge: "",
  };
}

function safeParseArrayJson(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeCatalogItems(items) {
  return safeParseArrayJson(items).map((item, index) => ({
    id:
      item?.id ||
      `item_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    name: item?.name || "",
    category: item?.category || "",
    price: item?.price || "",
    image_url: item?.image_url || "",
    images: Array.isArray(item?.images) ? item.images.filter(Boolean) : [],
    image_alt: item?.image_alt || "",
    description: item?.description || "",
    is_active:
      typeof item?.is_active === "boolean" ? item.is_active : true,
    sort_order:
      typeof item?.sort_order === "number"
        ? item.sort_order
        : Number(item?.sort_order) || index,
    button_text: item?.button_text || "",
    button_link: item?.button_link || "",
    badge: item?.badge || "",
  }));
}

function CatalogItemEditor({
  item,
  index,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  typeLabel,
}) 
{
  const imagesText = Array.isArray(item.images) ? item.images.join("\n") : "";

  return (
    <div style={styles.catalogItemCard}>
      <div style={styles.catalogItemTop}>
        <div>
          <h4 style={styles.catalogItemTitle}>
            {item.name?.trim() || `${typeLabel} ${index + 1}`}
          </h4>
          <div style={styles.smallText}>id: {item.id}</div>
        </div>

        <div style={styles.rowActions}>
          <button type="button" style={styles.smallBtn} onClick={onMoveUp}>
            ↑
          </button>
          <button type="button" style={styles.smallBtn} onClick={onMoveDown}>
            ↓
          </button>
          <button
            type="button"
            style={styles.deleteBtn}
            onClick={onDelete}
          >
            Remove
          </button>
        </div>
      </div>

      <div style={styles.twoColGrid}>
        <div>
          <label style={styles.label}>Name</label>
          <input
            style={styles.input}
            value={item.name}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
          />
        </div>

        <div>
          <label style={styles.label}>Category</label>
          <input
            style={styles.input}
            value={item.category}
            onChange={(e) => onChange({ ...item, category: e.target.value })}
          />
        </div>

        <div>
          <label style={styles.label}>Price</label>
          <input
            style={styles.input}
            value={item.price}
            onChange={(e) => onChange({ ...item, price: e.target.value })}
            placeholder="$350"
          />
        </div>

        <div>
          <label style={styles.label}>Badge (optional)</label>
          <input
            style={styles.input}
            value={item.badge}
            onChange={(e) => onChange({ ...item, badge: e.target.value })}
            placeholder="Popular / New / Best Seller"
          />
        </div>

        <div>
          <label style={styles.label}>Image URL</label>
          <input
            style={styles.input}
            value={item.image_url}
            onChange={(e) => onChange({ ...item, image_url: e.target.value })}
          />
        </div>

<div>
  <label style={styles.label}>Gallery Images (one URL per line)</label>
  <textarea
    style={styles.textarea}
    rows={5}
    value={imagesText}
    onChange={(e) =>
      onChange({
        ...item,
        images: e.target.value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      })
    }
    placeholder={
      "https://...\nhttps://...\nhttps://..."
    }
  />
</div>
        <div>
          <label style={styles.label}>Image Alt</label>
          <input
            style={styles.input}
            value={item.image_alt}
            onChange={(e) => onChange({ ...item, image_alt: e.target.value })}
          />
        </div>

        <div>
          <label style={styles.label}>Button Text</label>
          <input
            style={styles.input}
            value={item.button_text}
            onChange={(e) => onChange({ ...item, button_text: e.target.value })}
          />
        </div>

        <div>
          <label style={styles.label}>Button Link</label>
          <input
            style={styles.input}
            value={item.button_link}
            onChange={(e) => onChange({ ...item, button_link: e.target.value })}
          />
        </div>

        <div>
          <label style={styles.label}>Sort Order</label>
          <input
            style={styles.input}
            type="number"
            value={item.sort_order}
            onChange={(e) =>
              onChange({
                ...item,
                sort_order: Number(e.target.value) || 0,
              })
            }
          />
        </div>

        <div>
          <label style={styles.label}>Visible</label>
          <select
            style={styles.input}
            value={String(item.is_active)}
            onChange={(e) =>
              onChange({ ...item, is_active: e.target.value === "true" })
            }
          >
            <option value="true">Active / Show on site</option>
            <option value="false">Inactive / Hide from site</option>
          </select>
        </div>
      </div>

      <label style={styles.label}>Description</label>
      <textarea
        style={styles.textarea}
        rows={4}
        value={item.description}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
      />
    </div>
  );
}

function CatalogSectionCard({ pageKey, section, userId, onSaved }) {
  const typeLabel =
    section.section_key === "rentals_items" ? "Rental" : "Product";

  const defaultCategory =
    section.section_key === "rentals_items" ? "Rentals" : "Products";

  const [meta, setMeta] = useState({
    section_label: section.section_label || "",
    title: section.title || "",
    subtitle: section.subtitle || "",
    body: section.body || "",
    is_visible: !!section.is_visible,
    sort_order: section.sort_order ?? 0,
  });

  const [items, setItems] = useState(
    normalizeCatalogItems(section.content_json)
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMeta({
      section_label: section.section_label || "",
      title: section.title || "",
      subtitle: section.subtitle || "",
      body: section.body || "",
      is_visible: !!section.is_visible,
      sort_order: section.sort_order ?? 0,
    });
    setItems(normalizeCatalogItems(section.content_json));
  }, [section]);

  function updateItem(index, updatedItem) {
    const copy = [...items];
    copy[index] = updatedItem;
    setItems(copy);
  }

  function addItem() {
    const nextSort =
      items.length > 0
        ? Math.max(...items.map((x) => Number(x.sort_order) || 0)) + 1
        : 0;

    setItems([
      ...items,
      {
        ...createEmptyCatalogItem(defaultCategory),
        sort_order: nextSort,
        button_text:
          section.section_key === "rentals_items" ? "Inquire Now" : "Order Now",
      },
    ]);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  function moveItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reOrdered = copy.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));

    setItems(reOrdered);
  }

  async function saveSection() {
    try {
      setSaving(true);
      setMsg("");

      const cleanedItems = items.map((item, idx) => ({
        ...item,
        sort_order:
          typeof item.sort_order === "number"
            ? item.sort_order
            : Number(item.sort_order) || idx,
      }));

      await updateSiteSection(
        pageKey,
        section.section_key,
        {
          section_label: meta.section_label,
          title: meta.title,
          subtitle: meta.subtitle,
          body: meta.body,
          sort_order: Number(meta.sort_order) || 0,
          is_visible: !!meta.is_visible,
          content_json: cleanedItems,
        },
        userId
      );

      setMsg(`${typeLabel}s saved.`);
      onSaved();
    } catch (err) {
      setMsg(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.catalogWrap}>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          {section.section_label || section.section_key}
        </h3>
        <div style={styles.smallText}>section_key: {section.section_key}</div>

        <div style={styles.twoColGrid}>
          <div>
            <label style={styles.label}>Section Label</label>
            <input
              style={styles.input}
              value={meta.section_label}
              onChange={(e) =>
                setMeta({ ...meta, section_label: e.target.value })
              }
            />
          </div>

          <div>
            <label style={styles.label}>Sort Order</label>
            <input
              style={styles.input}
              type="number"
              value={meta.sort_order}
              onChange={(e) =>
                setMeta({ ...meta, sort_order: e.target.value })
              }
            />
          </div>

          <div>
            <label style={styles.label}>Title</label>
            <input
              style={styles.input}
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </div>

          <div>
            <label style={styles.label}>Subtitle</label>
            <input
              style={styles.input}
              value={meta.subtitle}
              onChange={(e) => setMeta({ ...meta, subtitle: e.target.value })}
            />
          </div>
        </div>

        <label style={styles.label}>Body</label>
        <textarea
          style={styles.textarea}
          rows={4}
          value={meta.body}
          onChange={(e) => setMeta({ ...meta, body: e.target.value })}
        />

        <label style={styles.label}>Visible</label>
        <select
          style={styles.input}
          value={String(meta.is_visible)}
          onChange={(e) =>
            setMeta({ ...meta, is_visible: e.target.value === "true" })
          }
        >
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
      </div>

      <div style={styles.catalogToolbar}>
        <h3 style={styles.catalogHeading}>{typeLabel} Items</h3>
        <button type="button" style={styles.saveBtn} onClick={addItem}>
          + Add {typeLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div style={styles.emptyState}>
          No {typeLabel.toLowerCase()}s yet. Click “Add {typeLabel}”.
        </div>
      ) : null}

      <div style={styles.catalogList}>
        {items.map((item, index) => (
          <CatalogItemEditor
            key={item.id}
            item={item}
            index={index}
            typeLabel={typeLabel}
            onChange={(updated) => updateItem(index, updated)}
            onDelete={() => removeItem(index)}
            onMoveUp={() => moveItem(index, -1)}
            onMoveDown={() => moveItem(index, 1)}
          />
        ))}
      </div>

      <div style={styles.card}>
        <button
          style={styles.saveBtn}
          onClick={saveSection}
          disabled={saving}
        >
          {saving ? "Saving..." : `Save ${typeLabel}s Section`}
        </button>

        {msg ? <div style={styles.message}>{msg}</div> : null}
      </div>
    </div>
  );
}

function BasicSectionCard({ pageKey, section, userId, onSaved }) {
  const [form, setForm] = useState({
    section_label: section.section_label || "",
    title: section.title || "",
    subtitle: section.subtitle || "",
    body: section.body || "",
    image_url: section.image_url || "",
    image_alt: section.image_alt || "",
    button_text: section.button_text || "",
    button_link: section.button_link || "",
    secondary_button_text: section.secondary_button_text || "",
    secondary_button_link: section.secondary_button_link || "",
    content_json: section.content_json
      ? JSON.stringify(section.content_json, null, 2)
      : "",
    sort_order: section.sort_order ?? 0,
    is_visible: !!section.is_visible,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setForm({
      section_label: section.section_label || "",
      title: section.title || "",
      subtitle: section.subtitle || "",
      body: section.body || "",
      image_url: section.image_url || "",
      image_alt: section.image_alt || "",
      button_text: section.button_text || "",
      button_link: section.button_link || "",
      secondary_button_text: section.secondary_button_text || "",
      secondary_button_link: section.secondary_button_link || "",
      content_json: section.content_json
        ? JSON.stringify(section.content_json, null, 2)
        : "",
      sort_order: section.sort_order ?? 0,
      is_visible: !!section.is_visible,
    });
  }, [section]);

  async function saveSection() {
    try {
      setSaving(true);
      setMsg("");

      let parsedJson = null;
      if (form.content_json.trim()) {
        parsedJson = JSON.parse(form.content_json);
      }

      await updateSiteSection(
        pageKey,
        section.section_key,
        {
          ...form,
          sort_order: Number(form.sort_order) || 0,
          content_json: parsedJson,
        },
        userId
      );

      setMsg("Saved.");
      onSaved();
    } catch (err) {
      setMsg(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>
        {section.section_label || section.section_key}
      </h3>
      <div style={styles.smallText}>section_key: {section.section_key}</div>

      <label style={styles.label}>Section Label</label>
      <input
        style={styles.input}
        value={form.section_label}
        onChange={(e) => setForm({ ...form, section_label: e.target.value })}
      />

      <label style={styles.label}>Title</label>
      <input
        style={styles.input}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <label style={styles.label}>Subtitle</label>
      <input
        style={styles.input}
        value={form.subtitle}
        onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
      />

      <label style={styles.label}>Body</label>
      <textarea
        style={styles.textarea}
        rows={5}
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
      />

      <label style={styles.label}>Image URL</label>
      <input
        style={styles.input}
        value={form.image_url}
        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
      />

      <label style={styles.label}>Image Alt</label>
      <input
        style={styles.input}
        value={form.image_alt}
        onChange={(e) => setForm({ ...form, image_alt: e.target.value })}
      />

      <label style={styles.label}>Primary Button Text</label>
      <input
        style={styles.input}
        value={form.button_text}
        onChange={(e) => setForm({ ...form, button_text: e.target.value })}
      />

      <label style={styles.label}>Primary Button Link</label>
      <input
        style={styles.input}
        value={form.button_link}
        onChange={(e) => setForm({ ...form, button_link: e.target.value })}
      />

      <label style={styles.label}>Secondary Button Text</label>
      <input
        style={styles.input}
        value={form.secondary_button_text}
        onChange={(e) =>
          setForm({ ...form, secondary_button_text: e.target.value })
        }
      />

      <label style={styles.label}>Secondary Button Link</label>
      <input
        style={styles.input}
        value={form.secondary_button_link}
        onChange={(e) =>
          setForm({ ...form, secondary_button_link: e.target.value })
        }
      />

      <label style={styles.label}>Sort Order</label>
      <input
        style={styles.input}
        type="number"
        value={form.sort_order}
        onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
      />

      <label style={styles.label}>Visible</label>
      <select
        style={styles.input}
        value={String(form.is_visible)}
        onChange={(e) =>
          setForm({ ...form, is_visible: e.target.value === "true" })
        }
      >
        <option value="true">Visible</option>
        <option value="false">Hidden</option>
      </select>

      <label style={styles.label}>content_json (optional)</label>
      <textarea
        style={styles.textarea}
        rows={8}
        value={form.content_json}
        onChange={(e) => setForm({ ...form, content_json: e.target.value })}
        placeholder='[{"question":"What is included?","answer":"..."}]'
      />

      <button style={styles.saveBtn} onClick={saveSection} disabled={saving}>
        {saving ? "Saving..." : "Save Section"}
      </button>

      {msg ? <div style={styles.message}>{msg}</div> : null}
    </div>
  );
}

function SectionCard({ pageKey, section, userId, onSaved }) {
  if (
    section.section_key === "rentals_items" ||
    section.section_key === "products_items"
  ) {
    return (
      <CatalogSectionCard
        pageKey={pageKey}
        section={section}
        userId={userId}
        onSaved={onSaved}
      />
    );
  }

  return (
    <BasicSectionCard
      pageKey={pageKey}
      section={section}
      userId={userId}
      onSaved={onSaved}
    />
  );
}

function SEOCard({ seo, pageKey, userId, onSaved }) {
  const [form, setForm] = useState({
    seo_title: seo?.seo_title || "",
    seo_description: seo?.seo_description || "",
    seo_keywords: seo?.seo_keywords || "",
    og_title: seo?.og_title || "",
    og_description: seo?.og_description || "",
    og_image_url: seo?.og_image_url || "",
    canonical_url: seo?.canonical_url || "",
    noindex: !!seo?.noindex,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setForm({
      seo_title: seo?.seo_title || "",
      seo_description: seo?.seo_description || "",
      seo_keywords: seo?.seo_keywords || "",
      og_title: seo?.og_title || "",
      og_description: seo?.og_description || "",
      og_image_url: seo?.og_image_url || "",
      canonical_url: seo?.canonical_url || "",
      noindex: !!seo?.noindex,
    });
  }, [seo]);

  async function saveSEO() {
    try {
      setSaving(true);
      setMsg("");
      await updateSiteSEO(pageKey, form, userId);
      setMsg("SEO saved.");
      onSaved();
    } catch (err) {
      setMsg(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>SEO</h3>

      <label style={styles.label}>SEO Title</label>
      <input
        style={styles.input}
        value={form.seo_title}
        onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
      />

      <label style={styles.label}>SEO Description</label>
      <textarea
        style={styles.textarea}
        rows={4}
        value={form.seo_description}
        onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
      />

      <label style={styles.label}>SEO Keywords</label>
      <input
        style={styles.input}
        value={form.seo_keywords}
        onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })}
      />

      <label style={styles.label}>OG Title</label>
      <input
        style={styles.input}
        value={form.og_title}
        onChange={(e) => setForm({ ...form, og_title: e.target.value })}
      />

      <label style={styles.label}>OG Description</label>
      <textarea
        style={styles.textarea}
        rows={4}
        value={form.og_description}
        onChange={(e) => setForm({ ...form, og_description: e.target.value })}
      />

      <label style={styles.label}>OG Image URL</label>
      <input
        style={styles.input}
        value={form.og_image_url}
        onChange={(e) => setForm({ ...form, og_image_url: e.target.value })}
      />

      <label style={styles.label}>Canonical URL</label>
      <input
        style={styles.input}
        value={form.canonical_url}
        onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
      />

      <label style={styles.label}>Noindex</label>
      <select
        style={styles.input}
        value={String(form.noindex)}
        onChange={(e) => setForm({ ...form, noindex: e.target.value === "true" })}
      >
        <option value="false">Index this page</option>
        <option value="true">Do not index</option>
      </select>

      <button style={styles.saveBtn} onClick={saveSEO} disabled={saving}>
        {saving ? "Saving..." : "Save SEO"}
      </button>

      {msg ? <div style={styles.message}>{msg}</div> : null}
    </div>
  );
}

function GlobalsTab({ globalsData, userId, onSaved }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setItems(
      (globalsData || []).map((item) => ({
        ...item,
        value_json_text: item.value_json
          ? JSON.stringify(item.value_json, null, 2)
          : "",
      }))
    );
  }, [globalsData]);

  async function saveItem(item) {
    try {
      setMsg("");

      let parsedJson = null;
      if (item.value_json_text?.trim()) {
        parsedJson = JSON.parse(item.value_json_text);
      }

      await updateSiteGlobal(
        item.global_key,
        {
          label: item.label,
          value_text: item.value_text,
          value_json: parsedJson,
        },
        userId
      );

      setMsg(`Saved ${item.global_key}.`);
      onSaved();
    } catch (err) {
      setMsg(err.message || `Failed to save ${item.global_key}.`);
    }
  }

  return (
    <div style={styles.grid}>
      {items.map((item, index) => (
        <div style={styles.card} key={item.global_key}>
          <h3 style={styles.cardTitle}>{item.label || item.global_key}</h3>
          <div style={styles.smallText}>global_key: {item.global_key}</div>

          <label style={styles.label}>Label</label>
          <input
            style={styles.input}
            value={item.label || ""}
            onChange={(e) => {
              const copy = [...items];
              copy[index].label = e.target.value;
              setItems(copy);
            }}
          />

          <label style={styles.label}>Text Value</label>
          <textarea
            style={styles.textarea}
            rows={3}
            value={item.value_text || ""}
            onChange={(e) => {
              const copy = [...items];
              copy[index].value_text = e.target.value;
              setItems(copy);
            }}
          />

          <label style={styles.label}>JSON Value (optional)</label>
          <textarea
            style={styles.textarea}
            rows={6}
            value={item.value_json_text || ""}
            onChange={(e) => {
              const copy = [...items];
              copy[index].value_json_text = e.target.value;
              setItems(copy);
            }}
          />

          <button style={styles.saveBtn} onClick={() => saveItem(item)}>
            Save Global
          </button>
        </div>
      ))}

      {msg ? <div style={styles.message}>{msg}</div> : null}
    </div>
  );
}

export default function AdminSiteContentPage() {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
  const fallbackUserId = localStorage.getItem("userId");
  const userId = loggedInUser?.id || fallbackUserId;

  const [pages, setPages] = useState([]);
  const [selectedPageKey, setSelectedPageKey] = useState("");
  const [pageData, setPageData] = useState(null);
  const [globalsData, setGlobalsData] = useState([]);
  const [tab, setTab] = useState("sections");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBase() {
    try {
      setLoading(true);
      setError("");

      const [pagesRes, globalsRes] = await Promise.all([
        fetchAdminSitePages(userId),
        fetchSiteGlobals(),
      ]);

      setPages(pagesRes || []);
      setGlobalsData(globalsRes || []);

      if (!selectedPageKey && pagesRes?.length) {
        setSelectedPageKey(pagesRes[0].page_key);
      }
    } catch (err) {
      setError(err.message || "Failed to load site editor.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPage(pageKey) {
    if (!pageKey) return;
    try {
      const data = await fetchSitePage(pageKey);
      setPageData(data);
    } catch (err) {
      setError(err.message || "Failed to load page data.");
    }
  }

  useEffect(() => {
    if (userId) loadBase();
    else {
      setLoading(false);
      setError("Missing logged in admin user.");
    }
  }, [userId]);

  useEffect(() => {
    if (selectedPageKey) loadPage(selectedPageKey);
  }, [selectedPageKey]);

  const sortedSections = useMemo(() => {
    return [...(pageData?.sections || [])].sort((a, b) => {
      const aSpecial =
        a.section_key === "rentals_items" || a.section_key === "products_items";
      const bSpecial =
        b.section_key === "rentals_items" || b.section_key === "products_items";

      if (aSpecial && !bSpecial) return 1;
      if (!aSpecial && bSpecial) return -1;

      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [pageData]);

  if (loading) {
    return <div style={styles.wrap}>Loading site editor...</div>;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topbar}>
        <h1 style={styles.title}>Site Content Manager</h1>

        <select
          style={styles.select}
          value={selectedPageKey}
          onChange={(e) => setSelectedPageKey(e.target.value)}
        >
          {pages.map((page) => (
            <option key={page.page_key} value={page.page_key}>
              {page.page_name}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.tabs}>
        <button
          style={tab === "sections" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setTab("sections")}
        >
          Sections
        </button>

        <button
          style={tab === "seo" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setTab("seo")}
        >
          SEO
        </button>

        <button
          style={tab === "globals" ? styles.activeTabBtn : styles.tabBtn}
          onClick={() => setTab("globals")}
        >
          Globals
        </button>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      {tab === "sections" && pageData ? (
        <div style={styles.grid}>
          {sortedSections.map((section) => (
            <SectionCard
              key={section.section_key}
              pageKey={selectedPageKey}
              section={section}
              userId={userId}
              onSaved={() => loadPage(selectedPageKey)}
            />
          ))}
        </div>
      ) : null}

      {tab === "seo" && pageData ? (
        <SEOCard
          seo={pageData.seo}
          pageKey={selectedPageKey}
          userId={userId}
          onSaved={() => loadPage(selectedPageKey)}
        />
      ) : null}

      {tab === "globals" ? (
        <GlobalsTab
          globalsData={globalsData}
          userId={userId}
          onSaved={loadBase}
        />
      ) : null}
    </div>
  );
}

const styles = {
  wrap: {
    padding: "24px",
    color: "#fff",
    background: "#111",
    minHeight: "100vh",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
  },
  select: {
    minWidth: "220px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#1a1a1a",
    color: "#fff",
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  tabBtn: {
    background: "#222",
    color: "#fff",
    border: "1px solid #555",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
  },
  activeTabBtn: {
    background: "#8b0000",
    color: "#fff",
    border: "1px solid #8b0000",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "18px",
  },
  catalogWrap: {
    gridColumn: "1 / -1",
    display: "grid",
    gap: "16px",
  },
  catalogToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  catalogHeading: {
    margin: 0,
  },
  catalogList: {
    display: "grid",
    gap: "14px",
  },
  catalogItemCard: {
    background: "#151515",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "16px",
  },
  catalogItemTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  catalogItemTitle: {
    margin: 0,
  },
  rowActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  smallBtn: {
    background: "#222",
    color: "#fff",
    border: "1px solid #555",
    padding: "8px 10px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#3a1111",
    color: "#fff",
    border: "1px solid #7d2323",
    padding: "8px 10px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  emptyState: {
    background: "#171717",
    border: "1px dashed #444",
    borderRadius: "14px",
    padding: "18px",
    color: "#bbb",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "6px",
  },
  smallText: {
    color: "#bbb",
    fontSize: "13px",
    marginBottom: "14px",
  },
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#111",
    color: "#fff",
    marginBottom: "14px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#111",
    color: "#fff",
    marginBottom: "14px",
    boxSizing: "border-box",
    resize: "vertical",
  },
  saveBtn: {
    background: "#8b0000",
    color: "#fff",
    border: "none",
    padding: "11px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  message: {
    marginTop: "12px",
    color: "#f0d27a",
  },
  error: {
    background: "#3a1111",
    border: "1px solid #7d2323",
    color: "#fff",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
};