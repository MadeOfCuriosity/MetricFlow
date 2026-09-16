import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { CursorState } from '../../types/landing';
import logoLight from '../../assets/brand/logo.png';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface HeaderProps {
  setCursorState: (state: CursorState) => void;
  onOpenShowcase?: () => void;
  onNavigateHome?: (anchor?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  setCursorState,
  onOpenShowcase,
  onNavigateHome,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const logoWordRef = useRef<HTMLDivElement | null>(null);
  const logoWrapRef = useRef<HTMLAnchorElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // GSAP Morphing Pill Header Timeline (Desktop only via matchMedia)
  useGSAP(
    () => {
      const header = headerRef.current;
      const inner = innerRef.current;
      const logoWord = logoWordRef.current;
      const nav = navRef.current;
      if (!header || !inner || !logoWord || !nav) return;

      const mm = gsap.matchMedia();

      mm.add('(min-width: 769px)', () => {
        // Master scroll-triggered timeline for the capsule transition on desktop
        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: 'power3.inOut' },
        });

        // 1. Collapse the wordmark container from 78px to 0 width
        tl.to(
          logoWord,
          {
            width: 0,
            opacity: 0,
            duration: 0.35,
          },
          0
        );

        // 2. Morph the header into a centered, balanced frosted capsule pill
        tl.to(
          header,
          {
            width: 'min(375px, calc(100vw - 20px))',
            borderRadius: 500,
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            paddingLeft: '24px',
            paddingRight: '26px',
            paddingTop: '16px',
            paddingBottom: '16px',
            minHeight: '52px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            border: 'none',
            color: '#151515',
            duration: 0.45,
          },
          0.05
        );

        // 3. Remove gutter padding on inner container so it fits snugly inside pill
        tl.to(
          inner,
          {
            paddingLeft: 0,
            paddingRight: 0,
            justifyContent: 'space-between',
            duration: 0.45,
          },
          0.05
        );

        // 4. Tighten nav link spacing and sync colors
        tl.to(
          nav,
          {
            gap: '16px',
            duration: 0.45,
          },
          0.05
        );

        tl.to(
          nav.querySelectorAll('.nav-link'),
          {
            color: 'inherit',
            duration: 0.45,
          },
          0.05
        );

        // Invert white logo in frosted capsule pill so it stays dark and crisp
        if (logoImgRef.current) {
          tl.to(
            logoImgRef.current,
            {
              filter: 'invert(1)',
              duration: 0.45,
            },
            0.05
          );
        }

        // ScrollTrigger to play/reverse on scroll
        const trigger = ScrollTrigger.create({
          trigger: document.documentElement,
          start: 25,
          end: 'max',
          onUpdate: (self) => {
            if (self.direction === 1 && self.scroll() > 30) {
              tl.play();
            } else if (self.scroll() <= 20) {
              tl.reverse();
            }
          },
          onLeaveBack: () => {
            tl.reverse();
          },
        });

        return () => {
          trigger.kill();
          tl.kill();
        };
      });

      mm.add('(max-width: 768px)', () => {
        // Mobile header scroll background blur
        const mobileTrigger = ScrollTrigger.create({
          trigger: document.documentElement,
          start: 20,
          onUpdate: (self) => {
            if (self.scroll() > 20) {
              gsap.to(header, {
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                duration: 0.3,
                overwrite: 'auto',
              });
            } else {
              gsap.to(header, {
                backgroundColor: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                duration: 0.3,
                overwrite: 'auto',
              });
            }
          },
        });

        return () => mobileTrigger.kill();
      });

      return () => mm.revert();
    },
    { scope: headerRef }
  );

  return (
    <>
      <header ref={headerRef} className="header" role="banner">
        <div ref={innerRef} className="header__inner">
          <a
            ref={logoWrapRef}
            href="/"
            className="logo"
            aria-label="Visualize home"
            onClick={(e) => {
              if (onNavigateHome) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            onMouseEnter={() => setCursorState('hover')}
            onMouseLeave={() => setCursorState('default')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            {/* [V] Brandmark Symbol */}
            <img
              ref={logoImgRef}
              src={logoLight}
              alt="Visualize"
              className="logo__symbol"
              style={{
                height: '18px',
                width: '18px',
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
              }}
            />

            {/* Wordmark "isualize" (collapses smoothly in capsule) */}
            <div
              ref={logoWordRef}
              className="logo__word-wrap"
              style={{
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                height: '18px',
                width: '74px',
                willChange: 'width, opacity',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontFamily: 'var(--font-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                isualize
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav ref={navRef} className="header__nav" aria-label="Main">
            <a
              href="#what"
              className="nav-link"
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome('#what');
                }
              }}
              style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
            >
              What
            </a>
            <a
              href="#how"
              className="nav-link"
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome('#how');
                }
              }}
              style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
            >
              How
            </a>
            <a
              href="#pricing"
              className="nav-link"
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome('#pricing');
                }
              }}
              style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
            >
              Pricing
            </a>
            <a
              href="#showcase"
              className="nav-link"
              onClick={(e) => {
                if (onOpenShowcase) {
                  e.preventDefault();
                  onOpenShowcase();
                }
              }}
              style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
              onMouseEnter={() => setCursorState('hover')}
              onMouseLeave={() => setCursorState('default')}
            >
              Showcase
            </a>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="header__menu-btn"
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span
              className="header__menu-bar"
              style={{
                transform: mobileMenuOpen ? 'translateY(8px) rotate(45deg)' : 'none',
              }}
            />
            <span
              className="header__menu-bar"
              style={{
                opacity: mobileMenuOpen ? 0 : 1,
              }}
            />
            <span
              className="header__menu-bar"
              style={{
                transform: mobileMenuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'calc(var(--header-height) + 40px) var(--gutter) var(--gutter)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {['What', 'How', 'Pricing', 'Showcase'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if (item === 'Showcase' && onOpenShowcase) {
                    e.preventDefault();
                    onOpenShowcase();
                  } else if (onNavigateHome) {
                    e.preventDefault();
                    onNavigateHome(`#${item.toLowerCase()}`);
                  }
                }}
                style={{
                  fontSize: 'clamp(32px, 8vw, 48px)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {item}
              </a>
            ))}
          </nav>
          <div>
            <a
              href="mailto:hello@visualize.io"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-mid-grey)',
                textDecoration: 'underline',
              }}
            >
              hello@visualize.io
            </a>
          </div>
        </div>
      )}
    </>
  );
};
