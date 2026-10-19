"use client";

import { useState } from "react";
import Link from "next/link";

interface PortalItem {
  id: string;
  name: string;
  hindiName?: string;
  category: "identity" | "transport" | "welfare" | "tax_business";
  url: string;
  desc: string;
  documents: string[];
}

const PORTALS: PortalItem[] = [
  // Identity
  {
    id: "uidai",
    name: "UIDAI Aadhaar Portal",
    hindiName: "आधार सेवा पोर्टल",
    category: "identity",
    url: "https://myaadhaar.uidai.gov.in/",
    desc: "Download e-Aadhaar, Order Aadhaar PVC Card, Check Update Status, Verify Email/Mobile.",
    documents: ["Aadhaar Number / Enrolment ID", "Linked Mobile for OTP"],
  },
  {
    id: "pan-nsdl",
    name: "Protean (NSDL) PAN Service",
    hindiName: "पैन कार्ड ऑनलाइन सेवा",
    category: "identity",
    url: "https://www.onlineservices.nsdl.com/paam/endUserRegisterContact.html",
    desc: "Apply for New PAN Card (Form 49A), PAN Correction/Reprint, Check PAN status.",
    documents: ["Aadhaar Card", "Passport Photo", "Signature Scan", "Date of Birth Proof"],
  },
  {
    id: "pan-uti",
    name: "UTIITSL PAN Services",
    hindiName: "यूटीआई पैन सेवा",
    category: "identity",
    url: "https://www.pan.utiitsl.com/",
    desc: "PAN card tracking, reprint PVC card, link Aadhaar with PAN.",
    documents: ["Aadhaar Card", "PAN Number"],
  },
  {
    id: "voter-eci",
    name: "Voters' Services Portal (ECI)",
    hindiName: "मतदाता सेवा पोर्टल (NVSP)",
    category: "identity",
    url: "https://voters.eci.gov.in/",
    desc: "Register new Voter ID (Form 6), Download e-EPIC, Change Address, Check Application Status.",
    documents: ["Passport Photo", "Age Proof (10th marksheet/Birth cert)", "Address Proof"],
  },
  {
    id: "crs-birth-death",
    name: "Civil Registration System (CRS)",
    hindiName: "जन्म एवं मृत्यु प्रमाण पत्र",
    category: "identity",
    url: "https://crsorgi.gov.in/",
    desc: "Apply or check verification status for Birth and Death Certificates.",
    documents: ["Hospital Discharge Slip", "Parents' Aadhaar", "Proof of Event"],
  },
  {
    id: "udid",
    name: "Unique Disability ID (Swavlamban)",
    hindiName: "दिव्यांगता प्रमाण पत्र (UDID)",
    category: "identity",
    url: "https://www.swavlambancard.gov.in/",
    desc: "Apply for Disability Certificate and UDID Smart Card, Track Application.",
    documents: ["Disability Medical Report", "Photo", "Aadhaar", "Signature"],
  },

  // Transport
  {
    id: "sarathi-dl",
    name: "Parivahan Sarathi (Driving Licence)",
    hindiName: "सारथी ड्राइविंग लाइसेंस सेवा",
    category: "transport",
    url: "https://sarathi.parivahan.gov.in/",
    desc: "Apply for Learner Licence (LL), Driving Licence (DL) Slot Booking, DL Renewal, Duplicate DL.",
    documents: ["Aadhaar Card", "Age & Address Proof", "Form 1 Medical", "Photo & Signature"],
  },
  {
    id: "vahan-rc",
    name: "Parivahan Vahan (Vehicle RC)",
    hindiName: "वाहन रजिस्ट्रेशन एवं ट्रांसफर",
    category: "transport",
    url: "https://vahan.parivahan.gov.in/",
    desc: "Vehicle RC status, Transfer of Ownership, Hypothecation (Loan) Clearance, Road Tax Payment.",
    documents: ["Vehicle Registration Number", "Chassis Number Last 5 Digits", "Insurance Details"],
  },
  {
    id: "echallan",
    name: "Parivahan E-Challan",
    hindiName: "ट्रैफिक ई-चालान जांच एवं भुगतान",
    category: "transport",
    url: "https://echallan.parivahan.gov.in/",
    desc: "Check traffic police pending challans by vehicle number or challan number and pay online.",
    documents: ["Vehicle Registration No.", "Engine/Chassis No."],
  },
  {
    id: "puc-portal",
    name: "Parivahan PUC Status",
    hindiName: "प्रदूषण जांच (PUC) स्टेटस",
    category: "transport",
    url: "https://puc.parivahan.gov.in/",
    desc: "Verify vehicle pollution certificate validity, download digital PUC copy.",
    documents: ["Vehicle Registration No.", "Chassis No. (Last 5 digits)"],
  },

  // Welfare & Govt Schemes
  {
    id: "pm-kisan",
    name: "PM Kisan Samman Nidhi",
    hindiName: "पीएम किसान सम्मान निधि",
    category: "welfare",
    url: "https://pmkisan.gov.in/",
    desc: "e-KYC with OTP, Beneficiary Status Check, New Farmer Registration, Name Correction as per Aadhaar.",
    documents: ["Aadhaar Card", "Land Jamabandi / Khatauni", "Bank Account Passbook"],
  },
  {
    id: "ayushman-pmjay",
    name: "Ayushman Bharat (PM-JAY)",
    hindiName: "आयुष्मान भारत गोल्डन कार्ड",
    category: "welfare",
    url: "https://beneficiary.nha.gov.in/",
    desc: "Check family eligibility, complete e-KYC, and download Ayushman Golden Card for free treatment.",
    documents: ["Ration Card / Aadhaar", "Mobile for OTP"],
  },
  {
    id: "eshram",
    name: "e-Shram National Portal",
    hindiName: "ई-श्रम कार्ड पोर्टल",
    category: "welfare",
    url: "https://eshram.gov.in/",
    desc: "Unorganized worker registration, download UAN card, update profile and bank account.",
    documents: ["Aadhaar Number", "Aadhaar Linked Active Mobile", "Bank Account Number with IFSC"],
  },
  {
    id: "epfo-portal",
    name: "EPFO Member Passbook & UAN",
    hindiName: "कर्मचारी भविष्य निधि (PF/EPFO)",
    category: "welfare",
    url: "https://unifiedportal-mem.epfindia.gov.in/memberinterface/",
    desc: "UAN Activation, Download PF Passbook, Online PF Claim & Withdrawal, KYC Update.",
    documents: ["UAN Number", "Registered Mobile", "Bank Account & PAN linked"],
  },
  {
    id: "pm-surya-ghar",
    name: "PM Surya Ghar Muft Bijli",
    hindiName: "पीएम सूर्य घर मुफ्त बिजली योजना",
    category: "welfare",
    url: "https://pmsuryaghar.gov.in/",
    desc: "Apply for rooftop solar subsidy up to ₹78,000 for residential households.",
    documents: ["Electricity Bill (Consumer No.)", "Aadhaar", "Bank Passbook", "Roof Photo"],
  },
  {
    id: "nsp-scholarship",
    name: "National Scholarship Portal (NSP)",
    hindiName: "राष्ट्रीय छात्रवृत्ति पोर्टल",
    category: "welfare",
    url: "https://scholarships.gov.in/",
    desc: "Pre-Matric, Post-Matric, and Merit-cum-Means scholarships for school & college students.",
    documents: ["Student Aadhaar", "Marksheet", "Income Certificate", "Caste Certificate", "Bank Passbook"],
  },

  // Tax & Business
  {
    id: "gst-portal",
    name: "Goods & Services Tax (GST)",
    hindiName: "जीएसटी पोर्टल",
    category: "tax_business",
    url: "https://www.gst.gov.in/",
    desc: "GST Registration, Return Filing (GSTR-1, 3B), Challan Creation, GSTIN Search.",
    documents: ["PAN Card", "Business Address Proof (Electricity bill / Rent agreement)", "Bank Cancelled Cheque"],
  },
  {
    id: "udyam-msme",
    name: "Udyam MSME Registration",
    hindiName: "उद्यम आधार (MSME रजिस्ट्रेशन)",
    category: "tax_business",
    url: "https://udyamregistration.gov.in/",
    desc: "Free registration for Micro, Small & Medium enterprises, Instant Udyam Certificate download.",
    documents: ["Aadhaar Card of Entrepreneur", "PAN Card", "Business Bank Account"],
  },
  {
    id: "ncs-jobs",
    name: "National Career Service (NCS)",
    hindiName: "नेशनल करियर सर्विस (रोजगार पंजीयन)",
    category: "tax_business",
    url: "https://www.ncs.gov.in/",
    desc: "Job search, Employment exchange online registration, Skill training programs.",
    documents: ["Aadhaar", "Educational Marksheets", "Resume / Bio-data"],
  },
];

export default function PortalDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredPortals = PORTALS.filter((p) => {
    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hindiName && p.hindiName.includes(searchTerm)) ||
      p.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="tool-page-container">
      <header className="tool-header">
        <div className="tool-header-inner wrap">
          <div className="tool-breadcrumbs">
            <Link href="/" className="crumb-home">
              ← All Tools
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Citizen Portals Directory</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">Essential Cyber Cafe Directory</span>
            <span className="badge-local">Direct Official Portals</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Indian Citizen & Cyber Cafe Services Directory</h1>
          <p className="tool-desc">
            Direct access to official central and state service portals. View required documents, application checklists,
            and service shortcuts for Aadhaar, PAN, Voter ID, Parivahan, PM Kisan, and EPFO.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="search-filter-box">
          <input
            type="text"
            className="portal-search-input"
            placeholder="Search portal or service (e.g. Aadhaar, DL, PAN, PM Kisan, PF, Challan)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="cat-filter-pills">
            <button
              className={`cat-pill ${categoryFilter === "all" ? "active" : ""}`}
              onClick={() => setCategoryFilter("all")}
            >
              All Services ({PORTALS.length})
            </button>
            <button
              className={`cat-pill ${categoryFilter === "identity" ? "active" : ""}`}
              onClick={() => setCategoryFilter("identity")}
            >
              Identity & Civil
            </button>
            <button
              className={`cat-pill ${categoryFilter === "transport" ? "active" : ""}`}
              onClick={() => setCategoryFilter("transport")}
            >
              Transport & DL/RC
            </button>
            <button
              className={`cat-pill ${categoryFilter === "welfare" ? "active" : ""}`}
              onClick={() => setCategoryFilter("welfare")}
            >
              Govt Schemes & Welfare
            </button>
            <button
              className={`cat-pill ${categoryFilter === "tax_business" ? "active" : ""}`}
              onClick={() => setCategoryFilter("tax_business")}
            >
              Tax & MSME
            </button>
          </div>
        </div>

        {/* Portal Grid */}
        <div className="portals-display-grid">
          {filteredPortals.map((portal) => (
            <div key={portal.id} className="portal-card">
              <div className="portal-card-head">
                <div>
                  <h3 className="portal-name">{portal.name}</h3>
                  {portal.hindiName && <span className="portal-hindi">{portal.hindiName}</span>}
                </div>
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-open-portal"
                >
                  Open Portal ↗
                </a>
              </div>

              <p className="portal-desc">{portal.desc}</p>

              <div className="portal-docs-section">
                <span className="docs-title">Required Documents / Details:</span>
                <div className="docs-chips-list">
                  {portal.documents.map((doc, idx) => (
                    <span key={idx} className="doc-chip">
                      • {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
