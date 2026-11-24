// @ts-check
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

// Sitemap <lastmod>: when each page last changed, so Google can tell which
// pages to crawl again. Google uses it only "if it's consistently and
// verifiably ... accurate", and it "should reflect the date and time of the
// last significant update to the page".
// https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
// So a page's date is the last commit to its own sources (the page, its tool
// component and the lib files they import), never shared parts such as the
// layout, the navbar or the related-tools links. Blog posts use the dates in
// their front matter, as their structured data does. A shallow checkout knows
// only one commit, so lastmod is left out rather than set to today everywhere.
const root = fileURLToPath(new URL('.', import.meta.url));
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const fullHistory = (() => {
  try {
    return git(['rev-parse', '--is-shallow-repository']) === 'false';
  } catch {
    return false;
  }
})();

const resolveSource = (base) =>
  ['.tsx', '.ts', '.astro', '.js', ''].map((ext) => base + ext).find((f) => /\.\w+$/.test(f) && existsSync(join(root, f)));

const localImports = (file, keep) =>
  [...readFileSync(join(root, file), 'utf8').matchAll(/from\s+'(\.\.?\/[^']+)'/g)]
    .map((m) => resolveSource(join(dirname(file), m[1])))
    .filter((f) => f && keep(f));

const pageSources = (path) => {
  if (path === '/') {
    const page = 'src/pages/index.astro';
    return [page, ...localImports(page, (f) => f.startsWith('src/components/') && !f.includes('Navbar'))];
  }
  if (path === '/tools/') return ['src/pages/tools/index.astro', 'src/lib/toolsCatalog.ts'];
  const tool = /^\/tools\/([a-z0-9-]+)\/$/.exec(path);
  if (!tool || !existsSync(join(root, `src/pages/tools/${tool[1]}.astro`))) return [];
  const page = `src/pages/tools/${tool[1]}.astro`;
  const components = localImports(page, (f) => f.startsWith('src/components/tools/'));
  const libs = [page, ...components].flatMap((f) =>
    localImports(f, (g) => g.startsWith('src/lib/') && !g.endsWith('toolsCatalog.ts')),
  );
  return [page, ...components, ...libs];
};

const postDates = () =>
  readdirSync(join(root, 'src/content/blog'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(join(root, 'src/content/blog', f), 'utf8');
      const date = (key) => (new RegExp(`^${key}:\\s*(\\d{4}-\\d{2}-\\d{2})`, 'm').exec(text) || [])[1];
      return { path: `/blog/${f.replace(/\.md$/, '')}/`, date: date('updated') || date('published') };
    });

const lastmodFor = (path) => {
  const post = postDates().find((p) => p.path === path);
  if (post) return post.date;
  if (!fullHistory) return undefined;
  const files = path === '/blog/' ? ['src/pages/blog/index.astro'] : pageSources(path);
  if (!files.length) return undefined;
  const dates = [git(['log', '-1', '--format=%cs', '--', ...new Set(files)])];
  if (path === '/blog/') dates.push(...postDates().map((p) => p.date));
  return dates.filter(Boolean).sort().pop();
};

// https://astro.build/config
export default defineConfig({
  site: 'https://cloudzeta.solutions',

  vite: {
    plugins: [tailwindcss()]
  },

  redirects,

  integrations: [
    react(),
    sitemap({
      serialize(item) {
        const lastmod = lastmodFor(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    cloudflareRedirects,
  ]
});
