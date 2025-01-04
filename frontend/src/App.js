import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
//Public Pages
import IntakeForm from './components/Public/IntakeForm';
import CraftCocktails from './components/Public/CraftCocktails';
import BartendingCourse from './components/Public/BartendingCourse';
import BartendingClasses from './components/Public/BartendingClasses';
//Home Pages
import Register from './components/Homepage/Register';
import Login from './components/Homepage/Login';
import ForgotPassword from './components/Homepage/ForgotPassword';
import ResetPassword from './components/Homepage/ResetPassword';
//Admin Pages
import AdminGigs from './components/Admin/AdminGigs';
import UserList from './components/Admin/UserList';
import MyTasks from './components/Admin/MyTasks';
import AdminsGigs from './components/Admin/AdminsGigs';
import UpcomingGigs from './components/Admin/UpcomingGigs';
import Payouts from './components/Admin/Payouts';
import ExtraPayouts from './components/Admin/ExtraPayouts';
import Quotes from './components/Admin/Quotes';
import Inventory from './components/Admin/Inventory';
import GigAttendance from './components/Admin/GigAttendance';
import AssistantHub from './components/Admin/AssistantHub';
import AdminIntakeForms from './components/Admin/AdminIntakeForms';
import Clients from './components/Admin/Clients';
import PaymentForm from './components/Admin/PaymentForm';
import SchedulingPage from './components/Admin/SchedulingPage';
//User pages
import YourGigs from './components/User/YourGigs';
import MyPayouts from './components/User/MyPayouts'
import TheTeam from './components/User/TheTeam';
import UserGigs from './components/User/UserGigs';
import UserAttendance from './components/User/UserAttendance';
import CocktailsIngredient from './components/User/Cocktails_Ingredients';
import WebSocketProvider from './WebSocketProvider';
import './App.css';
import { createRoot } from 'react-dom/client'; // Import `createRoot`



const App = () => {
    const [userRole, setUserRole] = useState(() => {
        return localStorage.getItem('userRole');
    });
    const [intakeCount, setIntakeCount] = useState(0);

    const handleLogin = (role) => {
        setUserRole(role);
        localStorage.setItem('userRole', role);
    };

    const handleLogout = () => {
        setUserRole(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
    };

    useEffect(() => {
        const fetchIntakeFormsCount = async () => {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            try {
                const response = await fetch(`${apiUrl}/api/intake-forms`);
                if (response.ok) {
                    const data = await response.json();
                    setIntakeCount(data.length); // Update the state here
                }
            } catch (error) {
                console.error('Error fetching intake forms count:', error);
            }
        };
    
        fetchIntakeFormsCount();
    }, []);
    

    return (
        <Router>
            <div className="app-page">
                <AppContent userRole={userRole} handleLogout={handleLogout} onLogin={handleLogin} intakeCount={intakeCount}  />
            </div>
        </Router>
    );
};

const AppContent = ({ userRole, handleLogout, onLogin, intakeCount }) => {
    const username = localStorage.getItem('username');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser')) || null;

    return (
        <div className="app-container">
            {/* Navigation menu */}
            {userRole && (
                <nav className="app-nav">
                    <div className="nav-left">
                        <span className="welcome-message">Hi, {username || 'User'}</span>
                    </div>
                    <div className="nav-center">
                        {userRole === 'admin' ? (
                            <ul className="menu">
                                <li>
                                    <Link to="/admin">Home</Link> |
                                    <Link to="/admin/admins-gigs"> My Gigs</Link> |
                                    <Link to="/admin/upcoming-gigs"> Upcoming Gigs</Link> |
                                    <Link to="/admin/scheduling-page"> Scheduling Page</Link> |
                                    <Link to="/admin/quotes"> Quotes</Link> |
                                    <Link to="/admin/payment-form"> Payment Form</Link> |
                                    <Link to="/admin/payouts"> Pay to Date</Link> |
                                    <Link to="/admin/extra-payouts"> Extra Payouts</Link> |
                                    <Link to="/admin/attendance"> Gig Attendance</Link> |
                                    <Link to="/admin/mytasks"> My Tasks</Link> |
                                    <Link to="/admin/inventory"> Inventory</Link> |
                                    <Link to="/admin/intake-forms"> Intake Forms {intakeCount > 0 && (<span className="notification-badge"> {intakeCount}</span>)}</Link> |
                                    <Link to="/admin/assistant-hub"> Assistant Hub</Link> |
                                    <Link to="/admin/cocktails-ingredient"> Cocktails & Ingredients</Link> |
                                    <Link to="/admin/userlist"> Users List</Link> |
                                    <Link to="/admin/clients"> Clients</Link>
                                </li>
                            </ul>
                        ) : (
                            <ul className="menu">
                                <li>
                                    <Link to="/gigs">Home</Link> |
                                    <Link to="/gigs/your-gigs"> My Gigs</Link> |
                                    <Link to="/gigs/user-attendance"> My Attendance</Link> |
                                    <Link to="/gigs/my-payouts"> My Payouts</Link> |
                                    <Link to="/gigs/team-list"> The Team</Link> |
                                    <Link to="/gigs/cocktails-ingredients"> Cocktails & Ingredients</Link>
                                </li>
                            </ul>
                        )}
                    </div>
                    <div className="nav-right">
                        <button className="logout-button" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </nav>
            )}

            {/* Routes */}
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login onLogin={onLogin} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/intake-form" element={<IntakeForm />} />
                <Route path="/bartending-course" element={<BartendingCourse />} />
                <Route path="/bartending-classes" element={<BartendingClasses />} />
                <Route path="/craft-cocktails" element={<CraftCocktails />} />
                <Route path="/admin" element={userRole === 'admin' ? <AdminGigs /> : <Navigate to="/login" />} />
                <Route path="/gigs" element={userRole === 'user' ? <UserGigs /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to={userRole ? '/gigs' : '/login'} />} />
                <Route path="/admin/attendance" element={userRole === 'admin' ? <GigAttendance /> : <Navigate to="/login" />} />
                <Route path="/admin/scheduling-page" element={<SchedulingPage />} />
                <Route path="/admin/clients" element={userRole === 'admin' ? <Clients /> : <Navigate to="/login" />} />
                <Route path="/admin/intake-forms" element={userRole === 'admin' ? <AdminIntakeForms />: <Navigate to="/login" />} />
                <Route path="/admin/cocktails-ingredient" element={userRole === 'admin' ? <CocktailsIngredient /> : <Navigate to="/login" />} />
                <Route path="/admin/admins-gigs" element={userRole === 'admin' ? <AdminsGigs /> : <Navigate to="/login" />} />
                <Route path="/admin/payment-form" element={userRole === 'admin' ? <PaymentForm /> : <Navigate to="/login" />} />
                <Route path="/admin/userlist" element={userRole === 'admin' ? <UserList /> : <Navigate to="/login" />} />
                <Route path="/admin/assistant-hub" element={userRole === 'admin' ? <AssistantHub /> : <Navigate to="/login" />} />
                <Route path="/admin/mytasks" element={userRole === 'admin' ? <MyTasks /> : <Navigate to="/login" />} />
                <Route path="/admin/quotes" element={userRole === 'admin' ? <Quotes hideNavigation={true} /> : <Navigate to="/login" />} />
                <Route path="/admin/payouts" element={userRole === 'admin' ? <Payouts /> : <Navigate to="/login" />} />
                <Route path="/admin/extra-payouts" element={userRole === 'admin' ? <ExtraPayouts /> : <Navigate to="/login" />} />
                <Route path="/admin/upcoming-gigs" element={userRole === 'admin' ? <UpcomingGigs /> : <Navigate to="/login" />} />
                <Route path="/admin/inventory" element={userRole === 'admin' ? <Inventory /> : <Navigate to="/login" />} />
                <Route path="/gigs/your-gigs" element={userRole === 'user' ? <YourGigs /> : <Navigate to="/login" />} />
                <Route path="/gigs/user-attendance" element={userRole === 'user' ? <UserAttendance userId={loggedInUser?.id} /> : <Navigate to="/login" />} />
                <Route path="/gigs/team-list" element={userRole === 'user' ? <TheTeam /> : <Navigate to="/login" />} />
                <Route path="/gigs/my-payouts" element={userRole === 'user' ? <MyPayouts /> : <Navigate to="/login" />} />
                <Route path="/gigs" element={userRole === 'admin' ? <AdminGigs /> : userRole === 'user' ? <UserGigs /> : <Navigate to="/login" />} />
                <Route path="/gigs/cocktails-ingredients" element={userRole === 'user' ? <CocktailsIngredient /> : <Navigate to="/login" />} />
            </Routes>
        </div>
    );
};


const container = document.getElementById('root');
const root = createRoot(container); // Create a root
root.render(
    <WebSocketProvider>
        <App />
    </WebSocketProvider>
);


export default App;