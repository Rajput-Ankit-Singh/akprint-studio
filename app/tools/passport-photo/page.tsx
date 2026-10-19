"use client";

import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mmToPx, replaceBackgroundColor, compressToTargetKb } from "@/lib/image-processing";
import { imagesToPdf, createPdfBlob } from "@/lib/pdf";

interface PhotoPreset {
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

const PASSPORT_PRESETS: PhotoPreset[] = [
  { name: "India Passport (35×45 mm)", widthMm: 35, heightMm: 45, description: "Standard Indian passport & visa" },
  { name: "US Visa (2×2 inch / 51×51 mm)", widthMm: 50.8, heightMm: 50.8, description: "Square format for US & DS-160" },
  { name: "Schengen Visa (35×45 mm)", widthMm: 35, heightMm: 45, description: "70-80% face area for Europe" },
  { name: "PAN Card Photo (25×35 mm)", widthMm: 25, heightMm: 35, description: "NSDL / UTI PAN application" },
  { name: "Stamp Size (25×30 mm)", widthMm: 25, heightMm: 30, description: "Affidavit & certificate stamp size" },
  { name: "Custom Size", widthMm: 35, heightMm: 45, description: "User-defined dimensions" },
];

const BG_COLORS = [
  { name: "Original", hex: "transparent" },
  { name: "Studio White", hex: "#FFFFFF" },
  { name: "Studio Blue", hex: "#2563EB" },
  { name: "Light Blue", hex: "#93C5FD" },
  { name: "Soft Grey", hex: "#E5E7EB" },
  { name: "Crimson Red", hex: "#DC2626" },
];

export default function PassportPhotoPage() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("passport-photo");
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Framing & Dimensions
  const [preset, setPreset] = useState<PhotoPreset>(PASSPORT_PRESETS[0]);
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  // Color & Filters
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [customBgHex, setCustomBgHex] = useState("#FFFFFF");
  const [bgThreshold, setBgThreshold] = useState(35);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [addBorder, setAddBorder] = useState(true);

  // Name & Date on photo (Sarkari exams / Notary requirement)
  const [showCaption, setShowCaption] = useState(false);
  const [personName, setPersonName] = useState("");
  const [photoDate, setPhotoDate] = useState("");

  // Sheet Layout
  const [sheetPaper, setSheetPaper] = useState<"A4" | "4x6">("A4");
  const [sheetCopies, setSheetCopies] = useState(8);
  const [sheetMarginMm, setSheetMarginMm] = useState(8);
  const [sheetGapMm, setSheetGapMm] = useState(4);

  const [status, setStatus] = useState("Upload a front-facing portrait to prepare passport photos.");
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeWidthMm = preset.name === "Custom Size" ? customW : preset.widthMm;
  const activeHeightMm = preset.name === "Custom Size" ? customH : preset.heightMm;

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgElement(img);
      setFileUrl(url);
      setFileName(file.name.replace(/\.[^.]+$/, ""));
      setZoom(100);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setStatus("Portrait loaded! Adjust face framing, choose background color, or layout copies.");
    };
    img.src = url;
    e.target.value = "";
  }

  // Pointer drag on preview
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!fileUrl) return;
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: dragStart.current.panX + dx * 0.5,
      y: dragStart.current.panY + dy * 0.5,
    });
  }

  function onPointerUp() {
    dragStart.current = null;
  }

  // Generate Single Photo Canvas (at 300 DPI)
  function renderSinglePhotoCanvas(dpi = 300): HTMLCanvasElement {
    if (!imgElement) throw new Error("No image loaded");

    const wPx = mmToPx(activeWidthMm, dpi);
    const hPx = mmToPx(activeHeightMm, dpi);

    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context unavailable");

    // Fill white base
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, wPx, hPx);

    ctx.save();
    // Center origin
    ctx.translate(wPx / 2 + (pan.x * (dpi / 96)), hPx / 2 + (pan.y * (dpi / 96)));
    ctx.rotate((rotation * Math.PI) / 180);

    const scale = (zoom / 100) * Math.max(wPx / imgElement.naturalWidth, hPx / imgElement.naturalHeight);
    ctx.scale(scale, scale);

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(imgElement, -imgElement.naturalWidth / 2, -imgElement.naturalHeight / 2);
    ctx.restore();

    // Background color replacement if requested
    let resultCanvas = canvas;
    const targetColor = selectedBg.name === "Custom Color" ? customBgHex : selectedBg.hex;
    if (selectedBg.hex !== "transparent") {
      resultCanvas = replaceBackgroundColor(canvas, targetColor, bgThreshold);
    }

    const finalCtx = resultCanvas.getContext("2d");
    if (finalCtx) {
      // Caption bar at bottom (Name + Date)
      if (showCaption && (personName || photoDate)) {
        const barHeight = Math.round(hPx * 0.16);
        finalCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
        finalCtx.fillRect(0, hPx - barHeight, wPx, barHeight);

        finalCtx.strokeStyle = "#1e293b";
        finalCtx.lineWidth = 1;
        finalCtx.beginPath();
        finalCtx.moveTo(0, hPx - barHeight);
        finalCtx.lineTo(wPx, hPx - barHeight);
        finalCtx.stroke();

        finalCtx.fillStyle = "#0f172a";
        finalCtx.textAlign = "center";
        finalCtx.textBaseline = "middle";

        if (personName && photoDate) {
          finalCtx.font = `bold ${Math.round(barHeight * 0.36)}px sans-serif`;
          finalCtx.fillText(personName.toUpperCase(), wPx / 2, hPx - barHeight * 0.65);
          finalCtx.font = `${Math.round(barHeight * 0.32)}px sans-serif`;
          finalCtx.fillText(`DOP: ${photoDate}`, wPx / 2, hPx - barHeight * 0.25);
        } else {
          finalCtx.font = `bold ${Math.round(barHeight * 0.45)}px sans-serif`;
          finalCtx.fillText((personName || photoDate).toUpperCase(), wPx / 2, hPx - barHeight / 2);
        }
      }

      // 1px black border
      if (addBorder) {
        finalCtx.strokeStyle = "#000000";
        finalCtx.lineWidth = Math.max(1, Math.round(dpi / 150));
        finalCtx.strokeRect(0, 0, wPx, hPx);
      }
    }

    return resultCanvas;
  }

  // Draw preview onto visible canvas
  useEffect(() => {
    if (!imgElement || !previewCanvasRef.current) return;
    try {
      const rendered = renderSinglePhotoCanvas(120);
      const canvas = previewCanvasRef.current;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(rendered, 0, 0);
      }
    } catch {
      // ignore
    }
  }, [
    imgElement,
    activeWidthMm,
    activeHeightMm,
    zoom,
    pan,
    rotation,
    selectedBg,
    customBgHex,
    bgThreshold,
    brightness,
    contrast,
    addBorder,
    showCaption,
    personName,
    photoDate,
  ]);

  // Download Single Photo JPG
  function downloadSinglePhoto() {
    try {
      const canvas = renderSinglePhotoCanvas(300);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.download = `${fileName}-passport-${activeWidthMm}x${activeHeightMm}mm.jpg`;
      link.click();
      setStatus("Downloaded single 300 DPI passport photo.");
    } catch (err) {
      setStatus("Export failed: " + String(err));
    }
  }

  // Render Full Print Sheet (A4 or 4x6 at 300 DPI)
  function renderSheetCanvas(dpi = 300): HTMLCanvasElement {
    const single = renderSinglePhotoCanvas(dpi);
    const photoW = single.width;
    const photoH = single.height;

    const sheetWMm = sheetPaper === "A4" ? 210 : 101.6; // 4 inches
    const sheetHMm = sheetPaper === "A4" ? 297 : 152.4; // 6 inches

    const sheetWPx = mmToPx(sheetWMm, dpi);
    const sheetHPx = mmToPx(sheetHMm, dpi);

    const marginPx = mmToPx(sheetMarginMm, dpi);
    const gapPx = mmToPx(sheetGapMm, dpi);

    const canvas = document.createElement("canvas");
    canvas.width = sheetWPx;
    canvas.height = sheetHPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Context unavailable");

    // White sheet
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheetWPx, sheetHPx);

    const usableW = sheetWPx - marginPx * 2;
    const cols = Math.max(1, Math.floor((usableW + gapPx) / (photoW + gapPx)));
    let count = 0;

    for (let row = 0; ; row++) {
      const y = marginPx + row * (photoH + gapPx);
      if (y + photoH > sheetHPx - marginPx || count >= sheetCopies) break;

      for (let col = 0; col < cols; col++) {
        if (count >= sheetCopies) break;
        const x = marginPx + col * (photoW + gapPx);
        ctx.drawImage(single, x, y);

        // Cutting guides (light hairline marks)
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, photoW + 2, photoH + 2);

        count++;
      }
    }

    return canvas;
  }

  // Download Sheet JPG
  function downloadSheetJpg() {
    try {
      const sheet = renderSheetCanvas(300);
      const link = document.createElement("a");
      link.href = sheet.toDataURL("image/jpeg", 0.95);
      link.download = `${fileName}-sheet-${sheetPaper}-${sheetCopies}copies.jpg`;
      link.click();
      setStatus(`Downloaded high-res ${sheetPaper} photo sheet (${sheetCopies} copies).`);
    } catch (err) {
      setStatus("Sheet export failed: " + String(err));
    }
  }

  // Download Sheet PDF
  async function downloadSheetPdf() {
    try {
      const sheet = renderSheetCanvas(300);
      const dataUrl = sheet.toDataURL("image/jpeg", 0.95);

      const pdfBytes = await imagesToPdf([{ dataUrl, name: `${fileName}-sheet` }], {
        pageSize: sheetPaper === "A4" ? "A4" : "4x6",
        marginMm: 0,
      });

      const blob = createPdfBlob(pdfBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}-print-sheet-${sheetPaper}.pdf`;
      link.click();
      setStatus(`Generated print-ready ${sheetPaper} PDF!`);
    } catch (err) {
      setStatus("PDF export failed: " + String(err));
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
            <span className="crumb-current">Passport Photo Studio</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Unlimited</span>
            <span className="badge-local">300 DPI Export</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Passport & Visa Photo Maker with Print Sheets</h1>
          <p className="tool-desc">
            Crop portraits to exact passport, visa, and exam specifications. Change background color, add name/date
            stamps, and pack copies onto A4 or 4×6 photo paper with cutting guidelines.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="tool-section">
          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={onFileChange} />
            <div className="dropzone-content">
              <span className="dropzone-icon">👤</span>
              <div>
                <strong>Choose Portrait Photo (JPG, PNG, WebP)</strong>
                <p>Upload a clear face photo. You can reposition, zoom, and rotate below.</p>
              </div>
              <span className="btn-browse">Browse Photo</span>
            </div>
          </label>
        </section>

        {fileUrl && (
          <div className="workbench-grid">
            {/* Left Controls & Adjustment */}
            <div className="crop-editor-card">
              <div className="card-header">
                <h3>1. Framing & Standards</h3>
              </div>

              {/* Presets */}
              <div className="control-group">
                <label className="control-label">Standard Size Preset:</label>
                <div className="preset-grid">
                  {PASSPORT_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      className={`preset-pill ${preset.name === p.name ? "active" : ""}`}
                      onClick={() => setPreset(p)}
                    >
                      <strong>{p.name}</strong>
                      <small>{p.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              {preset.name === "Custom Size" && (
                <div className="custom-dims-row">
                  <label>
                    Width (mm):
                    <input
                      type="number"
                      value={customW}
                      onChange={(e) => setCustomW(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Height (mm):
                    <input
                      type="number"
                      value={customH}
                      onChange={(e) => setCustomH(Number(e.target.value))}
                    />
                  </label>
                </div>
              )}

              {/* Background Color */}
              <div className="control-group">
                <label className="control-label">Background Color Replacement:</label>
                <div className="bg-color-picker">
                  {BG_COLORS.map((bg) => (
                    <button
                      key={bg.name}
                      className={`bg-color-btn ${selectedBg.name === bg.name ? "active" : ""}`}
                      onClick={() => setSelectedBg(bg)}
                      style={{
                        backgroundColor: bg.hex === "transparent" ? "#ffffff" : bg.hex,
                      }}
                      title={bg.name}
                    >
                      {selectedBg.name === bg.name ? "✓" : ""}
                    </button>
                  ))}
                </div>
                {selectedBg.hex !== "transparent" && (
                  <label className="sub-slider">
                    Color Detection Threshold ({bgThreshold}):
                    <input
                      type="range"
                      min="15"
                      max="75"
                      value={bgThreshold}
                      onChange={(e) => setBgThreshold(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>

              {/* Framing Sliders */}
              <div className="control-group">
                <div className="slider-row">
                  <label>
                    Zoom ({zoom}%):
                    <input
                      type="range"
                      min="50"
                      max="250"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Rotate ({rotation}°):
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="slider-row">
                  <label>
                    Brightness ({brightness}%):
                    <input
                      type="range"
                      min="60"
                      max="150"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Contrast ({contrast}%):
                    <input
                      type="range"
                      min="60"
                      max="150"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              {/* Border & Sarkari Caption options */}
              <div className="control-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addBorder}
                    onChange={(e) => setAddBorder(e.target.checked)}
                  />
                  <span>Add 1px Black Cutting Border</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showCaption}
                    onChange={(e) => setShowCaption(e.target.checked)}
                  />
                  <span>Add Name & Date of Photo (DOP) at Bottom</span>
                </label>

                {showCaption && (
                  <div className="caption-inputs">
                    <input
                      type="text"
                      placeholder="Candidate Full Name (e.g. RAHUL SHARMA)"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Date (e.g. 19/10/2026)"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Preview & Sheet Generation */}
            <div className="result-preview-card">
              <div className="card-header">
                <h3>2. Preview & Print Sheet Layout</h3>
                <button className="btn-sm" onClick={downloadSinglePhoto}>
                  Download Single Photo ⬇
                </button>
              </div>

              <div className="photo-preview-box" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
                <canvas ref={previewCanvasRef} className="single-photo-canvas" />
                <span className="drag-hint">Drag photo to adjust face position</span>
              </div>

              {/* Sheet Configuration */}
              <div className="sheet-config-panel">
                <h4>Print Sheet Settings</h4>
                <div className="sheet-controls-grid">
                  <label>
                    Paper Size:
                    <select
                      value={sheetPaper}
                      onChange={(e) => setSheetPaper(e.target.value as "A4" | "4x6")}
                    >
                      <option value="A4">A4 Paper (210 × 297 mm)</option>
                      <option value="4x6">4×6 Inch Photo Paper (102 × 152 mm)</option>
                    </select>
                  </label>

                  <label>
                    Number of Copies:
                    <select
                      value={sheetCopies}
                      onChange={(e) => setSheetCopies(Number(e.target.value))}
                    >
                      <option value="4">4 Copies</option>
                      <option value="6">6 Copies</option>
                      <option value="8">8 Copies (Popular)</option>
                      <option value="12">12 Copies</option>
                      <option value="16">16 Copies</option>
                      <option value="24">24 Copies</option>
                      <option value="32">32 Copies (Full Sheet)</option>
                    </select>
                  </label>

                  <label>
                    Sheet Margin:
                    <select
                      value={sheetMarginMm}
                      onChange={(e) => setSheetMarginMm(Number(e.target.value))}
                    >
                      <option value="5">5 mm</option>
                      <option value="8">8 mm</option>
                      <option value="12">12 mm</option>
                    </select>
                  </label>

                  <label>
                    Gap Between Photos:
                    <select
                      value={sheetGapMm}
                      onChange={(e) => setSheetGapMm(Number(e.target.value))}
                    >
                      <option value="2">2 mm (Tight)</option>
                      <option value="4">4 mm (Standard)</option>
                      <option value="6">6 mm (Wide)</option>
                    </select>
                  </label>
                </div>

                <div className="export-actions-row">
                  <button className="btn-primary-apply" onClick={downloadSheetJpg}>
                    Download {sheetPaper} Sheet (JPG 300 DPI) ⬇
                  </button>
                  <button className="btn-export-pdf" onClick={downloadSheetPdf}>
                    Download {sheetPaper} Sheet (PDF) ⬇
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="tool-status-bar" role="status">
          <span className="status-dot" />
          <span>{status}</span>
        </div>
      </main>
    </div>
  );
}
