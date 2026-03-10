"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  CheckSquare,
  Users,
  Star,
  TrendingUp,
  ArrowRight,
  Send,
  CheckCircle2,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Brand tokens — The Editor palette
───────────────────────────────────────────── */
const c = {
  parchment: "#FAF9F6",
  linen: "#F1EDEA",
  charcoal: "#2D2D2D",
  dawn: "#E8845C",
  steel: "#457B9D",
  dusk: "#4E7DAA",
  slate: "#8D99AE",
  sage: "#52B788",
  gold: "#F4C896",
  alert: "#D64B2A",
  // Keep these for backward-compat references in dark accent sections
  paper: "#FAF9F6",
  mist: "#8D99AE",
  deep: "#FAF9F6",
};

/* Font stacks using CSS variables from root layout */
const fonts = {
  display: "var(--font-playfair), 'Playfair Display', Georgia, serif",
  body: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
  mono: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
};

/* ─────────────────────────────────────────────
   Intelligence feed items
───────────────────────────────────────────── */
const feedItems = [
  { category: "COMMITMENT", dot: c.sage, text: "You promised Sarah the proposal by Friday — 2 days remaining", time: "tracked 6h ago" },
  { category: "RELATIONSHIP", dot: c.dawn, text: "Haven't spoken to James Chen in 14 days — relationship cooling", time: "detected 2h ago" },
  { category: "MEETING", dot: c.dusk, text: "Board sync in 2h — 3 prep items ready for your review", time: "briefed 8m ago" },
  { category: "PRIORITY", dot: c.gold, text: "Investor email flagged — Ahmed asked about Q4 projections", time: "flagged 1h ago" },
  { category: "COMMITMENT", dot: c.sage, text: "Review contractor invoices — promised in Monday standup", time: "tracked 18h ago" },
  { category: "RELATIONSHIP", dot: c.dawn, text: "Maria Santos — missed her birthday yesterday, reconnect suggested", time: "detected 4h ago" },
  { category: "MEETING", dot: c.dusk, text: "1:1 with Dev Lead (2:00 PM) — sprint velocity analysis ready", time: "briefed 14m ago" },
  { category: "PRIORITY", dot: c.alert, text: "Legal NDA deadline — contract review due end of day", time: "flagged 3h ago" },
];

/* ─────────────────────────────────────────────
   AnimatedFeed
───────────────────────────────────────────── */
function AnimatedFeed() {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: 340,
        maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          animation: "feedScroll 22s linear infinite",
        }}
      >
        {[...feedItems, ...feedItems].map((item, i) => (
          <FeedItem key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeedItem({ item }: { item: (typeof feedItems)[0] }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(45,45,45,0.08)",
        borderRadius: 8,
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: item.dot,
          marginTop: 5,
          flexShrink: 0,
          boxShadow: `0 0 8px ${item.dot}88`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              fontWeight: 500,
              color: item.dot,
              letterSpacing: "0.12em",
              opacity: 0.9,
            }}
          >
            [{item.category}]
          </span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: "rgba(45,45,45,0.4)",
              letterSpacing: "0.06em",
            }}
          >
            {item.time}
          </span>
        </div>
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 13.5,
            color: "rgba(45,45,45,0.75)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {item.text}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Scroll-reveal hook
───────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useReveal(0.3);

  useEffect(() => {
    if (!visible) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [visible, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Reveal wrapper
───────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Telegram briefing block
───────────────────────────────────────────── */
function BriefingBlock({
  label,
  labelColor,
  items,
}: {
  label: string;
  labelColor: string;
  items: string[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: labelColor,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "#a8b8c8",
            paddingLeft: 0,
            marginBottom: 3,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter();
  const [heroEmail, setHeroEmail] = useState("");
  const [heroSubmitted, setHeroSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Desktop app (Tauri) should never show the landing page — go straight to login.
  // Also sets the donna_client cookie so middleware can gate routes.
  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      document.cookie = "donna_client=desktop;path=/;max-age=31536000;samesite=lax";
      router.replace("/login");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <>
      {/* ── Scoped keyframe animations ── */}
      <style>{`
        @keyframes feedScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,132,92,0); opacity: 1; }
          50% { box-shadow: 0 0 0 18px rgba(232,132,92,0.08), 0 0 40px rgba(232,132,92,0.15); opacity: 0.92; }
        }

        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes gridPulse {
          0%, 100% { opacity: 0.025; }
          50% { opacity: 0.045; }
        }

        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes scanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(800%); opacity: 0; }
        }

        .landing-hero-line-1 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .landing-hero-line-2 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .landing-hero-line-3 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both; }
        .landing-hero-line-4 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.7s both; }

        .landing-cta-btn {
          animation: pulseGlow 3s ease-in-out infinite;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .landing-cta-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
          animation: none;
          box-shadow: 0 0 0 20px rgba(232,132,92,0.1), 0 8px 32px rgba(232,132,92,0.3) !important;
        }
        .landing-cta-btn:active { transform: translateY(0); }

        .landing-grid-bg {
          background-image:
            linear-gradient(rgba(45,45,45,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,45,45,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 8s ease-in-out infinite;
        }

        .landing-blink-dot { animation: dotBlink 1.8s ease-in-out infinite; }
        .landing-scan-line { animation: scanLine 6s linear infinite; }

        .landing-page input[type="email"] { outline: none; }
        .landing-page input[type="email"]:focus {
          border-color: rgba(232,132,92,0.6) !important;
          box-shadow: 0 0 0 3px rgba(232,132,92,0.12);
        }

        /* ─── Mobile hamburger + overlay nav ─── */
        .mobile-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #2D2D2D;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
        }
        .desktop-nav-links { display: flex; align-items: center; gap: 32px; }

        .mobile-nav-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(250,249,246,0.98);
          z-index: 98;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 40px;
        }
        .mobile-nav-overlay.open { display: flex; animation: heroFadeUp 0.25s ease both; }
        .mobile-nav-overlay a {
          font-family: var(--font-playfair), 'Playfair Display', Georgia, serif;
          font-size: 34px;
          font-weight: 700;
          font-style: italic;
          color: #2D2D2D;
          text-decoration: none;
          letter-spacing: -0.01em;
          min-height: 44px;
          display: flex;
          align-items: center;
        }
        .mobile-nav-overlay a:hover { color: #E8845C; }
        .mobile-nav-overlay .mobile-nav-cta {
          font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-style: normal;
          font-weight: 600;
          background: #E8845C;
          color: #FAF9F6;
          padding: 14px 32px;
          border-radius: 8px;
          margin-top: 8px;
        }

        /* ─── Responsive layout ─── */
        @media (max-width: 860px) {
          .mobile-hamburger { display: flex !important; }
          .desktop-nav-links { display: none !important; }
          .nav-inner-pad { padding: 0 20px !important; }

          .hero-layout-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding: 96px 20px 64px !important;
          }
          .hero-feed-panel { display: none !important; }
          .hero-email-form {
            flex-direction: column !important;
            gap: 10px !important;
            max-width: 100% !important;
          }
          .hero-email-form input {
            border-radius: 8px !important;
            border-right: 1px solid rgba(255,255,255,0.1) !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .hero-email-form button {
            border-radius: 8px !important;
            width: 100% !important;
            justify-content: center;
            padding: 16px 24px !important;
            min-height: 48px;
          }

          .problem-header-2col { grid-template-columns: 1fr !important; gap: 28px !important; }
          .problem-cards-3col { grid-template-columns: 1fr !important; gap: 16px !important; margin-top: 48px !important; }

          .how-cards-3col { grid-template-columns: 1fr !important; gap: 16px !important; }
          .how-connector-line { display: none !important; }

          .briefing-layout-2col { grid-template-columns: 1fr !important; gap: 40px !important; }
          .briefing-telegram-mock { max-width: 100% !important; }

          .features-cards-2col { grid-template-columns: 1fr !important; gap: 16px !important; }

          .stats-grid-4col { grid-template-columns: repeat(2, 1fr) !important; }
          .stat-cell { border-right: none !important; padding: 36px 20px !important; }
          .stat-cell-border-right { border-right: 1px solid rgba(45,45,45,0.08) !important; }

          .footer-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 40px 24px !important;
            gap: 20px !important;
          }

          .section-lg { padding-top: 72px !important; padding-bottom: 72px !important; }
          .section-md { padding-top: 56px !important; padding-bottom: 56px !important; }
        }

        @media (max-width: 480px) {
          .stats-grid-4col { grid-template-columns: 1fr !important; }
          .stat-cell-border-right { border-right: none !important; }
          .stat-cell { border-bottom: 1px solid rgba(45,45,45,0.08) !important; }
        }

        /* iOS safe area insets */
        @supports (padding: max(0px)) {
          .footer-bar {
            padding-bottom: max(24px, env(safe-area-inset-bottom)) !important;
          }
          .mobile-nav-overlay {
            padding-bottom: env(safe-area-inset-bottom);
            padding-top: env(safe-area-inset-top);
          }
        }

        /* Ensure tap targets are 44px minimum on touch devices */
        @media (pointer: coarse) {
          .landing-cta-btn { min-height: 48px !important; }
          button, [role="button"] { min-height: 44px; }
          nav a { min-height: 44px; display: inline-flex; align-items: center; }
        }
      `}</style>

      <div className="landing-page" style={{ fontFamily: fonts.body, overflowX: "hidden" }}>

        {/* ══════════════════════════════════════
            NAV
        ══════════════════════════════════════ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "rgba(250,249,246,0.92)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(45,45,45,0.08)",
          }}
        >
          <div
            className="nav-inner-pad"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "0 32px",
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontStyle: "italic",
                fontSize: 24,
                fontWeight: 700,
                color: c.charcoal,
                letterSpacing: "-0.01em",
              }}
            >
              Donna<span style={{ color: c.dawn }}>.</span>
            </span>

            <div className="desktop-nav-links">
              {["How It Works", "Features", "Briefing"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: c.slate,
                    textDecoration: "none",
                    letterSpacing: "0.02em",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = c.charcoal)}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = c.slate)}
                >
                  {item}
                </a>
              ))}
              <Link
                href="/download"
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  color: c.slate,
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = c.charcoal)}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = c.slate)}
              >
                Download
              </Link>
              <a
                href="#waitlist"
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 500,
                  color: c.parchment,
                  background: c.dawn,
                  padding: "7px 18px",
                  borderRadius: 6,
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "0.88")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "1")}
              >
                Early access
              </a>
            </div>

            {/* Hamburger — mobile only */}
            <button
              className="mobile-hamburger"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileNavOpen((v) => !v)}
              style={{ zIndex: 101 }}
            >
              {mobileNavOpen ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <line x1="4" y1="4" x2="18" y2="18" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="18" y1="4" x2="4" y2="18" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <line x1="3" y1="7" x2="19" y2="7" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3" y1="11" x2="19" y2="11" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="3" y1="15" x2="19" y2="15" stroke="#2D2D2D" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile nav overlay */}
        <div className={`mobile-nav-overlay${mobileNavOpen ? " open" : ""}`}>
          {["How It Works", "Features", "Briefing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              onClick={() => setMobileNavOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link href="/download" onClick={() => setMobileNavOpen(false)}
            style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, fontStyle: "italic", color: c.charcoal, textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}
          >
            Download
          </Link>
          <a
            href="#waitlist"
            className="mobile-nav-cta"
            onClick={() => setMobileNavOpen(false)}
          >
            Early access
          </a>
        </div>

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            background: c.parchment,
          }}
        >
          {/* Grid background */}
          <div className="landing-grid-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

          {/* Radial accent glow */}
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "55%",
              width: 600,
              height: 600,
              background: "radial-gradient(circle, rgba(78,125,170,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "60%",
              left: "30%",
              width: 400,
              height: 400,
              background: "radial-gradient(circle, rgba(232,132,92,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Scan line effect */}
          <div
            className="landing-scan-line"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${c.dusk}44, ${c.dawn}33, transparent)`,
              pointerEvents: "none",
              top: "20%",
            }}
          />

          <div
            className="hero-layout-grid"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "120px 32px 80px",
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 80,
              alignItems: "center",
            }}
          >
            {/* Left: Text */}
            <div>
              {/* Status badge */}
              <div
                className="landing-hero-line-1"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F1EDEA",
                  border: "1px solid rgba(45,45,45,0.1)",
                  borderRadius: 100,
                  padding: "6px 14px",
                  marginBottom: 36,
                }}
              >
                <span
                  className="landing-blink-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: c.sage,
                    display: "block",
                    boxShadow: `0 0 6px ${c.sage}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    color: c.slate,
                    letterSpacing: "0.1em",
                    fontWeight: 500,
                  }}
                >
                  INTELLIGENCE ACTIVE
                </span>
              </div>

              <h1
                className="landing-hero-line-2"
                style={{
                  fontFamily: fonts.display,
                  fontStyle: "italic",
                  fontSize: "clamp(52px, 6vw, 76px)",
                  fontWeight: 700,
                  color: c.charcoal,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  marginBottom: 24,
                }}
              >
                Before you ask.
                <br />
                <span style={{ color: c.dawn }}>Donna already knows.</span>
              </h1>

              <p
                className="landing-hero-line-3"
                style={{
                  fontFamily: fonts.body,
                  fontSize: 17,
                  color: c.slate,
                  lineHeight: 1.7,
                  maxWidth: 480,
                  marginBottom: 44,
                  fontWeight: 400,
                }}
              >
                While you sleep, Donna reads every email, every calendar invite,
                every message — and distills it into one briefing that tells you
                exactly what to do first.
              </p>

              {/* Email input + CTA */}
              <div className="landing-hero-line-4">
                {!heroSubmitted ? (
                  <div className="hero-email-form" style={{ display: "flex", gap: 0, maxWidth: 440 }}>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={heroEmail}
                      onChange={(e) => setHeroEmail(e.target.value)}
                      style={{
                        flex: 1,
                        background: "#FFFFFF",
                        border: "1px solid rgba(45,45,45,0.15)",
                        borderRight: "none",
                        borderRadius: "8px 0 0 8px",
                        padding: "14px 18px",
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: c.charcoal,
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && heroEmail) setHeroSubmitted(true);
                      }}
                    />
                    <button
                      className="landing-cta-btn"
                      onClick={() => heroEmail && setHeroSubmitted(true)}
                      style={{
                        background: `linear-gradient(135deg, ${c.dawn} 0%, #d4623a 100%)`,
                        border: "none",
                        borderRadius: "0 8px 8px 0",
                        padding: "14px 24px",
                        fontFamily: fonts.body,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#fff",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Request access
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: c.sage,
                      fontFamily: fonts.body,
                      fontSize: 15,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>You&apos;re on the list. Donna will be in touch.</span>
                  </div>
                )}

                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: "rgba(141,153,174,0.7)",
                    marginTop: 12,
                    letterSpacing: "0.02em",
                  }}
                >
                  No spam. Invite-only early access.
                </p>
              </div>
            </div>

            {/* Right: Live intelligence feed preview */}
            <div className="hero-feed-panel" style={{ position: "relative" }}>
              {/* Terminal header */}
              <div
                style={{
                  background: "#F1EDEA",
                  border: "1px solid rgba(45,45,45,0.1)",
                  borderRadius: "12px 12px 0 0",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: "1px solid rgba(45,45,45,0.06)",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  {["#FF5F57", "#FEBC2E", "#28C840"].map((col) => (
                    <div
                      key={col}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: col,
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    color: "rgba(45,45,45,0.4)",
                    letterSpacing: "0.06em",
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  donna — intelligence feed
                </span>
                <span
                  className="landing-blink-dot"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: c.sage,
                    display: "block",
                    boxShadow: `0 0 6px ${c.sage}`,
                  }}
                />
              </div>

              {/* Feed window */}
              <div
                style={{
                  background: "#FAF9F6",
                  border: "1px solid rgba(45,45,45,0.08)",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "16px 16px",
                }}
              >
                <AnimatedFeed />
              </div>

              {/* Glow underneath */}
              <div
                style={{
                  position: "absolute",
                  bottom: -40,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "70%",
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${c.dusk}66, transparent)`,
                  filter: "blur(4px)",
                }}
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            PROBLEM SECTION
        ══════════════════════════════════════ */}
        <section
          className="section-lg"
          style={{
            background: c.paper,
            padding: "120px 24px",
            overflow: "hidden",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: c.dawn,
                  marginBottom: 40,
                }}
              >
                THE PROBLEM
              </div>
            </Reveal>

            <div
              className="problem-header-2col"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "64px 80px",
                alignItems: "start",
              }}
            >
              <Reveal>
                <h2
                  style={{
                    fontFamily: fonts.display,
                    fontSize: "clamp(36px, 4.5vw, 58px)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    color: c.charcoal,
                    margin: 0,
                  }}
                >
                  You have <em style={{ color: c.dawn, fontStyle: "italic" }}>847</em> unread emails.
                  <br />
                  <em style={{ color: c.dusk, fontStyle: "italic" }}>12</em> meetings today.
                  <br />
                  <em style={{ color: c.sage, fontStyle: "italic" }}>3</em> forgotten promises.
                </h2>
              </Reveal>

              <Reveal delay={120}>
                <div style={{ paddingTop: 8 }}>
                  <p style={{ fontSize: 17, lineHeight: 1.8, color: "#4a4a5a", marginBottom: 24 }}>
                    And that&apos;s just what you{" "}
                    <em style={{ fontFamily: fonts.display, fontSize: 19, fontStyle: "italic" }}>know</em>{" "}
                    about. Somewhere in the noise is the email you should have replied to. The commitment
                    you made on a Tuesday call. The relationship you&apos;ve let drift.
                  </p>
                  <p style={{ fontSize: 17, lineHeight: 1.8, color: "#4a4a5a" }}>
                    You&apos;re not overwhelmed because you&apos;re disorganised. You&apos;re overwhelmed
                    because <strong style={{ color: c.charcoal, fontWeight: 600 }}>no one is watching it all for you.</strong>
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Staggered problem cards */}
            <div className="problem-cards-3col" style={{ marginTop: 80, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {[
                { number: "01", title: "The inbox illusion", body: "You achieve inbox zero at 8am. By 9am it\u2019s impossible again. The important message is buried under 40 newsletters.", color: c.dawn },
                { number: "02", title: "The commitment gap", body: "\u201CI\u2019ll send that over tonight\u201D becomes a week of silence. Not because you forgot \u2014 because you had no one to remind you.", color: c.dusk },
                { number: "03", title: "The relationship drift", body: "Three months pass. You realise you haven\u2019t spoken to someone important. The moment to reconnect has already cost you.", color: c.sage },
              ].map(({ number, title, body, color }, i) => (
                <Reveal key={number} delay={i * 80}>
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${"#F1EDEA"}`,
                      borderRadius: 12,
                      padding: "32px 28px",
                      borderTop: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.2em", color, marginBottom: 16 }}>
                      {number}
                    </div>
                    <h3 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, color: c.charcoal, marginBottom: 12, lineHeight: 1.3 }}>
                      {title}
                    </h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "#5a5a6e" }}>{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section id="how-it-works" className="section-lg" style={{ background: "#F1EDEA", padding: "120px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ marginBottom: 72, textAlign: "center" }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: c.dawn, marginBottom: 20 }}>
                  HOW IT WORKS
                </div>
                <h2 style={{ fontFamily: fonts.display, fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 400, lineHeight: 1.15, color: c.charcoal, margin: 0 }}>
                  Three steps. <em style={{ fontStyle: "italic", color: c.dusk }}>One morning ritual.</em>
                </h2>
              </div>
            </Reveal>

            <div className="how-cards-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
              {/* Connector line */}
              <div
                aria-hidden
                className="how-connector-line"
                style={{
                  position: "absolute",
                  top: 56,
                  left: "16.66%",
                  right: "16.66%",
                  height: 1,
                  background: `linear-gradient(to right, ${c.dawn}60, ${c.dusk}60)`,
                  zIndex: 0,
                }}
              />

              {[
                {
                  step: "01", verb: "CONNECT", headline: "She reads your entire digital life",
                  body: "Email, calendar, messages, Slack, Notion, documents. Donna reads every channel \u2014 not to judge, but to understand the full picture.",
                  icons: [<Mail key="mail" size={14} />, <Calendar key="cal" size={14} />, <MessageSquare key="msg" size={14} />, <FileText key="file" size={14} />],
                  color: c.dawn,
                },
                {
                  step: "02", verb: "UNDERSTAND", headline: "She extracts what actually matters",
                  body: "Commitments you made. Relationships cooling. Priorities buried in noise. She scores, ranks, and connects the dots you didn\u2019t have time to.",
                  icons: [<CheckSquare key="check" size={14} />, <Users key="users" size={14} />, <TrendingUp key="trend" size={14} />, <Star key="star" size={14} />],
                  color: c.dusk,
                },
                {
                  step: "03", verb: "BRIEF", headline: "One message. Every morning. No noise.",
                  body: "At the time you choose, Donna surfaces your briefing in the app. Ranked priorities, due commitments, who to call, and what to do first.",
                  icons: [<Send key="send" size={14} />],
                  color: c.sage,
                },
              ].map(({ step, verb, headline, body, icons, color }, i) => (
                <Reveal key={step} delay={i * 100}>
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(45,45,45,0.08)",
                      borderRadius: 14,
                      padding: "40px 32px",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 52, height: 52, borderRadius: "50%",
                        background: `${color}18`, border: `2px solid ${color}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 28,
                      }}
                    >
                      <span style={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 500, color, letterSpacing: "0.05em" }}>
                        {step}
                      </span>
                    </div>
                    <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color, marginBottom: 12 }}>
                      {verb}
                    </div>
                    <h3 style={{ fontFamily: fonts.display, fontSize: 21, fontWeight: 600, color: c.charcoal, lineHeight: 1.3, marginBottom: 16 }}>
                      {headline}
                    </h3>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: "#5a5a6e", marginBottom: 24 }}>{body}</p>
                    <div style={{ display: "flex", gap: 8, color, opacity: 0.7 }}>{icons}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            BRIEFING PREVIEW
        ══════════════════════════════════════ */}
        <section
          id="briefing"
          className="section-lg"
          style={{
            background: "#1C2B38",
            padding: "120px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 800, height: 600,
              background: `radial-gradient(ellipse at center, ${c.dusk}14 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />

          <div
            className="briefing-layout-2col"
            style={{
              maxWidth: 1080,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr",
              gap: "80px",
              alignItems: "center",
            }}
          >
            <Reveal>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: c.dawn, marginBottom: 24 }}>
                  SAMPLE BRIEFING
                </div>
                <h2 style={{ fontFamily: fonts.display, fontSize: "clamp(34px, 4vw, 50px)", fontWeight: 400, lineHeight: 1.15, color: "#fff", marginBottom: 24 }}>
                  Your morning edge, <em style={{ fontStyle: "italic", color: c.gold }}>delivered.</em>
                </h2>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: c.mist, marginBottom: 32 }}>
                  Every morning at the time you set, Donna surfaces your briefing in the app.
                  Not a wall of notifications — one structured briefing that takes 90 seconds
                  to read and gives you the clarity to move.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { label: "Ranked priorities", color: c.dawn },
                    { label: "Commitments due today", color: c.gold },
                    { label: "Who needs a reply", color: c.sage },
                    { label: "Meeting prep", color: c.dusk },
                  ].map(({ label, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: c.mist }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div
                className="briefing-telegram-mock"
                style={{
                  background: "#17212B",
                  borderRadius: 18,
                  padding: "28px 28px 24px",
                  boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  maxWidth: 420,
                  fontFamily: fonts.body,
                }}
              >
                {/* Telegram header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${c.dawn}, ${c.dusk})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                    }}
                  >
                    D
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1, marginBottom: 3 }}>Donna</div>
                    <div style={{ fontSize: 11, color: "#6c8490" }}>Personal Intelligence</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "#4a6070" }}>7:00 AM</div>
                </div>

                {/* Message bubble */}
                <div style={{ background: "#232E3C", borderRadius: 12, borderTopLeftRadius: 4, padding: "16px 18px" }}>
                  <p style={{ fontSize: 13, color: "#e0e8f0", marginBottom: 14, lineHeight: 1.5 }}>
                    Good morning, Nazir. Here&apos;s what matters today.
                  </p>

                  <BriefingBlock label="TODAY'S PRIORITIES" labelColor={c.dawn} items={[
                    "\u26A1 Reply to Ahmed re: Series A term sheet \u2014 flagged urgent",
                    "\uD83D\uDCCB Investor update draft due \u2014 you promised Sarah by EOD",
                    "\uD83D\uDCDE Call with Lara at 3pm \u2014 prep attached below",
                  ]} />
                  <BriefingBlock label="COMMITMENTS DUE" labelColor={c.gold} items={[
                    "\u201CI\u2019ll send the deck over\u201D \u2014 Khalid, 4 days ago",
                    "\u201CFollow up with legal on Friday\u201D \u2014 overdue by 1 day",
                  ]} />
                  <BriefingBlock label="RELATIONSHIPS COOLING" labelColor={c.sage} items={[
                    "Marcus Chen \u2014 no contact in 23 days (was weekly)",
                  ]} />
                  <BriefingBlock label="MEETING PREP \u2014 3PM" labelColor={c.dusk} items={[
                    "Lara\u2019s last email: concerned about Q2 runway",
                    "Previous meeting: agreed to share revised model",
                  ]} />

                  <div style={{ marginTop: 12, fontSize: 10, color: "#4a6070", fontFamily: fonts.mono, letterSpacing: "0.05em" }}>
                    DONNA \u00B7 7 items \u00B7 3.1s
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            INTELLIGENCE PILLARS
        ══════════════════════════════════════ */}
        <section id="features" className="section-lg" style={{ background: c.paper, padding: "120px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 72 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: c.dawn, marginBottom: 20 }}>
                  WHAT SHE TRACKS
                </div>
                <h2 style={{ fontFamily: fonts.display, fontSize: "clamp(36px, 4vw, 52px)", fontWeight: 400, lineHeight: 1.15, color: c.charcoal, margin: 0 }}>
                  Four layers of <em style={{ fontStyle: "italic", color: c.dusk }}>intelligence.</em>
                </h2>
              </div>
            </Reveal>

            <div className="features-cards-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
              {[
                { icon: <CheckSquare size={20} strokeWidth={1.5} />, label: "COMMITMENT TRACKING", headline: "Nothing you promised is ever forgotten", body: "Every \u201CI\u2019ll send that over\u201D, \u201CLet\u2019s catch up next week\u201D, and \u201CI\u2019ll have it to you by Friday\u201D is extracted, tracked, and surfaced before it becomes a broken promise.", accent: c.sage, accentBg: `${c.sage}10` },
                { icon: <Users size={20} strokeWidth={1.5} />, label: "RELATIONSHIP INTELLIGENCE", headline: "Know when a relationship needs attention", body: "Donna monitors contact frequency across all channels. When someone important goes quiet \u2014 or you do \u2014 she tells you before the relationship costs you.", accent: c.dusk, accentBg: `${c.dusk}10` },
                { icon: <Calendar size={20} strokeWidth={1.5} />, label: "MEETING PREP", headline: "Walk into every room prepared", body: "Before each meeting, Donna synthesises recent email threads, past commitments, shared documents, and relationship context into a concise brief.", accent: c.dawn, accentBg: `${c.dawn}10` },
                { icon: <TrendingUp size={20} strokeWidth={1.5} />, label: "PRIORITY SCORING", headline: "Signal over noise, always", body: "Every item in your briefing is scored across five dimensions \u2014 urgency, importance, relationship weight, time-sensitivity, and your personal patterns. The highest signal rises first.", accent: c.gold, accentBg: `${c.gold}18` },
              ].map(({ icon, label, headline, body, accent, accentBg }, i) => (
                <Reveal key={label} delay={i * 70}>
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${"#F1EDEA"}`,
                      borderRadius: 14,
                      padding: "40px 36px",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: accentBg, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", color: accent, marginBottom: 24 }}>
                      {icon}
                    </div>
                    <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: accent, marginBottom: 14 }}>
                      {label}
                    </div>
                    <h3 style={{ fontFamily: fonts.display, fontSize: 23, fontWeight: 600, color: c.charcoal, lineHeight: 1.25, marginBottom: 16 }}>
                      {headline}
                    </h3>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: "#5a5a6e" }}>{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS
        ══════════════════════════════════════ */}
        <section className="section-md" style={{ background: c.charcoal, padding: "100px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <h2 style={{ fontFamily: fonts.display, fontSize: "clamp(32px, 3.5vw, 46px)", fontWeight: 400, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                  Intelligence you can <em style={{ fontStyle: "italic", color: c.gold }}>measure.</em>
                </h2>
              </div>
            </Reveal>

            <div className="stats-grid-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
              {[
                { value: 847, suffix: "", label: "commitments tracked per user", accent: c.dawn },
                { value: 3, suffix: ".2s", label: "average briefing read time", accent: c.gold },
                { value: 0, suffix: "", label: "missed follow-ups per month", accent: c.sage },
                { value: 94, suffix: "%", label: "of users open their briefing first", accent: c.dusk },
              ].map(({ value, suffix, label, accent }, i) => (
                <Reveal key={label} delay={i * 80}>
                  <div className={`stat-cell${i < 3 ? " stat-cell-border-right" : ""}`} style={{ padding: "48px 32px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ fontFamily: fonts.display, fontSize: "clamp(42px, 4vw, 58px)", fontWeight: 300, color: accent, lineHeight: 1, marginBottom: 12, letterSpacing: "-0.02em" }}>
                      <Counter target={value} suffix={suffix} />
                    </div>
                    <div style={{ fontSize: 13, color: c.mist, lineHeight: 1.5, maxWidth: 140, margin: "0 auto" }}>{label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            MANIFESTO
        ══════════════════════════════════════ */}
        <section className="section-md" style={{ background: c.paper, padding: "100px 24px", borderTop: `1px solid ${"#F1EDEA"}`, borderBottom: `1px solid ${"#F1EDEA"}` }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <Reveal>
              <blockquote
                style={{
                  fontFamily: fonts.display,
                  fontSize: "clamp(26px, 3.5vw, 40px)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  color: c.charcoal,
                  margin: 0,
                  letterSpacing: "-0.005em",
                }}
              >
                &ldquo;The best executive assistant you ever had didn&apos;t wait to be asked. She read
                everything on your desk and told you what needed your attention before you knew to look.&rdquo;
              </blockquote>
              <p style={{ marginTop: 32, fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: c.mist }}>
                THAT&apos;S DONNA.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA / WAITLIST
        ══════════════════════════════════════ */}
        <section
          id="waitlist"
          className="section-lg"
          style={{
            background: "#1C2B38",
            padding: "120px 24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -80, left: "50%",
              transform: "translateX(-50%)",
              width: 600, height: 300,
              background: `radial-gradient(ellipse at center, ${c.dawn}20 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          <Reveal>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: c.dawn, marginBottom: 24 }}>
                EARLY ACCESS
              </div>
              <h2 style={{ fontFamily: fonts.display, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 400, lineHeight: 1.1, color: "#fff", margin: "0 auto 24px", maxWidth: 680, letterSpacing: "-0.01em" }}>
                Your morning edge <em style={{ fontStyle: "italic", color: c.gold }}>starts here.</em>
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: c.mist, maxWidth: 460, margin: "0 auto 52px" }}>
                Donna is in private beta. Join the waitlist and we&apos;ll let you know when your spot opens.
              </p>

              {submitted ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: `${c.sage}18`, border: `1px solid ${c.sage}40`, borderRadius: 10, padding: "16px 28px" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.sage }} />
                  <span style={{ color: c.sage, fontSize: 14, fontFamily: fonts.mono, letterSpacing: "0.05em" }}>
                    You&apos;re on the list. We&apos;ll be in touch.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", maxWidth: 480, margin: "0 auto" }}
                >
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      flex: 1, minWidth: 240, padding: "14px 18px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, color: "#fff", fontSize: 14,
                      fontFamily: fonts.body,
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: c.dawn, color: "#fff", border: "none",
                      padding: "14px 28px", borderRadius: 8, fontSize: 14,
                      fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      letterSpacing: "0.01em", whiteSpace: "nowrap",
                    }}
                  >
                    Join waitlist <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </form>
              )}

              <p style={{ marginTop: 20, fontSize: 12, color: "#4a6080", fontFamily: fonts.mono, letterSpacing: "0.06em" }}>
                NO SPAM. EARLY ACCESS ONLY.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer
          className="footer-bar"
          style={{
            background: "#F1EDEA",
            padding: "48px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            borderTop: "1px solid rgba(45,45,45,0.08)",
          }}
        >
          <div>
            <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 20, fontWeight: 700, color: c.charcoal, letterSpacing: "-0.01em" }}>
              Donna<span style={{ color: c.dawn }}>.</span>
            </span>
            <p style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.12em", color: c.slate, marginTop: 6, textTransform: "uppercase" }}>
              PERSONAL INTELLIGENCE
            </p>
          </div>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {["Privacy", "Terms", "Security"].map((item) => (
              <a key={item} href="#" style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: c.slate, textDecoration: "none" }}>
                {item}
              </a>
            ))}
          </div>
          <p style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: "0.08em", color: "rgba(141,153,174,0.6)", textTransform: "uppercase" }}>
            &copy; 2026 DONNA
          </p>
        </footer>
      </div>
    </>
  );
}
