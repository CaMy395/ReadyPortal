import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  useLocation,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import ScrollToTop from "./ScrollToTop";

// Public Pages
import IntakeForm from "./components/Public/IntakeForm";
import CraftCocktails from "./components/Public/CraftCocktails";
import BartendingCourse from "./components/Public/BartendingCourse";
import BartendingClasses from "./components/Public/BartendingClasses";
import MixNsip from "./components/Public/MixNsip";
import FeedbackFormPage from "./components/Public/FeedbackFormPage";

// RB Website Pages
import Homepage from "./components/Public/RBWebsite/Homepage";
import RBLayout from "./components/Public/RBWebsite/RBLayout";
import EventPackages from "./components/Public/RBWebsite/EventPackages";
import BartendersCC from "./components/Public/RBWebsite/BartendersCC";
import CraftsNCocktails from "./components/Public/RBWebsite/CraftsNCocktails";
import MixNSip from "./components/Public/RBWebsite/MixNSip";
import ClientSchedulingPage from "./components/Public/RBWebsite/ClientSchedulingPage";
import ClientPage from "./components/Public/RBWebsite/ClientPage";
import ClientSchedulingSuccess from "./components/Public/RBWebsite/ClientSchedulingSuccess";
import ClientSaveCardPage from "./components/Public/RBWebsite/ClientSaveCardPage";
import RentalsProducts from "./components/Public/RBWebsite/RentalsProducts";
import CommonCocktails from "./components/Public/RBWebsite/CommonCocktails";
import SignatureCocktails from "./components/Public/RBWebsite/SignatureCocktails";
import PaymentPage from "./components/Public/RBWebsite/Payment";
import PrivacyPolicy from "./components/Public/RBWebsite/PrivacyPolicy";
import Apply from "./components/Public/RBWebsite/Apply";
import Staff from "./components/Public/RBWebsite/Staff";
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

const App = () => {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem("userRole");
  });

  const [totalFormsCount, setTotalFormsCount] = useState(0);

  const handleLogin = (role) => {
    setUserRole(role);
    localStorage.setItem("userRole", role);
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("role");
  };

  useEffect(() => {
    const fetchTotalFormsCount = async () => {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
      try {
        const responses = await Promise.all([
          fetch(`${apiUrl}/api/intake-forms`),
          fetch(`${apiUrl}/api/craft-cocktails`),
          fetch(`${apiUrl}/api/mix-n-sip`),
          fetch(`${apiUrl}/api/bartending-course`),
          fetch(`${apiUrl}/api/bartending-classes`),
        ]);

        const [intakeData, cocktailsData, mixnsipData, courseData, classesData] =
          await Promise.all(responses.map((res) => (res.ok ? res.json() : [])));

        const totalCount =
          (intakeData?.length || 0) +
          (cocktailsData?.length || 0) +
          (mixnsipData?.length || 0) +
          (courseData?.length || 0) +
          (classesData?.length || 0);

        setTotalFormsCount(totalCount);
      } catch (error) {
        console.error("Error fetching total forms count:", error);
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
                  <Route path="client-save-card" element={<ClientSaveCardPage />} />
                  <Route path="common-cocktails" element={<CommonCocktails />} />
                  <Route path="signature-cocktails" element={<SignatureCocktails />} />
                  <Route path="payment" element={<PaymentPage />} />
                  <Route path="rentals-products" element={<RentalsProducts />} />
                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="events/:slug" element={<EventDetailsPage />} />
                  <Route path="event-success" element={<EventSuccessPage />} />
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
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [me, setMe] = useState(null);

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

  useLocation();

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
                  {/* Home Dropdown */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("home")}>Home </span>
                    {openDropdown === "home" && (
                      <ul className="dropdown-content">
                        <li>
                          <Link to="/admin/dashboard">Home</Link>
                        </li>
                        <li>
                          <Link to={`/admin/users/${loggedInUser?.id}`}>My Profile</Link>
                        </li>
                      </ul>
                    )}
                  </li>

                  {/* Gigs Dropdown */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("gigs")}>Gigs </span>
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
                    <span onClick={() => toggleDropdown("finance")}>Finance </span>
                    {openDropdown === "finance" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/quotes">Quotes</Link></li>
                        <li><Link to="/admin/quotes-dashboard">All Quotes</Link></li>
                        <li><Link to="/admin/payment-form">Payment Form</Link></li>
                        <li><Link to="/admin/payouts">Payouts</Link></li>
                        <li><Link to="/admin/extra-income">Manual Income</Link></li>
                        <li><Link to="/admin/extra-payouts">Manual Payouts</Link></li>
                        <li><Link to="/admin/expenses">Manual Expenses</Link></li>
                        <li><Link to="/admin/saved-cards">Charge Card on File</Link></li>
                        <li><Link to="/admin/transactions">Transactions</Link></li>
                        <li><Link to="/admin/profits">Profits</Link></li>
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
                    <span onClick={() => toggleDropdown("inventory")}>
                      Inventory & Ingredients{" "}
                    </span>
                    {openDropdown === "inventory" && (
                      <ul className="dropdown-content">
                        <li><Link to="/admin/inventory">Inventory</Link></li>
                        <li><Link to="/admin/internal-checklist">Package Checklist</Link></li>
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
                        <li><Link to="/admin/userlist">Staff & Vendors</Link></li>
                        <li><Link to="/admin/class-roster">Course Roster</Link></li>
                        <li><Link to="/admin/sign-in">Student Sign-in</Link></li>
                        <li><Link to="/admin/email-campaign">Email Campaign</Link></li>
                      </ul>
                    )}
                  </li>
                </>
              ) : userRole === "student" ? (
                <ul className="menu">
                  <li>
                    <Link to="/student/dashboard">Home</Link> |{" "}
                    <Link to="/student/gigs"> Gigs</Link> |{" "}
                    <Link to="/student/mygigs"> My Gigs</Link> |{" "}
                    <Link to="/student/flashcards"> Study</Link>
                  </li>
                </ul>
              ) : (
                <>
                  {/* USER dropdown nav (same style as admin) */}
                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("userHome")}>Home </span>
                    {openDropdown === "userHome" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user/dashboard">Dashboard</Link></li>
                        <li><Link to="/user/my-profile">My Profile</Link></li>
                      </ul>
                    )}
                  </li>

                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("userGigs")}>Gigs </span>
                    {openDropdown === "userGigs" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user">Available Gigs</Link></li>
                        <li><Link to="/user/your-gigs">My Gigs</Link></li>
                        <li><Link to="/user/user-attendance">My Attendance</Link></li>
                      </ul>
                    )}
                  </li>

                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("userMoney")}>Earnings </span>
                    {openDropdown === "userMoney" && (
                      <ul className="dropdown-content">
                        <li><Link to="/user/my-payouts">My Payouts</Link></li>
                      </ul>
                    )}
                  </li>

                  <li className="dropdown">
                    <span onClick={() => toggleDropdown("userTeam")}>Team & Resources </span>
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

          <div className="nav-right">
            <button
              className="logout-button"
              onClick={() => (window.location.href = "/rb/home")}
            >
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
        <Route path="/feedback/:token" element={<FeedbackFormPage />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailsPage />} />
        <Route path="/events/success" element={<EventSuccessPage />} />

        {/* Admin */}
        <Route path="/admin/add-gigs" element={userRole === "admin" ? <AdminGigs /> : <Navigate to="/login" />} />
        <Route path="/admin/upcoming-events" element={userRole === "admin" ? <AdminEventsPage /> : <Navigate to="/login" />} />
        <Route path="/admin/attendance" element={userRole === "admin" ? <GigAttendance /> : <Navigate to="/login" />} />
        <Route path="/admin/scheduling-page" element={<SchedulingPage />} />
        <Route path="/admin/availability-page" element={<AdminAvailabilityPage />} />
        <Route path="/admin/clients" element={userRole === "admin" ? <Clients /> : <Navigate to="/login" />} />
        <Route path="/admin/intake-forms" element={userRole === "admin" ? <AdminIntakeForms /> : <Navigate to="/login" />} />
        <Route path="/admin/cocktails-ingredient" element={userRole === "admin" ? <CocktailsIngredient /> : <Navigate to="/login" />} />
        <Route path="/admin/admins-gigs" element={userRole === "admin" ? <AdminsGigs /> : <Navigate to="/login" />} />
        <Route path="/admin/payment-form" element={userRole === "admin" ? <PaymentForm /> : <Navigate to="/login" />} />
        <Route path="/admin/userlist" element={userRole === "admin" ? <UserList /> : <Navigate to="/login" />} />
        <Route path="/admin/mytasks" element={userRole === "admin" ? <MyTasks /> : <Navigate to="/login" />} />
        <Route path="/admin/quotes" element={userRole === "admin" ? <Quotes hideNavigation={true} /> : <Navigate to="/login" />} />
        <Route path="/admin/quote-preview/:id" element={userRole === "admin" ? <QuotesPreviewPage /> : <Navigate to="/login" />} />
        <Route path="/admin/quotes-dashboard" element={userRole === "admin" ? <AdminQuotesDashboard /> : <Navigate to="/login" />} />
        <Route path="/admin/payouts" element={userRole === "admin" ? <Payouts /> : <Navigate to="/login" />} />
        <Route path="/admin/transactions" element={userRole === "admin" ? <Transactions /> : <Navigate to="/login" />} />
        <Route path="/admin/extra-income" element={userRole === "admin" ? <ExtraIncome /> : <Navigate to="/login" />} />
        <Route path="/admin/extra-payouts" element={userRole === "admin" ? <ExtraPayouts /> : <Navigate to="/login" />} />
        <Route path="/admin/expenses" element={userRole === "admin" ? <Expenses /> : <Navigate to="/login" />} />
        <Route path="/admin/upcoming-gigs" element={userRole === "admin" ? <UpcomingGigs /> : <Navigate to="/login" />} />
        <Route path="/admin/inventory" element={userRole === "admin" ? <Inventory /> : <Navigate to="/login" />} />
        <Route path="/admin/internal-checklist" element={userRole === "admin" ? <PackageChecklist /> : <Navigate to="/login" />} />
        <Route path="/admin/profits" element={userRole === "admin" ? <Profits /> : <Navigate to="/login" />} />
        <Route path="/admin/class-roster" element={userRole === "admin" ? <AdminClassRoster /> : <Navigate to="/login" />} />
        <Route path="/admin/sign-in" element={userRole === "admin" ? <StudentSignIn /> : <Navigate to="/login" />} />
        <Route path="/admin/backfill-classes" element={userRole === "admin" ? <AdminBackfillClassSessions /> : <Navigate to="/login" />} />
        <Route path="/admin/dashboard" element={userRole === "admin" ? <AdminDashboard /> : <Navigate to="/login" />} />
        <Route path="/admin/saved-cards" element={userRole === "admin" ? <AdminSavedCardsPage /> : <Navigate to="/login" />} />
        <Route path="/admin/email-campaign" element={userRole === "admin" ? <AdminEmailCampaign /> : <Navigate to="/login" />} />
        <Route path="/admin/users/:userId" element={userRole === "admin" ? <AdminUserProfilePage /> : <Navigate to="/login" />} />

        {/* User */}
        <Route path="/user/dashboard" element={userRole === "user" ? <UserDashboard /> : <Navigate to="/login" />} />
        <Route path="/user/your-gigs" element={userRole === "user" ? <YourGigs /> : <Navigate to="/login" />} />
        <Route path="/user/my-profile" element={userRole === "user" ? <UserProfilePage /> : <Navigate to="/login" />} />
        <Route path="/user/user-attendance" element={userRole === "user" ? <UserAttendance userId={loggedInUser?.id} /> : <Navigate to="/login" />} />
        <Route path="/user/team-list" element={userRole === "user" ? <TheTeam /> : <Navigate to="/login" />} />
        <Route path="/user/my-payouts" element={userRole === "user" ? <MyPayouts /> : <Navigate to="/login" />} />
        <Route path="/user" element={userRole === "admin" ? <AdminGigs /> : userRole === "user" ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/user/cocktails-ingredients" element={userRole === "user" ? <CocktailsIngredient /> : <Navigate to="/login" />} />

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
        <Route path="/student/dashboard" element={userRole === "student" ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/student/attendance" element={userRole === "student" ? <UserAttendance userId={loggedInUser?.id} /> : <Navigate to="/login" />} />
        <Route path="/student/gigs" element={userRole === "student" ? <UserGigs /> : <Navigate to="/login" />} />
        <Route path="/student/mygigs" element={userRole === "student" ? <YourGigs /> : <Navigate to="/login" />} />
        <Route path="/student" element={userRole === "student" ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/student/flashcards" element={userRole === "student" ? <FlashcardsPage /> : <Navigate to="/login" />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/rb/home" />} />
      </Routes>
    </div>
  );
};

export default App;
