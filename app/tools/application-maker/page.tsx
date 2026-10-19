"use client";

import { useState } from "react";
import Link from "next/link";

interface LetterTemplate {
  id: string;
  title: string;
  recipient: string;
  orgName: string;
  city: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
}

const TEMPLATES: LetterTemplate[] = [
  {
    id: "bank-atm",
    title: "Bank Letter: New ATM / Debit Card",
    recipient: "The Branch Manager",
    orgName: "State Bank of India",
    city: "Main Branch, Jaipur",
    subject: "Application for issuance of new ATM / Debit Card",
    salutation: "Respected Sir/Madam,",
    body: `I hold a Savings Bank Account in your branch bearing Account Number: [ACCOUNT_NO]. My previous ATM card has expired / been misplaced.

Kindly issue a new ATM / Debit card against my account at the earliest so that I can carry out my regular transactions. My registered mobile number is [PHONE].

I have enclosed a self-attested copy of my Aadhaar Card and Passbook for verification.`,
    closing: "Yours faithfully,",
  },
  {
    id: "school-leave",
    title: "School / College Leave Application",
    recipient: "The Principal",
    orgName: "Government Senior Secondary School",
    city: "Jaipur, Rajasthan",
    subject: "Application for 3 days leave due to urgent family function",
    salutation: "Respected Sir/Madam,",
    body: `With due respect, I beg to state that I am a student of Class [CLASS/SEM] in your esteemed institution. I have an urgent family function / ceremony to attend at my native village.

Therefore, I will be unable to attend classes from [START_DATE] to [END_DATE]. 

Kindly grant me leave of absence for the aforementioned days. I assure you that I will cover all missed coursework upon my return.`,
    closing: "Yours obediently,",
  },
  {
    id: "police-lost",
    title: "Police Complaint: Lost Document / Mobile",
    recipient: "The Station House Officer (SHO)",
    orgName: "Police Station Mansarovar",
    city: "Jaipur, Rajasthan",
    subject: "Intimation regarding loss of original Aadhaar Card and Wallet",
    salutation: "Respected Sir,",
    body: `I, [NAME], son/daughter of [FATHER_NAME], resident of [ADDRESS], would like to bring to your kind notice that on [DATE] around [TIME], I lost my wallet near [LOCATION].

The wallet contained my original Aadhaar Card (No: [AADHAAR_NO]), Voter ID, Driving Licence, and some cash. Despite thorough search, I could not trace the same.

Kindly register this lost document report and provide me an acknowledgement copy so that I may apply for duplicate documents.`,
    closing: "Yours sincerely,",
  },
  {
    id: "leave-office",
    title: "Office Sick Leave Application",
    recipient: "The Manager / HR Department",
    orgName: "Tech Solutions Pvt. Ltd.",
    city: "Jaipur, Rajasthan",
    subject: "Application for Sick Leave",
    salutation: "Dear Sir/Madam,",
    body: `I am writing to formally request medical leave as I am suffering from severe viral fever and throat infection. The doctor has advised me complete bed rest for 2 days.

I will be unable to attend office on [DATES]. I have briefed my team member regarding urgent ongoing tasks. In case of emergency, I will be reachable via phone.

Kindly approve my leave request.`,
    closing: "Sincerely,",
  },
];

export default function ApplicationMakerPage() {
  const [activeTpl, setActiveTpl] = useState<LetterTemplate>(TEMPLATES[0]);

  const [applicantName, setApplicantName] = useState("Rahul Sharma");
  const [fatherName, setFatherName] = useState("Shri Ramesh Sharma");
  const [contactNo, setContactNo] = useState("+91 98765 43210");
  const [applicantAddress, setApplicantAddress] = useState("Flat 102, Mansarovar, Jaipur");
  const [dateStr, setDateStr] = useState("19 October 2026");

  const [recipient, setRecipient] = useState(TEMPLATES[0].recipient);
  const [orgName, setOrgName] = useState(TEMPLATES[0].orgName);
  const [city, setCity] = useState(TEMPLATES[0].city);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);

  function loadTemplate(tpl: LetterTemplate) {
    setActiveTpl(tpl);
    setRecipient(tpl.recipient);
    setOrgName(tpl.orgName);
    setCity(tpl.city);
    setSubject(tpl.subject);
    setBody(tpl.body);
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
            <span className="crumb-current">Job & Official Application Maker</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Standard Formats</span>
            <span className="badge-local">Print-Ready A4 Letter</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Official Letters & Applications Generator</h1>
          <p className="tool-desc">
            Instantly draft formal letters for Bank Manager, School Principal, Police Complaints, and Leave Requests.
            Pre-formatted with proper official conventions, margins, and sign-offs.
          </p>
        </div>

        {/* Template Selector */}
        <div className="presets-banner">
          <span className="banner-title">Choose Letter Category:</span>
          <div className="banner-pills">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`pill-btn ${activeTpl.id === t.id ? "active" : ""}`}
                onClick={() => loadTemplate(t)}
              >
                <strong>{t.title}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="workbench-grid">
          {/* Left: Edit Form */}
          <div className="crop-editor-card">
            <div className="card-header">
              <h3>1. Edit Letter Fields</h3>
            </div>

            <div className="control-group">
              <label className="control-label">To (Recipient):</label>
              <div className="form-grid-2">
                <input
                  type="text"
                  placeholder="Designation"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Organization / School / Bank"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="Branch / City / Location"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ marginTop: "6px" }}
              />
            </div>

            <div className="control-group">
              <label className="control-label">Subject Line:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject of application"
              />
            </div>

            <div className="control-group">
              <label className="control-label">Letter Body:</label>
              <textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Body text..."
              />
            </div>

            <div className="control-group">
              <label className="control-label">Applicant Info (Sender):</label>
              <div className="form-grid-2">
                <input
                  type="text"
                  placeholder="Applicant Full Name"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Father's Name (if needed)"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Contact Mobile"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Application Date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="Address"
                value={applicantAddress}
                onChange={(e) => setApplicantAddress(e.target.value)}
                style={{ marginTop: "6px" }}
              />
            </div>
          </div>

          {/* Right: A4 Letter Preview */}
          <div className="result-preview-card">
            <div className="card-header">
              <h3>2. Formatted A4 Letter Preview</h3>
              <button className="btn-print-direct" onClick={() => window.print()}>
                Print Letter 🖨️
              </button>
            </div>

            <div className="formal-letter-a4">
              <div className="letter-date-top">
                <span>Date: {dateStr}</span>
              </div>

              <div className="letter-to-block">
                <p>To,</p>
                <p><strong>{recipient}</strong></p>
                <p>{orgName}</p>
                <p>{city}</p>
              </div>

              <div className="letter-subject-line">
                <p><strong>Subject:</strong> <u>{subject}</u></p>
              </div>

              <div className="letter-salutation">
                <p>{activeTpl.salutation}</p>
              </div>

              <div className="letter-body-paragraphs">
                {body.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <div className="letter-closing-block">
                <p>{activeTpl.closing}</p>
                <div className="sig-space" />
                <p><strong>{applicantName}</strong></p>
                {fatherName && <p>S/o / D/o: {fatherName}</p>}
                <p>Contact: {contactNo}</p>
                <p>Address: {applicantAddress}</p>
              </div>
            </div>

            <div className="export-actions-row">
              <button className="btn-export-pdf" onClick={() => window.print()}>
                Print / Save A4 Letter (PDF) 🖨️
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
