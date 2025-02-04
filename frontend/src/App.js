import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, Routes, Route, Link, Navigate } from 'react-router-dom';
//Public Pages
import IntakeForm from './components/Public/IntakeForm';
import CraftCocktails from './components/Public/CraftCocktails';
import BartendingCourse from './components/Public/BartendingCourse';
import BartendingClasses from './components/Public/BartendingClasses';
import TutoringIntake from './components/Public/TutoringIntake';

//RB Website Pages
import Homepage from './components/Public/RBWebsite/Homepage';
import RBLayout from './components/Public/RBWebsite/RBLayout';
import EventPackages from './components/Public/RBWebsite/EventPackages';
import BartendersCC from './components/Public/RBWebsite/BartendersCC';
import CraftsNCocktails from './components/Public/RBWebsite/CraftsNCocktails';
import ClientSchedulingPage from './components/Public/RBWebsite/ClientSchedulingPage';
import RentalsProducts from './components/Public/RBWebsite/RentalsProducts';
import CommonCocktails from './components/Public/RBWebsite/CommonCocktails';
import PrivacyPolicy from './components/Public/RBWebsite/PrivacyPolicy';
import Chatbot from './Chatbot';

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
import AdminAvailabilityPage from './components/Admin/AdminAvailabilityPage';
import Profits from './components/Admin/Profits';

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


    const [totalFormsCount, setTotalFormsCount] = useState(0);

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
        const fetchTotalFormsCount = async () => {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
            try {
                const responses = await Promise.all([
                    fetch(`${apiUrl}/api/intake-forms`),
                    fetch(`${apiUrl}/api/craft-cocktails`),
                    fetch(`${apiUrl}/api/bartending-course`),
                    fetch(`${apiUrl}/api/bartending-classes`),
                    fetch(`${apiUrl}/api/tutoring-intake`),
                ]);

                const [intakeData, cocktailsData, courseData, classesData, tutoringData] = await Promise.all(
                    responses.map((res) => (res.ok ? res.json() : []))
                );

                const totalCount =
                    (intakeData?.length || 0) +
                    (cocktailsData?.length || 0) +
                    (courseData?.length || 0) +
                    (classesData?.length || 0) +
                    (tutoringData?.length || 0);

                setTotalFormsCount(totalCount);
            } catch (error) {
                console.error('Error fetching total forms count:', error);
            }
        };

        fetchTotalFormsCount();
    }, []);

    return (
        <Router>
            <WebSocketProvider>
                <Routes>
                    {/* RB Website Routes */}
                    <Route
                        path="/rb/*"
                        element={
                            <RBLayout>
                                <Routes>
                                    <Route path="home" element={<Homepage />} />
                                    <Route path="event-staffing-packages" element={<EventPackages />} />
                                    <Route path="how-to-be-a-bartender" element={<BartendersCC />} />
                                    <Route path="crafts-cocktails" element={<CraftsNCocktails />} />
                                    <Route path="client-scheduling" element={<ClientSchedulingPage />} />
                                    <Route path="common-cocktails" element={<CommonCocktails />} />
                                    <Route path="rentals-products" element={<RentalsProducts />} />
                                    <Route path="privacy-policy" element={<PrivacyPolicy />} />
                                    {/* Add more RB-specific routes here */}
                                </Routes>
                            </RBLayout>
                        }
                    />
    
                    {/* Main App Routes */}
                    <Route
                        path="/*"
                        element={
                            <div className="app-page">
                                <AppContent
                                    userRole={userRole}
                                    handleLogout={handleLogout}
                                    onLogin={handleLogin}
                                    totalFormsCount={totalFormsCount}
                                />
                            </div>
                        }
                    />
                </Routes>
            </WebSocketProvider>
        </Router>
    );
    
}

const AppContent = ({ userRole, handleLogout, onLogin, totalFormsCount }) => {
    const username = localStorage.getItem('username');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser')) || null;
    const location = useLocation(); // Safely use location here
    const isTutoringPage = location.pathname === '/tutoring-intake';

    return (
        <div className={isTutoringPage ? 'tutoring-page-wrapper' : 'app-container'}>
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
                                    <Link to="/admin/availability-page"> Availability Page</Link> 
                                    <br></br>
                                    <Link to="/admin/attendance"> Gig Attendance</Link> |
                                    <Link to="/admin/extra-payouts"> Extra Payouts</Link> |
                                    <Link to="/admin/payouts"> Pay to Date</Link> 
                                    <br></br>
                                    <Link to="/admin/quotes"> Quotes</Link> |
                                    <Link to="/admin/payment-form"> Payment Form</Link> |
                                    <Link to="/admin/profits"> Profits</Link>
                                    <br></br>
                                    <Link to="/admin/mytasks"> My Tasks</Link> |
                                    <Link to="/admin/intake-forms"> Intake Forms {totalFormsCount > 0 && (<span className="notification-badge"> {totalFormsCount}</span>)}</Link> |
                                    <Link to="/admin/userlist"> Users List</Link> |
                                    <Link to="/admin/clients"> Clients</Link>
                                    <br></br>
                                    <Link to="/admin/inventory"> Inventory</Link> |
                                    <Link to="/admin/cocktails-ingredient"> Cocktails & Ingredients</Link> |
                                    <Link to="/admin/assistant-hub"> Assistant Hub</Link> 
                                    <br></br>
                                    
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
                <Route path="/chatbot" element={<Chatbot />} />
                <Route path="/rb/home" element={<Homepage />} />
                <Route path="/intake-form" element={<IntakeForm />} />
                <Route path="/bartending-course" element={<BartendingCourse />} />
                <Route path="/bartending-classes" element={<BartendingClasses />} />
                <Route path="/craft-cocktails" element={<CraftCocktails />} />
                <Route path="/tutoring-intake" element={<TutoringIntake />} />
                <Route path="/admin" element={userRole === 'admin' ? <AdminGigs /> : <Navigate to="/login" />} />
                <Route path="/gigs" element={userRole === 'user' ? <UserGigs /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/rb/home" />} />
                <Route path="/admin/attendance" element={userRole === 'admin' ? <GigAttendance /> : <Navigate to="/login" />} />
                <Route path="/admin/scheduling-page" element={<SchedulingPage />} />
                <Route path="/admin/availability-page" element={<AdminAvailabilityPage />} />
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
                <Route path="/admin/profits" element={userRole === 'admin' ? <Profits />: <Navigate to="/login" />} />
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

