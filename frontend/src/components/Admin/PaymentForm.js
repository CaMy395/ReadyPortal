import React, { useState } from 'react';

const PaymentForm = () => {
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');

    const generatePaymentLink = async () => {
        if (!email || !amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid email and amount.');
            return;
        }

        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001;';
            const response = await fetch(`${apiUrl}/api/create-payment-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    amount: parseFloat(amount), // Ensure amount is a number
                    description: description || 'Payment for services', // Default description
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setLink(data.url);
                alert(`Payment link generated: ${data.url}`);
            } else {
                alert(`Error generating payment link: ${data.error}`);
            }
        } catch (error) {
            console.error('Error generating payment link:', error);
        }
    };

    return (
        <div>
            <h2>Create Payment Link</h2>
            <div>
                <label>Email:</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter client email"
                />
            </div>
            <div>
                <label>Amount ($):</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                />
            </div>
            <div>
                <label>Description:</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter payment description"
                />
            </div>
            <button onClick={generatePaymentLink}>Generate Link</button>
            {link && (
                <div>
                    <p>Payment Link:</p>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                        {link}
                    </a>
                </div>
            )}
        </div>
    );
};

export default PaymentForm;
