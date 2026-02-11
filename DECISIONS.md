# Architectural Decisions

## Why Astro?
- **Performance First:** Astro renders zero JS by default (Islands architecture).
- **SEO Ready:** Excellent metadata and sitemap support out of the box.
- **Content Focused:** Ideal for marketing sites (markdown, optimized images).

## Why Tailwind CSS?
- **Rapid Iteration:** Utility-first workflow speeds up development.
- **Customization:** Easy to extend with design tokens (colors, spacing).
- **Size Optimization:** Purge unused CSS for minimal production builds.

## Why System Fonts?
- **Performance:** Avoiding external font downloads (Google Fonts) saves bandwidth and reduces layout shift (CLS).
- **Aesthetic:** Matches the "Apple-minimal" design language (native feel).
- **Accessibility:** Uses user preferences for font rendering.

## Why Framer Motion?
- **Animation Quality:** Best-in-class physics-based animations for React components.
- **Integration:** Works seamlessly with Astro Islands for interactive sections.

## DevOps Strategy
- **Deployment:** GitHub Pages (free, simple CI/CD).
- **Security:** Full SSL/TLS (Cloudflare).
- **Testing:** Local `npm run build` + `npm run preview` before commit.
