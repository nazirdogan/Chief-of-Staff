"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Mail, Calendar, MessageSquare, FileText, Shield, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

export default function ConciergeLanding() {
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className="min-h-screen relative"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: "#07070B",
        color: "#FDFDFD",
      }}
    >
      {/* Texture & atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          opacity: 0.02,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
      {/* Subtle horizontal lines */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.012,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(253,253,253,0.4) 0px, rgba(253,253,253,0.4) 1px, transparent 1px, transparent 120px)",
        }}
      />

      <div className="relative z-[2]">
        {/* Back */}
        <div
          className="fixed top-6 left-6 z-50"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 0.8s",
          }}
        >
          <Link
            href="/showcase"
            className="flex items-center gap-2 text-[11px] font-medium px-3.5 py-2 rounded-full border transition-all hover:border-[rgba(184,150,12,0.3)]"
            style={{
              borderColor: "rgba(253,253,253,0.08)",
              color: "rgba(253,253,253,0.4)",
              background: "rgba(7,7,11,0.85)",
              backdropFilter: "blur(16px)",
            }}
          >
            <ArrowLeft size={12} />
            Showcase
          </Link>
        </div>

        {/* ─── Nav ─── */}
        <nav
          className="fixed top-0 left-0 right-0 z-40 border-b"
          style={{
            borderColor: "rgba(253,253,253,0.04)",
            background: "rgba(7,7,11,0.85)",
            backdropFilter: "blur(20px)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.5s ease 0.1s",
          }}
        >
          <div className="mx-auto max-w-7xl px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "#FDFDFD", color: "#07070B" }}
                >
                  CS
                </div>
                <span className="text-sm font-semibold tracking-[-0.01em]">Chief of Staff</span>
              </div>
              <div className="hidden md:flex items-center">
                {["Product", "Use Cases", "Pricing", "Docs", "Blog"].map((item) => (
                  <a key={item} href="#" className="text-[13px] px-3 py-1 transition-colors hover:text-[#FDFDFD]" style={{ color: "rgba(253,253,253,0.35)" }}>
                    {item}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-[13px]" style={{ color: "rgba(253,253,253,0.5)" }}>Sign in</button>
              <button
                className="text-[13px] font-medium px-4 py-2 rounded-lg border transition-all hover:bg-[rgba(253,253,253,0.04)]"
                style={{ borderColor: "rgba(253,253,253,0.1)", color: "#FDFDFD" }}
              >
                Get started free
              </button>
            </div>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <section className="pt-40 pb-28 px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <div
                className="flex items-center gap-3 mb-12"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(10px)",
                  transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(184,150,12,0.08)",
                    color: "#B8960C",
                    border: "1px solid rgba(184,150,12,0.15)",
                  }}
                >
                  Beta
                </span>
                <span
                  className="h-px w-6"
                  style={{ background: "rgba(253,253,253,0.08)" }}
                />
                <span className="text-[12px]" style={{ color: "rgba(253,253,253,0.25)" }}>
                  Accepting early access applications
                </span>
              </div>

              <h1
                className="text-4xl sm:text-6xl lg:text-[72px] font-bold tracking-[-0.04em] leading-[1.02] mb-10"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(24px)",
                  transition: "opacity 0.9s ease 0.3s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s",
                }}
              >
                The executive intelligence
                <br />
                layer for your{" "}
                <span className="relative inline-block" style={{ color: "#C4A55A" }}>
                  digital life
                  <svg
                    className="absolute -bottom-1.5 left-0 w-full"
                    viewBox="0 0 200 8"
                    fill="none"
                    preserveAspectRatio="none"
                    style={{
                      height: "5px",
                      opacity: mounted ? 0.35 : 0,
                      transition: "opacity 0.8s ease 1s",
                    }}
                  >
                    <path
                      d="M1 5.5C40 2 80 1 100 3C120 5 160 4 199 2"
                      stroke="#C4A55A"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p
                className="text-base sm:text-lg max-w-xl leading-[1.75] mb-12"
                style={{
                  color: "rgba(253,253,253,0.38)",
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(16px)",
                  transition: "opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s",
                }}
              >
                Chief of Staff connects to your email, calendar, messaging, and docs — then
                synthesises everything into one actionable morning briefing. No more inbox triage.
                No more missed commitments.
              </p>

              {/* Email input */}
              <div
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(12px)",
                  transition: "opacity 0.7s ease 0.6s, transform 0.7s ease 0.6s",
                }}
              >
                <div
                  className="inline-flex items-center rounded-xl overflow-hidden border transition-all duration-300"
                  style={{
                    borderColor: emailFocused ? "rgba(196,165,90,0.3)" : "rgba(253,253,253,0.08)",
                    boxShadow: emailFocused ? "0 0 20px rgba(196,165,90,0.06)" : "none",
                  }}
                >
                  <input
                    type="email"
                    placeholder="Enter your work email"
                    className="bg-transparent text-sm px-5 py-3.5 w-64 outline-none"
                    style={{ color: "#FDFDFD" }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                  <button
                    className="text-[13px] font-semibold px-6 py-3.5 flex items-center gap-1.5 shrink-0 transition-all hover:opacity-90"
                    style={{ background: "#FDFDFD", color: "#07070B" }}
                  >
                    Request access
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Integrations */}
              <div
                className="flex items-center gap-4 mt-12"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: "opacity 0.7s ease 0.8s",
                }}
              >
                <span className="text-[11px] uppercase tracking-[0.15em]" style={{ color: "rgba(253,253,253,0.18)" }}>
                  Connects with
                </span>
                <div className="flex items-center gap-2">
                  {[Mail, Calendar, MessageSquare, FileText].map((Icon, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:border-[rgba(253,253,253,0.1)]"
                      style={{
                        background: "rgba(253,253,253,0.03)",
                        border: "1px solid rgba(253,253,253,0.04)",
                      }}
                    >
                      <Icon size={14} style={{ color: "rgba(253,253,253,0.25)" }} />
                    </div>
                  ))}
                  <span className="text-[11px] ml-1" style={{ color: "rgba(253,253,253,0.15)" }}>
                    +12 more
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Divider ─── */}
        <div className="mx-auto max-w-7xl px-8">
          <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(253,253,253,0.06) 0%, rgba(196,165,90,0.1) 50%, rgba(253,253,253,0.06) 100%)" }} />
        </div>

        {/* ─── Product sections ─── */}
        <section className="py-36 px-8">
          <div className="mx-auto max-w-7xl space-y-44">
            {/* Section 1: Briefing */}
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <Reveal>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-6" style={{ color: "#C4A55A" }}>
                    Daily Briefing
                  </p>
                  <h3 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-6 leading-[1.1]" style={{ color: "#FDFDFD" }}>
                    Wake up to clarity,
                    <br />
                    not chaos.
                  </h3>
                  <p className="text-base leading-[1.75] mb-8" style={{ color: "rgba(253,253,253,0.35)" }}>
                    Every morning, Chief of Staff delivers a single, prioritised message to your
                    Telegram. What&apos;s urgent. What you promised. Who needs a response. What
                    meeting to prep for. Nothing else.
                  </p>
                  <ul className="space-y-3.5">
                    {["5-dimension priority scoring", "Source citations on every claim", "One-tap actions: reply, snooze, delegate"].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "rgba(196,165,90,0.1)" }}>
                          <Check size={10} style={{ color: "#C4A55A" }} />
                        </div>
                        <span className="text-sm" style={{ color: "rgba(253,253,253,0.5)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={0.15}>
                <div
                  className="rounded-2xl border p-7 sm:p-8 relative overflow-hidden"
                  style={{
                    borderColor: "rgba(253,253,253,0.05)",
                    background: "rgba(253,253,253,0.015)",
                    boxShadow: "0 16px 50px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Corner glow */}
                  <div
                    className="absolute top-0 left-0 w-40 h-40 pointer-events-none"
                    style={{
                      background: "radial-gradient(circle at 0% 0%, rgba(196,165,90,0.04) 0%, transparent 60%)",
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-7">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{
                          background: "linear-gradient(145deg, rgba(196,165,90,0.15) 0%, rgba(196,165,90,0.05) 100%)",
                          color: "#C4A55A",
                          border: "1px solid rgba(196,165,90,0.1)",
                        }}
                      >
                        CS
                      </div>
                      <div>
                        <p className="text-sm font-medium">Morning Briefing</p>
                        <p className="text-[11px]" style={{ color: "rgba(253,253,253,0.25)" }}>Today, 7:00 AM</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div
                        className="rounded-lg p-4 border-l-2"
                        style={{ borderColor: "#C4A55A", background: "rgba(196,165,90,0.03)" }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: "#C4A55A" }}>Critical</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(253,253,253,0.65)" }}>
                          Board deck feedback due to Sarah by EOD. She sent a follow-up yesterday.
                        </p>
                        <p className="text-[10px] mt-2" style={{ color: "rgba(253,253,253,0.2)" }}>Source: Gmail — 2 messages</p>
                      </div>
                      <div
                        className="rounded-lg p-4 border-l-2"
                        style={{ borderColor: "rgba(253,253,253,0.12)", background: "rgba(253,253,253,0.015)" }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: "rgba(253,253,253,0.4)" }}>Meeting Prep</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(253,253,253,0.45)" }}>
                          1:1 with David at 10am. Last spoke 12 days ago. Open commitment: hiring plan.
                        </p>
                        <p className="text-[10px] mt-2" style={{ color: "rgba(253,253,253,0.15)" }}>Source: Calendar + Slack</p>
                      </div>
                      <div
                        className="rounded-lg p-4 border-l-2"
                        style={{ borderColor: "rgba(253,253,253,0.07)", background: "rgba(253,253,253,0.01)" }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: "rgba(253,253,253,0.3)" }}>Going Cold</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(253,253,253,0.35)" }}>
                          Haven&apos;t responded to Alex K. in 9 days. He asked about the partnership terms.
                        </p>
                        <p className="text-[10px] mt-2" style={{ color: "rgba(253,253,253,0.12)" }}>Source: Gmail</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Section 2: Commitments */}
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <Reveal className="order-2 lg:order-1">
                <div
                  className="rounded-2xl border p-7 sm:p-8 relative overflow-hidden"
                  style={{
                    borderColor: "rgba(253,253,253,0.05)",
                    background: "rgba(253,253,253,0.015)",
                    boxShadow: "0 16px 50px rgba(0,0,0,0.2)",
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-6" style={{ color: "rgba(253,253,253,0.25)" }}>
                    Active Commitments
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { text: "Send revised proposal to Meridian Group", due: "Tomorrow", urgency: "high" },
                      { text: "Review Q3 headcount plan with HR", due: "Thu", urgency: "medium" },
                      { text: "Intro Lena to the Sequoia partner", due: "This week", urgency: "medium" },
                      { text: "Follow up on vendor contract renewal", due: "Mar 15", urgency: "low" },
                    ].map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-4 p-3.5 rounded-lg transition-colors hover:bg-[rgba(253,253,253,0.02)]"
                        style={{ background: "rgba(253,253,253,0.01)" }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              background: c.urgency === "high" ? "#C4A55A"
                                : c.urgency === "medium" ? "rgba(253,253,253,0.2)"
                                : "rgba(253,253,253,0.08)",
                              boxShadow: c.urgency === "high" ? "0 0 6px rgba(196,165,90,0.3)" : "none",
                            }}
                          />
                          <p className="text-[13px] truncate" style={{ color: "rgba(253,253,253,0.55)" }}>{c.text}</p>
                        </div>
                        <span
                          className="text-[11px] shrink-0 font-medium"
                          style={{ color: c.urgency === "high" ? "#C4A55A" : "rgba(253,253,253,0.2)" }}
                        >
                          {c.due}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.15} className="order-1 lg:order-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-6" style={{ color: "#C4A55A" }}>
                    Commitment Tracking
                  </p>
                  <h3 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-6 leading-[1.1]" style={{ color: "#FDFDFD" }}>
                    Never drop a promise
                    <br />
                    again.
                  </h3>
                  <p className="text-base leading-[1.75] mb-8" style={{ color: "rgba(253,253,253,0.35)" }}>
                    Chief of Staff uses two-pass AI extraction to identify every commitment — ones you
                    made, and ones made to you — across all your communication channels. Each commitment
                    is tracked with a source citation and confidence score.
                  </p>
                  <ul className="space-y-3.5">
                    {["Extracted from email, Slack, meetings", "Confidence scoring with human calibration", "Deadline reminders before it's too late"].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ background: "rgba(196,165,90,0.1)" }}>
                          <Check size={10} style={{ color: "#C4A55A" }} />
                        </div>
                        <span className="text-sm" style={{ color: "rgba(253,253,253,0.5)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Section 3: Security */}
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <Reveal>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-6" style={{ color: "#C4A55A" }}>
                    Security & Privacy
                  </p>
                  <h3 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] mb-6 leading-[1.1]" style={{ color: "#FDFDFD" }}>
                    Built for the most
                    <br />
                    sensitive workflows.
                  </h3>
                  <p className="text-base leading-[1.75]" style={{ color: "rgba(253,253,253,0.35)" }}>
                    We know executives handle confidential information daily. That&apos;s why security
                    isn&apos;t a feature — it&apos;s the foundation. Every design decision starts with
                    &ldquo;how do we protect this data?&rdquo;
                  </p>
                </div>
              </Reveal>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Shield, title: "SOC 2 Type II", desc: "Audited annually" },
                  { icon: Clock, title: "Zero retention", desc: "Content not stored after processing" },
                  { icon: Mail, title: "Token vault", desc: "Nango-managed OAuth" },
                  { icon: FileText, title: "Local mode", desc: "Optional on-device AI" },
                ].map((item, i) => (
                  <Reveal key={item.title} delay={i * 0.08}>
                    <div
                      className="rounded-xl border p-5 group transition-all duration-500 hover:border-[rgba(196,165,90,0.12)] h-full"
                      style={{
                        borderColor: "rgba(253,253,253,0.04)",
                        background: "rgba(253,253,253,0.015)",
                      }}
                    >
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center mb-4 transition-all duration-500 group-hover:shadow-[0_0_10px_rgba(196,165,90,0.08)]"
                        style={{
                          background: "rgba(196,165,90,0.06)",
                          border: "1px solid rgba(196,165,90,0.08)",
                        }}
                      >
                        <item.icon size={15} style={{ color: "#C4A55A" }} />
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: "#FDFDFD" }}>{item.title}</p>
                      <p className="text-[12px]" style={{ color: "rgba(253,253,253,0.3)" }}>{item.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section className="py-36 px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-5" style={{ color: "#C4A55A" }}>
                  Pricing
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] mb-4">
                  Simple, transparent pricing.
                </h2>
                <p className="text-base" style={{ color: "rgba(253,253,253,0.3)" }}>
                  One plan that scales with your needs.
                </p>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              <Reveal>
                <div
                  className="rounded-2xl border p-8 transition-all duration-500 hover:border-[rgba(253,253,253,0.08)] h-full"
                  style={{
                    borderColor: "rgba(253,253,253,0.05)",
                    background: "rgba(253,253,253,0.015)",
                  }}
                >
                  <p className="text-[13px] font-semibold mb-1.5" style={{ color: "rgba(253,253,253,0.5)" }}>Individual</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold tracking-[-0.03em]">$49</span>
                    <span className="text-sm" style={{ color: "rgba(253,253,253,0.3)" }}>/month</span>
                  </div>
                  <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(253,253,253,0.3)" }}>
                    For executives who want to reclaim their mornings.
                  </p>
                  <button
                    className="w-full text-[13px] font-semibold py-3 rounded-lg border transition-all hover:bg-[rgba(253,253,253,0.03)] mb-6"
                    style={{ borderColor: "rgba(253,253,253,0.1)", color: "#FDFDFD" }}
                  >
                    Start free trial
                  </button>
                  <ul className="space-y-3">
                    {["All integrations", "Daily briefing via Telegram", "Commitment tracking", "Relationship radar", "Meeting prep briefs"].map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check size={12} style={{ color: "#C4A55A" }} />
                        <span className="text-[13px]" style={{ color: "rgba(253,253,253,0.45)" }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div
                  className="rounded-2xl border p-8 relative overflow-hidden h-full"
                  style={{
                    borderColor: "rgba(196,165,90,0.15)",
                    background: "rgba(196,165,90,0.02)",
                  }}
                >
                  {/* Accent glow */}
                  <div
                    className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                    style={{
                      background: "radial-gradient(circle at 100% 0%, rgba(196,165,90,0.06) 0%, transparent 60%)",
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-semibold" style={{ color: "#C4A55A" }}>Enterprise</p>
                      <span
                        className="text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(196,165,90,0.12)", color: "#C4A55A" }}
                      >
                        Coming soon
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-4xl font-bold tracking-[-0.03em]">Custom</span>
                    </div>
                    <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(253,253,253,0.3)" }}>
                      For leadership teams and executive offices.
                    </p>
                    <button
                      className="w-full text-[13px] font-semibold py-3 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(253,253,253,0.06)] mb-6"
                      style={{ background: "#FDFDFD", color: "#07070B" }}
                    >
                      Contact sales
                    </button>
                    <ul className="space-y-3">
                      {["Everything in Individual", "Team briefing rollups", "SSO & SAML", "Dedicated support", "Custom integrations", "On-premise option"].map((f) => (
                        <li key={f} className="flex items-center gap-2.5">
                          <Check size={12} style={{ color: "#C4A55A" }} />
                          <span className="text-[13px]" style={{ color: "rgba(253,253,253,0.45)" }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-36 px-8 border-t relative" style={{ borderColor: "rgba(253,253,253,0.04)" }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 50% 70% at 50% 100%, rgba(196,165,90,0.03) 0%, transparent 60%)",
            }}
          />
          <Reveal>
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] mb-6 leading-[1.1]">
                Your time is your
                <br />
                most valuable asset.
              </h2>
              <p className="text-lg mb-12" style={{ color: "rgba(253,253,253,0.3)" }}>
                Stop spending it on triage. Let Chief of Staff handle the noise
                so you can focus on what only you can do.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  className="text-[13px] font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(253,253,253,0.06)]"
                  style={{ background: "#FDFDFD", color: "#07070B" }}
                >
                  Request early access
                  <ArrowRight size={15} />
                </button>
                <button
                  className="text-[13px] font-medium px-8 py-3.5 rounded-xl border transition-all hover:border-[rgba(253,253,253,0.15)]"
                  style={{ borderColor: "rgba(253,253,253,0.08)", color: "rgba(253,253,253,0.4)" }}
                >
                  Read the docs
                </button>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t py-14 px-8" style={{ borderColor: "rgba(253,253,253,0.04)" }}>
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
              {[
                { label: "Product", links: ["Features", "Pricing", "Security", "Changelog"] },
                { label: "Resources", links: ["Documentation", "Blog", "API Reference", "Status"] },
                { label: "Company", links: ["About", "Careers", "Contact", "Press"] },
                { label: "Legal", links: ["Privacy", "Terms", "DPA", "Cookie Policy"] },
              ].map((col) => (
                <div key={col.label}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-5" style={{ color: "rgba(253,253,253,0.2)" }}>
                    {col.label}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-[13px] transition-colors hover:text-[rgba(253,253,253,0.6)]" style={{ color: "rgba(253,253,253,0.3)" }}>{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t"
              style={{ borderColor: "rgba(253,253,253,0.04)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "#FDFDFD", color: "#07070B" }}
                >
                  CS
                </div>
                <span className="text-[11px]" style={{ color: "rgba(253,253,253,0.2)" }}>Chief of Staff Inc.</span>
              </div>
              <p className="text-[11px]" style={{ color: "rgba(253,253,253,0.15)" }}>
                &copy; 2026 Chief of Staff. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
