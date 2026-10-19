export interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  category: "document" | "photo" | "idcard" | "pdf" | "design" | "counter" | "portals";
  badge?: string;
  icon: string;
  href: string;
  tags: string[];
}

export const TOOLS_REGISTRY: ToolItem[] = [
  // Document Processing
  {
    id: "document-crop",
    title: "AI & 4-Corner Document Crop",
    subtitle: "Straighten tilted mobile & WhatsApp photos, perspective crop to A4 / ID size",
    category: "document",
    badge: "Core Tool",
    icon: "◩",
    href: "/tools/document-crop",
    tags: ["document", "crop", "perspective", "straighten", "whatsapp", "scanner", "a4", "receipt"],
  },
  {
    id: "a4-sheet-arranger",
    title: "A4 Multi-Page Arranger",
    subtitle: "Arrange multiple document pages onto print-ready A4 sheets with custom margins",
    category: "document",
    icon: "📄",
    href: "/tools/document-crop?mode=sheet",
    tags: ["a4", "layout", "sheet", "margins", "double side", "print"],
  },

  // Photo Studio
  {
    id: "passport-photo",
    title: "Passport Photo Studio",
    subtitle: "India 35×45mm, US 2×2\", Schengen, photo sheets (A4 & 4×6), background change & borders",
    category: "photo",
    badge: "Popular",
    icon: "👤",
    href: "/tools/passport-photo",
    tags: ["passport", "photo", "visa", "35x45", "4x6", "a4", "background", "border", "stamp"],
  },
  {
    id: "photo-resize",
    title: "Photo Resize & Target KB",
    subtitle: "Precise dimensions (px, mm, cm, in) and compression for online exam/job forms",
    category: "photo",
    badge: "Form Ready",
    icon: "🔍",
    href: "/tools/photo-resize",
    tags: ["resize", "compress", "target kb", "kb", "sarkari", "form", "dimensions", "exam"],
  },
  {
    id: "photo-sheets",
    title: "4×6 & A4 Photo Print Sheets",
    subtitle: "Pack 4, 6, 8, 12, 16, 32 portrait copies with cutting guides onto gloss photo paper",
    category: "photo",
    icon: "🖼️",
    href: "/tools/passport-photo?view=sheets",
    tags: ["4x6", "a4", "glossy", "copies", "grid", "border", "notary", "joint"],
  },

  // Smart ID / PVC
  {
    id: "id-card-print",
    title: "Smart ID & PVC Studio",
    subtitle: "Front & back card pairs, CR80 standard (85.6×54mm), 1 to 5 cards per A4 page",
    category: "idcard",
    badge: "Cyber Cafe",
    icon: "💳",
    href: "/tools/id-card-print",
    tags: ["id card", "pvc", "aadhaar", "pan", "voter", "cr80", "smart card", "front back"],
  },
  {
    id: "pvc-5-cards",
    title: "5-Card PVC A4 Sheet",
    subtitle: "Pack up to 5 double-sided ID cards stacked or side-by-side on one single A4 paper",
    category: "idcard",
    icon: "🗂️",
    href: "/tools/id-card-print?layout=5card",
    tags: ["5 cards", "a4 pvc", "id batch", "print queue"],
  },

  // PDF & Image Utilities
  {
    id: "pdf-tools",
    title: "PDF Utilities Hub",
    subtitle: "Merge PDFs, split/delete pages, rotate, and extract pages locally with zero upload",
    category: "pdf",
    badge: "100% Local",
    icon: "📑",
    href: "/tools/pdf-tools",
    tags: ["pdf", "merge", "split", "delete pages", "rotate", "extract", "combine"],
  },
  {
    id: "image-to-pdf",
    title: "Images to PDF Converter",
    subtitle: "Combine JPG, PNG, and WebP into high-quality multi-page A4/letter PDF",
    category: "pdf",
    icon: "📦",
    href: "/tools/pdf-tools?tab=img2pdf",
    tags: ["jpg to pdf", "png to pdf", "images to pdf", "convert", "scanner to pdf"],
  },

  // Creative Design Studio
  {
    id: "resume-maker",
    title: "Pro Resume & CV Builder",
    subtitle: "Job-ready modern templates with education, experience, skills, and instant PDF print",
    category: "design",
    badge: "Templates",
    icon: "📋",
    href: "/tools/resume-maker",
    tags: ["resume", "cv", "bio", "job application", "templates", "career", "pdf"],
  },
  {
    id: "marriage-biodata",
    title: "Indian Marriage Biodata Maker",
    subtitle: "Traditional & modern biodata formats with Kundali details, family details & photo",
    category: "design",
    badge: "New",
    icon: "💍",
    href: "/tools/marriage-biodata",
    tags: ["marriage", "biodata", "rishta", "kundali", "wedding", "matrimonial", "family"],
  },
  {
    id: "poster-maker",
    title: "Shop Poster & Banner Maker",
    subtitle: "Notice, festive sale, cyber cafe services, rent, and announcements ready to print",
    category: "design",
    icon: "🎨",
    href: "/tools/poster-maker",
    tags: ["poster", "banner", "shop notice", "announcement", "print sign"],
  },
  {
    id: "application-maker",
    title: "Job & Official Application Maker",
    subtitle: "Pre-formatted formal letters for leave, bank requests, cyber cafe petitions & jobs",
    category: "design",
    icon: "✉️",
    href: "/tools/application-maker",
    tags: ["application", "letter", "leave", "bank letter", "affidavit", "formal"],
  },

  // Counter & Payment
  {
    id: "cyberprint-pay",
    title: "CyberPrint Pay (Customer)",
    subtitle: "Customer mobile upload via QR, page range, B/W vs color, and instant rate estimation",
    category: "counter",
    badge: "Automation",
    icon: "📱",
    href: "/print",
    tags: ["customer", "mobile upload", "qr print", "rate", "queue"],
  },
  {
    id: "operator-desk",
    title: "Operator Counter Desk",
    subtitle: "Live print queue management, UPI payment check, approve & print handoff console",
    category: "counter",
    icon: "🖥️",
    href: "/operator",
    tags: ["operator", "counter", "shopkeeper", "queue", "manage jobs"],
  },
  {
    id: "payment-qr",
    title: "UPI Fixed-Amount Payment QR",
    subtitle: "Lock transaction amounts and customer note inside an instant printable UPI QR code",
    category: "counter",
    icon: "⌘",
    href: "/tools/payment-qr",
    tags: ["upi", "qr", "payment", "lock amount", "gpay", "phonepe", "paytm"],
  },

  // Citizen Portals Directory
  {
    id: "portal-directory",
    title: "Indian Citizen Portals Directory",
    subtitle: "Direct access & service links to 35+ central and state portals for cyber cafes",
    category: "portals",
    badge: "35+ Portals",
    icon: "🇮🇳",
    href: "/tools/portal-directory",
    tags: ["aadhaar", "pan", "voter", "driving licence", "rc", "pm kisan", "epfo", "ration card"],
  },
];
