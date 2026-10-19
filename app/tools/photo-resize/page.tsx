"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { mmToPx, cmToPx, inToPx, pxToMm, processImage, compressToTargetKb } from "@/lib/image-processing";

type Unit = "px" | "mm" | "cm" | "in";
type Format = "image/jpeg" | "image/png" | "image/webp";

const EXAM_PRESETS = [
  { name: "UPSC / SSC Photo", w: 35, h: 45, unit: "mm" as Unit, maxKb: 50, desc: "3.5×4.5 cm, max 50 KB" },
  { name: "SSC / Bank Signature", w: 40, h: 20, unit: "mm" as Unit, maxKb: 20, desc: "4×2 cm, max 20 KB" },
  { name: "NTA / JEE / NEET Photo", w: 35, h: 45, unit: "mm" as Unit, maxKb: 200, desc: "3.5×4.5 cm, 10-200 KB" },
  { name: "PAN Signature", w: 40, h: 20, unit: "mm" as Unit, maxKb: 30, desc: "2×4 cm, max 30 KB" },
  { name: "Web Avatar / Square", w: 500, h: 500, unit: "px" as Unit, maxKb: 100, desc: "500×500 px, max 100 KB" },
];

export default function PhotoResizePage() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("photo");
  const [originalW, setOriginalW] = useState(0);
  const [originalH, setOriginalH] = useState(0);
  const [originalSizeKb, setOriginalSizeKb] = useState(0);

  // Resize controls
  const [unit, setUnit] = useState<Unit>("px");
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [dpi, setDpi] = useState(300);

  // Compression & Format
  const [format, setFormat] = useState<Format>("image/jpeg");
  const [targetKb, setTargetKb] = useState<number>(50);
  const [enforceTargetKb, setEnforceTargetKb] = useState(true);
  const [manualQuality, setManualQuality] = useState(85);

  // Visual adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(false);

  // Output State
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSizeKb, setResultSizeKb] = useState(0);
  const [resultDimensions, setResultDimensions] = useState({ w: 0, h: 0 });
  const [status, setStatus] = useState("Upload an image to resize, compress to target KB, or convert format.");
  const [isProcessing, setIsProcessing] = useState(false);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalSizeKb(Math.round(file.size / 1024));
    setFileName(file.name.replace(/\.[^.]+$/, ""));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginalW(img.naturalWidth);
      setOriginalH(img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setFileUrl(url);
      setStatus(`Loaded "${file.name}" (${img.naturalWidth}×${img.naturalHeight} px, ${Math.round(file.size / 1024)} KB).`);
    };
    img.src = url;
    e.target.value = "";
  }

  function handleWidthChange(val: number) {
    setWidth(val);
    if (lockAspect && aspectRatio) {
      setHeight(Math.round(val / aspectRatio));
    }
  }

  function handleHeightChange(val: number) {
    setHeight(val);
    if (lockAspect && aspectRatio) {
      setWidth(Math.round(val * aspectRatio));
    }
  }

  function applyPreset(preset: typeof EXAM_PRESETS[0]) {
    setUnit(preset.unit);
    setWidth(preset.w);
    setHeight(preset.h);
    setTargetKb(preset.maxKb);
    setEnforceTargetKb(true);
    setLockAspect(false);
    setStatus(`Applied preset: ${preset.name} (${preset.w}×${preset.h} ${preset.unit}, max ${preset.maxKb} KB).`);
  }

  // Convert current width/height to pixels
  function getPixelDimensions(): { widthPx: number; heightPx: number } {
    switch (unit) {
      case "mm":
        return { widthPx: mmToPx(width, dpi), heightPx: mmToPx(height, dpi) };
      case "cm":
        return { widthPx: cmToPx(width, dpi), heightPx: cmToPx(height, dpi) };
      case "in":
        return { widthPx: inToPx(width, dpi), heightPx: inToPx(height, dpi) };
      case "px":
      default:
        return { widthPx: Math.max(1, Math.round(width)), heightPx: Math.max(1, Math.round(height)) };
    }
  }

  async function processAndCompress() {
    if (!fileUrl) return;
    setIsProcessing(true);
    setStatus("Resizing and compressing...");

    try {
      const { widthPx, heightPx } = getPixelDimensions();

      const canvas = await processImage(fileUrl, {
        widthPx,
        heightPx,
        format,
        brightness,
        contrast,
        grayscale,
      });

      let finalBlob: Blob;
      let finalKb: number;

      if (format === "image/jpeg" && enforceTargetKb && targetKb > 0) {
        const res = await compressToTargetKb(canvas, targetKb);
        finalBlob = res.blob;
        finalKb = res.sizeKb;
      } else {
        const quality = manualQuality / 100;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, format, quality)
        );
        if (!blob) throw new Error("Could not create image output");
        finalBlob = blob;
        finalKb = Math.round(blob.size / 1024);
      }

      const outUrl = URL.createObjectURL(finalBlob);
      setResultUrl(outUrl);
      setResultSizeKb(finalKb);
      setResultDimensions({ w: widthPx, h: heightPx });

      setStatus(`Complete! Result: ${widthPx}×${heightPx} px, ${finalKb} KB (Target: ${enforceTargetKb ? `${targetKb} KB` : "Manual"}).`);
    } catch (err) {
      setStatus("Processing failed: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadResult() {
    if (!resultUrl) return;
    const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
    const link = document.createElement("a");
    link.href = resultUrl;
    link.download = `${fileName}-resized-${resultDimensions.w}x${resultDimensions.h}-${resultSizeKb}kb.${ext}`;
    link.click();
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
            <span className="crumb-current">Photo Resize & Target KB</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Real-Time KB Feedback</span>
            <span className="badge-local">Sarkari & Exam Form Ready</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Image Resizer & Target File Size (KB) Compressor</h1>
          <p className="tool-desc">
            Convert image dimensions to exact mm, cm, inches, or px with automatic target KB compression.
            Ideal for online applications (UPSC, SSC, Bank, NEET, JEE) requiring strict file size limits.
          </p>
        </div>

        {/* Upload Zone */}
        <section className="tool-section">
          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={onFileChange} />
            <div className="dropzone-content">
              <span className="dropzone-icon">🔍</span>
              <div>
                <strong>Choose Image to Resize & Compress</strong>
                <p>Supports JPG, PNG, WebP, scans, and mobile photos</p>
              </div>
              <span className="btn-browse">Browse Image</span>
            </div>
          </label>
        </section>

        {/* Exam Quick Presets */}
        <div className="presets-banner">
          <span className="banner-title">Quick Sarkari / Exam Presets:</span>
          <div className="banner-pills">
            {EXAM_PRESETS.map((p) => (
              <button key={p.name} className="pill-btn" onClick={() => applyPreset(p)}>
                <strong>{p.name}</strong>
                <small>{p.desc}</small>
              </button>
            ))}
          </div>
        </div>

        {fileUrl && (
          <div className="workbench-grid">
            {/* Left: Configuration Form */}
            <div className="crop-editor-card">
              <div className="card-header">
                <h3>1. Target Dimensions & Units</h3>
                <span className="original-badge">
                  Original: {originalW}×{originalH} px ({originalSizeKb} KB)
                </span>
              </div>

              {/* Units & Dimensions */}
              <div className="dims-config-box">
                <div className="unit-selector">
                  <span className="label-text">Unit:</span>
                  {(["px", "mm", "cm", "in"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      className={`unit-pill ${unit === u ? "active" : ""}`}
                      onClick={() => setUnit(u)}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                  {unit !== "px" && (
                    <label className="dpi-input">
                      DPI:
                      <input
                        type="number"
                        value={dpi}
                        onChange={(e) => setDpi(Number(e.target.value))}
                        min={72}
                        max={600}
                      />
                    </label>
                  )}
                </div>

                <div className="dims-inputs-row">
                  <label>
                    Width ({unit}):
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Height ({unit}):
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                    />
                  </label>
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={(e) => setLockAspect(e.target.checked)}
                  />
                  <span>Lock Aspect Ratio</span>
                </label>
              </div>

              {/* File Size Compression Box */}
              <div className="compression-box">
                <h4>2. Target File Size (KB) & Format</h4>

                <div className="format-selector">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "image/jpeg"}
                      onChange={() => setFormat("image/jpeg")}
                    />
                    <span>JPEG / JPG</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "image/png"}
                      onChange={() => setFormat("image/png")}
                    />
                    <span>PNG</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="format"
                      checked={format === "image/webp"}
                      onChange={() => setFormat("image/webp")}
                    />
                    <span>WebP</span>
                  </label>
                </div>

                {format === "image/jpeg" && (
                  <div className="target-kb-section">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={enforceTargetKb}
                        onChange={(e) => setEnforceTargetKb(e.target.checked)}
                      />
                      <span>Strict Target KB Compression</span>
                    </label>

                    {enforceTargetKb ? (
                      <div className="target-kb-input-group">
                        <label>
                          Target Max Size (KB):
                          <input
                            type="number"
                            value={targetKb}
                            onChange={(e) => setTargetKb(Number(e.target.value))}
                            min={5}
                            max={5000}
                          />
                        </label>
                        <div className="kb-shortcuts">
                          {[20, 50, 100, 200, 500].map((kb) => (
                            <button
                              key={kb}
                              type="button"
                              className="kb-chip"
                              onClick={() => setTargetKb(kb)}
                            >
                              {kb} KB
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <label className="sub-slider">
                        JPEG Quality ({manualQuality}%):
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={manualQuality}
                          onChange={(e) => setManualQuality(Number(e.target.value))}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Visual Enhancements */}
              <div className="enhancements-box">
                <h4>3. Adjustments & Black/White</h4>
                <div className="slider-row">
                  <label>
                    Brightness ({brightness}%):
                    <input
                      type="range"
                      min="60"
                      max="140"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Contrast ({contrast}%):
                    <input
                      type="range"
                      min="60"
                      max="140"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                    />
                  </label>
                </div>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={grayscale}
                    onChange={(e) => setGrayscale(e.target.checked)}
                  />
                  <span>Convert to Grayscale / Black & White (Signatures & Documents)</span>
                </label>
              </div>

              <button
                className="btn-primary-apply"
                onClick={processAndCompress}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "✓ Apply Resize & Compress"}
              </button>
            </div>

            {/* Right: Preview & Download Card */}
            <div className="result-preview-card">
              <div className="card-header">
                <h3>3. Processed Result & Verification</h3>
                {resultUrl && (
                  <button className="btn-sm" onClick={downloadResult}>
                    Download Image ⬇
                  </button>
                )}
              </div>

              {resultUrl ? (
                <div className="processed-result-view">
                  <div className="stats-badge-grid">
                    <div className="stat-card">
                      <span className="stat-label">Output Size</span>
                      <strong className={`stat-val ${resultSizeKb <= targetKb ? "ok" : ""}`}>
                        {resultSizeKb} KB
                      </strong>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Dimensions</span>
                      <strong className="stat-val">
                        {resultDimensions.w} × {resultDimensions.h} px
                      </strong>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Size in mm</span>
                      <strong className="stat-val">
                        {pxToMm(resultDimensions.w, dpi)} × {pxToMm(resultDimensions.h, dpi)} mm
                      </strong>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Format</span>
                      <strong className="stat-val">{format.split("/")[1].toUpperCase()}</strong>
                    </div>
                  </div>

                  <div className="output-preview-frame">
                    <img src={resultUrl} alt="Resized result" className="preview-output-img" />
                  </div>

                  <button className="btn-export-pdf" onClick={downloadResult}>
                    Download Processed Image ({resultSizeKb} KB) ⬇
                  </button>
                </div>
              ) : (
                <div className="empty-preview-placeholder">
                  <span className="placeholder-icon">📏</span>
                  <p>Choose dimensions and target KB on the left, then click <strong>Apply Resize & Compress</strong>.</p>
                </div>
              )}
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
