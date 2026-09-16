import React, { useState } from 'react';
import { CursorState } from '../../types/landing';

interface CookieNoticeProps {
  setCursorState: (state: CursorState) => void;
  isOpen?: boolean;
}

export const CookieNotice: React.FC<CookieNoticeProps> = ({ setCursorState, isOpen = true }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isOpen) return null;

  return (
    <div
      className="cookie-notice"
      role="region"
      aria-label="Cookie notice"
      style={{
        position: 'fixed',
        bottom: 'var(--spacing-l)',
        left: 'var(--spacing-l)',
        zIndex: 40,
        maxWidth: '420px',
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>
        <p style={{ margin: 0, color: 'var(--color-text)' }}>
          This site uses cookies to improve user experience
        </p>
        <a
          href="#privacy"
          style={{ textDecoration: 'underline', color: 'var(--color-mid-grey)' }}
          onMouseEnter={() => setCursorState('hover')}
          onMouseLeave={() => setCursorState('default')}
        >
          Privacy policy
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="cp-btn"
          style={{ padding: '8px 16px', fontSize: '11px' }}
          onMouseEnter={() => setCursorState('hover')}
          onMouseLeave={() => setCursorState('default')}
        >
          That&apos;s OK
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            fontSize: '11px',
            textDecoration: 'underline',
            color: 'var(--color-mid-grey)',
            padding: '4px',
          }}
          onMouseEnter={() => setCursorState('hover')}
          onMouseLeave={() => setCursorState('default')}
        >
          Decline cookies
        </button>
      </div>
    </div>
  );
};
