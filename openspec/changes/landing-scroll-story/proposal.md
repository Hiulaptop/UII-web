## Why

Today's landing page (`src/app/page.tsx`) talks only to families of people with epilepsy, uses the old "UII" name and colors, and promises things the product cannot yet keep ("báo ngay khi có dấu hiệu tiền động kinh"). The next audience is the trail and outdoor community: people who run or hike alone, fall where nobody is around, and whose family only finds out too late. The page needs to tell that story honestly before the beta opens.

## What Changes

- **v2 (revised 2026-10-21, owner request):** the page copies the layout and motion of the owner's reference file `Ridgeline R1 Landing – Landing — Scroll Story.html`:
  - sticky header with a chapter indicator and progress bar
  - hero
  - five scroll chapters: Đi một mình → Trượt → Im lặng → Tín hiệu → Trở về
  - specs and the beta CTA
  - footer

  The v1 light design is kept as `ui/v1-light.html` for history.
- The **copy is rewritten honestly** for Seize Guard (owner's choice). Ridgeline claims that Seize Guard does not have are removed or replaced:
  - satellite
  - siren
  - gyroscope and barometer
  - rescue team as a recipient
  - pre-order and price
  - battery, water-resistance, temperature and weight specs
- **Dark palette from the owner:** `#8B2626` `#EF6905` `#F1E5A1` `#486C2F` on an olive-black base. `../DESIGN.md` and the app tokens in `globals.css` follow, so the whole site changes palette.
- **No logo:** the brand is only the text wordmark "Seize Guard".
- **Motion stack:** GSAP + ScrollTrigger and Lenis replace the `motion` library. Three.js renders the hero terrain.
- **v1 sections that Ridgeline has no place for:**
  - Limits, privacy and the epilepsy note become lines in chapter 5 and the footer.
  - The problem section, features grid, FAQ and social-proof sections are dropped.
- The copy keeps all the earlier honesty rules: it says beta, uses the waitlist, says "vị trí quanh sự cố" (never live tracking), and makes no accuracy or battery claims.
- Signed-in users are still redirected to `/dashboard`.

## Capabilities

### New Capabilities

- `landing-page`: what the public home page `/` shows, in what order, which claims it may and may not make, how the scroll chapters behave (including reduced motion and no WebGL), its palette, and its accessibility rules.

### Modified Capabilities

- None (no specs exist in `openspec/specs/` yet).

## Impact

- **Code:**
  - `src/app/page.tsx` is kept (signed-in redirect).
  - `src/components/landing/` is rewritten: a client component for the GSAP/Lenis scrubs and one for the Three.js hero. The v1 `motion` components are removed.
  - `public/brand/` (logo) and `public/landing/*.svg` (v1 illustrations) are no longer used and are removed.
- **Styles:**
  - `globals.css` and `../DESIGN.md` switch to the dark palette. Every signed-in page changes color, so it gets a visual check.
  - Fonts: Barlow Condensed, Be Vietnam Pro and JetBrains Mono via `next/font/google`.
- **Runtime dependencies:** add `gsap@3.15.0`, `@gsap/react@2.1.2`, `lenis@1.3.26` and `three@0.186.1` (exact pins); remove `motion`.
- **No database schema or device API change.** The waitlist stays an external form (`NEXT_PUBLIC_WAITLIST_URL`, D1).
