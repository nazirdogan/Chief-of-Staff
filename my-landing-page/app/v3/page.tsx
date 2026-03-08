"use client";

import { useEffect, useRef, useState } from "react";
import {
  Shield,
  Eye,
  Zap,
  Clock,
  Users,
  FileText,
  Mail,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

/* ── Brand color tokens ── */
const c = {
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
  alert: "#D64B2A",
};

/* ── Intelligence feed items ── */
const feedItems = [
  {
    category: "COMMITMENT",
    dot: c.sage,
    text: "You promised Sarah the proposal by Friday — 2 days remaining",
    time: "tracked 6h ago",
  },
  {
    category: "RELATIONSHIP",
    dot: c.dawn,
    text: "Haven't spoken to James Chen in 14 days — relationship cooling",
    time: "detected 2h ago",
  },
  {
    category: "MEETING",
    dot: c.dusk,
    text: "Board sync in 2h — 3 prep items ready for your review",
    time: "briefed 8m ago",
  },
  {
    category: "PRIORITY",
    dot: c.gold,
    text: "Investor email flagged — Ahmed asked about Q4 projections",
    time: "flagged 1h ago",
  },
  {
    category: "COMMITMENT",
    dot: c.sage,
    text: "Review contractor invoices — promised in Monday standup",
    time: "tracked 18h ago",
  },
  {
    category: "RELATIONSHIP",
    dot: c.dawn,
    text: "Maria Santos — missed her birthday yesterday, reconnect suggested",
    time: "detected 4h ago",
  },
  {
    category: "MEETING",
    dot: c.dusk,
    text: "1:1 with Dev Lead (2:00 PM) — sprint velocity analysis ready",
    time: "briefed 14m ago",
  },
  {
    category: "PRIORITY",
    dot: c.alert,
    text: "Legal NDA deadline — contract review due end of day",
    time: "flagged 3h ago",
  },
];

/* ── Capability cards ── */
const capabilities = [
  {
    label: "SCAN",
    name: "Six Sources, One Pass",
    desc: "Reads email, calendar, Slack, documents, tasks, and messages overnight while you sleep.",
    border: c.dawn,
    icon: <Eye size={16} strokeWidth={1.5} />,
  },
  {
    label: "EXTRACT",
    name: "Commitments Found",
    desc: "Surfaces every promise you made — in email, in a meeting, in a message — before you forget.",
    border: c.sage,
    icon: <CheckCircle2 size={16} strokeWidth={1.5} />,
  },
  {
    label: "SCORE",
    name: "Urgency Matrix",
    desc: "Ranks everything by deadline, relationship value, and consequence. Highest stakes rise first.",
    border: c.gold,
    icon: <Zap size={16} strokeWidth={1.5} />,
  },
  {
    label: "RELATE",
    name: "Relationship Health",
    desc: "Maps who you've gone cold with, who reached out, and who matters most to stay close to.",
    border: c.dusk,
    icon: <Users size={16} strokeWidth={1.5} />,
  },
  {
    label: "BRIEF",
    name: "One Morning Read",
    desc: "A single, distilled briefing. No noise. Just what you need to command your day from minute one.",
    border: c.mist,
    icon: <FileText size={16} strokeWidth={1.5} />,
  },
  {
    label: "ACT",
    name: "Ready to Execute",
    desc: "Drafts replies, blocks calendar time, and follows up — with your approval before anything sends.",
    border: c.dawn,
    icon: <Activity size={16} strokeWidth={1.5} />,
  },
];

/* ── Metrics ── */
const metrics = [
  { number: "6", label: "DATA SOURCES", sub: "integrations" },
  { number: "< 4s", label: "DELIVERY TIME", sub: "briefing speed" },
  { number: "0", label: "MISSED", sub: "forgotten commitments" },
  { number: "24/7", label: "ALWAYS ON", sub: "background intelligence" },
];

/* ── AnimatedFeed component ── */
function AnimatedFeed() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: 340,
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    >
      <div
        ref={trackRef}
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

function FeedItem({
  item,
}: {
  item: (typeof feedItems)[0];
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: 8,
        padding: "14px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        transition: "background 0.2s",
      }}
    >
      {/* Dot */}
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
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
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
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "rgba(155,175,196,0.45)",
              letterSpacing: "0.06em",
            }}
          >
            {item.time}
          </span>
        </div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13.5,
            color: "rgba(251,247,244,0.82)",
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

/* ── ScrollReveal hook ── */
function useScrollReveal() {
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
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ── CapabilityCard ── */
function CapabilityCard({
  cap,
  delay,
  visible,
}: {
  cap: (typeof capabilities)[0];
  delay: number;
  visible: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "rgba(45,49,84,0.9)"
          : "rgba(45,49,84,0.55)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderTop: `2px solid ${cap.border}`,
        borderRadius: 10,
        padding: "24px 22px",
        cursor: "default",
        transition: "all 0.25s ease",
        boxShadow: hovered ? `0 0 32px ${cap.border}22` : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span style={{ color: cap.border, opacity: 0.9 }}>{cap.icon}</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            color: cap.border,
            letterSpacing: "0.16em",
          }}
        >
          {cap.label}
        </span>
      </div>
      <h3
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontSize: 22,
          fontWeight: 600,
          color: c.paper,
          marginBottom: 10,
          lineHeight: 1.2,
        }}
      >
        {cap.name}
      </h3>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13.5,
          color: c.mist,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {cap.desc}
      </p>
    </div>
  );
}

/* ── Main Page ── */
export default function V3Page() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaSubmitted, setCtaSubmitted] = useState(false);

  const feedSection = useScrollReveal();
  const capSection = useScrollReveal();
  const briefingSection = useScrollReveal();
  const metricsSection = useScrollReveal();
  const privacySection = useScrollReveal();
  const finalCta = useScrollReveal();

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: ${c.deep};
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

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

        .hero-line-1 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .hero-line-2 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .hero-line-3 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both; }
        .hero-line-4 { animation: heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.7s both; }

        .cta-btn {
          animation: pulseGlow 3s ease-in-out infinite;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .cta-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
          animation: none;
          box-shadow: 0 0 0 20px rgba(232,132,92,0.1), 0 8px 32px rgba(232,132,92,0.3) !important;
        }
        .cta-btn:active { transform: translateY(0); }

        .grid-bg {
          background-image:
            linear-gradient(rgba(155,175,196,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(155,175,196,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 8s ease-in-out infinite;
        }

        .blink-dot {
          animation: dotBlink 1.8s ease-in-out infinite;
        }

        .scan-line {
          animation: scanLine 6s linear infinite;
        }

        input[type="email"] {
          outline: none;
        }
        input[type="email"]:focus {
          border-color: rgba(232,132,92,0.6) !important;
          box-shadow: 0 0 0 3px rgba(232,132,92,0.12);
        }
      `}</style>

      <div style={{ background: c.deep, minHeight: "100vh" }}>

        {/* ── Nav ── */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "rgba(14,18,37,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
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
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 24,
                fontWeight: 600,
                color: c.paper,
                letterSpacing: "-0.01em",
              }}
            >
              Donna
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {["Capabilities", "Briefing", "Privacy"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: c.mist,
                    textDecoration: "none",
                    letterSpacing: "0.02em",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.color = c.paper)
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color = c.mist)
                  }
                >
                  {item}
                </a>
              ))}
              <a
                href="#cta"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: c.deep,
                  background: c.dawn,
                  padding: "7px 18px",
                  borderRadius: 6,
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.opacity = "0.88")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.opacity = "1")
                }
              >
                Early access
              </a>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            background: c.deep,
          }}
        >
          {/* Grid background */}
          <div
            className="grid-bg"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          />

          {/* Radial accent glow */}
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "55%",
              width: 600,
              height: 600,
              background: `radial-gradient(circle, rgba(78,125,170,0.12) 0%, transparent 70%)`,
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
              background: `radial-gradient(circle, rgba(232,132,92,0.08) 0%, transparent 70%)`,
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Scan line effect */}
          <div
            className="scan-line"
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
                className="hero-line-1"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 100,
                  padding: "6px 14px",
                  marginBottom: 36,
                }}
              >
                <span
                  className="blink-dot"
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
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: c.mist,
                    letterSpacing: "0.1em",
                    fontWeight: 500,
                  }}
                >
                  INTELLIGENCE ACTIVE
                </span>
              </div>

              <h1
                className="hero-line-2"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(52px, 6vw, 76px)",
                  fontWeight: 600,
                  color: c.paper,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  marginBottom: 24,
                }}
              >
                Your morning
                <br />
                <span style={{ color: c.dawn }}>edge.</span>
              </h1>

              <p
                className="hero-line-3"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 17,
                  color: c.mist,
                  lineHeight: 1.7,
                  maxWidth: 480,
                  marginBottom: 44,
                  fontWeight: 300,
                }}
              >
                While you sleep, Donna reads every email, every calendar invite,
                every message — and distills it into one briefing that tells you
                exactly what to do first.
              </p>

              {/* Email input + CTA */}
              <div className="hero-line-4">
                {!submitted ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 0,
                      maxWidth: 440,
                    }}
                  >
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRight: "none",
                        borderRadius: "8px 0 0 8px",
                        padding: "14px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 14,
                        color: c.paper,
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && email) setSubmitted(true);
                      }}
                    />
                    <button
                      className="cta-btn"
                      onClick={() => email && setSubmitted(true)}
                      style={{
                        background: `linear-gradient(135deg, ${c.dawn} 0%, #d4623a 100%)`,
                        border: "none",
                        borderRadius: "0 8px 8px 0",
                        padding: "14px 24px",
                        fontFamily: "'Inter', sans-serif",
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
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 15,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>You&apos;re on the list. Donna will be in touch.</span>
                  </div>
                )}

                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: "rgba(155,175,196,0.5)",
                    marginTop: 12,
                    letterSpacing: "0.02em",
                  }}
                >
                  No spam. Invite-only early access.
                </p>
              </div>
            </div>

            {/* Right: Live intelligence feed preview */}
            <div
              style={{
                position: "relative",
              }}
            >
              {/* Terminal header */}
              <div
                style={{
                  background: c.charcoal,
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px 12px 0 0",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "rgba(155,175,196,0.5)",
                    letterSpacing: "0.06em",
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  donna — intelligence feed
                </span>
                <span
                  className="blink-dot"
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
                  background: "rgba(27,31,58,0.7)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "16px 16px",
                  backdropFilter: "blur(8px)",
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

        {/* ── Live Intelligence Feed (full section) ── */}
        <section
          id="capabilities"
          ref={feedSection.ref}
          style={{
            background: c.charcoal,
            padding: "96px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${c.dawn}44, transparent)`,
            }}
          />

          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: 64,
                opacity: feedSection.visible ? 1 : 0,
                transform: feedSection.visible
                  ? "translateY(0)"
                  : "translateY(20px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: c.dawn,
                  letterSpacing: "0.16em",
                  fontWeight: 600,
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                Live Intelligence
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(38px, 4vw, 52px)",
                  fontWeight: 600,
                  color: c.paper,
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}
              >
                Nothing slips through.
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  color: c.mist,
                  maxWidth: 480,
                  margin: "0 auto",
                  lineHeight: 1.65,
                  fontWeight: 300,
                }}
              >
                Donna processes your digital life continuously — surfacing
                commitments, cooling relationships, and approaching deadlines
                the moment they emerge.
              </p>
            </div>

            {/* Two-column feed */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                opacity: feedSection.visible ? 1 : 0,
                transform: feedSection.visible
                  ? "translateY(0)"
                  : "translateY(30px)",
                transition:
                  "all 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
              }}
            >
              <div>
                {feedItems.slice(0, 4).map((item, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <FeedItem item={item} />
                  </div>
                ))}
              </div>
              <div>
                {feedItems.slice(4).map((item, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <FeedItem item={item} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Capability Matrix ── */}
        <section
          ref={capSection.ref}
          style={{
            background: c.deep,
            padding: "96px 32px",
            position: "relative",
          }}
        >
          <div
            className="grid-bg"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />

          <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: 64,
                opacity: capSection.visible ? 1 : 0,
                transform: capSection.visible
                  ? "translateY(0)"
                  : "translateY(20px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: c.gold,
                  letterSpacing: "0.16em",
                  fontWeight: 600,
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                Capability Matrix
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(38px, 4vw, 52px)",
                  fontWeight: 600,
                  color: c.paper,
                  lineHeight: 1.15,
                }}
              >
                Six systems. One briefing.
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {capabilities.map((cap, i) => (
                <CapabilityCard
                  key={cap.label}
                  cap={cap}
                  delay={i * 80}
                  visible={capSection.visible}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Briefing Mockup ── */}
        <section
          id="briefing"
          ref={briefingSection.ref}
          style={{
            background: c.midnight,
            padding: "96px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${c.dusk}55, transparent)`,
            }}
          />

          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div
              style={{
                textAlign: "center",
                marginBottom: 56,
                opacity: briefingSection.visible ? 1 : 0,
                transform: briefingSection.visible
                  ? "translateY(0)"
                  : "translateY(20px)",
                transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: c.dusk,
                  letterSpacing: "0.16em",
                  fontWeight: 600,
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                Sample Output
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(38px, 4vw, 52px)",
                  fontWeight: 600,
                  color: c.paper,
                  lineHeight: 1.15,
                  marginBottom: 14,
                }}
              >
                What lands in your inbox.
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  color: c.mist,
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                One briefing. Everything that matters. Nothing that doesn&apos;t.
              </p>
            </div>

            {/* Terminal briefing card */}
            <div
              style={{
                opacity: briefingSection.visible ? 1 : 0,
                transform: briefingSection.visible
                  ? "translateY(0)"
                  : "translateY(30px)",
                transition: "all 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s",
              }}
            >
              {/* Terminal chrome */}
              <div
                style={{
                  background: "#1a1e38",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px 12px 0 0",
                  padding: "13px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
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
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "rgba(155,175,196,0.45)",
                    flex: 1,
                    textAlign: "center",
                    letterSpacing: "0.06em",
                  }}
                >
                  donna — daily briefing — march 8, 2026
                </span>
              </div>

              {/* Briefing body */}
              <div
                style={{
                  background: "#10142A",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderTop: "none",
                  borderRadius: "0 0 12px 12px",
                  padding: "36px 40px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: c.dawn,
                      letterSpacing: "0.18em",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    DONNA DAILY BRIEFING — MARCH 8, 2026
                  </div>
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.1)",
                      marginBottom: 6,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(155,175,196,0.4)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    GENERATED 06:00 AM · 4 SECTIONS · 7 ITEMS
                  </div>
                </div>

                {/* Priority One */}
                <BriefingBlock
                  label="PRIORITY ONE"
                  labelColor={c.alert}
                  items={[
                    {
                      bullet: "•",
                      main: "Investor response needed — Ahmed's email (yesterday, 4:12 PM)",
                      sub: "↳ He asked about Q4 projections. Draft reply ready for review.",
                      color: c.alert,
                    },
                  ]}
                />

                {/* Commitments */}
                <BriefingBlock
                  label="COMMITMENTS DUE TODAY"
                  labelColor={c.sage}
                  items={[
                    {
                      bullet: "•",
                      main: "Send Sarah the proposal deck",
                      sub: "↳ Promised March 5 · source: email thread",
                      color: c.sage,
                    },
                    {
                      bullet: "•",
                      main: "Review contractor invoices",
                      sub: "↳ Promised in Monday standup · source: calendar note",
                      color: c.sage,
                    },
                  ]}
                />

                {/* Relationships */}
                <BriefingBlock
                  label="RELATIONSHIPS COOLING"
                  labelColor={c.dawn}
                  items={[
                    {
                      bullet: "•",
                      main: "James Chen — 14 days since last contact",
                      sub: "↳ High-value contact · suggest a check-in",
                      color: c.dawn,
                    },
                    {
                      bullet: "•",
                      main: "Maria Santos — missed her birthday yesterday",
                      sub: "↳ Draft message ready",
                      color: c.dawn,
                    },
                  ]}
                />

                {/* Meeting Prep */}
                <BriefingBlock
                  label="MEETING PREP"
                  labelColor={c.dusk}
                  items={[
                    {
                      bullet: "•",
                      main: "Board Sync (10:00 AM) — 3 talking points prepared",
                      sub: "↳ Revenue, roadmap, Q1 retrospective · open brief →",
                      color: c.dusk,
                    },
                    {
                      bullet: "•",
                      main: "1:1 with Dev Lead (2:00 PM) — sprint velocity analysis ready",
                      sub: "↳ 2 blockers flagged from this sprint · open brief →",
                      color: c.dusk,
                    },
                  ]}
                  last
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Metrics ── */}
        <section
          ref={metricsSection.ref}
          style={{
            background: c.deep,
            padding: "88px 32px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`,
            }}
          />

          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
              }}
            >
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  style={{
                    textAlign: "center",
                    padding: "40px 16px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    opacity: metricsSection.visible ? 1 : 0,
                    transform: metricsSection.visible
                      ? "translateY(0)"
                      : "translateY(20px)",
                    transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontSize: "clamp(42px, 5vw, 60px)",
                      fontWeight: 600,
                      color: c.paper,
                      lineHeight: 1,
                      marginBottom: 10,
                    }}
                  >
                    {m.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: c.dawn,
                      letterSpacing: "0.18em",
                      fontWeight: 600,
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      color: "rgba(155,175,196,0.5)",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {m.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Privacy Strip ── */}
        <section
          id="privacy"
          ref={privacySection.ref}
          style={{
            background: c.midnight,
            padding: "56px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, rgba(78,125,170,0.06) 0%, transparent 60%)`,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 48,
              opacity: privacySection.visible ? 1 : 0,
              transform: privacySection.visible ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(78,125,170,0.12)",
                border: "1px solid rgba(78,125,170,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Shield size={20} color={c.dusk} strokeWidth={1.5} />
            </div>

            <div style={{ textAlign: "left" }}>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  color: c.mist,
                  lineHeight: 1.65,
                  fontWeight: 300,
                  maxWidth: 600,
                }}
              >
                <strong
                  style={{
                    fontWeight: 500,
                    color: c.paper,
                    display: "block",
                    marginBottom: 4,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    letterSpacing: "0.01em",
                  }}
                >
                  Built with your privacy as a constraint, not a feature.
                </strong>
                End-to-end encrypted. Your data never trains AI models. Every
                write action requires your explicit approval — Donna never sends,
                schedules, or acts without a green light from you.
              </p>
            </div>

            {/* Three trust badges */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flexShrink: 0,
              }}
            >
              {[
                { label: "E2E ENCRYPTED", icon: <Shield size={12} strokeWidth={1.5} /> },
                { label: "ZERO TRAINING", icon: <Eye size={12} strokeWidth={1.5} /> },
                { label: "APPROVAL REQUIRED", icon: <CheckCircle2 size={12} strokeWidth={1.5} /> },
              ].map((badge) => (
                <div
                  key={badge.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 6,
                    padding: "6px 10px",
                  }}
                >
                  <span style={{ color: c.dusk }}>{badge.icon}</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: "rgba(155,175,196,0.6)",
                      letterSpacing: "0.12em",
                      fontWeight: 500,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section
          id="cta"
          ref={finalCta.ref}
          style={{
            background: c.deep,
            padding: "120px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="grid-bg"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />

          {/* Center glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 700,
              height: 400,
              background: `radial-gradient(ellipse, rgba(232,132,92,0.07) 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              textAlign: "center",
              position: "relative",
              opacity: finalCta.visible ? 1 : 0,
              transform: finalCta.visible ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.8s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: c.dawn,
                letterSpacing: "0.16em",
                fontWeight: 600,
                marginBottom: 24,
                textTransform: "uppercase",
              }}
            >
              Invite Only
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: "clamp(48px, 6vw, 72px)",
                fontWeight: 600,
                color: c.paper,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              Command your morning.
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                color: c.mist,
                lineHeight: 1.65,
                marginBottom: 48,
                fontWeight: 300,
              }}
            >
              Join the waitlist. Early access to the individuals who do more,
              miss less, and lead with precision.
            </p>

            {!ctaSubmitted ? (
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  maxWidth: 420,
                  margin: "0 auto 16px",
                }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={ctaEmail}
                  onChange={(e) => setCtaEmail(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRight: "none",
                    borderRadius: "8px 0 0 8px",
                    padding: "15px 18px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    color: c.paper,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && ctaEmail) setCtaSubmitted(true);
                  }}
                />
                <button
                  className="cta-btn"
                  onClick={() => ctaEmail && setCtaSubmitted(true)}
                  style={{
                    background: `linear-gradient(135deg, ${c.dawn} 0%, #d4623a 100%)`,
                    border: "none",
                    borderRadius: "0 8px 8px 0",
                    padding: "15px 26px",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Request access
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  color: c.sage,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  marginBottom: 16,
                }}
              >
                <CheckCircle2 size={20} />
                <span>You&apos;re on the list. Donna will be in touch.</span>
              </div>
            )}

            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: "rgba(155,175,196,0.4)",
                letterSpacing: "0.03em",
              }}
            >
              Invite-only. No spam. Unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            background: c.midnight,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "32px",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 20,
                fontWeight: 600,
                color: c.paper,
                opacity: 0.8,
              }}
            >
              Donna
            </span>

            <div style={{ display: "flex", gap: 28 }}>
              {["Privacy", "Terms", "Contact"].map((item) => (
                <a
                  key={item}
                  href="#"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    color: "rgba(155,175,196,0.45)",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.color = c.mist)
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color =
                      "rgba(155,175,196,0.45)")
                  }
                >
                  {item}
                </a>
              ))}
            </div>

            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "rgba(155,175,196,0.3)",
                letterSpacing: "0.08em",
              }}
            >
              © 2026 DONNA
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ── BriefingBlock subcomponent ── */
function BriefingBlock({
  label,
  labelColor,
  items,
  last = false,
}: {
  label: string;
  labelColor: string;
  items: {
    bullet: string;
    main: string;
    sub: string;
    color: string;
  }[];
  last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 28 }}>
      <div
        style={{
          fontSize: 10,
          color: labelColor,
          letterSpacing: "0.18em",
          fontWeight: 600,
          marginBottom: 14,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: i < items.length - 1 ? 12 : 0 }}>
          <div
            style={{
              fontSize: 13,
              color: "rgba(251,247,244,0.88)",
              lineHeight: 1.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span style={{ color: item.color, marginRight: 8 }}>
              {item.bullet}
            </span>
            {item.main}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "rgba(155,175,196,0.5)",
              paddingLeft: 20,
              marginTop: 3,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.4,
            }}
          >
            {item.sub}
          </div>
        </div>
      ))}
      {!last && (
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.07)",
            marginTop: 20,
          }}
        />
      )}
    </div>
  );
}
