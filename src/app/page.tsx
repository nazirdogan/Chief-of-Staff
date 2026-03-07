"use client";

import Link from "next/link";
import {
  ArrowRight,
  Play,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  CheckCircle2,
  Zap,
  Shield,
  Eye,
  Brain,
  Clock,
  Users,
  TrendingUp,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DotGlobeHero } from "@/components/ui/globe-hero";

/* ── Dark theme color tokens ── */
const c = {
  bg: "#0A0A0B",
  bgSubtle: "#0F0F11",
  surface: "rgba(255,255,255,0.04)",
  surfaceHover: "rgba(255,255,255,0.07)",
  surfaceRaised: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  borderBrass: "rgba(168,153,104,0.25)",
  brass: "#A89968",
  brassLight: "#C4B682",
  brassMuted: "rgba(168,153,104,0.15)",
  brassGlow: "rgba(168,153,104,0.06)",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.85)",
  textTertiary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  textGhost: "rgba(255,255,255,0.2)",
};

/* ── Scroll-triggered reveal ── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "scale";
}) {
  const { ref, inView } = useInView();
  const transforms: Record<string, string> = {
    up: "translateY(40px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
    scale: "scale(0.95)",
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : transforms[direction],
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Animated counter ── */
function Counter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const { ref, inView } = useInView();
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (!inView) return;
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    const duration = 1800;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = eased * num;
      if (value.includes(".")) {
        setDisplay(current.toFixed(2));
      } else {
        setDisplay(Math.floor(current).toLocaleString());
      }
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);
  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export default function SignalLanding() {
  const [mounted, setMounted] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional hydration guard
  }, []);

  return (
    <> {/* eslint-disable @next/next/no-page-custom-font */}
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800,900&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&display=swap"
        rel="stylesheet"
      />
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: c.bg,
        color: c.text,
      }}
    >
      {/* ── Global atmospheric layers ── */}
      {/* Subtle grid texture */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          opacity: 0.03,
          backgroundImage:
            "linear-gradient(rgba(168,153,104,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,153,104,0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Top glow orb */}
      <div
        className="fixed top-0 left-0 right-0 h-screen pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute"
          style={{
            top: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1000px",
            height: "800px",
            background:
              "radial-gradient(ellipse at center, rgba(168,153,104,0.07) 0%, rgba(168,153,104,0.02) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "30%",
            right: "-15%",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(168,153,104,0.03) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative z-[2]">
        {/* ═══════════════════════════════════════════ */}
        {/* ── Navigation ── */}
        {/* ═══════════════════════════════════════════ */}
        <nav
          className="fixed top-0 left-0 right-0 z-40"
          style={{
            borderBottom: `1px solid ${c.border}`,
            background: "rgba(10,10,11,0.7)",
            backdropFilter: "blur(24px)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.1s",
          }}
        >
          <div className="mx-auto max-w-7xl px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black tracking-tight"
                    style={{
                      background: "#FFFFFF",
                      color: "#0A0A0B",
                    }}
                  >
                    CS
                  </div>
                </div>
                <span
                  className="text-[15px] font-bold tracking-[-0.02em]"
                  style={{ color: "#FFFFFF" }}
                >
                  Chief of Staff
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-1">
                {["Product", "Use Cases", "Pricing", "Security", "Blog"].map(
                  (item) => (
                    <a
                      key={item}
                      href="#"
                      className="text-[13px] px-3.5 py-2 rounded-lg transition-all duration-300 hover:bg-[rgba(255,255,255,0.06)]"
                      style={{ color: c.textTertiary }}
                    >
                      {item}
                    </a>
                  )
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-[13px] px-3.5 py-2 rounded-lg transition-all duration-300 hover:bg-[rgba(255,255,255,0.06)]"
                style={{ color: c.textSecondary }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-all duration-300 hover:shadow-[0_2px_12px_rgba(168,153,104,0.25)]"
                style={{
                  background: c.brass,
                  color: c.bg,
                }}
              >
                Get early access
              </Link>
            </div>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Hero with Globe ── */}
        {/* ═══════════════════════════════════════════ */}
        <DotGlobeHero
          rotationSpeed={0.003}
          globeRadius={1.4}
          className="pt-44 pb-8 px-8"
          style={{
            background: c.bg,
          }}
        >
          {/* Subtle decorative line from top */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-[20]"
            style={{
              width: "1px",
              height: "120px",
              background: `linear-gradient(180deg, ${c.brassLight} 0%, transparent 100%)`,
              opacity: mounted ? 0.35 : 0,
              transition: "opacity 1.2s ease 0.5s",
            }}
          />
          <div
            className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none z-[20]"
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: c.brassLight,
              boxShadow: "0 0 12px rgba(168,153,104,0.5)",
              opacity: mounted ? 0.6 : 0,
              transition: "opacity 1.2s ease 0.6s",
            }}
          />

          <div className="mx-auto max-w-7xl">
            {/* System status indicator */}
            <div
              className="flex items-center justify-center gap-3 mb-14"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "none" : "translateY(10px)",
                transition:
                  "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: c.brassLight }}
                  />
                  <div
                    className="absolute inset-0 h-1.5 w-1.5 rounded-full"
                    style={{
                      background: c.brassLight,
                      animation: "pulse-ring 2s ease-out infinite",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: c.brassLight }}
                >
                  System Status: Active
                </span>
              </div>
              <span
                className="h-px w-8"
                style={{ background: c.border }}
              />
              <span
                className="text-[11px] tracking-wide"
                style={{ color: c.textMuted }}
              >
                Now accepting early access
              </span>
            </div>

            {/* Main headline */}
            <div className="text-center max-w-5xl mx-auto">
              <h1
                className="text-5xl sm:text-7xl lg:text-[88px] font-black tracking-[-0.045em] leading-[0.95] mb-10"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "none" : "translateY(32px)",
                  transition:
                    "opacity 1s ease 0.4s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.4s",
                }}
              >
                <span style={{ color: c.text }}>
                  Navigate your
                </span>
                <br />
                <span className="relative inline-block" style={{ color: c.brassLight }}>
                  digital life
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 280 10"
                    fill="none"
                    preserveAspectRatio="none"
                    style={{
                      height: "8px",
                      opacity: mounted ? 0.5 : 0,
                      transition: "opacity 1s ease 1.2s",
                    }}
                  >
                    <path
                      d="M2 7C50 2 120 1 140 4C180 7 230 3 278 5"
                      stroke={c.brassLight}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <br />
                <span style={{ color: c.textMuted }}>
                  with intelligence.
                </span>
              </h1>

              <div
                className="mx-auto mb-10"
                style={{
                  maxWidth: "480px",
                  height: "1px",
                  background: `linear-gradient(90deg, transparent 0%, rgba(168,153,104,0.15) 20%, ${c.brass} 50%, rgba(168,153,104,0.15) 80%, transparent 100%)`,
                  opacity: mounted ? 0.5 : 0,
                  transition: "opacity 1s ease 0.8s",
                }}
              />

              <p
                className="text-lg sm:text-xl max-w-2xl mx-auto leading-[1.7] mb-14"
                style={{
                  color: c.textTertiary,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "none" : "translateY(20px)",
                  transition:
                    "opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s",
                }}
              >
                Chief of Staff reads across your entire digital world — email,
                calendar, messages, documents — and delivers one proactive
                briefing every morning telling you{" "}
                <span
                  className="relative inline"
                  style={{ color: c.text, fontWeight: 600 }}
                >
                  what matters
                  <span
                    className="absolute bottom-0 left-0 w-full"
                    style={{
                      height: "6px",
                      background: "linear-gradient(90deg, rgba(168,153,104,0.25), rgba(168,153,104,0.08))",
                      borderRadius: "2px",
                      bottom: "1px",
                    }}
                  />
                </span>
                ,{" "}
                <span
                  className="relative inline"
                  style={{ color: c.text, fontWeight: 600 }}
                >
                  what you promised
                  <span
                    className="absolute bottom-0 left-0 w-full"
                    style={{
                      height: "6px",
                      background: "linear-gradient(90deg, rgba(168,153,104,0.25), rgba(168,153,104,0.08))",
                      borderRadius: "2px",
                      bottom: "1px",
                    }}
                  />
                </span>
                , and{" "}
                <span
                  className="relative inline"
                  style={{ color: c.text, fontWeight: 600 }}
                >
                  what to do first
                  <span
                    className="absolute bottom-0 left-0 w-full"
                    style={{
                      height: "6px",
                      background: "linear-gradient(90deg, rgba(168,153,104,0.25), rgba(168,153,104,0.08))",
                      borderRadius: "2px",
                      bottom: "1px",
                    }}
                  />
                </span>
                .
              </p>

              {/* Email CTA */}
              <div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "none" : "translateY(16px)",
                  transition:
                    "opacity 0.8s ease 0.7s, transform 0.8s ease 0.7s",
                }}
              >
                <div
                  className="relative inline-flex items-center rounded-xl overflow-hidden border transition-all duration-500"
                  style={{
                    borderColor: emailFocused
                      ? c.borderBrass
                      : c.border,
                    boxShadow: emailFocused
                      ? "0 2px 24px rgba(168,153,104,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
                      : "0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    className="bg-transparent text-sm px-6 py-4 w-72 outline-none placeholder:text-white/30"
                    style={{ color: c.text }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                  <Link
                    href="/signup"
                    className="text-[13px] font-bold px-7 py-4 flex items-center gap-2 shrink-0 transition-all duration-300 hover:shadow-[0_2px_16px_rgba(168,153,104,0.3)]"
                    style={{
                      background: c.brass,
                      color: c.bg,
                    }}
                  >
                    Request access
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <p
                className="text-[11px] tracking-wide"
                style={{
                  color: c.textGhost,
                  opacity: mounted ? 1 : 0,
                  transition: "opacity 0.8s ease 0.9s",
                }}
              >
                Free for 7 days. No credit card required.
              </p>
            </div>
          </div>
        </DotGlobeHero>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Stats Bar ── */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-20 px-8 relative">
          <div className="mx-auto max-w-5xl">
            <div
              className="h-px mb-20"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${c.borderBrass} 30%, ${c.brass} 50%, ${c.borderBrass} 70%, transparent 100%)`,
                opacity: 0.5,
              }}
            />
          </div>

          <Reveal>
            <div className="mx-auto max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
              {[
                {
                  value: "2.8",
                  suffix: "M+",
                  label: "Signals analyzed daily",
                  icon: Zap,
                },
                {
                  value: "12",
                  suffix: "x",
                  label: "Faster decisions",
                  icon: TrendingUp,
                },
                {
                  value: "99.97",
                  suffix: "%",
                  label: "Extraction accuracy",
                  icon: Brain,
                },
                {
                  value: "140",
                  suffix: "+",
                  label: "Enterprise deployments",
                  icon: Users,
                },
              ].map((stat, i) => (
                <Reveal key={stat.label} delay={i * 0.08}>
                  <div className="text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-3">
                      <stat.icon
                        size={14}
                        style={{ color: c.brass }}
                      />
                      <span
                        className="text-3xl sm:text-4xl font-black tracking-[-0.03em]"
                        style={{ color: c.text }}
                      >
                        <Counter value={stat.value} suffix={stat.suffix} />
                      </span>
                    </div>
                    <p
                      className="text-[12px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: c.textMuted }}
                    >
                      {stat.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <div className="mx-auto max-w-5xl">
            <div
              className="h-px mt-20"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${c.border} 50%, transparent 100%)`,
              }}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Product Preview ── */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-28 px-8 relative">
          {/* Ambient glow behind card */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: "900px",
              height: "700px",
              background:
                "radial-gradient(ellipse at center, rgba(168,153,104,0.06) 0%, transparent 60%)",
            }}
          />

          <div className="mx-auto max-w-7xl relative">
            <div className="grid lg:grid-cols-5 gap-16 items-center">
              {/* Left: Text */}
              <div className="lg:col-span-2">
                <Reveal>
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.3em] mb-6"
                    style={{ color: c.brass }}
                  >
                    A Glimpse Into Clarity
                  </p>
                  <h2
                    className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.04em] leading-[1.05] mb-7"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    <span style={{ color: c.text }}>One briefing.</span>
                    <br />
                    <span style={{ color: c.textMuted }}>
                      Zero noise.
                    </span>
                  </h2>
                  <p
                    className="text-base leading-[1.8] mb-10"
                    style={{ color: c.textTertiary }}
                  >
                    Every morning at 7am, your Chief of Staff synthesises
                    overnight emails, calendar changes, Slack threads, and
                    document updates into a single prioritised message. Tap to
                    act. Nothing falls through.
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      className="flex items-center gap-2.5 text-[13px] font-semibold px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-[0_2px_20px_rgba(168,153,104,0.25)]"
                      style={{
                        background: c.brass,
                        color: c.bg,
                      }}
                    >
                      Try it free
                      <ArrowRight size={14} />
                    </button>
                    <button
                      className="flex items-center gap-2 text-[13px] font-medium px-5 py-3 rounded-lg border transition-all duration-300 hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
                      style={{
                        borderColor: c.border,
                        color: c.textTertiary,
                      }}
                    >
                      <Play size={13} fill="currentColor" />
                      Watch demo
                    </button>
                  </div>
                </Reveal>
              </div>

              {/* Right: Briefing card mockup */}
              <div className="lg:col-span-3">
                <Reveal delay={0.15} direction="right">
                  <div className="relative">
                    {/* Glow behind card */}
                    <div
                      className="absolute -inset-4 rounded-3xl pointer-events-none"
                      style={{
                        background: "radial-gradient(ellipse at center, rgba(168,153,104,0.08) 0%, transparent 70%)",
                      }}
                    />
                    {/* Card */}
                    <div
                      className="relative rounded-2xl border overflow-hidden"
                      style={{
                        borderColor: c.border,
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(20px)",
                        boxShadow:
                          "0 24px 60px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset",
                      }}
                    >
                      {/* Card header */}
                      <div
                        className="px-7 py-5 flex items-center justify-between border-b"
                        style={{
                          borderColor: c.border,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-full flex items-center justify-center text-[9px] font-black"
                            style={{
                              background: c.brassMuted,
                              color: c.brass,
                              border: `1px solid ${c.borderBrass}`,
                            }}
                          >
                            CS
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold" style={{ color: c.text }}>
                              Morning Briefing
                            </p>
                            <p
                              className="text-[11px]"
                              style={{ color: c.textMuted }}
                            >
                              Thursday, March 6 — 7:00 AM
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: "#4ADE80",
                              boxShadow: "0 0 8px rgba(74,222,128,0.5)",
                            }}
                          />
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: c.textMuted }}
                          >
                            Live
                          </span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-7 space-y-3">
                        {/* Critical item */}
                        <div
                          className="rounded-xl p-5 border-l-[3px] relative overflow-hidden"
                          style={{
                            borderColor: c.brass,
                            background: c.brassMuted,
                          }}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <Zap
                              size={12}
                              style={{ color: c.brass }}
                              fill={c.brass}
                            />
                            <p
                              className="text-[10px] font-black uppercase tracking-[0.15em]"
                              style={{ color: c.brass }}
                            >
                              Critical — Act today
                            </p>
                          </div>
                          <p
                            className="text-[14px] leading-relaxed font-medium"
                            style={{ color: c.textSecondary }}
                          >
                            Board deck feedback due to Sarah Chen by EOD. She
                            sent a follow-up at 11:42pm.
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span
                              className="text-[10px]"
                              style={{ color: c.textMuted }}
                            >
                              Source: Gmail — 2 messages
                            </span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{
                                background: c.brassMuted,
                                color: c.brass,
                                border: `1px solid ${c.borderBrass}`,
                              }}
                            >
                              Reply draft ready
                            </span>
                          </div>
                        </div>

                        {/* Meeting prep */}
                        <div
                          className="rounded-xl p-5 border-l-[3px]"
                          style={{
                            borderColor: c.textGhost,
                            background: c.surface,
                          }}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <Calendar
                              size={12}
                              style={{ color: c.textMuted }}
                            />
                            <p
                              className="text-[10px] font-bold uppercase tracking-[0.12em]"
                              style={{ color: c.textMuted }}
                            >
                              Meeting Prep
                            </p>
                          </div>
                          <p
                            className="text-[14px] leading-relaxed"
                            style={{ color: c.textTertiary }}
                          >
                            1:1 with David Okoro at 10am. Last spoke 12 days
                            ago. Open commitment: headcount plan review.
                          </p>
                          <span
                            className="text-[10px] mt-2 inline-block"
                            style={{ color: c.textGhost }}
                          >
                            Source: Calendar + Slack
                          </span>
                        </div>

                        {/* Going cold */}
                        <div
                          className="rounded-xl p-5 border-l-[3px]"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            background: c.surface,
                          }}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <Clock
                              size={12}
                              style={{ color: c.textGhost }}
                            />
                            <p
                              className="text-[10px] font-bold uppercase tracking-[0.12em]"
                              style={{ color: c.textGhost }}
                            >
                              Relationship Alert
                            </p>
                          </div>
                          <p
                            className="text-[14px] leading-relaxed"
                            style={{ color: c.textMuted }}
                          >
                            Haven&apos;t responded to Alex Kim in 9 days.
                            He asked about partnership terms.
                          </p>
                          <span
                            className="text-[10px] mt-2 inline-block"
                            style={{ color: c.textGhost }}
                          >
                            Source: Gmail
                          </span>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div
                        className="px-7 py-4 flex items-center justify-between border-t"
                        style={{
                          borderColor: c.border,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <span
                          className="text-[11px]"
                          style={{ color: c.textGhost }}
                        >
                          3 items — 2 actionable
                        </span>
                        <div className="flex items-center gap-2">
                          {["Reply", "Snooze", "Delegate"].map((action) => (
                            <span
                              key={action}
                              className="text-[10px] font-medium px-3 py-1.5 rounded-md border transition-all hover:border-[rgba(168,153,104,0.3)] hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
                              style={{
                                borderColor: c.border,
                                color: c.textMuted,
                              }}
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500">
                      <div
                        className="h-16 w-16 rounded-full flex items-center justify-center pointer-events-auto cursor-pointer transition-transform duration-300 hover:scale-110"
                        style={{
                          background: "rgba(10,10,11,0.8)",
                          border: `1px solid ${c.border}`,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <Play
                          size={20}
                          fill={c.brass}
                          style={{ color: c.brass, marginLeft: "2px" }}
                        />
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Features Grid ── */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-36 px-8 relative">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${c.border} 50%, transparent 100%)`,
            }}
          />
          {/* Section ambient glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: "1200px",
              height: "800px",
              background: "radial-gradient(ellipse at center, rgba(168,153,104,0.04) 0%, transparent 60%)",
            }}
          />

          <div className="mx-auto max-w-7xl relative">
            <Reveal>
              <div className="text-center mb-24">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.3em] mb-6"
                  style={{ color: c.brass }}
                >
                  Intelligence Engine
                </p>
                <h2
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[1.02]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  <span style={{ color: c.text }}>Extract truths from</span>
                  <br />
                  <span style={{ color: c.textMuted }}>
                    chaotic data.
                  </span>
                </h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Eye,
                  title: "Daily Briefing",
                  desc: "One prioritised message every morning. What's urgent, what you promised, who needs a response.",
                },
                {
                  icon: Brain,
                  title: "Commitment Extraction",
                  desc: "Two-pass AI identifies every promise across email, Slack, and meetings with confidence scoring.",
                },
                {
                  icon: Users,
                  title: "Relationship Radar",
                  desc: "Detects when important contacts go cold. Surfaces last context before every meeting.",
                },
                {
                  icon: Calendar,
                  title: "Meeting Prep",
                  desc: "Auto-generated briefs before every meeting. Open threads, commitments, and context — all in one view.",
                },
                {
                  icon: Zap,
                  title: "One-Tap Actions",
                  desc: "Reply, snooze, delegate — all from Telegram. AI drafts the response, you approve with a tap.",
                },
                {
                  icon: Shield,
                  title: "Security-First",
                  desc: "SOC 2 audited. Zero content retention. Nango token vault. Optional on-device AI for full privacy.",
                },
              ].map((feature, i) => (
                <Reveal key={feature.title} delay={i * 0.06}>
                  <div
                    className="group relative rounded-2xl border p-8 h-full transition-all duration-500 cursor-default"
                    style={{
                      borderColor:
                        hoveredFeature === i
                          ? c.borderBrass
                          : c.border,
                      background:
                        hoveredFeature === i
                          ? c.surfaceHover
                          : c.surface,
                      boxShadow:
                        hoveredFeature === i
                          ? "0 8px 40px rgba(0,0,0,0.3), 0 0 60px rgba(168,153,104,0.05), inset 0 1px 0 rgba(255,255,255,0.06)"
                          : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                    onMouseEnter={() => setHoveredFeature(i)}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="relative">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center mb-6 transition-all duration-500"
                        style={{
                          background:
                            hoveredFeature === i
                              ? c.brassMuted
                              : c.surfaceRaised,
                          border: `1px solid ${
                            hoveredFeature === i
                              ? c.borderBrass
                              : c.border
                          }`,
                        }}
                      >
                        <feature.icon
                          size={18}
                          style={{
                            color:
                              hoveredFeature === i
                                ? c.brass
                                : c.textMuted,
                            transition: "color 0.5s ease",
                          }}
                        />
                      </div>
                      <h3
                        className="text-lg font-bold tracking-[-0.02em] mb-3"
                        style={{ color: c.text }}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="text-[14px] leading-[1.7]"
                        style={{ color: c.textTertiary }}
                      >
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Integrations ── */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-28 px-8 relative">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${c.borderBrass} 50%, transparent 100%)`,
              opacity: 0.6,
            }}
          />

          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="text-center mb-20">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.3em] mb-5"
                  style={{ color: c.brass }}
                >
                  Seamless Connections
                </p>
                <h2
                  className="text-3xl sm:text-4xl font-black tracking-[-0.03em] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif", color: c.text }}
                >
                  Your tools, unified.
                </h2>
                <p
                  className="text-base max-w-lg mx-auto"
                  style={{ color: c.textTertiary }}
                >
                  Connect once. Chief of Staff reads across all your platforms
                  to surface what matters.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {[
                  { icon: Mail, name: "Gmail" },
                  { icon: Calendar, name: "Calendar" },
                  { icon: MessageSquare, name: "Slack" },
                  { icon: FileText, name: "Notion" },
                  { icon: Mail, name: "Outlook" },
                  { icon: FileText, name: "Docs" },
                  { icon: MessageSquare, name: "Teams" },
                  { icon: FileText, name: "Linear" },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all duration-300 hover:border-[rgba(168,153,104,0.3)] hover:bg-[rgba(255,255,255,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] cursor-default"
                    style={{
                      borderColor: c.border,
                      background: c.surface,
                    }}
                  >
                    <integration.icon
                      size={16}
                      style={{ color: c.textMuted }}
                    />
                    <span
                      className="text-[13px] font-medium"
                      style={{ color: c.textTertiary }}
                    >
                      {integration.name}
                    </span>
                  </div>
                ))}
                <div
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl border"
                  style={{
                    borderColor: c.borderBrass,
                    background: c.brassMuted,
                  }}
                >
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: c.brass }}
                  >
                    +12 more
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Testimonial ── */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-36 px-8 relative">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${c.border} 50%, transparent 100%)`,
            }}
          />
          {/* Testimonial ambient glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: "600px",
              height: "400px",
              background: "radial-gradient(ellipse at center, rgba(168,153,104,0.05) 0%, transparent 60%)",
            }}
          />

          <Reveal>
            <div className="mx-auto max-w-3xl text-center relative">
              <div
                className="text-[120px] font-serif leading-none mb-4"
                style={{
                  color: "rgba(255,255,255,0.06)",
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                &ldquo;
              </div>
              <blockquote
                className="text-2xl sm:text-3xl font-medium tracking-[-0.02em] leading-[1.4] mb-12 -mt-16"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: c.textSecondary,
                }}
              >
                Chief of Staff transformed an hour of my morning
                into five minutes. I stopped dropping commitments
                the first week.
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-[14px] font-bold"
                  style={{
                    background: c.brassMuted,
                    color: c.brass,
                    border: `1px solid ${c.borderBrass}`,
                  }}
                >
                  EM
                </div>
                <div className="text-left">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: c.text }}
                  >
                    Elena Mora
                  </p>
                  <p
                    className="text-[12px]"
                    style={{ color: c.textMuted }}
                  >
                    Founder, FutureCorp
                  </p>
                </div>
              </div>

              {/* Trust logos */}
              <div
                className="flex items-center justify-center gap-8 mt-16"
              >
                <span
                  className="text-[11px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: c.textGhost }}
                >
                  Trusted by operators at
                </span>
                {["Sequoia", "a16z", "Stripe", "Notion"].map((company) => (
                  <span
                    key={company}
                    className="text-[13px] font-bold tracking-wide"
                    style={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Final CTA ── */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-40 px-8 relative">
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${c.borderBrass} 50%, transparent 100%)`,
              opacity: 0.6,
            }}
          />
          {/* CTA ambient glow */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: "1000px",
              height: "600px",
              background:
                "radial-gradient(ellipse 60% 50% at 50% 80%, rgba(168,153,104,0.06) 0%, transparent 60%)",
            }}
          />
          {/* Decorative line from bottom */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: "1px",
              height: "80px",
              background: "linear-gradient(0deg, rgba(168,153,104,0.3) 0%, transparent 100%)",
            }}
          />

          <Reveal>
            <div className="mx-auto max-w-3xl text-center relative">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.3em] mb-8"
                style={{ color: c.brass }}
              >
                Begin Your Journey
              </p>
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[1.02] mb-7"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                <span style={{ color: c.text }}>Your time is your</span>
                <br />
                <span style={{ color: c.text }}>most valuable </span>
                <span style={{ color: c.brass }}>signal.</span>
              </h2>
              <p
                className="text-lg max-w-xl mx-auto leading-[1.7] mb-14"
                style={{ color: c.textTertiary }}
              >
                Stop spending mornings on triage. Let Chief of Staff handle the
                noise so you can focus on what only you can do.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="text-[14px] font-bold px-9 py-4 rounded-xl flex items-center gap-2.5 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(168,153,104,0.3)] hover:scale-[1.02]"
                  style={{
                    background: c.brass,
                    color: c.bg,
                  }}
                >
                  Request early access
                  <ArrowRight size={16} />
                </Link>
                <button
                  className="text-[14px] font-medium px-9 py-4 rounded-xl border transition-all duration-300 hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
                  style={{
                    borderColor: c.border,
                    color: c.textTertiary,
                  }}
                >
                  Read the docs
                </button>
              </div>

              {/* Social proof micro-strip */}
              <div className="flex items-center justify-center gap-6 mt-14">
                <div className="flex -space-x-2">
                  {["SM", "AK", "JR", "DO"].map((initials, i) => (
                    <div
                      key={initials}
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[8px] font-bold border-2"
                      style={{
                        background: c.surfaceRaised,
                        borderColor: c.bg,
                        color: c.textMuted,
                        zIndex: 4 - i,
                      }}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={c.brass}
                      style={{ color: c.brass }}
                    />
                  ))}
                </div>
                <span
                  className="text-[11px]"
                  style={{ color: c.textGhost }}
                >
                  Loved by 140+ early adopters
                </span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* ── Footer ── */}
        {/* ═══════════════════════════════════════════ */}
        <footer
          className="border-t py-16 px-8"
          style={{ borderColor: c.border }}
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
              {/* Brand col */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2.5 mb-5">
                  <div
                    className="h-7 w-7 rounded-md flex items-center justify-center text-[9px] font-black"
                    style={{
                      background: "#FFFFFF",
                      color: c.bg,
                    }}
                  >
                    CS
                  </div>
                  <span className="text-sm font-bold" style={{ color: c.text }}>Chief of Staff</span>
                </div>
                <p
                  className="text-[12px] leading-relaxed max-w-[200px]"
                  style={{ color: c.textMuted }}
                >
                  The executive intelligence layer for your digital life.
                </p>
              </div>

              {[
                {
                  label: "Product",
                  links: ["Features", "Pricing", "Security", "Changelog"],
                },
                {
                  label: "Resources",
                  links: ["Documentation", "Blog", "API Reference", "Status"],
                },
                {
                  label: "Company",
                  links: ["About", "Careers", "Contact", "Press"],
                },
                {
                  label: "Legal",
                  links: ["Privacy", "Terms", "DPA", "Cookies"],
                },
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
                          className="text-[13px] transition-colors duration-300 hover:text-white"
                          style={{ color: c.textMuted }}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t"
              style={{ borderColor: c.border }}
            >
              <p
                className="text-[11px]"
                style={{ color: c.textGhost }}
              >
                &copy; 2026 Chief of Staff Inc. All rights reserved.
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={12}
                  style={{ color: c.brass }}
                />
                <span
                  className="text-[11px]"
                  style={{ color: c.textGhost }}
                >
                  SOC 2 Type II Certified
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Keyframes ── */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(3.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
    </>
  );
}
