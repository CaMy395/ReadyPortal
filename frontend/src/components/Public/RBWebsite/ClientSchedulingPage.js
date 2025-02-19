import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; // ✅ Read URL parameters
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import appointmentTypes from "../../../data/appointmentTypes.json";

const ClientSchedulingPage = () => {
    const navigate = useNavigate(); // ✅ Fix: Define `navigate` before using it

    const apiUrl = process.env.REACT_APP_API_URL;
    const [searchParams] = useSearchParams(); // ✅ Get client details from URL

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedAppointmentType, setSelectedAppointmentType] = useState("");
    const [availableSlots, setAvailableSlots] = useState([]);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Zelle"); // ✅ Default payment method
    const [guestCount, setGuestCount] = useState("");
    const [classCount, setClassCount] = useState("");

    const [selectedAddons] = useState(() => {
        const encodedAddons = searchParams.get("addons");
        if (encodedAddons) {
            try {
                const parsedAddons = JSON.parse(atob(decodeURIComponent(encodedAddons)));
                // Ensure each add-on has a `quantity` field
                return parsedAddons.map(addon => ({
                    name: addon.name,
                    price: addon.price,
                    quantity: addon.quantity || 1 // Default to 1 if not provided
                }));
            } catch (error) {
                console.error("❌ Error decoding add-ons:", error);
            }
        }
        return [];
    });
    
        
    const addons = searchParams.get("addons") ? JSON.parse(atob(decodeURIComponent(searchParams.get("addons")))) : [];
    console.log("📥 Decoded Add-ons from URL:", addons);

    
    /** ✅ Load Client Info from URL on First Load **/
    useEffect(() => {
        const name = searchParams.get("name");
        const email = searchParams.get("email");
        const phone = searchParams.get("phone");
        const payment = searchParams.get("paymentMethod");
        const guestCount = searchParams.get("guestCount") || 1; // Default to 1 if guestCount is not provided
        const classCount = searchParams.get("classCount") || 1;

        const addonTotal = selectedAddons.reduce(
            (total, addon) => total + (addon.price * addon.quantity), 0
        );
        console.log("💰 Total Add-on Price:", addonTotal);
        
        // Encode add-ons for the payment page
        const encodedAddons = selectedAddons.length > 0 
            ? encodeURIComponent(btoa(JSON.stringify(selectedAddons))) 
            : "";
        
        
        let decodedAddons = [];
        if (encodedAddons) {
            try {
                decodedAddons = JSON.parse(atob(decodeURIComponent(encodedAddons))); // Decode & parse add-ons
            } catch (error) {
                console.error("❌ Error decoding add-ons:", error);
            }
        }
    
        if (name) setClientName(name);
        if (email) setClientEmail(email);
        if (phone) setClientPhone(phone);
        if (payment) setPaymentMethod(payment);
        if (guestCount) setGuestCount(guestCount);
        if (classCount) setClassCount(classCount); // ✅ Ensure class count is stored
        console.log("📥 Decoded Add-ons from URL:", decodedAddons); // ✅ Debugging line
    }, [searchParams]);
    
    

    /** ✅ Fetch Available Slots (Considering Blocked & Booked Times) **/
    const fetchAvailability = useCallback(async () => {
        if (!selectedDate || !selectedAppointmentType) return;
    
        const formattedDate = selectedDate.toISOString().split("T")[0];
        const appointmentWeekday = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).trim();
    
        try {
            // ✅ Fetch available slots
            const response = await axios.get(`${apiUrl}/availability`, {
                params: { weekday: appointmentWeekday, appointmentType: selectedAppointmentType }
            });
    
            console.log("📅 Available Slots Before Filtering:", response.data);
    
            // ✅ Fetch both blocked and booked times in one call
            const blockedTimesRes = await axios.get(`${apiUrl}/blocked-times`, { params: { date: formattedDate } });
            const bookedTimesRes = await axios.get(`${apiUrl}/appointments/by-date`, { params: { date: formattedDate } });
            
            const blockedTimes = blockedTimesRes.data.blockedTimes.map(time => `${formattedDate}-${time.split(":")[0]}`);
            const bookedTimes = bookedTimesRes.data.map(appointment => `${formattedDate}-${appointment.time.split(":")[0]}`);
            
            const unavailableTimes = [...new Set([...blockedTimes, ...bookedTimes])]; // ✅ Merge & remove duplicates
            
            console.log("🚫 Unavailable Times (Blocked + Booked):", unavailableTimes);
            
            
    
            // ✅ Ensure available slots are also in `HH:MM:SS` format before filtering
            const formattedAvailableSlots = response.data.map(slot => ({
                ...slot,
                start_time: slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
                end_time: slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time
            }));
    
            // ✅ Filter out blocked & booked slots (Fixed Logic)
            const filteredSlots = formattedAvailableSlots.filter(slot => {
                const slotHour = slot.start_time.split(':')[0]; // Extracts hour part
                return !unavailableTimes.some(blocked => blocked.includes(`${formattedDate}-${slotHour}`));
            });
            
            
    
            console.log("✅ Available Slots After Filtering:", filteredSlots);
            setAvailableSlots(filteredSlots.length > 0 ? filteredSlots : []);
        } catch (error) {
            console.error("❌ Error fetching availability:", error);
            setAvailableSlots([]); // ✅ Prevents empty state issues
        }
    }, [apiUrl, selectedDate, selectedAppointmentType]);
    

    /** ✅ Fetch Slots Whenever Date or Type Changes **/
    useEffect(() => {
        if (selectedDate && selectedAppointmentType) {
            console.log("🔄 Fetching availability for:", selectedDate, selectedAppointmentType);
            setAvailableSlots(prevSlots => prevSlots.filter(slot => slot.start_time !== slot.start_time));
            fetchAvailability(); // ✅ Refresh slots after removing the booked one
                    }
    }, [selectedDate, selectedAppointmentType]);
    
    /** ✅ Format Time **/
    const formatTime = (time) => {
        const [hours, minutes] = time.split(":");
        const date = new Date();
        date.setHours(hours, minutes);
        return new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
        }).format(date);
    };

    /** ✅ Handle Booking **/
    const bookAppointment = async (slot) => {
        if (!clientName || !clientEmail || !clientPhone || !selectedAppointmentType || !selectedDate) {
            alert("Please fill out all fields before booking.");
            return;
        }
    
        // ✅ Extract base price from title
        const extractPriceFromTitle = (title) => {
            const match = title.match(/\$(\d+(\.\d{1,2})?)/);
            return match ? parseFloat(match[1]) : 0;
        };
    
        // ✅ Calculate total price (base price + add-ons)
        const basePrice = extractPriceFromTitle(selectedAppointmentType);
        console.log("💰 Extracted Base Price:", basePrice);
        
        // ✅ Get Category from `appointmentTypes.json`
        const selectedType = appointmentTypes.find((type) => type.title === selectedAppointmentType);
        const category = selectedType ? selectedType.category : "General"; // Default to "General" if not found

        console.log("📂 Assigned Category:", category); // Debugging log
    
        try {
            const response = await axios.post(`${apiUrl}/appointments`, {
                title: selectedAppointmentType,
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone,
                date: selectedDate.toISOString().split("T")[0],
                time: slot.start_time,
                end_time: slot.end_time,
                description: `Client booked a ${selectedAppointmentType} appointment`,
                payment_method: paymentMethod,
                addons: selectedAddons, // ✅ Ensure add-ons are sent to backend
                guestCount: guestCount, // ✅ Ensure this is being sent
                classCount: classCount, // ✅ Ensure this is being sent
                category: category, // ✅ Ensure this is being sent
            });
    
            if (response.status === 201) {
                const { paymentLink } = response.data;
    
                alert("Appointment booked successfully!");
    
                if (paymentMethod === "Square" && paymentLink) {
                    console.log("🔗 Redirecting to Square Payment:", paymentLink);
                    window.location.href = paymentLink; // ✅ Redirects to Square
                } else {
                    console.log("🔗 Redirecting to Payment Page with Add-ons", selectedAddons);
    
                    // ✅ Navigate to payment page with correct `finalPrice`
                    const addonTotal = selectedAddons.reduce(
                        (total, addon) => total + (addon.price * addon.quantity), 0
                    );
                    console.log("💰 Total Add-on Price:", addonTotal);
                    
                    const guestCount = searchParams.get("guestCount") || 1;
                    const classCount = searchParams.get("classCount") || 1;

                    // Determine the correct multiplier (either guest count OR class count)
                    const multiplier = guestCount > 1 ? guestCount : classCount > 1 ? classCount : 1;

                    const multiplePrice = basePrice * multiplier; // ✅ Multiply base price by correct count


                    // Encode add-ons for the payment page
                    const encodedAddons = selectedAddons.length > 0 
                        ? encodeURIComponent(btoa(JSON.stringify(selectedAddons))) 
                        : "";
                    
                        console.log("📤 Navigating with Base Price:", multiplePrice);
                        console.log("📤 Navigating with Add-on Total:", addonTotal);
                        
                        navigate(`/rb/payment?price=${multiplePrice}&appointment_type=${encodeURIComponent(selectedAppointmentType)}&guestCount=${guestCount}&classCount=${classCount}&addons=${encodedAddons}`, {
                            state: { addons: selectedAddons, addonTotal, guestCount, classCount }
                        });
                        

                }
            }
        } catch (error) {
            console.error("❌ Error booking appointment:", error);
            alert("Failed to book appointment. Please try again.");
        }
    };
    

    return (
        <div className="client-scheduling">
            <h2>Schedule an Appointment</h2>

            <label>Client Name:</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter your name" />

            <label>Client Email:</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Enter your email" />

            <label>Client Phone Number:</label>
            <input type="phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Enter your phone number" />

            <label>Select Payment Method:</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Zelle">Zelle</option>
                <option value="CashApp">CashApp</option>
                <option value="Square">Square</option>
            </select>

            <label>Select Appointment Type:</label>
            <select value={selectedAppointmentType} onChange={(e) => setSelectedAppointmentType(e.target.value)}>
                <option value="">Select Appointment Type</option>
                {appointmentTypes.map((appt) => (
                    <option key={appt.title} value={appt.title}>{appt.title}</option>
                ))}
            </select>

            <label>Select Date:</label>
            <Calendar onChange={setSelectedDate} value={selectedDate} onClickDay={() => fetchAvailability()} />

            <h3>Available Slots</h3>
            <ul>
                {availableSlots.length === 0 ? (
                    <p>❌ No available slots for this date.</p>
                ) : (
                    availableSlots.map(slot => (
                        <li key={slot.id} className="available-slot">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            <button onClick={() => bookAppointment(slot)}>Book</button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default ClientSchedulingPage;
