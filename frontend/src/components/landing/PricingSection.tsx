import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { CursorState } from '../../types/landing';
import { ScrambleText } from './ScrambleText';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface PricingSectionProps {
  setCursorState: (state: CursorState) => void;
  onOpenAuth?: (mode?: 'signin' | 'invite') => void;
}

interface PricingTier {
  id: string;
  name: string;
  tag: string;
  monthlyPrice: string;
  annualPrice: string;
  annualBilled?: string;
  isCustom?: boolean;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  featured?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tag: 'EARLY STAGE',
    monthlyPrice: '$30',
    annualPrice: '$24',
    annualBilled: 'billed annually ($288/yr)',
    description: 'Essential real-time KPI tracking for early-stage founders and lean teams.',
    features: [
      'Up to 3 workspace rooms',
      'Google Sheets, Zoho, and LeadSquared connectors',
      'Daily morning executive analyst brief',
      'Continuous metric sync (15-min refresh)',
      'Single admin seat included',
      'Standard email support',
    ],
    ctaText: 'Start Free Trial',
    ctaHref: '#start-starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    tag: 'MOST POPULAR',
    monthlyPrice: '$70',
    annualPrice: '$56',
    annualBilled: 'billed annually ($672/yr)',
    description: 'Complete BI command center with automated WhatsApp apps and team nesting.',
    features: [
      'Unlimited workspace rooms with hierarchical nesting',
      'All native connectors plus database and API pipelines',
      'Automated WhatsApp reminders for unpaid invoices',
      'Custom KPI formula builder and AI variance explanations',
      'Real-time continuous telemetry (<1 min sync)',
      'Role-based access control for up to 10 members',
    ],
    ctaText: 'Start Free Trial',
    ctaHref: '#start-growth',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tag: 'SCALE & VOLUME',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    isCustom: true,
    description: 'Dedicated infrastructure, custom data connectors, SLA, and enterprise governance.',
    features: [
      'Unlimited team members, seats, and rooms',
      'Bespoke data warehouse connectors and custom webhooks',
      'Custom workflow app builder and automated triggers',
      'Enterprise SSO, audit logging, and data governance',
      'Dedicated data engineer onboarding and migration',
      '99.9% uptime SLA and priority support',
    ],
    ctaText: 'Contact Sales',
    ctaHref: 'mailto:sales@visualize.io?subject=Enterprise%20Plan%20Inquiry',
  },
];

export const PricingSection: React.FC<PricingSectionProps> = ({ setCursorState, onOpenAuth }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  useGSAP(
    () => {
      const section = sectionRef.current;
      const cards = cardsRef.current;
      if (!section || !cards) return;

      gsap.from('.pricing-header-anim', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
        },
      });

      gsap.from('.pricing-card-anim', {
        y: 50,
        opacity: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: cards,
          start: 'top 85%',
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section id="pricing" ref={sectionRef} className="container pricing-section">
      {/* Section Header */}
      <div className="section-header pricing-header-anim" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '6px',
            }}
          >
            // PLANS &amp; PRICING
          </div>
          <ScrambleText as="h2" text="Pricing" className="section-header__title" />
        </div>
        <div
          style={{
            maxWidth: '420px',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-mid-grey)',
            lineHeight: 1.45,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Simple, transparent pricing for growing businesses. Cancel anytime with zero lock-in.
        </div>
      </div>

      {/* Monthly / Annual Toggle Switch */}
      <div
        className="pricing-toggle-wrap pricing-header-anim"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginTop: 'clamp(20px, 2.5vw, 32px)',
          marginBottom: 'clamp(24px, 3vw, 40px)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px',
            backgroundColor: '#111111',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            onMouseEnter={() => setCursorState('hover')}
            onMouseLeave={() => setCursorState('default')}
            style={{
              padding: '8px 18px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              backgroundColor: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
              color: billingCycle === 'monthly' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            onMouseEnter={() => setCursorState('hover')}
            onMouseLeave={() => setCursorState('default')}
            style={{
              padding: '8px 18px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: billingCycle === 'annual' ? '#ffffff' : 'transparent',
              color: billingCycle === 'annual' ? '#000000' : 'rgba(255, 255, 255, 0.6)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Annual</span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: billingCycle === 'annual' ? '#000000' : 'rgba(255, 255, 255, 0.15)',
                color: billingCycle === 'annual' ? '#ffffff' : '#ffffff',
                borderRadius: '2px',
                fontWeight: 800,
                letterSpacing: '0.02em',
              }}
            >
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div ref={cardsRef} className="pricing-grid">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`pricing-card pricing-card-anim ${tier.featured ? 'pricing-card--featured' : ''}`}
            onMouseEnter={() => setCursorState('hover')}
            onMouseLeave={() => setCursorState('default')}
          >
            {/* Top Meta Header */}
            <div className="pricing-card__header">
              <div className="pricing-card__tag-wrap">
                <span className={`pricing-card__tag ${tier.featured ? 'pricing-card__tag--featured' : ''}`}>
                  {tier.tag}
                </span>
              </div>
              <h3 className="pricing-card__title">{tier.name}</h3>
              <p className="pricing-card__desc">{tier.description}</p>
            </div>

            {/* Pricing Number */}
            <div className="pricing-card__price-box">
              <span className="pricing-card__price">
                {tier.isCustom
                  ? 'Custom'
                  : billingCycle === 'annual'
                  ? tier.annualPrice
                  : tier.monthlyPrice}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="pricing-card__billing">
                  {tier.isCustom ? 'bespoke' : '/month'}
                </span>
                {!tier.isCustom && billingCycle === 'annual' && tier.annualBilled && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontFamily: 'var(--font-primary)',
                      marginTop: '2px',
                    }}
                  >
                    {tier.annualBilled}
                  </span>
                )}
                {tier.isCustom && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontFamily: 'var(--font-primary)',
                      marginTop: '2px',
                    }}
                  >
                    tailored volume &amp; SLA
                  </span>
                )}
              </div>
            </div>

            <div className="pricing-card__divider" />

            {/* Features Checklist */}
            <ul className="pricing-card__features" aria-label={`${tier.name} features`}>
              {tier.features.map((feature, idx) => (
                <li key={idx} className="pricing-card__feature-item">
                  <span className="pricing-card__check" aria-hidden="true">
                    [✓]
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div className="pricing-card__footer">
              <a
                href={tier.ctaHref.startsWith('mailto') ? tier.ctaHref : '#get-started'}
                target={tier.ctaHref.startsWith('mailto') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!tier.ctaHref.startsWith('mailto')) {
                    e.preventDefault();
                    if (onOpenAuth) {
                      onOpenAuth('invite');
                    } else {
                      const targetUrl = `${window.location.origin}${window.location.pathname}#get-started`;
                      window.open(targetUrl, '_blank');
                    }
                  }
                }}
                className={`cp-btn pricing-card__btn ${tier.featured ? 'pricing-card__btn--featured' : ''}`}
                onMouseEnter={() => setCursorState('hover')}
                onMouseLeave={() => setCursorState('default')}
              >
                <span>{tier.ctaText}</span>
                <span className="cp-btn__icon">→</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
