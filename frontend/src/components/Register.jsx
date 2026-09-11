import React, { useState } from 'react';
import apiClient from '../api/client';

function Register({ setActiveTab }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    setError('');
    setSuccess('');
  };

  // =====================================================
  // VALIDATE FORM
  // =====================================================

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name) {
      return 'Full name is required.';
    }

    if (name.length < 2) {
      return 'Full name must contain at least 2 characters.';
    }

    if (name.length > 100) {
      return 'Full name must not exceed 100 characters.';
    }

    if (!email) {
      return 'Email address is required.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address.';
    }

    if (!password) {
      return 'Password is required.';
    }

    if (password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }

    if (password.length > 128) {
      return 'Password must not exceed 128 characters.';
    }

    if (!confirmPassword) {
      return 'Please confirm your password.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  };

  // =====================================================
  // HANDLE REGISTER
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await apiClient.post(
        '/api/auth/register',
        {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }
      );

      // Do NOT login automatically.
      // User must login manually.

      setSuccess(
        'Account created successfully! Please login to continue.'
      );

      setTimeout(() => {
        setActiveTab('login');
      }, 700);

    } catch (err) {
      console.error('Registration error:', err);

      if (err.response?.status === 409) {
        setError('An account with this email already exists.');
      } else if (err.response?.status === 400) {
        setError(
          'Please check your registration details.'
        );
      } else if (err.request) {
        setError("We couldn't connect to Fake News right now. Please try again.");
      } else {
        setError("We couldn't connect to Fake News right now. Please try again.");
      }

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GO TO LOGIN
  // =====================================================

  const goToLogin = () => {
    setError('');
    setSuccess('');
    setActiveTab('login');
  };

  // =====================================================
  // ICONS
  // =====================================================

  const UserIcon = () => (
    <svg
      className="register-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
    </svg>
  );

  const MailIcon = () => (
    <svg
      className="register-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );

  const LockIcon = () => (
    <svg
      className="register-input-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );

  const EyeIcon = ({ open }) => (
    <svg
      className="register-eye-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {open ? (
        <>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      ) : (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.3A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17.8 17.8 0 0 1-3.2 3.9" />
          <path d="M6.2 6.2C3.7 8.1 2.5 12 2.5 12S6 19 12 19c1.5 0 2.8-.3 4-.8" />
        </>
      )}
    </svg>
  );

  // =====================================================
  // UI WITH EMBEDDED CSS
  // =====================================================

  return (
    <>
      <style>
        {`
          .register-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #eaf1fb;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
          }

          .register-card {
            background-color: #ffffff;
            width: 100%;
            max-width: 440px;
            padding: 48px 40px;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          }

          .register-header {
            text-align: center;
            margin-bottom: 32px;
          }

          .register-header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 8px 0;
          }

          .register-header p {
            font-size: 15px;
            color: #6b7280;
            margin: 0;
          }

          .register-message {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            text-align: center;
          }

          .register-error {
            background-color: #fee2e2;
            color: #991b1b;
            border: 1px solid #f87171;
          }

          .register-success {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #34d399;
          }

          .register-form-group {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
          }

          .register-form-group label {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
          }

          .register-input-wrapper {
            display: flex;
            align-items: center;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 0 16px;
            height: 48px;
            background-color: #ffffff;
            transition: all 0.2s ease;
          }

          .register-input-wrapper:focus-within {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }

          .register-input-icon {
            width: 20px;
            height: 20px;
            color: #9ca3af;
            margin-right: 12px;
            flex-shrink: 0;
          }

          .register-input-wrapper input {
            border: none;
            outline: none;
            width: 100%;
            height: 100%;
            font-size: 15px;
            color: #111827;
            background: transparent;
          }

          .register-input-wrapper input::placeholder {
            color: #9ca3af;
          }

          .register-eye-button {
            background: none;
            border: none;
            padding: 0;
            margin-left: 8px;
            cursor: pointer;
            color: #9ca3af;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
          }

          .register-eye-button:hover {
            color: #4b5563;
          }

          .register-eye-icon {
            width: 20px;
            height: 20px;
          }

          .register-submit-button {
            width: 100%;
            height: 48px;
            background-color: #1d4ed8;
            color: #ffffff;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 12px;
            transition: background-color 0.2s ease;
          }

          .register-submit-button:hover:not(:disabled) {
            background-color: #1e40af;
          }

          .register-submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .register-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 15px;
            color: #6b7280;
          }

          .register-signin-link {
            background: none;
            border: none;
            color: #1d4ed8;
            font-weight: 600;
            cursor: pointer;
            padding: 0 0 0 6px;
            font-size: 15px;
          }

          .register-signin-link:hover {
            text-decoration: underline;
          }
        `}
      </style>

      <div className="register-page">

        <div className="register-card">

          <div className="register-header">
            <h1>Create Account</h1>

            <p>
              Join us to start detecting fake news
            </p>
          </div>

          {error && (
            <div
              className="register-message register-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="register-message register-success"
              role="status"
            >
              {success}
            </div>
          )}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >

            {/* FULL NAME */}

            <div className="register-form-group">

              <label htmlFor="name">
                Full Name
              </label>

              <div className="register-input-wrapper">

                <UserIcon />

                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={100}
                  disabled={loading}
                />

              </div>
            </div>

            {/* EMAIL */}

            <div className="register-form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <div className="register-input-wrapper">

                <MailIcon />

                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  maxLength={254}
                  disabled={loading}
                />

              </div>
            </div>

            {/* PASSWORD */}

            <div className="register-form-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="register-input-wrapper">

                <LockIcon />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  maxLength={128}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="register-eye-button"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <EyeIcon open={showPassword} />
                </button>

              </div>
            </div>

            {/* CONFIRM PASSWORD */}

            <div className="register-form-group">

              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div className="register-input-wrapper">

                <LockIcon />

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  maxLength={128}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="register-eye-button"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>

              </div>
            </div>

            {/* SIGN UP */}

            <button
              type="submit"
              className="register-submit-button"
              disabled={loading}
            >
              {loading
                ? 'Creating Account...'
                : 'Sign Up'}
            </button>

          </form>

          {/* LOGIN LINK */}

          <div className="register-footer">

            <span>
              Already have an account?
            </span>

            <button
              type="button"
              className="register-signin-link"
              onClick={goToLogin}
              disabled={loading}
            >
              Sign In
            </button>

          </div>

        </div>

      </div>
    </>
  );
}

export default Register;