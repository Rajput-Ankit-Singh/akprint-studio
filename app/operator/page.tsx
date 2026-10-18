"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type JobStatus = "awaiting_payment" | "payment_received" | "approved" | "printing" | "completed" | "failed_review" | "cancelled";
type PaymentMethod = "cash" | "upi";

type PrintJob = {
  id: string;
  queueNumber: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  pageSelection: string;
  selectedPages: number;
  copies: number;
  printMode: "bw" | "colour";
  paperSize: string;
  orientation: "portrait" | "landscape";
  duplex: "single" | "double";
  amount: number;
  status: JobStatus;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  paymentReceivedAt?: string;
  approvedAt?: string;
  completedAt?: string;
};

const STORAGE_KEY = "cyberprint-local-jobs";
const OPERATOR_UPI_ID = "uniquehacker@axl";

function readJobs(): PrintJob[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function statusLabel(status: JobStatus) {
  return status.replaceAll("_", " ");
}

export default function OperatorPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qrCanvas = useRef<HTMLCanvasElement>(null);

  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;
  const upiUri = useMemo(() => selected
    ? `upi://pay?${new URLSearchParams({ pa: OPERATOR_UPI_ID, pn: "CyberPrint Pay", am: selected.amount.toFixed(2), cu: "INR", tn: `Print job ${selected.queueNumber}` })}`
    : "", [selected]);

  function syncJobs() {
    const next = readJobs();
    setJobs(next);
    setSelectedId((current) => current && next.some((job) => job.id === current) ? current : (next[0]?.id ?? null));
  }

  useEffect(() => {
    syncJobs();
    window.addEventListener("storage", syncJobs);
    window.addEventListener("cyberprint-jobs-changed", syncJobs);
    return () => {
      window.removeEventListener("storage", syncJobs);
      window.removeEventListener("cyberprint-jobs-changed", syncJobs);
    };
  }, []);

  useEffect(() => {
    if (!qrCanvas.current || !upiUri) return;
    QRCode.toCanvas(qrCanvas.current, upiUri, { width: 190, margin: 1, color: { dark: "#14281f", light: "#ffffff" } });
  }, [upiUri]);

  function updateSelected(patch: Partial<PrintJob>) {
    if (!selected) return;
    const next = jobs.map((job) => job.id === selected.id ? { ...job, ...patch } : job);
    setJobs(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cyberprint-jobs-changed"));
  }

  const summary = {
    waiting: jobs.filter((job) => job.status === "awaiting_payment").length,
    active: jobs.filter((job) => ["payment_received", "approved", "printing"].includes(job.status)).length,
    completed: jobs.filter((job) => job.status === "completed").length,
    revenue: jobs.filter((job) => ["payment_received", "approved", "printing", "completed"].includes(job.status)).reduce((total, job) => total + job.amount, 0),
  };

  return <main className="operator-page">
    <header className="operator-header">
      <a className="cyberprint-brand" href="/" aria-label="Paperloop home"><span className="cyberprint-brand-mark">C</span><span>CyberPrint <b>Pay</b></span></a>
      <div><span className="operator-live"><i /> Local operator desk</span><a className="operator-home" href="/print">Customer view ↗</a></div>
    </header>

    <section className="operator-intro">
      <div><p className="cyberprint-kicker">COUNTER CONSOLE</p><h1>Review, collect, then <em>release prints.</em></h1><p>Every job remains blocked until you explicitly confirm the payment and approve it for printing.</p></div>
      <div className="operator-pricing"><span>Current rates</span><strong>₹5 B/W · ₹10 colour</strong><small>per printed side</small></div>
    </section>

    <section className="operator-stats" aria-label="Today’s summary">
      <article><span>Awaiting payment</span><strong>{summary.waiting}</strong></article>
      <article><span>In progress</span><strong>{summary.active}</strong></article>
      <article><span>Completed</span><strong>{summary.completed}</strong></article>
      <article><span>Collected today</span><strong>₹{summary.revenue}</strong></article>
    </section>

    <section className="operator-layout">
      <aside className="operator-queue" aria-label="Print queue">
        <div className="operator-section-title"><div><p className="cyberprint-kicker">LIVE QUEUE</p><h2>Print requests</h2></div><button onClick={syncJobs} type="button">Refresh</button></div>
        {jobs.length === 0 ? <div className="operator-empty"><span>⌁</span><strong>No local requests yet</strong><p>Customer requests sent from CyberPrint Pay will appear here.</p></div> : <div className="operator-job-list">{jobs.map((job) => <button type="button" key={job.id} onClick={() => setSelectedId(job.id)} className={job.id === selected?.id ? "is-selected" : ""}><div><strong>{job.queueNumber}</strong><small>{job.fileName}</small></div><span className={`operator-status ${job.status}`}>{statusLabel(job.status)}</span><b>₹{job.amount}</b></button>)}</div>}
      </aside>

      <section className="operator-detail" aria-live="polite">
        {!selected ? <div className="operator-empty detail-empty"><span>◫</span><h2>Select a request</h2><p>Payment, approval, and print controls appear here.</p></div> : <>
          <div className="operator-detail-heading"><div><p className="cyberprint-kicker">{selected.queueNumber}</p><h2>{selected.fileName}</h2><p>{selected.fileType} · {selected.pageCount} page{selected.pageCount === 1 ? "" : "s"} · requested {new Date(selected.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div><span className={`operator-status large ${selected.status}`}>{statusLabel(selected.status)}</span></div>

          <div className="operator-job-details">
            <dl><div><dt>Pages</dt><dd>{selected.pageSelection} ({selected.selectedPages} selected)</dd></div><div><dt>Copies</dt><dd>{selected.copies}</dd></div><div><dt>Mode</dt><dd>{selected.printMode === "bw" ? "Black & white" : "Colour"}</dd></div><div><dt>Paper</dt><dd>{selected.paperSize.toUpperCase()} · {selected.orientation}</dd></div><div><dt>Sides</dt><dd>{selected.duplex === "double" ? "Double-sided" : "One-sided"}</dd></div></dl>
            <div className="operator-total"><span>Locked job total</span><strong>₹{selected.amount}</strong><small>{selected.selectedPages} sides × {selected.copies} copies × ₹{selected.printMode === "bw" ? 5 : 10}</small></div>
          </div>

          {selected.status === "awaiting_payment" && <div className="operator-payment">
            <div className="operator-payment-copy"><p className="cyberprint-kicker">COLLECT PAYMENT</p><h3>Payment amount is locked</h3><p>Only confirm payment after you receive cash or see a completed UPI payment in your app.</p><div className="operator-cash"><button type="button" onClick={() => updateSelected({ status: "payment_received", paymentMethod: "cash", paymentReceivedAt: new Date().toISOString() })}>Mark ₹{selected.amount} cash received</button></div><div className="operator-app-links"><a href={upiUri}>Open installed UPI app</a><a href={`tez://upi/pay?${upiUri.split("?")[1]}`}>Google Pay</a></div></div>
            <div className="operator-qr"><canvas ref={qrCanvas} /><strong>Scan to pay ₹{selected.amount}</strong><span>{OPERATOR_UPI_ID}</span><button type="button" onClick={() => updateSelected({ status: "payment_received", paymentMethod: "upi", paymentReceivedAt: new Date().toISOString() })}>I have verified this UPI payment</button></div>
          </div>}

          {selected.status === "payment_received" && <div className="operator-action-card"><div><p className="cyberprint-kicker">PAYMENT RECORDED</p><h3>Ready for your approval</h3><p>{selected.paymentMethod === "cash" ? "Cash" : "UPI"} recorded. The printer still cannot receive this job.</p></div><div><button className="operator-approve" type="button" onClick={() => updateSelected({ status: "approved", approvedAt: new Date().toISOString() })}>Approve for printing →</button><button className="operator-reject" type="button" onClick={() => updateSelected({ status: "cancelled" })}>Cancel job</button></div></div>}

          {selected.status === "approved" && <div className="operator-action-card"><div><p className="cyberprint-kicker">APPROVED</p><h3>Send to printer only when ready</h3><p>This action records that printing has begun. A production agent must report the final spooler outcome.</p></div><button className="operator-approve" type="button" onClick={() => updateSelected({ status: "printing" })}>Start printing</button></div>}

          {selected.status === "printing" && <div className="operator-action-card"><div><p className="cyberprint-kicker">PRINTING</p><h3>Confirm the physical result</h3><p>Do not reprint if the physical result is uncertain—flag it for review instead.</p></div><div><button className="operator-approve" type="button" onClick={() => updateSelected({ status: "completed", completedAt: new Date().toISOString() })}>Mark completed</button><button className="operator-reject" type="button" onClick={() => updateSelected({ status: "failed_review" })}>Needs review</button></div></div>}

          {(["completed", "failed_review", "cancelled"] as JobStatus[]).includes(selected.status) && <div className="operator-closed"><span>{selected.status === "completed" ? "✓" : "!"}</span><div><strong>{statusLabel(selected.status)}</strong><p>{selected.status === "completed" ? "This job has been marked complete." : "No automatic retry will be performed."}</p></div></div>}
        </>}
      </section>
    </section>

    <footer className="cyberprint-footer"><span>CYBERPRINT PAY</span><p>Payment verified by operator · Approval required before printing</p><a href="/">Back to Paperloop</a></footer>
  </main>;
}
