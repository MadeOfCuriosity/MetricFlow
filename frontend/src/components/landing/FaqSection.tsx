import React, { useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CursorState } from '../../types/landing';
import { ScrambleText } from "./ScrambleText";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface FaqItem {
  id: string;
  number: string;
  category: string;
  question: string;
  answer: string;
  details?: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "integrations",
    number: "01",
    category: "INTEGRATIONS",
    question: "What integrations do you support?",
    answer:
      "Currently: Google Sheets, Zoho CRM, Zoho Books, Zoho Sheet, and LeadSquared. We're adding Slack, HubSpot, Stripe, and Salesforce in the coming months. You can also enter data manually or via our API.",
    details: [
      "Native live sync for Google Sheets, Zoho CRM, Zoho Books, Zoho Sheet, and LeadSquared",
      "Upcoming connectors for Slack, HubSpot, Stripe, and Salesforce",
      "Manual data entry and programmatic REST API ingestion",
    ],
  },
  {
    id: "organization-rooms",
    number: "02",
    category: "WORKSPACE",
    question: "Can I organize KPIs by department or team?",
    answer:
      "Yes. Rooms let you organize KPIs by department, team, project, or client, with full hierarchical nesting. Each room has its own members, KPIs, and AI builder. Role-based access ensures everyone sees exactly what they need.",
    details: [
      "Hierarchical nesting by department, team, project, or client",
      "Dedicated members, custom KPIs, and AI builder per room",
      "Granular role-based access control and team privacy perimeters",
    ],
  },
  {
    id: "technical-setup",
    number: "03",
    category: "ONBOARDING",
    question: "Do I need technical help to set it up?",
    answer:
      "No. Connecting a data source takes minutes, not a dev sprint. Our guided setup connects directly without engineering intervention.",
    details: [
      "Zero SQL knowledge or developer bandwidth required",
      "Self-serve authentication in under five minutes",
      "Automated field mapping and instant dashboard generation",
    ],
  },
  {
    id: "data-sources",
    number: "04",
    category: "CONNECTIVITY",
    question: "What data sources does it connect to?",
    answer:
      "Visualize connects to the tools you already use, including Google Sheets, Zoho CRM, Zoho Books, Zoho Sheet, and LeadSquared, plus databases, CSV uploads, and custom webhooks.",
    details: [
      "Cloud CRMs, accounting systems, spreadsheets, and databases",
      "Custom REST API endpoints and automated webhooks",
      "Flexible CSV ingestion with instant schema detection",
    ],
  },
  {
    id: "data-security",
    number: "05",
    category: "SECURITY",
    question: "Is my data secure?",
    answer:
      "Yes. Your data is encrypted and stored on secure infrastructure. We don't share it, and you can disconnect any source anytime.",
    details: [
      "End-to-end encryption in transit and at rest",
      "Strict tenant isolation with zero third-party data sharing",
      "Instant one-click source disconnection and data deletion",
    ],
  },
  /*
  {
    id: "apps-extensions",
    number: "06",
    category: "AUTOMATION",
    question: 'What are "apps"?',
    answer:
      "Small add-ons that act on your dashboard data, like sending automatic WhatsApp reminders for overdue invoices. More are on the way.",
    details: [
      "Event-driven automation triggered by live KPI conditions",
      "Operational integrations including WhatsApp alerts and notifications",
      "Expanding marketplace of workflow extensions and triggers",
    ],
  },
  */
  {
    id: "cancellation",
    number: "06",
    category: "BILLING",
    question: "Can I cancel anytime?",
    answer:
      "Yes. No lock-in, no contracts. You can manage or cancel your subscription anytime with immediate effect.",
    details: [
      "Month-to-month flexibility with zero long-term commitments",
      "Instant self-serve cancellation in your account settings",
      "Full export of your dashboard configurations upon request",
    ],
  },
];

interface FaqSectionProps {
  setCursorState: (state: CursorState) => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ setCursorState }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useGSAP(
    () => {
      // Reveal section header
      gsap.from(".faq-header-anim", {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      });

      // Reveal FAQ rows with staggered slide
      gsap.from(".faq-row-anim", {
        y: 30,
        opacity: 0,
        stagger: 0.08,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
        },
      });
    },
    { scope: sectionRef }
  );

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="container"
      style={{
        paddingTop: "var(--spacing-3xl)",
        paddingBottom: "var(--spacing-4xl)",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Section Header */}
      <div className="section-header faq-header-anim" style={{ marginBottom: "var(--spacing-l)" }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-mid-grey)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "var(--spacing-xs)",
            }}
          >
            <span>[ 04 ]</span>
            <span>//</span>
            <span>FAQ</span>
          </div>
          <ScrambleText
            as="h2"
            text="Frequently Asked"
            className="section-header__title"
            style={{ marginTop: "4px" }}
          />
        </div>

        <a
          href="#contact"
          className="cp-btn"
          onMouseEnter={() => setCursorState("hover")}
          onMouseLeave={() => setCursorState("default")}
        >
          <span className="cp-btn__label">Have a Question?</span>
          <span className="cp-btn__icon">→</span>
        </a>
      </div>

      {/* Accordion List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          borderTop: "1px solid rgba(255, 255, 255, 0.16)",
        }}
      >
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;

          return (
            <div
              key={item.id}
              className="faq-row-anim"
              style={{
                borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                transition: "background-color 0.25s ease",
                backgroundColor: isOpen ? "rgba(255, 255, 255, 0.02)" : "transparent",
              }}
            >
              {/* Question Row Button */}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBlock: "clamp(16px, 1.8vw, 26px)",
                  paddingInline: "clamp(2px, 0.8vw, 12px)",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#ffffff",
                  gap: "var(--spacing-m)",
                }}
              >
                {/* Left Meta: Number & Category */}
                <div
                  className="faq-left-meta"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "clamp(10px, 1.2vw, 20px)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      color: isOpen ? "#F76914" : "var(--color-mid-grey)",
                      transition: "color 0.25s ease",
                    }}
                  >
                    {item.number}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-muted)",
                      letterSpacing: "0.06em",
                      display: "none",
                      textTransform: "uppercase",
                    }}
                    className="faq-category-tag"
                  >
                    // {item.category}
                  </span>
                </div>

                {/* Question Text */}
                <h3
                  style={{
                    margin: 0,
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(15px, 1.15vw, 19px)",
                    fontWeight: 400,
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                    color: isOpen ? "#ffffff" : "rgba(255, 255, 255, 0.88)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {item.question}
                </h3>

                {/* Expanding Icon (Minimalist rotating mathematical plus) */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: "0px",
                    border: isOpen ? "1px solid #F76914" : "1px solid rgba(255, 255, 255, 0.2)",
                    color: isOpen ? "#F76914" : "#ffffff",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    backgroundColor: isOpen ? "rgba(247, 105, 20, 0.16)" : "transparent",
                  }}
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              </button>

              {/* Collapsible Answer Panel */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  overflow: "hidden",
                }}
              >
                <div style={{ minHeight: 0 }}>
                  <div
                    className="faq-answer-inner"
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--text-sm)",
                        lineHeight: 1.6,
                        color: "#a0a0a0",
                        maxWidth: "700px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 300,
                      }}
                    >
                      {item.answer}
                    </p>

                    {item.details && item.details.length > 0 && (
                      <ul
                        style={{
                          margin: "12px 0 0 0",
                          padding: 0,
                          listStyle: "none",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          maxWidth: "680px",
                        }}
                      >
                        {item.details.map((detail, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                              fontSize: "clamp(12px, 0.85vw, 14px)",
                              color: "var(--color-mid-grey)",
                              fontFamily: "var(--font-mono)",
                              lineHeight: 1.4,
                            }}
                          >
                            <span style={{ color: "rgba(255, 255, 255, 0.4)", flexShrink: 0 }}>&bull;</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
