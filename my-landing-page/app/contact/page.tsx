"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Mail, MessageSquare } from "lucide-react";

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

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
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
            Message sent
          </h1>
          <p className="text-[15px] leading-relaxed mb-10" style={{ color: c.textTertiary }}>
            Thank you for reaching out. We&apos;ll get back to you within 24 hours.
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
      className="min-h-screen px-6 py-20"
      style={{ fontFamily: "'Satoshi', sans-serif", background: c.bg, color: c.text }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[12px] font-medium mb-16 transition-colors hover:text-[#1A1917]"
          style={{ color: c.textQuaternary }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <div className="grid lg:grid-cols-5 gap-16">
          {/* Left: Info */}
          <div className="lg:col-span-2">
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
              className="text-4xl font-black tracking-[-0.03em] mb-4 leading-[1.1]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Get in touch
            </h1>
            <p className="text-[15px] leading-[1.7] mb-12" style={{ color: c.textTertiary }}>
              Have a question about Donna? Want to discuss enterprise
              pricing or a partnership? We&apos;d love to hear from you.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: c.brassSubtle, border: `1px solid ${c.brassBorder}` }}
                >
                  <Mail size={16} style={{ color: c.brass }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold mb-1">Email us</p>
                  <a
                    href="mailto:hello@chiefofstaff.ai"
                    className="text-[14px] transition-colors hover:text-[#8C7A4A]"
                    style={{ color: c.textTertiary }}
                  >
                    hello@chiefofstaff.ai
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: c.brassSubtle, border: `1px solid ${c.brassBorder}` }}
                >
                  <MessageSquare size={16} style={{ color: c.brass }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold mb-1">Enterprise sales</p>
                  <a
                    href="mailto:sales@chiefofstaff.ai"
                    className="text-[14px] transition-colors hover:text-[#8C7A4A]"
                    style={{ color: c.textTertiary }}
                  >
                    sales@chiefofstaff.ai
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl border p-8 sm:p-10"
              style={{
                borderColor: c.border,
                background: c.surface,
                boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
                      style={{ color: c.textQuaternary }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)]"
                      style={{
                        borderColor: c.border,
                        background: c.bg,
                        color: c.text,
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
                      style={{ color: c.textQuaternary }}
                    >
                      Email
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
                        background: c.bg,
                        color: c.text,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
                    style={{ color: c.textQuaternary }}
                  >
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)] appearance-none"
                    style={{
                      borderColor: c.border,
                      background: c.bg,
                      color: subject ? c.text : c.textGhost,
                    }}
                  >
                    <option value="" disabled>Select a topic</option>
                    <option value="general">General inquiry</option>
                    <option value="enterprise">Enterprise pricing</option>
                    <option value="partnership">Partnership</option>
                    <option value="support">Support</option>
                    <option value="press">Press &amp; media</option>
                  </select>
                </div>

                <div>
                  <label
                    className="block text-[12px] font-semibold uppercase tracking-[0.1em] mb-2"
                    style={{ color: c.textQuaternary }}
                  >
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us how we can help..."
                    required
                    rows={5}
                    className="w-full text-[15px] px-4 py-3.5 rounded-xl border outline-none transition-all duration-300 focus:border-[rgba(140,122,74,0.3)] focus:shadow-[0_0_0_3px_rgba(140,122,74,0.06)] resize-none"
                    style={{
                      borderColor: c.border,
                      background: c.bg,
                      color: c.text,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full text-[14px] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_2px_16px_rgba(26,25,23,0.12)]"
                  style={{ background: c.text, color: c.bg }}
                >
                  Send message
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
