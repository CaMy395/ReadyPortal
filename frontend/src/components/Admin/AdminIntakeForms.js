import React, { useEffect, useState } from 'react';
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
    const [editingGig, setEditingGig] = useState(null); // Holds current gig being edited
    const [showGigEditor, setShowGigEditor] = useState(false); // Controls modal visibility


    const [error] = useState('');

    useEffect(() => {
        const fetchForms = async () => {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
            try {
                const intakeResponse = await fetch(`${apiUrl}/api/intake-forms`);
                if (intakeResponse.ok) {
                    const intakeData = await intakeResponse.json();
                    setIntakeForms(intakeData || []);
                    setIntakeCount(intakeData.length); // Update count
                }
    
                const cocktailsResponse = await fetch(`${apiUrl}/api/craft-cocktails`);
                if (cocktailsResponse.ok) {
                    const cocktailsData = await cocktailsResponse.json();
                    setCraftCocktails(cocktailsData || []);
                    setCraftCocktailsCount(cocktailsData.length); // Update count
                }
    
                const mixResponse = await fetch(`${apiUrl}/api/mix-n-sip`);
                if (mixResponse.ok) {
                    const mixData = await mixResponse.json();
                    setMixNSip(mixData || []);
                    setMixNSipCount(mixData.length); // Update count
                }

                const courseResponse = await fetch(`${apiUrl}/api/bartending-course`);
                if (courseResponse.ok) {
                    const courseData = await courseResponse.json();
                    setBartendingCourse(courseData || []);
                    setBartendingCourseCount(courseData.length); // Update count
                }
    
                const classesResponse = await fetch(`${apiUrl}/api/bartending-classes`);
                if (classesResponse.ok) {
                    const classesData = await classesResponse.json();
                    setBartendingClasses(classesData || []);
                    setBartendingClassesCount(classesData.length); // Update count
                }

                
            } catch (error) {
                console.error('Error fetching forms:', error);
            }
        };
    
        fetchForms();
    }, [setBartendingClassesCount, setBartendingCourseCount, setCraftCocktailsCount, setIntakeCount, setMixNSipCount]);
    
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
    
    
    const handleDelete = async (id, type) => {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        if (window.confirm('Are you sure you want to delete this form?')) {
            try {
                const response = await fetch(`${apiUrl}/api/${type}/${id}`, {
                    method: 'DELETE',
                });
    
                if (response.ok) {
                    alert('Form deleted successfully');
                    if (type === 'intake-forms') {
                        setIntakeForms(intakeForms.filter((form) => form.id !== id));
                        setIntakeCount((prev) => prev - 1); // Update count
                    } else if (type === 'craft-cocktails') {
                        setCraftCocktails(craftCocktails.filter((form) => form.id !== id));
                        setCraftCocktailsCount((prev) => prev - 1); // Update count
                    } else if (type === 'mix-n-sip') {
                        setMixNSip(mixNSip.filter((form) => form.id !== id));
                        setMixNSipCount((prev) => prev - 1); // Update count
                    } else if (type === 'bartending-course') {
                        setBartendingCourse(bartendingCourse.filter((form) => form.id !== id));
                        setBartendingCourseCount((prev) => prev - 1); // Update count
                    } else if (type === 'bartending-classes') {
                        setBartendingClasses(bartendingClasses.filter((form) => form.id !== id));
                        setBartendingClassesCount((prev) => prev - 1); // Update count
                    } 
                } else {
                    const errorMessage = await response.text();
                    alert(`Failed to delete the form: ${errorMessage}`);
                }
            } catch (error) {
                console.error('Error deleting form:', error);
                alert('Error deleting the form. Please try again.');
            }
        }
    };
    
    return (
        <div className="admin-intake-forms-container">
            <h1>Submitted Intake Forms</h1>
            {error && <p className="error-message">{error}</p>}
    <div>
        <p>Intake Forms: {intakeCount}</p>
        <p>Craft Cocktails Forms: {craftCocktailsCount}</p>
        <p>Mix N Sip Forms: {mixNSipCount}</p>
        <p>Bartending Course Forms: {bartendingCourseCount}</p>
        <p>Bartending Classes Forms: {bartendingClassesCount}</p>
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

                                        <button onClick={() => handleDelete(form.id, 'intake-forms')} style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>Delete</button>
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
                                            Delete
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
                                        <button
                                            onClick={() => handleDelete(form.id, 'bartending-classes')}
                                            style={{
                                                backgroundColor: '#8B0000',
                                                color: 'white',
                                                padding: '5px 10px',
                                                border: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Delete
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
                                        <button onClick={() => handleDelete(form.id, 'craft-cocktails')} style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>Delete</button>
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
                                        <button onClick={() => handleDelete(form.id, 'mix-n-sip')} style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>Delete</button>
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
