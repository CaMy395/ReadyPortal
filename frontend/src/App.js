import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, Routes, Route, Link, Navigate } from 'react-router-dom';

import ScrollToTop from "./ScrollToTop"; // adjust the path if needed

// Public Pages
import IntakeForm from './components/Public/IntakeForm';
import CraftCocktails from './components/Public/CraftCocktails';
import BartendingCourse from './components/Public/BartendingCourse';
import BartendingClasses from './components/Public/BartendingClasses';
import MixNsip from './components/Public/MixNsip';

// RB Website Pages
import Homepage from './components/Public/RBWebsite/Homepage';
import RBLayout from './components/Public/RBWebsite/RBLayout';
import EventPackages from './components/Public/RBWebsite/EventPackages';
import BartendersCC from './components/Public/RBWebsite/BartendersCC';
import CraftsNCocktails from './components/Public/RBWebsite/CraftsNCocktails';
import MixNSip from './components/Public/RBWebsite/MixNSip';
import ClientSchedulingPage from './components/Public/RBWebsite/ClientSchedulingPage';
import ClientPage from './components/Public/RBWebsite/ClientPage';
import ClientSchedulingSuccess from './components/Public/RBWebsite/ClientSchedulingSuccess';
import ClientSaveCardPage from './components/Public/RBWebsite/ClientSaveCardPage';
import RentalsProducts from './components/Public/RBWebsite/RentalsProducts';
import CommonCocktails from './components/Public/RBWebsite/CommonCocktails';
import SignatureCocktails from './components/Public/RBWebsite/SignatureCocktails';
import PaymentPage from './components/Public/RBWebsite/Payment';
import PrivacyPolicy from './components/Public/RBWebsite/PrivacyPolicy';
import Apply from './components/Public/RBWebsite/Apply';
import Chatbot from './Chatbot';

// Home Pages
import Register from './components/Homepage/Register';
import Login from './components/Homepage/Login';
import ForgotPassword from './components/Homepage/ForgotPassword';
import ResetPassword from './components/Homepage/ResetPassword';

// Admin Pages
import AdminGigs from './components/Admin/AdminGigs';
import UserList from './components/Admin/UserList';
import MyTasks from './components/Admin/MyTasks';
import AdminsGigs from './components/Admin/AdminsGigs';
import AdminBackfillClassSessions  from './components/Admin/AdminBackfillClassSessions';
import AdminClassRoster  from './components/Admin/AdminClassRoster';
import StudentSignIn  from './components/Admin/StudentSignIn';
import UpcomingGigs from './components/Admin/UpcomingGigs';
import Payouts from './components/Admin/Payouts';
import PlaidLinkButton from './components/Admin/CCTransaction';
import ExtraPayouts from './components/Admin/ExtraPayouts';
import ExtraIncome from './components/Admin/ExtraIncome';
import Quotes from './components/Admin/Quotes';
import AdminQuotesDashboard from './components/Admin/AdminQuotesDashboard';
import Inventory from './components/Admin/Inventory';
import GigAttendance from './components/Admin/GigAttendance';
import AdminIntakeForms from './components/Admin/AdminIntakeForms';
import Clients from './components/Admin/Clients';
import PaymentForm from './components/Admin/PaymentForm';
import SchedulingPage from './components/Admin/SchedulingPage';
import AdminAvailabilityPage from './components/Admin/AdminAvailabilityPage';
import Profits from './components/Admin/Profits';
import QuotesPreviewPage from './components/Admin/QuotesPreviewPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminSavedCardsPage from './components/Admin/AdminSavedCardsPage';
import AdminEmailCampaign from './components/Admin/AdminEmailCampaign';
import Expenses from './components/Admin/Expenses';

// User pages
import YourGigs from './components/User/YourGigs';
import MyPayouts from './components/User/MyPayouts'
import TheTeam from './components/User/TheTeam';
import UserGigs from './components/User/UserGigs';
import UserAttendance from './components/User/UserAttendance';
import CocktailsIngredient from './components/User/Cocktails_Ingredients';
import WebSocketProvider from './WebSocketProvider';
import UserDashboard from './components/User/UserDashboard';

import './App.css';
import StaffW9Gate from './StaffW9Gate';
import { createRoot } from 'react-dom/client';

// Student Pages
import FlashcardsPage from "./components/Students/FlashcardsPage";
import StudentDashboard from './components/Students/StudentDashboard';

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
    localStorage.removeItem('userId');           // keep session tidy
    localStorage.removeItem('loggedInUser');     // keep session tidy
    localStorage.removeItem('role');             // legacy key cleanup
  };

  useEffect(() => {
    const fetchTotalFormsCount = async () => {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      try {
        const responses = await Promise.all([
          fetch(`${apiUrl}/api/intake-forms`),
          fetch(`${apiUrl}/api/craft-cocktails`),
          fetch(`${apiUrl}/api/mix-n-sip`),
          fetch(`${apiUrl}/api/bartending-course`),
          fetch(`${apiUrl}/api/bartending-classes`),
        ]);

        const [intakeData, cocktailsData, mixnsipData, courseData, classesData] = await Promise.all(
          responses.map((res) => (res.ok ? res.json() : []))
        );

        const totalCount =
          (intakeData?.length || 0) +
          (cocktailsData?.length || 0) +
          (mixnsipData?.length || 0) +
          (courseData?.length || 0) +
          (classesData?.length || 0);

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
        <ScrollToTop />
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
                  <Route path="mix-n-sip" element={<MixNSip />} />
                  <Route path="client-page" element={<ClientPage />} />
                  <Route path="client-scheduling" element={<ClientSchedulingPage />} />
                  <Route path="client-scheduling-success" element={<ClientSchedulingSuccess />} />
                  <Route path="common-cocktails" element={<CommonCocktails />} />
                  <Route path="signature-cocktails" element={<SignatureCocktails />} />
                  <Route path="payment" element={<PaymentPage />} />
                  <Route path="rentals-products" element={<RentalsProducts />} />
                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="apply" element={<Apply />} />
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
};

const AppContent = ({ userRole, handleLogout, onLogin, totalFormsCount }) => {
  const username = localStorage.getItem("username");
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const [me, setMe] = useState(null);

  // inside AppContent in App.js
const fetchMe = async () => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const logged = JSON.parse(localStorage.getItem('loggedInUser')) || null;
    if (!logged?.id && !logged?.username) return;

    const qs = logged.id
      ? `?id=${encodeURIComponent(logged.id)}`
      : `?username=${encodeURIComponent(logged.username)}`;

    const res = await fetch(`${apiUrl}/api/me${qs}`, { credentials: 'include' });
    if (res.ok) setMe(await res.json());
  } catch (e) {
    console.error('fetch /api/me failed', e);
  }
};



  useEffect(() => { fetchMe(); }, []);

  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  return (
    <div className={"app-container"}>
      {/* Navigation menu */}
      {userRole && (
        <nav className="app-nav">
          <div className="nav-left">
            <span className="welcome-message">Hi, {username || "User"}</span>
          </div>
          <div className="nav-center">
            <ul className="menu">
              {userRole === "admin" ? (
                <>
                  <Link to="/admin/dashboard">Home</Link>

                  {/* Gigs Dropdown */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("gigs")}>Gigs </span>
                    {openDropdown === "gigs" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/add-gigs">Add Gigs</Link></li>
                        <li><Link to="/admin/admins-gigs">My Gigs</Link></li>
                        <li><Link to="/admin/upcoming-gigs">Upcoming Gigs</Link></li>
                        <li><Link to="/admin/scheduling-page">Scheduling Page</Link></li>
                        <li><Link to="/admin/availability-page">Availability Page</Link></li>
                        <li><Link to="/admin/attendance">Gig Attendance</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* Finance Dropdown */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("finance")}>Finance </span>
                    {openDropdown === "finance" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/quotes">Quotes</Link></li>
                        <li><Link to="/admin/quotes-dashboard">All Quotes</Link></li>
                        <li><Link to="/admin/extra-income">Extra Income</Link></li>
                        <li><Link to="/admin/extra-payouts">Extra Payouts</Link></li>
                        <li><Link to="/admin/expenses">Business Expenses</Link></li>
                        <li><Link to="/admin/payment-form">Payment Form</Link></li>
                        <li><Link to="/admin/payouts">Pay to Date</Link></li>
                        <li><Link to="/admin/saved-cards">Charge Card on File</Link></li>
                        <li><Link to="/admin/profits">Profits</Link></li>
                        <li><Link to="/admin/transactions">Transactions</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* Tasks & Forms */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("tasks")}>Tasks & Forms </span>
                    {openDropdown === "tasks" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/mytasks">My Tasks</Link></li>
                        <li>
                          <Link to="/admin/intake-forms">
                            Intake Forms{" "}
                            {totalFormsCount > 0 && (
                              <span className="notification-badge">{totalFormsCount}</span>
                            )}
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>

                  {/* Inventory & Cocktails */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("inventory")}>Inventory & Ingredients </span>
                    {openDropdown === "inventory" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/inventory">Inventory</Link></li>
                        <li><Link to="/admin/cocktails-ingredient">Cocktails & Ingredients</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* Clients & Users */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("clients")}>Clients & Staff </span>
                    {openDropdown === "clients" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/clients">Clients</Link></li>
                        <li><Link to="/admin/userlist">Staff</Link></li>
                        <li><Link to="/admin/class-roster">Course Roster</Link></li>
                        <li><Link to="/admin/sign-in">Student Sign-in</Link></li>
                        <li><Link to="/admin/email-campaign">Email Campaign</Link></li>

                      </ul>
                    )}
                  </li>
                </>
              ) : userRole === "student" ? (
                // >>> student nav
                <ul className="menu">
                  <li>
                    <Link to="/student/dashboard">Home</Link> |
                    <Link to="/student/gigs"> Gigs</Link> |
                    <Link to="/student/mygigs"> My Gigs</Link> |
                    <Link to="/student/flashcards"> Study</Link>
                  </li>
                </ul>
                // <<< student nav
              ) : (
                // user nav
                <ul className="menu">
                  <li>
                    <Link to="/gigs/dashboard">Home</Link> |
                    <Link to="/gigs"> Gigs</Link> |
                    <Link to="/gigs/your-gigs"> My Gigs</Link> |
                    <Link to="/gigs/user-attendance"> My Attendance</Link> |
                    <Link to="/gigs/my-payouts"> My Payouts</Link> |
                    <Link to="/gigs/team-list"> The Team</Link> |
                    <Link to="/gigs/cocktails-ingredients"> Cocktails & Ingredients</Link>
                  </li>
                </ul>
              )}
            </ul>
          </div>

          <div className="nav-right">
            <button className="logout-button" onClick={() => window.location.href = "/rb/home"}>
              Ready Site
            </button>
          </div>

          <div className="nav-right">
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* 👇 force staff to upload W‑9 if required (staff only) */}
      
{me && me.role === 'user' && (
  <StaffW9Gate
    apiUrl={apiUrl}
    currentUser={me}
    onW9Complete={fetchMe}
    allowedRoles={['user']}   // admins won’t ever be gated
  />
)}


      <ScrollToTop />

      {/* Routes */}
      <Routes>
        {/* Auth */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public shortcuts */}
        <Route path="/client/preferences" element={<ClientPage />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/rb/home" element={<Homepage />} />
        <Route path="/intake-form" element={<IntakeForm />} />
        <Route path="/bartending-course" element={<BartendingCourse />} />
        <Route path="/bartending-classes" element={<BartendingClasses />} />
        <Route path="/craft-cocktails" element={<CraftCocktails />} />
        <Route path="/mix-n-sip" element={<MixNsip />} />
        <Route path="/save-card" element={<ClientSaveCardPage />} />

        {/* Admin */}
        <Route path="/admin/add-gigs" element={userRole === 'admin' ? <AdminGigs /> : <Navigate to="/login" />} />
        <Route path="/admin/attendance" element={userRole === 'admin' ? <GigAttendance /> : <Navigate to="/login" />} />
        <Route path="/admin/scheduling-page" element={<SchedulingPage />} />
        <Route path="/admin/availability-page" element={<AdminAvailabilityPage />} />
        <Route path="/admin/clients" element={userRole === 'admin' ? <Clients /> : <Navigate to="/login" />} />
        <Route path="/admin/intake-forms" element={userRole === 'admin' ? <AdminIntakeForms />: <Navigate to="/login" />} />
        <Route path="/admin/cocktails-ingredient" element={userRole === 'admin' ? <CocktailsIngredient /> : <Navigate to="/login" />} />
        <Route path="/admin/admins-gigs" element={userRole === 'admin' ? <AdminsGigs /> : <Navigate to="/login" />} />
        <Route path="/admin/payment-form" element={userRole === 'admin' ? <PaymentForm /> : <Navigate to="/login" />} />
        <Route path="/admin/userlist" element={userRole === 'admin' ? <UserList /> : <Navigate to="/login" />} />
        <Route path="/admin/mytasks" element={userRole === 'admin' ? <MyTasks /> : <Navigate to="/login" />} />
        <Route path="/admin/quotes" element={userRole === 'admin' ? <Quotes hideNavigation={true} /> : <Navigate to="/login" />} />
        <Route path="/admin/quote-preview/:id" element={userRole === 'admin' ? <QuotesPreviewPage /> : <Navigate to="/login" />} />
        <Route path="/admin/quotes-dashboard" element={userRole === 'admin' ? <AdminQuotesDashboard />: <Navigate to="/login" />} />
        <Route path="/admin/payouts" element={userRole === 'admin' ? <Payouts /> : <Navigate to="/login" />} />
        <Route path="/admin/transactions" element={userRole === 'admin' ? <PlaidLinkButton /> : <Navigate to="/login" />} />
        <Route path="/admin/extra-income" element={userRole === 'admin' ? <ExtraIncome /> : <Navigate to="/login" />} />
        <Route path="/admin/extra-payouts" element={userRole === 'admin' ? <ExtraPayouts /> : <Navigate to="/login" />} />
        <Route path="/admin/expenses" element={userRole === 'admin' ? <Expenses /> : <Navigate to="/login" />} />
        <Route path="/admin/upcoming-gigs" element={userRole === 'admin' ? <UpcomingGigs /> : <Navigate to="/login" />} />
        <Route path="/admin/inventory" element={userRole === 'admin' ? <Inventory /> : <Navigate to="/login" />} />
        <Route path="/admin/profits" element={userRole === 'admin' ? <Profits />: <Navigate to="/login" />} />
        <Route path="/admin/class-roster" element={userRole === 'admin' ? <AdminClassRoster />: <Navigate to="/login" />} />
        <Route path="/admin/sign-in" element={userRole === 'admin' ? <StudentSignIn />: <Navigate to="/login" />} />
        <Route path="/admin/backfill-classes" element={userRole === 'admin' ? <AdminBackfillClassSessions />: <Navigate to="/login" />} />
        <Route path="/admin/dashboard" element={userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
        <Route path="/admin/saved-cards" element={userRole === 'admin' ?<AdminSavedCardsPage /> : <Navigate to="/login" />}  />
        <Route path="/admin/email-campaign" element={userRole === 'admin' ?<AdminEmailCampaign />:<Navigate to="/login"/>} />

        {/* User */}
        <Route path="/gigs/dashboard" element={userRole === 'user' ? <UserDashboard /> : <Navigate to="/login" />} />
        <Route path="/gigs/your-gigs" element={userRole === 'user' ? <YourGigs /> : <Navigate to="/login" />} />
        <Route path="/gigs/user-attendance" element={userRole === 'user' ? <UserAttendance userId={loggedInUser?.id} /> : <Navigate to="/login" />} />
        <Route path="/gigs/team-list" element={userRole === 'user' ? <TheTeam /> : <Navigate to="/login" />} />
        <Route path="/gigs/my-payouts" element={userRole === 'user' ? <MyPayouts /> : <Navigate to="/login" />} />
        <Route path="/gigs" element={userRole === 'admin' ? <AdminGigs /> : userRole === 'user' ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/gigs/cocktails-ingredients" element={userRole === 'user' ? <CocktailsIngredient /> : <Navigate to="/login" />} />

        {/* >>> student routes */}
        <Route path="/student/dashboard" element={userRole === 'student' ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/student/attendance" element={userRole === 'student' ? <UserAttendance userId={loggedInUser?.id} /> : <Navigate to="/login" />} />
        <Route path="/student/gigs" element={userRole === 'student' ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/student/mygigs" element={userRole === 'student' ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/student" element={userRole === 'student' ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/student/flashcards" element={userRole === 'student' ? <FlashcardsPage /> : <Navigate to="/login" />} />

        {/* <<< student routes */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/rb/home" />} />
      </Routes>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  // Keep a single WebSocketProvider (we already use it inside <App />)
  <App />
);

export default App;
