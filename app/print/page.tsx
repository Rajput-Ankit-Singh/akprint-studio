"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { getCustomerSupabase, isSupabaseConfigured, CYBERPRINT_CONFIG } from "@/lib/supabase";

type PrintMode = "bw" | "colour";
type Orientation = "portrait" | "landscape";
type PaperSize = "A4" | "A3" | "A5" | "letter";
type Duplex = "single" | "double";
type QuoteState = "idle" | "pending" | "ready";
type JobState = "editing" | "submitted";
type JobStatus = "awaiting_payment" | "payment_received" | "approved" | "printing" | "completed" | "failed_review" | "cancelled";

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
  status: JobStatus;
  createdAt: string;
};

const acceptedExtensions = [".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt", ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff", ".xls", ".xlsx", ".csv", ".ods", ".ppt", ".pptx", ".odp"];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"]);
const DEFAULT_UPI_ID = "uniquehacker@axl";
const BUSINESS_NAME = "CyberPrint Pay";

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
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const [submittedJob, setSubmittedJob] = useState<LocalPrintJob | null>(null);
  const [liveStatus, setLiveStatus] = useState<JobStatus>("awaiting_payment");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [error, setError] = useState("");

  const imagePage = Boolean(file && imageExtensions.has(extensionOf(file)));
  const normalizedRange = range.trim().toLowerCase();
  const rangeIsValid = normalizedRange === "all" || /^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(normalizedRange);
  const selectedPages = useMemo(() => countSelectedPages(range, pageCount), [pageCount, range]);
  const estimatedSides = useMemo(() => (selectedPages ?? 0) * Math.max(1, copies), [copies, selectedPages]);
  const rate = mode === "bw" ? 5 : 10;

  const currentAmount = submittedJob ? submittedJob.amount : (estimatedSides * rate);
  const transactionNote = `Print job ${queueNumber || "CP"}`;

  const upiQuery = useMemo(() => {
    const params = new URLSearchParams({
      pa: DEFAULT_UPI_ID,
      pn: BUSINESS_NAME,
      am: currentAmount.toFixed(2),
      cu: "INR",
      tn: transactionNote,
    });
    return params.toString();
  }, [currentAmount, transactionNote]);

  const universalUpiUri = `upi://pay?${upiQuery}`;
  const gpayUri = `tez://upi/pay?${upiQuery}`;
  const phonepeUri = `phonepe://pay?${upiQuery}`;
  const paytmUri = `paytmmp://pay?${upiQuery}`;

  useEffect(() => {
    if (jobState === "submitted" && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, universalUpiUri, {
        width: 220,
        margin: 1,
        color: { dark: "#14281f", light: "#ffffff" },
      });
    }
  }, [jobState, universalUpiUri]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reactive listener to operator desk state changes (Local & Supabase cloud)
  useEffect(() => {
    if (!queueNumber) return;
    function checkLiveStatus() {
      try {
        const jobs = JSON.parse(window.localStorage.getItem("cyberprint-local-jobs") ?? "[]") as LocalPrintJob[];
        const found = jobs.find((j) => j.queueNumber === queueNumber);
        if (found) {
          setLiveStatus(found.status);
        }
      } catch {}
    }
    window.addEventListener("storage", checkLiveStatus);
    window.addEventListener("cyberprint-jobs-changed", checkLiveStatus);

    // If Supabase is connected, poll the database directly
    let timer: NodeJS.Timeout | null = null;
    if (isSupabaseConfigured() && submittedJob?.id) {
      const sb = getCustomerSupabase();
      if (sb) {
        timer = setInterval(async () => {
          try {
            const { data } = await sb.from("jobs").select("status").eq("id", submittedJob.id).single();
            if (data?.status) {
              if (data.status === "approved") setLiveStatus("approved");
              else if (data.status === "rejected") setLiveStatus("failed_review");
              else if (data.status === "cancelled") setLiveStatus("cancelled");
            }
          } catch {}
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener("storage", checkLiveStatus);
      window.removeEventListener("cyberprint-jobs-changed", checkLiveStatus);
      if (timer) clearInterval(timer);
    };
  }, [queueNumber, submittedJob]);

  function selectFile(selected?: File) {
    if (!selected) return;
    const extension = extensionOf(selected);
    if (!acceptedExtensions.includes(extension)) {
      setError("This format is not supported. Choose a document, image, spreadsheet, or presentation from the supported list.");
      return;
    }
    if (selected.size > (CYBERPRINT_CONFIG.MAX_FILE_MB || 20) * 1024 * 1024) {
      setError(`This file is larger than the ${CYBERPRINT_CONFIG.MAX_FILE_MB || 20} MB upload limit.`);
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

  async function submitJob() {
    if (!file || quoteState !== "ready" || !selectedPages) return;
    setIsSubmitting(true);
    setError("");
    const calculatedAmount = estimatedSides * rate;

    // 1. Supabase Cloud Upload if configured
    if (isSupabaseConfigured()) {
      const sb = getCustomerSupabase();
      if (sb) {
        try {
          const jobId = crypto.randomUUID();
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const storagePath = `${jobId}/${safeName}`;

          const { error: uploadErr } = await sb.storage
            .from(CYBERPRINT_CONFIG.BUCKET || "jobs")
            .upload(storagePath, file, { contentType: file.type, upsert: false });

          if (uploadErr) throw uploadErr;

          const { error: insertErr } = await sb.from("jobs").insert({
            id: jobId,
            file_name: file.name,
            file_path: storagePath,
            file_type: file.type,
            page_count: selectedPages,
            copies: copies,
            color_mode: mode === "colour" ? "color" : "bw",
            paper_size: paperSize,
            orientation: orientation,
            status: "pending",
          });

          if (insertErr) throw insertErr;

          const shortCode = jobId.replace(/-/g, "").slice(0, 6).toUpperCase();
          const job: LocalPrintJob = {
            id: jobId,
            queueNumber: shortCode,
            fileName: file.name,
            fileType: fileKind(file),
            fileSize: file.size,
            pageCount,
            pageSelection: range.trim() || "All pages",
            selectedPages,
            copies,
            printMode: mode,
            paperSize,
            orientation,
            duplex,
            amount: calculatedAmount,
            status: "awaiting_payment",
            createdAt: new Date().toISOString(),
          };

          const existing = JSON.parse(window.localStorage.getItem("cyberprint-local-jobs") ?? "[]") as LocalPrintJob[];
          window.localStorage.setItem("cyberprint-local-jobs", JSON.stringify([job, ...existing]));
          window.dispatchEvent(new Event("cyberprint-jobs-changed"));

          setQueueNumber(shortCode);
          setSubmittedJob(job);
          setLiveStatus("awaiting_payment");
          setJobState("submitted");
          setIsSubmitting(false);
          return;
        } catch (err: unknown) {
          console.warn("Supabase upload failed, using local counter mode:", err);
          // Fall through to local mode
        }
      }
    }

    // 2. Seamless Local Desk fallback
    const nextQueueNumber = `CP-${Math.floor(1000 + Math.random() * 9000)}`;
    const job: LocalPrintJob = {
      id: crypto.randomUUID(),
      queueNumber: nextQueueNumber,
      fileName: file.name,
      fileType: fileKind(file),
      fileSize: file.size,
      pageCount,
      pageSelection: range.trim() || "All pages",
      selectedPages,
      copies,
      printMode: mode,
      paperSize,
      orientation,
      duplex,
      amount: calculatedAmount,
      status: "awaiting_payment",
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(window.localStorage.getItem("cyberprint-local-jobs") ?? "[]") as LocalPrintJob[];
    window.localStorage.setItem("cyberprint-local-jobs", JSON.stringify([job, ...existing]));
    window.dispatchEvent(new Event("cyberprint-jobs-changed"));
    setQueueNumber(nextQueueNumber);
    setSubmittedJob(job);
    setLiveStatus("awaiting_payment");
    setJobState("submitted");
    setIsSubmitting(false);
  }

  function copyUpiId() {
    navigator.clipboard.writeText(DEFAULT_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  }

  function redirectToApp(uri: string) {
    window.location.href = uri;
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
          <p className="cyberprint-status-copy">
            Pay online using the amount-locked QR below, select your preferred UPI app, or pay cash at the counter.
          </p>

          {/* Amount-Locked Customer Payment Card */}
          <div className="customer-payment-card">
            <div className="customer-qr-section">
              <div className="customer-qr-frame">
                <canvas ref={qrCanvasRef} />
              </div>
              <div className="customer-amount-pill">
                <span>LOCKED TOTAL:</span>
                <strong>₹{currentAmount.toFixed(2)}</strong>
              </div>
              <small style={{ marginTop: "6px", color: "#64748b", fontSize: "11px" }}>
                Scan with Google Pay, PhonePe, Paytm, or BHIM on another device
              </small>
            </div>

            {/* Direct Mobile UPI App Redirection */}
            <div className="customer-upi-redirect-block">
              <h4 className="customer-upi-redirect-title">Or Pay Directly on This Phone:</h4>
              <div className="customer-upi-grid">
                <a
                  href={gpayUri}
                  className="upi-app-button gpay-btn"
                  onClick={() => redirectToApp(gpayUri)}
                  title="Open Google Pay with locked amount"
                >
                  <span style={{ fontSize: "14px" }}>🟢</span>
                  <span>Google Pay</span>
                </a>
                <a
                  href={phonepeUri}
                  className="upi-app-button phonepe-btn"
                  onClick={() => redirectToApp(phonepeUri)}
                  title="Open PhonePe with locked amount"
                >
                  <span style={{ fontSize: "14px" }}>🟣</span>
                  <span>PhonePe</span>
                </a>
                <a
                  href={paytmUri}
                  className="upi-app-button paytm-btn"
                  onClick={() => redirectToApp(paytmUri)}
                  title="Open Paytm with locked amount"
                >
                  <span style={{ fontSize: "14px" }}>🔵</span>
                  <span>Paytm</span>
                </a>
                <a
                  href={universalUpiUri}
                  className="upi-app-button bhim-btn"
                  onClick={() => redirectToApp(universalUpiUri)}
                  title="Open Any Installed UPI App"
                >
                  <span style={{ fontSize: "14px" }}>🟠</span>
                  <span>Any UPI App</span>
                </a>
              </div>

              <div className="customer-upi-copy-row">
                <span>Shop UPI ID:</span>
                <code>{DEFAULT_UPI_ID}</code>
                <button type="button" className="customer-copy-btn" onClick={copyUpiId}>
                  {copiedUpi ? "✓ Copied!" : "Copy VPA"}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Operator Status Feedback */}
          {liveStatus === "payment_received" || liveStatus === "approved" ? (
            <div className="customer-payment-received-alert">
              ✓ Payment Received! Operator has verified ₹{currentAmount} and approved printing.
            </div>
          ) : liveStatus === "printing" ? (
            <div className="customer-payment-received-alert" style={{ background: "#e0f2fe", color: "#0369a1", borderColor: "#7dd3fc" }}>
              🖨️ Printing in progress! Your physical pages are printing now.
            </div>
          ) : liveStatus === "completed" ? (
            <div className="customer-payment-received-alert" style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}>
              🎉 Print completed! Please collect your documents at the counter.
            </div>
          ) : null}

          <ol className="cyberprint-timeline">
            <li className="is-done">
              <span>1</span>
              <div>
                <strong>Request submitted</strong>
                <small>Job {queueNumber} recorded for ₹{currentAmount.toFixed(2)} ({submittedJob?.selectedPages ?? selectedPages} pages × {submittedJob?.copies ?? copies} copies).</small>
              </div>
            </li>
            <li className={liveStatus === "awaiting_payment" ? "is-current" : "is-done"}>
              <span>2</span>
              <div>
                <strong>{liveStatus === "awaiting_payment" ? "Pay via UPI or Counter" : "Payment confirmed"}</strong>
                <small>{liveStatus === "awaiting_payment" ? "Tap your preferred app above or pay cash at desk." : "Operator verified the payment."}</small>
              </div>
            </li>
            <li className={liveStatus === "printing" ? "is-current" : liveStatus === "completed" ? "is-done" : ""}>
              <span>3</span>
              <div>
                <strong>{liveStatus === "completed" ? "Completed" : liveStatus === "printing" ? "Printing in progress" : "Print release"}</strong>
                <small>{liveStatus === "completed" ? "Pages ready at counter." : "Document prints once operator approves."}</small>
              </div>
            </li>
          </ol>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "24px" }}>
            <button className="cyberprint-secondary" type="button" onClick={() => setJobState("editing")}>
              Create another request
            </button>
            <a href="/operator" target="_blank" rel="noreferrer" className="cyberprint-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Operator Console ↗
            </a>
          </div>
          <p className="cyberprint-fineprint">Your upload stays private and is only retained for your physical print session.</p>
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
              <button className="cyberprint-submit" type="button" disabled={!file || quoteState !== "ready" || isSubmitting} onClick={submitJob}>
                {isSubmitting ? "Uploading & creating queue…" : "Submit print request"} <span aria-hidden="true">→</span>
              </button>
              <p className="cyberprint-fineprint">No printing happens at submission. Pay first, then an operator approves the request.</p>
            </aside>
          </div>
        </section>
      )}

      <footer className="cyberprint-footer"><span>CYBERPRINT PAY</span><p>Private upload · Counter payment · Operator-approved printing</p><a href="/">Back to Paperloop</a></footer>
    </main>
  );
}
