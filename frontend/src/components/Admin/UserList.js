import React, { useEffect, useState } from 'react';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null); // user being edited
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Reusable fetch function
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${apiUrl}/users`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();

            const sortedUsers = data.sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );

            setUsers(sortedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [apiUrl]);

    // When clicking "Edit", populate the editing form
    const handleEditClick = (user) => {
        setEditingUser({
            ...user,
            // Ensure no undefined in controlled inputs
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            position: user.position || '',
            role: user.role || '',
            preferred_payment_method: user.preferred_payment_method || '',
            payment_details: user.payment_details || '',
        });
    };

    // Handle changes in the edit form
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingUser((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Save edited user
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const response = await fetch(`${apiUrl}/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: editingUser.name,
                    username: editingUser.username,
                    email: editingUser.email,
                    phone: editingUser.phone,
                    position: editingUser.position,
                    role: editingUser.role,
                    preferred_payment_method: editingUser.preferred_payment_method,
                    payment_details: editingUser.payment_details,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to update user: ${text}`);
            }

            await fetchUsers();
            setEditingUser(null);
            alert('User updated successfully!');
        } catch (error) {
            console.error('Error updating user:', error);
            alert('There was an error updating the user.');
        }
    };

    // Delete user
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            const response = await fetch(`${apiUrl}/users/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to delete user: ${text}`);
            }

            // Option 1: refetch from backend
            await fetchUsers();

            // Option 2 (optional): update state locally
            // setUsers((prev) => prev.filter((u) => u.id !== id));

            alert('User deleted successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('There was an error deleting the user.');
        }
    };

    return (
        <div className="userlist-container">
            <h2>Our Team</h2>

            {/* Edit form */}
            {editingUser && (
                <div className="edit-user-form" style={{ marginBottom: '1.5rem' }}>
                    <h3>Edit User: {editingUser.name}</h3>
                    <form onSubmit={handleEditSubmit}>
                        <div>
                            <label>
                                Name:{' '}
                                <input
                                    type="text"
                                    name="name"
                                    value={editingUser.name}
                                    onChange={handleEditChange}
                                    required
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Username:{' '}
                                <input
                                    type="text"
                                    name="username"
                                    value={editingUser.username}
                                    onChange={handleEditChange}
                                    required
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Email:{' '}
                                <input
                                    type="email"
                                    name="email"
                                    value={editingUser.email}
                                    onChange={handleEditChange}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Phone:{' '}
                                <input
                                    type="tel"
                                    name="phone"
                                    value={editingUser.phone}
                                    onChange={handleEditChange}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Position:{' '}
                                <input
                                    type="text"
                                    name="position"
                                    value={editingUser.position}
                                    onChange={handleEditChange}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Role:{' '}
                                <input
                                    type="text"
                                    name="role"
                                    value={editingUser.role}
                                    onChange={handleEditChange}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Pay Method:{' '}
                                <input
                                    type="text"
                                    name="preferred_payment_method"
                                    value={editingUser.preferred_payment_method}
                                    onChange={handleEditChange}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Pay Details:{' '}
                                <input
                                    type="text"
                                    name="payment_details"
                                    value={editingUser.payment_details}
                                    onChange={handleEditChange}
                                />
                            </label>
                        </div>

                        <button type="submit">Save</button>
                        <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            style={{ marginLeft: '0.5rem' }}
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}

            {/* User table */}
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
                            <th>Pay Method</th>
                            <th>Pay Details</th>
                            <th>Actions</th>
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
                                <td>{user.preferred_payment_method}</td>
                                <td>{user.payment_details}</td>
                                <td>
                                    <button onClick={() => handleEditClick(user)}>Edit</button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        style={{ marginLeft: '0.5rem' }}
                                    >
                                        Delete
                                    </button>
                                </td>
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
