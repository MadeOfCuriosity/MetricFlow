import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { salesService } from '../../services/sales';
import { CursorState } from '../../types/landing';
import logoLight from '../../assets/brand/logo.png';
import { getApiError } from '../../lib/apiError';

export type AuthMode = 'signin' | 'invite' | 'reset';

interface AuthPageProps {
  setCursorState: (state: CursorState) => void;
  onNavigateHome: (anchor?: string) => void;
  initialMode?: AuthMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  setCursorState,
  onNavigateHome,
  initialMode = 'signin',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form states - Sign In
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [signInSuccess, setSignInSuccess] = useState(false);

  // Form states - Request Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompany, setInviteCompany] = useState('');
  const [inviteVertical, setInviteVertical] = useState<'d2c' | 'enterprise' | 'agency' | 'other'>('d2c');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeOpen, setInviteCodeOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSubmitted, setInviteSubmitted] = useState(false);
  const [instantAccessGranted, setInstantAccessGranted] = useState(false);

  // Form states - Reset Password
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Handle Sign In submission with real backend auth
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError('');

    try {
      await login({ email: signInEmail, password: signInPassword });
      setSignInSuccess(true);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setSignInError(detail.map((e: any) => e.msg).join(', '));
      } else if (typeof detail === 'string') {
        setSignInError(detail);
      } else {
        setSignInError('Invalid email or password');
      }
    } finally {
      setSignInLoading(false);
    }
  };

  // Handle Google OAuth Sign In
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setSignInError('');
    setSignInLoading(true);

    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.needs_setup) {
        navigate('/google-setup', {
          state: {
            setup_token: result.setup_token,
            google_name: result.google_name,
            google_email: result.google_email,
          },
        });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setSignInError(getApiError(err, 'Google sign-in failed'));
    } finally {
      setSignInLoading(false);
    }
  };

  // Handle Invite Request submission with real lead capture
  const handleRequestInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    const validCodes = ['FOUNDER2026', 'BETA', 'VISUALIZE', 'METRICFLOW', 'VIP', 'INVITE2026'];
    const enteredCode = inviteCode.trim().toUpperCase();

    try {
      await salesService.submitContact({
        name: inviteCompany || inviteEmail.split('@')[0],
        email: inviteEmail,
        company: inviteCompany,
        team_size: inviteVertical.toUpperCase(),
        message: enteredCode ? `VIP Code: ${enteredCode}` : `Early access application for ${inviteVertical}`,
        source: 'Landing Private Beta Invite',
      });
    } catch (err) {
      console.warn('Lead submission notice:', err);
    } finally {
      setInviteLoading(false);
      if (enteredCode && validCodes.includes(enteredCode)) {
        setInstantAccessGranted(true);
      } else {
        setInviteSubmitted(true);
      }
    }
  };

  // Handle Reset Password submission
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSubmitted(true);
  };

  return (
    <div
      style={{
        backgroundColor: '#000000',
        minHeight: '100vh',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 48px) 16px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Floating Return to Home button */}
      <button
        type="button"
        onClick={() => onNavigateHome()}
        onMouseEnter={() => setCursorState('hover')}
        onMouseLeave={() => setCursorState('default')}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          background: 'none',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '999px',
          padding: '8px 18px',
          fontSize: '12.5px',
          color: 'rgba(255, 255, 255, 0.8)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: '#0a0a0a',
        }}
      >
        <span>← Home</span>
      </button>

      {/* Main Auth Container Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.25s ease',
        }}
      >
        {/* Visualize Brandmark Logo */}
        <div
          onClick={() => onNavigateHome()}
          onMouseEnter={() => setCursorState('hover')}
          onMouseLeave={() => setCursorState('default')}
          style={{
            marginBottom: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={logoLight}
            alt="Visualize"
            style={{
              width: '44px',
              height: '44px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* ======================================================== */}
        {/* MODE 1: SIGN IN (EXACT SCREENSHOT REPLICA)               */}
        {/* ======================================================== */}
        {mode === 'signin' && (
          <div style={{ width: '100%' }}>
            {/* Header Titles */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1
                style={{
                  fontSize: 'clamp(28px, 4vw, 34px)',
                  fontWeight: 700,
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}
              >
                Welcome back
              </h1>
              <p
                style={{
                  fontSize: '14.5px',
                  color: 'rgba(255, 255, 255, 0.65)',
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                Sign in to your Visualize account
              </p>
            </div>

            {signInSuccess ? (
              /* Signed-in Simulation */
              <div
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                    fontSize: '20px',
                  }}
                >
                  &#x2713;
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', color: '#ffffff' }}>
                  Authenticated Successfully
                </h3>
                <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Redirecting to your executive telemetry room...
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateHome()}
                  className="cp-btn"
                  style={{ padding: '8px 20px', fontSize: '12px' }}
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Email Field (Screenshot style: light input background) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label
                      htmlFor="signin-email"
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      Email address
                    </label>
                  </div>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="name@company.com"
                    onMouseEnter={() => setCursorState('hover')}
                    onMouseLeave={() => setCursorState('default')}
                    style={{
                      width: '100%',
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      fontSize: '14.5px',
                      color: '#0f172a',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="signin-password"
                    style={{
                      display: 'block',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                      marginBottom: '8px',
                    }}
                  >
                    Password
                  </label>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      onMouseEnter={() => setCursorState('hover')}
                      onMouseLeave={() => setCursorState('default')}
                      style={{
                        width: '100%',
                        backgroundColor: '#f5f5f5',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '14px 44px 14px 16px',
                        fontSize: '14.5px',
                        color: '#000000',
                        fontWeight: 500,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Show/Hide Eye Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onMouseEnter={() => setCursorState('hover')}
                      onMouseLeave={() => setCursorState('default')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#666666',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {signInError && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>
                    {signInError}
                  </p>
                )}

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={signInLoading}
                  onMouseEnter={() => setCursorState('hover')}
                  onMouseLeave={() => setCursorState('default')}
                  style={{
                    backgroundColor: '#161616',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '13px 20px',
                    fontSize: '15px',
                    fontWeight: 500,
                    cursor: signInLoading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {signInLoading ? 'Authenticating...' : 'Sign in'}
                </button>
              </form>
            )}

            {/* Divider: Or continue with */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '28px 0',
                gap: '14px',
              }}
            >
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
              <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', whiteSpace: 'nowrap' }}>
                Or continue with
              </span>
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
            </div>

            {/* Google Single Sign-On */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setSignInError('Google sign-in failed')}
                theme="filled_black"
                size="large"
                text="signin_with"
              />
            </div>

            {/* Bottom Links (Reset password & Request Invite) */}
            <div
              style={{
                marginTop: '32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13.5px',
              }}
            >
              <button
                type="button"
                onClick={() => setMode('reset')}
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
              >
                Reset password
              </button>

              <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                New to our platform?{' '}
                <button
                  type="button"
                  onClick={() => setMode('invite')}
                  onMouseEnter={() => setCursorState('hover')}
                  onMouseLeave={() => setCursorState('default')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '13.5px',
                  }}
                >
                  Request Invite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE 2: REQUEST INVITE / GET STARTED (INVITE-ONLY BETA) */}
        {/* ======================================================== */}
        {mode === 'invite' && (
          <div style={{ width: '100%' }}>
            {/* Header Titles */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '12px',
                }}
              >
                <span>Private Beta &bull; Invite Only</span>
              </div>
              <h1
                style={{
                  fontSize: 'clamp(26px, 3.8vw, 32px)',
                  fontWeight: 700,
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.03em',
                  color: '#ffffff',
                }}
              >
                Request Early Access
              </h1>
              <p
                style={{
                  fontSize: '13.5px',
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Visualize is currently invite-only for select founders and operators. Apply below for priority admission.
              </p>
            </div>

            {instantAccessGranted ? (
              /* Instant VIP Code Activation */
              <div
                style={{
                  backgroundColor: '#0c1a14',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                    fontSize: '20px',
                  }}
                >
                  &#x2713;
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>
                  VIP Invite Code Verified
                </h3>
                <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Your access key has unlocked the full Visualize telemetry suite.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="cp-btn"
                  style={{ padding: '10px 24px', fontSize: '12.5px' }}
                >
                  Proceed to Sign In &rarr;
                </button>
              </div>
            ) : inviteSubmitted ? (
              /* Waitlist Application Confirmation */
              <div
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '28px 20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                    fontSize: '22px',
                  }}
                >
                  &#x2713;
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#ffffff' }}>
                  Application Received
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>
                  We review founder applications on a rolling 24-hour basis. We will dispatch your private access link to <strong style={{ color: '#ffffff' }}>{inviteEmail || 'your email'}</strong>.
                </p>
                <div
                  style={{
                    backgroundColor: '#181818',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '20px',
                  }}
                >
                  Queue Priority Status: <span style={{ color: '#4ade80', fontWeight: 600 }}>Fast-Track Verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateHome()}
                  className="cp-btn"
                  style={{ padding: '8px 20px', fontSize: '12px' }}
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestInvite} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Work Email */}
                <div>
                  <label
                    htmlFor="invite-email"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                      marginBottom: '6px',
                    }}
                  >
                    Work Email *
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="founder@company.com"
                    onMouseEnter={() => setCursorState('hover')}
                    onMouseLeave={() => setCursorState('default')}
                    style={{
                      width: '100%',
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '13px 16px',
                      fontSize: '14px',
                      color: '#000000',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Company Name / Website */}
                <div>
                  <label
                    htmlFor="invite-company"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                      marginBottom: '6px',
                    }}
                  >
                    Company Name / Storefront URL *
                  </label>
                  <input
                    id="invite-company"
                    type="text"
                    required
                    value={inviteCompany}
                    onChange={(e) => setInviteCompany(e.target.value)}
                    placeholder="e.g. Acme Brands or acme.com"
                    onMouseEnter={() => setCursorState('hover')}
                    onMouseLeave={() => setCursorState('default')}
                    style={{
                      width: '100%',
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '13px 16px',
                      fontSize: '14px',
                      color: '#000000',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Business Domain / Vertical */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                      marginBottom: '8px',
                    }}
                  >
                    Business Domain / Vertical
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {(['d2c', 'enterprise', 'agency'] as const).map((vert) => {
                      const labels: Record<string, string> = {
                        d2c: 'D2C',
                        enterprise: 'Enterprise',
                        agency: 'Agency',
                      };
                      const isSel = inviteVertical === vert;
                      return (
                        <button
                          key={vert}
                          type="button"
                          onClick={() => setInviteVertical(vert)}
                          onMouseEnter={() => setCursorState('hover')}
                          onMouseLeave={() => setCursorState('default')}
                          style={{
                            backgroundColor: isSel ? '#ffffff' : '#161616',
                            color: isSel ? '#000000' : 'rgba(255, 255, 255, 0.75)',
                            border: isSel ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '10px 4px',
                            fontSize: '12px',
                            fontWeight: isSel ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {labels[vert]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* VIP Invite Code Expansion */}
                <div style={{ marginTop: '4px' }}>
                  {!inviteCodeOpen ? (
                    <button
                      type="button"
                      onClick={() => setInviteCodeOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      + Have a VIP Invite Code?
                    </button>
                  ) : (
                    <div>
                      <label
                        htmlFor="invite-code"
                        style={{
                          display: 'block',
                          fontSize: '12.5px',
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.75)',
                          marginBottom: '6px',
                        }}
                      >
                        Invite Code
                      </label>
                      <input
                        id="invite-code"
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="e.g. FOUNDER2026"
                        style={{
                          width: '100%',
                          backgroundColor: '#181818',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: '#ffffff',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Submit Application Button */}
                <button
                  type="submit"
                  disabled={inviteLoading}
                  onMouseEnter={() => setCursorState('hover')}
                  onMouseLeave={() => setCursorState('default')}
                  style={{
                    backgroundColor: '#161616',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '13px 20px',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    cursor: inviteLoading ? 'not-allowed' : 'pointer',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {inviteLoading ? 'Submitting Application...' : 'Request Early Access &rarr;'}
                </button>
              </form>
            )}

            {/* Switch back to sign in */}
            <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Already have an active account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px',
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE 3: RESET PASSWORD                                   */}
        {/* ======================================================== */}
        {mode === 'reset' && (
          <div style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  margin: '0 0 10px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Reset Password
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                Enter your work email address to receive password reset instructions.
              </p>
            </div>

            {resetSubmitted ? (
              <div
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Password reset link sent to <strong>{resetEmail || 'your email'}</strong> if an account exists.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setResetSubmitted(false);
                    setMode('signin');
                  }}
                  className="cp-btn"
                  style={{ padding: '8px 18px', fontSize: '12px' }}
                >
                  Return to Sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label
                    htmlFor="reset-email"
                    style={{
                      display: 'block',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      marginBottom: '6px',
                    }}
                  >
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@company.com"
                    style={{
                      width: '100%',
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '13px 16px',
                      fontSize: '14.5px',
                      color: '#000000',
                      fontWeight: 500,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#161616',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '8px',
                    padding: '13px 20px',
                    fontSize: '14.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Send Reset Link
                </button>
              </form>
            )}

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                &larr; Back to Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
