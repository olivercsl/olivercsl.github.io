# Cloudzeta Solutions (Dev)

Development repository for the Cloudzeta marketing site.
**Status:** Alpha / Staging
**Live URL:** [https://dev.cloudzeta.solutions](https://dev.cloudzeta.solutions) (CNAME to `olivercsl.github.io/cloudzeta-dev`)

## 🎨 Design System ("Apple-Minimal")
- **Visuals:** High whitespace, off-white backgrounds (`#f5f5f7`), near-black text (`#1d1d1f`).
- **Typography:** System font stack (SF Pro / Helvetica Neue / Segoe UI) - no external font loads.
- **Motion:** Framer Motion for enter animations, CSS for hover states.

## 🛠 Tech Stack
- **Framework:** Astro 5.0 (Static Site Generation)
- **Styling:** Tailwind CSS 4.0 (Utility-first)
- **Interactive:** React (Islands architecture)
- **Deploy:** GitHub Pages

## 🚀 Development

### Prerequisites
- Node.js 20+
- npm

### Commands
```bash
npm install        # Install dependencies
npm run dev        # Local dev server (localhost:4321)
npm run build      # Build for production
npm run preview    # Preview build
```

## 🌐 Cloudflare DNS Setup
**Instructions for Administrator:**
To enable `dev.cloudzeta.solutions`:

1.  Log in to Cloudflare.
2.  Navigate to DNS settings for `cloudzeta.solutions`.
3.  Add a **CNAME** record:
    - **Name:** `dev`
    - **Target:** `olivercsl.github.io`
    - **Proxy status:** Proxied (Orange Cloud) - *Optional, or DNS only if GH Pages requires it (usually DNS only for CNAME verification first, then Proxy).*
    - *Note:* GitHub Pages usually requires the CNAME to be verified.
4.  **SSL/TLS:** Set to **Full**.
5.  **Do NOT** touch the root/apex record.

## 📦 Deployment Workflow
1.  **Feature Branch:** Create a branch for your changes.
2.  **Pull Request:** Open PR to `main`.
3.  **Merge:** Merging to `main` triggers the GitHub Action to deploy to `gh-pages` branch.

## 📂 Project Structure
- `src/pages`: Route components (index.astro).
- `src/components`: UI components (React/Astro).
- `src/layouts`: Page shells (HTML <head>).
- `src/styles`: Global CSS and Tailwind directives.
