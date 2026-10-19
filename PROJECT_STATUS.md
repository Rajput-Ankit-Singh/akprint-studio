# Project Status: AkPrint Studio (Complete AkPrintHub Alternative)

**Last Updated:** October 19, 2026  
**Local Host URL:** `http://localhost:3000` (Network: `http://172.21.92.233:3000`)  
**Production Build Status:** Passed (17/17 routes compiled & prerendered statically)  
**Paywall Status:** 100% Free & Unlimited (Zero tokens, zero subscription checks, zero watermarks)

---

## 1. Executive Summary & Audit Comparison

The reference website [akprinthub.com](https://akprinthub.com/) serves print shops and cyber cafes in India, but restricts users with daily limits, ₹99 Pro recharge plans, and ₹499 Auto Print subscriptions.

**AkPrint Studio** provides an independent, clean-room alternative with equal or superior functionality that runs entirely in the user's browser, eliminating external server uploads and artificial limits.

---

## 2. Completed Features Inventory

| Category | Tool Name & Route | Status | Core Capabilities & Export Verification |
| :--- | :--- | :--- | :--- |
| **Document Processing** | [AI & 4-Corner Document Crop](http://localhost:3000/tools/document-crop) | Complete | Interactive 4-corner perspective crop (quad homography mesh), tilt correction, A4 / CR80 presets, brightness/contrast, A4 print layout, **JPG & PDF Download**. |
| **Document Processing** | Multi-Page A4 Arranger | Complete | Packs multiple straightened documents with custom margins (5mm/10mm/15mm) and copies onto A4 sheets. |
| **Photo Studio** | [Passport Photo Studio](http://localhost:3000/tools/passport-photo) | Complete | India (35×45mm), US Visa (2×2"), Schengen, PAN, and Stamp sizes. Face repositioning, studio background replacement (White, Blue, Grey), black borders, DOP/name stamps, **A4 & 4×6 photo sheets (4-32 copies), 300 DPI JPG & PDF export**. |
| **Smart ID / PVC Studio** | [Smart ID & PVC Studio](http://localhost:3000/tools/id-card-print) | Complete | CR80 standard (85.6×54mm) front & back pairing (Aadhaar, Voter, PAN, Driving Licence). 1 to 5 card pairs per A4 sheet, stacked & side-by-side layouts, **100% actual print scale PDF & 300 DPI JPG export**. |
| **Image Utilities** | [Photo Resize & Target KB](http://localhost:3000/tools/photo-resize) | Complete | Dimensional resizing in mm, cm, in, and px with DPI scaling. Sarkari/Exam presets (UPSC/SSC 50KB, Bank 20KB). Iterative binary-search compression to exact target KB with **real-time size indicator and JPG/PNG/WebP download**. |
| **PDF Utilities** | [PDF Utilities Hub](http://localhost:3000/tools/pdf-tools) | Complete | **Images to PDF** (reorder, orientation, margins), **Merge PDFs** (multi-file combine), **Split & Delete Pages** (visual tile selector & range extractor), and **Rotate PDF** (90°, 180°, 270°). 100% client-side via `pdf-lib`. |
| **Design Studio** | [Resume & CV Maker](http://localhost:3000/tools/resume-maker) | Complete | Modern, Classic, and Cyber Cafe Bio-data templates. Interactive form for education, experience, skills, and photo. **Live A4 sheet preview and instant PDF/Print export**. |
| **Design Studio** | [Marriage Biodata Maker](http://localhost:3000/tools/marriage-biodata) | Complete | Traditional Indian matrimonial biodata (Ganesh Ji, Om, Radha Krishna headings, floral borders, royal maroon/saffron/gold themes). Kundali/astrological details, family background, photo. **A4 print/PDF download**. |
| **Design Studio** | [Shop Poster & Notice Maker](http://localhost:3000/tools/poster-maker) | Complete | Cyber cafe services list, Shop Closed / Holiday notices, Urgent Vacancies, To-Let / Rent banners. High-contrast themes (Navy, Crimson, High-Vis Yellow). **Print-ready A4 poster export**. |
| **Design Studio** | [Official Application Maker](http://localhost:3000/tools/application-maker) | Complete | Formal letter templates for Bank Manager (ATM/Cheque), School Principal, Police Lost Document Complaint, and Office Leave. Formatted **A4 letter print & PDF export**. |
| **Cyber Cafe Counter** | [UPI Payment Lock QR](http://localhost:3000/tools/payment-qr) | Complete | Generate UPI QR with locked amounts, custom merchant name, and transaction description. Generates a printable **Counter Standee Card** with GPay, PhonePe, Paytm, BHIM deep-linking & universal UPI link copy. |
| **Cyber Cafe Counter** | [CyberPrint Pay Customer View](http://localhost:3000/print) | Complete | Customer mobile upload via QR, page range selection, B/W vs Colour rate calculation, and local queue submission. **Displays amount-locked QR code with direct 1-click redirection buttons into Google Pay, PhonePe, Paytm, and BHIM UPI.** |
| **Cyber Cafe Counter** | [Operator Counter Desk](http://localhost:3000/operator) | Complete | Counter operator console to review queue, collect cash/UPI payment, approve jobs, and dispatch to print. Real-time broadcast sync with customer view. |
| **Citizen Portals** | [Indian Citizen Portals Directory](http://localhost:3000/tools/portal-directory) | Complete | Searchable directory of 35+ verified official portals (UIDAI, PAN, ECI Voter, Parivahan Sarathi/Vahan, PM Kisan, Ayushman Bharat, E-Shram, EPFO, GST, Udyam) with required document checklists. |
| **Platform Homepage** | [AkPrint Studio Homepage](http://localhost:3000/) | Complete | Unified portal with instant search across all 15+ tools, category filters, and quick in-browser batch workbench. |

---

## 3. Technology & Architecture Highlights

1. **Framework:** Next.js 15.5.28 (App Router), React 19, TypeScript 5.7.
2. **Client-Side PDF Engine:** `pdf-lib` for zero-server PDF creation, merging, splitting, and page rotation.
3. **Perspective Transform:** Custom Pure Canvas 2D triangular mesh subdivision (`lib/perspective.ts`) providing 60 FPS interactive perspective rectification without heavyweight external binaries.
4. **Image Processing:** `lib/image-processing.ts` for DPI-accurate unit conversion (mm, cm, in, px), background color replacement, and iterative target-KB compression.
5. **UPI Deep Link Integration:** `tez://upi/pay`, `phonepe://pay`, `paytmmp://pay`, and universal `upi://pay` with locked amounts (`am`) and queue tracking notes (`tn`).
6. **Privacy Model:** 100% of document processing, photo cropping, and PDF operations execute within the active browser tab. No document content, identity numbers, or files are uploaded to external servers.

---

## 4. Free Service Hosting Guide (Converting to Live Working URL)

### Option 1: Instant Public Live URL for Phone Testing (No Signup, 30 Seconds)
With your server running on port 3000:
```bash
# Using Cloudflare Quick Tunnel (Recommended - Fast & Free HTTPS)
npx cloudflared tunnel --url http://localhost:3000

# OR using Localtunnel
npx localtunnel --port 3000
```
This generates a live public HTTPS URL (e.g. `https://random-subdomain.trycloudflare.com`) that you can open on your smartphone immediately to test camera uploads, scan the QR code, or test Google Pay and PhonePe redirects.

### Option 2: Permanent 100% Free Production Deployment (Vercel)
Since this repository is already connected to GitHub (`Rajput-Ankit-Singh/akprint-studio`):
1. Go to [vercel.com](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New Project** -> Select `Rajput-Ankit-Singh/akprint-studio`.
3. Framework Preset: **Next.js** (Auto-detected).
4. Click **Deploy**.
5. Within 60 seconds, your site is live 24/7 on `https://akprint-studio.vercel.app` with free SSL and automated deployments on every git commit.

### Option 3: Permanent Free Static / Edge Hosting (Cloudflare Pages or Netlify)
- **Cloudflare Pages:** Connect GitHub repo -> Build command: `npm run build` -> Output directory: `.next` (or static `out`). Free bandwidth worldwide.
- **Netlify:** Run `npx netlify deploy --prod` directly from this directory.

---

## 5. Commands to Run & Manage

- **Production Server (Currently Running):**
  ```bash
  node ./node_modules/next/dist/bin/next start -p 3000
  ```
- **Development Mode:**
  ```bash
  npm run dev
  ```
- **Production Build:**
  ```bash
  npm run build
  ```

---

## 6. Next Recommended Tasks

1. Stage and push latest changes to GitHub (`git add . && git commit -m "feat: amount-locked QR and mobile UPI deep links" && git push origin main`).
2. Connect GitHub repo to Vercel or Cloudflare Pages for automatic 24/7 hosting.
3. Connect optional local Windows silent printer agent if automated hardware receipt/spooler printing is desired at the counter.
