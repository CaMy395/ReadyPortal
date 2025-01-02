import React, { useEffect, useState } from 'react';
import '../../App.css';

const AdminIntakeForms = () => {
    const [intakeForms, setIntakeForms] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchIntakeForms = async () => {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            
            try {
                const response = await fetch(`${apiUrl}/api/intake-forms`);
                if (response.ok) {
                    const data = await response.json();
                    setIntakeForms(data);
                } else {
                    throw new Error('Failed to fetch intake forms');
                }
            } catch (error) {
                console.error('Error fetching intake forms:', error);
                setError('Could not fetch intake forms. Please try again later.');
            }
        };

        fetchIntakeForms();
    }, []);

    const handleDelete = async (id) => {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        if (window.confirm('Are you sure you want to delete this form?')) {
            try {
                const response = await fetch(`${apiUrl}/api/intake-forms/${id}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    alert('Form deleted successfully');
                    setIntakeForms(intakeForms.filter((form) => form.id !== id)); // Remove from state
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
            {intakeForms.length > 0 ? (
                <div className="table-scroll-container">
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
                                <th>How Heard</th>
                                <th>Referral</th>
                                <th>Referral Details</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {intakeForms.map((form) => (
                                <tr key={form.id}>
                                    <td>{form.full_name}</td>
                                    <td>{form.email}</td>
                                    <td>{form.phone}</td>
                                    <td>{new Date(form.event_date).toLocaleDateString('en-US')}</td>
                                    <td>
                                        {new Date(`1970-01-01T${form.event_time}`).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        })}
                                    </td>
                                    <td>{form.entity_type}</td>
                                    <td>{form.business_name}</td>
                                    <td>{form.first_time_booking ? 'Yes' : 'No'}</td>
                                    <td>{form.event_type}</td>
                                    <td>{form.age_range}</td>
                                    <td>{form.event_name}</td>
                                    <td>{form.event_location}</td>
                                    <td>{form.gender_matters ? 'Yes' : 'No'}</td>
                                    <td>{form.preferred_gender}</td>
                                    <td>{form.open_bar ? 'Yes' : 'No'}</td>
                                    <td>{Array.isArray(form.location_facilities) ? form.location_facilities.join(', ') : form.location_facilities}</td>
                                    <td>{form.staff_attire}</td>
                                    <td>{form.event_duration}</td>
                                    <td>{form.on_site_parking ? 'Yes' : 'No'}</td>
                                    <td>{form.local_parking}</td>
                                    <td>{form.additional_prep ? 'Yes' : 'No'}</td>
                                    <td>{form.nda_required ? 'Yes' : 'No'}</td>
                                    <td>{form.food_catering ? 'Yes' : 'No'}</td>
                                    <td>{form.guest_count}</td>
                                    <td>{form.home_or_venue}</td>
                                    <td>{form.venue_name}</td>
                                    <td>{form.bartending_license ? 'Yes' : 'No'}</td>
                                    <td>{form.insurance_required ? 'Yes' : 'No'}</td>
                                    <td>{form.liquor_license ? 'Yes' : 'No'}</td>
                                    <td>{form.indoors ? 'Yes' : 'No'}</td>
                                    <td>{form.budget}</td>
                                    <td>{form.addons}</td>
                                    <td>{form.how_heard}</td>
                                    <td>{form.referral}</td>
                                    <td>{form.additional_details}</td>
                                    <td>{new Date(form.created_at).toLocaleString()}</td>
                                    <br></br><br></br><br></br>
                                    <button
                                            onClick={() => handleDelete(form.id)}
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No intake forms submitted yet.</p>
            )}
        </div>
    );
};

export default AdminIntakeForms;
