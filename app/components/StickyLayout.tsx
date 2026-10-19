// StickyLayout.tsx – provides a sticky preview area and fixed footer for tool pages
// Usage: Wrap your tool page content with <StickyLayout preview={...} footer={...}>controls...</StickyLayout>

import React from "react";

interface StickyLayoutProps {
  /** The preview component that should stay sticky at the top (e.g., live canvas) */
  preview: React.ReactNode;
  /** Optional footer containing primary actions (export, print, share) */
  footer?: React.ReactNode;
  /** Main control area (settings, sliders, etc.) */
  children: React.ReactNode;
}

export default function StickyLayout({ preview, footer, children }: StickyLayoutProps) {
  return (
    <div className="sticky-layout">
      <div className="sticky-preview" style={{ position: "sticky", top: 0, zIndex: 10, background: "white" }}>
        {preview}
      </div>
      <div className="layout-controls" style={{ padding: "1rem" }}>
        {children}
      </div>
      {footer && (
        <div
          className="sticky-footer"
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            background: "white",
            borderTop: "1px solid #e0e0e0",
            padding: "0.5rem",
            textAlign: "center",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/*
  Minimal CSS (add to globals.css or a dedicated module):
  .sticky-layout { display: flex; flex-direction: column; }
  .sticky-preview { width: 100%; }
  .layout-controls { flex: 1; }
  .sticky-footer { width: 100%; }
*/
