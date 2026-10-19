"use client";

import { useState } from "react";
import Link from "next/link";

const SYMBOLS = [
  { label: "श्री गणेशाय नमः", text: "॥ श्री गणेशाय नमः ॥" },
  { label: "ॐ", text: "॥ ॐ ॥" },
  { label: "श्री राधा कृष्ण", text: "॥ श्री राधा कृष्णाभ्यां नमः ॥" },
  { label: "जय जिनेन्द्र", text: "॥ जय जिनेन्द्र ॥" },
  { label: "इक ओंकार", text: "ੴ सतिगुर प्रसादि" },
  { label: "Shubh Vivah", text: "|| SHUBH VIVAH BIODATA ||" },
];

const THEMES = [
  { id: "royal-maroon", name: "Royal Maroon & Gold", primary: "#831843", border: "#be185d", bg: "#fff1f2" },
  { id: "vedic-orange", name: "Vedic Saffron & Gold", primary: "#9a3412", border: "#ea580c", bg: "#fff7ed" },
  { id: "classic-gold", name: "Classic Gold & Brown", primary: "#78350f", border: "#d97706", bg: "#fefce8" },
  { id: "modern-blue", name: "Modern Sapphire", primary: "#1e3a8a", border: "#2563eb", bg: "#eff6ff" },
];

export default function MarriageBiodataPage() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Personal Details
  const [name, setName] = useState("Aman Sharma");
  const [dob, setDob] = useState("15 August 1998");
  const [birthTime, setBirthTime] = useState("06:30 AM");
  const [birthPlace, setBirthPlace] = useState("Jaipur, Rajasthan");
  const [height, setHeight] = useState("5 ft 9 in");
  const [complexion, setComplexion] = useState("Fair");
  const [gotra, setGotra] = useState("Kaushik (Self) / Vashishtha (Nanihal)");
  const [caste, setCaste] = useState("Brahmin");
  const [rashi, setRashi] = useState("Mesh (Aries)");
  const [manglik, setManglik] = useState("Non-Manglik");

  // Education & Career
  const [education, setEducation] = useState("B.Tech in Computer Science (NIT Jaipur)");
  const [occupation, setOccupation] = useState("Software Engineer at MNC");
  const [income, setIncome] = useState("14 LPA");

  // Family Details
  const [father, setFather] = useState("Shri Ramesh Sharma (Govt. Officer - PWD)");
  const [mother, setMother] = useState("Smt. Sunita Sharma (Homemaker)");
  const [brothers, setBrothers] = useState("1 Younger Brother (Studying MBA)");
  const [sisters, setSisters] = useState("1 Elder Sister (Married)");
  const [nativePlace, setNativePlace] = useState("Jaipur / Alwar, Rajasthan");

  // Contact
  const [contactPerson, setContactPerson] = useState("Ramesh Sharma (Father)");
  const [phone, setPhone] = useState("+91 98290 XXXXX, +91 94140 XXXXX");
  const [address, setAddress] = useState("Flat 402, Royal Residency, Mansarovar, Jaipur");

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
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
            <span className="crumb-current">Indian Marriage Biodata Maker</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Traditional Designs</span>
            <span className="badge-local">Instant A4 Print / PDF</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Indian Marriage Biodata (वैवाहिक बायोडाटा) Maker</h1>
          <p className="tool-desc">
            Create elegant matrimonial biodatas with Kundali details, religious headings, family background, and photo.
            Ready for instant A4 print or WhatsApp sharing.
          </p>
        </div>

        <div className="workbench-grid">
          {/* Left: Input Form */}
          <div className="crop-editor-card">
            <div className="card-header">
              <h3>1. Fill Biodata Details</h3>
            </div>

            {/* Header Symbol & Theme */}
            <div className="control-group">
              <label className="control-label">Religious Header & Theme:</label>
              <div className="sheet-config-row">
                <select
                  value={symbol.label}
                  onChange={(e) => setSymbol(SYMBOLS.find((s) => s.label === e.target.value) || SYMBOLS[0])}
                >
                  {SYMBOLS.map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label} ({s.text})
                    </option>
                  ))}
                </select>
                <select
                  value={theme.id}
                  onChange={(e) => setTheme(THEMES.find((t) => t.id === e.target.value) || THEMES[0])}
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo upload */}
            <div className="control-group">
              <label className="control-label">Profile Photo (Optional):</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            {/* Personal Details */}
            <div className="control-group">
              <label className="control-label">Personal & Astrological Details:</label>
              <div className="form-grid-2">
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                <input type="text" placeholder="Date of Birth" value={dob} onChange={(e) => setDob(e.target.value)} />
                <input type="text" placeholder="Time of Birth" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
                <input type="text" placeholder="Place of Birth" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
                <input type="text" placeholder="Height" value={height} onChange={(e) => setHeight(e.target.value)} />
                <input type="text" placeholder="Complexion" value={complexion} onChange={(e) => setComplexion(e.target.value)} />
                <input type="text" placeholder="Gotra" value={gotra} onChange={(e) => setGotra(e.target.value)} />
                <input type="text" placeholder="Caste" value={caste} onChange={(e) => setCaste(e.target.value)} />
                <input type="text" placeholder="Rashi" value={rashi} onChange={(e) => setRashi(e.target.value)} />
                <select value={manglik} onChange={(e) => setManglik(e.target.value)}>
                  <option value="Non-Manglik">Non-Manglik</option>
                  <option value="Manglik">Manglik</option>
                  <option value="Anshik Manglik">Anshik Manglik</option>
                  <option value="Don't Know">Don't Know</option>
                </select>
              </div>
            </div>

            {/* Education & Career */}
            <div className="control-group">
              <label className="control-label">Education & Career:</label>
              <input
                type="text"
                placeholder="Highest Education"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                style={{ marginBottom: "8px" }}
              />
              <div className="form-grid-2">
                <input type="text" placeholder="Occupation / Job" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                <input type="text" placeholder="Income / Package" value={income} onChange={(e) => setIncome(e.target.value)} />
              </div>
            </div>

            {/* Family Details */}
            <div className="control-group">
              <label className="control-label">Family Details:</label>
              <div className="form-grid-2">
                <input type="text" placeholder="Father's Name & Occupation" value={father} onChange={(e) => setFather(e.target.value)} />
                <input type="text" placeholder="Mother's Name & Occupation" value={mother} onChange={(e) => setMother(e.target.value)} />
                <input type="text" placeholder="Brother(s)" value={brothers} onChange={(e) => setBrothers(e.target.value)} />
                <input type="text" placeholder="Sister(s)" value={sisters} onChange={(e) => setSisters(e.target.value)} />
              </div>
              <input
                type="text"
                placeholder="Native Place / District"
                value={nativePlace}
                onChange={(e) => setNativePlace(e.target.value)}
                style={{ marginTop: "8px" }}
              />
            </div>

            {/* Contact */}
            <div className="control-group">
              <label className="control-label">Contact Details:</label>
              <div className="form-grid-2">
                <input type="text" placeholder="Contact Person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                <input type="text" placeholder="Phone Numbers" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <textarea
                rows={2}
                placeholder="Residential Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ marginTop: "8px" }}
              />
            </div>
          </div>

          {/* Right: Traditional Biodata A4 Preview */}
          <div className="result-preview-card">
            <div className="card-header">
              <h3>2. Biodata A4 Preview</h3>
              <button className="btn-print-direct" onClick={() => window.print()}>
                Print / Save PDF 🖨️
              </button>
            </div>

            <div
              className="biodata-sheet-container"
              style={{
                borderColor: theme.border,
                backgroundColor: "#ffffff",
              }}
            >
              {/* Decorative Border Frame */}
              <div className="biodata-inner-frame" style={{ borderColor: theme.border }}>
                <div className="biodata-header-symbol" style={{ color: theme.primary }}>
                  <h3>{symbol.text}</h3>
                  <h1 style={{ color: theme.primary }}>BIODATA</h1>
                  <div className="ornament-line" style={{ backgroundColor: theme.border }} />
                </div>

                <div className="biodata-content-layout">
                  {photoUrl && (
                    <div className="biodata-photo-wrapper" style={{ borderColor: theme.border }}>
                      <img src={photoUrl} alt="Candidate" className="biodata-candidate-img" />
                    </div>
                  )}

                  {/* Section: Personal */}
                  <div className="biodata-section-box">
                    <h4 className="biodata-sec-title" style={{ color: theme.primary, borderBottomColor: theme.border }}>
                      Personal Details (व्यक्तिगत विवरण)
                    </h4>
                    <table className="biodata-table">
                      <tbody>
                        <tr><td><strong>Name</strong></td><td>: {name}</td></tr>
                        <tr><td><strong>Date of Birth</strong></td><td>: {dob}</td></tr>
                        <tr><td><strong>Time of Birth</strong></td><td>: {birthTime}</td></tr>
                        <tr><td><strong>Place of Birth</strong></td><td>: {birthPlace}</td></tr>
                        <tr><td><strong>Height & Complexion</strong></td><td>: {height}, {complexion}</td></tr>
                        <tr><td><strong>Gotra</strong></td><td>: {gotra}</td></tr>
                        <tr><td><strong>Caste / Community</strong></td><td>: {caste}</td></tr>
                        <tr><td><strong>Rashi / Manglik</strong></td><td>: {rashi} ({manglik})</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section: Education & Career */}
                  <div className="biodata-section-box">
                    <h4 className="biodata-sec-title" style={{ color: theme.primary, borderBottomColor: theme.border }}>
                      Education & Career (शिक्षा और व्यवसाय)
                    </h4>
                    <table className="biodata-table">
                      <tbody>
                        <tr><td><strong>Education</strong></td><td>: {education}</td></tr>
                        <tr><td><strong>Occupation</strong></td><td>: {occupation}</td></tr>
                        <tr><td><strong>Income / CTC</strong></td><td>: {income}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section: Family */}
                  <div className="biodata-section-box">
                    <h4 className="biodata-sec-title" style={{ color: theme.primary, borderBottomColor: theme.border }}>
                      Family Details (पारिवारिक विवरण)
                    </h4>
                    <table className="biodata-table">
                      <tbody>
                        <tr><td><strong>Father's Name</strong></td><td>: {father}</td></tr>
                        <tr><td><strong>Mother's Name</strong></td><td>: {mother}</td></tr>
                        <tr><td><strong>Brother(s)</strong></td><td>: {brothers}</td></tr>
                        <tr><td><strong>Sister(s)</strong></td><td>: {sisters}</td></tr>
                        <tr><td><strong>Native Place</strong></td><td>: {nativePlace}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section: Contact */}
                  <div className="biodata-section-box">
                    <h4 className="biodata-sec-title" style={{ color: theme.primary, borderBottomColor: theme.border }}>
                      Contact Details (संपर्क सूत्र)
                    </h4>
                    <table className="biodata-table">
                      <tbody>
                        <tr><td><strong>Contact Person</strong></td><td>: {contactPerson}</td></tr>
                        <tr><td><strong>Phone</strong></td><td>: {phone}</td></tr>
                        <tr><td><strong>Address</strong></td><td>: {address}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="export-actions-row">
              <button className="btn-export-pdf" onClick={() => window.print()}>
                Print / Save Biodata as A4 PDF 🖨️
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
