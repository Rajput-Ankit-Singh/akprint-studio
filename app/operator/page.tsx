"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { getOperatorSupabase, isSupabaseConfigured, CYBERPRINT_CONFIG, DbPrintJob } from "@/lib/supabase";

type JobStatus = "awaiting_payment" | "payment_received" | "approved" | "printing" | "completed" | "failed_review" | "cancelled";
type PaymentMethod = "cash" | "upi";

type PrintJob = {
  id: string;
  queueNumber: string;
  fileName: string;
  filePath?: string | null;
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
  isCloud?: boolean;
};

const STORAGE_KEY = "cyberprint-local-jobs";
const OPERATOR_UPI_ID = CYBERPRINT_CONFIG.DEFAULT_UPI_ID;

function readLocalJobs(): PrintJob[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function statusLabel(status: JobStatus) {
  return status.replaceAll("_", " ");
}

export default function OperatorPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "completed">("all");
  const qrCanvas = useRef<HTMLCanvasElement>(null);

  // Cloud auth state
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);
  const [operatorUser, setOperatorUser] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  const selected = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;

  const upiUri = useMemo(() => {
    if (!selected) return "";
    const params = new URLSearchParams({
      pa: OPERATOR_UPI_ID,
      pn: CYBERPRINT_CONFIG.SHOP_NAME,
      am: selected.amount.toFixed(2),
      cu: "INR",
      tn: `Print job ${selected.queueNumber}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [selected]);

  // Check cloud connection and fetch Supabase jobs
  async function fetchCloudJobs() {
    const sb = getOperatorSupabase();
    if (!sb) return;

    try {
      const { data, error } = await sb
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        const cloudJobs: PrintJob[] = data.map((d: DbPrintJob) => ({
          id: d.id,
          queueNumber: d.id.replace(/-/g, "").slice(0, 6).toUpperCase(),
          fileName: d.file_name,
          filePath: d.file_path,
          fileType: d.file_type || "PDF",
          fileSize: 0,
          pageCount: d.page_count,
          pageSelection: "All",
          selectedPages: d.page_count,
          copies: d.copies,
          printMode: d.color_mode === "color" ? "colour" : "bw",
          paperSize: d.paper_size || "A4",
          orientation: (d.orientation as "portrait" | "landscape") || "portrait",
          duplex: "single",
          amount: d.total_price || (d.page_count * d.copies * (d.color_mode === "color" ? 10 : 5)),
          status: (d.status === "pending" ? "awaiting_payment" : d.status) as JobStatus,
          createdAt: d.created_at,
          isCloud: true,
        }));

        // Merge cloud jobs with any local jobs
        const local = readLocalJobs();
        const merged = [...cloudJobs];
        for (const loc of local) {
          if (!merged.some((m) => m.id === loc.id || m.queueNumber === loc.queueNumber)) {
            merged.push(loc);
          }
        }
        setJobs(merged);
        setSelectedId((current) => current && merged.some((j) => j.id === current) ? current : (merged[0]?.id ?? null));

        // 10-minute auto cleanup check
        cleanupExpiredCloudFiles(sb, data);
      }
    } catch (err: unknown) {
      console.warn("Could not fetch cloud jobs:", err);
    }
  }

  // Automatic cleanup of files older than 10 minutes
  async function cleanupExpiredCloudFiles(sb: ReturnType<typeof getOperatorSupabase>, dbJobs: DbPrintJob[]) {
    if (!sb) return;
    const now = Date.now();
    const tenMinutesMs = (CYBERPRINT_CONFIG.RETENTION_MINUTES || 10) * 60 * 1000;

    for (const j of dbJobs) {
      if (j.file_path && !j.file_deleted) {
        const jobAge = now - new Date(j.created_at).getTime();
        if (jobAge > tenMinutesMs) {
          try {
            await sb.storage.from(CYBERPRINT_CONFIG.BUCKET || "jobs").remove([j.file_path]);
            await sb.from("jobs").update({ file_deleted: true, file_path: null }).eq("id", j.id);
          } catch {}
        }
      }
    }
  }

  function syncJobs() {
    if (isSupabaseConfigured() && operatorUser) {
      fetchCloudJobs();
    } else {
      const next = readLocalJobs();
      setJobs(next);
      setSelectedId((current) => current && next.some((job) => job.id === current) ? current : (next[0]?.id ?? null));
    }
  }

  // Initial setup & auth listener
  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsCloudConfigured(configured);

    if (configured) {
      const sb = getOperatorSupabase();
      if (sb) {
        sb.auth.getSession().then(({ data }) => {
          if (data?.session?.user?.email) {
            setOperatorUser(data.session.user.email);
            fetchCloudJobs();
          } else {
            syncJobs();
          }
        });
      }
    } else {
      syncJobs();
    }

    window.addEventListener("storage", syncJobs);
    window.addEventListener("cyberprint-jobs-changed", syncJobs);
    const interval = setInterval(syncJobs, 10000);

    return () => {
      window.removeEventListener("storage", syncJobs);
      window.removeEventListener("cyberprint-jobs-changed", syncJobs);
      clearInterval(interval);
    };
  }, [operatorUser]);

  useEffect(() => {
    if (!qrCanvas.current || !upiUri) return;
    QRCode.toCanvas(qrCanvas.current, upiUri, {
      width: 190,
      margin: 1,
      color: { dark: "#14281f", light: "#ffffff" },
    });
  }, [upiUri]);

  async function handleOperatorLogin(e: React.FormEvent) {
    e.preventDefault();
    const sb = getOperatorSupabase();
    if (!sb) return;

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) throw error;
      if (data?.user?.email) {
        setOperatorUser(data.user.email);
        fetchCloudJobs();
      }
    } catch (err: unknown) {
      setLoginError((err as { message?: string }).message || "Invalid operator credentials");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleOperatorLogout() {
    const sb = getOperatorSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    setOperatorUser(null);
    syncJobs();
  }

  async function updateSelected(patch: Partial<PrintJob>) {
    if (!selected) return;
    const next = jobs.map((job) => (job.id === selected.id ? { ...job, ...patch } : job));
    setJobs(next);

    // Save locally
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cyberprint-jobs-changed"));

    // Sync to Supabase if it's a cloud job
    if (selected.isCloud && isSupabaseConfigured()) {
      const sb = getOperatorSupabase();
      if (sb) {
        let dbStatus = "pending";
        if (patch.status === "approved" || patch.status === "completed") dbStatus = "approved";
        else if (patch.status === "cancelled") dbStatus = "cancelled";
        else if (patch.status === "failed_review") dbStatus = "rejected";

        try {
          await sb.from("jobs").update({ status: dbStatus }).eq("id", selected.id);
        } catch {}
      }
    }
  }

  // Action: Approve & Print Document
  async function approveAndPrint(job: PrintJob) {
    setActionNotice(`Opening print dialog for ${job.fileName}…`);
    updateSelected({ status: "approved", approvedAt: new Date().toISOString() });

    if (job.filePath && isSupabaseConfigured()) {
      const sb = getOperatorSupabase();
      if (sb) {
        try {
          const { data, error } = await sb.storage
            .from(CYBERPRINT_CONFIG.BUCKET || "jobs")
            .createSignedUrl(job.filePath, 300);

          if (!error && data?.signedUrl) {
            const printWin = window.open(data.signedUrl, "_blank");
            if (printWin) {
              printWin.focus();
            }
            return;
          }
        } catch {}
      }
    }

    // Native browser print trigger
    window.print();
  }

  // Action: Download File to Counter PC
  async function downloadDocument(job: PrintJob) {
    if (job.filePath && isSupabaseConfigured()) {
      const sb = getOperatorSupabase();
      if (sb) {
        try {
          const { data, error } = await sb.storage
            .from(CYBERPRINT_CONFIG.BUCKET || "jobs")
            .download(job.filePath);

          if (!error && data) {
            const url = URL.createObjectURL(data);
            const a = document.createElement("a");
            a.href = url;
            a.download = job.fileName;
            a.click();
            URL.revokeObjectURL(url);
            setActionNotice(`Downloaded ${job.fileName} to this computer.`);
            return;
          }
        } catch {}
      }
    }
    setActionNotice(`File is stored locally on customer device.`);
  }

  const filteredJobs = useMemo(() => {
    if (filter === "all") return jobs;
    if (filter === "pending") return jobs.filter((j) => j.status === "awaiting_payment");
    if (filter === "approved") return jobs.filter((j) => ["payment_received", "approved", "printing"].includes(j.status));
    if (filter === "completed") return jobs.filter((j) => j.status === "completed");
    return jobs;
  }, [filter, jobs]);

  const summary = {
    waiting: jobs.filter((job) => job.status === "awaiting_payment").length,
    active: jobs.filter((job) => ["payment_received", "approved", "printing"].includes(job.status)).length,
    completed: jobs.filter((job) => job.status === "completed").length,
    revenue: jobs
      .filter((job) => ["payment_received", "approved", "printing", "completed"].includes(job.status))
      .reduce((total, job) => total + job.amount, 0),
  };

  return (
    <main className="operator-page">
      <header className="operator-header">
        <a className="cyberprint-brand" href="/" aria-label="Paperloop home">
          <span className="cyberprint-brand-mark">C</span>
          <span>
            CyberPrint <b>Pay</b>
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isCloudConfigured ? (
            operatorUser ? (
              <span className="operator-live" style={{ color: "#166534" }}>
                <i></i> Cloud Desk ({operatorUser})
              </span>
            ) : (
              <span className="operator-live" style={{ color: "#b45309" }}>
                <i style={{ background: "#f59e0b" }}></i> Cloud Ready (Signed Out)
              </span>
            )
          ) : (
            <span className="operator-live">
              <i></i> Local Counter Desk
            </span>
          )}

          {operatorUser && (
            <button
              type="button"
              onClick={handleOperatorLogout}
              style={{
                background: "transparent",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          )}

          <a className="operator-home" href="/print" target="_blank" rel="noreferrer">
            Customer View ↗
          </a>
        </div>
      </header>

      {/* Cloud Authentication Modal / Bar if configured but not signed in */}
      {isCloudConfigured && !operatorUser && (
        <section
          style={{
            margin: "18px 0",
            padding: "16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <strong style={{ display: "block", color: "#1e3a8a", fontSize: "14px" }}>
                ☁️ Supabase Cloud Queue Available
              </strong>
              <small style={{ color: "#3b82f6" }}>
                Sign in with your café operator credentials to receive prints sent from customer mobile phones.
              </small>
            </div>
            <form onSubmit={handleOperatorLogin} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="email"
                placeholder="Operator email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
              />
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  background: "#1d4ed8",
                  color: "#fff",
                  border: 0,
                  borderRadius: "6px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isLoggingIn ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
          {loginError && <p style={{ color: "#dc2626", fontSize: "11px", margin: "8px 0 0" }}>{loginError}</p>}
        </section>
      )}

      <section className="operator-intro">
        <div>
          <p className="cyberprint-kicker">COUNTER CONSOLE</p>
          <h1>
            Review, collect, then <em>release prints.</em>
          </h1>
          <p>
            Jobs remain blocked until you explicitly confirm the payment and release them to the printer.
            Uploaded files are deleted automatically 10 minutes after submission.
          </p>
        </div>
        <div className="operator-pricing">
          <span>Current rates</span>
          <strong>₹5 B/W · ₹10 colour</strong>
          <small>per printed side</small>
        </div>
      </section>

      {actionNotice && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: "8px", color: "#166534", fontSize: "12px", marginBottom: "16px" }}>
          {actionNotice}
        </div>
      )}

      <section className="operator-stats" aria-label="Today’s summary">
        <article>
          <span>Awaiting payment</span>
          <strong>{summary.waiting}</strong>
        </article>
        <article>
          <span>In progress</span>
          <strong>{summary.active}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{summary.completed}</strong>
        </article>
        <article>
          <span>Collected today</span>
          <strong>₹{summary.revenue}</strong>
        </article>
      </section>

      {/* Queue Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {(["all", "pending", "approved", "completed"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setFilter(tabKey)}
            style={{
              padding: "6px 14px",
              borderRadius: "99px",
              border: "1px solid #cbd5e1",
              background: filter === tabKey ? "#0f172a" : "#ffffff",
              color: filter === tabKey ? "#ffffff" : "#475569",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tabKey} ({tabKey === "all" ? jobs.length : tabKey === "pending" ? summary.waiting : tabKey === "approved" ? summary.active : summary.completed})
          </button>
        ))}
      </div>

      <section className="operator-layout">
        <aside className="operator-queue" aria-label="Print queue">
          <div className="operator-section-title">
            <div>
              <p className="cyberprint-kicker">LIVE QUEUE</p>
              <h2>Print requests</h2>
            </div>
            <button onClick={syncJobs} type="button">
              Refresh
            </button>
          </div>
          {filteredJobs.length === 0 ? (
            <div className="operator-empty">
              <span>⌁</span>
              <strong>No requests in this view</strong>
              <p>Customer print requests will appear here in real time.</p>
            </div>
          ) : (
            <div className="operator-job-list">
              {filteredJobs.map((job) => (
                <button
                  type="button"
                  key={job.id}
                  onClick={() => setSelectedId(job.id)}
                  className={job.id === selected?.id ? "is-selected" : ""}
                >
                  <div>
                    <strong>
                      {job.queueNumber} {job.isCloud ? "☁️" : "💻"}
                    </strong>
                    <small>{job.fileName}</small>
                  </div>
                  <span className={`operator-status ${job.status}`}>{statusLabel(job.status)}</span>
                  <b>₹{job.amount}</b>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="operator-detail" aria-live="polite">
          {!selected ? (
            <div className="operator-empty detail-empty">
              <span>◫</span>
              <h2>Select a request</h2>
              <p>Payment, approval, and print controls appear here.</p>
            </div>
          ) : (
            <>
              <div className="operator-detail-heading">
                <div>
                  <p className="cyberprint-kicker">
                    {selected.queueNumber} {selected.isCloud ? "· Cloud Sync" : "· Local Queue"}
                  </p>
                  <h2>{selected.fileName}</h2>
                  <p>
                    {selected.fileType} · {selected.pageCount} page{selected.pageCount === 1 ? "" : "s"} · requested{" "}
                    {new Date(selected.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`operator-status large ${selected.status}`}>{statusLabel(selected.status)}</span>
              </div>

              <div className="operator-job-details">
                <dl>
                  <div>
                    <dt>Pages</dt>
                    <dd>
                      {selected.pageSelection} ({selected.selectedPages} selected)
                    </dd>
                  </div>
                  <div>
                    <dt>Copies</dt>
                    <dd>{selected.copies}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>{selected.printMode === "bw" ? "Black & white" : "Colour"}</dd>
                  </div>
                  <div>
                    <dt>Paper</dt>
                    <dd>
                      {selected.paperSize.toUpperCase()} · {selected.orientation}
                    </dd>
                  </div>
                  <div>
                    <dt>Sides</dt>
                    <dd>{selected.duplex === "double" ? "Double-sided" : "One-sided"}</dd>
                  </div>
                </dl>
                <div className="operator-total">
                  <span>Locked job total</span>
                  <strong>₹{selected.amount}</strong>
                  <small>
                    {selected.selectedPages} sides × {selected.copies} copies × ₹{selected.printMode === "bw" ? 5 : 10}
                  </small>
                </div>
              </div>

              {/* Document Access Row */}
              <div style={{ display: "flex", gap: "8px", margin: "14px 0", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => downloadDocument(selected)}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ⬇️ Download File to PC
                </button>
                <button
                  type="button"
                  onClick={() => approveAndPrint(selected)}
                  style={{
                    background: "#166534",
                    color: "#fff",
                    border: 0,
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🖨️ Approve & Print Document
                </button>
              </div>

              {selected.status === "awaiting_payment" && (
                <div className="operator-payment">
                  <div className="operator-payment-copy">
                    <p className="cyberprint-kicker">COLLECT PAYMENT</p>
                    <h3>Payment amount is locked</h3>
                    <p>Only confirm payment after you receive cash or see a completed UPI payment in your app.</p>
                    <div className="operator-cash">
                      <button
                        type="button"
                        onClick={() =>
                          updateSelected({
                            status: "payment_received",
                            paymentMethod: "cash",
                            paymentReceivedAt: new Date().toISOString(),
                          })
                        }
                      >
                        Mark ₹{selected.amount} cash received
                      </button>
                    </div>
                    <div className="operator-app-links">
                      <a href={upiUri}>Open installed UPI app</a>
                      <a href={`tez://upi/pay?${upiUri.split("?")[1]}`}>Google Pay</a>
                    </div>
                  </div>
                  <div className="operator-qr">
                    <canvas ref={qrCanvas} />
                    <strong>Scan to pay ₹{selected.amount}</strong>
                    <span>{OPERATOR_UPI_ID}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelected({
                          status: "payment_received",
                          paymentMethod: "upi",
                          paymentReceivedAt: new Date().toISOString(),
                        })
                      }
                    >
                      I have verified this UPI payment
                    </button>
                  </div>
                </div>
              )}

              {selected.status === "payment_received" && (
                <div className="operator-action-card">
                  <div>
                    <p className="cyberprint-kicker">PAYMENT RECORDED</p>
                    <h3>Ready for your approval</h3>
                    <p>{selected.paymentMethod === "cash" ? "Cash" : "UPI"} recorded. Click below to release document to printer.</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="operator-approve"
                      type="button"
                      onClick={() => approveAndPrint(selected)}
                    >
                      Approve & Print Now →
                    </button>
                    <button
                      className="operator-reject"
                      type="button"
                      onClick={() => updateSelected({ status: "cancelled" })}
                    >
                      Cancel job
                    </button>
                  </div>
                </div>
              )}

              {selected.status === "approved" && (
                <div className="operator-action-card">
                  <div>
                    <p className="cyberprint-kicker">APPROVED</p>
                    <h3>Printing in progress</h3>
                    <p>The document was sent to the printer. Confirm once sheets are collected.</p>
                  </div>
                  <button
                    className="operator-approve"
                    type="button"
                    onClick={() => updateSelected({ status: "completed", completedAt: new Date().toISOString() })}
                  >
                    Mark completed ✓
                  </button>
                </div>
              )}

              {(["completed", "failed_review", "cancelled"] as JobStatus[]).includes(selected.status) && (
                <div className="operator-closed">
                  <span>{selected.status === "completed" ? "✓" : "!"}</span>
                  <div>
                    <strong>{statusLabel(selected.status)}</strong>
                    <p>
                      {selected.status === "completed"
                        ? "This job has been marked complete and handed to the customer."
                        : "Job was closed without printing."}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </section>

      <footer className="cyberprint-footer">
        <span>CYBERPRINT PAY</span>
        <p>Private upload · Operator-approved printing · 10-minute automated storage cleanup</p>
        <a href="/">Back to Paperloop</a>
      </footer>
    </main>
  );
}
