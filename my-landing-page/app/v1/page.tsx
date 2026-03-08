"use client";

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
} from "lucide-react";

/* ─────────────────────────────────────────────
   Brand tokens — Donna "Dawn" palette
───────────────────────────────────────────── */
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
};

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
   Main page
───────────────────────────────────────────── */
export default function V1Page() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <>
      {/* Google Fonts — Cormorant Garamond + JetBrains Mono */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=JetBrains+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <main
        style={{
          fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
          background: c.paper,
          color: c.midnight,
          overflowX: "hidden",
        }}
      >
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
            background: `${c.midnight}f2`,
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid rgba(232,132,92,0.12)`,
            padding: "0 40px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 22,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "0.02em",
            }}
          >
            Donna
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <a
              href="#how-it-works"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: c.mist,
                textDecoration: "none",
              }}
            >
              HOW IT WORKS
            </a>
            <a
              href="#features"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: c.mist,
                textDecoration: "none",
              }}
            >
              FEATURES
            </a>
            <a
              href="#waitlist"
              style={{
                background: c.dawn,
                color: "#fff",
                padding: "8px 20px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              Get early access
            </a>
          </div>
        </nav>

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section
          style={{
            background: c.midnight,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "120px 24px 80px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Dawn glow — top */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -120,
              left: "50%",
              transform: "translateX(-50%)",
              width: 700,
              height: 400,
              background: `radial-gradient(ellipse at center, ${c.dawn}28 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          {/* Dusk glow — bottom-left */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: 0,
              left: -100,
              width: 500,
              height: 400,
              background: `radial-gradient(ellipse at center, ${c.dusk}18 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: c.dawn,
              marginBottom: 32,
              opacity: 0.9,
            }}
          >
            PERSONAL INTELLIGENCE
          </div>

          {/* Main headline */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              color: "#fff",
              maxWidth: 860,
              margin: "0 auto 24px",
            }}
          >
            She reads{" "}
            <em
              style={{
                color: c.dawn,
                fontStyle: "italic",
                fontWeight: 300,
              }}
            >
              everything.
            </em>
            <br />
            You miss{" "}
            <em
              style={{
                color: c.dawn,
                fontStyle: "italic",
                fontWeight: 300,
              }}
            >
              nothing.
            </em>
          </h1>

          {/* Sub-headline */}
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: c.mist,
              maxWidth: 520,
              margin: "0 auto 48px",
              fontWeight: 400,
            }}
          >
            One proactive briefing every morning — telling you what matters,
            what you promised, and what to do first. Delivered to Telegram
            before you open your inbox.
          </p>

          {/* CTA group */}
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <a
              href="#waitlist"
              style={{
                background: c.dawn,
                color: "#fff",
                padding: "14px 32px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "0.01em",
              }}
            >
              Join the waitlist
              <ArrowRight size={16} strokeWidth={2} />
            </a>
            <a
              href="#briefing-preview"
              style={{
                color: c.mist,
                fontSize: 14,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                letterSpacing: "0.01em",
              }}
            >
              See a sample briefing
            </a>
          </div>

          {/* Source integrations strip */}
          <div
            style={{
              marginTop: 80,
              display: "flex",
              gap: 32,
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              opacity: 0.45,
            }}
          >
            {[
              { icon: <Mail size={14} />, label: "Gmail" },
              { icon: <Calendar size={14} />, label: "Google Calendar" },
              { icon: <MessageSquare size={14} />, label: "Slack" },
              { icon: <FileText size={14} />, label: "Notion" },
              { icon: <MessageSquare size={14} />, label: "WhatsApp" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.mist,
                }}
              >
                {icon}
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            PROBLEM SECTION
        ══════════════════════════════════════ */}
        <section
          style={{
            background: c.paper,
            padding: "120px 24px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              maxWidth: 1080,
              margin: "0 auto",
            }}
          >
            {/* Section label */}
            <Reveal>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
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

            {/* Big editorial statement */}
            <div
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
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(36px, 4.5vw, 58px)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    color: c.midnight,
                    margin: 0,
                  }}
                >
                  You have{" "}
                  <em style={{ color: c.dawn, fontStyle: "italic" }}>847</em>{" "}
                  unread emails.
                  <br />
                  <em style={{ color: c.dusk, fontStyle: "italic" }}>12</em>{" "}
                  meetings today.
                  <br />
                  <em style={{ color: c.sage, fontStyle: "italic" }}>3</em>{" "}
                  forgotten promises.
                </h2>
              </Reveal>

              <Reveal delay={120}>
                <div style={{ paddingTop: 8 }}>
                  <p
                    style={{
                      fontSize: 17,
                      lineHeight: 1.8,
                      color: "#4a4a5a",
                      marginBottom: 24,
                    }}
                  >
                    And that's just what you{" "}
                    <em
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 19,
                        fontStyle: "italic",
                      }}
                    >
                      know
                    </em>{" "}
                    about. Somewhere in the noise is the email you should have
                    replied to. The commitment you made on a Tuesday call. The
                    relationship you've let drift.
                  </p>
                  <p
                    style={{
                      fontSize: 17,
                      lineHeight: 1.8,
                      color: "#4a4a5a",
                    }}
                  >
                    You're not overwhelmed because you're disorganised. You're
                    overwhelmed because{" "}
                    <strong style={{ color: c.midnight, fontWeight: 600 }}>
                      no one is watching it all for you.
                    </strong>
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Staggered problem cards */}
            <div
              style={{
                marginTop: 80,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 24,
              }}
            >
              {[
                {
                  number: "01",
                  title: "The inbox illusion",
                  body: "You achieve inbox zero at 8am. By 9am it's impossible again. The important message is buried under 40 newsletters.",
                  color: c.dawn,
                },
                {
                  number: "02",
                  title: "The commitment gap",
                  body: "\"I'll send that over tonight\" becomes a week of silence. Not because you forgot — because you had no one to remind you.",
                  color: c.dusk,
                },
                {
                  number: "03",
                  title: "The relationship drift",
                  body: "Three months pass. You realise you haven't spoken to someone important. The moment to reconnect has already cost you.",
                  color: c.sage,
                },
              ].map(({ number, title, body, color }, i) => (
                <Reveal key={number} delay={i * 80}>
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${c.stone}`,
                      borderRadius: 12,
                      padding: "32px 28px",
                      borderTop: `3px solid ${color}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        color,
                        marginBottom: 16,
                      }}
                    >
                      {number}
                    </div>
                    <h3
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 22,
                        fontWeight: 600,
                        color: c.midnight,
                        marginBottom: 12,
                        lineHeight: 1.3,
                      }}
                    >
                      {title}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: "#5a5a6e",
                      }}
                    >
                      {body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section
          id="how-it-works"
          style={{
            background: c.stone,
            padding: "120px 24px",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ marginBottom: 72, textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: c.dawn,
                    marginBottom: 20,
                  }}
                >
                  HOW IT WORKS
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(36px, 4vw, 52px)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: c.midnight,
                    margin: 0,
                  }}
                >
                  Three steps.{" "}
                  <em style={{ fontStyle: "italic", color: c.dusk }}>
                    One morning ritual.
                  </em>
                </h2>
              </div>
            </Reveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 32,
                position: "relative",
              }}
            >
              {/* Connector line */}
              <div
                aria-hidden
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
                  step: "01",
                  verb: "CONNECT",
                  headline: "She reads your entire digital life",
                  body: "Email, calendar, messages, Slack, Notion, documents. Donna reads every channel — not to judge, but to understand the full picture.",
                  icons: [
                    <Mail key="mail" size={14} />,
                    <Calendar key="cal" size={14} />,
                    <MessageSquare key="msg" size={14} />,
                    <FileText key="file" size={14} />,
                  ],
                  color: c.dawn,
                },
                {
                  step: "02",
                  verb: "UNDERSTAND",
                  headline: "She extracts what actually matters",
                  body: "Commitments you made. Relationships cooling. Priorities buried in noise. She scores, ranks, and connects the dots you didn't have time to.",
                  icons: [
                    <CheckSquare key="check" size={14} />,
                    <Users key="users" size={14} />,
                    <TrendingUp key="trend" size={14} />,
                    <Star key="star" size={14} />,
                  ],
                  color: c.dusk,
                },
                {
                  step: "03",
                  verb: "BRIEF",
                  headline: "One message. Every morning. No noise.",
                  body: "At the time you choose, Donna sends one Telegram message. Ranked priorities, due commitments, who to call, and what to do first.",
                  icons: [<Send key="send" size={14} />],
                  color: c.sage,
                },
              ].map(({ step, verb, headline, body, icons, color }, i) => (
                <Reveal key={step} delay={i * 100}>
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid rgba(27,31,58,0.08)`,
                      borderRadius: 14,
                      padding: "40px 32px",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {/* Step circle */}
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: `${color}18`,
                        border: `2px solid ${color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 28,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                          fontWeight: 500,
                          color,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {step}
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: "0.28em",
                        textTransform: "uppercase",
                        color,
                        marginBottom: 12,
                      }}
                    >
                      {verb}
                    </div>

                    <h3
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 21,
                        fontWeight: 600,
                        color: c.midnight,
                        lineHeight: 1.3,
                        marginBottom: 16,
                      }}
                    >
                      {headline}
                    </h3>

                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: "#5a5a6e",
                        marginBottom: 24,
                      }}
                    >
                      {body}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        color,
                        opacity: 0.7,
                      }}
                    >
                      {icons}
                    </div>
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
          id="briefing-preview"
          style={{
            background: c.midnight,
            padding: "120px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background texture glow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 800,
              height: 600,
              background: `radial-gradient(ellipse at center, ${c.dusk}14 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: 1080,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr",
              gap: "80px",
              alignItems: "center",
            }}
          >
            {/* Left: copy */}
            <Reveal>
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: c.dawn,
                    marginBottom: 24,
                  }}
                >
                  SAMPLE BRIEFING
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(34px, 4vw, 50px)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: "#fff",
                    marginBottom: 24,
                  }}
                >
                  Your morning edge,{" "}
                  <em style={{ fontStyle: "italic", color: c.gold }}>
                    delivered.
                  </em>
                </h2>
                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.8,
                    color: c.mist,
                    marginBottom: 32,
                  }}
                >
                  Every morning at the time you set, Donna sends one message to
                  Telegram. Not a wall of notifications — one structured
                  briefing that takes 90 seconds to read and gives you the
                  clarity to move.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {[
                    { label: "Ranked priorities", color: c.dawn },
                    { label: "Commitments due today", color: c.gold },
                    { label: "Who needs a reply", color: c.sage },
                    { label: "Meeting prep", color: c.dusk },
                  ].map(({ label, color }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, color: c.mist }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Right: mock Telegram card */}
            <Reveal delay={120}>
              <div
                style={{
                  background: "#17212B",
                  borderRadius: 18,
                  padding: "28px 28px 24px",
                  boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  maxWidth: 420,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {/* Telegram header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                    paddingBottom: 16,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${c.dawn}, ${c.dusk})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    D
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#fff",
                        lineHeight: 1,
                        marginBottom: 3,
                      }}
                    >
                      Donna
                    </div>
                    <div style={{ fontSize: 11, color: "#6c8490" }}>
                      Personal Intelligence
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: "#4a6070",
                    }}
                  >
                    7:00 AM
                  </div>
                </div>

                {/* Message bubble */}
                <div
                  style={{
                    background: "#232E3C",
                    borderRadius: 12,
                    borderTopLeftRadius: 4,
                    padding: "16px 18px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "#e0e8f0",
                      marginBottom: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    Good morning, Nazir. Here's what matters today.
                  </p>

                  <BriefingBlock
                    label="TODAY'S PRIORITIES"
                    labelColor={c.dawn}
                    items={[
                      "⚡ Reply to Ahmed re: Series A term sheet — flagged urgent",
                      "📋 Investor update draft due — you promised Sarah by EOD",
                      "📞 Call with Lara at 3pm — prep attached below",
                    ]}
                  />

                  <BriefingBlock
                    label="COMMITMENTS DUE"
                    labelColor={c.gold}
                    items={[
                      "\"I'll send the deck over\" — Khalid, 4 days ago",
                      "\"Follow up with legal on Friday\" — overdue by 1 day",
                    ]}
                  />

                  <BriefingBlock
                    label="RELATIONSHIPS COOLING"
                    labelColor={c.sage}
                    items={["Marcus Chen — no contact in 23 days (was weekly)"]}
                  />

                  <BriefingBlock
                    label="MEETING PREP — 3PM"
                    labelColor={c.dusk}
                    items={[
                      "Lara's last email: concerned about Q2 runway",
                      "Previous meeting: agreed to share revised model",
                    ]}
                  />

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 10,
                      color: "#4a6070",
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.05em",
                    }}
                  >
                    DONNA · 7 items · 3.1s
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            INTELLIGENCE PILLARS
        ══════════════════════════════════════ */}
        <section
          id="features"
          style={{
            background: c.paper,
            padding: "120px 24px",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 72 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: c.dawn,
                    marginBottom: 20,
                  }}
                >
                  WHAT SHE TRACKS
                </div>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(36px, 4vw, 52px)",
                    fontWeight: 400,
                    lineHeight: 1.15,
                    color: c.midnight,
                    margin: 0,
                  }}
                >
                  Four layers of{" "}
                  <em style={{ fontStyle: "italic", color: c.dusk }}>
                    intelligence.
                  </em>
                </h2>
              </div>
            </Reveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 24,
              }}
            >
              {[
                {
                  icon: <CheckSquare size={20} strokeWidth={1.5} />,
                  label: "COMMITMENT TRACKING",
                  headline: "Nothing you promised is ever forgotten",
                  body: "Every \"I'll send that over\", \"Let's catch up next week\", and \"I'll have it to you by Friday\" is extracted, tracked, and surfaced before it becomes a broken promise.",
                  accent: c.sage,
                  accentBg: `${c.sage}10`,
                },
                {
                  icon: <Users size={20} strokeWidth={1.5} />,
                  label: "RELATIONSHIP INTELLIGENCE",
                  headline: "Know when a relationship needs attention",
                  body: "Donna monitors contact frequency across all channels. When someone important goes quiet — or you do — she tells you before the relationship costs you.",
                  accent: c.dusk,
                  accentBg: `${c.dusk}10`,
                },
                {
                  icon: <Calendar size={20} strokeWidth={1.5} />,
                  label: "MEETING PREP",
                  headline: "Walk into every room prepared",
                  body: "Before each meeting, Donna synthesises recent email threads, past commitments, shared documents, and relationship context into a concise brief.",
                  accent: c.dawn,
                  accentBg: `${c.dawn}10`,
                },
                {
                  icon: <TrendingUp size={20} strokeWidth={1.5} />,
                  label: "PRIORITY SCORING",
                  headline: "Signal over noise, always",
                  body: "Every item in your briefing is scored across five dimensions — urgency, importance, relationship weight, time-sensitivity, and your personal patterns. The highest signal rises first.",
                  accent: c.gold,
                  accentBg: `${c.gold}18`,
                },
              ].map(
                (
                  { icon, label, headline, body, accent, accentBg },
                  i
                ) => (
                  <Reveal key={label} delay={i * 70}>
                    <div
                      style={{
                        background: "#fff",
                        border: `1px solid ${c.stone}`,
                        borderRadius: 14,
                        padding: "40px 36px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                        height: "100%",
                      }}
                    >
                      {/* Icon box */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          background: accentBg,
                          border: `1px solid ${accent}28`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: accent,
                          marginBottom: 24,
                        }}
                      >
                        {icon}
                      </div>

                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          letterSpacing: "0.22em",
                          textTransform: "uppercase",
                          color: accent,
                          marginBottom: 14,
                        }}
                      >
                        {label}
                      </div>

                      <h3
                        style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: 23,
                          fontWeight: 600,
                          color: c.midnight,
                          lineHeight: 1.25,
                          marginBottom: 16,
                        }}
                      >
                        {headline}
                      </h3>

                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.75,
                          color: "#5a5a6e",
                        }}
                      >
                        {body}
                      </p>
                    </div>
                  </Reveal>
                )
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS / SOCIAL PROOF
        ══════════════════════════════════════ */}
        <section
          style={{
            background: c.charcoal,
            padding: "100px 24px",
          }}
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "clamp(32px, 3.5vw, 46px)",
                    fontWeight: 400,
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Intelligence you can{" "}
                  <em style={{ fontStyle: "italic", color: c.gold }}>
                    measure.
                  </em>
                </h2>
              </div>
            </Reveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
              }}
            >
              {[
                {
                  value: 847,
                  suffix: "",
                  label: "commitments tracked per user",
                  accent: c.dawn,
                },
                {
                  value: 3,
                  suffix: ".2s",
                  label: "average briefing read time",
                  accent: c.gold,
                },
                {
                  value: 0,
                  suffix: "",
                  label: "missed follow-ups per month",
                  accent: c.sage,
                },
                {
                  value: 94,
                  suffix: "%",
                  label: "of users open their briefing first",
                  accent: c.dusk,
                },
              ].map(({ value, suffix, label, accent }, i) => (
                <Reveal key={label} delay={i * 80}>
                  <div
                    style={{
                      padding: "48px 32px",
                      textAlign: "center",
                      borderRight:
                        i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: "clamp(42px, 4vw, 58px)",
                        fontWeight: 300,
                        color: accent,
                        lineHeight: 1,
                        marginBottom: 12,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      <Counter target={value} suffix={suffix} />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: c.mist,
                        lineHeight: 1.5,
                        maxWidth: 140,
                        margin: "0 auto",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            PHILOSOPHY / MANIFESTO STRIP
        ══════════════════════════════════════ */}
        <section
          style={{
            background: c.paper,
            padding: "100px 24px",
            borderTop: `1px solid ${c.stone}`,
            borderBottom: `1px solid ${c.stone}`,
          }}
        >
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <Reveal>
              <blockquote
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(26px, 3.5vw, 40px)",
                  fontWeight: 300,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  color: c.midnight,
                  margin: 0,
                  letterSpacing: "-0.005em",
                }}
              >
                "The best executive assistant you ever had didn't wait to be
                asked. She read everything on your desk and told you what needed
                your attention before you knew to look."
              </blockquote>
              <p
                style={{
                  marginTop: 32,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: c.mist,
                }}
              >
                THAT'S DONNA.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA / WAITLIST
        ══════════════════════════════════════ */}
        <section
          id="waitlist"
          style={{
            background: c.midnight,
            padding: "120px 24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Dawn glow top */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -80,
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 300,
              background: `radial-gradient(ellipse at center, ${c.dawn}20 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          <Reveal>
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: c.dawn,
                  marginBottom: 24,
                }}
              >
                EARLY ACCESS
              </div>

              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(40px, 6vw, 72px)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  color: "#fff",
                  margin: "0 auto 24px",
                  maxWidth: 680,
                  letterSpacing: "-0.01em",
                }}
              >
                Your morning edge{" "}
                <em style={{ fontStyle: "italic", color: c.gold }}>
                  starts here.
                </em>
              </h2>

              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: c.mist,
                  maxWidth: 460,
                  margin: "0 auto 52px",
                }}
              >
                Donna is in private beta. Join the waitlist and we'll let you
                know when your spot opens.
              </p>

              {submitted ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    background: `${c.sage}18`,
                    border: `1px solid ${c.sage}40`,
                    borderRadius: 10,
                    padding: "16px 28px",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.sage,
                    }}
                  />
                  <span
                    style={{
                      color: c.sage,
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.05em",
                    }}
                  >
                    You're on the list. We'll be in touch.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                    flexWrap: "wrap",
                    maxWidth: 480,
                    margin: "0 auto",
                  }}
                >
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 240,
                      padding: "14px 18px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: c.dawn,
                      color: "#fff",
                      border: "none",
                      padding: "14px 28px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      letterSpacing: "0.01em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Join waitlist
                    <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </form>
              )}

              <p
                style={{
                  marginTop: 20,
                  fontSize: 12,
                  color: "#4a6080",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em",
                }}
              >
                NO SPAM. EARLY ACCESS ONLY.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer
          style={{
            background: c.deep,
            padding: "48px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 20,
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "0.02em",
              }}
            >
              Donna
            </span>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "#3a4060",
                marginTop: 6,
                textTransform: "uppercase",
              }}
            >
              PERSONAL INTELLIGENCE
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 32,
              flexWrap: "wrap",
            }}
          >
            {["Privacy", "Terms", "Security"].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#3a4060",
                  textDecoration: "none",
                }}
              >
                {item}
              </a>
            ))}
          </div>

          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "#2a3050",
              textTransform: "uppercase",
            }}
          >
            © 2026 DONNA
          </p>
        </footer>
      </main>
    </>
  );
}

/* ─────────────────────────────────────────────
   Telegram briefing block sub-component
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
          fontFamily: "'JetBrains Mono', monospace",
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
