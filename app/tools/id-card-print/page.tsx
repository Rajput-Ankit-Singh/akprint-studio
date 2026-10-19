"use client";

import { ChangeEvent, useState, useRef } from "react";
import Link from "next/link";
import { mmToPx } from "@/lib/image-processing";
import { imagesToPdf, createPdfBlob } from "@/lib/pdf";

interface IdCardItem {
  id: string;
  label: string;
  frontUrl: string | null;
  backUrl: string | null;
  frontImg: HTMLImageElement | null;
  backImg: HTMLImageElement | null;
  frontZoom: number;
  backZoom: number;
  brightness: number;
  contrast: number;
}

const CR80_WIDTH_MM = 85.6;
const CR80_HEIGHT_MM = 53.98;

export default function IdCardPrintPage() {
  const [cards, setCards] = useState<IdCardItem[]>([
    {
      id: "card-1",
      label: "ID Card 1",
      frontUrl: null,
      backUrl: null,
      frontImg: null,
      backImg: null,
      frontZoom: 100,
      backZoom: 100,
      brightness: 100,
      contrast: 100,
    },
  ]);

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [layoutMode, setLayoutMode] = useState<"a4-stacked" | "a4-side-by-side" | "pvc-single">("a4-stacked");
  const [cardOrientation, setCardOrientation] = useState<"landscape" | "portrait">("landscape");
  const [borderGuide, setBorderGuide] = useState(true);
  const [sheetMarginMm, setSheetMarginMm] = useState(10);
  const [status, setStatus] = useState("Upload Front and Back sides of your ID card (Aadhaar, PAN, Voter, Student).");
  const [isProcessing, setIsProcessing] = useState(false);

  const activeCard = cards[activeCardIndex] ?? cards[0];

  function handleImageUpload(side: "front" | "back", e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCards((prev) => {
        const copy = [...prev];
        const card = { ...copy[activeCardIndex] };
        if (side === "front") {
          card.frontUrl = url;
          card.frontImg = img;
        } else {
          card.backUrl = url;
          card.backImg = img;
        }
        copy[activeCardIndex] = card;
        return copy;
      });
      setStatus(`Loaded ${side} of ${activeCard.label}.`);
    };
    img.src = url;
    e.target.value = "";
  }

  function addNewCardSlot() {
    if (cards.length >= 5) {
      setStatus("Maximum 5 card sets per A4 sheet.");
      return;
    }
    const newCard: IdCardItem = {
      id: `card-${cards.length + 1}`,
      label: `ID Card ${cards.length + 1}`,
      frontUrl: null,
      backUrl: null,
      frontImg: null,
      backImg: null,
      frontZoom: 100,
      backZoom: 100,
      brightness: 100,
      contrast: 100,
    };
    setCards((prev) => [...prev, newCard]);
    setActiveCardIndex(cards.length);
    setStatus(`Added slot for ID Card ${cards.length + 1}.`);
  }

  function renderSingleSideCanvas(
    img: HTMLImageElement | null,
    zoom: number,
    brightness: number,
    contrast: number,
    dpi = 300
  ): HTMLCanvasElement {
    const isLand = cardOrientation === "landscape";
    const wMm = isLand ? CR80_WIDTH_MM : CR80_HEIGHT_MM;
    const hMm = isLand ? CR80_HEIGHT_MM : CR80_WIDTH_MM;

    const wPx = mmToPx(wMm, dpi);
    const hPx = mmToPx(hMm, dpi);

    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, wPx, hPx);

    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      // Scale to fit card bounds
      const scale = (zoom / 100) * Math.min(wPx / img.naturalWidth, hPx / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = (wPx - drawW) / 2;
      const y = (hPx - drawH) / 2;

      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${Math.round(wPx / 20)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Empty Card Side", wPx / 2, hPx / 2);
    }

    if (borderGuide) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = Math.max(1, Math.round(dpi / 200));
      ctx.strokeRect(0, 0, wPx, hPx);
    }

    return canvas;
  }

  // Generate full A4 sheet canvas (210 x 297 mm at 300 DPI)
  function renderA4SheetCanvas(dpi = 300): HTMLCanvasElement {
    const sheetW = mmToPx(210, dpi);
    const sheetH = mmToPx(297, dpi);
    const margin = mmToPx(sheetMarginMm, dpi);
    const gap = mmToPx(6, dpi);

    const canvas = document.createElement("canvas");
    canvas.width = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheetW, sheetH);

    const isLand = cardOrientation === "landscape";
    const cardWMm = isLand ? CR80_WIDTH_MM : CR80_HEIGHT_MM;
    const cardHMm = isLand ? CR80_HEIGHT_MM : CR80_WIDTH_MM;
    const cardWPx = mmToPx(cardWMm, dpi);
    const cardHPx = mmToPx(cardHMm, dpi);

    let startY = margin;

    cards.forEach((card, index) => {
      const frontCanvas = renderSingleSideCanvas(card.frontImg, card.frontZoom, card.brightness, card.contrast, dpi);
      const backCanvas = renderSingleSideCanvas(card.backImg, card.backZoom, card.brightness, card.contrast, dpi);

      if (layoutMode === "a4-side-by-side") {
        // Front and Back side-by-side on same row
        const rowY = startY + index * (cardHPx + gap);
        if (rowY + cardHPx <= sheetH - margin) {
          const frontX = margin;
          const backX = margin + cardWPx + gap;
          ctx.drawImage(frontCanvas, frontX, rowY);
          ctx.drawImage(backCanvas, backX, rowY);
        }
      } else {
        // Stacked vertically: Front top, Back below
        const pairHeight = cardHPx * 2 + gap;
        const pairY = startY + index * (pairHeight + gap * 1.5);
        if (pairY + pairHeight <= sheetH - margin) {
          const x = (sheetW - cardWPx) / 2; // Center horizontally
          ctx.drawImage(frontCanvas, x, pairY);
          ctx.drawImage(backCanvas, x, pairY + cardHPx + gap);
        }
      }
    });

    return canvas;
  }

  // Download High-Res Sheet JPG
  function downloadSheetJpg() {
    try {
      const sheet = renderA4SheetCanvas(300);
      const link = document.createElement("a");
      link.href = sheet.toDataURL("image/jpeg", 0.95);
      link.download = `pvc-id-sheet-a4-${Date.now()}.jpg`;
      link.click();
      setStatus("Downloaded 300 DPI A4 ID sheet JPG.");
    } catch (err) {
      setStatus("Export failed: " + String(err));
    }
  }

  // Download Print-Ready A4 PDF
  async function downloadSheetPdf() {
    setIsProcessing(true);
    setStatus("Generating 100% actual scale A4 PDF for PVC print...");
    try {
      const sheet = renderA4SheetCanvas(300);
      const dataUrl = sheet.toDataURL("image/jpeg", 0.95);

      const pdfBytes = await imagesToPdf([{ dataUrl, name: "pvc-cards" }], {
        pageSize: "A4",
        marginMm: 0,
      });

      const blob = createPdfBlob(pdfBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `pvc-id-cards-A4-100scale-${Date.now()}.pdf`;
      link.click();
      setStatus("Downloaded print-ready A4 PDF at exact 100% scale!");
    } catch (err) {
      setStatus("PDF generation failed: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="tool-page-container">
      <header className="tool-header">
        <div className="tool-header-inner wrap">
          <div className="tool-breadcrumbs">
            <Link href="/" className="crumb-home">
              ← All Tools
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Smart ID & PVC Studio</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · No Limits</span>
            <span className="badge-local">CR80 PVC Standard (85.6×54 mm)</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Smart ID Card & PVC A4 Print Layout Tool</h1>
          <p className="tool-desc">
            Pair Front & Back sides for Aadhaar, Voter ID, PAN, Driving Licence, and Student Cards.
            Pack up to 5 card pairs onto standard A4 paper at exact 100% scale for PVC tray or sticker lamination.
          </p>
        </div>

        {/* Card Tabs Bar */}
        <div className="doc-tabs-bar">
          <span className="doc-tabs-label">Card Pairs:</span>
          {cards.map((card, idx) => (
            <button
              key={card.id}
              className={`doc-tab-btn ${idx === activeCardIndex ? "active" : ""}`}
              onClick={() => setActiveCardIndex(idx)}
            >
              {card.label}
              {card.frontUrl && card.backUrl ? " ✓" : card.frontUrl ? " (Front)" : ""}
            </button>
          ))}
          {cards.length < 5 && (
            <button className="btn-add-card" onClick={addNewCardSlot}>
              + Add Card Slot ({cards.length}/5)
            </button>
          )}
        </div>

        {/* Workbench */}
        <div className="workbench-grid">
          {/* Left: Card Uploads & Settings */}
          <div className="crop-editor-card">
            <div className="card-header">
              <h3>1. Upload & Adjust {activeCard.label}</h3>
            </div>

            {/* Front & Back Upload Zones */}
            <div className="id-upload-pair-grid">
              {/* Front Side */}
              <div className="id-side-box">
                <span className="side-badge">Front Side</span>
                {activeCard.frontUrl ? (
                  <div className="id-preview-frame">
                    <img src={activeCard.frontUrl} alt="Front preview" className="id-card-thumb" />
                    <label className="btn-replace">
                      Replace Front
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload("front", e)} hidden />
                    </label>
                  </div>
                ) : (
                  <label className="id-empty-slot">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload("front", e)} hidden />
                    <span className="slot-icon">💳</span>
                    <strong>Upload Front Side</strong>
                    <small>JPG, PNG or WebP</small>
                  </label>
                )}

                {activeCard.frontUrl && (
                  <label className="zoom-slider">
                    Front Zoom ({activeCard.frontZoom}%):
                    <input
                      type="range"
                      min="60"
                      max="160"
                      value={activeCard.frontZoom}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCards((prev) => {
                          const copy = [...prev];
                          copy[activeCardIndex].frontZoom = val;
                          return copy;
                        });
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Back Side */}
              <div className="id-side-box">
                <span className="side-badge">Back Side</span>
                {activeCard.backUrl ? (
                  <div className="id-preview-frame">
                    <img src={activeCard.backUrl} alt="Back preview" className="id-card-thumb" />
                    <label className="btn-replace">
                      Replace Back
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload("back", e)} hidden />
                    </label>
                  </div>
                ) : (
                  <label className="id-empty-slot">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload("back", e)} hidden />
                    <span className="slot-icon">💳</span>
                    <strong>Upload Back Side</strong>
                    <small>JPG, PNG or WebP</small>
                  </label>
                )}

                {activeCard.backUrl && (
                  <label className="zoom-slider">
                    Back Zoom ({activeCard.backZoom}%):
                    <input
                      type="range"
                      min="60"
                      max="160"
                      value={activeCard.backZoom}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCards((prev) => {
                          const copy = [...prev];
                          copy[activeCardIndex].backZoom = val;
                          return copy;
                        });
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Enhancements */}
            <div className="control-group">
              <label className="control-label">Visual Adjustments:</label>
              <div className="slider-row">
                <label>
                  Brightness ({activeCard.brightness}%):
                  <input
                    type="range"
                    min="70"
                    max="140"
                    value={activeCard.brightness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCards((prev) => {
                        const copy = [...prev];
                        copy[activeCardIndex].brightness = val;
                        return copy;
                      });
                    }}
                  />
                </label>
                <label>
                  Contrast ({activeCard.contrast}%):
                  <input
                    type="range"
                    min="70"
                    max="140"
                    value={activeCard.contrast}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCards((prev) => {
                        const copy = [...prev];
                        copy[activeCardIndex].contrast = val;
                        return copy;
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="control-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={borderGuide}
                  onChange={(e) => setBorderGuide(e.target.checked)}
                />
                <span>Draw 1px Black Cutting Guide Outline</span>
              </label>
            </div>
          </div>

          {/* Right: A4 Sheet Preview & Export */}
          <div className="result-preview-card">
            <div className="card-header">
              <h3>2. A4 Print Sheet Preview (100% Scale)</h3>
              <button className="btn-sm" onClick={downloadSheetJpg}>
                Download Sheet JPG ⬇
              </button>
            </div>

            <div className="sheet-config-row">
              <label>
                Layout Mode:
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value as any)}
                >
                  <option value="a4-stacked">Stacked Front & Back (Recommended)</option>
                  <option value="a4-side-by-side">Side-by-Side (Horizontal Pair)</option>
                </select>
              </label>

              <label>
                Card Orientation:
                <select
                  value={cardOrientation}
                  onChange={(e) => setCardOrientation(e.target.value as any)}
                >
                  <option value="landscape">Landscape (85.6 × 54 mm)</option>
                  <option value="portrait">Portrait (54 × 85.6 mm)</option>
                </select>
              </label>

              <label>
                Sheet Margins:
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

            {/* A4 Sheet Preview Mock */}
            <div className="a4-sheet-preview-container">
              <div className="a4-sheet-render" style={{ padding: `${sheetMarginMm * 0.7}px` }}>
                {cards.map((card, idx) => (
                  <div
                    key={card.id}
                    className={`sheet-card-pair-preview ${layoutMode === "a4-side-by-side" ? "side-by-side" : "stacked"}`}
                  >
                    <div className="mock-card-box">
                      {card.frontUrl ? (
                        <img src={card.frontUrl} alt="Front" className="mock-card-img" />
                      ) : (
                        <span className="mock-card-empty">{card.label} Front</span>
                      )}
                    </div>
                    <div className="mock-card-box">
                      {card.backUrl ? (
                        <img src={card.backUrl} alt="Back" className="mock-card-img" />
                      ) : (
                        <span className="mock-card-empty">{card.label} Back</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="export-actions-row">
              <button
                className="btn-export-pdf"
                onClick={downloadSheetPdf}
                disabled={isProcessing}
              >
                {isProcessing ? "Generating PDF..." : "Download Print-Ready A4 PDF (100% Scale) ⬇"}
              </button>
              <button className="btn-print-direct" onClick={() => window.print()}>
                Print Direct 🖨️
              </button>
            </div>
          </div>
        </div>

        <div className="tool-status-bar" role="status">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
      </main>
    </div>
  );
}
