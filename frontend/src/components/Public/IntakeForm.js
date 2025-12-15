import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../App.css';
import ChatBox from './ChatBox'; 

const IntakeForm = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const selectedService = params.get('service') || ''; // Extract service from URL
    const baseService = selectedService || "";

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        entityType: '',
        businessName: '',
        firstTimeBooking: '',
        eventType: selectedService,  // Prefill with selected service
        ageRange: '',
        eventName: '',
        eventLocation: '',
        genderMatters: '',
        preferredGender: '',
        openBar: '',
        locationFeatures: [],
        staffAttire: '',
        eventDuration: '',
        onSiteParking: '',
        localParking: '',
        additionalPrepTime: '',
        ndaRequired: '',
        foodCatering: '',
        guestCount: '',
        homeOrVenue: '',
        venueName: '',
        bartendingLicenseRequired: '',
        insuranceRequired: '',
        liquorLicenseRequired: '',
        indoorsEvent: '',
        budget: '',
        addons: [],
        howHeard: '',
        referral: '',
        referralDetails: '',
        additionalComments: '',
    });

    useEffect(() => {
        if (selectedService) {
            setFormData((prev) => ({
                ...prev,
                eventType: selectedService,
            }));
        }
    }, [selectedService]);

    const handleChange = (e) => {
        const { name, value, multiple, options } = e.target;
    
        if (multiple) {
            // Handle multi-select dropdown
            const selectedOptions = Array.from(options)
                .filter((option) => option.selected)
                .map((option) => option.value);
            setFormData((prev) => ({
                ...prev,
                [name]: selectedOptions, // Update the array in state
            }));
        } else if (
            name === 'additionalPrepTime' ||
            name === 'ndaRequired' ||
            name === 'foodCatering' ||
            name === 'bartendingLicenseRequired' ||
            name === 'insuranceRequired' ||
            name === 'liquorLicenseRequired' ||
            name === 'indoorsEvent'
        ) {
            setFormData((prev) => ({
                ...prev,
                [name]: value === 'yes' ? true : value === 'no' ? false : null,
            }));
        } else {
            // Handle all other input types
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };
    
    const handleEventTypeChange = (e) => {
    const inputValue = e.target.value;

    // Prevent deleting or changing the base prefix
    if (!inputValue.startsWith(baseService)) return;

    setFormData((prev) => ({ ...prev, eventType: inputValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return; // Prevent multiple submissions
        setIsSubmitting(true);
    
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
        try {
            // Submit intake form data
            const formResponse = await fetch(`${apiUrl}/api/intake-form`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            if (!formResponse.ok) {
                throw new Error('Failed to submit the form. Please try again.');
            }
    
            alert('Form submitted successfully!');
    
            // Reset form fields
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                date: '',
                time: '',
                entityType: '',
                businessName: '',
                firstTimeBooking: '',
                eventType: '',
                ageRange: '',
                eventName: '',
                eventLocation: '',
                genderMatters: '',
                preferredGender: '',
                openBar: '',
                locationFeatures: [],
                staffAttire: '',
                eventDuration: '',
                onSiteParking: '',
                localParking: '',
                additionalPrepTime: '',
                ndaRequired: '',
                foodCatering: '',
                guestCount: '',
                homeOrVenue: '',
                venueName: '',
                bartendingLicenseRequired: '',
                insuranceRequired: '',
                liquorLicenseRequired: '',
                indoorsEvent: '',
                budget: '',
                addons: [],
                howHeard: '',
                referral: '',
                referralDetails: '',
                additionalComments: '',
            });
    
        } catch (error) {
            console.error('Error handling form submission:', error.message);
            alert(error.message); // Display specific error message
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="intake-form-container">
            <h1>Client Intake Form</h1>
            <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <label>
                    Full Name*:
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Email*:
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Phone*:
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Date*:
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Time*:
                    <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        required
                    />
                </label>
    
                {/* Entity Information */}
                <label>
                    What type of entity are you? *
                    <select
                        name="entityType"
                        value={formData.entityType}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="Individual">Individual</option>
                        <option value="Business">Business</option>
                    </select>
                </label>
                {formData.entityType === 'Business' && (
                    <label>
                        What is the name of your business? *
                        <input
                            type="text"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleChange}
                            required
                        />
                    </label>
                )}
    
                {/* Event Details */}
                <label>
                    Is this your first time booking? *
                    <select
                        name="firstTimeBooking"
                        value={formData.firstTimeBooking}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    What type of event is this? You can add text to selected service *
                    <input
                        type="text"
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleEventTypeChange}
                        required
                    />
                </label>
                <label>
                    What is the age range for this event? *
                    <input
                        type="text"
                        name="ageRange"
                        value={formData.ageRange}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    Name of the Event:
                    <input
                        type="text"
                        name="eventName"
                        value={formData.eventName}
                        onChange={handleChange}
                    />
                </label>
                <label>
                    What is the event location's FULL address? *
                    <input
                        name="eventLocation"
                        value={formData.eventLocation}
                        onChange={handleChange}
                        required
                    />
                </label>
    
                {/* Gender and Preferences */}
                <label>
                    Does gender matter? *
                    <select
                        name="genderMatters"
                        value={formData.genderMatters}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                {formData.genderMatters === 'yes' && (
                    <label>
                        If so, which gender would you prefer?
                        <select
                            name="preferredGender"
                            value={formData.preferredGender}
                            onChange={handleChange}
                        >
                            <option value="">Select</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                        </select>
                    </label>
                )}
    
                {/* Open Bar */}
                <label>
                    Will this be an open bar event? *
                    <select
                        name="openBar"
                        value={formData.openBar}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
    
                {/* Location Facilities */}
                <label>
                    Will the location have any of the following? (if using a computer hold 'Ctrl' to select multiple options)*
                    <select
                        name="locationFeatures"
                        multiple
                        value={formData.locationFeatures} // Bind the array from state
                        onChange={handleChange}
                        required
                    >
                        <option value="Built-in Bar">Built-in Bar</option>
                        <option value="Sink">Sink</option>
                        <option value="Refrigerator/Cooler">Refrigerator/Cooler</option>
                        <option value="Ice">Ice</option>
                        <option value="None of the above">None of the above</option>
                    </select>
                </label>

                {/* Staff Attire and Event Details */}
                <label>
                    What is the attire for the staff? *
                    <select
                        type="text"
                        name="staffAttire"
                        value={formData.staffAttire}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="sexy">Sexy</option>
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                        <option value="custom">Client Provided</option>
                    </select>
                </label>
                <label>
                    How many hours is the staff needed? *
                    <input
                        type="number"
                        name="eventDuration"
                        value={formData.eventDuration}
                        onChange={handleChange}
                        required
                    />
                </label>
    
                {/* Parking */}
                <label>
                    Is there on-site parking? *
                    <select
                        name="onSiteParking"
                        value={formData.onSiteParking}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                {formData.onSiteParking === 'no' && (
                    <label>
                        If not, is there local parking or street parking?
                        <textarea
                            name="localParking"
                            value={formData.localParking}
                            onChange={handleChange}
                        />
                    </label>
                )}
    
                {/* Additional Details */}
                <label>
                    Is additional prep time required? *
                    <select
                        name="additionalPrepTime"
                        value={formData.additionalPrepTime === true ? 'yes' : formData.additionalPrepTime === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    Will an NDA be required? *
                    <select
                        name="ndaRequired"
                        value={formData.ndaRequired === true ? 'yes' : formData.ndaRequired === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    Do you need food catering services? *
                    <select
                        name="foodCatering"
                        value={formData.foodCatering === true ? 'yes' : formData.foodCatering === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    How many guests will be attending? *
                    <input
                        type="number"
                        name="guestCount"
                        value={formData.guestCount}
                        onChange={handleChange}
                        required
                    />
                </label>
    
                {/* Venue Information */}
                <label>
                    Is this a home or venue? *
                    <input
                        type="text"
                        name="homeOrVenue"
                        value={formData.homeOrVenue}
                        onChange={handleChange}
                        required
                    />
                </label>
                {formData.homeOrVenue === 'venue' && (
                    <label>
                        If venue, what's the name?
                        <input
                            type="text"
                            name="venueName"
                            value={formData.venueName}
                            onChange={handleChange}
                        />
                    </label>
                )}
    
                {/* Licensing and Insurance */}
                <label>
                    Does the venue require a bartending license? *
                    <select
                        name="bartendingLicenseRequired"
                        value={formData.bartendingLicenseRequired === true ? 'yes' : formData.bartendingLicenseRequired === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    Does this event require insurance? *
                    <select
                        name="insuranceRequired"
                        value={formData.insuranceRequired === true ? 'yes' : formData.insuranceRequired === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    Will a liquor license be required? *
                    <select
                        name="liquorLicenseRequired"
                        value={formData.liquorLicenseRequired === true ? 'yes' : formData.liquorLicenseRequired === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
                <label>
                    Will this event be indoors? *
                    <select
                        name="indoorsEvent"
                        value={formData.indoorsEvent === true ? 'yes' : formData.indoorsEvent === false ? 'no' : ''}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </label>
    
                {/* Budget and Referral */}
                <label>
                    Do you have a budget? Please provide a number*
                    <input
                        type="text"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        required
                    />
                </label>

                {/* Add-ons */}
                    <label>
                    Would you like any of our add-ons? (if using a computer hold 'Ctrl' to select multiple options)*
                    <select
                        name="addons"
                        multiple
                        value={formData.addons} // Bind the array from state
                        onChange={handleChange}
                        required
                    >
                        <option value="Bartender">Extra Bartender</option>
                        <option value="Server">Extra Server</option>
                        <option value="BarBack">Extra BarBack</option>
                        <option value="Drink Toppers">Drink Toppers</option>
                        <option value="Ready Bar">Ready Bar</option>
                        <option value="Quick Bar">Quick Bar</option>
                        <option value="Ninja">Ninja Slushi</option>
                        <option value="Dry Ice">Dry Ice</option>
                        <option value="Mixers">Mixers</option>
                        <option value="Liquor">Liquor</option>
                        <option value="Hookah">Hookah</option>
                        <option value="Round High Tables">Round High Tables</option>
                        <option value="Mixers and Liquor">Round High Tables w/ Cover</option>
                        <option value="Signature Cocktails">Signature Cocktails</option>
                        <option value="None of the above">None of the above</option>
                    </select>
                </label>
                {/* Additional Comments */}
                <label>
                    Please provide any necessary inforamtion. (ex: how many high tables would you like? or how many extra servers?)*
                    <input
                        type="text"
                        name="additionalComments"
                        value={formData.additionalComments}
                        onChange={handleChange}
                        required
                    />
                </label>
                <label>
                    How did you hear about us? *
                    <select
                        name="howHeard"
                        value={formData.howHeard}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select</option>
                        <option value="Friend">Referred by a Friend</option>
                        <option value="Advertisement">Advertisement</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">Tik Tok</option>
                        <option value="Google">Google</option>
                        <option value="Other">Other</option>
                    </select>
                </label>

                {formData.howHeard === 'Friend' && (
                    <label>
                        If referred by a friend, please tell us who!
                        <input
                            type="text"
                            name="referralDetails"
                            value={formData.referral}
                            onChange={handleChange}
                            required
                        />
                    </label>
                )}

                {formData.howHeard === 'Other' && (
                    <label>
                        If other, please elaborate, else N/A *
                        <textarea
                            name="referralDetails"
                            value={formData.referralDetails}
                            onChange={handleChange}
                            required
                        />
                    </label>
                )}

                {/* Submit Button */}
                <button type="submit">Submit</button>
            </form>
                        {/* Add Chatbox */}
                        <ChatBox />
        </div>
    );
    
};

export default IntakeForm;