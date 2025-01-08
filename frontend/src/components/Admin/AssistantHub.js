import React, { useState } from 'react';

const AssistantHub = () => {
    const faqs = [
        { question: "What do you offer?", answer: "Event staffing & packages, bartending course for certification, mixology classes, crafts & cocktails, rentals, drink accessories." },
        { question: "What areas do you travel?", answer: "All of South Florida. Travel fee for further locations." },
        { question: "How do I handle payment inquiries?", answer: "Send the client their payment link thats in acuity." },
        { question: "What is the policy for cancellations?", answer: "Clients must provide at least 48 hours' notice for cancellations. Refer them to the Terms & Conditions page if needed." },
        { question: "How much is the bartending course?", answer: "Class costs $400; A payment plan is offered but inquires interest and totals to $450." },
        { question: "How long is the bartending course?", answer: "It's a 24 hour course that is broken up into 12 2-hour classes. Schedule varies based on availibilty but generally weekdays after 5:30 and saturdays in the morning/afternoon. You select your schedule so how long depends on your commitment." },
        { question: "Can you tell me more about the bartending course?", answer: "You can see complete course details on our website (https://www.readybartending.com/our-services/how-to-be-a-bartender)." },
    ];

    const responsibilities = [
        "Monitor gig assignments and ensure all are filled.",
        "Complete tasks by the due date",
        "Respond to client inquiries promptly (Email, The Bash).",
        "Update client records with accurate information (Acuity and Portal ''Clients'' page).",
        "Escalate unresolved issues to the admin or management.",
        "Verify clients booking details with their answers to the questionnaire."
    ];

    const Onboarding = [
        "1. Schedule Virtual Interview.",
        "2. Schedule In person for bartenders (only if they pass virtual interview).",
        "2. Handbook Test for servers, barbacks, and bartenders.",
        "3. Uniform - Obtain sizes for bodysuit and button down shirt.",
        "4. Link to Portal to Register.",
        "5. Send Portal Training.",
        "6. Add to Ready Bar Chat.",
        "7. Done!"
    ];

    const BookingProcess = [
        "1. ALL clients will complete intake form directly in ReadyPortal.",        
        "2. Send Quote (for non bash clients).",
        "3. Send payment link with quote price to client in 'Payment Form' page.",
        "4. Add gig to portal in 'Home' page or Add appointment in 'Scheduling Page'.",
        "5. Create chat with client and owner to cofirm details.",
        "6. Create New Chat with staff ONLY and check off chat created on the 'Upcoming Gigs' page",
        "7. Confirm/answer any questions",
        "8. Send a reminder text the day before the event confirming readiness.",
        "9. Add client day of the event (to avoid staff asking questions in the group)",
        "10. Confirm payment and mark off in the scheduling page",
        "11. Send review link to client before the gig leaves the portal and mark off review link sent.",
        "12. Done!"
    ];

    const [openIndex, setOpenIndex] = useState(null); // Track which FAQ is open

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index); // Toggle open/close for the clicked FAQ
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <h1>Assistant Hub</h1>
            <p>Welcome to the Assistant Hub. Here you’ll find all the information and resources needed to assist with client inquiries and manage responsibilities effectively.</p>
            <br></br>

            {/* Responsibilities Section */}
            <section style={{ marginTop: "20px" }}>
                <h2>Responsibilities</h2>
                <ul>
                    {responsibilities.map((task, index) => (
                        <li key={index} style={{ textAlign: "left", marginTop: "10px" }}>{task}</li>
                    ))}
                </ul>
            </section>
            <br></br>

            {/* Onboarding Section */}
            <section style={{marginTop: "20px" }}>
                <h2>Onboarding</h2> 
                <ul>
                    {Onboarding.map((task, index) => (
                        <li key={index} style={{ textAlign: "left", marginTop: "10px" }}>{task}</li>
                    ))}
                </ul>
            </section>
            <br></br>

            {/* Booking Process Section */}
            <section style={{ marginTop: "20px" }}>
                <h2>Booking Process</h2>
                <ul>
                    {BookingProcess.map((task, index) => (
                        task === "OR" ? (
                            <li
                                key={index}
                                style={{
                                    listStyleType: "none", // Remove bullet
                                    textAlign: "center", // Center the "OR" text
                                    fontWeight: "bold",
                                }}
                            >
                                {task}
                            </li>
                        ) : (
                            <li key={index} style={{ textAlign: "left", marginTop: "10px" }}>
                                {task}
                            </li>
                        )
                    ))}
                </ul>
            </section>
            <br></br>

            {/* FAQ Section */}
            <section style={{ marginTop: "20px" }}>
                <h2>Frequently Asked Questions (FAQs)</h2>
                <ul style={{ listStyleType: "none", padding: 0 }}>
                    {faqs.map((faq, index) => (
                        <li key={index} style={{ textAlign: "left", marginLeft: "20px", marginTop: "10px", cursor: "pointer" }}>
                            <div
                                onClick={() => toggleFAQ(index)}
                                style={{ fontWeight: "bold"}}
                            >
                                Q: {faq.question}
                            </div>
                            {openIndex === index && (
                                <p style={{ textAlign: "left", marginTop: "5px" }}>A: {faq.answer}</p>
                            )}
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};

export default AssistantHub;
