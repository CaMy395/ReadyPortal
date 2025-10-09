import React, { useEffect, useState } from 'react';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Fetch the list of users from the backend
    useEffect(() => {
        fetch(`${apiUrl}/users`) // Change this to 3001
            .then((response) => response.json())
            .then((data) => {
                // Sort users alphabetically by name before setting the state
                const sortedUsers = data.sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                );
                console.log('Sorted users:', sortedUsers); // Debugging log
                setUsers(sortedUsers);
            })
            .catch((error) => console.error('Error fetching users:', error));
    }, [apiUrl]);

    return (
        <div className="userlist-container">
            <h2>Our Team</h2>
            {users.length > 0 ? (
                <table className="userlist-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Position</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.username}</td>
                                <td>{user.email}</td>
                                <td>{user.phone}</td>
                                <td>{user.position}</td>
                                <td>{user.role}</td>
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
