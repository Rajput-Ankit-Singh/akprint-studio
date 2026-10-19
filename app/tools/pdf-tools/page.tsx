"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { imagesToPdf, mergePdfs, extractOrDeletePdfPages, rotatePdfPages, getPdfPageCount, createPdfBlob } from "@/lib/pdf";

type PdfTab = "img2pdf" | "merge" | "split" | "rotate";

interface ImageUploadItem {
  id: string;
  name: string;
  dataUrl: string;
}

interface PdfUploadItem {
  id: string;
  name: string;
  buffer: ArrayBuffer;
  pageCount: number;
}

export default function PdfToolsPage() {
  const [activeTab, setActiveTab] = useState<PdfTab>("img2pdf");
  const [status, setStatus] = useState("Select a PDF tool tab above to begin.");
  const [isProcessing, setIsProcessing] = useState(false);

  // Tab 1: Images to PDF
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [pageSize, setPageSize] = useState<"A4" | "4x6" | "Letter">("A4");
  const [pageOrientation, setPageOrientation] = useState<"portrait" | "landscape">("portrait");
  const [marginMm, setMarginMm] = useState(10);

  // Tab 2: Merge PDF
  const [mergeFiles, setMergeFiles] = useState<PdfUploadItem[]>([]);

  // Tab 3: Split / Delete Pages
  const [singlePdf, setSinglePdf] = useState<PdfUploadItem | null>(null);
  const [pagesSelection, setPagesSelection] = useState("all");
  const [deletedPages, setDeletedPages] = useState<number[]>([]);

  // Tab 4: Rotate PDF
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);

  // --- Handlers: Images to PDF ---
  function onImagesUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [
          ...prev,
          {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            name: file.name,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    setStatus(`Added ${files.length} image(s). Drag to reorder, set page margins, and download PDF.`);
    e.target.value = "";
  }

  function moveImage(from: number, to: number) {
    setImages((prev) => {
      const copy = [...prev];
      const item = copy.splice(from, 1)[0];
      copy.splice(to, 0, item);
      return copy;
    });
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function generateImagesPdf() {
    if (!images.length) return;
    setIsProcessing(true);
    setStatus("Generating PDF from images...");

    try {
      const pdfBytes = await imagesToPdf(images, {
        pageSize,
        orientation: pageOrientation,
        marginMm,
      });

      const blob = createPdfBlob(pdfBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `images-combined-${pageSize}-${Date.now()}.pdf`;
      link.click();
      setStatus("Successfully downloaded converted PDF!");
    } catch (err) {
      setStatus("PDF conversion failed: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  }

  // --- Handlers: Merge PDF ---
  async function onMergePdfsUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.name.endsWith(".pdf"));
    if (!files.length) return;

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const count = await getPdfPageCount(buffer);
      setMergeFiles((prev) => [
        ...prev,
        {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          name: file.name,
          buffer,
          pageCount: count,
        },
      ]);
    }

    setStatus(`Loaded ${files.length} PDF(s). Arrange order and click Merge PDFs.`);
    e.target.value = "";
  }

  async function executeMergePdfs() {
    if (mergeFiles.length < 2) {
      setStatus("Please add at least 2 PDF files to merge.");
      return;
    }
    setIsProcessing(true);
    setStatus("Merging PDF files locally...");

    try {
      const buffers = mergeFiles.map((f) => f.buffer);
      const mergedBytes = await mergePdfs(buffers);

      const blob = createPdfBlob(mergedBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `merged-document-${Date.now()}.pdf`;
      link.click();
      setStatus(`Successfully merged ${mergeFiles.length} files into one PDF!`);
    } catch (err) {
      setStatus("Merge failed: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  }

  // --- Handlers: Split / Delete Pages ---
  async function onSinglePdfUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const count = await getPdfPageCount(buffer);
    setSinglePdf({
      id: file.name,
      name: file.name,
      buffer,
      pageCount: count,
    });
    setDeletedPages([]);
    setStatus(`Loaded "${file.name}" (${count} pages). Toggle pages to delete or enter extraction range.`);
    e.target.value = "";
  }

  async function executeExtractOrDelete() {
    if (!singlePdf) return;
    setIsProcessing(true);
    setStatus("Processing PDF pages...");

    try {
      // Parse keep pages
      let keepPages: number[] = [];
      if (pagesSelection.trim().toLowerCase() === "all") {
        keepPages = Array.from({ length: singlePdf.pageCount }, (_, i) => i + 1).filter(
          (p) => !deletedPages.includes(p)
        );
      } else {
        // e.g. "1, 3-5, 8"
        const parts = pagesSelection.split(",").map((s) => s.trim());
        const selected = new Set<number>();
        for (const part of parts) {
          const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
          if (match) {
            const start = Number(match[1]);
            const end = Number(match[2] ?? match[1]);
            for (let i = start; i <= end; i++) {
              if (i >= 1 && i <= singlePdf.pageCount) selected.add(i);
            }
          }
        }
        keepPages = Array.from(selected).filter((p) => !deletedPages.includes(p));
      }

      if (!keepPages.length) {
        setStatus("No pages selected to keep!");
        setIsProcessing(false);
        return;
      }

      const outBytes = await extractOrDeletePdfPages(singlePdf.buffer, keepPages);
      const blob = createPdfBlob(outBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${singlePdf.name.replace(/\.pdf$/, "")}-selected-pages.pdf`;
      link.click();
      setStatus(`Saved modified PDF with ${keepPages.length} pages!`);
    } catch (err) {
      setStatus("Operation failed: " + String(err));
    } finally {
      setIsProcessing(false);
    }
  }

  // --- Handlers: Rotate PDF ---
  async function executeRotatePdf() {
    if (!singlePdf) {
      setStatus("Please upload a PDF to rotate.");
      return;
    }
    setIsProcessing(true);
    setStatus(`Rotating all pages by ${rotateAngle}°...`);

    try {
      const rotatedBytes = await rotatePdfPages(singlePdf.buffer, rotateAngle);
      const blob = createPdfBlob(rotatedBytes);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${singlePdf.name.replace(/\.pdf$/, "")}-rotated-${rotateAngle}deg.pdf`;
      link.click();
      setStatus(`Successfully rotated PDF by ${rotateAngle}°!`);
    } catch (err) {
      setStatus("Rotate failed: " + String(err));
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
            <span className="crumb-current">PDF Utilities Hub</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · No File Limits</span>
            <span className="badge-local">100% Client-Side Processing</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Complete PDF Toolbox: Convert, Merge, Split & Rotate</h1>
          <p className="tool-desc">
            All PDF operations run securely in your browser. No files are uploaded to servers, ensuring complete
            confidentiality for Aadhaar, marksheets, receipts, and legal documents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="tool-tabs-bar">
          <button
            className={`tool-subtab ${activeTab === "img2pdf" ? "active" : ""}`}
            onClick={() => setActiveTab("img2pdf")}
          >
            🖼️ Images to PDF
          </button>
          <button
            className={`tool-subtab ${activeTab === "merge" ? "active" : ""}`}
            onClick={() => setActiveTab("merge")}
          >
            📑 Merge PDF
          </button>
          <button
            className={`tool-subtab ${activeTab === "split" ? "active" : ""}`}
            onClick={() => setActiveTab("split")}
          >
            ✂️ Split / Delete Pages
          </button>
          <button
            className={`tool-subtab ${activeTab === "rotate" ? "active" : ""}`}
            onClick={() => setActiveTab("rotate")}
          >
            ↻ Rotate PDF
          </button>
        </div>

        {/* Tab 1: Images to PDF */}
        {activeTab === "img2pdf" && (
          <div className="tab-pane">
            <section className="tool-section">
              <label className="upload-dropzone">
                <input type="file" accept="image/*" multiple onChange={onImagesUpload} />
                <div className="dropzone-content">
                  <span className="dropzone-icon">🖼️</span>
                  <div>
                    <strong>Choose Images to Convert to PDF (JPG, PNG, WebP)</strong>
                    <p>Select single or multiple photos from phone, camera, or WhatsApp</p>
                  </div>
                  <span className="btn-browse">Browse Images</span>
                </div>
              </label>
            </section>

            {images.length > 0 && (
              <div className="workbench-grid">
                <div className="crop-editor-card">
                  <div className="card-header">
                    <h3>Page Layout Settings</h3>
                    <span>{images.length} Image(s) Added</span>
                  </div>

                  <div className="sheet-config-row">
                    <label>
                      Paper Size:
                      <select value={pageSize} onChange={(e) => setPageSize(e.target.value as any)}>
                        <option value="A4">A4 (210 × 297 mm)</option>
                        <option value="4x6">4×6 Inch</option>
                        <option value="Letter">US Letter</option>
                      </select>
                    </label>

                    <label>
                      Orientation:
                      <select
                        value={pageOrientation}
                        onChange={(e) => setPageOrientation(e.target.value as any)}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </label>

                    <label>
                      Margins:
                      <select
                        value={marginMm}
                        onChange={(e) => setMarginMm(Number(e.target.value))}
                      >
                        <option value="0">0 mm (Edge-to-Edge)</option>
                        <option value="5">5 mm (Narrow)</option>
                        <option value="10">10 mm (Standard)</option>
                        <option value="15">15 mm (Wide)</option>
                      </select>
                    </label>
                  </div>

                  <button
                    className="btn-primary-apply"
                    onClick={generateImagesPdf}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Converting..." : "✓ Generate & Download PDF ⬇"}
                  </button>
                </div>

                <div className="result-preview-card">
                  <div className="card-header">
                    <h3>Reorder Pages</h3>
                  </div>
                  <div className="img-reorder-grid">
                    {images.map((img, idx) => (
                      <div key={img.id} className="img-reorder-item">
                        <span className="reorder-idx">Page {idx + 1}</span>
                        <img src={img.dataUrl} alt={img.name} className="reorder-thumb" />
                        <span className="reorder-title">{img.name.slice(0, 16)}</span>
                        <div className="reorder-btns">
                          {idx > 0 && (
                            <button className="btn-tiny" onClick={() => moveImage(idx, idx - 1)}>
                              ←
                            </button>
                          )}
                          {idx < images.length - 1 && (
                            <button className="btn-tiny" onClick={() => moveImage(idx, idx + 1)}>
                              →
                            </button>
                          )}
                          <button className="btn-tiny-del" onClick={() => removeImage(idx)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Merge PDF */}
        {activeTab === "merge" && (
          <div className="tab-pane">
            <section className="tool-section">
              <label className="upload-dropzone">
                <input type="file" accept=".pdf" multiple onChange={onMergePdfsUpload} />
                <div className="dropzone-content">
                  <span className="dropzone-icon">📑</span>
                  <div>
                    <strong>Choose PDF Files to Merge Together</strong>
                    <p>Select two or more PDFs to combine into a single document</p>
                  </div>
                  <span className="btn-browse">Browse PDFs</span>
                </div>
              </label>
            </section>

            {mergeFiles.length > 0 && (
              <div className="crop-editor-card">
                <div className="card-header">
                  <h3>Files to Combine in Order</h3>
                  <span>{mergeFiles.length} File(s)</span>
                </div>

                <div className="merge-list">
                  {mergeFiles.map((file, idx) => (
                    <div key={file.id} className="merge-item-row">
                      <span className="merge-num">{idx + 1}.</span>
                      <strong className="merge-name">{file.name}</strong>
                      <span className="merge-pages">{file.pageCount} pages</span>
                      <div className="reorder-btns">
                        {idx > 0 && (
                          <button
                            className="btn-tiny"
                            onClick={() => {
                              const copy = [...mergeFiles];
                              const [removed] = copy.splice(idx, 1);
                              copy.splice(idx - 1, 0, removed);
                              setMergeFiles(copy);
                            }}
                          >
                            ↑ Up
                          </button>
                        )}
                        {idx < mergeFiles.length - 1 && (
                          <button
                            className="btn-tiny"
                            onClick={() => {
                              const copy = [...mergeFiles];
                              const [removed] = copy.splice(idx, 1);
                              copy.splice(idx + 1, 0, removed);
                              setMergeFiles(copy);
                            }}
                          >
                            ↓ Down
                          </button>
                        )}
                        <button
                          className="btn-tiny-del"
                          onClick={() => setMergeFiles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-primary-apply"
                  onClick={executeMergePdfs}
                  disabled={isProcessing || mergeFiles.length < 2}
                >
                  {isProcessing ? "Merging..." : "✓ Merge & Download Combined PDF ⬇"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Split / Delete Pages */}
        {activeTab === "split" && (
          <div className="tab-pane">
            <section className="tool-section">
              <label className="upload-dropzone">
                <input type="file" accept=".pdf" onChange={onSinglePdfUpload} />
                <div className="dropzone-content">
                  <span className="dropzone-icon">✂️</span>
                  <div>
                    <strong>Choose a PDF to Split or Delete Pages</strong>
                    <p>Upload any PDF document to remove unneeded pages or extract specific ranges</p>
                  </div>
                  <span className="btn-browse">Browse PDF</span>
                </div>
              </label>
            </section>

            {singlePdf && (
              <div className="crop-editor-card">
                <div className="card-header">
                  <h3>{singlePdf.name} ({singlePdf.pageCount} total pages)</h3>
                </div>

                <div className="pages-interactive-grid">
                  <p className="hint-text">
                    Click any page box to mark it for deletion (red), or enter a range below:
                  </p>
                  <div className="page-box-tiles">
                    {Array.from({ length: singlePdf.pageCount }, (_, i) => i + 1).map((num) => {
                      const isDeleted = deletedPages.includes(num);
                      return (
                        <button
                          key={num}
                          type="button"
                          className={`page-tile-btn ${isDeleted ? "deleted" : "kept"}`}
                          onClick={() => {
                            setDeletedPages((prev) =>
                              prev.includes(num) ? prev.filter((p) => p !== num) : [...prev, num]
                            );
                          }}
                        >
                          <span className="tile-num">{num}</span>
                          <span className="tile-status">{isDeleted ? "✕ Remove" : "✓ Keep"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="range-extract-row">
                  <label>
                    Or Extract Page Range:
                    <input
                      type="text"
                      placeholder="e.g. 1-3, 5, 8"
                      value={pagesSelection}
                      onChange={(e) => setPagesSelection(e.target.value)}
                    />
                  </label>
                </div>

                <button
                  className="btn-primary-apply"
                  onClick={executeExtractOrDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "✓ Save & Download Modified PDF ⬇"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Rotate PDF */}
        {activeTab === "rotate" && (
          <div className="tab-pane">
            <section className="tool-section">
              <label className="upload-dropzone">
                <input type="file" accept=".pdf" onChange={onSinglePdfUpload} />
                <div className="dropzone-content">
                  <span className="dropzone-icon">↻</span>
                  <div>
                    <strong>Choose a PDF to Rotate</strong>
                    <p>Fix sideways or upside-down scanned PDF documents</p>
                  </div>
                  <span className="btn-browse">Browse PDF</span>
                </div>
              </label>
            </section>

            {singlePdf && (
              <div className="crop-editor-card">
                <div className="card-header">
                  <h3>Rotate: {singlePdf.name} ({singlePdf.pageCount} pages)</h3>
                </div>

                <div className="rotate-angle-picker">
                  <button
                    className={`angle-btn ${rotateAngle === 90 ? "active" : ""}`}
                    onClick={() => setRotateAngle(90)}
                  >
                    ↻ 90° Clockwise
                  </button>
                  <button
                    className={`angle-btn ${rotateAngle === 180 ? "active" : ""}`}
                    onClick={() => setRotateAngle(180)}
                  >
                    ⇅ 180° Upside Down
                  </button>
                  <button
                    className={`angle-btn ${rotateAngle === 270 ? "active" : ""}`}
                    onClick={() => setRotateAngle(270)}
                  >
                    ↺ 270° Counter-Clockwise
                  </button>
                </div>

                <button
                  className="btn-primary-apply"
                  onClick={executeRotatePdf}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Rotating..." : `✓ Rotate by ${rotateAngle}° & Download PDF ⬇`}
                </button>
              </div>
            )}
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
