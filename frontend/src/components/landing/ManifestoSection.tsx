import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CursorState } from '../../types/landing';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ManifestoSectionProps {
  setCursorState?: (state: CursorState) => void;
  onOpenAuth?: (mode?: "signin" | "invite") => void;
}

const P1 =
  "For decades, companies have built incredible products only to drown in their own accounting: endless spreadsheets, delayed dashboards, and teams spending twenty hours a week reconciling numbers that should have computed themselves in milliseconds. You couldn’t get real-time contribution margin across payment fees, ad spend, and logistics without hiring a data team, so true unit economics became a luxury good and everyone else got a lagging CSV export.";

const P2 =
  "That constraint just expired. For the first time, software can continuously ingest telemetry, audit every transaction, surface hidden leaks, and automate the boring math. We built Visualize so decision makers never have to fight spreadsheets again. Calm, automated clarity so you can focus on building it right.";

const P3 = "Numbers should serve judgment, not consume it.";

export const ManifestoSection: React.FC<ManifestoSectionProps> = () => {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const chars = sectionRef.current.querySelectorAll(".manifesto-char");
      const signature = sectionRef.current.querySelector(".manifesto-signature");
      const label = sectionRef.current.querySelector(".manifesto-label");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          end: "+=700",
          scrub: 0.25,
        },
      });

      if (label) {
        tl.fromTo(
          label,
          { opacity: 0.3, y: 12 },
          { opacity: 1, y: 0, duration: 8, ease: "power1.out" },
          0
        );
      }

      const totalChars = chars.length;
      if (totalChars > 0) {
        tl.fromTo(
          chars,
          { color: "#333333" },
          {
            color: "#ffffff",
            stagger: {
              each: 78 / totalChars,
              from: "start",
            },
            duration: 4,
            ease: "none",
          },
          4
        );
      }

      if (signature) {
        tl.fromTo(
          signature,
          { opacity: 0.1, y: 24 },
          { opacity: 1, y: 0, duration: 18, ease: "power2.out" },
          76
        );
      }
    },
    { scope: sectionRef }
  );

  const renderWords = (text: string, strong = false) => {
    const words = text.split(" ");
    return words.map((word, wordIdx) => (
      <span key={wordIdx} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
        {word.split("").map((char, charIdx) => (
          <span
            key={charIdx}
            className="manifesto-char"
            style={{
              color: "#333333",
              fontWeight: strong ? 700 : 400,
            }}
          >
            {char}
          </span>
        ))}
        <span className="manifesto-char" style={{ color: "#333333" }}>
          &nbsp;
        </span>
      </span>
    ));
  };

  return (
    <section
      id="manifesto"
      ref={sectionRef}
      className="manifesto-section"
      style={{
        position: "relative",
        backgroundColor: "#000000",
        color: "#ffffff",
        padding: "clamp(80px, 10vw, 140px) clamp(20px, 4vw, 40px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Section Label */}
        <div
          className="manifesto-label"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.5)",
            letterSpacing: "0.06em",
            marginBottom: "clamp(28px, 4vw, 40px)",
            textTransform: "uppercase",
          }}
        >
          // MISSION &amp; MANIFESTO
        </div>

        {/* Editorial Body Text with Scroll Reveal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(24px, 3.5vw, 36px)",
            width: "100%",
          }}
        >
          <p
            style={{
              fontSize: "clamp(18px, 2.2vw, 23px)",
              lineHeight: 1.75,
              fontFamily: "var(--font-primary)",
              letterSpacing: "-0.012em",
              margin: 0,
              fontWeight: 400,
            }}
          >
            {renderWords(P1, false)}
          </p>

          <p
            style={{
              fontSize: "clamp(18px, 2.2vw, 23px)",
              lineHeight: 1.75,
              fontFamily: "var(--font-primary)",
              letterSpacing: "-0.012em",
              margin: 0,
              fontWeight: 400,
            }}
          >
            {renderWords(P2, false)}
          </p>

          <p
            style={{
              fontSize: "clamp(20px, 2.6vw, 26px)",
              lineHeight: 1.6,
              fontFamily: "var(--font-primary)",
              letterSpacing: "-0.012em",
              margin: 0,
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {renderWords(P3, true)}
          </p>
        </div>

        {/* Founder Signature */}
        <div
          className="manifesto-signature"
          style={{
            marginTop: "clamp(48px, 6vw, 68px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontStyle: "italic",
              fontSize: "clamp(24px, 3vw, 32px)",
              color: "rgba(255, 255, 255, 0.45)",
              letterSpacing: "0.02em",
              lineHeight: 1.2,
              userSelect: "none",
            }}
          >
            Mohammed Arif
          </div>

          <div
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "rgba(255, 255, 255, 0.45)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Co-founder, Visualize
          </div>
        </div>
      </div>
    </section>
  );
};
