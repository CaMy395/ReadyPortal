import React, { useEffect, useMemo, useState } from 'react';
import { FaClipboardList, FaCocktail, FaGraduationCap, FaUsers, FaWineGlassAlt } from 'react-icons/fa';
import '../../App.css';

import MixNsipSection from './Forms/MixNsipSection';
import CraftsCocktailsSection from './Forms/CraftsCocktailsSection';
import BartendingClassSection from './Forms/BartendingClassSection';
import BartendingCourseSection from './Forms/BartendingCourseSection';
import IntakeSection from './Forms/IntakeSection';
import RentalInquirySection from './Forms/RentalInquirySection';

const TABS = [
  { key: 'intake-forms', label: 'General Intake', icon: FaClipboardList },
  { key: 'bartending-course', label: 'Bartending Course', icon: FaGraduationCap },
  { key: 'bartending-classes', label: 'Bartending Classes', icon: FaUsers },
  { key: 'craft-cocktails', label: 'Crafts & Cocktails', icon: FaWineGlassAlt },
  { key: 'mix-n-sip', label: "Mix N' Sip", icon: FaCocktail },
  { key: 'rental-inquiries', label: 'Rental Inquiries', icon: FaClipboardList },
];

const AdminIntakeForms = () => {
  const [allForms, setAllForms] = useState({});
  const [activeTab, setActiveTab] = useState('intake-forms');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewedForms, setReviewedForms] = useState(() => new Set());
  const [markingReviewed, setMarkingReviewed] = useState(false);

  useEffect(() => {
    const fetchForms = async () => {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      try {
        setLoading(true);
        const responses = await Promise.all([
          fetch(`${apiUrl}/api/intake-forms`),
          fetch(`${apiUrl}/api/craft-cocktails`),
          fetch(`${apiUrl}/api/mix-n-sip`),
          fetch(`${apiUrl}/api/bartending-course`),
          fetch(`${apiUrl}/api/bartending-classes`),
          fetch(`${apiUrl}/api/rental-inquiries`),
        ]);

        const [
          intakeData,
          cocktailsData,
          mixData,
          courseData,
          classesData,
          rentalInquiriesData,
        ] = await Promise.all(
          responses.map((res) => (res.ok ? res.json() : []))
        );

        setAllForms({
          'intake-forms': intakeData,
          'craft-cocktails': cocktailsData,
          'mix-n-sip': mixData,
          'bartending-course': courseData,
          'bartending-classes': classesData,
          'rental-inquiries': rentalInquiriesData,
        });

        const reviewedResponse = await fetch(`${apiUrl}/api/admin-form-reads`);
        const reviewedData = reviewedResponse.ok ? await reviewedResponse.json() : [];
        setReviewedForms(new Set(
          (Array.isArray(reviewedData) ? reviewedData : [])
            .map((row) => `${row.form_type}:${row.form_id}`)
        ));
      } catch (err) {
        console.error('Error fetching forms:', err);
        setError('Failed to load intake forms.');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const filteredAllForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allForms;

    const match = (form) => {
      const name = String(form.full_name || '').toLowerCase();
      const email = String(form.email || '').toLowerCase();
      const phone = String(form.phone || '').toLowerCase();
      const primaryItem = String(form.primary_item || '').toLowerCase();
      const message = String(form.message || '').toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        primaryItem.includes(q) ||
        message.includes(q)
      );
    };

    const next = {};
    for (const key of Object.keys(allForms || {})) {
      next[key] = (allForms[key] || []).filter(match);
    }
    return next;
  }, [allForms, search]);

  const counts = useMemo(() => {
    const getLen = (k) => (filteredAllForms?.[k] || []).length;
    return {
      'intake-forms': getLen('intake-forms'),
      'bartending-course': getLen('bartending-course'),
      'bartending-classes': getLen('bartending-classes'),
      'craft-cocktails': getLen('craft-cocktails'),
      'mix-n-sip': getLen('mix-n-sip'),
      'rental-inquiries': getLen('rental-inquiries'),
    };
  }, [filteredAllForms]);

  const totalCount = useMemo(
    () => Object.values(counts).reduce((sum, count) => sum + count, 0),
    [counts]
  );

  const activeTabInfo = TABS.find((tab) => tab.key === activeTab) || TABS[0];

  const newCounts = useMemo(() => {
    const next = {};
    TABS.forEach((tab) => {
      next[tab.key] = (allForms[tab.key] || []).filter(
        (form) => !reviewedForms.has(`${tab.key}:${form.id}`)
      ).length;
    });
    return next;
  }, [allForms, reviewedForms]);

  const totalNew = Object.values(newCounts).reduce((sum, count) => sum + count, 0);

  const markCurrentReviewed = async () => {
    const ids = (allForms[activeTab] || []).map((form) => Number(form.id)).filter(Boolean);
    if (!ids.length || !newCounts[activeTab]) return;

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    try {
      setMarkingReviewed(true);
      const response = await fetch(`${apiUrl}/api/admin-form-reads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType: activeTab, formIds: ids }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.details || result.error || `Could not mark forms reviewed (${response.status}).`);
      }
      setReviewedForms((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.add(`${activeTab}:${id}`));
        return next;
      });
    } catch (err) {
      setError(err.message || 'Could not mark forms reviewed.');
    } finally {
      setMarkingReviewed(false);
    }
  };

  return (
    <main className="admin-intake-forms-container intake-workspace">
      <header className="admin-intake-header intake-workspace-header">
        <div>
          <span className="intake-kicker">CLIENT OPERATIONS</span>
          <h1>Submitted intake forms</h1>
          <p>Review client requests, booking details, contacts, and payment status.</p>
        </div>

        <div className="admin-intake-controls">
          <input
            className="filter-input intake-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / email / phone / item / notes…"
          />
        </div>
      </header>

      <section className="intake-summary-grid">
        <article><span>ALL FORMS</span><strong>{totalCount}</strong><small>{search ? 'Matching your search' : 'Across every service'}</small></article>
        <article><span>CURRENT VIEW</span><strong>{counts[activeTab] || 0}</strong><small>{activeTabInfo.label}</small></article>
        <article className={totalNew ? 'has-new' : ''}><span>NEW FORMS</span><strong>{totalNew}</strong><small>{totalNew ? 'Waiting for review' : 'Everything reviewed'}</small></article>
      </section>

      {error && <p className="intake-notice error">{error}</p>}

      <nav className="admin-tabs" aria-label="Intake form categories">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
          <button
            key={t.key}
            type="button"
            className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            aria-pressed={activeTab === t.key}
          >
            <Icon />
            <span>{t.label}</span>
            <span className="tab-badge">{counts[t.key] ?? 0}</span>
            {!!newCounts[t.key] && <span className="new-form-badge">{newCounts[t.key]} new</span>}
          </button>
        );})}
      </nav>

      {!!newCounts[activeTab] && (
        <div className="intake-review-bar">
          <span><strong>{newCounts[activeTab]} new</strong> {activeTabInfo.label} form{newCounts[activeTab] === 1 ? '' : 's'} waiting for review.</span>
          <button type="button" onClick={markCurrentReviewed} disabled={markingReviewed}>
            {markingReviewed ? 'Saving…' : 'Mark current section reviewed'}
          </button>
        </div>
      )}

      <div className="admin-tab-panel">
        {loading && <div className="intake-loading">Loading submitted forms…</div>}
        {!loading && <>
        {activeTab === 'intake-forms' && (
          <IntakeSection intakeForms={filteredAllForms['intake-forms'] || []} />
        )}

        {activeTab === 'bartending-course' && (
          <BartendingCourseSection
            bartendingCourse={filteredAllForms['bartending-course'] || []}
          />
        )}

        {activeTab === 'bartending-classes' && (
          <BartendingClassSection
            bartendingClasses={filteredAllForms['bartending-classes'] || []}
          />
        )}

        {activeTab === 'craft-cocktails' && (
          <CraftsCocktailsSection
            craftCocktails={filteredAllForms['craft-cocktails'] || []}
          />
        )}

        {activeTab === 'mix-n-sip' && (
          <MixNsipSection mixNSip={filteredAllForms['mix-n-sip'] || []} />
        )}

        {activeTab === 'rental-inquiries' && (
          <RentalInquirySection
            rentalInquiries={filteredAllForms['rental-inquiries'] || []}
          />
        )}
        </>}
      </div>
    </main>
  );
};

export default AdminIntakeForms;
