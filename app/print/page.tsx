"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";

type PrintMode = "bw" | "colour";
type Orientation = "portrait" | "landscape";
type PaperSize = "A4" | "A3" | "A5" | "letter";
type Duplex = "single" | "double";
type QuoteState = "idle" | "pending" | "ready";
type JobState = "editing" | "submitted";

type LocalPrintJob = {
  id: string;
  queueNumber: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  pageSelection: string;
  selectedPages: number;
  copies: number;
  printMode: PrintMode;
  paperSize: PaperSize;
  orientation: Orientation;
  duplex: Duplex;
  amount: number;
  status: "awaiting_payment";
  createdAt: string;
};

const acceptedExtensions = [".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt", ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".xls", ".xlsx", ".csv", ".ods", ".ppt", ".pptx", ".odp"];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"]);

function extensionOf(file: File) {
  return `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
}

function fileKind(file: File) {
  const extension = extensionOf(file);
  if (extension === ".pdf") return "PDF";
  if (imageExtensions.has(extension)) return extension.slice(1).toUpperCase();
  return extension.slice(1).toUpperCase();
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countSelectedPages(selection: string, pageCount: number) {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 10_000) return null;
  if (selection.trim().toLowerCase() === "all") return pageCount;
  const pages = new Set<number>();
  for (const part of selection.split(",").map((value) => value.trim())) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) return null;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > pageCount) return null;
    for (let page = start; page <= end; page += 1) pages.add(page);
  }
  return pages.size || null;
}

export default function PrintPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [range, setRange] = useState("All pages");
  const [pageCount, setPageCount] = useState(1);
  const [copies, setCopies] = useState(1);
  const [mode, setMode] = useState<PrintMode>("bw");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [duplex, setDuplex] = useState<Duplex>("single");
  const [quoteState, setQuoteState] = useState<QuoteState>("idle");
  const [jobState, setJobState] = useState<JobState>("editing");
  const [queueNumber, setQueueNumber] = useState("");
  const [error, setError] = useState("");

  const imagePage = Boolean(file && imageExtensions.has(extensionOf(file)));
  const normalizedRange = range.trim().toLowerCase();
  const rangeIsValid = normalizedRange === "all" || /^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(normalizedRange);
  const selectedPages = useMemo(() => countSelectedPages(range, pageCount), [pageCount, range]);
  const estimatedSides = useMemo(() => (selectedPages ?? 0) * Math.max(1, copies), [copies, selectedPages]);
  const rate = mode === "bw" ? 5 : 10;

  function selectFile(selected?: File) {
    if (!selected) return;
    const extension = extensionOf(selected);
    if (!acceptedExtensions.includes(extension)) {
      setError("This format is not supported. Choose a document, image, spreadsheet, or presentation from the supported list.");
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError("This file is larger than the 25 MB customer upload limit.");
      return;
    }
    setFile(selected);
    setPageCount(imageExtensions.has(extension) ? 1 : 1);
    setError("");
    setJobState("editing");
    setQuoteState("idle");
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0]);
  }

  function requestQuote() {
    if (!file) return;
    if (!rangeIsValid || !selectedPages) {
      setError("Check the page total and use “All pages” or a range such as 1-3,5.");
      return;
    }
    setError("");
    setQuoteState("pending");
    window.setTimeout(() => setQuoteState("ready"), 650);
  }

  function submitJob() {
    if (!file || quoteState !== "ready" || !selectedPages) return;
    const nextQueueNumber = `CP-${Math.floor(1000 + Math.random() * 9000)}`;
    const job: LocalPrintJob = {
      id: crypto.randomUUID(), queueNumber: nextQueueNumber, fileName: file.name, fileType: fileKind(file), fileSize: file.size,
      pageCount, pageSelection: range.trim() || "All pages", selectedPages, copies, printMode: mode, paperSize, orientation, duplex,
      amount: estimatedSides * rate, status: "awaiting_payment", createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(window.localStorage.getItem("cyberprint-local-jobs") ?? "[]") as LocalPrintJob[];
    window.localStorage.setItem("cyberprint-local-jobs", JSON.stringify([job, ...existing]));
    window.dispatchEvent(new Event("cyberprint-jobs-changed"));
    setQueueNumber(nextQueueNumber);
    setJobState("submitted");
  }

  return (
    <main className="cyberprint-page">
      <header className="cyberprint-header">
        <a className="cyberprint-brand" href="/" aria-label="Paperloop home">
          <span className="cyberprint-brand-mark">C</span>
          <span>CyberPrint <b>Pay</b></span>
        </a>
        <span className="cyberprint-secure"><span aria-hidden="true">◉</span> Secure request</span>
      </header>

      <section className="cyberprint-hero" aria-labelledby="cyberprint-title">
        <p className="cyberprint-kicker">PRINT FROM YOUR PHONE</p>
        <h1 id="cyberprint-title">Send it. Pay at the counter. <em>We’ll print it.</em></h1>
        <p>Upload a file, choose your print settings, and receive a queue number. Your document is only printed after an operator confirms payment.</p>
      </section>

      {jobState === "submitted" ? (
        <section className="cyberprint-status-card" aria-live="polite">
          <div className="cyberprint-status-icon" aria-hidden="true">✓</div>
          <p className="cyberprint-kicker">REQUEST RECEIVED</p>
          <h2>Queue number <span>{queueNumber}</span></h2>
          <p className="cyberprint-status-copy">Show this number at the counter to pay. Your job is waiting for payment confirmation and will not print automatically.</p>
          <ol className="cyberprint-timeline">
            <li className="is-done"><span>1</span><div><strong>Request submitted</strong><small>Your document and settings were recorded.</small></div></li>
            <li className="is-current"><span>2</span><div><strong>Pay at the counter</strong><small>Give the queue number to the operator.</small></div></li>
            <li><span>3</span><div><strong>Print in progress</strong><small>We’ll update this page when the printer finishes.</small></div></li>
          </ol>
          <button className="cyberprint-secondary" type="button" onClick={() => setJobState("editing")}>Create another request</button>
          <p className="cyberprint-fineprint">The counter can collect cash or a locked UPI amount from the Operator panel.</p>
        </section>
      ) : (
        <section className="cyberprint-workflow" aria-label="Create a print request">
          <div className="cyberprint-steps" aria-label="Workflow progress">
            <span className="is-active">1 <b>Upload</b></span><i />
            <span>2 <b>Settings</b></span><i />
            <span>3 <b>Queue</b></span>
          </div>

          <div className="cyberprint-layout">
            <div className="cyberprint-main-card">
              <section className="cyberprint-section" aria-labelledby="upload-heading">
                <div className="cyberprint-section-heading"><span className="cyberprint-number">01</span><div><h2 id="upload-heading">Upload your file</h2><p>Documents, images, spreadsheets, and presentations up to 25 MB.</p></div></div>
                <div className={`cyberprint-upload ${file ? "has-file" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
                  <input ref={fileInput} type="file" accept={acceptedExtensions.join(",")} onChange={onChange} />
                  {file ? <><span className="cyberprint-file-icon" aria-hidden="true">{fileKind(file) === "PDF" ? "▤" : "▧"}</span><div className="cyberprint-file-details"><strong>{file.name}</strong><small>{fileKind(file)} · {formatBytes(file.size)}</small></div><button type="button" className="cyberprint-change-file" onClick={() => fileInput.current?.click()}>Change</button></> : <><span className="cyberprint-upload-icon" aria-hidden="true">↑</span><div><strong>Drop your file here</strong><small>or choose it from this device</small></div><button type="button" className="cyberprint-browse" onClick={() => fileInput.current?.click()}>Browse files</button></>}
                </div>
                {error && <p className="cyberprint-error" role="alert">{error}</p>}
                <p className="cyberprint-privacy-note"><span aria-hidden="true">⌁</span> Your upload stays private. It is not available as a public link and is deleted on the shop’s retention schedule.</p>
              </section>

              <section className="cyberprint-section" aria-labelledby="settings-heading">
                <div className="cyberprint-section-heading"><span className="cyberprint-number">02</span><div><h2 id="settings-heading">Print settings</h2><p>Final page count and price are verified securely by the server.</p></div></div>
                <div className="cyberprint-fields">
                  <label className="cyberprint-field cyberprint-field-wide">Page range<input value={range} onChange={(event) => { setRange(event.target.value); setQuoteState("idle"); }} placeholder="All pages or 1-3,5" /><small>Use “All pages” or a range like 1-3,5.</small></label>
                  <label className="cyberprint-field">Pages in file<input type="number" min="1" max="10000" value={pageCount} onChange={(event) => { setPageCount(Math.max(1, Number(event.target.value) || 1)); setQuoteState("idle"); }} disabled={imagePage} /><small>{imagePage ? "Image files have one page." : "Final count is checked after upload."}</small></label>
                  <div className="cyberprint-field"><span>Copies</span><div className="cyberprint-stepper"><button type="button" aria-label="Decrease copies" onClick={() => { setCopies((value) => Math.max(1, value - 1)); setQuoteState(file ? "idle" : "idle"); }}>−</button><output>{copies}</output><button type="button" aria-label="Increase copies" onClick={() => { setCopies((value) => Math.min(99, value + 1)); setQuoteState(file ? "idle" : "idle"); }}>+</button></div></div>
                  <fieldset className="cyberprint-field cyberprint-field-wide"><legend>Print mode</legend><div className="cyberprint-option-row"><button type="button" className={mode === "bw" ? "is-selected" : ""} onClick={() => { setMode("bw"); setQuoteState(file ? "idle" : "idle"); }}><span aria-hidden="true">◐</span><strong>Black & white</strong><small>₹5 per side</small></button><button type="button" className={mode === "colour" ? "is-selected" : ""} onClick={() => { setMode("colour"); setQuoteState(file ? "idle" : "idle"); }}><span aria-hidden="true">◒</span><strong>Colour</strong><small>₹10 per side</small></button></div></fieldset>
                  <div className="cyberprint-field"><label>Paper size<select value={paperSize} onChange={(event) => { setPaperSize(event.target.value as PaperSize); setQuoteState("idle"); }}><option value="A4">A4</option><option value="A3">A3</option><option value="A5">A5</option><option value="letter">Letter</option></select></label></div>
                  <fieldset className="cyberprint-field"><legend>Printing sides</legend><div className="cyberprint-orientation"><button type="button" className={duplex === "single" ? "is-selected" : ""} onClick={() => { setDuplex("single"); setQuoteState("idle"); }}>One-sided</button><button type="button" className={duplex === "double" ? "is-selected" : ""} onClick={() => { setDuplex("double"); setQuoteState("idle"); }}>Double-sided</button></div></fieldset>
                  <fieldset className="cyberprint-field cyberprint-field-wide"><legend>Orientation</legend><div className="cyberprint-orientation"><button type="button" className={orientation === "portrait" ? "is-selected" : ""} onClick={() => { setOrientation("portrait"); setQuoteState("idle"); }}><i className="cyberprint-page-shape portrait" aria-hidden="true" />Portrait</button><button type="button" className={orientation === "landscape" ? "is-selected" : ""} onClick={() => { setOrientation("landscape"); setQuoteState("idle"); }}><i className="cyberprint-page-shape landscape" aria-hidden="true" />Landscape</button></div></fieldset>
                </div>
              </section>
            </div>

            <aside className="cyberprint-summary" aria-label="Order summary">
              <p className="cyberprint-kicker">YOUR REQUEST</p>
              <h2>Ready when you are.</h2>
              <dl>
                <div><dt>File</dt><dd>{file ? file.name : "Not selected"}</dd></div>
                <div><dt>Range</dt><dd>{range || "All pages"}</dd></div>
                <div><dt>Pages × copies</dt><dd>{selectedPages ?? "—"} × {copies}</dd></div>
                <div><dt>Mode</dt><dd>{mode === "bw" ? "Black & white" : "Colour"}</dd></div>
                <div><dt>Paper</dt><dd>{paperSize === "letter" ? "Letter" : paperSize}</dd></div>
                <div><dt>Orientation</dt><dd>{orientation === "portrait" ? "Portrait" : "Landscape"}</dd></div>
                <div><dt>Sides</dt><dd>{duplex === "single" ? "One-sided" : "Double-sided"}</dd></div>
              </dl>
              <div className="cyberprint-quote">
                <div><span>Request total</span><strong>{quoteState === "ready" ? `₹${estimatedSides * rate}` : quoteState === "pending" ? "Checking file…" : "Calculate total"}</strong></div>
                <p>{quoteState === "ready" ? `${selectedPages} printed ${selectedPages === 1 ? "side" : "sides"} × ${copies} ${copies === 1 ? "copy" : "copies"} × ₹${rate}. ${duplex === "double" ? "Double-sided availability is confirmed by the operator." : "One-sided print."}` : "The server validates file safety and confirms this requested price before a job is accepted."}</p>
                {file && quoteState !== "pending" && <button type="button" className="cyberprint-text-button" onClick={requestQuote}>{quoteState === "ready" ? "Refresh quote" : "Check file first"}</button>}
              </div>
              <button className="cyberprint-submit" type="button" disabled={!file || quoteState !== "ready"} onClick={submitJob}>Submit print request <span aria-hidden="true">→</span></button>
              <p className="cyberprint-fineprint">No printing happens at submission. Pay first, then an operator approves the request.</p>
            </aside>
          </div>
        </section>
      )}

      <footer className="cyberprint-footer"><span>CYBERPRINT PAY</span><p>Private upload · Counter payment · Operator-approved printing</p><a href="/">Back to Paperloop</a></footer>
    </main>
  );
}
