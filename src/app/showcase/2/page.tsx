"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap, Shield, Brain, Calendar, MessageSquare, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
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
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function ObservatoryLanding() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
  useEffect(() => { setMounted(true); }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: "#030305",
        color: "#FDFDFD",
      }}
    >
      {/* ─── Atmospheric layers ─── */}
      {/* Top glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(184,150,12,0.07) 0%, transparent 60%)",
        }}
      />
      {/* Side glow right */}
      <div
        className="fixed top-[20%] right-0 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 100% 50%, rgba(184,150,12,0.04) 0%, transparent 60%)",
          animation: "float-right 8s ease-in-out infinite",
        }}
      />
      {/* Noise */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      {/* Grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.015,
          backgroundImage: "linear-gradient(rgba(253,253,253,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(253,253,253,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-[2]">
        {/* Back */}
        <div
          className="fixed top-6 left-6 z-50"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 1s",
          }}
        >
          <Link
            href="/showcase"
            className="flex items-center gap-2 text-[11px] font-medium px-3.5 py-2 rounded-full border transition-all hover:border-[rgba(184,150,12,0.3)]"
            style={{
              borderColor: "rgba(253,253,253,0.06)",
              color: "rgba(253,253,253,0.4)",
              background: "rgba(3,3,5,0.85)",
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
            background: "rgba(3,3,5,0.6)",
            backdropFilter: "blur(24px)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 0.1s",
          }}
        >
          <div className="mx-auto max-w-6xl px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center relative"
                style={{
                  background: "linear-gradient(145deg, rgba(184,150,12,0.15) 0%, rgba(184,150,12,0.03) 100%)",
                  border: "1px solid rgba(184,150,12,0.15)",
                  boxShadow: "0 0 12px rgba(184,150,12,0.08)",
                }}
              >
                <Zap size={14} style={{ color: "#D4AF37" }} />
              </div>
              <span className="text-sm font-semibold tracking-[-0.01em]">Donna</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {["Product", "Features", "Pricing", "Security"].map((item) => (
                <a key={item} href="#" className="text-[13px] transition-colors hover:text-[#FDFDFD]" style={{ color: "rgba(253,253,253,0.35)" }}>
                  {item}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button className="text-[13px] font-medium px-4 py-2" style={{ color: "rgba(253,253,253,0.5)" }}>
                Log in
              </button>
              <button
                className="text-[13px] font-semibold px-5 py-2 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(184,150,12,0.2)]"
                style={{
                  background: "linear-gradient(145deg, #D4AF37 0%, #B8960C 100%)",
                  color: "#030305",
                }}
              >
                Get started
              </button>
            </div>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <section className="relative pt-48 pb-40 px-8">
          {/* Central orb */}
          <div
            className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(184,150,12,0.08) 0%, rgba(184,150,12,0.02) 40%, transparent 70%)",
              filter: "blur(60px)",
              animation: "pulse-orb 6s ease-in-out infinite",
            }}
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
                transition: "opacity 0.8s ease 0.3s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s",
              }}
            >
              <div
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border text-[11px] font-medium mb-14 tracking-wide"
                style={{
                  borderColor: "rgba(253,253,253,0.06)",
                  background: "rgba(253,253,253,0.02)",
                  color: "rgba(253,253,253,0.45)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "#D4AF37",
                    boxShadow: "0 0 8px rgba(212,175,55,0.6)",
                    animation: "pulse-dot 2.5s ease-in-out infinite",
                  }}
                />
                Private beta — limited access
              </div>
            </div>

            <h1
              className="text-6xl sm:text-8xl lg:text-[112px] font-bold tracking-[-0.05em] leading-[0.9] mb-10"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(30px)",
                transition: "opacity 1s ease 0.4s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.4s",
              }}
            >
              <span style={{ color: "#FDFDFD" }}>Your AI</span>
              <br />
              <span
                style={{
                  background: "linear-gradient(140deg, #E8D48B 0%, #D4AF37 25%, #B8960C 50%, #8B7209 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 40px rgba(184,150,12,0.15))",
                }}
              >
                Donna
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl max-w-xl mx-auto leading-[1.7] mb-16"
              style={{
                color: "rgba(253,253,253,0.35)",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s",
              }}
            >
              An intelligence layer that reads across your entire digital life and delivers
              a single proactive briefing every morning — so you lead, not react.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 0.8s ease 0.7s, transform 0.8s ease 0.7s",
              }}
            >
              <button
                className="w-full sm:w-auto text-[13px] font-semibold px-9 py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(145deg, #D4AF37 0%, #B8960C 100%)",
                  color: "#030305",
                  boxShadow: "0 0 40px rgba(184,150,12,0.2), 0 0 80px rgba(184,150,12,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                Join the waitlist
                <ArrowRight size={15} />
              </button>
              <button
                className="w-full sm:w-auto text-[13px] font-medium px-9 py-4 rounded-xl border transition-all hover:border-[rgba(253,253,253,0.15)]"
                style={{
                  borderColor: "rgba(253,253,253,0.06)",
                  color: "rgba(253,253,253,0.4)",
                  background: "rgba(253,253,253,0.02)",
                  backdropFilter: "blur(4px)",
                }}
              >
                Watch demo
              </button>
            </div>
          </div>
        </section>

        {/* ─── App mockup ─── */}
        <Reveal>
          <section className="px-8 pb-36">
            <div className="mx-auto max-w-5xl">
              <div
                className="relative rounded-2xl border overflow-hidden"
                style={{
                  borderColor: "rgba(253,253,253,0.05)",
                  background: "rgba(253,253,253,0.015)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(184,150,12,0.03)",
                }}
              >
                {/* Window chrome */}
                <div
                  className="flex items-center gap-2 px-5 py-3.5 border-b"
                  style={{
                    borderColor: "rgba(253,253,253,0.04)",
                    background: "rgba(253,253,253,0.015)",
                  }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(253,253,253,0.08)" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(253,253,253,0.08)" }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(253,253,253,0.08)" }} />
                  </div>
                  <div
                    className="flex-1 mx-20 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(253,253,253,0.03)" }}
                  >
                    <div className="h-2 w-24 rounded" style={{ background: "rgba(253,253,253,0.06)" }} />
                  </div>
                </div>
                {/* Briefing content */}
                <div className="p-8 sm:p-12">
                  <div className="flex items-center gap-4 mb-10">
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center"
                      style={{
                        background: "linear-gradient(145deg, rgba(184,150,12,0.2) 0%, rgba(184,150,12,0.05) 100%)",
                        border: "1px solid rgba(184,150,12,0.15)",
                      }}
                    >
                      <Zap size={16} style={{ color: "#D4AF37" }} />
                    </div>
                    <div>
                      <div className="h-3.5 w-40 rounded" style={{ background: "rgba(253,253,253,0.12)" }} />
                      <div className="h-2.5 w-24 rounded mt-2.5" style={{ background: "rgba(253,253,253,0.05)" }} />
                    </div>
                  </div>
                  <div className="space-y-5">
                    {[
                      { width: "88%", subWidth: "72%", accent: true },
                      { width: "76%", subWidth: "60%", accent: false },
                      { width: "65%", subWidth: "50%", accent: false },
                      { width: "55%", subWidth: "42%", accent: false },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex gap-4 items-start"
                        style={{
                          opacity: mounted ? 1 : 0,
                          transform: mounted ? "translateX(0)" : "translateX(-12px)",
                          transition: `opacity 0.6s ease ${1.2 + i * 0.15}s, transform 0.6s ease ${1.2 + i * 0.15}s`,
                        }}
                      >
                        <div
                          className="w-1 h-14 rounded-full shrink-0"
                          style={{
                            background: row.accent
                              ? "linear-gradient(180deg, #D4AF37 0%, rgba(184,150,12,0.2) 100%)"
                              : `rgba(253,253,253,${0.06 - i * 0.01})`,
                          }}
                        />
                        <div className="flex-1 space-y-2.5">
                          <div className="h-3.5 rounded" style={{ background: `rgba(253,253,253,${0.12 - i * 0.025})`, width: row.width }} />
                          <div className="h-2.5 rounded" style={{ background: `rgba(253,253,253,${0.06 - i * 0.012})`, width: row.subWidth }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ─── Feature cards ─── */}
        <section className="py-36 px-8 relative">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center mb-20">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-5" style={{ color: "#B8960C" }}>
                  Capabilities
                </p>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em]">
                  Everything working
                  <br />
                  <span style={{ color: "rgba(253,253,253,0.3)" }}>behind the scenes.</span>
                </h2>
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Brain, title: "Daily Intelligence", desc: "AI reads your inbox, calendar, and messages overnight. You wake up to a prioritised briefing." },
                { icon: MessageSquare, title: "Commitment Tracking", desc: "Promises made and received — extracted from conversations, tracked until resolved." },
                { icon: Users, title: "Relationship Radar", desc: "Detect fading connections before they go cold. Stay intentional with the people who matter." },
                { icon: Calendar, title: "Meeting Prep", desc: "Walk in prepared with context on attendees, open threads, and commitments." },
                { icon: Zap, title: "One-tap Actions", desc: "Reply, delegate, snooze — act on anything from your briefing with a single tap." },
                { icon: Shield, title: "Enterprise Security", desc: "SOC 2 compliant. E2E encryption. Tokens in a vault. Optional local-only mode." },
              ].map((feature, i) => (
                <Reveal key={feature.title} delay={i * 0.07}>
                  <div
                    className="relative group rounded-2xl border p-8 transition-all duration-500 hover:border-[rgba(184,150,12,0.12)] h-full"
                    style={{
                      borderColor: "rgba(253,253,253,0.04)",
                      background: "rgba(253,253,253,0.015)",
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: "radial-gradient(ellipse 80% 80% at 20% 20%, rgba(184,150,12,0.04) 0%, transparent 60%)",
                      }}
                    />
                    <div className="relative">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:shadow-[0_0_15px_rgba(184,150,12,0.1)]"
                        style={{
                          background: "rgba(184,150,12,0.08)",
                          border: "1px solid rgba(184,150,12,0.1)",
                        }}
                      >
                        <feature.icon size={18} style={{ color: "#D4AF37" }} />
                      </div>
                      <h3 className="text-base font-semibold mb-2.5 tracking-[-0.01em]" style={{ color: "#FDFDFD" }}>
                        {feature.title}
                      </h3>
                      <p className="text-sm leading-[1.7]" style={{ color: "rgba(253,253,253,0.35)" }}>
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <Reveal>
          <section className="py-24 px-8 border-y" style={{ borderColor: "rgba(253,253,253,0.04)" }}>
            <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
              {[
                { value: "2hrs", label: "Saved per day" },
                { value: "97%", label: "Briefing accuracy" },
                { value: "< 3min", label: "Setup time" },
                { value: "0", label: "Passwords stored" },
              ].map((stat, i) => (
                <Reveal key={stat.label} delay={i * 0.08}>
                  <div>
                    <p
                      className="text-4xl sm:text-5xl font-bold mb-2 tracking-[-0.03em]"
                      style={{
                        background: "linear-gradient(140deg, #E8D48B 0%, #D4AF37 40%, #B8960C 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {stat.value}
                    </p>
                    <p className="text-sm" style={{ color: "rgba(253,253,253,0.3)" }}>{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ─── Testimonials ─── */}
        <section className="py-36 px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="text-center mb-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-5" style={{ color: "#B8960C" }}>
                  Trusted by leaders
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em]">
                  What early users say.
                </h2>
              </div>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { quote: "I used to dread Monday mornings. Now I wake up already knowing my top 3 priorities.", name: "James Mitchell", role: "COO, Growth-stage SaaS" },
                { quote: "The commitment tracker alone has saved me from dropping the ball on three board-level promises.", name: "Amara Osei", role: "VP Operations, Private Equity" },
              ].map((t, i) => (
                <Reveal key={t.name} delay={i * 0.1}>
                  <div
                    className="rounded-2xl border p-8 relative overflow-hidden group transition-all duration-500 hover:border-[rgba(253,253,253,0.08)] h-full"
                    style={{
                      borderColor: "rgba(253,253,253,0.04)",
                      background: "rgba(253,253,253,0.015)",
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
                      style={{
                        background: "radial-gradient(circle at 0% 0%, rgba(184,150,12,0.06) 0%, transparent 70%)",
                      }}
                    />
                    <div className="relative">
                      <p className="text-6xl leading-none mb-4" style={{ color: "rgba(184,150,12,0.15)" }}>&ldquo;</p>
                      <p className="text-base leading-[1.7] mb-8" style={{ color: "rgba(253,253,253,0.6)" }}>
                        {t.quote}
                      </p>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#FDFDFD" }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(253,253,253,0.3)" }}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-36 px-8 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 60% at 50% 80%, rgba(184,150,12,0.06) 0%, transparent 60%)",
            }}
          />
          <Reveal>
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-[-0.03em] mb-6 leading-[1.05]">
                Ready to lead
                <br />
                <span
                  style={{
                    background: "linear-gradient(140deg, #E8D48B 0%, #D4AF37 30%, #B8960C 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 40px rgba(184,150,12,0.1))",
                  }}
                >
                  with intelligence?
                </span>
              </h2>
              <p className="text-lg mb-12" style={{ color: "rgba(253,253,253,0.35)" }}>
                Your mornings are about to change.
              </p>
              <button
                className="text-[13px] font-semibold px-10 py-4 rounded-xl flex items-center gap-2.5 mx-auto transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(145deg, #D4AF37 0%, #B8960C 100%)",
                  color: "#030305",
                  boxShadow: "0 0 40px rgba(184,150,12,0.2), 0 0 80px rgba(184,150,12,0.08), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
                Join the waitlist
                <ArrowRight size={15} />
              </button>
            </div>
          </Reveal>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t py-10 px-8" style={{ borderColor: "rgba(253,253,253,0.04)" }}>
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap size={14} style={{ color: "rgba(184,150,12,0.5)" }} />
              <span className="text-[13px] font-medium" style={{ color: "rgba(253,253,253,0.25)" }}>
                Donna
              </span>
            </div>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Security", "Twitter"].map((link) => (
                <a key={link} href="#" className="text-xs transition-colors hover:text-[rgba(253,253,253,0.4)]" style={{ color: "rgba(253,253,253,0.18)" }}>
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(212,175,55,0.6); }
          50% { opacity: 0.5; box-shadow: 0 0 4px rgba(212,175,55,0.3); }
        }
        @keyframes pulse-orb {
          0%, 100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, 0) scale(1.05); }
        }
        @keyframes float-right {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}
