"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ExternalLink, Palette, Moon, Sun, Sparkles, Layers } from "lucide-react";

const variations = [
  {
    id: "current",
    name: "Brass & Paper",
    subtitle: "Premium white, warm brass accents, 3D globe",
    description:
      "The original showcase — clean premium white with brass gold accents and a Three.js wireframe globe. Sophisticated and understated.",
    href: "/",
    gradient: "linear-gradient(135deg, #FAFAF8 0%, #F2F2EF 50%, #C8C7C0 100%)",
    accent: "#8C7A4A",
    icon: Sun,
    tags: ["Light", "3D", "Warm"],
  },
  {
    id: "v1",
    name: "Dawn",
    subtitle: "Editorial warmth, serif-forward, magazine feel",
    description:
      "Rich midnight backgrounds with warm dawn (#E8845C) accents. Cormorant Garamond italic headlines create an editorial, magazine-quality experience.",
    href: "/v1",
    gradient: "linear-gradient(135deg, #1B1F3A 0%, #2D3154 50%, #E8845C 100%)",
    accent: "#E8845C",
    icon: Sparkles,
    tags: ["Dark Hero", "Editorial", "Warm"],
  },
  {
    id: "v2",
    name: "Clarity",
    subtitle: "Clean SaaS, data-forward, blue precision",
    description:
      "Minimal white space with dusk blue (#4E7DAA) accents. Data-forward layout with before/after split, timeline, and crisp feature cards. Think Linear meets intelligence.",
    href: "/v2",
    gradient: "linear-gradient(135deg, #FAFAF8 0%, #F0EDE9 50%, #4E7DAA 100%)",
    accent: "#4E7DAA",
    icon: Palette,
    tags: ["Light", "Minimal", "SaaS"],
  },
  {
    id: "v3",
    name: "Command",
    subtitle: "Dark mode intelligence, terminal aesthetic",
    description:
      "Full dark mode using deep (#0E1225) and midnight (#1B1F3A). Terminal-style briefing mockup, scrolling intelligence feed. Bloomberg Terminal meets luxury brand.",
    href: "/v3",
    gradient: "linear-gradient(135deg, #0E1225 0%, #1B1F3A 50%, #E8845C 100%)",
    accent: "#E8845C",
    icon: Moon,
    tags: ["Dark", "Terminal", "Power"],
  },
  {
    id: "v4",
    name: "Command + Dawn",
    subtitle: "V3 hero meets V1 editorial body — the best of both",
    description:
      "The dark intelligence hero from Command (grid bg, scan line, live feed) transitions into Dawn's warm editorial sections — problem statement, Telegram briefing, pillars, manifesto.",
    href: "/v4",
    gradient: "linear-gradient(135deg, #0E1225 0%, #1B1F3A 30%, #FBF7F4 70%, #E8845C 100%)",
    accent: "#E8845C",
    icon: Layers,
    tags: ["Hybrid", "Dark Hero", "Editorial"],
  },
];

export default function ShowcasePage() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          `,
        }}
      />
      <div
        style={{
          minHeight: "100vh",
          background: "#0E1225",
          fontFamily: "'Inter', sans-serif",
          color: "#FBF7F4",
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: "48px 64px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: "#E8845C",
                marginBottom: 8,
              }}
            >
              LANDING PAGE SHOWCASE
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 42,
                fontWeight: 300,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                color: "#FBF7F4",
              }}
            >
              Donna
            </div>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#9BAFC4",
              letterSpacing: "0.06em",
            }}
          >
            5 VARIATIONS
          </div>
        </header>

        {/* Divider */}
        <div
          style={{
            height: 1,
            margin: "32px 64px 0",
            background:
              "linear-gradient(90deg, #E8845C, transparent)",
            opacity: 0.3,
          }}
        />

        {/* Description */}
        <div style={{ padding: "40px 64px 0", maxWidth: 640 }}>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.8,
              color: "#9BAFC4",
            }}
          >
            Five distinct landing page directions for Donna — each exploring a
            different visual tone while preserving the core brand identity.
            Click any card to view the full page.
          </p>
        </div>

        {/* Cards Grid */}
        <div
          style={{
            padding: "48px 64px 80px",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }}
        >
          {variations.map((v) => {
            const isHovered = hovered === v.id;
            const Icon = v.icon;
            return (
              <Link
                key={v.id}
                href={v.href}
                onMouseEnter={() => setHovered(v.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#1B1F3A",
                  border: `1px solid ${
                    isHovered
                      ? `${v.accent}44`
                      : "rgba(155,175,196,0.1)"
                  }`,
                  transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                  transform: isHovered ? "translateY(-4px)" : "none",
                  boxShadow: isHovered
                    ? `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${v.accent}22`
                    : "0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                {/* Preview gradient strip */}
                <div
                  style={{
                    height: 160,
                    background: v.gradient,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    size={32}
                    style={{
                      color: "#FBF7F4",
                      opacity: 0.6,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      opacity: isHovered ? 1 : 0,
                      transition: "opacity 0.3s",
                    }}
                  >
                    <ExternalLink size={16} color="#FBF7F4" />
                  </div>
                </div>

                {/* Card content */}
                <div style={{ padding: "28px 32px 32px" }}>
                  {/* Tags */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {v.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" as const,
                          padding: "4px 10px",
                          borderRadius: 2,
                          background: `${v.accent}15`,
                          color: v.accent,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontFamily:
                        "'Cormorant Garamond', Georgia, serif",
                      fontSize: 28,
                      fontWeight: 400,
                      fontStyle: "italic",
                      color: "#FBF7F4",
                      marginBottom: 4,
                    }}
                  >
                    {v.name}
                  </h2>

                  {/* Subtitle */}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: v.accent,
                      letterSpacing: "0.04em",
                      marginBottom: 16,
                    }}
                  >
                    {v.subtitle}
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: "#9BAFC4",
                      marginBottom: 20,
                    }}
                  >
                    {v.description}
                  </p>

                  {/* View link */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      color: isHovered ? v.accent : "#9BAFC4",
                      transition: "color 0.3s",
                    }}
                  >
                    View Landing Page
                    <ArrowRight
                      size={14}
                      style={{
                        transform: isHovered
                          ? "translateX(4px)"
                          : "none",
                        transition: "transform 0.3s",
                      }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <footer
          style={{
            padding: "0 64px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18,
              fontWeight: 300,
              fontStyle: "italic",
              color: "rgba(155,175,196,0.4)",
            }}
          >
            Donna Brand System 2026
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "rgba(155,175,196,0.3)",
              letterSpacing: "0.1em",
            }}
          >
            PERSONAL INTELLIGENCE
          </div>
        </footer>
      </div>
    </>
  );
}
