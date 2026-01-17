import React, { useEffect, useState } from 'react';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Fetch users
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

  // Edit handlers
  const handleEditClick = (user) => {
    setEditingUser({
      ...user,
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

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch(`${apiUrl}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(text);
      }

      await fetchUsers();
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('There was an error updating the user.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete user');

      await fetchUsers();
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('There was an error deleting the user.');
    }
  };

  return (
    <div className="userlist-container">
      <h2>Our Team</h2>

      {/* Edit Form */}
      {editingUser && (
        <div className="edit-user-form" style={{ marginBottom: '1.5rem' }}>
          <h3>Edit User: {editingUser.name}</h3>

          <form onSubmit={handleEditSubmit}>
            {[
              ['name', 'Name'],
              ['username', 'Username'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['position', 'Position'],
              ['role', 'Role'],
              ['preferred_payment_method', 'Pay Method'],
              ['payment_details', 'Pay Details'],
            ].map(([field, label]) => (
              <div key={field}>
                <label>
                  {label}:{' '}
                  <input
                    type="text"
                    name={field}
                    value={editingUser[field]}
                    onChange={handleEditChange}
                  />
                </label>
              </div>
            ))}

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

      {/* ✅ TABLE WRAPPED FOR MOBILE SCROLL */}
      {users.length > 0 ? (
        <div className="table-container">
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
        </div>
      ) : (
        <p className="no-users">No users found.</p>
      )}
    </div>
  );
};

export default UserList;
