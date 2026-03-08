"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const c = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "rgba(120,110,80,0.1)",
  borderHover: "rgba(120,110,80,0.22)",
  brass: "#8C7A4A",
  brassSubtle: "rgba(140,122,74,0.06)",
  brassBorder: "rgba(140,122,74,0.12)",
  text: "#1A1917",
  textSecondary: "#3D3C37",
  textTertiary: "#6E6D65",
  textQuaternary: "#9C9B93",
  textGhost: "#C8C7C0",
};

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ fontFamily: "'Satoshi', sans-serif", background: c.bg, color: c.text }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ background: c.brassSubtle, border: `1px solid ${c.brassBorder}` }}
          >
            <Check size={28} style={{ color: c.brass }} />
          </div>
          <h1
            className="text-3xl font-black tracking-[-0.03em] mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            You&apos;re on the list
          </h1>
          <p className="text-[15px] leading-relaxed mb-10" style={{ color: c.textTertiary }}>
            We&apos;ll review your application and get back to you within 48 hours.
            Keep an eye on your inbox.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[13px] font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:shadow-[0_2px_12px_rgba(26,25,23,0.12)]"
            style={{ background: c.text, color: c.bg }}
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ fontFamily: "'Satoshi', sans-serif", background: c.bg, color: c.text }}
    >
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] font-medium mb-12 transition-colors hover:text-[#1A1917]"
          style={{ color: c.textQuaternary }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-black"
            style={{ background: c.text, color: c.bg }}
          >
            CS
          </div>
          <span className="text-lg font-bold tracking-[-0.02em]">Donna</span>
        </div>

        <h1
          className="text-3xl font-black tracking-[-0.03em] mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Request early access
        </h1>
        <p className="text-[15px] mb-10" style={{ color: c.textTertiary }}>
          Join 140+ executives who start every morning with clarity.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="space-y-5"
        >
          <div>
            <label
              className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
              style={{ color: c.textQuaternary }}
            >
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)]"
              style={{
                borderColor: c.border,
                background: c.surface,
                color: c.text,
              }}
            />
          </div>

          <div>
            <label
              className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
              style={{ color: c.textQuaternary }}
            >
              Work email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)]"
              style={{
                borderColor: c.border,
                background: c.surface,
                color: c.text,
              }}
            />
          </div>

          <div>
            <label
              className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
              style={{ color: c.textQuaternary }}
            >
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company name"
              className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)]"
              style={{
                borderColor: c.border,
                background: c.surface,
                color: c.text,
              }}
            />
          </div>

          <button
            type="submit"
            className="w-full text-[14px] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_2px_16px_rgba(26,25,23,0.12)]"
            style={{ background: c.text, color: c.bg }}
          >
            Request access
            <ArrowRight size={15} />
          </button>
        </form>

        <p className="text-center text-[13px] mt-8" style={{ color: c.textQuaternary }}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:text-[#8C7A4A]"
            style={{ color: c.text }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
