// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudzeta.solutions',

  // The tools briefly lived under /features/. Both URLs were public, so keep
  // them resolving rather than 404ing anyone who saved or shared one.
  redirects: {
    '/features/password-generator': '/tools/password-generator',
    '/features/time-zone-converter': '/tools/time-zone-converter',
    // Published briefly under the old slug before the how-to naming rule.
    '/blog/dns-cutover-to-cloudflare': '/blog/how-to-migrate-dns-to-cloudflare',
  },

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [react(), sitemap()]
});
