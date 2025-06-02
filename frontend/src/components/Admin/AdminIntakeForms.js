import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import predefinedItems from '../../data/predefinedItems.json';
import '../../App.css';

const AdminIntakeForms = () => {
    const [intakeForms, setIntakeForms] = useState([]);
    const [craftCocktails, setCraftCocktails] = useState([]);
    const [bartendingCourse, setBartendingCourse] = useState([]);
    const [bartendingClasses, setBartendingClasses] = useState([]);
    const [mixNSip, setMixNSip] = useState([]);
    const [intakeCount, setIntakeCount] = useState(0);
    const [craftCocktailsCount, setCraftCocktailsCount] = useState(0);
    const [bartendingCourseCount, setBartendingCourseCount] = useState(0);
    const [bartendingClassesCount, setBartendingClassesCount] = useState(0);
    const [mixNSipCount, setMixNSipCount] = useState(0);
    const [editingGig, setEditingGig] = useState(null);
    const [showGigEditor, setShowGigEditor] = useState(false);
    const [preQuoteData, setPreQuoteData] = useState(null);
    const [allForms, setAllForms] = useState({});
    const [hiddenIds, setHiddenIds] = useState({});
    const [showAllForms, setShowAllForms] = useState(false);
    const [showAllIntake, setShowAllIntake] = useState(false);
    const [showAllCocktails, setShowAllCocktails] = useState(false);
    const [showAllMixNSip, setShowAllMixNSip] = useState(false);
    const [showAllCourse, setShowAllCourse] = useState(false);
    const [showAllClasses, setShowAllClasses] = useState(false);

    const visibleIntakeForms = showAllIntake ? (allForms['intake-forms'] || []) : (allForms['intake-forms'] || []).filter(f => !(hiddenIds['intake-forms'] || []).includes(f.id));
    const visibleCraftCocktails = showAllCocktails ? (allForms['craft-cocktails'] || []) : (allForms['craft-cocktails'] || []).filter(f => !(hiddenIds['craft-cocktails'] || []).includes(f.id));
    const visibleMixNSip = showAllMixNSip ? (allForms['mix-n-sip'] || []) : (allForms['mix-n-sip'] || []).filter(f => !(hiddenIds['mix-n-sip'] || []).includes(f.id));
    const visibleCourse = showAllCourse ? (allForms['bartending-course'] || []) : (allForms['bartending-course'] || []).filter(f => !(hiddenIds['bartending-course'] || []).includes(f.id));
    const visibleClasses = showAllClasses ? (allForms['bartending-classes'] || []) : (allForms['bartending-classes'] || []).filter(f => !(hiddenIds['bartending-classes'] || []).includes(f.id));

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

        const hiddenIntake = JSON.parse(localStorage.getItem('hidden_intake-forms')) || [];
        const hiddenCocktails = JSON.parse(localStorage.getItem('hidden_craft-cocktails')) || [];
        const hiddenMix = JSON.parse(localStorage.getItem('hidden_mix-n-sip')) || [];
        const hiddenCourse = JSON.parse(localStorage.getItem('hidden_bartending-course')) || [];
        const hiddenClasses = JSON.parse(localStorage.getItem('hidden_bartending-classes')) || [];

        setAllForms({
            'intake-forms': intakeData,
            'craft-cocktails': cocktailsData,
            'mix-n-sip': mixData,
            'bartending-course': courseData,
            'bartending-classes': classesData,
        });

        setHiddenIds({
            'intake-forms': hiddenIntake,
            'craft-cocktails': hiddenCocktails,
            'mix-n-sip': hiddenMix,
            'bartending-course': hiddenCourse,
            'bartending-classes': hiddenClasses,
        });

        setIntakeForms(intakeData.filter(f => !hiddenIntake.includes(f.id)));
        setCraftCocktails(cocktailsData.filter(f => !hiddenCocktails.includes(f.id)));
        setMixNSip(mixData.filter(f => !hiddenMix.includes(f.id)));
        setBartendingCourse(courseData.filter(f => !hiddenCourse.includes(f.id)));
        setBartendingClasses(classesData.filter(f => !hiddenClasses.includes(f.id)));

        setIntakeCount(intakeData.length);
        setCraftCocktailsCount(cocktailsData.length);
        setMixNSipCount(mixData.length);
        setBartendingCourseCount(courseData.length);
        setBartendingClassesCount(classesData.length);

        } catch (error) {
        console.error('Error fetching forms:', error);
        }
    };

    fetchForms();
    }, []);




    const [quote, setQuote] = useState({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        quoteNumber: '',
        quoteDate: new Date().toLocaleDateString(),
        eventDate: '',
        items: [],
    });

    
    const [error] = useState('');

    const toggleAllFormsVisibility = () => {
    if (showAllForms) {
        // Reapply hidden filters
        const updatedIntake = (allForms['intake-forms'] || []).filter(f =>
        !(hiddenIds['intake-forms'] || []).includes(f.id)
        );
        const updatedCocktails = (allForms['craft-cocktails'] || []).filter(f =>
        !(hiddenIds['craft-cocktails'] || []).includes(f.id)
        );
        const updatedMix = (allForms['mix-n-sip'] || []).filter(f =>
        !(hiddenIds['mix-n-sip'] || []).includes(f.id)
        );
        const updatedCourse = (allForms['bartending-course'] || []).filter(f =>
        !(hiddenIds['bartending-course'] || []).includes(f.id)
        );
        const updatedClasses = (allForms['bartending-classes'] || []).filter(f =>
        !(hiddenIds['bartending-classes'] || []).includes(f.id)
        );

        setIntakeForms(updatedIntake);
        setCraftCocktails(updatedCocktails);
        setMixNSip(updatedMix);
        setBartendingCourse(updatedCourse);
        setBartendingClasses(updatedClasses);
    } else {
        // Show all records
        setIntakeForms(allForms['intake-forms'] || []);
        setCraftCocktails(allForms['craft-cocktails'] || []);
        setMixNSip(allForms['mix-n-sip'] || []);
        setBartendingCourse(allForms['bartending-course'] || []);
        setBartendingClasses(allForms['bartending-classes'] || []);
    }

    setShowAllForms(prev => !prev);
    };

    const formatTimeToAMPM = (timeStr) => {
  const [hour, minute] = timeStr.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${minute} ${ampm}`;
};

    const handleAddToGigs = async (form) => {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            
        const gigData = {
            client: form.full_name,
            event_type: form.event_type,
            date: form.event_date,
            time: form.event_time,
            duration: form.event_duration,
            location: form.event_location,
            position: "bartender",
            gender: form.preferred_gender || 'N/A',
            pay: 20,
            client_payment: 0, // Example: Ensure numeric value
            payment_method: 'N/A',
            needs_cert: form.bartending_license ? 1 : 0, // Convert boolean to numeric
            confirmed: 1, // Convert false to 0
            staff_needed: form.guest_count > 50 ? 2 : 1, // Example logic
            claimed_by: [],
            backup_needed: 1, // Convert false to 0
            backup_claimed_by: [],
            latitude: null,
            longitude: null,
            attire: form.staff_attire,
            indoor: form.indoors ? 1 : 0, // Convert boolean to numeric
            approval_needed: form.nda_required ? 1 : 0,
            on_site_parking: form.on_site_parking ? 1 : 0,
            local_parking: form.local_parking || 'N/A',
            NDA: form.nda_required ? 1 : 0,
            establishment: form.home_or_venue || 'home',
        };
    
        try {
            const response = await fetch(`${apiUrl}/gigs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gigData),
            });
    
            if (response.ok) {
                alert('Gig added successfully, and notifications sent!');
            } else {
                const errorMessage = await response.text();
                alert(`Failed to add gig: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error adding gig:', error);
            alert('Error adding gig. Please try again.');
        }
    };
    
    const [form, setForm] = useState({
        event_type: '',
        event_date: '',
        addons: [],  // Assuming this is an array of add-ons
        event_duration: '',
        insurance: '',
        budget: ''
    });
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null); // Track the selected client
    const [redirectToQuotePage, setRedirectToQuotePage] = useState(false); // Control redirection

    // Fetch clients from the backend
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/clients');
                if (response.ok) {
                    const data = await response.json();
                    setClients(data);
                } else {
                    console.error('Failed to fetch clients');
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };

        fetchClients();
    }, []);

    // Handle form field changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({
            ...prevForm,
            [name]: value,
        }));
    };

    // Handle client selection
    const handleClientSelection = (e) => {
        const clientId = e.target.value;
        const client = clients.find((c) => c.id === parseInt(clientId)); // Find client by ID
        setSelectedClient(client); // Set the selected client
    };

    // Handle form submission (Create Quote)
const handleCreateQuote = (form) => {
    const preQuote = {
        clientName: form.full_name,
        clientEmail: form.email,
        clientPhone: form.phone,
        quoteNumber: `Q-${Date.now()}`,
        quoteDate: new Date().toLocaleDateString(),
        eventDate: form.event_date ? new Date(form.event_date).toISOString().split('T')[0] : '',
        eventTime: form.event_time ? formatTimeToAMPM(form.event_time) : '',
        location: form.event_location || '',
        items: [{
            name: form.event_type,
            quantity: 1,
            unitPrice: "",
            description: `Event Duration: ${form.event_duration || "Not specified"} | Insurance: ${form.insurance || "No insurance"} | Budget: ${form.budget || "Not specified"}${form.addons ? ` | Includes Add-ons: ${Array.isArray(form.addons) ? form.addons.join(', ') : form.addons}` : ""}`
        }]
    };

    sessionStorage.setItem('preQuote', JSON.stringify(preQuote));
    window.open('/admin/quotes', '_blank');
};
    
    const handleDelete = (id, type) => {
    if (!window.confirm('Hide this form from view?')) return;

    const storageKey = `hidden_${type}`;
    const hidden = JSON.parse(localStorage.getItem(storageKey)) || [];
    const updated = [...hidden, id];
    localStorage.setItem(storageKey, JSON.stringify(updated));

    if (type === 'intake-forms') {
        setIntakeForms(prev => prev.filter(form => !updated.includes(form.id)));
        setIntakeCount(prev => prev - 1);
    } else if (type === 'craft-cocktails') {
        setCraftCocktails(prev => prev.filter(form => !updated.includes(form.id)));
        setCraftCocktailsCount(prev => prev - 1);
    } else if (type === 'mix-n-sip') {
        setMixNSip(prev => prev.filter(form => !updated.includes(form.id)));
        setMixNSipCount(prev => prev - 1);
    } else if (type === 'bartending-course') {
        setBartendingCourse(prev => prev.filter(form => !updated.includes(form.id)));
        setBartendingCourseCount(prev => prev - 1);
    } else if (type === 'bartending-classes') {
        setBartendingClasses(prev => prev.filter(form => !updated.includes(form.id)));
        setBartendingClassesCount(prev => prev - 1);
    }
};



    
    return (
        <div className="admin-intake-forms-container">
            <h1>Submitted Intake Forms</h1>
            <button onClick={toggleAllFormsVisibility}>
  {showAllForms ? 'Re-hide Hidden Forms' : 'Show All Forms'}
</button>

            {error && <p className="error-message">{error}</p>}
    <div>
        <p>Intake Forms: {intakeCount}</p>
        <p>Bartending Course Forms: {bartendingCourseCount}</p>
        <p>Bartending Classes Forms: {bartendingClassesCount}</p>
        <p>Craft Cocktails Forms: {craftCocktailsCount}</p>
        <p>Mix N Sip Forms: {mixNSipCount}</p>
    </div>
    <br></br>
            {/* Intake Forms */}
            {intakeForms.length > 0 ? (
                <div className="table-scroll-container">
                    <h2>Intake Forms</h2>
                    <table className="intake-forms-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Entity Type</th>
                                <th>Business Name</th>
                                <th>First Time Booking</th>
                                <th>Event Type</th>
                                <th>Age Range</th>
                                <th>Event Name</th>
                                <th>Event Address</th>
                                <th>Gender Matters</th>
                                <th>Preferred Gender</th>
                                <th>Open Bar</th>
                                <th>Location Features</th>
                                <th>Staff Attire</th>
                                <th>Event Duration</th>
                                <th>On-Site Parking</th>
                                <th>Local Parking</th>
                                <th>Additional Prep Time</th>
                                <th>NDA Required</th>
                                <th>Food Catering</th>
                                <th>Guest Count</th>
                                <th>Home or Venue</th>
                                <th>Venue Name</th>
                                <th>Bartending License Required</th>
                                <th>Insurance Required</th>
                                <th>Liquor License Required</th>
                                <th>Indoors Event</th>
                                <th>Budget</th>
                                <th>Add-ons</th>
                                <th>Payment Method</th>
                                <th>How Heard</th>
                                <th>Referral</th>
                                <th>Referral Details</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>

                            {intakeForms.map((form) => (
                                <tr key={form.id}>
                                    <td>{form.full_name}</td>
                                    <td>{form.email}</td>
                                    <td>{form.phone}</td>
                                    <td>{new Date(form.event_date).toLocaleDateString('en-US')}</td>
                                    <td>{new Date(`1970-01-01T${form.event_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                                    <td>{form.entity_type}</td>
                                    <td>{form.business_name || 'N/A'}</td>
                                    <td>{form.first_time_booking ? 'Yes' : 'No'}</td>
                                    <td>{form.event_type}</td>
                                    <td>{form.age_range || 'N/A'}</td>
                                    <td>{form.event_name || 'N/A'}</td>
                                    <td>{form.event_location || 'N/A'}</td>
                                    <td>{form.gender_matters ? 'Yes' : 'No'}</td>
                                    <td>{form.preferred_gender || 'N/A'}</td>
                                    <td>{form.open_bar ? 'Yes' : 'No'}</td>
                                    <td>{Array.isArray(form.location_facilities) ? form.location_facilities.join(', ') : 'None'}</td>
                                    <td>{form.staff_attire || 'N/A'}</td>
                                    <td>{form.event_duration || 'N/A'}</td>
                                    <td>{form.on_site_parking ? 'Yes' : 'No'}</td>
                                    <td>{form.local_parking ? 'Yes' : 'No'}</td>
                                    <td>{form.additional_prep ? 'Yes' : 'No'}</td>
                                    <td>{form.nda_required ? 'Yes' : 'No'}</td>
                                    <td>{form.food_catering ? 'Yes' : 'No'}</td>
                                    <td>{form.guest_count || 'N/A'}</td>
                                    <td>{form.home_or_venue || 'N/A'}</td>
                                    <td>{form.venue_name || 'N/A'}</td>
                                    <td>{form.bartending_license ? 'Yes' : 'No'}</td>
                                    <td>{form.insurance_required ? 'Yes' : 'No'}</td>
                                    <td>{form.liquor_license ? 'Yes' : 'No'}</td>
                                    <td>{form.indoors ? 'Yes' : 'No'}</td>
                                    <td>{form.budget || 'N/A'}</td>
                                    <td>{form.addons || 'None'}</td>
                                    <td>{form.payment_method || 'None'}</td>
                                    <td>{form.how_heard || 'N/A'}</td>
                                    <td>{form.referral || 'N/A'}</td>
                                    <td>{form.referral_details || 'N/A'}</td>
                                    <td>{new Date(form.created_at).toLocaleString()}</td>
                                    <td>
                                    <button
                                        onClick={() => {
                                            const draftGig = {
                                                client: form.full_name,
                                                event_type: form.event_type,
                                                date: form.event_date,
                                                time: form.event_time,
                                                duration: form.event_duration,
                                                location: form.event_location,
                                                position: "bartender",
                                                gender: form.preferred_gender || 'N/A',
                                                pay: 20,
                                                client_payment: 0,
                                                payment_method: 'N/A',
                                                needs_cert: form.bartending_license ? 1 : 0,
                                                confirmed: 1,
                                                staff_needed: form.guest_count > 50 ? 2 : 1,
                                                claimed_by: [],
                                                backup_needed: 1,
                                                backup_claimed_by: [],
                                                latitude: null,
                                                longitude: null,
                                                attire: form.staff_attire,
                                                indoor: form.indoors ? 1 : 0,
                                                approval_needed: form.nda_required ? 1 : 0,
                                                on_site_parking: form.on_site_parking ? 1 : 0,
                                                local_parking: form.local_parking || 'N/A',
                                                NDA: form.nda_required ? 1 : 0,
                                                establishment: form.home_or_venue || 'home',
                                            };
                                            setEditingGig(draftGig);
                                            setShowGigEditor(true);
                                        }}
                                    >
                                        Add to Gigs
                                    </button>
                                    {/* Add Create Quote Button */}
                                    <button onClick={() => handleCreateQuote(form)}>
                                        Create Quote
                                    </button>
                                        <button onClick={() => handleDelete(form.id, 'intake-forms')}>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No intake forms submitted yet.</p>
            )}
            <br></br>
            {/* Bartending Course Forms */}
            {bartendingCourse.length > 0 ? (
                <div className="table-scroll-container">
                    <h2>Bartending Course Forms</h2>
                    <table className="intake-forms-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Is Adult</th>
                                <th>Experience</th>
                                <th>Course Schedule</th>
                                <th>Payment Plan</th>
                                <th>Referral</th>
                                <th>Referral Details</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bartendingCourse.map((form) => (
                                <tr key={form.id}>
                                    <td>{form.full_name}</td>
                                    <td>{form.email}</td>
                                    <td>{form.phone}</td>
                                    <td>{form.is_adult ? 'Yes' : 'No'}</td>
                                    <td>{form.experience ? 'Yes' : 'No'}</td>
                                    <td>{form.set_schedule}</td>
                                    <td>{form.payment_plan ? 'Yes' : 'No'}</td>
                                    <td>{form.referral || 'N/A'}</td>
                                    <td>{form.referral_details || 'None'}</td>
                                    <td>
                                        <button
                                            onClick={() => handleDelete(form.id, 'bartending-course')}
                                            style={{
                                                backgroundColor: '#8B0000',
                                                color: 'white',
                                                padding: '5px 10px',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No Bartending Course forms submitted yet.</p>
            )}
            <br></br>
                        {/* Bartending Classes Forms */}
                        {bartendingClasses.length > 0 ? (
                <div className="table-scroll-container">
                    <h2>Bartending Classes Forms</h2>
                    <table className="intake-forms-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Is Adult</th>
                                <th>Experience</th>
                                <th>Class Count</th>
                                <th>Referral</th>
                                <th>Referral Details</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bartendingClasses.map((form) => (
                                <tr key={form.id}>
                                    <td>{form.full_name}</td>
                                    <td>{form.email}</td>
                                    <td>{form.phone}</td>
                                    <td>{form.is_adult ? 'Yes' : 'No'}</td>
                                    <td>{form.experience ? 'Yes' : 'No'}</td>
                                    <td>{form.class_count}</td>
                                    <td>{form.referral || 'N/A'}</td>
                                    <td>{form.referral_details || 'None'}</td>
                                    <td>
                                        <button onClick={() => handleDelete(form.id, 'bartending-classes')}>
                                            Remove
                                        </button>

                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No bartending classes forms submitted yet.</p>
            )}
            <br></br>
            {/* Craft Cocktails */}
            {craftCocktails.length > 0 ? (
                <div className="table-scroll-container">
                    <h2>Craft Cocktails Forms</h2>
                    <table className="intake-forms-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Event Type</th>
                                <th>Guest Count</th>
                                <th>Add-ons</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {craftCocktails.map((form) => (
                                <tr key={form.id}>
                                    <td>{form.full_name}</td>
                                    <td>{form.email}</td>
                                    <td>{form.phone}</td>
                                    <td>{form.event_type}</td>
                                    <td>{form.guest_count}</td>
                                    <td>{form.addons || 'None'}</td>

                                    <td>
                                        <button onClick={() => handleDelete(form.id, 'craft-cocktails')} style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No craft cocktails forms submitted yet.</p>
            )}  
                 <br></br>
            {/* Mix N Sip */}
            {mixNSip.length > 0 ? (
                <div className="table-scroll-container">
                    <h2>Mix N' Sip Forms</h2>
                    <table className="intake-forms-table">
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Event Type</th>
                                <th>Guest Count</th>
                                <th>Add-ons</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mixNSip.map((form) => (
                                <tr key={form.id}>
                                    <td>{form.full_name}</td>
                                    <td>{form.email}</td>
                                    <td>{form.phone}</td>
                                    <td>{form.event_type}</td>
                                    <td>{form.guest_count}</td>
                                    <td>{form.addons || 'None'}</td>

                                    <td>
                                        <button onClick={() => handleDelete(form.id, 'mix-n-sip')} style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No Mix N' Sip forms submitted yet.</p>
            )}
            {showGigEditor && editingGig && (
    <div className="modal-overlay">
        <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>Edit Gig Before Publishing</h2>

            {/* Each editable field */}
            <label>Client:
                <input value={editingGig.client} onChange={e => setEditingGig({ ...editingGig, client: e.target.value })} />
            </label>
            <label>Event Type:
                <input value={editingGig.event_type} onChange={e => setEditingGig({ ...editingGig, event_type: e.target.value })} />
            </label>
            <label>Date:
                <input type="date" value={editingGig.date} onChange={e => setEditingGig({ ...editingGig, date: e.target.value })} />
            </label>
            <label>Time:
                <input type="time" value={editingGig.time} onChange={e => setEditingGig({ ...editingGig, time: e.target.value })} />
            </label>
            <label>Duration:
                <input value={editingGig.duration} onChange={e => setEditingGig({ ...editingGig, duration: e.target.value })} />
            </label>
            <label>Location:
                <input value={editingGig.location} onChange={e => setEditingGig({ ...editingGig, location: e.target.value })} />
            </label>
            <label>Position:
                <input value={editingGig.position} onChange={e => setEditingGig({ ...editingGig, position: e.target.value })} />
            </label>
            <label>Gender:
                <input value={editingGig.gender} onChange={e => setEditingGig({ ...editingGig, gender: e.target.value })} />
            </label>
            <label>Attire:
                <input value={editingGig.attire} onChange={e => setEditingGig({ ...editingGig, attire: e.target.value })} />
            </label>
            <label>Indoor:
                <select value={editingGig.indoor} onChange={e => setEditingGig({ ...editingGig, indoor: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>
            <label>Approval Needed:
                <select value={editingGig.approval_needed} onChange={e => setEditingGig({ ...editingGig, approval_needed: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>
            <label>On-Site Parking:
                <select value={editingGig.on_site_parking} onChange={e => setEditingGig({ ...editingGig, on_site_parking: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>
            <label>Local Parking:
                <input value={editingGig.local_parking} onChange={e => setEditingGig({ ...editingGig, local_parking: e.target.value })} />
            </label>
            <label>NDA Required:
                <select value={editingGig.NDA} onChange={e => setEditingGig({ ...editingGig, NDA: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>
            <label>Establishment:
                <input value={editingGig.establishment} onChange={e => setEditingGig({ ...editingGig, establishment: e.target.value })} />
            </label>
            <label>Pay ($/hr):
                <input type="number" value={editingGig.pay} onChange={e => setEditingGig({ ...editingGig, pay: Number(e.target.value) })} />
            </label>
            <label>Client Payment:
                <input type="number" value={editingGig.client_payment} onChange={e => setEditingGig({ ...editingGig, client_payment: Number(e.target.value) })} />
            </label>
            <label>Payment Method:
                <input value={editingGig.payment_method} onChange={e => setEditingGig({ ...editingGig, payment_method: e.target.value })} />
            </label>
            <label>Staff Needed:
                <input type="number" value={editingGig.staff_needed} onChange={e => setEditingGig({ ...editingGig, staff_needed: parseInt(e.target.value) })} />
            </label>
            <label>Backup Needed:
                <select value={editingGig.backup_needed} onChange={e => setEditingGig({ ...editingGig, backup_needed: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>
            <label>Confirmed:
                <select value={editingGig.confirmed} onChange={e => setEditingGig({ ...editingGig, confirmed: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>
            <label>Needs Certification:
                <select value={editingGig.needs_cert} onChange={e => setEditingGig({ ...editingGig, needs_cert: parseInt(e.target.value) })}>
                    <option value={1}>Yes</option>
                    <option value={0}>No</option>
                </select>
            </label>

            {/* Submit/cancel buttons */}
            <div style={{ marginTop: '15px' }}>
                <button
                    style={{ backgroundColor: '#8B0000', color: 'white', padding: '8px 16px' }}
                    onClick={async () => {
                        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                        try {
                            const response = await fetch(`${apiUrl}/gigs`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(editingGig),
                            });
                            if (response.ok) {
                                alert('Gig submitted successfully!');
                                setShowGigEditor(false);
                                setEditingGig(null);
                            } else {
                                const errorText = await response.text();
                                alert(`Submission failed: ${errorText}`);
                            }
                        } catch (error) {
                            console.error('Submission error:', error);
                            alert('Something went wrong.');
                        }
                    }}
                >
                    Submit Gig
                </button>
                <button
                    style={{ marginLeft: '10px', padding: '8px 16px' }}
                    onClick={() => {
                        setShowGigEditor(false);
                        setEditingGig(null);
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
)}

        </div>
        
    );
};

export default AdminIntakeForms;
