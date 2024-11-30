import React, { useState, useEffect } from 'react';
import '../../App.css'; // Create and use a separate CSS file for styling

const UserPayouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch payouts for the logged-in user
    const fetchUserPayouts = async () => {
        try {
            // Adjust the endpoint to fetch user-specific payouts (requires backend support)
            const response = await fetch('http://localhost:3001/api/payouts/user');
            if (!response.ok) {
                throw new Error('Failed to fetch payouts');
            }
            const data = await response.json();
            setPayouts(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate total payouts for the user
    const calculateTotal = () => {
        return payouts.reduce(
            (sum, payout) => sum + parseFloat(payout.payout_amount),
            0
        );
    };

    useEffect(() => {
        fetchUserPayouts();
    }, []);

    return (
        <div className="payouts-container">
            <h1>Your Payouts</h1>

            {/* Totals */}
            <div className="totals">
                <p>
                    <strong>Total Payout Amount: </strong>${calculateTotal().toFixed(2)}
                </p>
            </div>

            {/* Show loading, error, or the data */}
            {loading && <p>Loading your payouts...</p>}
            {error && <p className="error-message">Error: {error}</p>}
            {!loading && payouts.length === 0 && <p>No payouts found.</p>}

            {/* Display table if payouts exist */}
            {payouts.length > 0 && (
                <div className="table-container">
                    <table className="payouts-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Gig</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payouts.map((payout) => (
                                <tr key={payout.id}>
                                    <td>{payout.id}</td>
                                    <td>{payout.gig_name || 'N/A'}</td>
                                    <td>${parseFloat(payout.payout_amount).toFixed(2)}</td>
                                    <td>{new Date(payout.payout_date).toLocaleDateString()}</td>
                                    <td>{payout.status}</td>
                                    <td>{payout.description || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserPayouts;
