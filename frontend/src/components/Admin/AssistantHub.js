import React, { useState } from 'react';

const AssistantHub = () => {
    const faqs = [
        { question: "What do you offer?", answer: "Event staffing & packages, bartending course for certification, mixology classes, crafts & cocktails, rentals." },
        { question: "How do I handle payment inquiries?", answer: "Refer to the payment dashboard and ensure all payouts are logged correctly. Escalate unresolved issues to the admin." },
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
        "2. Handbook Test for servers, barbacks. (bartenders will complete in person)",
        "3. ID",
        "4. Uniform",
        "5. Link to Portal to Register",
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

            {/* Onboariding Section */}
            <section style={{ marginTop: "20px" }}>
                <h2>Onboarding</h2>
                <ul>
                    {Onboarding.map((task, index) => (
                        <li key={index} style={{ textAlign: "left", marginTop: "10px" }}>{task}</li>
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
