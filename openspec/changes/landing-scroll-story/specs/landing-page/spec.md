## ADDED Requirements

### Requirement: Section order (Ridgeline layout)
The public page `/` SHALL copy the layout of the reference file `Ridgeline R1 Landing – Landing — Scroll Story.html` and render, in this order:
1. sticky header: text wordmark, chapter indicator `CH 0X / 05` with chapter name and page progress bar, and nav (Câu chuyện, Thông số, Tham gia beta)
2. hero
3. Chương 01 Đi một mình
4. Chương 02 Trượt
5. Chương 03 Im lặng
6. Chương 04 Tín hiệu
7. Chương 05 Trở về, with Thông số and the beta CTA
8. footer

#### Scenario: Anonymous visitor
- **WHEN** a visitor who is not signed in opens `/`
- **THEN** all sections render in the listed order and match `ui/index.html`

#### Scenario: Signed-in user
- **WHEN** a signed-in user opens `/`
- **THEN** they are redirected to `/dashboard`

### Requirement: Honest claims
The page SHALL describe the product as beta and SHALL use the external waitlist form as the call to action.

It SHALL NOT show:
- satellite connectivity;
- a siren;
- a gyroscope or barometer;
- a rescue team as a recipient;
- pre-orders or a price other than "miễn phí beta";
- battery hours, water resistance, operating temperature or weight;
- detection accuracy figures;
- live tracking;
- acknowledgement or escalation features;
- a Play Store download.

Illustrative numbers (distance, heart rate, coordinates) SHALL be labelled "MINH HỌA" or be clearly part of the story.

#### Scenario: Copy review
- **WHEN** the page copy is compared with the "Claims allowed" table in design.md
- **THEN** every product claim on the page appears in that table, and none of the forbidden items appear

### Requirement: Scroll-driven chapters
Each chapter SHALL be driven by its own scroll progress (0 when the section top reaches 60% of the viewport, 1 when its bottom does), using GSAP ScrollTrigger with Lenis smooth scrolling:
- **ch1:** the trail line draws and a marker follows it; distance and heart rate count up.
- **ch2:** the letters "TRƯỢT" tumble, the acceleration line draws, and the "CÓ THỂ ĐÃ NGÃ" flag appears past 38%.
- **ch3:** the 20 s ring and the seconds count down; at 0 the label reads "ĐANG GỬI CẢNH BÁO".
- **ch4:** the SOS terminal types out, and the three recipient chips light up in turn.
- **Every section:** it fades and rises 48px into view.

#### Scenario: Reduced motion
- **WHEN** `prefers-reduced-motion: reduce` is set
- **THEN** Lenis, the scroll scrubs and the Three.js scene are not started, and every chapter shows its static end state

### Requirement: Hero 3D terrain
The hero background SHALL be a Three.js low-poly terrain in the olive palette, reacting to mouse position and scroll. When WebGL is unavailable or motion is reduced, the two SVG ridge layers SHALL be shown instead.

#### Scenario: No WebGL
- **WHEN** a WebGL context cannot be created
- **THEN** the SVG ridges render and the page has no console error

### Requirement: Palette and brand
The page SHALL use the dark palette in design.md, built from `#8B2626`, `#EF6905`, `#F1E5A1` and `#486C2F`, with every text pair at WCAG AA or better. The page SHALL NOT display the `SG.svg` logo; the brand appears only as the text wordmark "Seize Guard".

#### Scenario: Contrast
- **WHEN** text colors are checked against their backgrounds
- **THEN** body text is at least 4.5:1, and large display text is at least 3:1

### Requirement: Accessibility
The page SHALL meet WCAG 2.2 AA:
- interactive targets 44×44px or larger, with visible focus;
- one `h1`;
- decorative SVG and canvas marked `aria-hidden`;
- informative SVG given a `role="img"` label;
- no horizontal scroll at 320px.

#### Scenario: Keyboard
- **WHEN** a keyboard user tabs through the page
- **THEN** every link and button receives a visible focus ring, and anchor links scroll to their section
