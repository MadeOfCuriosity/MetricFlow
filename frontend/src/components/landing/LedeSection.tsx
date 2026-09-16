import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const LedeSection: React.FC = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const fillRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const graphWrapRef = useRef<HTMLDivElement | null>(null);

  const text =
    "Visualize delivers real-time business intelligence for founders and decision-makers building data-driven, optimized companies. One command surface. Every metric that moves valuation. Connect your entire data stack and pull every KPI, OKR, and financial cohort into a single source of truth, updated continuously with live telemetry, not once a quarter.";

  const words = text.split(' ');

  const pillars = [
    {
      tag: '01',
      title: 'Tracks.',
      desc: 'Continuous metric telemetry. Revenue, growth, cohort retention, and churn, unified live in a single business intelligence screen.',
    },
    {
      tag: '02',
      title: 'Explains.',
      desc: "Automated executive intelligence. Every morning, a concise analyst note breaks down what changed, variance, and why numbers moved before your first standup.",
    },
    {
      tag: '03',
      title: 'Acts.',
      desc: 'Operational BI workflows. Extend Visualize with event-driven apps, like automatic WhatsApp reminders for overdue invoices, turning static charts into execution.',
    },
  ];

  useGSAP(
    () => {
      const chars = containerRef.current?.querySelectorAll('.lede-char');
      const path = pathRef.current;
      const fill = fillRef.current;
      const dot = dotRef.current;
      const glow = glowRef.current;
      const graphWrap = graphWrapRef.current;
      const pillarCards = containerRef.current?.querySelectorAll('.lede-pillar-card');

      if (!chars || chars.length === 0 || !path || !dot || !glow) return;

      const pathLength = path.getTotalLength();
      path.style.strokeDasharray = `${pathLength} ${pathLength}`;
      path.style.strokeDashoffset = `${pathLength}`;

      // Initialize dot position at start of path
      const startPt = path.getPointAtLength(0);
      dot.setAttribute('cx', String(startPt.x));
      dot.setAttribute('cy', String(startPt.y));
      glow.setAttribute('cx', String(startPt.x));
      glow.setAttribute('cy', String(startPt.y));

      // Master scroll scrub timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          end: '+=520',
          scrub: 0.25,
        },
      });

      const totalChars = chars.length;
      // Virtual timeline scale: 100 units
      // 1. Text reading flow reveals swiftly from unit 0 to ~68 units
      tl.fromTo(
        chars,
        { color: '#333333' },
        {
          color: '#ffffff',
          stagger: {
            each: 64 / totalChars,
            from: 'start',
          },
          duration: 4,
          ease: 'none',
        },
        0
      );

      // 2. Graph container entrance
      if (graphWrap) {
        tl.fromTo(
          graphWrap,
          { opacity: 0.2, y: 16 },
          { opacity: 1, y: 0, ease: 'power2.out', duration: 12 },
          0
        );
      }

      // 3. Graph line draws at a slightly slower, more deliberate pace from 0 to 100 units
      tl.fromTo(
        path,
        { strokeDashoffset: pathLength },
        { strokeDashoffset: 0, duration: 100, ease: 'none' },
        0
      );

      // 4. Glowing White Dot travels precisely along the line tip in lockstep with the line
      const dotTracker = { progress: 0 };
      tl.to(
        dotTracker,
        {
          progress: 1,
          duration: 100,
          ease: 'none',
          onUpdate: () => {
            const currentLen = Math.min(dotTracker.progress * pathLength, pathLength);
            const pt = path.getPointAtLength(currentLen);
            dot.setAttribute('cx', String(pt.x));
            dot.setAttribute('cy', String(pt.y));
            glow.setAttribute('cx', String(pt.x));
            glow.setAttribute('cy', String(pt.y));
          },
        },
        0
      );

      // 5. Ambient gradient fill reveals beneath curve
      if (fill) {
        tl.fromTo(
          fill,
          { opacity: 0 },
          { opacity: 0.22, duration: 80, ease: 'power1.out' },
          15
        );
      }

      // 6. Dot halo expands at the summit peak (from 85 to 100 units)
      tl.fromTo(
        glow,
        { r: 8, opacity: 0.3 },
        { r: 24, opacity: 1, ease: 'power2.out', duration: 15 },
        85
      );

      // 7. Pillars stagger reveal
      if (pillarCards && pillarCards.length > 0) {
        gsap.fromTo(
          pillarCards,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.lede-pillars-grid',
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    },
    { scope: containerRef }
  );

  return (
    <section
      id="what"
      ref={containerRef}
      className="container"
      style={{
        paddingTop: 'var(--spacing-4xl)',
        paddingBottom: 'var(--spacing-4xl)',
        maxWidth: '1200px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 'var(--lede-size)',
          lineHeight: 1.45,
          fontWeight: 400,
          letterSpacing: '-0.01em',
        }}
      >
        <strong style={{ fontWeight: 700, color: '#ffffff' }}>Visualize </strong>
        {words.slice(1).map((word, wordIdx) => (
          <span key={wordIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {word.split('').map((char, charIdx) => (
              <span key={charIdx} className="lede-char" style={{ color: '#333333' }}>
                {char}
              </span>
            ))}
            <span className="lede-char" style={{ color: '#333333' }}>
              &nbsp;
            </span>
          </span>
        ))}
      </p>

      {/* Synchronized Graph: Desperate -> Straight -> Rise */}
      <div
        ref={graphWrapRef}
        style={{
          marginTop: 'clamp(18px, 2.5vw, 32px)',
          width: '100%',
          position: 'relative',
          padding: '0 0 10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.35)',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-primary)',
          }}
        >
          <span>// REAL-TIME BI TELEMETRY</span>
          <span>LATENCY: &lt;10MS &bull; ZERO PIPELINE LAG</span>
        </div>
        <svg
          viewBox="0 0 1000 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id="ledeGraphFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Faint Technical Grid Background */}
          <line x1="30" y1="50" x2="980" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 8" />
          <line x1="30" y1="105" x2="980" y2="105" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 8" />
          <line x1="30" y1="165" x2="980" y2="165" stroke="rgba(255,255,255,0.07)" strokeDasharray="4 8" />

          {/* Faint Vertical Grid Lines */}
          <line x1="460" y1="30" x2="460" y2="200" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 6" />
          <line x1="680" y1="30" x2="680" y2="200" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 6" />
          <line x1="935" y1="20" x2="935" y2="200" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" />

          {/* Subtle Depth Fill beneath curve */}
          <path
            ref={fillRef}
            d="M 40 145 C 80 170, 110 200, 145 185 C 175 170, 190 110, 225 125 C 255 140, 270 205, 305 190 C 335 175, 355 135, 385 155 C 410 170, 430 165, 460 165 L 680 165 C 730 165, 770 155, 810 120 C 855 80, 895 32, 935 25 C 955 22, 970 32, 980 40 L 980 205 L 40 205 Z"
            fill="url(#ledeGraphFill)"
            opacity="0"
          />

          {/* The White Line Graph: Desperate -> Straight -> Rise */}
          <path
            ref={pathRef}
            d="M 40 145 C 80 170, 110 200, 145 185 C 175 170, 190 110, 225 125 C 255 140, 270 205, 305 190 C 335 175, 355 135, 385 155 C 410 170, 430 165, 460 165 L 680 165 C 730 165, 770 155, 810 120 C 855 80, 895 32, 935 25 C 955 22, 970 32, 980 40"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glowing Luminous White Dot tracking the line tip */}
          <circle
            ref={glowRef}
            cx="40"
            cy="145"
            r="10"
            fill="rgba(255, 255, 255, 0.45)"
            filter="url(#dotGlow)"
            style={{ pointerEvents: 'none' }}
          />
          <circle
            ref={dotRef}
            cx="40"
            cy="145"
            r="4.5"
            fill="#ffffff"
            style={{ pointerEvents: 'none' }}
          />
        </svg>
      </div>

      {/* 3 Core Pillars: Tracks. Explains. Acts. */}
      <div
        id="how"
        className="lede-pillars-grid"
        style={{
          marginTop: 'clamp(36px, 4.5vw, 56px)',
          scrollMarginTop: 'calc(var(--header-height) + 20px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'clamp(24px, 3vw, 40px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: 'clamp(28px, 3.5vw, 40px)',
        }}
      >
        {pillars.map((item, idx) => (
          <div
            key={idx}
            className="lede-pillar-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.4)',
                fontFamily: 'var(--font-primary)',
              }}
            >
              // {item.tag}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 'clamp(20px, 2.2vw, 24px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#ffffff',
              }}
            >
              {item.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 'clamp(14px, 1.1vw, 15px)',
                lineHeight: 1.55,
                color: '#999999',
                fontWeight: 400,
              }}
            >
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

