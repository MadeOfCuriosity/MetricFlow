import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ARTICLES } from '../../data/articles';
import { CursorState } from '../../types/landing';
import { ScrambleText } from './ScrambleText';

gsap.registerPlugin(ScrollTrigger, useGSAP);

import { ShowcaseCategory } from '../../data/showcaseData';

interface ArticlesSectionProps {
  setCursorState: (state: CursorState) => void;
  onOpenShowcase?: (category?: ShowcaseCategory | 'all', slug?: string) => void;
}

export const ArticlesSection: React.FC<ArticlesSectionProps> = ({ setCursorState, onOpenShowcase }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Mobile: Pin section and scroll cards horizontally as user scrolls down
      mm.add('(max-width: 768px)', () => {
        const section = sectionRef.current;
        const track = trackRef.current;
        if (!section || !track) return;

        gsap.set(track, { clearProps: 'transform' });

        const getDistance = () => {
          return track.scrollWidth - window.innerWidth + 36;
        };

        const tween = gsap.to(track, {
          x: () => -getDistance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 70px',
            end: () => `+=${Math.max(450, getDistance() * 1.4)}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      // Desktop: 3-column reveal
      mm.add('(min-width: 769px)', () => {
        gsap.from('.articles-header-anim', {
          y: 40,
          opacity: 0,
          stagger: 0.1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        });

        gsap.from('.article-card-anim', {
          y: 60,
          opacity: 0,
          stagger: 0.18,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        });
      });
    },
    { scope: sectionRef }
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 12;
    const rotateY = ((x - centerX) / centerX) * 12;

    gsap.to(card, {
      rotateX,
      rotateY,
      duration: 0.3,
      ease: 'power1.out',
      transformPerspective: 500,
      transformOrigin: 'center center',
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: 'power2.out',
    });
  };

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="container articles-section"
      style={{
        maxWidth: '1300px',
        margin: '0 auto',
      }}
    >
      {/* Section Header */}
      <div className="section-header">
        <ScrambleText as="h2" text="Show Case" className="section-header__title articles-header-anim" />
        <a
          href="#showcase"
          className="cp-btn articles-header-anim"
          onClick={(e) => {
            if (onOpenShowcase) {
              e.preventDefault();
              onOpenShowcase();
            }
          }}
          onMouseEnter={() => setCursorState('hover')}
          onMouseLeave={() => setCursorState('default')}
        >
          <span className="cp-btn__label">ALL SHOWCASE</span>
          <span className="cp-btn__icon">→</span>
        </a>
      </div>

      {/* Editorial Card Track (Grid on Desktop, Horizontal Scroll on Mobile) */}
      <div className="card-carousel-shell">
        <div className="card-carousel">
          <div ref={trackRef} className="card-carousel__track">
            {ARTICLES.map((article) => {
          return (
            <article
              key={article.id}
              className="article-card article-card-anim"
            >
              {/* Image Surface with 3D Tilt */}
              <div
                style={{ perspective: '500px', cursor: 'pointer' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={() => setCursorState('read')}
                onClick={() => onOpenShowcase?.('all', article.slug)}
              >
                <div
                  style={{
                    display: 'block',
                    aspectRatio: '1 / 1',
                    border: '1px solid var(--color-text)',
                    overflow: 'hidden',
                    backgroundColor: '#111111',
                    position: 'relative',
                    willChange: 'transform',
                  }}
                >
                  {/* Procedural Geometric Vector Artwork */}
                  {article.svgType === 'python' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                      viewBox="0 0 400 400"
                      style={{ display: 'block', width: '100%', height: '100%' }}
                    >
                      <rect width="400" height="400" fill="#111" />
                      <g stroke="#fff" fill="none">
                        <line x1="400" y1="400" x2="0" y2="400" strokeWidth="1.5" />
                        <line x1="0" y1="400" x2="0" y2="0" strokeWidth="1.5" />
                        <line x1="0" y1="0" x2="400" y2="0" strokeWidth="1.5" />
                        <line x1="400" y1="0" x2="400" y2="400" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="400" y1="400" x2="200" y2="200" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="0" y2="200" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="200" y2="0" strokeWidth="1.5" />
                        <path d="M 200.0 0.0 A 200 200 0 0 0 0.0 200.0" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="80" y1="80" x2="0" y2="0" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="360" y1="360" x2="0" y2="360" strokeWidth="1.5" />
                        <line x1="320" y1="320" x2="0" y2="320" strokeWidth="1.5" />
                        <line x1="280" y1="280" x2="0" y2="280" strokeWidth="1.5" />
                        <line x1="80" y1="80" x2="0" y2="80" strokeWidth="1.5" />
                        <line x1="40" y1="40" x2="0" y2="40" strokeWidth="1.5" />
                      </g>
                    </svg>
                  )}

                  {article.svgType === 'roadmap' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                      viewBox="0 0 400 400"
                      style={{ display: 'block', width: '100%', height: '100%' }}
                    >
                      <rect width="400" height="400" fill="#111" />
                      <g stroke="#fff" fill="none">
                        <line x1="400" y1="400" x2="0" y2="400" strokeWidth="1.5" />
                        <line x1="0" y1="400" x2="0" y2="0" strokeWidth="1.5" />
                        <line x1="0" y1="0" x2="400" y2="0" strokeWidth="1.5" />
                        <line x1="400" y1="0" x2="400" y2="400" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="400" y1="200" x2="0" y2="200" strokeWidth="1.5" />
                        <path d="M 400.0 200.0 A 200 200 0 0 0 0.0 200.0" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="0" y2="400" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="160" y1="240" x2="0" y2="240" strokeWidth="1.5" />
                        <line x1="80" y1="320" x2="0" y2="320" strokeWidth="1.5" />
                        <line x1="40" y1="0" x2="0" y2="0" strokeWidth="1.5" />
                        <line x1="80" y1="0" x2="40" y2="0" strokeWidth="1.5" />
                      </g>
                    </svg>
                  )}

                  {article.svgType === 'context' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                      viewBox="0 0 400 400"
                      style={{ display: 'block', width: '100%', height: '100%' }}
                    >
                      <rect width="400" height="400" fill="#111" />
                      <g stroke="#fff" fill="none">
                        <line x1="0" y1="0" x2="400" y2="0" strokeWidth="1.5" />
                        <line x1="400" y1="0" x2="400" y2="400" strokeWidth="1.5" />
                        <line x1="400" y1="400" x2="0" y2="400" strokeWidth="1.5" />
                        <line x1="0" y1="400" x2="0" y2="0" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="0" y1="0" x2="200" y2="200" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="400" y2="200" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="200" y2="400" strokeWidth="1.5" />
                        <path d="M 200 400 A 200 200 0 0 1 400 200" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="320" y1="320" x2="400" y2="400" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <line x1="40" y1="40" x2="400" y2="40" strokeWidth="1.5" />
                        <line x1="80" y1="80" x2="400" y2="80" strokeWidth="1.5" />
                        <line x1="120" y1="120" x2="400" y2="120" strokeWidth="1.5" />
                        <line x1="320" y1="320" x2="400" y2="320" strokeWidth="1.5" />
                        <line x1="360" y1="360" x2="400" y2="360" strokeWidth="1.5" />
                        <line x1="360" y1="0" x2="400" y2="0" strokeWidth="1.5" />
                        <line x1="320" y1="0" x2="360" y2="0" strokeWidth="1.5" />
                        <line x1="280" y1="0" x2="320" y2="0" strokeWidth="1.5" />
                        <line x1="240" y1="0" x2="280" y2="0" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="320" y2="80" strokeWidth="1.5" />
                      </g>
                    </svg>
                  )}

                  {article.svgType === 'rooms' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                      viewBox="0 0 400 400"
                      style={{ display: 'block', width: '100%', height: '100%' }}
                    >
                      <rect width="400" height="400" fill="#111" />
                      <g stroke="#fff" fill="none">
                        <line x1="0" y1="0" x2="400" y2="0" strokeWidth="1.5" />
                        <line x1="400" y1="0" x2="400" y2="400" strokeWidth="1.5" />
                        <line x1="400" y1="400" x2="0" y2="400" strokeWidth="1.5" />
                        <line x1="0" y1="400" x2="0" y2="0" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <rect x="60" y="60" width="120" height="120" strokeWidth="1.5" />
                        <rect x="220" y="60" width="120" height="120" strokeWidth="1.5" />
                        <rect x="60" y="220" width="120" height="120" strokeWidth="1.5" />
                        <rect x="220" y="220" width="120" height="120" strokeWidth="1.5" />
                        <line x1="180" y1="120" x2="220" y2="120" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="120" y1="180" x2="120" y2="220" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="280" y1="180" x2="280" y2="220" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="180" y1="280" x2="220" y2="280" strokeWidth="1.5" strokeDasharray="3 3" />
                        <circle cx="120" cy="120" r="16" strokeWidth="1.5" />
                        <circle cx="280" cy="120" r="16" strokeWidth="1.5" />
                        <circle cx="120" cy="280" r="16" strokeWidth="1.5" />
                        <circle cx="280" cy="280" r="16" strokeWidth="1.5" />
                      </g>
                    </svg>
                  )}

                  {article.svgType === 'analyst' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                      viewBox="0 0 400 400"
                      style={{ display: 'block', width: '100%', height: '100%' }}
                    >
                      <rect width="400" height="400" fill="#111" />
                      <g stroke="#fff" fill="none">
                        <line x1="0" y1="0" x2="400" y2="0" strokeWidth="1.5" />
                        <line x1="400" y1="0" x2="400" y2="400" strokeWidth="1.5" />
                        <line x1="400" y1="400" x2="0" y2="400" strokeWidth="1.5" />
                        <line x1="0" y1="400" x2="0" y2="0" strokeWidth="1.5" />
                      </g>
                      <g stroke="#fff" fill="none">
                        <path d="M 40 320 L 120 260 L 200 290 L 280 160 L 360 80" strokeWidth="2" />
                        <circle cx="360" cy="80" r="8" fill="#fff" />
                        <line x1="40" y1="360" x2="360" y2="360" strokeWidth="1.5" />
                        <line x1="40" y1="40" x2="40" y2="360" strokeWidth="1.5" />
                        <line x1="120" y1="40" x2="120" y2="360" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                        <line x1="200" y1="40" x2="200" y2="360" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                        <line x1="280" y1="40" x2="280" y2="360" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                        <line x1="40" y1="160" x2="360" y2="160" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                        <line x1="40" y1="260" x2="360" y2="260" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                      </g>
                    </svg>
                  )}
                </div>
              </div>

              {/* Text Information */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3
                  className="article-card__title"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(14px, 3.8vw, 15px)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-primary)',
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                  }}
                >
                  <a
                    href={`#showcase/${article.slug}`}
                    onClick={(e) => {
                      if (onOpenShowcase) {
                        e.preventDefault();
                        onOpenShowcase('all', article.slug);
                      }
                    }}
                    style={{ color: '#ffffff', textDecoration: 'none' }}
                    onMouseEnter={() => setCursorState('hover')}
                    onMouseLeave={() => setCursorState('default')}
                  >
                    {article.title}
                  </a>
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'clamp(12px, 3.2vw, 13px)',
                    lineHeight: 1.45,
                    fontFamily: 'var(--font-primary)',
                    color: '#a1a1a1',
                  }}
                >
                  {article.excerpt}
                </p>
                <a
                  href={`#showcase/${article.slug}`}
                  onClick={(e) => {
                    if (onOpenShowcase) {
                      e.preventDefault();
                      onOpenShowcase('all', article.slug);
                    }
                  }}
                  style={{
                    fontSize: 'clamp(12px, 3.2vw, 13px)',
                    textDecoration: 'underline',
                    fontFamily: 'var(--font-primary)',
                    color: '#ffffff',
                    paddingTop: '2px',
                  }}
                  onMouseEnter={() => setCursorState('hover')}
                  onMouseLeave={() => setCursorState('default')}
                >
                  Read article &rarr;
                </a>
              </div>
            </article>
          );
        })}
          </div>
        </div>
        <div className="card-carousel__fade" aria-hidden="true" />
      </div>
    </section>
  );
};
