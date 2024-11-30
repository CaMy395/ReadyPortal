import React, { useState, useEffect } from 'react';
import '../../App.css'; // Create and use a separate CSS file for styling

const Payouts = () => {
    const [payouts, setPayouts] = useState([]);
    const [filteredPayouts, setFilteredPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter States
    const [searchName, setSearchName] = useState('');
    const [searchGig, setSearchGig] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [startDate, setStartDate] = useState('');


    // Fetch payouts data from the backend
    const fetchPayouts = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/payouts');
            if (!response.ok) {
                throw new Error('Failed to fetch payouts');
            }
            const data = await response.json();
            setPayouts(data);
            setFilteredPayouts(data); // Initialize filtered payouts
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter payouts based on criteria
    useEffect(() => {
        let result = payouts;

        if (searchName.trim() !== '') {
            const lowerSearch = searchName.toLowerCase();
            result = result.filter((payout) =>
                payout.name.toLowerCase().includes(lowerSearch)
            );
        }

        if (searchGig.trim() !== '') {
            const lowerSearch = searchGig.toLowerCase();
            result = result.filter((payout) =>
                payout.gig_name.toLowerCase().includes(lowerSearch)
            );
        }

        if (searchStatus.trim() !== '') {
            result = result.filter(
                (payout) => payout.status.toLowerCase() === searchStatus.toLowerCase()
            );
        }

        if (startDate) {
            result = result.filter(
                (payout) => new Date(payout.payout_date) >= new Date(startDate)
            );
        }


        setFilteredPayouts(result);
    }, [searchName, searchGig, searchStatus, startDate, payouts]);

    // Calculate total payouts per user
    const calculateTotalsPerUser = () => {
        const totals = {};
        filteredPayouts.forEach((payout) => {
            if (!totals[payout.name]) {
                totals[payout.name] = 0;
            }
            totals[payout.name] += parseFloat(payout.payout_amount);
        });
        return totals;
    };

    // Calculate total payouts overall
    const calculateTotalOverall = () => {
        return filteredPayouts.reduce(
            (sum, payout) => sum + parseFloat(payout.payout_amount),
            0
        );
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    return (
        <div className="payouts-container">
            <h1>Staff Payouts Directory</h1>

            {/* Filters */}
            <div className="filters">
                <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Search by Staff Name"
                    className="filter-input"
                />
                <input
                    type="text"
                    value={searchGig}
                    onChange={(e) => setSearchGig(e.target.value)}
                    placeholder="Search by Gig Name"
                    className="filter-input"
                />
                <input
                    type="text"
                    value={searchStatus}
                    onChange={(e) => setSearchStatus(e.target.value)}
                    placeholder="Search by Status"
                    className="filter-input"
                />
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="filter-input"
                />
            </div>

            {/* Totals */}
            <div className="totals">
                <p>
                    <strong>Total Payout Amount (Filtered): </strong>${calculateTotalOverall().toFixed(2)}
                </p>
                <ul>
                    {Object.entries(calculateTotalsPerUser()).map(([name, total]) => (
                        <li key={name}>
                            {name}: ${total.toFixed(2)}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Show loading, error, or the data */}
            {loading && <p>Loading payouts...</p>}
            {error && <p className="error-message">Error: {error}</p>}
            {!loading && filteredPayouts.length === 0 && <p>No payouts found.</p>}

            {/* Display table if payouts exist */}
            {filteredPayouts.length > 0 && (
                <div className="table-container">
                    <table className="payouts-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Staff</th>
                                <th>Gig</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayouts.map((payout) => (
                                <tr key={payout.id}>
                                    <td>{payout.id}</td>
                                    <td>{payout.name}</td>
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

export default Payouts;
