import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import UserGigs from './components/UserGigs'; // User gigs page component
import AdminGigs from './components/AdminGigs'; // Admin gigs page component
import GigAttendance from './components/GigAttendance';  // Adjust the path as necessary
import YourGigs from './components/YourGigs';  // Adjust the path as necessary
import UserList from './components/UserList';  // Adjust the path as necessary
import MyTasks from './components/MyTasks';  // Adjust the path as necessary
import './App.css';

const App = () => {
    const [userRole, setUserRole] = useState(() => {
        return localStorage.getItem('userRole'); // Retrieve role from local storage
    });

    const handleLogin = (role) => {
        setUserRole(role);
        localStorage.setItem('userRole', role);
    };

    const handleLogout = () => {
        setUserRole(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('username'); // Remove username on logout
    };

    return (
        <Router>
            <AppContent userRole={userRole} handleLogout={handleLogout} onLogin={handleLogin} />
        </Router>
    );
};

const AppContent = ({ userRole, handleLogout, onLogin }) => {
    const location = useLocation();
    const hideHeader = location.pathname === '/register' || location.pathname === '/login'; // Show header only on register and login pages
    const username = localStorage.getItem('username'); // Get the username from localStorage

    return (
        <div>
            {/* Conditionally render header and nav links only on Register and Login pages */}
            {hideHeader && (
                <>
                    <h1>Ready Gigs Portal</h1>
                    <nav>
                        <Link to="/register">Register</Link> | 
                        <Link to="/login"> Login</Link>
                    </nav>
                </>
            )}

            {/* Render Logout button and "Hi <name>" on other pages */}
            {!hideHeader && userRole && (
                <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {username && <span>Hi, {username}</span>}
                    </div>
                    <button onClick={handleLogout}>Logout</button>
                </nav>
            )}

            {/* Routes for different pages */}
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login onLogin={onLogin} />} />

                {/* Admin route */}
                <Route path="/admin" element={userRole === 'admin' ? <AdminGigs /> : <Navigate to="/login" />} />

                {/* Admin route with internal navigation for Gig Attendance and Your Gigs */}
                <Route path="/admin/*" element={userRole === 'admin' ? <AdminGigs /> : <Navigate to="/login" />} />
 
                {/* Individual routes for "Gig Attendance" and "Your Gigs" */}
                <Route path="/admin/attendance" element={userRole === 'admin' ? <GigAttendance /> : <Navigate to="/login" />} />
                <Route path="/admin/your-gigs" element={userRole === 'admin' ? <YourGigs /> : <Navigate to="/login" />} />
                <Route path="/admin/userlist" element={userRole === 'admin' ? <UserList /> : <Navigate to="/login" />} />
                <Route path="/admin/mytasks" element={userRole === 'admin' ? <MyTasks /> : <Navigate to="/login" />} />

                {/* Admin route with internal navigation for Gig Attendance and Your Gigs */}
                <Route path="/gigs/*" element={userRole === 'user' ? <UserGigs /> : <Navigate to="/login" />} />
                {/* Individual routes for "Your Gigs" */}
                <Route path="/gigs/your-gigs" element={userRole === 'user' ? <YourGigs /> : <Navigate to="/login" />} />


                {/* Gigs route with role-based conditional rendering */}
                <Route path="/gigs" element={
                    userRole === 'admin' ? <AdminGigs /> 
                    : userRole === 'user' ? <UserGigs /> 
                    : <Navigate to="/login" />
                } />

                {/* Catch-all route: Redirect any undefined routes to "/login" */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </div>
    );
};

export default App;