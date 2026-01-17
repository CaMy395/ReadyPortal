import React, { useEffect, useMemo, useState } from 'react';
import '../../App.css';

import MixNsipSection from './Forms/MixNsipSection';
import CraftsCocktailsSection from './Forms/CraftsCocktailsSection';
import BartendingClassSection from './Forms/BartendingClassSection';
import BartendingCourseSection from './Forms/BartendingCourseSection';
import IntakeSection from './Forms/IntakeSection';

const TABS = [
  { key: 'intake-forms', label: 'General Intake' },
  { key: 'bartending-course', label: 'Bartending Course' },
  { key: 'bartending-classes', label: 'Bartending Classes' },
  { key: 'craft-cocktails', label: 'Crafts & Cocktails' },
  { key: 'mix-n-sip', label: "Mix N' Sip" },
];

const AdminIntakeForms = () => {
  const [allForms, setAllForms] = useState({});
  const [activeTab, setActiveTab] = useState('intake-forms');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForms = async () => {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      try {
        const responses = await Promise.all([
          fetch(`${apiUrl}/api/intake-forms`),
          fetch(`${apiUrl}/api/craft-cocktails`),
          fetch(`${apiUrl}/api/mix-n-sip`),
          fetch(`${apiUrl}/api/bartending-course`),
          fetch(`${apiUrl}/api/bartending-classes`),
        ]);

        const [intakeData, cocktailsData, mixData, courseData, classesData] = await Promise.all(
          responses.map((res) => (res.ok ? res.json() : []))
        );

        setAllForms({
          'intake-forms': intakeData,
          'craft-cocktails': cocktailsData,
          'mix-n-sip': mixData,
          'bartending-course': courseData,
          'bartending-classes': classesData,
        });
      } catch (err) {
        console.error('Error fetching forms:', err);
        setError('Failed to load intake forms.');
      }
    };

    fetchForms();
  }, []);

  // Unified search across all form types (full_name/email/phone)
  const filteredAllForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allForms;

    const match = (form) => {
      const name = String(form.full_name || '').toLowerCase();
      const email = String(form.email || '').toLowerCase();
      const phone = String(form.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    };

    const next = {};
    for (const key of Object.keys(allForms || {})) {
      next[key] = (allForms[key] || []).filter(match);
    }
    return next;
  }, [allForms, search]);

  // Tab badges (counts)
  const counts = useMemo(() => {
    const getLen = (k) => (filteredAllForms?.[k] || []).length;
    return {
      'intake-forms': getLen('intake-forms'),
      'bartending-course': getLen('bartending-course'),
      'bartending-classes': getLen('bartending-classes'),
      'craft-cocktails': getLen('craft-cocktails'),
      'mix-n-sip': getLen('mix-n-sip'),
    };
  }, [filteredAllForms]);

  return (
    <div className="admin-intake-forms-container">
      <div className="admin-intake-header">
        <h1>Submitted Intake Forms</h1>

        <div className="admin-intake-controls">
          <input
            className="filter-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / email / phone…"
          />
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            <span className="tab-badge">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="admin-tab-panel">
        {activeTab === 'intake-forms' && (
          <IntakeSection intakeForms={filteredAllForms['intake-forms'] || []} />
        )}

        {activeTab === 'bartending-course' && (
          <BartendingCourseSection bartendingCourse={filteredAllForms['bartending-course'] || []} />
        )}

        {activeTab === 'bartending-classes' && (
          <BartendingClassSection
            bartendingClasses={filteredAllForms['bartending-classes'] || []}
          />
        )}

        {activeTab === 'craft-cocktails' && (
          <CraftsCocktailsSection craftCocktails={filteredAllForms['craft-cocktails'] || []} />
        )}

        {activeTab === 'mix-n-sip' && (
          <MixNsipSection mixNSip={filteredAllForms['mix-n-sip'] || []} />
        )}
      </div>
    </div>
  );
};

export default AdminIntakeForms;
