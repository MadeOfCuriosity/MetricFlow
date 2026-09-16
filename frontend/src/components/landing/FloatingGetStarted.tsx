import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { CursorState } from '../../types/landing';
import logoLight from '../../assets/brand/logo.png';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface FloatingGetStartedProps {
  setCursorState: (state: CursorState) => void;
  onOpenAuth?: (mode?: 'signin' | 'invite') => void;
}

export const FloatingGetStarted: React.FC<FloatingGetStartedProps> = ({ setCursorState, onOpenAuth }) => {
  const [btnHover, setBtnHover] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const dockRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const dock = dockRef.current;
      if (!dock) return;

      // Start initially hidden
      gsap.set(dock, {
        opacity: 0,
        y: 28,
        pointerEvents: 'none',
      });

      const hero = document.querySelector('.home-hero');
      const footer = document.querySelector('footer');

      if (!hero || !footer) return;

      const trigger = ScrollTrigger.create({
        trigger: hero,
        start: 'bottom 70%',
        endTrigger: footer,
        end: 'top 92%',
        onEnter: () => {
          gsap.to(dock, {
            opacity: 1,
            y: 0,
            pointerEvents: 'auto',
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        },
        onLeave: () => {
          gsap.to(dock, {
            opacity: 0,
            y: 28,
            pointerEvents: 'none',
            duration: 0.3,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        },
        onEnterBack: () => {
          gsap.to(dock, {
            opacity: 1,
            y: 0,
            pointerEvents: 'auto',
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        },
        onLeaveBack: () => {
          gsap.to(dock, {
            opacity: 0,
            y: 28,
            pointerEvents: 'none',
            duration: 0.3,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        },
      });

      return () => {
        trigger.kill();
      };
    },
    { scope: dockRef }
  );

  return (
    <aside
      ref={dockRef}
      className="floating-dock-container"
      aria-label="Quick Actions"
      style={{
        position: 'fixed',
        bottom: 'clamp(18px, 2.5vw, 30px)',
        right: 'clamp(18px, 2.5vw, 30px)',
        zIndex: 9990,
        filter: 'drop-shadow(0 14px 36px rgba(0, 0, 0, 0.75))',
      }}
    >
      <div
        className="floating-dock-inner"
        style={{
          position: 'relative',
          width: '216px',
          height: '54px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Organic Unified Chassis SVG Background with Concave Waist */}
        <svg
          width="216"
          height="54"
          viewBox="0 0 216 54"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* Chassis Base Fill & Outer Stroke */}
          <path
            d="
              M 27 0
              A 27 27 0 0 0 0 27
              A 27 27 0 0 0 27 54
              C 38 54 44 47 50 47
              C 56 47 62 54 73 54
              L 189 54
              A 27 27 0 0 0 216 27
              A 27 27 0 0 0 189 0
              L 73 0
              C 62 0 56 7 50 7
              C 44 7 38 0 27 0
              Z
            "
            fill="#0f0f0f"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="1.2"
          />
        </svg>

        {/* 1. Left Module: Brand Logo Capsule */}
        <a
          href="#main"
          className="dock-circle-btn"
          aria-label="Visualize Home"
          onMouseEnter={() => {
            setLogoHover(true);
            setCursorState('hover');
          }}
          onMouseLeave={() => {
            setLogoHover(false);
            setCursorState('default');
          }}
          style={{
            position: 'absolute',
            left: '4px',
            top: '4px',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: logoHover ? '#222222' : '#161616',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            textDecoration: 'none',
            transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
            transform: logoHover ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          <img
            src={logoLight}
            alt="Visualize"
            style={{
              width: '20px',
              height: '20px',
              objectFit: 'contain',
              display: 'block',
              transition: 'transform 0.2s ease',
              transform: logoHover ? 'scale(1.08)' : 'scale(1)',
            }}
          />
        </a>

        {/* 2. Right Module: Action Button (GET STARTED) */}
        <a
          href="#get-started"
          target="_blank"
          rel="noopener noreferrer"
          className="dock-action-btn"
          onClick={(e) => {
            e.preventDefault();
            if (onOpenAuth) {
              onOpenAuth('invite');
            } else {
              const targetUrl = `${window.location.origin}${window.location.pathname}#get-started`;
              window.open(targetUrl, '_blank');
            }
          }}
          onMouseEnter={() => {
            setBtnHover(true);
            setCursorState('hover');
          }}
          onMouseLeave={() => {
            setBtnHover(false);
            setCursorState('default');
          }}
          style={{
            position: 'absolute',
            left: '58px',
            top: '4px',
            width: '154px',
            height: '46px',
            borderRadius: '23px',
            backgroundColor: btnHover ? '#ffffff' : '#161616',
            color: btnHover ? '#000000' : '#ffffff',
            border: btnHover ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13.5px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s ease',
            boxShadow: btnHover ? '0 0 20px rgba(255, 255, 255, 0.25)' : 'none',
          }}
        >
          Get Started
        </a>
      </div>
    </aside>
  );
};
export default FloatingGetStarted;
