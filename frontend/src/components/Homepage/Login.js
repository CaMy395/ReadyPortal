import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../App.css';

const Login = ({ onLogin }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // If already logged in, bounce to the right dashboard
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('userRole') || localStorage.getItem('role');

    if (storedUsername && storedRole) {
      if (typeof onLogin === 'function') onLogin(storedRole);

      if (storedRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (storedRole === 'student') {
        navigate('/student/dashboard', { replace: true });
      } else {
        navigate('/gigs/dashboard', { replace: true });
      }
    }
  }, [navigate, onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameOrEmail.trim(), // accepts username or email on backend
          password,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Login failed. Please check your credentials.');
      }

      // Expecting at least: { id, username, role }
      const data = await res.json();
      const role = data.role || 'user';
      const uname = data.username || usernameOrEmail;

      // Persist session
      localStorage.setItem('loggedInUser', JSON.stringify(data));
      localStorage.setItem('username', uname);
      if (data.id != null) localStorage.setItem('userId', String(data.id));
      localStorage.setItem('userRole', role); // what App.js reads
      localStorage.setItem('role', role);     // keep for backwards-compat

      // Lift state to App
      if (typeof onLogin === 'function') onLogin(role);

      // Redirect by role
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'student') {
        navigate('/student/dashboard', { replace: true });
      } else {
        navigate('/gigs/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <form onSubmit={handleSubmit}>
          <h2>Login</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}

          <label>
            Username or Email:
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <br />

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="link-to-other">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
        <p className="forgot-password">
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
