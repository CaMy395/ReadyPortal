import React, { useEffect, useState } from 'react';
import '../../App.css';
import MixNsipSection from './Forms/MixNsipSection';
import CraftsCocktailsSection from './Forms/CraftsCocktailsSection';
import BartendingClassSection from './Forms/BartendingClassSection';
import BartendingCourseSection from './Forms/BartendingCourseSection';
import IntakeSection from './Forms/IntakeSection';

const AdminIntakeForms = () => {
  const [allForms, setAllForms] = useState({});
  const [error] = useState('');

  useEffect(() => {
    const fetchForms = async () => {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      try {
        const responses = await Promise.all([
          fetch(`${apiUrl}/api/intake-forms`),
          fetch(`${apiUrl}/api/craft-cocktails`),
          fetch(`${apiUrl}/api/mix-n-sip`),
          fetch(`${apiUrl}/api/bartending-course`),
          fetch(`${apiUrl}/api/bartending-classes`)
        ]);

        const [intakeData, cocktailsData, mixData, courseData, classesData] = await Promise.all(
          responses.map(res => res.ok ? res.json() : [])
        );

        setAllForms({
          'intake-forms': intakeData,
          'craft-cocktails': cocktailsData,
          'mix-n-sip': mixData,
          'bartending-course': courseData,
          'bartending-classes': classesData,
        });

      } catch (error) {
        console.error('Error fetching forms:', error);
      }
    };

    fetchForms();
  }, []);

  return (
    <div className="admin-intake-forms-container">
      <h1>Submitted Intake Forms</h1>
      {error && <p className="error-message">{error}</p>}

      <IntakeSection intakeForms={allForms['intake-forms'] || []} />
      <br />
      <BartendingCourseSection bartendingCourse={allForms['bartending-course'] || []} />
      <br />
      <BartendingClassSection bartendingClasses={allForms['bartending-classes'] || []} />
      <br />
      <CraftsCocktailsSection craftCocktails={allForms['craft-cocktails'] || []} />
      <br />
      <MixNsipSection mixNSip={allForms['mix-n-sip'] || []} />
    </div>
  );
};

export default AdminIntakeForms;
