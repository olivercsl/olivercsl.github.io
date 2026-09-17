// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudzeta.solutions',

  vite: {
    plugins: [tailwindcss()]
  },

  // The Alibaba Cloud RAM guide first went out at /guides/ and customers may
  // already have that link. It now lives in Notes.
  redirects: {
    '/guides/how-to-create-alibaba-cloud-ram-user-with-admin-access/':
      '/blog/how-to-create-alibaba-cloud-ram-user-with-admin-access/',
  },

  integrations: [react(), sitemap()]
});
