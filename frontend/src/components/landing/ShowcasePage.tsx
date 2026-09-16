import React, { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import { CursorState } from '../../types/landing';
import { SHOWCASE_ITEMS, ShowcaseItem, ShowcaseCategory, ShowcaseType } from '../../data/showcaseData';
import { Header } from "./Header";
import { Footer } from "./Footer";

interface ShowcasePageProps {
  setCursorState: (state: CursorState) => void;
  onNavigateHome: (anchor?: string) => void;
  onOpenManifesto?: () => void;
  onOpenCookies?: () => void;
  initialCategory?: ShowcaseCategory | "all";
}

export const ShowcasePage: React.FC<ShowcasePageProps> = ({
  setCursorState,
  onNavigateHome,
  onOpenCookies,
  initialCategory = "all",
}) => {
  // Helper to parse slug from hash
  const parseSlugFromHash = (): ShowcaseItem | null => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.replace(/^#/, "");
    if (
      !hash ||
      hash === "showcase-library" ||
      hash === "showcase-page" ||
      hash === "showcase-d2c" ||
      hash === "showcase-enterprise" ||
      hash === "showcase-agency" ||
      hash === "showcase"
    ) {
      return null;
    }
    const cleanSlug = hash.replace(/^(showcase|article)\//i, "").toLowerCase().trim();
    return (
      SHOWCASE_ITEMS.find(
        (item) =>
          item.slug.toLowerCase() === cleanSlug ||
          item.id.toLowerCase() === cleanSlug ||
          item.slug.toLowerCase() === hash.toLowerCase() ||
          item.id.toLowerCase() === hash.toLowerCase()
      ) || null
    );
  };

  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(parseSlugFromHash);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ShowcaseCategory | "all">(initialCategory);
  const [selectedType, setSelectedType] = useState<ShowcaseType | "all">("all");
  const [copiedFormula, setCopiedFormula] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Sync hash changes & browser back/forward history
  useEffect(() => {
    const syncHash = () => {
      const item = parseSlugFromHash();
      setSelectedItem(item);
      if (item) {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    };
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  // Reset to first page when search filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedType, itemsPerPage]);

  // Suggested items for auto-suggestion dropdown
  const suggestedItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return SHOWCASE_ITEMS.slice(0, 5);
    return SHOWCASE_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query) ||
        (item.formula && item.formula.toLowerCase().includes(query))
      );
    });
  }, [searchQuery]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Keyboard shortcut: Escape to close suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSuggestions) {
        setShowSuggestions(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSuggestions]);

  // Filtered showcase items
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return SHOWCASE_ITEMS.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      // Type filter
      if (selectedType !== "all" && item.type !== selectedType) {
        return false;
      }
      // Search query
      if (query) {
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchExcerpt = item.excerpt.toLowerCase().includes(query);
        const matchCategory = item.categoryLabel.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const matchFormula = item.formula ? item.formula.toLowerCase().includes(query) : false;
        const matchSources = item.dataSources.some((s) => s.toLowerCase().includes(query));
        const matchDetails = item.details.overview.toLowerCase().includes(query);

        return matchTitle || matchExcerpt || matchCategory || matchTags || matchFormula || matchSources || matchDetails;
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedType]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === safeCurrentPage) return;
    setCurrentPage(newPage);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getPaginationRange = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const handleSelectItem = (item: ShowcaseItem) => {
    setSelectedItem(item);
    window.history.pushState(null, "", `#showcase/${item.slug}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleBackToLibrary = () => {
    setSelectedItem(null);
    window.history.pushState(null, "", "#showcase-library");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 10;
    const rotateY = ((x - centerX) / centerX) * 10;

    gsap.to(card, {
      rotateX,
      rotateY,
      duration: 0.3,
      ease: "power1.out",
      transformPerspective: 500,
      transformOrigin: "center center",
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  const handleCopyFormula = (formula?: string) => {
    if (!formula) return;
    navigator.clipboard.writeText(formula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const renderVectorArtwork = (svgType: ShowcaseItem["svgType"]) => {
    switch (svgType) {
      case "python":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 400 400"
            style={{ display: "block", width: "100%", height: "100%" }}
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
        );
      case "roadmap":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 400 400"
            style={{ display: "block", width: "100%", height: "100%" }}
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
        );
      case "context":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 400 400"
            style={{ display: "block", width: "100%", height: "100%" }}
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
        );
      case "rooms":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 400 400"
            style={{ display: "block", width: "100%", height: "100%" }}
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
        );
      case "analyst":
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 400 400"
            style={{ display: "block", width: "100%", height: "100%" }}
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
              <line x1="120" y1="40" x2="120" y2="360" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />
              <line x1="200" y1="40" x2="200" y2="360" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />
              <line x1="280" y1="40" x2="280" y2="360" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />
              <line x1="40" y1="160" x2="360" y2="160" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />
              <line x1="40" y1="260" x2="360" y2="260" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.4" />
            </g>
          </svg>
        );
    }
  };

  // =========================================================================
  // VIEW 1: DEDICATED INNER PAGE (When an article is selected)
  // =========================================================================
  if (selectedItem) {
    const relatedItems = SHOWCASE_ITEMS.filter(
      (item) => item.id !== selectedItem.id && item.category === selectedItem.category
    ).slice(0, 3);

    return (
      <div
        className="showcase-detail-root"
        style={{
          backgroundColor: "#000000",
          color: "#ffffff",
          minHeight: "100vh",
          paddingTop: "calc(var(--header-height, 60px) + 36px)",
          paddingBottom: "120px",
        }}
      >
        {/* Global Navigation Bar */}
        <Header
          setCursorState={setCursorState}
          onNavigateHome={onNavigateHome}
          onOpenShowcase={() => handleBackToLibrary()}
        />

        {/* Inner Page Article Body */}
        <main
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            padding: "clamp(16px, 3vw, 40px) clamp(16px, 4vw, 40px)",
          }}
        >
          {/* Top Breadcrumb & Actions Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "32px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleBackToLibrary}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#0d0d0d",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  color: "#ffffff",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                  e.currentTarget.style.backgroundColor = "#181818";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.backgroundColor = "#0d0d0d";
                }}
              >
                &larr; Back to Showcase
              </button>

              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "13px", fontFamily: "var(--font-mono)" }}>/</span>

              <span
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                {selectedItem.categoryLabel}
              </span>

              <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "13px", fontFamily: "var(--font-mono)" }}>/</span>

              <span
                style={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  maxWidth: "300px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {selectedItem.title}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "6px 12px",
                  color: copiedLink ? "#4ade80" : "rgba(255, 255, 255, 0.85)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {copiedLink ? "Link Copied [✓]" : "Share Blueprint"}
              </button>
            </div>
          </div>

          {/* Article Header Hero */}
          <div style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <span
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                {selectedItem.categoryLabel}
              </span>
              <span
                style={{
                  backgroundColor: "#111111",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                {selectedItem.typeLabel}
              </span>
              {selectedItem.benchmark && (
                <span
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "rgba(255, 255, 255, 0.85)",
                    padding: "3px 10px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Benchmark: {selectedItem.benchmark}
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 700,
                fontFamily: "var(--font-primary)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                margin: "0 0 16px 0",
                color: "#ffffff",
              }}
            >
              {selectedItem.title}
            </h1>

            <p
              style={{
                fontSize: "clamp(15px, 1.8vw, 18px)",
                lineHeight: 1.6,
                color: "#a1a1a1",
                fontFamily: "var(--font-primary)",
                margin: 0,
                maxWidth: "900px",
              }}
            >
              {selectedItem.excerpt}
            </p>
          </div>

          {/* 2-Column Content Layout */}
          <div className="showcase-detail-layout">
            {/* Left / Main Content Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Executive Overview & Strategic Impact */}
              <div
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  padding: "clamp(20px, 3vw, 32px)",
                }}
              >
                <h2
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "rgba(255, 255, 255, 0.5)",
                    margin: "0 0 14px 0",
                  }}
                >
                  // Executive Overview
                </h2>
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.7,
                    color: "rgba(255, 255, 255, 0.9)",
                    margin: "0 0 20px 0",
                    fontFamily: "var(--font-primary)",
                  }}
                >
                  {selectedItem.details.overview}
                </p>

                <div
                  style={{
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    paddingTop: "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                      color: "rgba(255, 255, 255, 0.45)",
                      marginBottom: "6px",
                    }}
                  >
                    Strategic Impact
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "rgba(255, 255, 255, 0.75)",
                      margin: 0,
                      fontFamily: "var(--font-primary)",
                    }}
                  >
                    {selectedItem.details.whyItMatters}
                  </p>
                </div>
              </div>

              {/* Formula & Calculation Logic */}
              {selectedItem.formula && (
                <div
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    padding: "clamp(20px, 3vw, 32px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "13px",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "rgba(255, 255, 255, 0.5)",
                        margin: 0,
                      }}
                    >
                      // Formula &amp; Calculation Logic
                    </h2>

                    <button
                      type="button"
                      onClick={() => handleCopyFormula(selectedItem.formula)}
                      onMouseEnter={() => setCursorState("hover")}
                      onMouseLeave={() => setCursorState("default")}
                      style={{
                        background: "#141414",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: copiedFormula ? "#4ade80" : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      {copiedFormula ? "COPIED [✓]" : "COPY FORMULA"}
                    </button>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#111111",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      padding: "14px 18px",
                      marginBottom: "16px",
                    }}
                  >
                    <code
                      style={{
                        fontSize: "13.5px",
                        fontFamily: "var(--font-mono)",
                        color: "#ffffff",
                        display: "block",
                        wordBreak: "break-word",
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedItem.formula}
                    </code>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.6,
                      color: "rgba(255, 255, 255, 0.65)",
                      margin: 0,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <strong style={{ color: "#ffffff" }}>Telemetry pipeline:</strong> {selectedItem.details.calculationLogic}
                  </p>
                </div>
              )}

              {/* Executive OKR Architecture */}
              {selectedItem.okrObjective && (
                <div
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    padding: "clamp(20px, 3vw, 32px)",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "rgba(255, 255, 255, 0.5)",
                      margin: "0 0 14px 0",
                    }}
                  >
                    // Executive OKR Architecture
                  </h2>

                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: "rgba(255, 255, 255, 0.45)",
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Objective
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", fontFamily: "var(--font-primary)" }}>
                      {selectedItem.okrObjective}
                    </div>
                  </div>

                  {selectedItem.keyResults && selectedItem.keyResults.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "rgba(255, 255, 255, 0.45)",
                          textTransform: "uppercase",
                          marginBottom: "10px",
                        }}
                      >
                        Key Results Checklist
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedItem.keyResults.map((kr, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              backgroundColor: "#111111",
                              padding: "10px 14px",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            <span style={{ color: "#ffffff", fontFamily: "var(--font-mono)", fontWeight: 700 }}>[✓]</span>
                            <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.85)", lineHeight: 1.45, fontFamily: "var(--font-primary)" }}>
                              {kr}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Autonomous Trigger & Action Hook */}
              {selectedItem.details.automationHook && (
                <div
                  style={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    padding: "clamp(20px, 3vw, 32px)",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "rgba(255, 255, 255, 0.5)",
                      margin: "0 0 14px 0",
                    }}
                  >
                    // Autonomous Trigger &amp; Action Hook
                  </h2>

                  <div
                    style={{
                      backgroundColor: "#111111",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "14px 18px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      color: "#ffffff",
                      lineHeight: 1.55,
                    }}
                  >
                    {selectedItem.details.automationHook}
                  </div>
                </div>
              )}

              {/* Taxonomy Tags */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "8px" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>
                  Tags:
                </span>
                {selectedItem.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      handleBackToLibrary();
                      setSearchQuery(tag);
                    }}
                    onMouseEnter={() => setCursorState("hover")}
                    onMouseLeave={() => setCursorState("default")}
                    style={{
                      backgroundColor: "#111111",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "rgba(255, 255, 255, 0.75)",
                      padding: "4px 10px",
                      fontSize: "11.5px",
                      fontFamily: "var(--font-mono)",
                      cursor: "pointer",
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Right / Sidebar Column */}
            <div
              style={{
                position: "sticky",
                top: "calc(var(--header-height, 60px) + 24px)",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              {/* 1:1 Vector Art Artwork Surface */}
              <div
                style={{ perspective: "500px" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    border: "1px solid #ffffff",
                    backgroundColor: "#111111",
                    overflow: "hidden",
                    width: "100%",
                  }}
                >
                  {renderVectorArtwork(selectedItem.svgType)}
                </div>
              </div>

              {/* Specifications Meta Card */}
              <div
                style={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
              >
                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.4)", display: "block", marginBottom: "2px", fontSize: "10.5px" }}>
                    WORKSPACE ROOM
                  </span>
                  <strong style={{ color: "#ffffff" }}>{selectedItem.details.recommendedRoom}</strong>
                </div>

                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px" }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.4)", display: "block", marginBottom: "4px", fontSize: "10.5px" }}>
                    CONNECTED DATA SOURCES
                  </span>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {selectedItem.dataSources.map((ds) => (
                      <span
                        key={ds}
                        style={{
                          backgroundColor: "#161616",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          padding: "2px 6px",
                          fontSize: "11px",
                          color: "#ffffff",
                        }}
                      >
                        {ds}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedItem.benchmark && (
                  <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "10px" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.4)", display: "block", marginBottom: "2px", fontSize: "10.5px" }}>
                      BENCHMARK TARGET
                    </span>
                    <strong style={{ color: "#ffffff" }}>{selectedItem.benchmark}</strong>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => onNavigateHome("#pricing")}
                    className="cp-btn"
                    onMouseEnter={() => setCursorState("hover")}
                    onMouseLeave={() => setCursorState("default")}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "12px",
                      fontSize: "12px",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontWeight: 700,
                    }}
                  >
                    Deploy Blueprint &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Related Blueprints Section */}
          {relatedItems.length > 0 && (
            <div
              style={{
                marginTop: "clamp(60px, 8vw, 84px)",
                paddingTop: "36px",
                borderTop: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    fontFamily: "var(--font-primary)",
                    margin: 0,
                    color: "#ffffff",
                  }}
                >
                  Related {selectedItem.categoryLabel} Blueprints
                </h3>
                <button
                  type="button"
                  onClick={handleBackToLibrary}
                  onMouseEnter={() => setCursorState("hover")}
                  onMouseLeave={() => setCursorState("default")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  View all &rarr;
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "24px",
                }}
              >
                {relatedItems.map((rel) => (
                  <article
                    key={rel.id}
                    className="article-card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{ perspective: "500px", cursor: "pointer" }}
                      onClick={() => handleSelectItem(rel)}
                      onMouseEnter={() => setCursorState("read")}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div
                        style={{
                          aspectRatio: "1 / 1",
                          border: "1px solid var(--color-text)",
                          overflow: "hidden",
                          backgroundColor: "#111111",
                        }}
                      >
                        {renderVectorArtwork(rel.svgType)}
                      </div>
                    </div>

                    <div>
                      <h4
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "14px",
                          fontWeight: 700,
                          fontFamily: "var(--font-primary)",
                        }}
                      >
                        <a
                          href={`#showcase/${rel.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSelectItem(rel);
                          }}
                          style={{ color: "#ffffff", textDecoration: "none" }}
                        >
                          {rel.title}
                        </a>
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12.5px",
                          color: "#a1a1a1",
                          lineHeight: 1.4,
                        }}
                      >
                        {rel.excerpt}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Global Footer */}
        <Footer setCursorState={setCursorState} onOpenCookies={onOpenCookies} />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SHOWCASE LIBRARY INDEX (Grid with Search, Filter & Pagination)
  // =========================================================================
  return (
    <div
      className="showcase-page-root"
      style={{
        backgroundColor: "#000000",
        color: "#ffffff",
        minHeight: "100vh",
        paddingTop: "calc(var(--header-height, 60px) + 36px)",
        paddingBottom: "120px",
      }}
    >
      {/* Global Navigation Bar */}
      <Header
        setCursorState={setCursorState}
        onNavigateHome={onNavigateHome}
        onOpenShowcase={() => {
          setSelectedItem(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Main Content Body */}
      <main style={{ maxWidth: "1360px", margin: "0 auto", padding: "clamp(16px, 3vw, 40px) clamp(16px, 4vw, 40px)" }}>
        {/* Page Header Section */}
        <div style={{ marginBottom: "clamp(28px, 4vw, 40px)" }}>
          <div style={{ marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => onNavigateHome()}
              onMouseEnter={() => setCursorState("hover")}
              onMouseLeave={() => setCursorState("default")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#0a0a0a",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "999px",
                padding: "6px 14px",
                color: "rgba(255, 255, 255, 0.85)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.45)";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.backgroundColor = "#151515";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                e.currentTarget.style.backgroundColor = "#0a0a0a";
              }}
            >
              <span>&larr; Home</span>
            </button>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: "8px",
                  letterSpacing: "0.04em",
                }}
              >
                // SHOWCASE &amp; BLUEPRINTS
              </div>
              <h1
                style={{
                  fontSize: "clamp(28px, 4.5vw, 44px)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  fontFamily: "var(--font-primary)",
                  margin: "0 0 10px 0",
                  color: "#ffffff",
                }}
              >
                Show Case &amp; Use Cases
              </h1>
            </div>

            <p
              style={{
                fontSize: "clamp(13px, 1.2vw, 14.5px)",
                color: "var(--color-mid-grey)",
                maxWidth: "480px",
                lineHeight: 1.5,
                margin: 0,
                fontFamily: "var(--font-mono)",
              }}
            >
              Real-time operational telemetry, executive OKR frameworks, and intelligent automated workflows.
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
            padding: "20px 0",
            marginBottom: "clamp(32px, 4vw, 48px)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Search Input Box with Auto-Suggestion */}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by keywords (e.g. D2C, Enterprise, Agency, NRR, Stripe, Dunning)..."
              onMouseEnter={() => setCursorState("hover")}
              onMouseLeave={() => setCursorState("default")}
              style={{
                width: "100%",
                backgroundColor: "#0d0d0d",
                border: showSuggestions ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                padding: "12px 36px 12px 16px",
                color: "#ffffff",
                fontSize: "13.5px",
                fontFamily: "var(--font-mono)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                }}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "13px",
                }}
              >
                &#x2715;
              </button>
            )}

            {/* Auto-Suggestion Dropdown */}
            {showSuggestions && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  backgroundColor: "#0c0c0c",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  zIndex: 50,
                  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.9)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  animation: "fadeIn 0.15s ease",
                }}
              >
                {/* Popular Keywords Row */}
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "rgba(255, 255, 255, 0.45)",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                      letterSpacing: "0.04em",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Suggested Keywords:</span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255, 255, 255, 0.4)",
                        fontSize: "11px",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Close [Esc]
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[
                      "D2C",
                      "Enterprise",
                      "Agency",
                      "NRR",
                      "Stripe",
                      "WhatsApp Dunning",
                      "Utilization",
                      "Magic Number",
                      "Contribution Margin",
                      "Cohorts",
                      "RBAC",
                    ].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => {
                          setSearchQuery(kw);
                          setShowSuggestions(false);
                        }}
                        onMouseEnter={() => setCursorState("hover")}
                        onMouseLeave={() => setCursorState("default")}
                        style={{
                          backgroundColor: "#161616",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "rgba(255, 255, 255, 0.85)",
                          padding: "4px 10px",
                          fontSize: "11.5px",
                          fontFamily: "var(--font-mono)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        +{kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matching Blueprints List */}
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "rgba(255, 255, 255, 0.45)",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {searchQuery ? `Matching Blueprints (${suggestedItems.length})` : "Top Blueprints"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {suggestedItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          handleSelectItem(item);
                          setShowSuggestions(false);
                        }}
                        onMouseEnter={() => setCursorState("hover")}
                        onMouseLeave={() => setCursorState("default")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          backgroundColor: "#121212",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              fontFamily: "var(--font-mono)",
                              textTransform: "uppercase",
                              backgroundColor: "#1f1f1f",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              padding: "2px 6px",
                              color: "#ffffff",
                            }}
                          >
                            {item.category.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "13px", color: "#ffffff", fontWeight: 500 }}>
                            {item.title}
                          </span>
                        </div>

                        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255, 255, 255, 0.5)" }}>
                          {item.benchmark || item.typeLabel} &rarr;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Keyword Category Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* Domain Keywords */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255, 255, 255, 0.45)", textTransform: "uppercase" }}>
                Keywords:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                style={{
                  backgroundColor: selectedCategory === "all" ? "#ffffff" : "transparent",
                  color: selectedCategory === "all" ? "#000000" : "rgba(255, 255, 255, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: selectedCategory === "all" ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                All [All]
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("d2c")}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                style={{
                  backgroundColor: selectedCategory === "d2c" ? "#ffffff" : "transparent",
                  color: selectedCategory === "d2c" ? "#000000" : "rgba(255, 255, 255, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: selectedCategory === "d2c" ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                D2C &amp; E-Com [d2c]
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("enterprise")}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                style={{
                  backgroundColor: selectedCategory === "enterprise" ? "#ffffff" : "transparent",
                  color: selectedCategory === "enterprise" ? "#000000" : "rgba(255, 255, 255, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: selectedCategory === "enterprise" ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Enterprise SaaS [enterprise]
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory("agency")}
                onMouseEnter={() => setCursorState("hover")}
                onMouseLeave={() => setCursorState("default")}
                style={{
                  backgroundColor: selectedCategory === "agency" ? "#ffffff" : "transparent",
                  color: selectedCategory === "agency" ? "#000000" : "rgba(255, 255, 255, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: selectedCategory === "agency" ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Agencies [agency]
              </button>
            </div>

            {/* Type Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {(["all", "kpi-okr", "usecase", "metric-idea", "article"] as const).map((type) => {
                const labels: Record<string, string> = {
                  all: "ALL FORMATS",
                  "kpi-okr": "KPI & OKR",
                  usecase: "USE CASES",
                  "metric-idea": "METRIC IDEAS",
                  article: "ARTICLES",
                };
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    onMouseEnter={() => setCursorState("hover")}
                    onMouseLeave={() => setCursorState("default")}
                    style={{
                      backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
                      color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
                      border: "none",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      cursor: "pointer",
                      textDecoration: isActive ? "underline" : "none",
                    }}
                  >
                    {labels[type]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid Anchor for smooth scrolling upon page switch */}
        <div ref={gridTopRef} style={{ scrollMarginTop: "100px" }} />

        {/* 1:1 Vector Art Showcase Grid */}
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: "64px 24px",
              textAlign: "center",
              backgroundColor: "#0a0a0a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <p style={{ fontSize: "15px", color: "rgba(255, 255, 255, 0.8)", margin: "0 0 16px 0", fontFamily: "var(--font-mono)" }}>
              No blueprints matched &quot;{searchQuery}&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedType("all");
              }}
              className="cp-btn"
              style={{ padding: "8px 18px", fontSize: "11px" }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "clamp(20px, 2.5vw, 32px)",
              }}
            >
              {paginatedItems.map((item) => (
                <article
                  key={item.id}
                  className="article-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    minWidth: 0,
                  }}
                >
                  {/* 1:1 Square Image Surface with 3D Tilt */}
                  <div
                    style={{ perspective: "500px" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onMouseEnter={() => setCursorState("read")}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div
                      style={{
                        display: "block",
                        aspectRatio: "1 / 1",
                        border: "1px solid var(--color-text)",
                        overflow: "hidden",
                        backgroundColor: "#111111",
                        position: "relative",
                        willChange: "transform",
                        cursor: "pointer",
                      }}
                    >
                      {renderVectorArtwork(item.svgType)}
                    </div>
                  </div>

                  {/* Text Information Below */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "clamp(14px, 3.8vw, 15px)",
                        fontWeight: 700,
                        fontFamily: "var(--font-primary)",
                        lineHeight: 1.35,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      <a
                        href={`#showcase/${item.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelectItem(item);
                        }}
                        style={{ color: "#ffffff", textDecoration: "none" }}
                        onMouseEnter={() => setCursorState("hover")}
                        onMouseLeave={() => setCursorState("default")}
                      >
                        {item.title}
                      </a>
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "clamp(12px, 3.2vw, 13px)",
                        lineHeight: 1.45,
                        fontFamily: "var(--font-primary)",
                        color: "#a1a1a1",
                      }}
                    >
                      {item.excerpt}
                    </p>
                    <a
                      href={`#showcase/${item.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectItem(item);
                      }}
                      style={{
                        fontSize: "clamp(12px, 3.2vw, 13px)",
                        textDecoration: "underline",
                        fontFamily: "var(--font-primary)",
                        color: "#ffffff",
                        paddingTop: "2px",
                      }}
                      onMouseEnter={() => setCursorState("hover")}
                      onMouseLeave={() => setCursorState("default")}
                    >
                      Read article &rarr;
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Controls Bar */}
            <div
              style={{
                marginTop: "clamp(36px, 4.5vw, 52px)",
                paddingTop: "24px",
                borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px",
              }}
            >
              {/* Left: Item Range Summary & Per-Page Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.65)",
                    letterSpacing: "0.02em",
                  }}
                >
                  SHOWING <strong style={{ color: "#ffffff" }}>{filteredItems.length === 0 ? 0 : startIndex + 1}–{endIndex}</strong> OF <strong style={{ color: "#ffffff" }}>{filteredItems.length}</strong> BLUEPRINTS
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "rgba(255, 255, 255, 0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    Per page:
                  </span>
                  {[12, 24, 48].map((size) => {
                    const isSelected = itemsPerPage === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setItemsPerPage(size)}
                        onMouseEnter={() => setCursorState("hover")}
                        onMouseLeave={() => setCursorState("default")}
                        style={{
                          background: isSelected ? "#ffffff" : "#0d0d0d",
                          color: isSelected ? "#000000" : "rgba(255, 255, 255, 0.7)",
                          border: isSelected ? "1px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.18)",
                          padding: "3px 8px",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: isSelected ? 700 : 400,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Page Navigation (Prev, Numbers, Next) */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  {/* Previous Button */}
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    onMouseEnter={() => safeCurrentPage > 1 && setCursorState("hover")}
                    onMouseLeave={() => setCursorState("default")}
                    style={{
                      background: "#0d0d0d",
                      color: safeCurrentPage === 1 ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.85)",
                      border: safeCurrentPage === 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.2)",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onMouseOver={(e) => {
                      if (safeCurrentPage > 1) {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.backgroundColor = "#181818";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (safeCurrentPage > 1) {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                        e.currentTarget.style.backgroundColor = "#0d0d0d";
                      }
                    }}
                  >
                    &larr; Prev
                  </button>

                  {/* Page Numbers */}
                  {getPaginationRange(safeCurrentPage, totalPages).map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          style={{
                            padding: "6px 8px",
                            fontSize: "12px",
                            fontFamily: "var(--font-mono)",
                            color: "rgba(255, 255, 255, 0.35)",
                            userSelect: "none",
                          }}
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = page as number;
                    const isActive = pageNum === safeCurrentPage;

                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        onMouseEnter={() => setCursorState("hover")}
                        onMouseLeave={() => setCursorState("default")}
                        style={{
                          minWidth: "34px",
                          height: "34px",
                          padding: "0 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isActive ? "#ffffff" : "#0d0d0d",
                          color: isActive ? "#000000" : "rgba(255, 255, 255, 0.85)",
                          border: isActive ? "1px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.18)",
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: isActive ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseOver={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.45)";
                            e.currentTarget.style.color = "#ffffff";
                            e.currentTarget.style.backgroundColor = "#181818";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                            e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                            e.currentTarget.style.backgroundColor = "#0d0d0d";
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    onMouseEnter={() => safeCurrentPage < totalPages && setCursorState("hover")}
                    onMouseLeave={() => setCursorState("default")}
                    style={{
                      background: "#0d0d0d",
                      color: safeCurrentPage === totalPages ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.85)",
                      border: safeCurrentPage === totalPages ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.2)",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    onMouseOver={(e) => {
                      if (safeCurrentPage < totalPages) {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.backgroundColor = "#181818";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (safeCurrentPage < totalPages) {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.85)";
                        e.currentTarget.style.backgroundColor = "#0d0d0d";
                      }
                    }}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Global Footer */}
      <Footer setCursorState={setCursorState} onOpenCookies={onOpenCookies} />
    </div>
  );
};
