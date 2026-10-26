## v2 revision (2026-10-21) — supersedes where it conflicts

**Owner decisions:**
- Copy the Ridgeline reference layout fully.
- Rewrite the copy honestly.
- Use a dark palette.
- Show no logo.
- Use GSAP + Lenis for motion and Three.js for the hero.

The drawing is `ui/index.html` (v2). `ui/v1-light.html` is history only.

**Palette.** Every pair below was checked at WCAG AA on the base `#0b0d08`.

| Token | Value | Use | Contrast |
|---|---|---|---|
| text | `#F1E5A1` | headings, primary text | 14.9:1 |
| text-body | `#c9bf8a` | paragraphs | 10.2:1 |
| text-muted | `#9a9372` | mono labels | 6.2:1 |
| accent | `#EF6905` | accent, CTA fill (dark text on it, 6.1:1) | 6.1:1 |
| alarm | `#8B2626` | fall flag fill, SOS outline, pulse rings | cream text on it 6.9:1 (decorative on the base) |
| olive | `#486C2F` | "Tôi ổn" fill, terrain, ridge fill, active chip dot | cream text on it 4.8:1 |
| surfaces | `#10130c` `#12160e` `#151a10` `#1a2014` | alternate bands, panels, ridges | — |
| borders | `#1a1f14` → `#45503a` | lines and borders | — |

Ridgeline's cool grays map one to one onto these olive-black tones.

**Type.** The fonts are Barlow Condensed (700/800 uppercase display), Be Vietnam Pro (body) and JetBrains Mono (labels), as in the reference. All three ship Vietnamese subsets.

**Decision 1 (replaces the Motion decision).**
- Use GSAP 3.15.0 + ScrollTrigger, `@gsap/react` 2.1.2 (`useGSAP` in `"use client"` files) and Lenis 1.3.26. The Lenis↔ScrollTrigger bridge is:

  ```js
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  ```

- Chapter progress uses `start: "top 60%"` and `end: "bottom 60%"`. This reproduces Ridgeline's `(0.6·vh − top) / height`. The reveal uses `top 95%` → `top 50%`.
- Use Three.js 0.186.1 for a flat-shaded olive low-poly terrain in the hero, with fog matching the background, an orange key light, and the camera drifting with the mouse and scroll. The SVG ridges are the fallback when there is no WebGL or motion is reduced.
- The canvas pixel ratio is capped at 2, and the scene is only rendered while the hero is on screen.
- **Remove** `motion`.
- Versions are the newest releases at least 2 weeks old (`npm view … time`, checked 2026-10-21).
- *Sources:*
  - github.com/darkroomengineering/lenis (README)
  - gsap.com/docs/v3/Plugins/ScrollTrigger
  - gsap.com/resources/React
  - gsap.com/licensing: the standard no-charge license covers commercial use, with restrictions only on no-code tools that compete with Webflow
  - three is MIT, lenis is MIT
  - Next 16.3.7 docs on client components

**Claims added in v2:**
- "Đọc chuyển động 50 lần mỗi giây": roadmap §1 "50 Hz accel".
- "Theo dõi nhịp tim": `HealthPassiveService`, heart-rate samples upload.
- "Mạng di động / Wi-Fi, cần có sóng": `Outbox` + `UploadWorker`; no satellite path exists.
- The story numbers are illustrative:
  - km and bpm in chapter 1;
  - the acceleration plot, which is labelled "MINH HỌA";
  - the coordinates (Hà Nội) and 118 bpm in chapter 4.

**Removed from the reference as untrue for Seize Guard:**
- satellite / LTE channel
- siren
- gyroscope
- barometer
- "Gọi cứu hộ ngay" (replaced by "Gửi SOS ngay", which is active SOS)
- rescue team and group-leader recipients
- pre-order with price and delivery date
- battery, water-resistance, temperature and weight specs

**Open:**
- D3 photography is no longer needed: the hero is 3D, and the chapters are SVG.
- D4 social links: still none, so the footer has none.
- D5: the whole site moves to the dark palette, and "UII" in the signed-in header becomes "Seize Guard" with the palette change.

---

## Context (v1)

- The current `/` page is a server component that redirects signed-in users to `/dashboard` and renders a static light page with the old UII branding.
- The approved design system is `../DESIGN.md` (Seize Guard). Its landing rules: light bands alternate with Night Navy bands, the logo goes on light surfaces only, there are no shadows, body text is at least 16px, tap targets are at least 44px, the page respects `prefers-reduced-motion`, and the imagery shows no flashing or strobing.
- The owner chose to **keep the light/dark alternation** rather than a fully dark cinematic page (decision 2026-10-21).
- The UI drawing for this change is `ui/index.html` (same folder). Rule 4 of `AGENTS.md` applies: the implementation must match it exactly.

## Goals / Non-Goals

**Goals:**
- Tell the outdoor story in scroll "chapters": đi → ngã → "Bạn ổn chứ?" (20 s) → cảnh báo kèm vị trí → người thân nhận qua email/web.
- Only make claims backed by shipped behaviour. See the claims table below.
- Fully usable without JavaScript, on a 320px-wide screen, and with reduced motion.

**Non-Goals:**
- Live location, acknowledgement and escalation (roadmap phases B and C).
- A Play Store link.
- An English version.
- Analytics or tracking scripts.
- Changes to the signed-in app pages, apart from the shared token migration.

## Claims allowed on the page

Each claim is checked against the code or docs listed beside it.

| Claim on page | Source of truth |
|---|---|
| Wear OS 5 (Android 14) trở lên | `UII-watch/docs/install.md`; `minSdk = 34` in `watchface/build.gradle.kts` |
| Hỏi "Bạn ổn chứ?", tự gửi sau 20 giây nếu không phản hồi | `Uii.FALL_CANCEL_WINDOW_MS` (20 s release), `install.md` |
| SOS chủ động, đếm ngược 5 giây | roadmap §1 "Active SOS: 3 choices, 5 s countdown" |
| Vị trí quanh thời điểm sự cố, tối đa 4 mốc (kích hoạt, gửi, +2 phút, +5 phút), hiện trên bản đồ | `UII-watch/openspec/changes/sos-gps-location/proposal.md`; `src/components/alerts/alert-map.tsx` |
| Người thân nhận qua email và web | `src/lib/notify` (Gmail + SSE) |
| Thẻ SOS qua mã QR | `src/app/sos/[token]`, `src/app/profile/qr` |
| Hàng đợi offline, tự gửi lại khi có sóng | watch `Outbox` / `FileOutbox` |
| Bản đồ tự host, không gửi cho bên thứ ba | `docs/map-tiles.md` |
| Xuất và xóa dữ liệu | `src/app/settings/export`, `lib/account/service.ts` |
| Vị trí và sức khỏe chỉ thu khi có sự cố, sau khi đồng ý | consent screen (`ConsentScreen.kt`), sos-gps-location proposal. Heart-rate samples are uploaded during monitoring, so the page says "**vị trí** chỉ đọc khi có sự cố" and "dữ liệu sức khỏe chỉ thu sau khi bạn đồng ý". It does not say all health data is incident-only. |

**Forbidden on the page:**
- any accuracy or detection-rate figure, and "phát hiện chuẩn xác";
- "theo dõi trực tiếp" (live tracking);
- "người thân xác nhận đang đến" and "tự động gọi";
- any battery hours;
- "tải trên Google Play";
- named clubs, testimonials or partner logos that do not exist yet.

## Decisions

1. **Scroll storytelling with CSS sticky plus the Motion library** (revised 2026-10-21 at the owner's request, after the Ridgeline R1 reference).
   - The layout is unchanged: each chapter is a full-height `<article>`, with a sticky visual on desktop and the text scrolling past it.
   - Effects are scroll-linked and borrowed from the reference's motion language only, not its claims:
     - a top progress bar;
     - the hero headline appears word by word, and the hero photo has a slight parallax;
     - ch1 draws the trail line with a moving dot;
     - ch2 tumbles the letters "NGÃ" and spikes the acceleration wave;
     - ch3 counts the 20 s ring down with scroll;
     - ch4 switches "Chờ sóng" → "Đã gửi";
     - ch5 slides the alert card in and drops the map pin.
     Nothing flashes. Exact behaviour is in `ui/index.html`.
   - **Library:** `motion` (motion.dev), pinned to **14.0.0**, published 2026-10-02. That is the newest release at least two weeks old. 14.5.0 is the latest and was published today, so we do not take it.
   - React code imports from `"motion/react"`, using `useScroll({ target, offset })`, `useTransform` and `useSpring`. The peer dependency `react ^18 || ^19` matches our React 19.2.8.
   - **Reduced motion:** `MotionConfig reducedMotion="user"` only disables transform and layout *animations*. The scroll-linked values are gated by `useReducedMotion()`: when it is true, the effects are not mounted and the chapters render stacked and static, as before.
   - Motion runs only in client components (`"use client"`). Sections stay server components; only `story-motion.tsx` and `hero-motion.tsx` are client components.
   - The `IntersectionObserver` component that picks the active stage visual stays.
   - *Sources:*
     - https://motion.dev/docs/react
     - https://motion.dev/docs/react-scroll-animations
     - https://motion.dev/docs/react-motion-config
     - https://motion.dev/docs/react-use-reduced-motion
     - https://motion.dev/docs/scroll
     - `npm view motion` (versions, dates and peer dependencies), checked 2026-10-21
     - Next 16.3.7 docs `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
2. **One Night Navy band holds all story chapters.** This satisfies DESIGN.md ("at most one dark band appears between light ones"). Text on Night Navy is white or light blue `#7db4f5`, with 13.6:1 and 6.3:1 contrast.
3. **The hero is light.** The headline is on the left; a large mountain photo with the watch on a wrist is on the right; the logo lockup is in the header on white. This follows DESIGN.md: light hero, photo beside it.
4. **The watch UI in the story is drawn, not photographed.** A rounded watch face shows the real copy from the watch app ("Bạn ổn chứ?", "Tôi ổn", 20 s ring, "Đã gửi"), so it matches the product exactly.
5. **Social proof is honest until real.** The section shows "Đang mở beta cho câu lạc bộ trail" plus a CTA to join as a club. It has no quotes or logos until the owner supplies real ones.
6. **Token migration.** `globals.css` gets the DESIGN.md tokens. `--primary` switches from Graphite to Guard Blue `#0d63c6`, `--color-slate` changes to `#6b6b6b`, and `--color-ember-orange` changes to `#f66002`. `--color-brass` stays defined until no page uses it. Every page that uses the shared `Button` changes color, so the task list includes a visual check of the signed-in pages.

## Open decisions (owner)

- **D1 — Waitlist storage.** Options:
  - **(a)** link to an external form chosen by the owner, set by an env var `NEXT_PUBLIC_WAITLIST_URL`;
  - **(b)** `mailto:` the privacy contact;
  - **(c)** our own table `waitlist(email, kind, consent_at)` plus a rate-limited `POST /api/waitlist`. This is a schema change and needs a revised proposal and approval.

  *Recommendation:* (a) for the first release.
- **D2 — Price line.** "Miễn phí trong giai đoạn beta" is used in the drawing. The owner must confirm it.
- **D3 — Photography.** The drawing uses labelled placeholders. Real photos must be licensed, show daylight trails or mountains (no distress, no strobing), and come at 2400px wide or more.
- **D4 — Social links** for the footer (none exist today).
- **D5 — Brand name** across the app: "Seize Guard" on the landing, but the signed-in header still says "UII". Change it there too, or later?

## Risks / Trade-offs

- [The token migration recolors the signed-in app] → visual check of `/dashboard`, `/alerts`, `/profile` and `/settings` in the tasks; do it in a separate commit so it can be reverted alone.
- [Large photos slow the first paint on mountain-grade mobile networks] → `next/image` with AVIF/WebP and `sizes`; the hero photo is `priority` and the rest load lazily.
- [Sticky scroll hurts small screens] → below 1024px, the chapters stack (visual above text) with no sticky behaviour.
- [Over-promising safety] → the "Giới hạn và an toàn" section is mandatory and linked from the FAQ.

## Migration Plan

Ship it behind no flag: the landing page has no data. To roll back, revert the page commit. The token commit can be reverted on its own.
