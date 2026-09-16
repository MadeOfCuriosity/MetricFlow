import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CursorState } from '../../types/landing';
import logoLight from '../../assets/brand/logo.png';

interface FooterProps {
  setCursorState: (state: CursorState) => void;
  onOpenCookies?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'invite') => void;
}

export const Footer: React.FC<FooterProps> = ({ setCursorState, onOpenCookies, onOpenAuth }) => {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#000000',
        paddingTop: 'clamp(32px, 5vw, 64px)',
        paddingBottom: 'clamp(28px, 4vw, 48px)',
        marginTop: 'var(--spacing-4xl)',
        color: 'var(--color-mid-grey)',
        fontSize: '13px',
      }}
    >
      <div className="container" style={{ maxWidth: '1160px', margin: '0 auto', paddingInline: 'clamp(16px, 3vw, 32px)' }}>
        {/* 1. Top Callout Card: Get Early Access */}
        <div
          style={{
            backgroundColor: '#0c0c0c',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: 'clamp(20px, 2.5vw, 28px) clamp(20px, 3vw, 36px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: 'clamp(40px, 5vw, 56px)',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 'clamp(15px, 1.4vw, 17px)',
                fontWeight: 500,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Get early access
            </h3>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: 'clamp(12px, 1.1vw, 13px)',
                color: 'rgba(255, 255, 255, 0.55)',
                lineHeight: 1.4,
              }}
            >
              Join our private beta, share feedback, vote on upcoming features, and get priority access.
            </p>
          </div>

          <a
            href="#get-started"
            className="footer-community-btn"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenAuth) {
                onOpenAuth('invite');
              } else {
                const targetUrl = `${window.location.origin}${window.location.pathname}#get-started`;
                window.open(targetUrl, '_blank');
              }
            }}
            onMouseEnter={() => setCursorState('hover')}
            onMouseLeave={() => setCursorState('default')}
            style={{
              backgroundColor: '#e6e6dc',
              color: '#0f0f0f',
              padding: '10px 22px',
              borderRadius: '999px',
              fontSize: '13.5px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
          >
            Get early access
            <ArrowUpRight size={15} />
          </a>
        </div>

        {/* 2. Main Footer Body: Left Brand Info & Right Link Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(32px, 4vw, 64px)',
            marginBottom: 'clamp(40px, 5vw, 64px)',
          }}
        >
          {/* Left Column: Brand, Beta Badge, Disclaimer, Socials */}
          <div style={{ maxWidth: '440px' }}>
            {/* Brand Title with Logo & Beta Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#181818',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={logoLight}
                  alt="Visualize"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
              </div>
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Visualize
              </span>
              <span
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                Beta
              </span>
            </div>

            {/* Byline */}
            <p style={{ margin: '18px 0 6px 0', fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.9)' }}>
              Made by <a href="#main" style={{ textDecoration: 'underline', color: '#ffffff' }}>Visualize</a>
            </p>

            {/* Disclaimer / Note */}
            <p
              style={{
                margin: '8px 0 24px 0',
                fontSize: '12px',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              Visualize is still in early Beta, so please keep in mind that there may be some imperfections as we continue to work on improving it.
            </p>

            {/* Social Icons Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* Figma */}
              <a
                href="https://figma.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Figma"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4zm0-24C5.8 0 4 1.8 4 4s1.8 4 4 4h4V0H8zm0 8c-2.2 0-4 1.8-4 4s1.8 4 4 4h4V8H8zm8-8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-4 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.9 1.15h3.5l-7.65 8.74L24 22.85h-7.42l-5.81-7.6-6.65 7.6H.61l8.18-9.35L0 1.15h7.6l5.25 6.94 6.05-6.94zm-1.23 19.5h1.94L6.45 3.14H4.37l13.3 17.51z" />
                </svg>
              </a>

              {/* Slack */}
              <a
                href="https://slack.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Slack"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.958 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.958a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.81 4.48c.03-.03.05-.07.08-.1v-8.15a8.28 8.28 0 0 0 5.7 2.27V10.7a4.83 4.83 0 0 1-3.77-4.01h3.77z" />
                </svg>
              </a>

              {/* Webflow / Site */}
              <a
                href="#main"
                aria-label="Website"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm7.93 9h-3.21a14.8 14.8 0 0 0-1.24-5.2A8.02 8.02 0 0 1 19.93 11zM12 4.07a12.8 12.8 0 0 1 1.9 6.93H10.1A12.8 12.8 0 0 1 12 4.07zM4.07 13h3.21a14.8 14.8 0 0 0 1.24 5.2A8.02 8.02 0 0 1 4.07 13zm3.21-2H4.07a8.02 8.02 0 0 1 4.45-5.2A14.8 14.8 0 0 0 7.28 11zM12 19.93a12.8 12.8 0 0 1-1.9-6.93h3.8A12.8 12.8 0 0 1 12 19.93zm2.52-8.93H9.48a14.84 14.84 0 0 1 0-2h5.04a14.84 14.84 0 0 1 0 2zm.72 7.2a14.8 14.8 0 0 0 1.24-5.2h3.21a8.02 8.02 0 0 1-4.45 5.2z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.65)', display: 'inline-flex', transition: 'color 0.2s ease' }}
                className="footer-social-icon"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Columns: Nav Links */}
          <div
            style={{
              display: 'flex',
              gap: 'clamp(32px, 6vw, 96px)',
              justifyContent: 'flex-start',
              marginLeft: 'auto',
            }}
            className="footer-links-wrapper"
          >
            {/* Column 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '120px' }}>
              <a
                href="#pricing"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Install
              </a>
              <a
                href="#how"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Watch Demo
              </a>
              <a
                href="#what"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Pricing
              </a>
              <a
                href="#manifesto"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Manifesto
              </a>
              <a
                href="#faq"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Learn
              </a>
            </div>

            {/* Column 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '120px' }}>
              <a
                href="mailto:feedback@visualize.io"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Feedback
              </a>
              <a
                href="mailto:contact@visualize.io"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Contact
              </a>
              <a
                href="https://slack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Slack
              </a>
              <a
                href="mailto:affiliates@visualize.io"
                className="footer-nav-link"
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
                style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s ease' }}
              >
                Become an Affiliate
              </a>
            </div>
          </div>
        </div>

        {/* 3. Bottom Sub-footer: Copyright & Legal */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.45)',
          }}
        >
          <div>
            &copy; 2026 Visualize. All rights reserved.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              type="button"
              onClick={onOpenCookies}
              className="footer-legal-link"
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.55)',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
                transition: 'color 0.2s ease',
              }}
            >
              Cookies
            </button>
            <a
              href="#privacy"
              className="footer-legal-link"
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
              style={{ color: 'rgba(255, 255, 255, 0.55)', textDecoration: 'none', transition: 'color 0.2s ease' }}
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="footer-legal-link"
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
              style={{ color: 'rgba(255, 255, 255, 0.55)', textDecoration: 'none', transition: 'color 0.2s ease' }}
            >
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

