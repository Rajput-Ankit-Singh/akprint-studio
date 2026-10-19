"use client";

import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { warpPerspective, Point, Quad, estimateQuadDimensions } from "@/lib/perspective";
import UploadZone from "@/components/UploadZone";
import StickyLayout from "@/components/StickyLayout";
import { imagesToPdf, createPdfBlob } from "@/lib/pdf";

interface DocSide {
  id: string;
  name: string;
  url: string;
  imgElement: HTMLImageElement | null;
  width: number;
  height: number;
  quad: Quad;
  croppedCanvas: HTMLCanvasElement | null;
  brightness: number;
  contrast: number;
  rotation: number;
}

const PRESETS = [
  { name: "A4 Document", widthMm: 210, heightMm: 297, aspect: 210 / 297 },
  { name: "ID Card (CR80)", widthMm: 85.6, heightMm: 53.98, aspect: 85.6 / 53.98 },
  { name: "Receipt / Slip", widthMm: 80, heightMm: 120, aspect: 80 / 120 },
  { name: "Square", widthMm: 100, heightMm: 100, aspect: 1.0 },
];

export default function DocumentCropPage() {
  const [sides, setSides] = useState<DocSide[]>([]);
  const [activeSideIndex, setActiveSideIndex] = useState(0);
  const [activePreset, setActivePreset] = useState(PRESETS[0]);
  const [customWidthMm, setCustomWidthMm] = useState(210);
  const [customHeightMm, setCustomHeightMm] = useState(297);
  const [draggingCorner, setDraggingCorner] = useState<keyof Quad | null>(null);
  const [status, setStatus] = useState("Upload a document photo or scan to begin straightening.");
  const [sheetCopies, setSheetCopies] = useState(1);
  const [sheetMarginMm, setSheetMarginMm] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const activeSide = sides[activeSideIndex];

  // Load new images
  function handleFiles(files: FileList) {
  const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (!fileArray.length) return;

  fileArray.forEach((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const quad: Quad = {
        topLeft: { x: w * 0.06, y: h * 0.06 },
        topRight: { x: w * 0.94, y: h * 0.06 },
        bottomRight: { x: w * 0.94, y: h * 0.94 },
        bottomLeft: { x: w * 0.06, y: h * 0.94 },
      };
      const newSide: DocSide = {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        url,
        imgElement: img,
        width: w,
        height: h,
        quad,
        croppedCanvas: null,
        brightness: 100,
        contrast: 100,
        rotation: 0,
      };
      setSides((prev) => [...prev, newSide]);
      setStatus(`Loaded "${file.name}". Adjust the 4 corner handles and click Apply Crop.`);
    };
    img.src = url;
  });
}


  // Pointer handling for 4-corner crop
  function handleCornerPointerDown(e: PointerEvent, corner: keyof Quad) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingCorner(corner);
  }

  function handleEditorPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingCorner || !activeSide || !editorContainerRef.current) return;
    const rect = editorContainerRef.current.getBoundingClientRect();

    // Map screen coordinate to original image space
    const scaleX = activeSide.width / rect.width;
    const scaleY = activeSide.height / rect.height;

    const imgX = Math.max(0, Math.min(activeSide.width, (e.clientX - rect.left) * scaleX));
    const imgY = Math.max(0, Math.min(activeSide.height, (e.clientY - rect.top) * scaleY));

    setSides((prev) => {
      const copy = [...prev];
      const side = { ...copy[activeSideIndex] };
      side.quad = {
        ...side.quad,
        [draggingCorner]: { x: Math.round(imgX), y: Math.round(imgY) },
      };
      copy[activeSideIndex] = side;
      return copy;
    });
  }

  function handleEditorPointerUp() {
    setDraggingCorner(null);
  }

  // Apply perspective crop
  function applyPerspectiveCrop() {
    if (!activeSide || !activeSide.imgElement) return;
    const currentImg = activeSide.imgElement;
    setIsProcessing(true);
    setStatus("Warping perspective and straightening document...");

    setTimeout(() => {
      try {
        const est = estimateQuadDimensions(activeSide.quad);
        // Desired output dimension
        let targetW: number;
        let targetH: number;

        if (activePreset.name === "Custom Size") {
          const dpi = 200;
          targetW = Math.round((customWidthMm / 25.4) * dpi);
          targetH = Math.round((customHeightMm / 25.4) * dpi);
        } else {
          // Use natural quad scale with preset aspect ratio
          targetH = Math.max(800, est.height);
          targetW = Math.round(targetH * activePreset.aspect);
        }

        const warpedCanvas = warpPerspective(
          currentImg,
          activeSide.quad,
          targetW,
          targetH,
          32
        );

        // Apply filters
        const filteredCanvas = document.createElement("canvas");
        filteredCanvas.width = warpedCanvas.width;
        filteredCanvas.height = warpedCanvas.height;
        const ctx = filteredCanvas.getContext("2d");
        if (ctx) {
          ctx.filter = `brightness(${activeSide.brightness}%) contrast(${activeSide.contrast}%)`;
          ctx.drawImage(warpedCanvas, 0, 0);
        }

        setSides((prev) => {
          const copy = [...prev];
          copy[activeSideIndex] = {
            ...copy[activeSideIndex],
            croppedCanvas: filteredCanvas,
          };
          return copy;
        });

        setStatus("Document straightened successfully! Review the A4 preview below or download.");
      } catch (err) {
        setStatus("Perspective correction failed: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  }

  // Rotate corners 90 degrees
  function rotateCorners() {
    if (!activeSide) return;
    const w = activeSide.width;
    const h = activeSide.height;
    // Rotate corners clockwise: new x = h - old y, new y = old x (if aspect swapped)
    const q = activeSide.quad;
    setSides((prev) => {
      const copy = [...prev];
      copy[activeSideIndex] = {
        ...copy[activeSideIndex],
        quad: {
          topLeft: { x: q.bottomLeft.x, y: q.bottomLeft.y },
          topRight: { x: q.topLeft.x, y: q.topLeft.y },
          bottomRight: { x: q.topRight.x, y: q.topRight.y },
          bottomLeft: { x: q.bottomRight.x, y: q.bottomRight.y },
        },
      };
      return copy;
    });
    setStatus("Rotated crop corners 90°.");
  }

  // Reset corners to border
  function resetCorners() {
    if (!activeSide) return;
    const w = activeSide.width;
    const h = activeSide.height;
    setSides((prev) => {
      const copy = [...prev];
      copy[activeSideIndex] = {
        ...copy[activeSideIndex],
        quad: {
          topLeft: { x: w * 0.05, y: h * 0.05 },
          topRight: { x: w * 0.95, y: h * 0.05 },
          bottomRight: { x: w * 0.95, y: h * 0.95 },
          bottomLeft: { x: w * 0.05, y: h * 0.95 },
        },
      };
      return copy;
    });
    setStatus("Reset crop corners to outer margins.");
  }

  // Download single cropped JPG
  function downloadCroppedJpg() {
    if (!activeSide?.croppedCanvas) return;
    const link = document.createElement("a");
    link.href = activeSide.croppedCanvas.toDataURL("image/jpeg", 0.92);
    link.download = `${activeSide.name.replace(/\.[^.]+$/, "")}-straightened.jpg`;
    link.click();
    setStatus("Downloaded straightened JPG.");
  }

  // Export A4 PDF
  async function downloadA4Pdf() {
    const validSides = sides.filter((s) => s.croppedCanvas);
    if (!validSides.length) {
      setStatus("Please crop at least one document before exporting PDF.");
      return;
    }
    setIsProcessing(true);
    setStatus("Generating print-ready A4 PDF...");

    try {
      const images = validSides.map((s) => ({
        dataUrl: s.croppedCanvas!.toDataURL("image/jpeg", 0.92),
        name: s.name,
      }));

      const pdfBytes = await imagesToPdf(images, {
        pageSize: "A4",
        orientation: "portrait",
        marginMm: sheetMarginMm,
      });

      const blob = createPdfBlob(pdfBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `documents-A4-print-${Date.now()}.pdf`;
      link.click();
      setStatus("Downloaded A4 print-ready PDF!");
    } catch (err) {
      setStatus("PDF export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  }

  // Render SVG polygon for crop overlay
  const renderQuadPolygon = () => {
    if (!activeSide) return null;
    const q = activeSide.quad;
    const w = activeSide.width;
    const h = activeSide.height;

    // Convert image coordinates to percentage
    const pTL = `${(q.topLeft.x / w) * 100}% ${(q.topLeft.y / h) * 100}%`;
    const pTR = `${(q.topRight.x / w) * 100}% ${(q.topRight.y / h) * 100}%`;
    const pBR = `${(q.bottomRight.x / w) * 100}% ${(q.bottomRight.y / h) * 100}%`;
    const pBL = `${(q.bottomLeft.x / w) * 100}% ${(q.bottomLeft.y / h) * 100}%`;

    return (
      <svg className="crop-overlay-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polygon
          points={`${q.topLeft.x},${q.topLeft.y} ${q.topRight.x},${q.topRight.y} ${q.bottomRight.x},${q.bottomRight.y} ${q.bottomLeft.x},${q.bottomLeft.y}`}
          fill="rgba(37, 99, 235, 0.18)"
          stroke="#2563eb"
          strokeWidth={Math.max(2, w / 400)}
          strokeDasharray="6 4"
        />
        <line
          x1={q.topLeft.x}
          y1={q.topLeft.y}
          x2={q.bottomRight.x}
          y2={q.bottomRight.y}
          stroke="rgba(37, 99, 235, 0.3)"
          strokeWidth="1"
        />
        <line
          x1={q.topRight.x}
          y1={q.topRight.y}
          x2={q.bottomLeft.x}
          y2={q.bottomLeft.y}
          stroke="rgba(37, 99, 235, 0.3)"
          strokeWidth="1"
        />
      </svg>
    );
  };

  return (
    <StickyLayout preview={null} footer={null}>
      {/* Top Header */}
      <header className="tool-header">
        <div className="tool-header-inner wrap">
          <div className="tool-breadcrumbs">
            <Link href="/" className="crumb-home">
              ← All Tools
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">AI & 4-Corner Document Crop</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Unlimited</span>
            <span className="badge-local">Client-side · Private</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        {/* Title row */}
        <div className="tool-heading">
          <h1>Straighten WhatsApp Photos & Crop for A4 Print</h1>
          <p className="tool-desc">
            Correct tilted document photos, receipts, and ID cards with interactive 4-corner perspective
            rectification. Ready for crisp A4 paper printing or PDF export.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="tool-section">
          <label className="upload-dropzone">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onFileChange}
            />
            <div className="dropzone-content">
              <span className="dropzone-icon">◩</span>
              <div>
                <strong>Choose Document Photos (or Drag & Drop)</strong>
                <p>Supports WhatsApp photos, mobile camera captures, JPG, PNG & WebP</p>
              </div>
              <span className="btn-browse">Browse Files</span>
            </div>
          </label>
        </section>

        {/* Document Tabs if multiple uploaded */}
        {sides.length > 0 && (
          <div className="doc-tabs-bar">
            <span className="doc-tabs-label">Uploaded Pages:</span>
            {sides.map((side, idx) => (
              <button
                key={side.id}
                className={`doc-tab-btn ${idx === activeSideIndex ? "active" : ""}`}
                onClick={() => setActiveSideIndex(idx)}
              >
                Page {idx + 1}: {side.name.slice(0, 15)}...
                {side.croppedCanvas ? " ✓" : ""}
              </button>
            ))}
          </div>
        )}

        {/* Main Workbench */}
        {activeSide ? (
          <div className="workbench-grid">
            {/* Left: Interactive 4-Corner Crop Canvas */}
            <div className="crop-editor-card">
              <div className="card-header">
                <h3>1. Adjust 4 Corners on Document Edges</h3>
                <div className="header-actions">
                  <button className="btn-sm" onClick={rotateCorners} title="Rotate handles 90°">
                    Rotate ↻
                  </button>
                  <button className="btn-sm" onClick={resetCorners} title="Reset to borders">
                    Reset ⟲
                  </button>
                </div>
              </div>

              <div
                ref={editorContainerRef}
                className="crop-interactive-viewport"
                onPointerMove={handleEditorPointerMove}
                onPointerUp={handleEditorPointerUp}
              >
                <img
                  src={activeSide.url}
                  alt={activeSide.name}
                  className="crop-source-image"
                  draggable={false}
                />

                {renderQuadPolygon()}

                {/* Corner Handles */}
                {(["topLeft", "topRight", "bottomRight", "bottomLeft"] as (keyof Quad)[]).map((corner) => {
                  const pt = activeSide.quad[corner];
                  const leftPct = (pt.x / activeSide.width) * 100;
                  const topPct = (pt.y / activeSide.height) * 100;

                  return (
                    <div
                      key={corner}
                      className={`crop-corner-handle ${draggingCorner === corner ? "dragging" : ""}`}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      onPointerDown={(e) => handleCornerPointerDown(e, corner)}
                      role="slider"
                      aria-label={`${corner} crop handle`}
                    >
                      <span className="handle-dot" />
                      {draggingCorner === corner && (
                        <div className="handle-magnifier-label">{corner}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Aspect Ratio Presets */}
              <div className="preset-selector">
                <span className="preset-label">Output Aspect Ratio:</span>
                <div className="preset-buttons">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      className={`preset-btn ${activePreset.name === preset.name ? "active" : ""}`}
                      onClick={() => setActivePreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                  <button
                    className={`preset-btn ${activePreset.name === "Custom Size" ? "active" : ""}`}
                    onClick={() =>
                      setActivePreset({
                        name: "Custom Size",
                        widthMm: customWidthMm,
                        heightMm: customHeightMm,
                        aspect: customWidthMm / customHeightMm,
                      })
                    }
                  >
                    Custom mm
                  </button>
                </div>
              </div>

              {activePreset.name === "Custom Size" && (
                <div className="custom-dims-row">
                  <label>
                    Width (mm):
                    <input
                      type="number"
                      value={customWidthMm}
                      onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                      min={20}
                      max={1000}
                    />
                  </label>
                  <label>
                    Height (mm):
                    <input
                      type="number"
                      value={customHeightMm}
                      onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                      min={20}
                      max={1000}
                    />
                  </label>
                </div>
              )}

              {/* Filter Sliders */}
              <div className="filters-row">
                <label>
                  Brightness ({activeSide.brightness}%):
                  <input
                    type="range"
                    min="50"
                    max="160"
                    value={activeSide.brightness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSides((prev) => {
                        const copy = [...prev];
                        copy[activeSideIndex].brightness = val;
                        return copy;
                      });
                    }}
                  />
                </label>
                <label>
                  Contrast ({activeSide.contrast}%):
                  <input
                    type="range"
                    min="60"
                    max="180"
                    value={activeSide.contrast}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSides((prev) => {
                        const copy = [...prev];
                        copy[activeSideIndex].contrast = val;
                        return copy;
                      });
                    }}
                  />
                </label>
              </div>

              <button
                className="btn-primary-apply"
                onClick={applyPerspectiveCrop}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "✓ Apply Perspective Crop & Straighten"}
              </button>
            </div>

            {/* Right: Cropped Result & Print Sheet */}
            <div className="result-preview-card">
              <div className="card-header">
                <h3>2. Straightened Result & Print Sheet</h3>
                {activeSide.croppedCanvas && (
                  <button className="btn-sm" onClick={downloadCroppedJpg}>
                    Download JPG ⬇
                  </button>
                )}
              </div>

              {activeSide.croppedCanvas ? (
                <div className="result-content">
                  <div className="straightened-view">
                    <img
                      src={activeSide.croppedCanvas.toDataURL("image/jpeg")}
                      alt="Straightened preview"
                      className="preview-straightened-img"
                    />
                  </div>

                  <div className="a4-sheet-preview">
                    <h4>A4 Print Layout Preview (210 × 297 mm)</h4>
                    <div className="sheet-a4-frame">
                      <div className="sheet-margin-box" style={{ padding: `${sheetMarginMm * 0.7}px` }}>
                        <div className="sheet-items-grid">
                          {Array.from({ length: sheetCopies }).map((_, i) => (
                            <img
                              key={i}
                              src={activeSide.croppedCanvas!.toDataURL("image/jpeg")}
                              alt={`Sheet copy ${i + 1}`}
                              className="sheet-copy-img"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="sheet-controls">
                      <label>
                        Copies on Sheet:
                        <select
                          value={sheetCopies}
                          onChange={(e) => setSheetCopies(Number(e.target.value))}
                        >
                          <option value="1">1 Copy (Full Page)</option>
                          <option value="2">2 Copies (Top & Bottom)</option>
                          <option value="4">4 Copies (Quarter page)</option>
                        </select>
                      </label>
                      <label>
                        Margins:
                        <select
                          value={sheetMarginMm}
                          onChange={(e) => setSheetMarginMm(Number(e.target.value))}
                        >
                          <option value="5">5 mm (Narrow)</option>
                          <option value="10">10 mm (Standard)</option>
                          <option value="15">15 mm (Wide)</option>
                        </select>
                      </label>
                    </div>

                    <div className="export-actions-row">
                      <button className="btn-export-pdf" onClick={downloadA4Pdf} disabled={isProcessing}>
                        Download Print-Ready A4 PDF ⬇
                      </button>
                      <button
                        className="btn-print-direct"
                        onClick={() => window.print()}
                      >
                        Print Direct 🖨️
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-preview-placeholder">
                  <span className="placeholder-icon">📐</span>
                  <p>Move the 4 blue handles onto the paper edges on the left, then click <strong>Apply Perspective Crop</strong>.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Status banner */}
        <div className="tool-status-bar" role="status">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
      </main>
    </div>
  );
}
