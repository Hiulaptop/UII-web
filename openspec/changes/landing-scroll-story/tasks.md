## 0. Before coding

- [x] 0.1 Owner approves v1 spec and drawing (2026-10-21)
- [x] 0.2 Owner approves **v2** spec and `ui/index.html` (Ridgeline layout, dark palette, GSAP/Lenis/Three)
- [x] 0.3 Sources verified (design.md v2 decision 1)

## 1. Palette (commit: `style(ui): switch to dark Seize Guard palette`)

- [x] 1.1 Update `../DESIGN.md` colors, type and landing section to v2
- [x] 1.2 `src/app/globals.css` tokens to the v2 palette; `--background`/`--foreground` dark; Button variants
- [x] 1.3 Fonts in `layout.tsx`: Barlow Condensed, Be Vietnam Pro, JetBrains Mono (`next/font/google`, `vietnamese` subset)
- [ ] 1.4 Visual check of `/dashboard`, `/alerts`, `/profile`, `/settings`, `/login`; header text "Seize Guard"

## 2. Dependencies (commit: `build: replace motion with gsap, lenis and three`)

- [x] 2.1 `npm uninstall motion`; `npm install --save-exact gsap@3.15.0 @gsap/react@2.1.2 lenis@1.3.26 three@0.186.1` (+ `@types/three` matching)
- [x] 2.2 Remove `public/brand/`, `public/landing/` and v1 landing components

## 3. Page (commit: `feat(landing): rebuild landing on ridgeline scroll story`)

- [x] 3.1 Server-rendered markup and copy exactly as `ui/index.html`
- [x] 3.2 `landing-scroll.tsx` ("use client", `useGSAP`): Lenis + ScrollTrigger bridge, progress bar, chapter indicator, reveals, hero headline/watch scrub, ch1–ch4 scrubs; static end states under reduced motion
- [x] 3.3 `hero-terrain.tsx` ("use client"): Three.js terrain, mouse/scroll camera, SVG fallback, dispose on unmount, render only while visible
- [x] 3.4 Waitlist CTA → `NEXT_PUBLIC_WAITLIST_URL` (fallback mailto)

## 4. Verify

- [ ] 4.1 Screenshots at 320, 375, 768, 1440px compared with `ui/index.html`; list every difference
- [ ] 4.2 Keyboard, reduced motion, no-WebGL and JS-disabled passes; contrast check
- [x] 4.3 `npm run lint`, `npx tsc --noEmit`, `npm test` pass
- [ ] 4.4 Archive the change (`docs(spec): archive landing-scroll-story`)
