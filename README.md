# Paperloop Studio

A clean-room, browser-first document and photo print utility MVP. It intentionally uses original branding and UI.

## Included MVP

- Multi-image upload with local-only previews and a selectable batch
- Drag-to-position crop, zoom, edge trim, straighten, 90° rotations, and crop reset
- Brightness and contrast adjustments
- Document and passport-photo workspaces with calculated A4 packing capacity
- Adjustable copies, margins, gaps, print borders, and optional captions
- Local JPG export, batch downloads, quality adjustment, and a target-size compression option
- UPI URI-based QR preview with fixed amount shortcuts
- LocalStorage layout preferences without retaining selected images
- Print stylesheet and browser print handoff

## Run locally

```cmd
npm install
npm run build
npx serve out -l 3000
```

Open `http://localhost:3000`.

## Static deployment

The project is configured with `output: "export"`, so `npm run build` creates an `out/` directory suitable for static hosting. For Cloudflare Pages, authenticate first, then deploy it with:

```cmd
npx wrangler login
npx wrangler pages deploy out --project-name paperloop-studio
```

## Privacy model

The MVP keeps uploaded images and QR details in the active browser tab. It includes no server upload, payment confirmation, or silent printer agent. Those need a separate authenticated backend and signed local print agent.
