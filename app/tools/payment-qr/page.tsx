"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

export default function PaymentQrPage() {
  const [upiId, setUpiId] = useState("studio@upi");
  const [merchantName, setMerchantName] = useState("AkPrint & Cyber Studio");
  const [amount, setAmount] = useState("20");
  const [note, setNote] = useState("Print & Photocopy");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Generated UPI QR code with locked amount.");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId || "studio@upi",
      pn: merchantName || "Cyber Studio",
      cu: "INR",
    });
    if (Number(amount) > 0) {
      params.set("am", Number(amount).toFixed(2));
    }
    if (note.trim()) {
      params.set("tn", note.trim());
    }
    return params.toString();
  }, [amount, merchantName, note, upiId]);

  const upiUri = `upi://pay?${queryParams}`;
  const gpayUri = `tez://upi/pay?${queryParams}`;
  const phonepeUri = `phonepe://pay?${queryParams}`;
  const paytmUri = `paytmmp://pay?${queryParams}`;

  useEffect(() => {
    if (!qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, upiUri, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  }, [upiUri]);

  function downloadQrPng() {
    if (!qrCanvasRef.current) return;
    const link = document.createElement("a");
    link.href = qrCanvasRef.current.toDataURL("image/png");
    link.download = `upi-qr-${merchantName.toLowerCase().replace(/\s+/g, "-")}-${amount ? `rs${amount}` : "open"}.png`;
    link.click();
    setStatus("Downloaded QR code as PNG image.");
  }

  function copyPaymentLink() {
    navigator.clipboard.writeText(upiUri);
    setStatus("Copied universal UPI payment link to clipboard!");
  }

  function redirectToApp(uri: string) {
    window.location.href = uri;
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
            <span className="crumb-current">UPI Payment Lock QR Generator</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Universal UPI</span>
            <span className="badge-local">GPay · PhonePe · Paytm · BHIM</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>UPI Payment QR Maker with Fixed Amount Lock</h1>
          <p className="tool-desc">
            Generate customized, print-ready UPI payment QR codes with locked transaction amounts for counter desks,
            cyber cafes, photocopiers, and service billings.
          </p>
        </div>

        <div className="workbench-grid">
          {/* Left Form */}
          <div className="crop-editor-card">
            <div className="card-header">
              <h3>1. Payment Details</h3>
            </div>

            <div className="control-group">
              <label className="control-label">Your Shop / Business UPI ID (VPA):</label>
              <input
                type="text"
                placeholder="e.g. 9876543210@paytm or shop@axl"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
              <small className="help-text">Payment will go directly to your bank account with zero platform fees.</small>
            </div>

            <div className="control-group">
              <label className="control-label">Shop / Business Display Name:</label>
              <input
                type="text"
                placeholder="e.g. Sharma Cyber Cafe"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            <div className="control-group">
              <label className="control-label">Lock Fixed Amount (₹):</label>
              <input
                type="number"
                placeholder="Amount in Rupees (Leave empty for open amount)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="kb-shortcuts" style={{ marginTop: "8px" }}>
                {["5", "10", "20", "50", "100", "200", "500"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`kb-chip ${amount === amt ? "active" : ""}`}
                    onClick={() => setAmount(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  className={`kb-chip ${amount === "" ? "active" : ""}`}
                  onClick={() => setAmount("")}
                >
                  Custom / Any
                </button>
              </div>
            </div>

            <div className="control-group">
              <label className="control-label">Transaction Note / Bill Description:</label>
              <input
                type="text"
                placeholder="e.g. Xerox / 4 Passport Photos / Form Fill"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Printable Counter Standee Preview */}
          <div className="result-preview-card">
            <div className="card-header">
              <h3>2. Counter Standee Preview</h3>
              <button className="btn-sm" onClick={downloadQrPng}>
                Download QR PNG ⬇
              </button>
            </div>

            <div className="standee-card-preview" id="printable-standee">
              <div className="standee-inner">
                <div className="standee-header">
                  <span className="standee-badge">SCAN & PAY</span>
                  <h2>{merchantName}</h2>
                  <p className="standee-upi-id">{upiId}</p>
                </div>

                <div className="standee-qr-frame">
                  <canvas ref={qrCanvasRef} />
                </div>

                {Number(amount) > 0 ? (
                  <div className="standee-amount-pill">
                    <span>LOCKED AMOUNT</span>
                    <strong>₹{Number(amount).toFixed(2)}</strong>
                  </div>
                ) : (
                  <div className="standee-amount-pill">
                    <strong>ENTER AMOUNT ON PHONE</strong>
                  </div>
                )}

                {note && <p className="standee-note">Reason: {note}</p>}

                <div className="standee-footer-logos">
                  <span>Accepted Here:</span>
                  <div className="upi-app-badges">
                    <span className="app-badge gpay">GPay</span>
                    <span className="app-badge phonepe">PhonePe</span>
                    <span className="app-badge paytm">Paytm</span>
                    <span className="app-badge bhim">BHIM UPI</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="customer-upi-redirect-block" style={{ marginTop: "16px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h4 className="customer-upi-redirect-title" style={{ color: "#0f172a", marginBottom: "8px" }}>
                📱 Mobile Quick-Pay & Deep Link:
              </h4>
              <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#64748b" }}>
                Click below to open directly in your phone’s installed UPI app with the locked amount:
              </p>
              <div className="customer-upi-grid">
                <a
                  href={gpayUri}
                  className="upi-app-button gpay-btn"
                  onClick={() => redirectToApp(gpayUri)}
                >
                  <span>🟢</span> GPay
                </a>
                <a
                  href={phonepeUri}
                  className="upi-app-button phonepe-btn"
                  onClick={() => redirectToApp(phonepeUri)}
                >
                  <span>🟣</span> PhonePe
                </a>
                <a
                  href={paytmUri}
                  className="upi-app-button paytm-btn"
                  onClick={() => redirectToApp(paytmUri)}
                >
                  <span>🔵</span> Paytm
                </a>
                <a
                  href={upiUri}
                  className="upi-app-button bhim-btn"
                  onClick={() => redirectToApp(upiUri)}
                >
                  <span>🟠</span> Any App
                </a>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
                <button type="button" className="customer-copy-btn" onClick={copyPaymentLink}>
                  📋 Copy Universal UPI Link
                </button>
              </div>
            </div>

            <div className="export-actions-row">
              <button className="btn-export-pdf" onClick={() => window.print()}>
                Print Counter Standee 🖨️
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
