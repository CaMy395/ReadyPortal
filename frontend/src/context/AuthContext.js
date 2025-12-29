import React, { createContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const AuthContext = createContext({
  token: '',
  user: null,
  isAdmin: false,
  authLoading: true,
  login: async () => {},
  logout: () => {},
  refreshMe: async () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const applyTokenToAxios = (tkn) => {
    if (tkn) axios.defaults.headers.common.Authorization = `Bearer ${tkn}`;
    else delete axios.defaults.headers.common.Authorization;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    applyTokenToAxios('');
    setAuthLoading(false);
  };

  const refreshMe = async (tkn = token) => {
    // Always end loading state, even on errors
    setAuthLoading(true);

    try {
      if (!tkn) {
        setUser(null);
        return;
      }

      applyTokenToAxios(tkn);

      const res = await axios.get(`${API_BASE}/auth/me`);
      setUser(res.data);
    } catch (err) {
      console.error('❌ /auth/me failed:', err?.response?.status, err?.response?.data || err.message);
      // Token bad or endpoint missing -> treat as logged out
      setUser(null);
      localStorage.removeItem('token');
      setToken('');
      applyTokenToAxios('');
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  // ✅ Run on mount AND whenever token changes
  useEffect(() => {
    refreshMe(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isAdmin = !!user && (user.isAdmin === true || user.role === 'admin');

  const value = useMemo(
    () => ({ token, user, isAdmin, authLoading, login, logout, refreshMe }),
    [token, user, isAdmin, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
