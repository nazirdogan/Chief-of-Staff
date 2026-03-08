"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  Shield,
  Users,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  Bell,
  BookOpen,
  ChevronRight,
} from "lucide-react";

/* ─── Brand tokens ─── */
const brand = {
  midnight: "#1B1F3A",
  dawn: "#E8845C",
  dusk: "#4E7DAA",
  paper: "#FBF7F4",
  sage: "#52B788",
  gold: "#F4C896",
  deep: "#0E1225",
  charcoal: "#2D3154",
  mist: "#9BAFC4",
  stone: "#F0EDE9",
  white: "#FFFFFF",
  offwhite: "#FAFAF8",
};

/* ─── Scroll-reveal hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─── Reveal wrapper ─── */
function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}) {
  const { ref, visible } = useReveal();

  const transforms: Record<string, string> = {
    up: "translateY(28px)",
    left: "translateX(-24px)",
    right: "translateX(24px)",
    none: "none",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Nav ─── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(250,250,248,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(78,125,170,0.12)"
          : "1px solid transparent",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: brand.midnight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 18,
                fontWeight: 600,
                color: brand.paper,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              D
            </span>
          </div>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 20,
              fontWeight: 600,
              color: brand.midnight,
              letterSpacing: "-0.01em",
            }}
          >
            Donna
          </span>
        </div>

        {/* Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          {["How it works", "Privacy", "Sign in"].map((label) => (
            <a
              key={label}
              href="#"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 450,
                color: brand.midnight,
                opacity: 0.65,
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.opacity = "1")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.opacity = "0.65")
              }
            >
              {label}
            </a>
          ))}
          <a
            href="#cta"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: brand.white,
              background: brand.dusk,
              padding: "8px 18px",
              borderRadius: 6,
              textDecoration: "none",
              transition: "background 0.2s, transform 0.2s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "#3d6a92";
              (e.target as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = brand.dusk;
              (e.target as HTMLElement).style.transform = "none";
            }}
          >
            Early access
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section
      style={{
        background: brand.offwhite,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 32px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid lines */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(78,125,170,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(78,125,170,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          pointerEvents: "none",
        }}
      />

      {/* Soft glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 400,
          background:
            "radial-gradient(ellipse, rgba(78,125,170,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 720,
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Label chip */}
        <Reveal>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 100,
              border: `1px solid rgba(78,125,170,0.2)`,
              background: "rgba(78,125,170,0.06)",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: brand.sage,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                color: brand.dusk,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Personal Intelligence Layer
            </span>
          </div>
        </Reveal>

        {/* Heading */}
        <Reveal delay={80}>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(52px, 8vw, 88px)",
              fontWeight: 600,
              color: brand.midnight,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              margin: "0 0 28px",
            }}
          >
            Intelligence,
            <br />
            <span style={{ fontStyle: "italic", color: brand.dusk }}>
              distilled.
            </span>
          </h1>
        </Reveal>

        {/* Sub */}
        <Reveal delay={160}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 19,
              fontWeight: 400,
              color: brand.midnight,
              opacity: 0.62,
              lineHeight: 1.65,
              margin: "0 auto 44px",
              maxWidth: 520,
            }}
          >
            Donna reads your email, calendar, and messages overnight. By
            morning, she knows what matters — and tells you exactly what to do
            first.
          </p>
        </Reveal>

        {/* CTA row */}
        <Reveal delay={240}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <CTAButton href="#cta" primary>
              Get early access
            </CTAButton>
            <a
              href="#how"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 450,
                color: brand.midnight,
                opacity: 0.6,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).closest("a")!.style.opacity = "1")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).closest("a")!.style.opacity = "0.6")
              }
            >
              See how it works
              <ChevronRight size={14} />
            </a>
          </div>
        </Reveal>

        {/* Social proof */}
        <Reveal delay={320}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: brand.midnight,
              opacity: 0.35,
              marginTop: 28,
              letterSpacing: "0.02em",
            }}
          >
            No credit card required &middot; Works with Gmail, Outlook &middot;
            Setup in 3 minutes
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Shared CTA Button ─── */
function CTAButton({
  children,
  href,
  primary = false,
}: {
  children: React.ReactNode;
  href: string;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: primary ? brand.white : brand.midnight,
        background: primary
          ? hovered
            ? "#3d6a92"
            : brand.dusk
          : hovered
          ? brand.stone
          : "transparent",
        border: primary ? "none" : `1px solid rgba(27,31,58,0.18)`,
        padding: primary ? "12px 26px" : "11px 22px",
        borderRadius: 6,
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: primary && hovered ? "0 4px 16px rgba(78,125,170,0.3)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {primary && <ArrowRight size={14} />}
    </a>
  );
}

/* ─── Data Sources ─── */
function DataSources() {
  const sources = [
    { icon: Mail, label: "Gmail", color: brand.dawn },
    { icon: Calendar, label: "Calendar", color: brand.dusk },
    { icon: MessageSquare, label: "Slack", color: brand.sage },
    { icon: FileText, label: "Notion", color: brand.charcoal },
    { icon: MessageSquare, label: "WhatsApp", color: brand.sage },
  ];

  return (
    <section
      id="how"
      style={{
        background: brand.stone,
        padding: "100px 32px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                color: brand.dusk,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Data intelligence
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 600,
                color: brand.midnight,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Everything flows into one place.
            </h2>
          </div>
        </Reveal>

        {/* Flow diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            flexWrap: "wrap",
            rowGap: 24,
          }}
        >
          {/* Source nodes */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {sources.map(({ icon: Icon, label, color }, i) => (
              <Reveal key={label} delay={i * 60} direction="left">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: brand.white,
                    border: "1px solid rgba(27,31,58,0.08)",
                    borderRadius: 8,
                    padding: "10px 16px",
                    boxShadow: "0 1px 4px rgba(27,31,58,0.06)",
                    minWidth: 140,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} color={color} />
                  </div>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: brand.midnight,
                    }}
                  >
                    {label}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Connecting arrows */}
          <Reveal direction="none">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 40px",
                gap: 4,
              }}
            >
              {/* Animated flow line */}
              <svg
                width="160"
                height="180"
                viewBox="0 0 160 180"
                fill="none"
                style={{ overflow: "visible" }}
              >
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = 18 + i * 36;
                  return (
                    <g key={i}>
                      <line
                        x1="0"
                        y1={y}
                        x2="120"
                        y2={90}
                        stroke={`rgba(78,125,170,${0.12 + i * 0.02})`}
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx="120"
                        cy={90}
                        r="3"
                        fill={brand.dusk}
                        opacity={0.3}
                      />
                    </g>
                  );
                })}
                {/* Arrow */}
                <polygon
                  points="128,86 140,90 128,94"
                  fill={brand.dusk}
                  opacity={0.5}
                />
              </svg>
            </div>
          </Reveal>

          {/* Central Donna node */}
          <Reveal delay={200} direction="none">
            <div
              style={{
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  background: brand.midnight,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  boxShadow:
                    "0 8px 32px rgba(27,31,58,0.18), 0 2px 8px rgba(27,31,58,0.1)",
                  position: "relative",
                }}
              >
                {/* Pulse ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: 30,
                    border: "1.5px solid rgba(78,125,170,0.25)",
                    animation: "pulse-ring 2.5s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 42,
                    fontWeight: 600,
                    color: brand.paper,
                    lineHeight: 1,
                  }}
                >
                  D
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: brand.mist,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  donna
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: brand.midnight,
                  opacity: 0.45,
                  margin: 0,
                }}
              >
                Your intelligence layer
              </p>
            </div>
          </Reveal>

          {/* Right side: Output */}
          <Reveal delay={280} direction="right">
            <div style={{ padding: "0 0 0 40px" }}>
              <div
                style={{
                  background: brand.white,
                  border: "1px solid rgba(27,31,58,0.08)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  minWidth: 220,
                  boxShadow: "0 2px 12px rgba(27,31,58,0.06)",
                }}
              >
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: brand.dusk,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                    margin: "0 0 14px",
                  }}
                >
                  07:00 AM briefing
                </p>
                {[
                  { text: "3 commitments due today", dot: brand.dawn },
                  { text: "Sarah hasn't replied in 8 days", dot: brand.gold },
                  { text: "Board deck needs your input", dot: brand.dusk },
                  { text: "14 emails, 2 require action", dot: brand.sage },
                ].map(({ text, dot }) => (
                  <div
                    key={text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(27,31,58,0.05)",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: dot,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 12,
                        color: brand.midnight,
                        opacity: 0.75,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.04); }
        }
      `}</style>
    </section>
  );
}

/* ─── Before / After ─── */
function BeforeAfter() {
  const { ref, visible } = useReveal(0.1);

  return (
    <section
      style={{
        background: brand.offwhite,
        padding: "100px 32px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                color: brand.dusk,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              The difference
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 600,
                color: brand.midnight,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Your mornings, transformed.
            </h2>
          </div>
        </Reveal>

        <div
          ref={ref}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {/* Without Donna */}
          <div
            style={{
              background: brand.white,
              border: "1px solid rgba(232,132,92,0.2)",
              borderRadius: 12,
              padding: "32px",
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateX(-20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(232,132,92,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={14} color={brand.dawn} />
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.dawn,
                  letterSpacing: "0.01em",
                }}
              >
                Without Donna
              </span>
            </div>

            {[
              "157 unread emails — no idea what's urgent",
              "Forgot to follow up with the investor",
              "Missed the deadline you committed to Monday",
              "Back-to-back meetings, zero prep",
              "Relationship with key client has gone cold",
              "End of day — not sure what you actually did",
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: "1px solid rgba(27,31,58,0.05)",
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.4s ease ${i * 60 + 200}ms`,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "rgba(232,132,92,0.15)",
                    border: "1.5px solid rgba(232,132,92,0.35)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: brand.midnight,
                    opacity: 0.65,
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* With Donna */}
          <div
            style={{
              background: brand.white,
              border: "1px solid rgba(82,183,136,0.25)",
              borderRadius: 12,
              padding: "32px",
              position: "relative",
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateX(20px)",
              transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
            }}
          >
            {/* Subtle top accent */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${brand.sage}, ${brand.dusk})`,
                borderRadius: "12px 12px 0 0",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(82,183,136,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={14} color={brand.sage} />
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.sage,
                  letterSpacing: "0.01em",
                }}
              >
                With Donna
              </span>
            </div>

            {[
              { text: "3 emails need your reply — everything else handled", done: true },
              { text: "Follow-up with investor drafted, awaiting your tap", done: true },
              { text: "Deadline flagged 48 hours ago, already rescheduled", done: true },
              { text: "Full meeting brief ready before you walk in", done: true },
              { text: "Nudge sent — relationship back on track", done: true },
              { text: "Day recap: 5 commitments resolved, 2 moved forward", done: true },
            ].map(({ text }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: "1px solid rgba(27,31,58,0.05)",
                  opacity: visible ? 1 : 0,
                  transition: `opacity 0.4s ease ${i * 60 + 350}ms`,
                }}
              >
                <CheckCircle2
                  size={16}
                  color={brand.sage}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: brand.midnight,
                    opacity: 0.75,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Feature Cards ─── */
const features = [
  {
    icon: Bell,
    title: "Daily Briefing",
    description:
      "One morning message that cuts through the noise. Ranked by urgency, sourced from everything.",
    accent: brand.dawn,
  },
  {
    icon: CheckCircle2,
    title: "Commitment Tracking",
    description:
      "Every promise you made, automatically tracked. Never drop a ball again.",
    accent: brand.sage,
  },
  {
    icon: Users,
    title: "Relationship Radar",
    description:
      "Know who you've gone cold with before it costs you. Warm nudges at the right moment.",
    accent: brand.dusk,
  },
  {
    icon: BookOpen,
    title: "Meeting Prep",
    description:
      "Full context brief before every important meeting — what they care about, what you promised.",
    accent: brand.gold,
  },
  {
    icon: TrendingUp,
    title: "Smart Priority",
    description:
      "Five-dimension scoring across urgency, relationship weight, and business impact.",
    accent: brand.charcoal,
  },
  {
    icon: Zap,
    title: "Zero-Touch Actions",
    description:
      "Pre-authorise routine tasks. Donna executes, logs everything, asks only when it matters.",
    accent: brand.mist,
  },
];

function FeatureCards() {
  return (
    <section
      style={{
        background: brand.white,
        padding: "100px 32px",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                color: brand.dusk,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              What Donna does
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 600,
                color: brand.midnight,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Six capabilities.
              <br />
              <span style={{ fontStyle: "italic", color: brand.dusk }}>
                One coherent picture.
              </span>
            </h2>
          </div>
        </Reveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {features.map(({ icon: Icon, title, description, accent }, i) => (
            <FeatureCard
              key={title}
              icon={<Icon size={18} color={accent} />}
              title={title}
              description={description}
              accent={accent}
              delay={i * 70}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  delay?: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: brand.offwhite,
          border: "1px solid rgba(27,31,58,0.07)",
          borderLeft: `3px solid ${accent}`,
          borderRadius: 10,
          padding: "24px 24px 28px",
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          boxShadow: hovered
            ? "0 4px 20px rgba(27,31,58,0.08)"
            : "0 1px 3px rgba(27,31,58,0.04)",
          transform: hovered ? "translateY(-2px)" : "none",
          cursor: "default",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${accent}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: brand.midnight,
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13.5,
            color: brand.midnight,
            opacity: 0.58,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </Reveal>
  );
}

/* ─── Timeline ─── */
const timelineItems = [
  {
    time: "6:00 AM",
    label: "Scan begins",
    description: "Donna reads overnight emails, calendar updates, and messages silently in the background.",
    accent: brand.dusk,
  },
  {
    time: "6:30 AM",
    label: "Briefing generated",
    description: "Every source cross-referenced. Commitments tracked. Priorities scored. Your brief is ready.",
    accent: brand.mist,
  },
  {
    time: "7:00 AM",
    label: "You read it over coffee",
    description: "One Telegram message. Everything you need to know. Nothing you don't.",
    accent: brand.sage,
  },
  {
    time: "9:00 AM",
    label: "Meeting prep ready",
    description: "Full context brief for every meeting — who they are, what you promised, what matters to them.",
    accent: brand.gold,
  },
  {
    time: "5:00 PM",
    label: "Day recap",
    description: "3 commitments resolved. 2 follow-ups queued. Tomorrow's brief already in motion.",
    accent: brand.dawn,
  },
];

function Timeline() {
  return (
    <section
      style={{
        background: brand.stone,
        padding: "100px 32px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                color: brand.dusk,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              A day with Donna
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(34px, 5vw, 52px)",
                fontWeight: 600,
                color: brand.midnight,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              From overnight scan
              <br />
              <span style={{ fontStyle: "italic" }}>to day complete.</span>
            </h2>
          </div>
        </Reveal>

        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 88,
              top: 0,
              bottom: 0,
              width: 1,
              background:
                "linear-gradient(180deg, rgba(78,125,170,0.08), rgba(78,125,170,0.25) 20%, rgba(78,125,170,0.25) 80%, rgba(78,125,170,0.08))",
            }}
          />

          {timelineItems.map(({ time, label, description, accent }, i) => (
            <Reveal key={i} delay={i * 80}>
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  marginBottom: i < timelineItems.length - 1 ? 48 : 0,
                  position: "relative",
                }}
              >
                {/* Time */}
                <div
                  style={{
                    width: 88,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 500,
                      color: brand.midnight,
                      opacity: 0.4,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {time}
                  </span>
                </div>

                {/* Dot */}
                <div
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    paddingTop: 4,
                    marginRight: 28,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: accent,
                      boxShadow: `0 0 0 3px ${accent}22`,
                      position: "relative",
                      zIndex: 1,
                    }}
                  />
                </div>

                {/* Content */}
                <div>
                  <h4
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 15,
                      fontWeight: 600,
                      color: brand.midnight,
                      margin: "0 0 6px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {label}
                  </h4>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13.5,
                      color: brand.midnight,
                      opacity: 0.55,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Trust ─── */
function Trust() {
  const items = [
    {
      icon: Lock,
      title: "End-to-end encrypted",
      text: "Your data is encrypted at rest and in transit. We never see the content of your emails or messages.",
    },
    {
      icon: Eye,
      title: "You control every action",
      text: "Donna never sends an email or takes an action without your explicit confirmation. Every step is audited.",
    },
    {
      icon: Shield,
      title: "Your vault, your data",
      text: "Data never leaves your encrypted vault. No training on your data. No third-party data brokers.",
    },
  ];

  return (
    <section
      style={{
        background: brand.paper,
        padding: "100px 32px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              color: brand.dusk,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Built for trust
          </p>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(30px, 4vw, 44px)",
              fontWeight: 600,
              color: brand.midnight,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: "0 0 16px",
            }}
          >
            Your data never leaves your vault.
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              color: brand.midnight,
              opacity: 0.5,
              margin: "0 auto 60px",
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            End-to-end encryption. You control every action. No surprises.
          </p>
        </Reveal>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {items.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div
                style={{
                  background: brand.white,
                  border: "1px solid rgba(27,31,58,0.07)",
                  borderRadius: 10,
                  padding: "28px 24px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(78,125,170,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Icon size={16} color={brand.dusk} />
                </div>
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: brand.midnight,
                    margin: "0 0 8px",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: brand.midnight,
                    opacity: 0.55,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Section ─── */
function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section
      id="cta"
      style={{
        background: brand.midnight,
        padding: "120px 32px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Reveal>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              color: brand.mist,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 20,
              opacity: 0.7,
            }}
          >
            Early access
          </p>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(36px, 5vw, 58px)",
              fontWeight: 600,
              color: brand.paper,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              margin: "0 0 20px",
            }}
          >
            Start your first morning briefing.
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              color: brand.paper,
              opacity: 0.45,
              margin: "0 0 44px",
              lineHeight: 1.6,
            }}
          >
            Join the waitlist. We&apos;ll reach out with access when your spot is ready.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {submitted ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "18px 28px",
                background: "rgba(82,183,136,0.12)",
                border: "1px solid rgba(82,183,136,0.25)",
                borderRadius: 8,
              }}
            >
              <CheckCircle2 size={18} color={brand.sage} />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  color: brand.paper,
                  opacity: 0.85,
                }}
              >
                You&apos;re on the list. We&apos;ll be in touch.
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                gap: 10,
                maxWidth: 460,
                margin: "0 auto",
              }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required
                style={{
                  flex: 1,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: brand.paper,
                  background: "rgba(255,255,255,0.07)",
                  border: focused
                    ? "1px solid rgba(78,125,170,0.6)"
                    : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  padding: "12px 16px",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
              <button
                type="submit"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: brand.white,
                  background: brand.dusk,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 22px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLButtonElement).style.background = "#3d6a92")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLButtonElement).style.background = brand.dusk)
                }
              >
                Join waitlist
              </button>
            </form>
          )}
        </Reveal>

        <Reveal delay={200}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: brand.paper,
              opacity: 0.28,
              marginTop: 20,
              letterSpacing: "0.02em",
            }}
          >
            No credit card &middot; No spam &middot; Unsubscribe any time
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer
      style={{
        background: brand.deep,
        padding: "40px 32px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 17,
              fontWeight: 600,
              color: brand.paper,
              opacity: 0.8,
              letterSpacing: "-0.01em",
            }}
          >
            Donna
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: brand.paper,
              opacity: 0.25,
            }}
          >
            &mdash; Personal Intelligence Layer
          </span>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {["Privacy", "Terms", "Security", "Contact"].map((label) => (
            <a
              key={label}
              href="#"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: brand.paper,
                opacity: 0.35,
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.target as HTMLElement).style.opacity = "0.7")
              }
              onMouseLeave={(e) =>
                ((e.target as HTMLElement).style.opacity = "0.35")
              }
            >
              {label}
            </a>
          ))}
        </div>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: brand.paper,
            opacity: 0.2,
            margin: 0,
          }}
        >
          &copy; 2026 Donna. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ─── Google Fonts Injection ─── */
function FontLoader() {
  useEffect(() => {
    if (document.getElementById("donna-v2-fonts")) return;
    const link = document.createElement("link");
    link.id = "donna-v2-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@300;400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

/* ─── Page ─── */
export default function V2Page() {
  return (
    <>
      <FontLoader />
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: ${brand.offwhite}; }
        ::placeholder { color: rgba(251,247,244,0.3); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px ${brand.midnight} inset !important;
          -webkit-text-fill-color: ${brand.paper} !important;
        }

        @media (max-width: 768px) {
          .grid-2col { grid-template-columns: 1fr !important; }
          .grid-3col { grid-template-columns: 1fr !important; }
          .flow-diagram { flex-direction: column !important; align-items: center !important; }
          .flow-svg { display: none !important; }
          .flow-right { padding-left: 0 !important; }
        }
      `}</style>

      <Nav />
      <main>
        <Hero />
        <DataSources />
        <BeforeAfter />
        <FeatureCards />
        <Timeline />
        <Trust />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
