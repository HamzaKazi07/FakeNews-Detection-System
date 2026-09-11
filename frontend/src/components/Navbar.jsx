import React, { useEffect, useState } from 'react';
import BrandMark from './BrandMark';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, darkMode, setDarkMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  const changeTab = (tab) => {
    setMenuOpen(false);
    setActiveTab(tab);
  };

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <button className="nav-brand" type="button" onClick={() => changeTab('home')} aria-label="Fake News home">
        <BrandMark /><span>Fake News</span>
      </button>
      <button className="nav-menu-toggle" type="button" aria-label="Toggle navigation menu" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
        <span /><span /><span /><span className="sr-only">Open navigation menu</span>
      </button>

      <ul className={`nav-links ${menuOpen ? 'is-open' : ''}`} id="primary-navigation">
        <li>
            <button
              type="button"
            className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => changeTab('home')}
          >
            Home
          </button>
        </li>
        <li>
            <button
              type="button"
            className={`nav-link ${activeTab === 'check' ? 'active' : ''}`}
            onClick={() => changeTab('check')}
          >
            Analyze
          </button>
        </li>
        <li>
            <button
              type="button"
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => changeTab('dashboard')}
          >
              Dashboard
          </button>
        </li>
        {user && (
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => changeTab('history')}
            >
              History
            </button>
          </li>
        )}
        {user && user.role === 'admin' && (
          <li>
            <button
              type="button"
              className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => changeTab('admin')}
            >
              Admin Panel
            </button>
          </li>
        )}
        <li>
          <button
            type="button"
            className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => changeTab('about')}
          >
                About
              </button>
        </li>
        {!user && (
          <>
            <li className="nav-mobile-auth"><button className="nav-link nav-link-button" type="button" onClick={() => changeTab('login')}>Sign In</button></li>
            <li className="nav-mobile-auth"><button className="btn btn-primary nav-mobile-cta" type="button" onClick={() => changeTab('check')}>Analyze News</button></li>
          </>
        )}
        {user && (
          <li className="nav-mobile-account">
            <div className="nav-mobile-user">👤 {user.name}{user.role === 'admin' && <span>Admin</span>}</div>
            <button className="btn btn-secondary nav-mobile-logout" type="button" onClick={() => { setMenuOpen(false); onLogout(); }}>Logout</button>
          </li>
        )}
      </ul>

      <div className="nav-actions">
        <button
          className="theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {darkMode ? '☀' : '◐'}
        </button>

        {user ? (
          <div className="nav-account-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="nav-user-name" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              👤 {user.name} {user.role === 'admin' && <span style={{ fontSize: '0.75rem', background: 'var(--accent-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Admin</span>}
            </span>
            <button className="btn btn-secondary nav-logout" onClick={() => { setMenuOpen(false); onLogout(); }}>
              Logout
            </button>
          </div>
        ) : (
          <div className="nav-account-actions">
            <button className="btn btn-secondary" onClick={() => changeTab('login')}>
              Sign In
            </button>
            <button className="btn btn-primary" onClick={() => changeTab('check')}>
              Analyze News
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
