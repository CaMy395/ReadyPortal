import React, { useState, useEffect } from 'react';

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
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

            // Save payment details to the database
            const savePaymentResponse = await fetch(`${apiUrl}/api/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    amount: parseFloat(amount), // Ensure amount is a number
                    description: description || 'Payment for services', // Default description
                }),
            });

            if (!savePaymentResponse.ok) {
                const saveError = await savePaymentResponse.text();
                alert(`Error saving payment record: ${saveError}`);
                return;
            }

            // Generate payment link
            const paymentLinkResponse = await fetch(`${apiUrl}/api/create-payment-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    amount: parseFloat(amount),
                    description: description || 'Payment for services',
                }),
            });

            const data = await paymentLinkResponse.json();
            if (paymentLinkResponse.ok) {
                setLink(data.url);
                alert(`Payment link generated: ${data.url}`);
            } else {
                alert(`Error generating payment link: ${data.error}`);
            }
        } catch (error) {
            console.error('Error generating payment link:', error);
            alert('An error occurred. Please try again later.');
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

const PaymentsTable = () => {
    const [payments, setPayments] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPayments = async () => {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

            try {
                const response = await fetch(`${apiUrl}/api/payments`);
                if (!response.ok) {
                    throw new Error('Failed to fetch payments.');
                }
                const data = await response.json();
                setPayments(data);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchPayments();
    }, []);

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div>
            <h2>Payments Sent</h2>
            {payments.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email</th>
                            <th>Amount</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((payment) => (
                            <tr key={payment.id}>
                                <td>{payment.id}</td>
                                <td>{payment.email}</td>
                                <td>${payment.amount.toFixed(2)}</td>
                                <td>{payment.description}</td>
                                <td>{payment.status}</td>
                                <td>{new Date(payment.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No payments recorded yet.</p>
            )}
        </div>
    );
};

const PaymentPage = () => {
    return (
        <div>
            <PaymentForm />
            <PaymentsTable />
        </div>
    );
};

export default PaymentPage;
