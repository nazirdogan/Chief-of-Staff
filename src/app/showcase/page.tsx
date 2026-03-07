"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

const landingPages = [
  {
    id: "1",
    title: "The Private Office",
    subtitle: "Editorial typography. Warm authority. Asymmetric layout.",
    description:
      "Typography-led design with deep warm charcoal surfaces, brushed brass accents, and the quiet confidence of an executive environment that doesn't need to prove itself.",
    tags: ["Editorial", "Warm Charcoal", "Typography-led"],
    status: "New direction",
  },
  {
    id: "2",
    title: "The Observatory",
    subtitle: "Ambient gradients. Atmospheric depth.",
    description:
      "Layered glass surfaces, subtle glow effects, and atmospheric gradients that convey intelligence at work.",
    tags: ["Gradient", "Glass morphism", "Atmospheric"],
    status: "Draft",
  },
  {
    id: "3",
    title: "The Concierge",
    subtitle: "Editorial precision. Structured narrative.",
    description:
      "Structured sections with editorial hierarchy, inline feature demos, and a narrative flow that builds trust.",
    tags: ["Editorial", "Structured", "Narrative"],
    status: "Draft",
  },
  {
    id: "4",
    title: "The Signal",
    subtitle: "Visual storytelling. Cinematic depth. Atmospheric design.",
    description:
      "Dark cinematic aesthetic with atmospheric light effects, bold editorial typography, animated counters, and immersive gradient layers that convey intelligence emerging from noise.",
    tags: ["Cinematic", "Atmospheric", "Storytelling"],
    status: "New direction",
  },
];

export default function ShowcasePage() {
  const [mounted, setMounted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional hydration guard
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: "#121210",
        color: "#FDFDFD",
      }}
    >
      {/* Warm paper texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: 0.018,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(253,253,253,0.3) 0px, rgba(253,253,253,0.3) 1px, transparent 1px, transparent 140px)",
        }}
      />

      <div className="relative z-[1]">
        {/* Header */}
        <header
          style={{
            borderBottom: "1px solid rgba(168,153,104,0.08)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "none" : "translateY(-8px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <div className="mx-auto max-w-6xl px-8 py-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{
                  background: "#1C1C19",
                  border: "1px solid rgba(168,153,104,0.12)",
                  color: "#A89968",
                }}
              >
                CS
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-[-0.02em]" style={{ color: "#FDFDFD" }}>
                  Donna
                </h1>
                <p
                  className="text-[11px] uppercase tracking-[0.15em] font-medium mt-0.5"
                  style={{ color: "#6B6B63" }}
                >
                  Design Showcase
                </p>
              </div>
            </div>
            <span
              className="text-[11px] font-medium px-3.5 py-1.5 rounded-full"
              style={{
                border: "1px solid rgba(168,153,104,0.12)",
                color: "#A89968",
                background: "rgba(168,153,104,0.04)",
              }}
            >
              {landingPages.length} concepts
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-6xl px-8 pt-20 pb-32">
          <div
            className="mb-24"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "none" : "translateY(16px)",
              transition: "opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s",
            }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.25em] font-semibold mb-6"
              style={{ color: "#A89968" }}
            >
              Internal Review
            </p>
            <h2
              className="text-5xl sm:text-6xl font-bold tracking-[-0.035em] leading-[1.05] mb-6"
            >
              <span style={{ color: "#FDFDFD" }}>Landing Page</span>
              <br />
              <span style={{ color: "#4A4A44" }}>Options</span>
            </h2>
            <p className="text-base max-w-md leading-[1.75]" style={{ color: "#6B6B63" }}>
              Select a concept to preview. Each design explores a different
              strategic direction for the brand.
            </p>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {landingPages.map((page, i) => {
              const isHovered = hoveredCard === page.id;
              const isNew = page.status === "New direction";
              return (
                <Link key={page.id} href={`/showcase/${page.id}`}>
                  <div
                    className="group relative rounded-2xl cursor-pointer overflow-hidden"
                    style={{
                      border: `1px solid ${isHovered ? "rgba(168,153,104,0.15)" : isNew ? "rgba(168,153,104,0.08)" : "rgba(253,253,253,0.03)"}`,
                      background: isHovered ? "#1A1A17" : isNew ? "rgba(168,153,104,0.02)" : "#161614",
                      transition: "border-color 0.4s ease, background 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)",
                      transform: isHovered ? "translateY(-1px)" : "none",
                      opacity: mounted ? 1 : 0,
                      animation: mounted
                        ? `card-in 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.1}s both`
                        : "none",
                    }}
                    onMouseEnter={() => setHoveredCard(page.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="p-8 sm:p-10 flex items-start justify-between gap-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-4">
                          <span
                            className="text-[13px] font-semibold tabular-nums"
                            style={{
                              color: isHovered ? "#A89968" : "#4A4A44",
                              transition: "color 0.4s ease",
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div
                            className="h-px w-8"
                            style={{
                              background: isHovered ? "rgba(168,153,104,0.25)" : "rgba(253,253,253,0.05)",
                              transition: "background 0.4s ease",
                            }}
                          />
                          <h3 className="text-xl font-bold tracking-[-0.02em]" style={{ color: "#FDFDFD" }}>
                            {page.title}
                          </h3>
                          {isNew && (
                            <span
                              className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded"
                              style={{ background: "rgba(168,153,104,0.1)", color: "#A89968" }}
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-2 pl-[88px]" style={{ color: "#A8A8A0" }}>
                          {page.subtitle}
                        </p>
                        <p className="text-sm leading-[1.7] max-w-lg pl-[88px]" style={{ color: "#6B6B63" }}>
                          {page.description}
                        </p>
                        <div className="flex gap-2 mt-5 pl-[88px]">
                          {page.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] uppercase tracking-[0.08em] font-medium px-2.5 py-1 rounded"
                              style={{
                                background: isHovered ? "rgba(168,153,104,0.06)" : "rgba(253,253,253,0.025)",
                                color: isHovered ? "#A89968" : "#4A4A44",
                                transition: "background 0.4s ease, color 0.4s ease",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-2 mt-1 shrink-0"
                        style={{
                          color: isHovered ? "#A89968" : "#3A3A35",
                          transform: isHovered ? "translateX(3px)" : "none",
                          transition: "color 0.4s ease, transform 0.4s ease",
                        }}
                      >
                        <span className="text-[11px] font-medium hidden sm:inline uppercase tracking-wide">
                          Preview
                        </span>
                        <ArrowRight size={15} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid rgba(168,153,104,0.06)" }}>
          <div className="mx-auto max-w-6xl px-8 py-8 flex items-center justify-between">
            <p className="text-[11px]" style={{ color: "#3A3A35" }}>
              Donna — Internal Design Review
            </p>
            <p className="text-[11px]" style={{ color: "#3A3A35" }}>
              Confidential
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
