import React, { useState } from 'react';

const AssistantHub = () => {
    const faqs = [
        { question: "What do you offer?", answer: "Event staffing & packages, bartending course for certification, mixology classes, crafts & cocktails, rentals, drink accessories." },
        { question: "What areas do you travel?", answer: "All of South Florida. Travel fee for further locations." },
        { question: "How do I handle payment inquiries?", answer: "Send the client their payment link thats in acuity." },
        { question: "What is the policy for cancellations?", answer: "Clients must provide at least 48 hours' notice for cancellations. Refer them to the Terms & Conditions page if needed." },
    ];

    const responsibilities = [
        "Monitor gig assignments and ensure all are filled.",
        "Complete tasks by the due date",
        "Respond to client inquiries promptly (Email, The Bash).",
        "Update client records with accurate information (Acuity and Portal ''Clients'' page).",
        "Escalate unresolved issues to the admin or management.",
    ];

    const Onboarding = [
        "1. Schedule Interview (In-Person for Bartenders ONLY)",
        "2. Handbook Test for servers, barbacks, and bartenders (bartenders will complete in person)",
        "3. Uniform - Obtain sizes for bodysuit and button down shirt",
        "4. Link to Portal to Register",
        "5. Send Portal Training",
        "6. Done!"
    ];

    const BookingProcess = [
        "1a. Client will book directly in Acuity via website. (Non bash clients send them to site to book directly to ease the process.) ",
        "OR",
        "1b. Manually add to Acuity for The Bash clients.",
        "2. Add gig to portal (Confirm if staff will be manually assigned before dropping gig).",
        "3. Create chat with client and owner to cofirm details (if not done already).",
        "4. Create New Chat with staff ONLY",
        "5. Send confirmation details and answer all questions",
        "6. Add client once everyone is one the same page (to avoid staff asking questions in the group)",
        "7. Send a reminder text day before the event confirming.",
        "8. Send review link to client",
        "8. Done!",
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
