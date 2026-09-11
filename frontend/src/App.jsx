import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import CheckNews from './components/CheckNews';
import Dashboard from './components/Dashboard';
import History from './components/History';
import AdminPanel from './components/AdminPanel';
import About from './components/About';

import './App.css';
import './design-system.css';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Remember where an unauthenticated user wanted to go
  // for protected pages such as Dashboard and History.
  const [pendingTab, setPendingTab] = useState(null);

  // =========================================================
  // RESTORE LOGIN SESSION
  // =========================================================
  useEffect(() => {
    const authenticate = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await axios.get(
          `${BACKEND_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setUser(res.data.user);
      } catch {
        console.warn(
          'Session expired or invalid token.'
        );

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    authenticate();
  }, []);

  // =========================================================
  // DARK MODE
  // =========================================================
  useEffect(() => {
    const bodyClass = document.body.classList;

    if (darkMode) {
      bodyClass.add('dark-mode');
    } else {
      bodyClass.remove('dark-mode');
    }
  }, [darkMode]);

  // =========================================================
  // LOGIN SUCCESS
  // =========================================================
  const handleLoginSuccess = (userData) => {
    setUser(userData);

    // If the user originally wanted Dashboard or History,
    // return them there after login.
    const destination = pendingTab || 'check';

    setPendingTab(null);
    setActiveTab(destination);
  };

  // =========================================================
  // NAVIGATION
  // =========================================================
  const handleTabChange = useCallback((tab) => {

    // -------------------------------------------------------
    // CHECK NEWS IS PUBLIC
    // -------------------------------------------------------
    // Anyone can open the Check News page and see its UI.
    // Actual analysis is blocked inside CheckNews.jsx.
    if (tab === 'check') {
      setActiveTab('check');
      return;
    }

    // -------------------------------------------------------
    // DASHBOARD / HISTORY REQUIRE LOGIN
    // -------------------------------------------------------
    const protectedTabs = [
      'dashboard',
      'history'
    ];

    if (
      protectedTabs.includes(tab) &&
      !user
    ) {
      setPendingTab(tab);
      setActiveTab('login');
      return;
    }

    // -------------------------------------------------------
    // ADMIN REQUIRES ADMIN ROLE
    // -------------------------------------------------------
    if (
      tab === 'admin' &&
      (!user || user.role !== 'admin')
    ) {
      setPendingTab('admin');
      setActiveTab('login');
      return;
    }

    // -------------------------------------------------------
    // PUBLIC PAGES
    // -------------------------------------------------------
    setActiveTab(tab);
  }, [user]);

  useEffect(() => {
    const handleWorkspaceNavigation = (event) => {
      if (event.type === 'navigate-to-analyze') handleTabChange('check');
      if (event.type === 'navigate-to-history') handleTabChange('history');
    };

    window.addEventListener('navigate-to-analyze', handleWorkspaceNavigation);
    window.addEventListener('navigate-to-history', handleWorkspaceNavigation);
    return () => {
      window.removeEventListener('navigate-to-analyze', handleWorkspaceNavigation);
      window.removeEventListener('navigate-to-history', handleWorkspaceNavigation);
    };
  }, [user, handleTabChange]);

  // =========================================================
  // LOGOUT
  // =========================================================
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    setPendingTab(null);

    setActiveTab('home');
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background:
            'linear-gradient(135deg, #eef2f6 0%, #dbeafe 100%)',
          color: '#0f172a'
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            animation:
              'spin 1.5s linear infinite',
            display: 'inline-block'
          }}
        >
          🌀
        </div>

        <h3
          style={{
            marginTop: '1rem',
            fontFamily: 'sans-serif'
          }}
        >
          Booting Credibility System...
        </h3>

        <style>{`
          @keyframes spin {
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // =========================================================
  // APPLICATION
  // =========================================================
  return (
    <div className="app-container">

      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="main-content">

        {/* HOME */}
        {activeTab === 'home' && (
          <Home
            setActiveTab={handleTabChange}
            user={user}
          />
        )}

        {/* =================================================
            CHECK NEWS

            IMPORTANT:
            Visible whether logged in or not.

            Analysis is blocked inside CheckNews.jsx
            when user is not logged in.
        ================================================= */}
        {activeTab === 'check' && (
          <CheckNews
            backendUrl={BACKEND_URL}
            user={user}
          />
        )}

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && user && (
          <Dashboard
            backendUrl={BACKEND_URL}
          />
        )}

        {/* HISTORY */}
        {activeTab === 'history' && user && (
          <History
            backendUrl={BACKEND_URL}
          />
        )}

        {/* ADMIN */}
        {activeTab === 'admin' &&
          user?.role === 'admin' && (
            <AdminPanel
              backendUrl={BACKEND_URL}
            />
          )}

        {/* ABOUT */}
        {activeTab === 'about' && (
          <About />
        )}

        {/* LOGIN */}
        {activeTab === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            setActiveTab={setActiveTab}
            backendUrl={BACKEND_URL}
            redirectTab={pendingTab}
          />
        )}

        {/* REGISTER */}
        {activeTab === 'register' && (
          <Register
            setActiveTab={setActiveTab}
            backendUrl={BACKEND_URL}
          />
        )}

      </main>

      {/* FOOTER */}
      {activeTab !== 'home' && (
        <footer className="footer">
          <p>
            &copy; {new Date().getFullYear()} Fake News. Machine-learning-based news classification.
          </p>
        </footer>
      )}

    </div>
  );
}

export default App;
