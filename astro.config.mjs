// @ts-check
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// The Alibaba Cloud RAM guide first went out at /guides/ and customers may
// already have that link. It now lives in Notes.
const redirects = {
  '/guides/how-to-create-alibaba-cloud-ram-user-with-admin-access/':
    '/blog/how-to-create-alibaba-cloud-ram-user-with-admin-access/',
};

// Writes dist/_redirects for Cloudflare hosting (wrangler.jsonc). Cloudflare
// sends /page to /page/ with a temporary 307, where GitHub Pages used a
// permanent 301, so list a 301 for every page. The redirects above become real
// 301s as well, instead of a page that refreshes. The GitHub Pages deploy
// removes the file. https://developers.cloudflare.com/workers/static-assets/redirects/
/** @type {import('astro').AstroIntegration} */
const cloudflareRedirects = {
  name: 'cloudflare-redirects',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const lines = [];
      for (const [from, to] of Object.entries(redirects)) {
        lines.push(`${from} ${to} 301`, `${from.slice(0, -1)} ${to} 301`);
      }
      const pages = readdirSync(fileURLToPath(dir), { recursive: true })
        .map(String)
        .filter((f) => f === 'index.html' || f.endsWith('/index.html'))
        .map((f) => `/${f.slice(0, -'index.html'.length)}`)
        .filter((p) => !(p in redirects))
        .sort();
      for (const p of pages) {
        if (p !== '/') lines.push(`${p.slice(0, -1)} ${p} 301`);
        lines.push(`${p}index.html ${p} 301`);
      }
      writeFileSync(new URL('_redirects', dir), `${lines.join('\n')}\n`);
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudzeta.solutions',

  vite: {
    plugins: [tailwindcss()]
  },

  redirects,

  integrations: [react(), sitemap(), cloudflareRedirects]
});
