"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ─── Scroll reveal ─── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Font tokens ─── */
const serif = "'Playfair Display', Georgia, serif";
const sans = "'Inter', sans-serif";

/* ─── Color tokens ─── */
const c = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceRaised: "#F2F2EF",
  border: "rgba(120,110,80,0.1)",
  borderHover: "rgba(120,110,80,0.22)",
  dawn: "#8C7A4A",
  dawnSubtle: "rgba(140,122,74,0.06)",
  text: "#1A1917",
  textSecondary: "#3D3C37",
  textTertiary: "#6E6D65",
  textQuaternary: "#9C9B93",
  textGhost: "#C8C7C0",
};

export default function PrivateOfficeLanding() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: sans,
        background: c.bg,
        color: c.text,
      }}
    >
      {/* Subtle warm horizontal rules — like premium stationery */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.035,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(120,110,80,0.15) 0px, rgba(120,110,80,0.15) 1px, transparent 1px, transparent 160px)",
        }}
      />

      <div className="relative z-[1]">
        {/* ─── Back to showcase ─── */}
        <div
          className="fixed top-6 left-6 z-50"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 1s",
          }}
        >
          <Link
            href="/showcase"
            className="flex items-center gap-2 text-[11px] font-medium px-3.5 py-2 rounded-full transition-all"
            style={{
              border: `1px solid ${c.border}`,
              color: c.textTertiary,
              background: "rgba(250,250,248,0.9)",
              backdropFilter: "blur(12px)",
            }}
          >
            <ArrowLeft size={12} />
            Showcase
          </Link>
        </div>

        {/* ─── Navigation ─── */}
        <nav
          className="fixed top-0 left-0 right-0 z-40"
          style={{
            borderBottom: `1px solid ${c.border}`,
            background: "rgba(250,250,248,0.85)",
            backdropFilter: "blur(16px)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-100%)",
            transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
          }}
        >
          <div className="mx-auto max-w-7xl px-8 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold"
                style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.dawn }}
              >
                CS
              </div>
              <span className="text-[15px] font-semibold tracking-[0.01em]" style={{ fontFamily: serif }}>Donna</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {["Features", "How it works", "Pricing"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="text-[13px] px-4 py-2 rounded-lg transition-colors hover:text-[#1A1917]"
                  style={{ color: c.textTertiary }}
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                className="text-[13px] font-medium px-4 py-2 transition-colors"
                style={{ color: c.textSecondary }}
              >
                Sign in
              </button>
              <button
                className="text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-all hover:opacity-90"
                style={{ background: c.text, color: "#FAFAF8" }}
              >
                Get early access
              </button>
            </div>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <section className="pt-[160px] pb-[120px] px-8 overflow-hidden">
          <div className="mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-10 items-center">
              {/* Left: Copy */}
              <div>
                {/* Badge */}
                <div
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(8px)",
                    transition: "opacity 0.7s ease 0.25s, transform 0.7s ease 0.25s",
                  }}
                >
                  <div
                    className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-medium tracking-wide mb-12"
                    style={{
                      border: `1px solid ${c.border}`,
                      color: c.dawn,
                      background: c.dawnSubtle,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dawn }} />
                    Private beta — accepting applications
                  </div>
                </div>

                {/* Headline */}
                <h1
                  className="text-[42px] sm:text-[54px] lg:text-[66px] font-bold leading-[1.02] tracking-[-0.02em] mb-8"
                  style={{
                    fontFamily: serif,
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(20px)",
                    transition: "opacity 0.9s ease 0.35s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s",
                  }}
                >
                  Your entire day,<br />
                  <span className="italic">distilled.</span>
                </h1>

                {/* Subhead */}
                <p
                  className="text-[17px] leading-[1.75] max-w-[480px] mb-12"
                  style={{
                    color: c.textTertiary,
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(14px)",
                    transition: "opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s",
                  }}
                >
                  Donna reads your email, calendar, messages, and
                  documents overnight — then delivers one morning briefing
                  with exactly what matters, what you promised, and what to
                  do first.
                </p>

                {/* CTAs */}
                <div
                  className="flex flex-col sm:flex-row items-start gap-4"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 0.7s ease 0.6s, transform 0.7s ease 0.6s",
                  }}
                >
                  <button
                    className="text-[14px] font-semibold px-7 py-3.5 rounded-xl flex items-center gap-2.5 transition-all hover:opacity-90"
                    style={{ background: c.text, color: "#FAFAF8" }}
                  >
                    Request early access
                    <ArrowRight size={15} />
                  </button>
                  <button
                    className="text-[14px] font-medium px-7 py-3.5 rounded-xl transition-all"
                    style={{ border: `1px solid ${c.border}`, color: c.textSecondary }}
                  >
                    See how it works
                  </button>
                </div>
              </div>

              {/* Right: Visual — chaos → clarity composition */}
              <div
                className="relative hidden lg:block"
                style={{
                  height: 520,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(24px)",
                  transition: "opacity 1s ease 0.5s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.5s",
                }}
              >
                {/* ── Background layer: scattered source fragments (the noise) ── */}

                {/* Email fragment */}
                <div
                  className="absolute rounded-xl px-5 py-4"
                  style={{
                    top: 10,
                    right: 40,
                    width: 260,
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    transform: "rotate(3deg)",
                    opacity: mounted ? 0.55 : 0,
                    transition: "opacity 1.2s ease 0.7s",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-5 w-5 rounded-full" style={{ background: "rgba(232,132,92,0.08)" }} />
                    <div>
                      <div className="h-2 w-20 rounded" style={{ background: "rgba(26,25,23,0.1)" }} />
                      <div className="h-1.5 w-14 rounded mt-1" style={{ background: "rgba(26,25,23,0.05)" }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded" style={{ background: "rgba(26,25,23,0.06)" }} />
                    <div className="h-1.5 w-[85%] rounded" style={{ background: "rgba(26,25,23,0.05)" }} />
                    <div className="h-1.5 w-[60%] rounded" style={{ background: "rgba(26,25,23,0.04)" }} />
                  </div>
                </div>

                {/* Calendar fragment */}
                <div
                  className="absolute rounded-xl px-4 py-3"
                  style={{
                    top: 50,
                    left: -10,
                    width: 200,
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    transform: "rotate(-2deg)",
                    opacity: mounted ? 0.5 : 0,
                    transition: "opacity 1.2s ease 0.85s",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded" style={{ background: "rgba(232,132,92,0.12)" }} />
                    <div className="h-2 w-16 rounded" style={{ background: "rgba(26,25,23,0.08)" }} />
                  </div>
                  <div className="space-y-2">
                    {[0.1, 0.08, 0.06].map((op, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-6 w-1 rounded-full" style={{ background: i === 0 ? "rgba(140,122,74,0.2)" : `rgba(26,25,23,${op})` }} />
                        <div>
                          <div className="h-1.5 rounded" style={{ background: `rgba(26,25,23,${op + 0.02})`, width: `${80 - i * 15}px` }} />
                          <div className="h-1 rounded mt-1" style={{ background: `rgba(26,25,23,${op * 0.5})`, width: `${50 - i * 8}px` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slack fragment */}
                <div
                  className="absolute rounded-xl px-4 py-3"
                  style={{
                    bottom: 40,
                    right: 20,
                    width: 220,
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    transform: "rotate(1.5deg)",
                    opacity: mounted ? 0.45 : 0,
                    transition: "opacity 1.2s ease 0.95s",
                  }}
                >
                  <div className="space-y-2.5">
                    {[1, 2].map((_, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="h-4 w-4 rounded shrink-0 mt-0.5" style={{ background: `rgba(26,25,23,${0.08 - i * 0.02})` }} />
                        <div className="space-y-1">
                          <div className="h-1.5 rounded" style={{ background: `rgba(26,25,23,${0.09 - i * 0.02})`, width: `${140 - i * 30}px` }} />
                          <div className="h-1.5 rounded" style={{ background: `rgba(26,25,23,${0.06 - i * 0.01})`, width: `${100 - i * 20}px` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document fragment */}
                <div
                  className="absolute rounded-xl px-4 py-3"
                  style={{
                    bottom: 100,
                    left: 30,
                    width: 180,
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    transform: "rotate(-3.5deg)",
                    opacity: mounted ? 0.4 : 0,
                    transition: "opacity 1.2s ease 1.05s",
                  }}
                >
                  <div className="space-y-1.5 mb-2.5">
                    <div className="h-2 w-[70%] rounded" style={{ background: "rgba(26,25,23,0.06)" }} />
                    <div className="h-px w-full" style={{ background: "rgba(26,25,23,0.04)" }} />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded" style={{ background: "rgba(26,25,23,0.05)" }} />
                    <div className="h-1.5 w-[90%] rounded" style={{ background: "rgba(26,25,23,0.04)" }} />
                    <div className="h-1.5 w-[75%] rounded" style={{ background: "rgba(26,25,23,0.03)" }} />
                    <div className="h-1.5 w-[85%] rounded" style={{ background: "rgba(26,25,23,0.025)" }} />
                  </div>
                </div>

                {/* ── Foreground: the distilled briefing card (the signal) ── */}
                <div
                  className="absolute rounded-2xl overflow-hidden"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) ${mounted ? "scale(1)" : "scale(0.96)"}`,
                    width: 320,
                    background: c.surface,
                    border: `1px solid rgba(232,132,92,0.12)`,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.08), 0 0 0 1px rgba(120,110,80,0.06)",
                    zIndex: 2,
                    opacity: mounted ? 1 : 0,
                    transition: "opacity 0.8s ease 1.1s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 1.1s",
                  }}
                >
                  {/* Card header */}
                  <div
                    className="px-5 py-4 flex items-center gap-3"
                    style={{ borderBottom: `1px solid ${c.border}` }}
                  >
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ background: c.dawnSubtle, color: c.dawn, border: `1px solid ${c.border}` }}
                    >
                      CS
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: c.text }}>Morning Briefing</p>
                      <p className="text-[10px]" style={{ color: c.textGhost }}>Thu 7:00 AM</p>
                    </div>
                  </div>

                  {/* Briefing items */}
                  <div className="p-4 space-y-2.5">
                    {/* Critical */}
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(232,132,92,0.04)",
                        borderLeft: `2px solid ${c.dawn}`,
                      }}
                    >
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: c.dawn }}>
                        Critical
                      </p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: c.textSecondary }}>
                        Board deck feedback due to Sarah by EOD
                      </p>
                      <p className="text-[9px] mt-1.5" style={{ color: c.textGhost }}>
                        Gmail &mdash; 2 messages
                      </p>
                    </div>

                    {/* Meeting */}
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(26,25,23,0.015)",
                        borderLeft: `2px solid ${c.textQuaternary}`,
                      }}
                    >
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: c.textQuaternary }}>
                        Meeting prep
                      </p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: c.textTertiary }}>
                        1:1 with David at 10am. 12 days since last contact.
                      </p>
                      <p className="text-[9px] mt-1.5" style={{ color: c.textGhost }}>
                        Calendar + Slack
                      </p>
                    </div>

                    {/* Cold */}
                    <div
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: "rgba(26,25,23,0.01)",
                        borderLeft: `2px solid ${c.textGhost}`,
                      }}
                    >
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: c.textGhost }}>
                        Going cold
                      </p>
                      <p className="text-[12px] leading-[1.5]" style={{ color: c.textQuaternary }}>
                        Alex K. waiting 9 days on partnership terms
                      </p>
                      <p className="text-[9px] mt-1.5" style={{ color: c.textGhost }}>
                        Gmail
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subtle connecting lines from fragments toward center card */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    zIndex: 1,
                    opacity: mounted ? 0.12 : 0,
                    transition: "opacity 1.5s ease 1.3s",
                  }}
                >
                  {/* Top-right email → center */}
                  <line x1="82%" y1="12%" x2="58%" y2="38%" stroke="#E8845C" strokeWidth="0.5" strokeDasharray="3 6" />
                  {/* Top-left calendar → center */}
                  <line x1="22%" y1="18%" x2="42%" y2="40%" stroke="#E8845C" strokeWidth="0.5" strokeDasharray="3 6" />
                  {/* Bottom-right slack → center */}
                  <line x1="78%" y1="85%" x2="58%" y2="62%" stroke="#E8845C" strokeWidth="0.5" strokeDasharray="3 6" />
                  {/* Bottom-left doc → center */}
                  <line x1="25%" y1="80%" x2="42%" y2="62%" stroke="#E8845C" strokeWidth="0.5" strokeDasharray="3 6" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Trust markers ─── */}
        <Reveal>
          <section style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
            <div className="mx-auto max-w-7xl px-8 py-8 flex flex-wrap items-center justify-start gap-x-14 gap-y-4">
              {[
                "Built for the C-suite",
                "SOC 2 compliant",
                "End-to-end encrypted",
                "Zero data selling",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check size={13} style={{ color: c.dawn }} />
                  <span className="text-[13px]" style={{ color: c.textQuaternary }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ─── What it does (editorial layout) ─── */}
        <section className="py-[140px] px-8" id="features">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid lg:grid-cols-[1fr_2fr] gap-20 mb-[100px]">
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.25em] font-semibold"
                    style={{ color: c.dawn }}
                  >
                    What it does
                  </p>
                </div>
                <div>
                  <h2
                    className="text-[40px] sm:text-[52px] font-bold tracking-[-0.015em] leading-[1.08]"
                    style={{ fontFamily: serif }}
                  >
                    Intelligence,
                    <br />
                    <span style={{ color: c.textQuaternary }}>not information.</span>
                  </h2>
                </div>
              </div>
            </Reveal>

            {/* Feature rows */}
            <div className="space-y-0">
              {[
                {
                  num: "01",
                  title: "Daily Briefing",
                  text: "One morning message with everything ranked by what actually matters to you. No app to open, no inbox to scan. Delivered to Telegram at the time you choose.",
                },
                {
                  num: "02",
                  title: "Commitment Tracking",
                  text: "Every promise you made — or that was made to you — extracted from conversations, tracked with source citations, and surfaced before deadlines pass.",
                },
                {
                  num: "03",
                  title: "Relationship Radar",
                  text: "Know who you've gone cold with before it becomes a problem. Get nudges to maintain the connections that matter most to your work and reputation.",
                },
                {
                  num: "04",
                  title: "Meeting Prep",
                  text: "Walk into every meeting already briefed: who's attending, your last interaction, open commitments, pending items, and relevant context from your documents.",
                },
                {
                  num: "05",
                  title: "Smart Replies",
                  text: "One-tap reply drafts written in your voice. Review, edit, send — or discard. You're always in control. Nothing sends without your approval.",
                },
                {
                  num: "06",
                  title: "Privacy Architecture",
                  text: "End-to-end encryption. OAuth tokens in a dedicated vault. Zero data selling. Optional local-only mode for maximum confidentiality. Your data is yours.",
                },
              ].map((feature, i) => (
                <Reveal key={feature.num} delay={i * 0.04}>
                  <div
                    className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 py-10 group"
                    style={{ borderTop: `1px solid ${c.border}` }}
                  >
                    <div className="flex items-baseline gap-6">
                      <span
                        className="text-[13px] tabular-nums font-semibold transition-colors duration-300 group-hover:text-[#8C7A4A]"
                        style={{ color: c.textGhost }}
                      >
                        {feature.num}
                      </span>
                      <h3
                        className="text-[20px] font-semibold tracking-[-0.005em]"
                        style={{ color: c.text, fontFamily: serif }}
                      >
                        {feature.title}
                      </h3>
                    </div>
                    <p
                      className="text-[15px] leading-[1.8] max-w-xl"
                      style={{ color: c.textTertiary }}
                    >
                      {feature.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section
          className="py-[140px] px-8"
          id="how-it-works"
          style={{ background: c.surface }}
        >
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid lg:grid-cols-[1fr_2fr] gap-20 mb-[80px]">
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.25em] font-semibold"
                    style={{ color: c.dawn }}
                  >
                    How it works
                  </p>
                </div>
                <div>
                  <h2
                    className="text-[40px] sm:text-[52px] font-bold tracking-[-0.015em] leading-[1.08]"
                    style={{ fontFamily: serif }}
                  >
                    Three steps.
                    <br />
                    <span style={{ color: c.textQuaternary }}>Zero effort.</span>
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="grid lg:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Connect",
                  text: "Link Gmail, Calendar, Slack, Notion, and more. OAuth only — we never see your passwords. Tokens stored in an enterprise-grade vault.",
                },
                {
                  step: "02",
                  title: "Process",
                  text: "Our Heartbeat Monitor scans new content overnight. Commitments extracted, contacts scored, priorities ranked. All before you wake up.",
                },
                {
                  step: "03",
                  title: "Brief",
                  text: "One Telegram message at your preferred time. What's critical, who needs a response, what you promised. Tap to act on anything instantly.",
                },
              ].map((item, i) => (
                <Reveal key={item.step} delay={i * 0.1}>
                  <div
                    className="rounded-2xl p-8 h-full"
                    style={{
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    <span
                      className="text-[11px] uppercase tracking-[0.2em] font-bold block mb-8"
                      style={{ color: c.dawn }}
                    >
                      Step {item.step}
                    </span>
                    <h3
                      className="text-[28px] font-bold tracking-[-0.01em] mb-4"
                      style={{ color: c.text, fontFamily: serif }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-[14px] leading-[1.75]"
                      style={{ color: c.textTertiary }}
                    >
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Briefing preview ─── */}
        <section className="py-[140px] px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <Reveal>
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.25em] font-semibold mb-8"
                    style={{ color: c.dawn }}
                  >
                    Your morning briefing
                  </p>
                  <h2
                    className="text-[40px] sm:text-[48px] font-bold tracking-[-0.01em] leading-[1.1] mb-8"
                    style={{ fontFamily: serif }}
                  >
                    This is what
                    <br />
                    7am looks like.
                  </h2>
                  <p
                    className="text-[15px] leading-[1.8] max-w-md mb-10"
                    style={{ color: c.textTertiary }}
                  >
                    A single message. Ranked by urgency. Every claim cited to its source.
                    Tap any item to act on it. No app required — it comes to you.
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: c.dawn }}
                    />
                    <span className="text-[13px]" style={{ color: c.textTertiary }}>
                      Delivered via Telegram at the time you set
                    </span>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.15}>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  {/* Briefing header */}
                  <div
                    className="px-7 py-5 flex items-center gap-3.5"
                    style={{ borderBottom: `1px solid ${c.border}` }}
                  >
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: c.dawnSubtle, color: c.dawn, border: `1px solid ${c.border}` }}
                    >
                      CS
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold">Morning Briefing</p>
                      <p className="text-[11px]" style={{ color: c.textQuaternary }}>
                        Thursday, 7:00 AM
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-5 space-y-3">
                    <div
                      className="rounded-xl px-5 py-4"
                      style={{
                        background: "rgba(232,132,92,0.04)",
                        borderLeft: `2px solid ${c.dawn}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: c.dawn }}
                        >
                          Critical
                        </span>
                      </div>
                      <p className="text-[14px] leading-[1.6]" style={{ color: c.textSecondary }}>
                        Board deck feedback due to Sarah by EOD. She followed up yesterday at 4pm.
                      </p>
                      <p className="text-[11px] mt-2.5" style={{ color: c.textGhost }}>
                        Source: Gmail &mdash; 2 messages
                      </p>
                    </div>

                    <div
                      className="rounded-xl px-5 py-4"
                      style={{
                        background: "rgba(26,25,23,0.015)",
                        borderLeft: `2px solid ${c.textQuaternary}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: c.textQuaternary }}
                        >
                          Meeting Prep
                        </span>
                      </div>
                      <p className="text-[14px] leading-[1.6]" style={{ color: c.textTertiary }}>
                        1:1 with David Kim at 10am. Last spoke 12 days ago. Open commitment: hiring plan timeline.
                      </p>
                      <p className="text-[11px] mt-2.5" style={{ color: c.textGhost }}>
                        Source: Calendar + Slack
                      </p>
                    </div>

                    <div
                      className="rounded-xl px-5 py-4"
                      style={{
                        background: "rgba(26,25,23,0.01)",
                        borderLeft: `2px solid ${c.textGhost}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: c.textGhost }}
                        >
                          Going cold
                        </span>
                      </div>
                      <p className="text-[14px] leading-[1.6]" style={{ color: c.textQuaternary }}>
                        Haven&apos;t responded to Alex K. in 9 days. He asked about partnership terms.
                      </p>
                      <p className="text-[11px] mt-2.5" style={{ color: c.textGhost }}>
                        Source: Gmail
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─── Quote ─── */}
        <Reveal>
          <section
            className="py-[120px] px-8"
            style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}
          >
            <div className="mx-auto max-w-4xl">
              <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
                <div>
                  <div className="mb-4">
                    <p className="text-[15px] font-semibold" style={{ color: c.text }}>
                      Sarah Chen
                    </p>
                    <p className="text-[13px]" style={{ color: c.textQuaternary }}>
                      CEO, Series B Fintech
                    </p>
                  </div>
                </div>
                <blockquote>
                  <p
                    className="text-[28px] sm:text-[36px] font-medium leading-[1.4] tracking-[-0.005em] italic"
                    style={{ color: c.textSecondary, fontFamily: serif }}
                  >
                    &ldquo;I used to spend the first hour of every day triaging. Now I wake up and know exactly what matters. It&apos;s like having a real chief of staff.&rdquo;
                  </p>
                </blockquote>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ─── Pricing ─── */}
        <section className="py-[140px] px-8" id="pricing">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="grid lg:grid-cols-[1fr_2fr] gap-20 mb-[80px]">
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.25em] font-semibold"
                    style={{ color: c.dawn }}
                  >
                    Pricing
                  </p>
                </div>
                <div>
                  <h2
                    className="text-[40px] sm:text-[52px] font-bold tracking-[-0.015em] leading-[1.08]"
                    style={{ fontFamily: serif }}
                  >
                    One plan.
                    <br />
                    <span style={{ color: c.textQuaternary }}>No surprises.</span>
                  </h2>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="grid lg:grid-cols-[1fr_2fr] gap-20">
                <div />
                <div
                  className="rounded-2xl p-10 sm:p-14"
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className="text-[56px] font-bold tracking-[-0.02em]"
                      style={{ color: c.text, fontFamily: serif }}
                    >
                      $49
                    </span>
                    <span className="text-[16px]" style={{ color: c.textQuaternary }}>
                      / month
                    </span>
                  </div>
                  <p
                    className="text-[15px] leading-[1.7] mb-10 max-w-md"
                    style={{ color: c.textTertiary }}
                  >
                    Everything included. All integrations, unlimited briefings,
                    commitment tracking, relationship intelligence, meeting prep,
                    and priority support.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start gap-4 mb-10">
                    <button
                      className="text-[14px] font-semibold px-7 py-3.5 rounded-xl transition-all hover:opacity-90"
                      style={{ background: c.text, color: "#FAFAF8" }}
                    >
                      Start 14-day free trial
                    </button>
                  </div>

                  <p className="text-[12px] mb-8" style={{ color: c.textGhost }}>
                    No credit card required
                  </p>

                  <div
                    className="pt-8 grid sm:grid-cols-2 gap-3"
                    style={{ borderTop: `1px solid ${c.border}` }}
                  >
                    {[
                      "All integrations",
                      "Unlimited daily briefings",
                      "Commitment tracking",
                      "Relationship radar",
                      "Meeting prep briefs",
                      "Smart reply drafts",
                      "Telegram & WhatsApp",
                      "Priority support",
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-2.5">
                        <Check size={12} style={{ color: c.dawn }} />
                        <span className="text-[13px]" style={{ color: c.textTertiary }}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-[160px] px-8" style={{ background: c.surface }}>
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <h2
                className="text-[44px] sm:text-[60px] font-bold tracking-[-0.015em] leading-[1.05] mb-8"
                style={{ fontFamily: serif }}
              >
                Stop managing
                <br />
                your day.
                <br />
                <span style={{ color: c.textQuaternary }}>Start leading it.</span>
              </h2>
              <p
                className="text-[17px] leading-[1.7] mb-12 max-w-md"
                style={{ color: c.textTertiary }}
              >
                Join the private beta and reclaim your first hour.
                Your mornings are about to change.
              </p>
              <button
                className="text-[14px] font-semibold px-8 py-4 rounded-xl flex items-center gap-2.5 transition-all hover:opacity-90"
                style={{ background: c.text, color: "#FAFAF8" }}
              >
                Request early access
                <ArrowRight size={15} />
              </button>
            </div>
          </Reveal>
        </section>

        {/* ─── Footer ─── */}
        <footer style={{ borderTop: `1px solid ${c.border}` }}>
          <div className="mx-auto max-w-7xl px-8">
            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-14">
              {[
                { label: "Product", links: ["Features", "Pricing", "Security", "Changelog"] },
                { label: "Resources", links: ["Documentation", "Blog", "API Reference", "Status"] },
                { label: "Company", links: ["About", "Careers", "Contact", "Press"] },
                { label: "Legal", links: ["Privacy", "Terms", "DPA", "Cookie Policy"] },
              ].map((col) => (
                <div key={col.label}>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.15em] mb-5"
                    style={{ color: c.textGhost }}
                  >
                    {col.label}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-[13px] transition-colors hover:text-[#3D3C37]"
                          style={{ color: c.textQuaternary }}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8"
              style={{ borderTop: `1px solid ${c.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-6 w-6 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.dawn }}
                >
                  CS
                </div>
                <span className="text-[12px]" style={{ color: c.textGhost }}>
                  Donna Inc.
                </span>
              </div>
              <p className="text-[11px]" style={{ color: c.textGhost }}>
                &copy; 2026 Donna. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
