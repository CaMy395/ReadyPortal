import { canOpenAdminPage, portalRole, assignedPreviewAccess } from './adminPermissions';
import AssignedAdminNav from './components/Admin/AssignedAdminNav';
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  useLocation,
  useNavigate,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import ScrollToTop from "./ScrollToTop";
import RouteSEO from "./components/RouteSEO";

// Public Pages
import IntakeForm from "./components/Public/IntakeForm";
import CraftCocktails from "./components/Public/CraftCocktails";
import BartendingCourse from "./components/Public/BartendingCourse";
import BartendingClasses from "./components/Public/BartendingClasses";
import MixNsip from "./components/Public/MixNsip";
import FeedbackFormPage from "./components/Public/FeedbackFormPage";
import RBConnectPage from "./components/Public/Connect";
import VerifyCertificate from "./components/Public/VerifyCertificate";


// RB Website Pages
import Homepage from "./components/Public/RBWebsite/Homepage";
import RBLayout from "./components/Public/RBWebsite/RBLayout";
import EventPackages from "./components/Public/RBWebsite/EventPackages";
import BartendersCC from "./components/Public/RBWebsite/BartendersCC";
import CraftsNCocktails from "./components/Public/RBWebsite/CraftsNCocktails";
import MixNSip from "./components/Public/RBWebsite/MixNSip";
import ClientSchedulingPage from "./components/Public/RBWebsite/ClientSchedulingPage";
import ClientPage from "./components/Public/RBWebsite/ClientPage";
import RentalInquiryPage from "./components/Public/RentalInquiryPage";
import ClientSchedulingSuccess from "./components/Public/RBWebsite/ClientSchedulingSuccess";
import ClientSaveCardPage from "./components/Public/RBWebsite/ClientSaveCardPage";
import RentalsProducts from "./components/Public/RBWebsite/RentalsProducts";
import CommonCocktails from "./components/Public/RBWebsite/CommonCocktails";
import SignatureCocktails from "./components/Public/RBWebsite/SignatureCocktails";
import PaymentPage from "./components/Public/RBWebsite/Payment";
import PrivacyPolicy from "./components/Public/RBWebsite/PrivacyPolicy";
import Apply from "./components/Public/RBWebsite/Apply";
import Staff from "./components/Public/RBWebsite/Staff";
import BabyShowers from "./components/Public/RBWebsite/BabyShowers";
import Weddings from "./components/Public/RBWebsite/Weddings";
import EventsPage from "./components/Public/RBWebsite/EventsPage";
import EventDetailsPage from "./components/Public/RBWebsite/EventDetailsPage";
import EventSuccessPage from "./components/Public/RBWebsite/EventSuccessPage";
import Chatbot from "./Chatbot";

// Home Pages
import Register from "./components/Homepage/Register";
import Login from "./components/Homepage/Login";
import ForgotPassword from "./components/Homepage/ForgotPassword";
import ResetPassword from "./components/Homepage/ResetPassword";

// Admin Pages
import AdminGigs from "./components/Admin/AdminGigs";
import UserList from "./components/Admin/UserList";
import MyTasks from "./components/Admin/MyTasks";
import AdminsGigs from "./components/Admin/AdminsGigs";
import AdminBackfillClassSessions from "./components/Admin/AdminBackfillClassSessions";
import AdminClassRoster from "./components/Admin/AdminClassRoster";
import StudentSignIn from "./components/Admin/StudentSignIn";
import UpcomingGigs from "./components/Admin/UpcomingGigs";
import Payouts from "./components/Admin/Payouts";
import Transactions from "./components/Admin/Transactions";
import ExtraPayouts from "./components/Admin/ExtraPayouts";
import ExtraIncome from "./components/Admin/ExtraIncome";
import Quotes from "./components/Admin/Quotes";
import AdminQuotesDashboard from "./components/Admin/AdminQuotesDashboard";
import AdminSiteContentPage from "./components/Admin/AdminSiteContentPage";
import ContentStudio from "./components/Admin/ContentStudio";
import Inventory from "./components/Admin/Inventory";
import PackageChecklist from "./components/Admin/PackageChecklist";
import GigAttendance from "./components/Admin/GigAttendance";
import AdminIntakeForms from "./components/Admin/AdminIntakeForms";
import Clients from "./components/Admin/Clients";
import PaymentForm from "./components/Admin/PaymentForm";
import SchedulingPage from "./components/Admin/SchedulingPage";
import AdminAvailabilityPage from "./components/Admin/AdminAvailabilityPage";
import Profits from "./components/Admin/Profits";
import QuotesPreviewPage from "./components/Admin/QuotesPreviewPage";
import AdminDashboard from "./components/Admin/AdminDashboard";
import AdminSavedCardsPage from "./components/Admin/AdminSavedCardsPage";
import AdminUserProfilePage from "./components/Admin/AdminProfilePage";
import AdminEmailCampaign from "./components/Admin/AdminEmailCampaign";
import Expenses from "./components/Admin/Expenses";
import AdminEventsPage from "./components/Admin/AdminEventsPage";
import AdminFeedbackPage from "./components/Admin/AdminFeedbackPage";
import AssistantHub from "./components/Admin/AssistantHub";
import AdminAccess from "./components/Admin/AdminAccess";
import LimitedInventory from "./components/Admin/LimitedInventory";
import LiveVisitors from "./components/Admin/LiveVisitors";
import ChatBox from "./components/Public/ChatBox";
import VisitorTracker from "./VisitorTracker";
import { disableVisitorPush } from "./visitorNotifications";
import { disableGigPush } from "./gigNotifications";
import { accessRequest, SESSION_EXPIRED_EVENT } from "./apiSession";

// User pages
import YourGigs from "./components/User/YourGigs";
import MyPayouts from "./components/User/MyPayouts";
import TheTeam from "./components/User/TheTeam";
import UserGigs from "./components/User/UserGigs";
import UserProfilePage from "./components/User/UserProfile";
import UserAttendance from "./components/User/UserAttendance";
import CocktailsIngredient from "./components/User/Cocktails_Ingredients";
import UserDashboard from "./components/User/UserDashboard";

import WebSocketProvider from "./WebSocketProvider";
import StaffW9Gate from "./StaffW9Gate";

import "./App.css";

// Student Pages
import FlashcardsPage from "./components/Students/FlashcardsPage";
import StudentDashboard from "./components/Students/StudentDashboard";
import { HelmetProvider } from "react-helmet-async";

const App = () => {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem("userRole");
  });

  const handleLogin = (role) => {
    setUserRole(role);
    localStorage.setItem("userRole", role);
  };

  const handleLogout = async () => {
    const cleanup = Promise.allSettled([disableVisitorPush({ logout: true }), disableGigPush({ logout: true })]);
    setUserRole(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("role");
    localStorage.removeItem("internalAuthToken");
    await cleanup;
  };

  return (
    <HelmetProvider>
    <Router>
      <WebSocketProvider>
        <ScrollToTop />
        <RouteSEO />
        <VisitorTracker />
        <Routes>
          <Route path="/rb/connect" element={<RBConnectPage />} />

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
                  <Route path="feedback/:token" element={<FeedbackFormPage />} />
                  <Route path="client-page" element={<ClientPage />} />
                  <Route path="client-scheduling" element={<ClientSchedulingPage />} />
                  <Route path="client-scheduling-success" element={<ClientSchedulingSuccess />} />
                  <Route path="client-save-card" element={<ClientSaveCardPage />} />
                  <Route path="common-cocktails" element={<CommonCocktails />} />
                  <Route path="signature-cocktails" element={<SignatureCocktails />} />
                  <Route path="payment" element={<PaymentPage />} />
                  <Route path="rentals-products" element={<RentalsProducts />} />
                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="baby-showers" element={<BabyShowers />} />
                  <Route path="weddings" element={<Weddings />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="events/:slug" element={<EventDetailsPage />} />
                  <Route path="event-success" element={<EventSuccessPage />} />
                  <Route path="apply" element={<Apply />} />
                  <Route path="rental-inquiry" element={<RentalInquiryPage />} />

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
                />
              </div>
            }
          />
        </Routes>
        <VisitorChatWidget />
      </WebSocketProvider>
    </Router>
  </HelmetProvider>
  );
};

const VisitorChatWidget = () => {
  const { pathname } = useLocation();
  return <ChatBox portal={/^\/(admin|assigned)(\/|$)/.test(pathname)} />;
};

const AppContent = ({ userRole, handleLogout, onLogin }) => {
  const username = localStorage.getItem("username");
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [me, setMe] = useState(null);
  const [adminAccess, setAdminAccess] = useState(null);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [previewRoles, setPreviewRoles] = useState([]);
  const canOpen = path => canOpenAdminPage(previewAccess, path);
  const [previewKey, setPreviewKey] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const expireSession = () => {
      if (!localStorage.getItem('userRole')) return;
      handleLogout();
      navigate('/login', { replace: true, state: { sessionExpired: true,
        ...(window.location.pathname === '/admin/live-visitors' ? { returnTo:window.location.pathname+window.location.search } : {}) } });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, [handleLogout, navigate]);
  useEffect(() => {
    if (!userRole) { setAdminAccess(null); return; }
    const refreshAccess = () => accessRequest('/me').then(setAdminAccess).catch(() => setAdminAccess(null)).finally(() => setAccessLoaded(true));
    refreshAccess();
    const timer = setInterval(refreshAccess, 60000);
    window.addEventListener('focus', refreshAccess);
    window.addEventListener('ready:access-updated', refreshAccess);
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshAccess); window.removeEventListener('ready:access-updated', refreshAccess); };
  }, [userRole]);
  useEffect(() => {
    if (!adminAccess?.fullAdmin) { setPreviewUsers([]); setPreviewKey(''); return; }
    accessRequest('/settings').then(data => { setPreviewUsers(data.users || []); setPreviewRoles(data.roles || []); }).catch(() => { setPreviewUsers([]); setPreviewRoles([]); });
  }, [userRole, adminAccess?.fullAdmin]);

  const previewUser = previewUsers.find(user => `${user.role}:${user.id}` === previewKey);
  const previewRole = previewKey === 'student:preview' ? 'student' : portalRole(previewUser);
  const previewAccess = adminAccess?.fullAdmin && previewRole ? assignedPreviewAccess(previewUser, previewRoles) : adminAccess;
  const displayRole = adminAccess?.fullAdmin ? (previewRole || 'admin') : userRole === 'admin' ? 'user' : userRole;
  const displayName = previewUser?.name || previewUser?.username || (previewRole === 'student' ? 'Student' : username || 'User');
  const changePreview = value => {
    setPreviewKey(value);
    const selected = previewUsers.find(user => `${user.role}:${user.id}` === value);
    const role = value === 'student:preview' ? 'student' : portalRole(selected);
    navigate(role === 'student' ? '/student/dashboard' : role === 'user' ? '/user/dashboard' : '/admin/dashboard');
  };

  const fetchMe = async () => {
    try {
      const logged = JSON.parse(localStorage.getItem("loggedInUser") || "null");
      if (!logged?.id && !logged?.username) return;

      const qs = logged.id
        ? `?id=${encodeURIComponent(logged.id)}`
        : `?username=${encodeURIComponent(logged.username)}`;

      const res = await fetch(`${apiUrl}/api/me${qs}`, { credentials: "include" });
      if (res.ok) setMe(await res.json());
    } catch (e) {
      console.error("fetch /api/me failed", e);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const location = useLocation();

  const [openDropdown, setOpenDropdown] = useState(null);
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  return (
    <div className={"app-container"}>
      {/* Navigation menu */}
      {userRole && (
        <nav className="app-nav">
          <div className="nav-left">
            <Link className="nav-brand" to={displayRole === "admin" ? "/admin/dashboard" : displayRole === "student" ? "/student/dashboard" : "/user/dashboard"}><span>R</span><strong>READY</strong></Link>
            <span className="welcome-message">Hi, {displayName}</span>
          </div>

          <div className="nav-center">
            <ul className="menu">
              {displayRole !== 'admin' && <AssignedAdminNav access={previewAccess} openDropdown={openDropdown} toggleDropdown={toggleDropdown} />}
              {displayRole !== 'admin' && previewAccess?.roles.some(role => role.permissions.includes('inventory.view')) && <li><Link to="/assigned/inventory">My Inventory</Link></li>}
              {displayRole === "admin" ? (
                <>
                  {/* Home Dropdown */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "home"} onClick={() => toggleDropdown("home")}>Home</button>
                    {openDropdown === "home" && (
                      <ul className="dropdown-content">
                        <li>
                          <Link to="/admin/dashboard">Home</Link>
                          <Link to="/admin/site-content">Site Editor</Link>
                          <Link to="/admin/content-studio">Content Studio</Link>
                        </li>
                        <li>
                          <Link to={`/admin/users/${loggedInUser?.id}`}>My Profile</Link>
                        </li>
                      </ul>
                    )}
                  </li>

                  {/* Schedule & Events */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "gigs"} onClick={() => toggleDropdown("gigs")}>Schedule & Events</button>
                    {openDropdown === "gigs" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/add-gigs">Add Gigs</Link></li>
                        <li><Link to="/admin/admins-gigs">My Gigs</Link></li>
                        <li><Link to="/admin/upcoming-gigs">Upcoming Gigs</Link></li>
                        <li><Link to="/admin/upcoming-events">Upcoming Events</Link></li>
                        <li><Link to="/admin/scheduling-page">Scheduling Page</Link></li>
                        <li><Link to="/admin/availability-page">Availability Page</Link></li>
                        <li><Link to="/admin/attendance">Gig Attendance</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* Finance Dropdown */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "finance"} onClick={() => toggleDropdown("finance")}>Finance</button>
                    {openDropdown === "finance" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/quotes-dashboard">Quotes &amp; Client Balances</Link></li>
                        <li><Link to="/admin/payment-form">Create Payment Link</Link></li>
                        <li><Link to="/admin/payouts">Payouts</Link></li>
                        <li><Link to="/admin/expenses">Expenses</Link></li>
                        <li><Link to="/admin/transactions">Banking &amp; Transactions (Plaid)</Link></li>
                        <li><Link to="/admin/profits">Profit &amp; Loss</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* Tasks & Forms */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "tasks"} onClick={() => toggleDropdown("tasks")}>Tasks & Forms</button>
                    {openDropdown === "tasks" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/mytasks">My Tasks</Link></li>
                        <li><Link to="/admin/intake-forms">Intake Forms</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* Inventory & Cocktails */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "inventory"} onClick={() => toggleDropdown("inventory")}>Inventory</button>
                    {openDropdown === "inventory" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/inventory">Inventory</Link></li>
                        <li><Link to="/admin/internal-checklist">Package Checklist</Link></li>
                        <li><Link to="/admin/cocktails-ingredient">Cocktails & Ingredients</Link></li>
                      </ul>
                    )}
                  </li>

                  {/* People & Training */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "clients"} onClick={() => toggleDropdown("clients")}>People & Training</button>
                    {openDropdown === "clients" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/clients">Clients</Link></li>
                        <li><Link to="/admin/userlist">Staff & Vendors</Link></li>
                        <li><Link to="/admin/access">Roles & Access</Link></li>
                        <li><Link to="/admin/feedback">Feedback</Link></li>
                        <li><Link to="/admin/class-roster">Course Roster</Link></li>
                        <li><Link to="/admin/sign-in">Student Sign-in</Link></li>
                        <li><Link to="/admin/email-campaign">Email Campaign</Link></li>
                      </ul>
                    )}
                  </li>
                </>
              ) : displayRole === "student" ? (
                <>
                  <li><Link to="/student/dashboard">Home</Link></li>
                  <li><Link to="/student/gigs">Available Gigs</Link></li>
                  <li><Link to="/student/mygigs">My Gigs</Link></li>
                  <li><Link to="/student/flashcards">Study</Link></li>
                </>
              ) : (
                <>
                  {/* USER dropdown nav (same style as admin) */}
                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "userHome"} onClick={() => toggleDropdown("userHome")}>Home</button>
                    {openDropdown === "userHome" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user/dashboard">Dashboard</Link></li>
                        <li><Link to="/user/my-profile">My Profile</Link></li>
                      </ul>
                    )}
                  </li>

                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "userGigs"} onClick={() => toggleDropdown("userGigs")}>Gigs</button>
                    {openDropdown === "userGigs" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user">Available Gigs</Link></li>
                        <li><Link to="/user/your-gigs">My Gigs</Link></li>
                        <li><Link to="/user/user-attendance">My Attendance</Link></li>
                      </ul>
                    )}
                  </li>

                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "userMoney"} onClick={() => toggleDropdown("userMoney")}>Earnings</button>
                    {openDropdown === "userMoney" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user/my-payouts">My Payouts</Link></li>
                      </ul>
                    )}
                  </li>

                  <li className="dropdown">
                    <button type="button" className="nav-dropdown-trigger" aria-expanded={openDropdown === "userTeam"} onClick={() => toggleDropdown("userTeam")}>Team & Resources</button>
                    {openDropdown === "userTeam" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user/team-list">The Team</Link></li>
                        <li><Link to="/user/cocktails-ingredients">Cocktails & Ingredients</Link></li>
                      </ul>
                    )}
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="nav-actions">
            {displayRole === 'student' && <Link className="nav-site-button" to="/my-profile">My Profile</Link>}
            {adminAccess?.fullAdmin && <label className="portal-preview-select">View as
              <select aria-label="Preview portal as" value={previewKey} onChange={event => changePreview(event.target.value)}>
                <option value="">Admin (my view)</option>
                <optgroup label="Staff & assigned roles">{previewUsers.filter(user => (user.role === 'user' || (user.role === 'admin' && user.admin_role_limited)) && user.is_active !== false).map(user => <option key={user.id} value={`${user.role}:${user.id}`}>{user.name || user.username}</option>)}</optgroup>
                <optgroup label="Students"><option value="student:preview">Generic student</option>{previewUsers.filter(user => user.role === 'student' && user.is_active !== false).map(user => <option key={user.id} value={`student:${user.id}`}>{user.name || user.username}</option>)}</optgroup>
              </select>
            </label>}
            <button
              className="nav-site-button"
              onClick={() => (window.location.href = "/rb/home")}
            >
              Ready Site
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
            {!previewRole && userRole === 'admin' && adminAccess && <Link className="nav-site-button" to="/admin/live-visitors">Live visitors & chat</Link>}
          </div>
        </nav>
      )}
      {adminAccess?.fullAdmin && previewRole && <div className="portal-preview-banner" role="status"><strong>UI preview:</strong> viewing the {previewRole} portal as {displayName}. Your admin login and permissions have not changed. <button type="button" onClick={() => changePreview('')}>Return to admin view</button></div>}

      {/* force staff onboarding gate */}
      {me && me.role === "user" && me.needs_staff_onboarding && (
        <StaffW9Gate
          apiUrl={apiUrl}
          currentUser={me}
          onW9Complete={fetchMe}
          allowedRoles={["user"]}
        />
      )}

      <ScrollToTop />

      <Routes>
        <Route path="/my-profile" element={userRole ? <UserProfilePage /> : <Navigate to="/login" />} />
        {/* Auth */}
        <Route path="/staff/onboarding/register" element={<Register />}/>        
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public shortcuts */}
        <Route path="/client/preferences" element={<ClientPage />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/intake-form" element={<IntakeForm />} />
        <Route path="/bartending-course" element={<BartendingCourse />} />
        <Route path="/bartending-classes" element={<BartendingClasses />} />
        <Route path="/craft-cocktails" element={<CraftCocktails />} />
        <Route path="/mix-n-sip" element={<MixNsip />} />
        <Route path="/save-card" element={<ClientSaveCardPage />} />
        <Route path="/verify/:token"element={<VerifyCertificate />}/>
        <Route path="/staff" element={<Staff />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailsPage />} />
        <Route path="/events/success" element={<EventSuccessPage />} />
        <Route path="/connect" element={<RBConnectPage />} />

        {/* Admin */}
        <Route path="/admin/add-gigs" element={canOpen('/admin/add-gigs') ? <AdminGigs /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/upcoming-events" element={canOpen('/admin/upcoming-events') ? <AdminEventsPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/attendance" element={canOpen('/admin/attendance') ? <GigAttendance /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/scheduling-page" element={canOpen('/admin/scheduling-page') ? <SchedulingPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/availability-page" element={canOpen('/admin/availability-page') ? <AdminAvailabilityPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/content-studio" element={canOpen('/admin/content-studio') ? <ContentStudio /> : (userRole ? <p role="status" style={{padding:24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/site-content" element={canOpen('/admin/site-content') ? <AdminSiteContentPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)}/>
        <Route path="/admin/clients" element={canOpen('/admin/clients') ? <Clients /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/intake-forms" element={canOpen('/admin/intake-forms') ? <AdminIntakeForms /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/cocktails-ingredient" element={canOpen('/admin/cocktails-ingredient') ? <CocktailsIngredient /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/admins-gigs" element={canOpen('/admin/admins-gigs') ? <AdminsGigs /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/payment-form" element={canOpen('/admin/payment-form') ? <PaymentForm /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/userlist" element={canOpen('/admin/userlist') ? <UserList /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/mytasks" element={canOpen('/admin/mytasks') ? <MyTasks /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/quotes" element={canOpen('/admin/quotes') ? <Quotes hideNavigation={true} /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/quote-preview/:id" element={canOpen('/admin/quote-preview/:id') ? <QuotesPreviewPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/quotes-dashboard" element={canOpen('/admin/quotes-dashboard') ? <AdminQuotesDashboard /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/payouts" element={canOpen('/admin/payouts') ? <Payouts /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/transactions" element={canOpen('/admin/transactions') ? <Transactions /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/plaid" element={canOpen('/admin/plaid') ? <Transactions /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/extra-income" element={canOpen('/admin/extra-income') ? <ExtraIncome /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/extra-payouts" element={canOpen('/admin/extra-payouts') ? <ExtraPayouts /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/expenses" element={canOpen('/admin/expenses') ? <Expenses /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/upcoming-gigs" element={canOpen('/admin/upcoming-gigs') ? <UpcomingGigs /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/inventory" element={canOpen('/admin/inventory') ? <Inventory /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/access" element={canOpen('/admin/access') ? <AdminAccess /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/assigned/inventory" element={userRole ? <LimitedInventory /> : <Navigate to="/login" />} />
        <Route path="/admin/internal-checklist" element={canOpen('/admin/internal-checklist') ? <PackageChecklist /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/profits" element={canOpen('/admin/profits') ? <Profits /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/class-roster" element={canOpen('/admin/class-roster') ? <AdminClassRoster /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/sign-in" element={canOpen('/admin/sign-in') ? <StudentSignIn /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/backfill-classes" element={canOpen('/admin/backfill-classes') ? <AdminBackfillClassSessions /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/dashboard" element={canOpen('/admin/dashboard') ? <AdminDashboard canViewFinance={canOpen('/admin/profits')} /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/live-visitors" element={userRole === 'admin' && adminAccess ? <LiveVisitors /> : userRole ? <p role="status" style={{padding:24}}>{accessLoaded ? 'Admin access is required.' : 'Loading your access…'}</p> : <Navigate to="/login" replace state={{ returnTo:location.pathname+location.search }} />} />
        <Route path="/admin/saved-cards" element={canOpen('/admin/saved-cards') ? <AdminSavedCardsPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/email-campaign" element={canOpen('/admin/email-campaign') ? <AdminEmailCampaign /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/users/:userId" element={canOpen('/admin/users/:userId') ? <AdminUserProfilePage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)} />
        <Route path="/admin/feedback" element={canOpen('/admin/feedback') ? <AdminFeedbackPage /> : (userRole ? <p role="status" style={{padding: 24}}>{accessLoaded ? "Your role does not include access to this page." : "Loading your access…"}</p> : <Navigate to="/login" />)}/>

        {/* User */}
        <Route path="/user/dashboard" element={displayRole === "user" ? <UserDashboard /> : <Navigate to="/login" />} />
        <Route path="/user/your-gigs" element={displayRole === "user" ? <YourGigs /> : <Navigate to="/login" />} />
        <Route path="/user/my-profile" element={displayRole === "user" ? <UserProfilePage /> : <Navigate to="/login" />} />
        <Route path="/user/user-attendance" element={displayRole === "user" ? <UserAttendance userId={previewUser?.id || loggedInUser?.id} /> : <Navigate to="/login" />} />
        <Route path="/user/team-list" element={displayRole === "user" ? <TheTeam /> : <Navigate to="/login" />} />
        <Route path="/user/my-payouts" element={displayRole === "user" ? <MyPayouts /> : <Navigate to="/login" />} />
        <Route path="/user" element={displayRole === "admin" ? <AdminGigs /> : displayRole === "user" ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/user/cocktails-ingredients" element={displayRole === "user" ? <CocktailsIngredient /> : <Navigate to="/login" />} />

        {/* Old /gigs routes -> redirect */}
        <Route path="/gigs/dashboard" element={<Navigate to="/user/dashboard" replace />} />
        <Route path="/gigs/your-gigs" element={<Navigate to="/user/your-gigs" replace />} />
        <Route path="/gigs/my-profile" element={<Navigate to="/user/my-profile" replace />} />
        <Route path="/gigs/user-attendance" element={<Navigate to="/user/user-attendance" replace />} />
        <Route path="/gigs/team-list" element={<Navigate to="/user/team-list" replace />} />
        <Route path="/gigs/my-payouts" element={<Navigate to="/user/my-payouts" replace />} />
        <Route path="/gigs/cocktails-ingredients" element={<Navigate to="/user/cocktails-ingredients" replace />} />
        <Route path="/gigs" element={<Navigate to="/user" replace />} />

        {/* Student */}
        <Route path="/student/dashboard" element={displayRole === "student" ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/student/attendance" element={displayRole === "student" ? <UserAttendance userId={previewUser?.id || loggedInUser?.id} /> : <Navigate to="/login" />} />
        <Route path="/student/gigs" element={displayRole === "student" ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/student/mygigs" element={displayRole === "student" ? <YourGigs /> : <Navigate to="/login" />} />
        <Route path="/student" element={displayRole === "student" ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/student/flashcards" element={displayRole === "student" ? <FlashcardsPage /> : <Navigate to="/login" />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/rb/home" />} />
      </Routes>
      {displayRole === "admin" && <AssistantHub />}
    </div>
  );
};

export default App;
