# /docs — share-by-link collateral

Standalone HTML documents served verbatim from `public/`, reachable only by direct URL.

**These HTML files are the master copy.** Edit the HTML first; any PDF is generated
from it (the page's "Download PDF" button uses the browser's print-to-PDF, and the
print stylesheet lays each slide out as one landscape page).

Rules for anything added here:
- Include `<meta name="robots" content="noindex, nofollow, ...">` in the page head.
- `/docs/` is disallowed in `public/robots.txt`, and these files are not in the sitemap
  (the Astro sitemap only covers routes built from `src/pages`).
- Do not link to them from any indexed page, or crawlers will find them anyway.
- Not a security boundary. The repo is public, so treat everything here as public.
  Nothing confidential belongs in this folder.

## Contents
- `china-access-overview.html` — Cloudzeta presales overview: China access for CFD brokers.
