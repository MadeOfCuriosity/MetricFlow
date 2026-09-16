import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { CursorState } from '../types/landing';
import { CustomCursor } from '../components/landing/CustomCursor';
import { Header } from '../components/landing/Header';
import { DitherPlasmaHero } from '../components/landing/DitherPlasmaHero';
import { LedeSection } from '../components/landing/LedeSection';
import { ArticlesSection } from '../components/landing/ArticlesSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FaqSection } from '../components/landing/FaqSection';
import { Footer } from '../components/landing/Footer';
import { CookieNotice } from '../components/landing/CookieNotice';
import { FloatingGetStarted } from '../components/landing/FloatingGetStarted';
import { ShowcasePage } from '../components/landing/ShowcasePage';
import { AuthPage, AuthMode } from '../components/landing/AuthPage';
import { ManifestoSection } from '../components/landing/ManifestoSection';
import { ShowcaseCategory } from '../data/showcaseData';
import logoLight from '../assets/brand/logo.png';

gsap.registerPlugin(ScrollTrigger);

interface LandingProps {
  initialView?: 'home' | 'showcase' | 'auth';
  initialAuthMode?: AuthMode;
}

export const Landing: React.FC<LandingProps> = ({ initialView, initialAuthMode }) => {
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [entranceActive, setEntranceActive] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'showcase' | 'auth'>(() => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('signin') || hash.includes('auth') || hash.includes('get-started') || hash.includes('invite') || path.includes('/signin') || path.includes('/get-started') || path.includes('/login') || path.includes('/register')) {
        return 'auth';
      }
      if (hash.includes('showcase-library') || hash.includes('showcase-page') || path.includes('/showcase')) {
        return 'showcase';
      }
    }
    return 'home';
  });
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    if (initialAuthMode) return initialAuthMode;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('get-started') || hash.includes('invite') || path.includes('/register') || path.includes('/get-started')) {
        return 'invite';
      }
    }
    return 'signin';
  });
  const [selectedShowcaseCategory, setSelectedShowcaseCategory] = useState<ShowcaseCategory | 'all'>('all');
  const splashRef = useRef<HTMLDivElement | null>(null);

  // Sync hash changes & back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#signin' || hash === '#auth') {
        setAuthMode('signin');
        setCurrentView('auth');
      } else if (hash === '#get-started' || hash === '#invite') {
        setAuthMode('invite');
        setCurrentView('auth');
      } else if (hash === '#manifesto' || hash.includes('manifesto')) {
        setCurrentView('home');
        setTimeout(() => {
          const el = document.getElementById('manifesto');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      } else if (hash.startsWith('#showcase') || hash.startsWith('#article')) {
        setCurrentView('showcase');
        if (hash === '#showcase-d2c') {
          setSelectedShowcaseCategory('d2c');
        } else if (hash === '#showcase-enterprise') {
          setSelectedShowcaseCategory('enterprise');
        } else if (hash === '#showcase-agency') {
          setSelectedShowcaseCategory('agency');
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenManifesto = () => {
    handleNavigateHome('#manifesto');
  };

  const handleOpenShowcase = (category: ShowcaseCategory | 'all' = 'all', slug?: string) => {
    setSelectedShowcaseCategory(category);
    setCurrentView('showcase');
    if (slug) {
      window.history.pushState(null, '', `#showcase/${slug}`);
    } else {
      window.history.pushState(null, '', '#showcase-library');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenAuth = (mode: AuthMode = 'invite') => {
    const targetHash = mode === 'invite' ? '#get-started' : '#signin';
    const targetUrl = `${window.location.origin}${window.location.pathname}${targetHash}`;
    window.open(targetUrl, '_blank');
  };

  const handleNavigateHome = (anchor?: string) => {
    setCurrentView('home');
    if (anchor) {
      window.history.pushState(null, '', anchor);
      setTimeout(() => {
        const el = document.querySelector(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      window.history.pushState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Initialize Lenis smooth scroll synchronized with GSAP Ticker & ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1.1,
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Initial entrance splash animation using GSAP
    const splashTl = gsap.timeline({
      delay: 0.4,
      onComplete: () => setEntranceActive(false),
    });

    splashTl
      .to('.splash-logo', { scale: 1.1, duration: 0.4, ease: 'power2.out' })
      .to(splashRef.current, { opacity: 0, duration: 0.6, ease: 'power3.inOut' });

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#000000' }}>
      {/* Entrance Splash Screen with GSAP reveal */}
      {entranceActive && (
        <div
          ref={splashRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <img
            src={logoLight}
            alt="Visualize"
            className="splash-logo"
            style={{
              width: '72px',
              height: '72px',
              objectFit: 'contain',
              filter: 'brightness(0)',
            }}
          />
        </div>
      )}

      {/* Interactive Custom Cursor driven by GSAP quickTo */}
      <CustomCursor cursorState={cursorState} />

      {currentView === 'auth' ? (
        <AuthPage
          setCursorState={setCursorState}
          onNavigateHome={handleNavigateHome}
          initialMode={authMode}
        />
      ) : currentView === 'showcase' ? (
        <ShowcasePage
          setCursorState={setCursorState}
          onNavigateHome={handleNavigateHome}
          onOpenManifesto={handleOpenManifesto}
          onOpenCookies={() => setCookieOpen(true)}
          initialCategory={selectedShowcaseCategory}
        />
      ) : (
        <>
          {/* Global Header */}
          <Header
            setCursorState={setCursorState}
            onOpenShowcase={handleOpenShowcase}
            onNavigateHome={handleNavigateHome}
          />

          {/* Main Content Sections */}
          <main id="main">
            {/* 1. Dither Plasma Shader Hero with GSAP Entrance & Parallax */}
            <DitherPlasmaHero setCursorState={setCursorState} />

            {/* 2. Editorial Scroll-Illuminated Lede with GSAP ScrollTrigger Character Reveal */}
            <LedeSection />

            {/* 3. Lean Mission Statement & Manifesto Section */}
            <ManifestoSection setCursorState={setCursorState} onOpenAuth={handleOpenAuth} />

            {/* 4. Tiered Technical Edition Pricing with ScrambleText & GSAP Reveal */}
            <PricingSection setCursorState={setCursorState} onOpenAuth={handleOpenAuth} />

            {/* 5. Procedural Geometric Show Case with GSAP ScrollTrigger */}
            <ArticlesSection setCursorState={setCursorState} onOpenShowcase={handleOpenShowcase} />

            {/* 6. Minimalist Technical FAQs with GSAP Accordion Physics */}
            <FaqSection setCursorState={setCursorState} />
          </main>

          {/* Global Footer */}
          <Footer
            setCursorState={setCursorState}
            onOpenCookies={() => setCookieOpen(true)}
            onOpenAuth={handleOpenAuth}
          />

          {/* Floating Get Started Dock Widget */}
          <FloatingGetStarted setCursorState={setCursorState} onOpenAuth={handleOpenAuth} />
        </>
      )}

      {/* Cookie Consent Notice */}
      <CookieNotice setCursorState={setCursorState} isOpen={cookieOpen || true} />
    </div>
  );
};

export default Landing;
