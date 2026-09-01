import React, { useEffect, useState } from 'react';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Fetch the list of users from the backend
    useEffect(() => {
        fetch(`${apiUrl}/users`) // Change this to 3001
            .then((response) => response.json())
            .then((data) => {
                // Sort users alphabetically by name before setting the state
                const sortedUsers = data
                  .filter((user) => user.active !== false && user.is_active !== false)
                  .sort((a, b) =>
                    (a.name || a.username || '').localeCompare((b.name || b.username || ''), undefined, { sensitivity: 'base' })
                );
                setUsers(sortedUsers);
            })
            .catch((error) => {
                console.error('Error fetching users:', error);
                setError('The team list could not be loaded. Please try again.');
            })
            .finally(() => setLoading(false));
    }, [apiUrl]);

    return (
        <div className="userlist-container staff-workspace staff-team-workspace">
            <header className="staff-page-header">
                <span>DIRECTORY</span>
                <h1>Our Team</h1>
                <p>Contact information for the Ready team.</p>
            </header>
            {loading ? <p className="staff-state-message">Loading team...</p> : error ? <p className="staff-state-message staff-state-error">{error}</p> : users.length > 0 ? (
                <table className="userlist-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name || user.username || 'Team member'}</td>
                                <td>{user.phone || 'Not provided'}</td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="no-users">No users found.</p>
            )}
        </div>
    );
};

export default UserList;
