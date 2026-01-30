import React, { useEffect, useMemo, useState } from 'react';

const UserList = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  // ✅ staff/vendor toggle
  const [viewMode, setViewMode] = useState('staff'); // 'staff' | 'vendor'

  // ✅ add vendor modal
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_payment_method: '',
    payment_details: '',
    position: 'Vendor',
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();

      const sortedUsers = (data || []).sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );

      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // Filter displayed users based on toggle
  const displayedUsers = useMemo(() => {
    if (viewMode === 'vendor') {
      return users.filter((u) => (u.role || '').toLowerCase() === 'vendor');
    }
    // staff view = everything except vendors
    return users.filter((u) => (u.role || '').toLowerCase() !== 'vendor');
  }, [users, viewMode]);

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

  // ✅ Add Vendor submit
  const handleVendorField = (e) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };

  const submitNewVendor = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${apiUrl}/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      setShowAddVendor(false);
      setNewVendor({
        name: '',
        email: '',
        phone: '',
        preferred_payment_method: '',
        payment_details: '',
        position: 'Vendor',
      });

      await fetchUsers();
      setViewMode('vendor');
      alert('Vendor added!');
    } catch (err) {
      console.error('Add vendor failed:', err);
      alert('Failed to add vendor. Check name/email/username conflicts.');
    }
  };

  return (
    <div className="userlist-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>{viewMode === 'vendor' ? 'Vendors' : 'Our Team'}</h2>

        {/* ✅ Staff/Vendor toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('staff')}
            style={{
              fontWeight: viewMode === 'staff' ? 700 : 400,
              opacity: viewMode === 'staff' ? 1 : 0.75,
            }}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setViewMode('vendor')}
            style={{
              fontWeight: viewMode === 'vendor' ? 700 : 400,
              opacity: viewMode === 'vendor' ? 1 : 0.75,
            }}
          >
            Vendors
          </button>

          {/* ✅ Add Vendor button (only in vendor mode) */}
          {viewMode === 'vendor' && (
            <button type="button" onClick={() => setShowAddVendor(true)} style={{ marginLeft: 8 }}>
              + Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* ✅ Add Vendor modal */}
      {showAddVendor && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 10,
            background: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Add Vendor</h3>

          <form onSubmit={submitNewVendor} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <label>
              Name*
              <input name="name" value={newVendor.name} onChange={handleVendorField} required />
            </label>

            <label>
              Email
              <input name="email" value={newVendor.email} onChange={handleVendorField} />
            </label>

            <label>
              Phone
              <input name="phone" value={newVendor.phone} onChange={handleVendorField} />
            </label>

            <label>
              Pay Method
              <input
                name="preferred_payment_method"
                value={newVendor.preferred_payment_method}
                onChange={handleVendorField}
                placeholder="Cash App, Zelle, Venmo..."
              />
            </label>

            <label>
              Pay Details
              <input
                name="payment_details"
                value={newVendor.payment_details}
                onChange={handleVendorField}
                placeholder="$cashtag, email, phone, etc."
              />
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit">Save Vendor</button>
              <button type="button" onClick={() => setShowAddVendor(false)}>
                Cancel
              </button>
            </div>

            <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
              Vendors are saved as users with role = <b>vendor</b> (no login needed).
            </p>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingUser && (
        <div className="edit-user-form" style={{ margin: '1.5rem 0' }}>
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
                  <input type="text" name={field} value={editingUser[field]} onChange={handleEditChange} />
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

      {/* Users table */}
      {displayedUsers.length > 0 ? (
        <div className="table-container" style={{ marginTop: 16 }}>
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
              {displayedUsers.map((user) => (
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
                    <button onClick={() => handleDelete(user.id)} style={{ marginLeft: '0.5rem' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-users" style={{ marginTop: 16 }}>
          No {viewMode === 'vendor' ? 'vendors' : 'users'} found.
        </p>
      )}
    </div>
  );
};

export default UserList;
