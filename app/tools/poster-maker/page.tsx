"use client";

import { useState } from "react";
import Link from "next/link";

interface PosterPreset {
  id: string;
  title: string;
  headline: string;
  subtitle: string;
  bullets: string[];
  footer: string;
  theme: "red" | "blue" | "yellow" | "dark";
}

const POSTER_PRESETS: PosterPreset[] = [
  {
    id: "cyber-services",
    title: "Cyber Cafe & Online Services",
    headline: "ONLINE SERVICES AVAILABLE HERE",
    subtitle: "सभी प्रकार के ऑनलाइन फॉर्म एवं सरकारी योजनाओं के कार्य किए जाते हैं",
    bullets: [
      "✓ Aadhaar Print & Address Update",
      "✓ New PAN Card Apply & Correction",
      "✓ Voter ID Card Apply & Download",
      "✓ All Govt. Job & Exam Form Fill",
      "✓ Passport Size Photo (Instant 2 Min)",
      "✓ Color & Black/White Print / Lamination",
      "✓ Money Transfer & Bill Payments",
    ],
    footer: "Contact: +91 98765 43210 | Open: 8:00 AM - 9:00 PM",
    theme: "blue",
  },
  {
    id: "shop-closed",
    title: "Shop Closed / Holiday Notice",
    headline: "NOTICE: SHOP WILL REMAIN CLOSED",
    subtitle: "सूचना: आवश्यक कार्यवश दुकान बंद रहेगी",
    bullets: [
      "Due to Festival / Family Function, the shop will remain closed.",
      "Re-opening on Monday at 09:00 AM as usual.",
      "For urgent queries, kindly reach out via WhatsApp.",
    ],
    footer: "Inconvenience is deeply regretted. Thank you!",
    theme: "red",
  },
  {
    id: "urgent-vacancy",
    title: "Urgent Staff / Job Vacancy",
    headline: "URGENT REQUIREMENT / STAFF NEEDED",
    subtitle: "आवश्यकता है: कंप्यूटर ऑपरेटर एवं काउंटर असिस्टेंट",
    bullets: [
      "Position: Computer Operator / Print Assistant",
      "Requirements: Good typing speed (Hindi & English), Basic MS Office",
      "Experience: Freshers & Experienced both welcome",
      "Attractive Salary + Monthly Incentive",
    ],
    footer: "Call / WhatsApp for Interview: +91 98765 43210",
    theme: "yellow",
  },
  {
    id: "to-let",
    title: "To-Let / Room / Shop For Rent",
    headline: "TO - LET / FOR RENT",
    subtitle: "किराए के लिए उपलब्ध है",
    bullets: [
      "Spacious Commercial Shop / 2 BHK Residential Floor",
      "24 Hours Water Supply & Separate Electric Meter",
      "Prime Location on Main Road with Ample Parking",
      "Suitable for Cyber Cafe, Clinic, Office, or Family",
    ],
    footer: "For Site Visit & Details: Call +91 98765 43210",
    theme: "dark",
  },
];

export default function PosterMakerPage() {
  const [headline, setHeadline] = useState(POSTER_PRESETS[0].headline);
  const [subtitle, setSubtitle] = useState(POSTER_PRESETS[0].subtitle);
  const [bulletsText, setBulletsText] = useState(POSTER_PRESETS[0].bullets.join("\n"));
  const [footer, setFooter] = useState(POSTER_PRESETS[0].footer);
  const [theme, setTheme] = useState<"red" | "blue" | "yellow" | "dark">("blue");

  function applyPreset(p: PosterPreset) {
    setHeadline(p.headline);
    setSubtitle(p.subtitle);
    setBulletsText(p.bullets.join("\n"));
    setFooter(p.footer);
    setTheme(p.theme);
  }

  const bullets = bulletsText.split("\n").filter((b) => b.trim().length > 0);

  return (
    <div className="tool-page-container">
      <header className="tool-header">
        <div className="tool-header-inner wrap">
          <div className="tool-breadcrumbs">
            <Link href="/" className="crumb-home">
              ← All Tools
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Shop Poster & Notice Maker</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Bold Print Templates</span>
            <span className="badge-local">High-Res A4 Print</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Shop Notice, Poster & Signboard Maker</h1>
          <p className="tool-desc">
            Instantly create eye-catching A4 posters for cyber cafes, print shops, notices, rental banners, and vacancies.
            High-contrast formatting designed to be readable from a distance.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="presets-banner">
          <span className="banner-title">Choose Template:</span>
          <div className="banner-pills">
            {POSTER_PRESETS.map((p) => (
              <button key={p.id} className="pill-btn" onClick={() => applyPreset(p)}>
                <strong>{p.title}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="workbench-grid">
          {/* Left Form */}
          <div className="crop-editor-card">
            <div className="card-header">
              <h3>1. Customize Poster Content</h3>
            </div>

            <div className="control-group">
              <label className="control-label">Color Theme:</label>
              <div className="theme-pills-row">
                <button
                  className={`theme-pill ${theme === "blue" ? "active" : ""}`}
                  style={{ backgroundColor: "#1e3a8a", color: "#fff" }}
                  onClick={() => setTheme("blue")}
                >
                  Navy Blue
                </button>
                <button
                  className={`theme-pill ${theme === "red" ? "active" : ""}`}
                  style={{ backgroundColor: "#b91c1c", color: "#fff" }}
                  onClick={() => setTheme("red")}
                >
                  Crimson Red
                </button>
                <button
                  className={`theme-pill ${theme === "yellow" ? "active" : ""}`}
                  style={{ backgroundColor: "#facc15", color: "#000" }}
                  onClick={() => setTheme("yellow")}
                >
                  High-Vis Yellow
                </button>
                <button
                  className={`theme-pill ${theme === "dark" ? "active" : ""}`}
                  style={{ backgroundColor: "#0f172a", color: "#fff" }}
                  onClick={() => setTheme("dark")}
                >
                  Classic Dark
                </button>
              </div>
            </div>

            <div className="control-group">
              <label className="control-label">Main Headline:</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. ONLINE SERVICES HERE"
              />
            </div>

            <div className="control-group">
              <label className="control-label">Subtitle / Description:</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Short explanatory tagline"
              />
            </div>

            <div className="control-group">
              <label className="control-label">List Points (One per line):</label>
              <textarea
                rows={6}
                value={bulletsText}
                onChange={(e) => setBulletsText(e.target.value)}
                placeholder="Enter points..."
              />
            </div>

            <div className="control-group">
              <label className="control-label">Footer Contact / Address:</label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Contact details or timings"
              />
            </div>
          </div>

          {/* Right Live Poster Preview */}
          <div className="result-preview-card">
            <div className="card-header">
              <h3>2. A4 Poster Preview</h3>
              <button className="btn-print-direct" onClick={() => window.print()}>
                Print / Save A4 Poster 🖨️
              </button>
            </div>

            <div className={`poster-render-frame theme-${theme}`}>
              <div className="poster-inner-border">
                <div className="poster-headline-box">
                  <h1>{headline}</h1>
                  {subtitle && <p className="poster-subhead">{subtitle}</p>}
                </div>

                <div className="poster-bullets-list">
                  {bullets.map((b, i) => (
                    <div key={i} className="poster-bullet-item">
                      <span className="bullet-text">{b}</span>
                    </div>
                  ))}
                </div>

                {footer && (
                  <div className="poster-footer-box">
                    <p>{footer}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="export-actions-row">
              <button className="btn-export-pdf" onClick={() => window.print()}>
                Print / Save High-Res A4 Poster 🖨️
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
