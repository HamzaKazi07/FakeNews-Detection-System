import React, { useState } from 'react';
import apiClient, { unwrapApiData } from '../api/client';

function Login({
  onLoginSuccess,
  setActiveTab,
  redirectTab
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const res = await apiClient.post(
        '/api/auth/login',
        {
          email: email.trim().toLowerCase(),
          password
        }
      );

      const { token, user } = unwrapApiData(res);

      if (!token || !user) {
        setError(
          'Login succeeded but account information was not received.'
        );
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      onLoginSuccess(user);

      // If the user originally clicked Check News,
      // Dashboard, or History before logging in,
      // App.jsx will send them to that page.
      //
      // Otherwise go to Check News, preserving the
      // original behaviour of the application.
      if (redirectTab) {
        setActiveTab(redirectTab);
      } else {
        setActiveTab('check');
      }

    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError("We couldn't connect to Fake News right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container glass-card">

      <h2
        style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          fontFamily: 'var(--font-heading)'
        }}
      >
        Welcome Back
      </h2>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>
            Email Address
          </label>

          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '0.85rem'
          }}
          disabled={loading}
        >
          {loading
            ? 'Authenticating...'
            : 'Sign In'}
        </button>

      </form>

      <div className="form-footer">
        Don't have an account?{' '}

        <span
          onClick={() => setActiveTab('register')}
          style={{ cursor: 'pointer' }}
        >
          Sign Up
        </span>
      </div>

    </div>
  );
}

export default Login;