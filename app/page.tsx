"use client";

import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type Workspace = "document" | "photo" | "payment";
type Upload = { id: string; name: string; url: string };

const tools = [
  { id: "document" as const, icon: "◩", title: "Document repair", subtitle: "Crop, straighten and place pages", tint: "mint" },
  { id: "photo" as const, icon: "◉", title: "Photo sheets", subtitle: "Passport photos, layouts and copies", tint: "violet" },
  { id: "payment" as const, icon: "⌘", title: "Pay QR", subtitle: "Create a fixed-amount UPI code", tint: "peach" },
];

const photoSizes = [
  { name: "India passport", width: 35, height: 45 },
  { name: "US square", width: 50.8, height: 50.8 },
  { name: "Schengen", width: 35, height: 45 },
  { name: "Compact strip", width: 32, height: 41 },
];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const mmToPreview = (mm: number) => Math.max(24, Math.round(mm * 1.9));

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>("document");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [activeUpload, setActiveUpload] = useState(0);
  const [copies, setCopies] = useState(4);
  const [margin, setMargin] = useState(8);
  const [gap, setGap] = useState(4);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [quality, setQuality] = useState(82);
  const [targetKb, setTargetKb] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [trim, setTrim] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showBorder, setShowBorder] = useState(true);
  const [caption, setCaption] = useState("");
  const [photoSize, setPhotoSize] = useState(photoSizes[0]);
  const [upiId, setUpiId] = useState("studio@upi");
  const [merchant, setMerchant] = useState("Paperloop Studio");
  const [amount, setAmount] = useState("120");
  const [status, setStatus] = useState("Choose images to begin a local print job.");
  const qrCanvas = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const activeImage = uploads[activeUpload];
  const printableWidth = 210 - margin * 2;
  const printableHeight = 297 - margin * 2;
  const itemWidth = workspace === "photo" ? photoSize.width : 74;
  const itemHeight = workspace === "photo" ? photoSize.height : 52;
  const columns = Math.max(1, Math.floor((printableWidth + gap) / (itemWidth + gap)));
  const rows = Math.max(1, Math.floor((printableHeight + gap) / (itemHeight + gap)));
  const capacity = columns * rows;
  const shownCopies = Math.min(copies, capacity, 24);

  const upiUri = useMemo(() => {
    const params = new URLSearchParams({ pa: upiId || "studio@upi", pn: merchant || "Paperloop Studio", cu: "INR" });
    if (Number(amount) > 0) params.set("am", amount);
    return `upi://pay?${params.toString()}`;
  }, [amount, merchant, upiId]);

  const imageStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
    transform: `translate(${pan.x}%, ${pan.y}%) rotate(${rotation + straighten}deg) scale(${(zoom / 100) * (1 + trim / 100)})`,
  };

  useEffect(() => {
    if (workspace === "payment" && qrCanvas.current) {
      QRCode.toCanvas(qrCanvas.current, upiUri, { width: 196, margin: 1, color: { dark: "#14281f", light: "#fffdf8" } });
    }
  }, [workspace, upiUri]);

  useEffect(() => {
    const saved = window.localStorage.getItem("paperloop-draft-v2");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      for (const [key, setter] of Object.entries({ copies: setCopies, margin: setMargin, gap: setGap, brightness: setBrightness, contrast: setContrast, quality: setQuality, targetKb: setTargetKb, rotation: setRotation, straighten: setStraighten, trim: setTrim, zoom: setZoom })) {
        if (typeof draft[key] === "number") setter(draft[key]);
      }
      if (typeof draft.caption === "string") setCaption(draft.caption);
      if (typeof draft.showBorder === "boolean") setShowBorder(draft.showBorder);
      if (typeof draft.photoSize === "string") setPhotoSize(photoSizes.find((size) => size.name === draft.photoSize) ?? photoSizes[0]);
      setStatus("Your local layout draft was restored. Images are never retained.");
    } catch {
      window.localStorage.removeItem("paperloop-draft-v2");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("paperloop-draft-v2", JSON.stringify({ copies, margin, gap, brightness, contrast, quality, targetKb, rotation, straighten, trim, zoom, caption, showBorder, photoSize: photoSize.name }));
  }, [caption, brightness, contrast, copies, gap, margin, photoSize.name, quality, rotation, showBorder, straighten, targetKb, trim, zoom]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      setStatus("Select PNG, JPG, or WebP images for this browser preview.");
      return;
    }
    const next = files.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, url: URL.createObjectURL(file) }));
    setUploads((current) => [...current, ...next]);
    setActiveUpload(uploads.length);
    setStatus(`${next.length} image${next.length > 1 ? "s" : ""} added locally. No upload was made.`);
    event.target.value = "";
  }

  function resetCrop() {
    setRotation(0); setStraighten(0); setTrim(0); setZoom(100); setPan({ x: 0, y: 0 });
    setStatus("Crop and rotation reset for the active image.");
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!activeImage) return;
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const frame = event.currentTarget.getBoundingClientRect();
    setPan({
      x: clamp(dragStart.current.panX + ((event.clientX - dragStart.current.x) / frame.width) * 100, -45, 45),
      y: clamp(dragStart.current.panY + ((event.clientY - dragStart.current.y) / frame.height) * 100, -45, 45),
    });
  }

  function onPointerEnd() { dragStart.current = null; }

  async function renderJpeg(upload: Upload, multiplier = 1) {
    const image = new Image();
    image.src = upload.url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.max(0.25, multiplier);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas export is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2 + (pan.x / 100) * canvas.width, canvas.height / 2 + (pan.y / 100) * canvas.height);
    context.rotate(((rotation + straighten) * Math.PI) / 180);
    context.scale((zoom / 100) * (1 + trim / 100), (zoom / 100) * (1 + trim / 100));
    context.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    context.drawImage(image, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    let result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality / 100));
    if (targetKb > 0) {
      let trialQuality = Math.min(0.92, quality / 100);
      while (result && result.size > targetKb * 1024 && trialQuality > 0.3) {
        trialQuality -= 0.06;
        result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", trialQuality));
      }
    }
    if (!result) throw new Error("JPG export could not be created.");
    return result;
  }

  async function downloadImage(upload: Upload, index?: number) {
    const blob = await renderJpeg(upload, 1);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${upload.name.replace(/\.[^.]+$/, "") || "paperloop"}${index !== undefined ? `-${index + 1}` : ""}-ready.jpg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function exportCurrent() {
    if (!activeImage) return setStatus("Add an image before exporting.");
    try { await downloadImage(activeImage); setStatus("Adjusted JPG saved locally."); } catch (error) { setStatus(error instanceof Error ? error.message : "Export failed."); }
  }

  async function exportBatch() {
    if (!uploads.length) return setStatus("Add one or more images before batch export.");
    try {
      for (let index = 0; index < uploads.length; index += 1) {
        await downloadImage(uploads[index], index);
        if (index < uploads.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      setStatus(`${uploads.length} adjusted image${uploads.length > 1 ? "s" : ""} downloaded locally.`);
    } catch { setStatus("One or more batch exports failed in this browser."); }
  }

  const pageTitle = workspace === "document" ? "Make paper photos print-ready" : workspace === "photo" ? "Build a polished photo sheet" : "Lock a payment amount in a QR";

  return <main>
    <section className="hero-shell"><nav className="nav wrap"><a className="brand" href="#top"><span className="brand-mark">P</span><span>paperloop</span></a><div className="nav-links"><a href="/print">CyberPrint Pay</a><a href="/operator">Operator desk</a><a href="#tools">Tools</a><a href="#privacy">Privacy</a><button className="nav-cta" onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}>Open studio</button></div></nav>
      <div className="hero wrap" id="top"><div className="hero-copy"><p className="eyebrow"><span className="pulse" />Browser-first print preparation</p><h1>Everyday print work, <em>made calm.</em></h1><p className="lede">Prepare your own files privately, or send a paid print request to the counter through CyberPrint Pay. Images in Studio stay in this browser tab.</p><div className="hero-actions"><a className="primary" href="/print">CyberPrint Pay <span>→</span></a><button className="hero-secondary" onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}>Open local studio</button></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="paper-stack"><div className="mini-photo photo-one" /><div className="mini-photo photo-two" /><div className="mini-page"><span /><span /><span /><b /></div></div><div className="hero-note">A4 ready<br /><strong>100% scale</strong></div></div></div>
    </section>
    <section className="studio wrap" id="tools"><header className="section-heading"><p className="eyebrow">A focused toolkit</p><h2>Choose a job, make it yours.</h2><p>Built around physical print sizes, not guesswork.</p></header>
      <div className="tool-tabs" role="tablist">{tools.map((tool) => <button key={tool.id} className={`tool-tab ${workspace === tool.id ? "active" : ""} ${tool.tint}`} onClick={() => setWorkspace(tool.id)} role="tab" aria-selected={workspace === tool.id}><span className="tool-icon">{tool.icon}</span><span><strong>{tool.title}</strong><small>{tool.subtitle}</small></span><span className="arrow">↗</span></button>)}</div>
      <div className="workbench"><section className="controls-card"><div className="card-title"><div><p className="eyebrow">{workspace === "payment" ? "Payment desk" : workspace === "photo" ? "Portrait desk" : "Document desk"}</p><h3>{pageTitle}</h3></div><span className="local-pill">Local session</span></div>
      {workspace !== "payment" ? <>
        <p className="card-description">Drag in the preview to position a crop. Add a batch, set the physical layout, then print or export locally.</p>
        <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFileChange} /><span className="upload-icon">↑</span><span><strong>{uploads.length ? "Add more images" : "Select images"}</strong><small>{uploads.length ? `${uploads.length} local image${uploads.length > 1 ? "s" : ""} ready` : "PNG, JPG or WebP · batch supported"}</small></span><span className="browse">Browse</span></label>
        {uploads.length > 0 && <div className="upload-list">{uploads.map((upload, index) => <button className={index === activeUpload ? "active" : ""} key={upload.id} onClick={() => setActiveUpload(index)}><span>{index + 1}</span>{upload.name}</button>)}</div>}
        <div className="control-grid two"><label>{workspace === "photo" ? "Photo format" : "Output format"}{workspace === "photo" ? <select value={photoSize.name} onChange={(event) => setPhotoSize(photoSizes.find((size) => size.name === event.target.value) ?? photoSizes[0])}>{photoSizes.map((size) => <option key={size.name}>{size.name}</option>)}</select> : <select><option>A4 document</option><option>ID card</option><option>Custom slip</option></select>}</label><label>Copies<div className="stepper"><button onClick={() => setCopies((value) => Math.max(1, value - 1))}>−</button><output>{copies}</output><button onClick={() => setCopies((value) => Math.min(120, value + 1))}>+</button></div></label></div>
        <div className="control-grid two"><label>Margin <span>{margin} mm</span><input type="range" min="2" max="20" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></label><label>Gap <span>{gap} mm</span><input type="range" min="0" max="12" value={gap} onChange={(event) => setGap(Number(event.target.value))} /></label></div>
        <div className="control-grid two"><label>Brightness <span>{brightness}%</span><input type="range" min="60" max="140" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label><label>Contrast <span>{contrast}%</span><input type="range" min="60" max="140" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></label></div>
        <div className="control-grid two"><label>JPG quality <span>{quality}%</span><input type="range" min="40" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></label><label>Target size <span>{targetKb ? `${targetKb} KB` : "off"}</span><input type="range" min="0" max="1000" step="50" value={targetKb} onChange={(event) => setTargetKb(Number(event.target.value))} /></label></div>
        <div className="control-grid two"><label>Zoom <span>{zoom}%</span><input type="range" min="100" max="180" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><label>Edge trim <span>{trim}%</span><input type="range" min="0" max="20" value={trim} onChange={(event) => setTrim(Number(event.target.value))} /></label></div>
        <div className="control-grid two"><label>Straighten <span>{straighten}°</span><input type="range" min="-12" max="12" value={straighten} onChange={(event) => setStraighten(Number(event.target.value))} /></label><label>Caption<input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional print caption" /></label></div>
        <div className="rotate-actions"><button type="button" onClick={() => setRotation((value) => (value - 90 + 360) % 360)}>↶ 90° left</button><button type="button" onClick={() => setRotation((value) => (value + 90) % 360)}>90° right ↷</button><button type="button" onClick={resetCrop}>Reset crop</button><label className="check-toggle"><input checked={showBorder} type="checkbox" onChange={(event) => setShowBorder(event.target.checked)} /> Print border</label></div>
        <div className="tip"><span>✦</span><p><strong>{status}</strong><br />Settings are saved on this device. Image files remain only in this active tab.</p></div>
      </> : <><p className="card-description">Generate a fixed-amount UPI URI locally. This demo does not confirm or process payments.</p><div className="field-stack"><label>Receiver name<input value={merchant} onChange={(event) => setMerchant(event.target.value)} /></label><label>UPI ID<input value={upiId} onChange={(event) => setUpiId(event.target.value)} /></label><label>Fixed amount (₹)<input value={amount} type="number" min="0" onChange={(event) => setAmount(event.target.value)} /></label></div><div className="amount-chips">{[50, 100, 200, 500].map((value) => <button key={value} onClick={() => setAmount(String(value))}>₹{value}</button>)}</div><div className="tip"><span>⌘</span><p><strong>Local by design.</strong> Receiver details are only used to make the QR URI in this browser.</p></div></>}
      </section>
      <section className="preview-card"><div className="preview-top"><div><span className="preview-label">LIVE PREVIEW</span><strong>{workspace === "payment" ? "QR card" : `A4 · ${columns} × ${rows} layout · ${capacity} per sheet`}</strong></div><div className="preview-actions"><button className="ghost" onClick={() => window.print()}>{workspace === "payment" ? "Print card" : "Print sheet"} ↗</button>{workspace !== "payment" && <><button className="ghost" onClick={exportCurrent} disabled={!activeImage}>Save JPG</button><button className="ghost" onClick={exportBatch} disabled={!uploads.length}>Save batch</button></>}</div></div>
      {workspace === "payment" ? <div className="qr-stage"><div className="qr-card"><p>Scan to pay</p><canvas ref={qrCanvas} /><strong>{merchant || "Paperloop Studio"}</strong><span>{Number(amount) > 0 ? `₹${amount} fixed amount` : "Open amount"}</span><small>{upiId || "studio@upi"}</small></div><code>{upiUri}</code></div> : <div className="paper-preview" style={{ padding: `${margin * 1.15}px` }}><div className="paper-header"><span>paperloop / {workspace === "document" ? "document repair" : "photo sheet"}</span><span>{shownCopies} of {copies} copies</span></div><div className="sheet-grid" style={{ gap: `${gap * 1.4}px` }}>{Array.from({ length: shownCopies }).map((_, index) => { const upload = uploads[index % Math.max(uploads.length, 1)]; return <div className={`print-item ${workspace} ${showBorder ? "with-border" : "no-border"}`} key={index} style={{ width: workspace === "photo" ? mmToPreview(photoSize.width) : 132, height: workspace === "photo" ? mmToPreview(photoSize.height) : 88 }}><div className="image-frame crop-frame" onPointerDown={index === 0 ? onPointerDown : undefined} onPointerMove={index === 0 ? onPointerMove : undefined} onPointerUp={index === 0 ? onPointerEnd : undefined} onPointerCancel={onPointerEnd}>{upload ? <img src={upload.url} alt="Selected item preview" style={imageStyle} draggable={false} /> : <div className="placeholder-art"><i /><i /><i /></div>}</div>{caption && <small className="print-caption">{caption}</small>}{workspace === "document" && <span className="crop-corners" />}</div>; })}</div><div className="paper-footer"><span>{workspace === "photo" ? `${photoSize.width} × ${photoSize.height} mm` : "Drag the first item to adjust crop"}</span><span>Check one test print</span></div></div>}</section></div>
    </section>
    <section className="process wrap"><div className="section-heading"><p className="eyebrow">Simple by default</p><h2>From file to counter in three clear steps.</h2></div><div className="steps"><article><span>01</span><h3>Bring your files</h3><p>Select a document image or add a batch. Everything stays in your browser tab.</p></article><article><span>02</span><h3>Set a real size</h3><p>Choose copies, margins and spacing in millimetres, then use the calculated A4 grid.</p></article><article><span>03</span><h3>Review, export or print</h3><p>Save adjusted JPGs or use the live sheet as a preflight check before printing.</p></article></div></section>
    <section className="privacy wrap" id="privacy"><div><p className="eyebrow">Designed for sensitive paperwork</p><h2>Private by default.<br /><em>Clear about limits.</em></h2></div><div className="privacy-copy"><p>Images selected in this MVP stay in the active tab. There is no account, cloud upload, payment confirmation or automatic printer control.</p><div className="privacy-list"><span>◌ Browser-first crop and export</span><span>◌ Batch-ready local adjustments</span><span>◌ Print only after your review</span></div></div></section>
    <footer className="footer wrap"><a className="brand" href="#top"><span className="brand-mark">P</span><span>paperloop</span></a><p>Original clean-room interface for practical document preparation.</p><span>© 2026 Paperloop Studio</span></footer>
  </main>;
}
