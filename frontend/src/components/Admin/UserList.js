import { Link  } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    // Fetch the list of users from the backend
    useEffect(() => {
        fetch(`${apiUrl}/users`) // Change this to 3001
            .then(response => response.json())
            .then(data => {
                console.log('Fetched users:', data); // Debugging log
                setUsers(data);
            })
            .catch(error => console.error('Error fetching users:', error));
    }, [apiUrl]);
     // Empty array means this runs once after the component mounts

    
     return (
        <div className="user-gigs-container">
             <h2>Registered Users</h2>
 
             {/* Navigation menu */}
             <nav>
                 <ul>
                     <li>
                         <Link to="/admin">Home</Link> |
                         <Link to="/admin/attendance"> Gig Attendance</Link> |
                         <Link to="/admin/your-gigs"> Your Gigs</Link>
                     </li>
                 </ul>
             </nav>
 
    
            {users.length > 0 ? (
                <ul>
                    {users.map(user => (
                        <li key={user.id}>
                            {user.name} - {user.username}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No users found.</p>
            )}
        </div>
    );
};

export default UserList;
