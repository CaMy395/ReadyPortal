import React, { useEffect, useState } from 'react';
import '../../App.css'; // Ensure this file contains the styles for your table

const MyPayouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [error, setError] = useState('');
    const username = localStorage.getItem('username'); // Retrieve username from localStorage
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    useEffect(() => {
        const fetchUserPayouts = async () => {
            try {
                if (!username) {
                    setError('User not logged in.');
                    return;
                }

                const response = await fetch(`${apiUrl}/api/payouts/user?username=${username}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch payouts');
                }

                const data = await response.json();
                setPayouts(data);
            } catch (err) {
                console.error('Error fetching payouts:', err);
                setError('Failed to fetch payouts');
            }
        };

        fetchUserPayouts();
    }, [username, apiUrl]);

    const calculateTotalPayout = () => {
        return payouts.reduce((total, payout) => total + parseFloat(payout.payout_amount || 0), 0).toFixed(2);
    };

    return (
        <div className="payouts-container">
            <h2 className="payouts-title">My Payouts</h2>
            {error && <p className="error-message">{error}</p>}
            <h3>Total Payout Amount: ${calculateTotalPayout()}</h3>
            {payouts.length > 0 ? (
                
                <table className="payouts-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Payout Amount</th>
                            <th>Status</th>
                            <th>Payout Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payouts.map((payout) => (
                            <tr key={payout.id}>
                                <td>{payout.description}</td>
                                <td>${payout.payout_amount}</td>
                                <td>{payout.status}</td>
                                <td>{new Date(payout.payout_date).toLocaleDateString('en-US')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="no-payouts-message">No payouts found.</p>
            )}
        </div>
    );
};

export default MyPayouts;
