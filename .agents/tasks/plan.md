# Implementation Plan — Tessera Sathorn

Project name (final, use verbatim): **Tessera Sathorn**. A web search found no real Bangkok project with this name.
Project root: `c:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn` (ABSOLUTE paths only, Windows cmd). Never touch `c:\Users\dusitm\Desktop\Test-Kiro\checkers.py` or anything outside the project root. This is not a git repo, so make no commits.
Content source of truth: `c:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\PRODUCT.md`. Read it first. Chapter copy and facts are verbatim from there.

Environment notes:
- The user's permission rules deny shell commands that start with `node `. Use `npm` / `npx` (e.g. `npm.cmd run build`) and do not call `node` directly.
- `npm view` output could not be captured during planning, so versions below are baselines. At install time, run `npm view <pkg> version` and pin whatever resolves EXACTLY (no `^`/`~`). If lookup fails, use the baselines.

## Design decisions

- **Vanilla JS (ES modules) + Vite, no TypeScript.** A static marketing site with one scene doesn't need a type build step, and fewer tools means fewer failure points. JSDoc covers the key shapes.
- **No GSAP.** A small custom scroll mapper (sticky canvas + scroll progress → damped camera) does the job, keeps dependencies at three plus fonts, and is simple to make reduced-motion aware.
- **Self-hosted fonts via @fontsource.** No external requests, and fonts render deterministically in Playwright.
- **Scene composition.** One scene in metres. Chapters 1→2 (street → lobby) is a continuous camera path. 2→3 is a short "lift" cross-fade through ink with a mono caption "Level 34", during which the exterior tower group is hidden and the level-34 interior set shown. 3→4 (living → balcony) is continuous again. This avoids camera-through-geometry clipping without modelling a full tower interior.
- **Determinism.** All randomness (skyline, lit windows) uses a seeded PRNG (mulberry32, fixed seed) so screenshots are stable.
- **Test hooks.** `document.documentElement.dataset.sceneReady = "true"` after the first rendered frame (or after the fallback renders). `?nowebgl` forces the fallback. `window.__tessera.goToChapter(i)` jumps instantly. Later Playwright steps rely on these.

## Design tokens (implement in `src/styles/tokens.css`)

Colour (contrast measured against paper unless noted):
- `--paper: #F4F1EA` (background)
- `--paper-2: #EAE6DC` (alternate band background, no borders-in-borders)
- `--ink: #1A1A17` (primary text, ~16:1)
- `--ink-2: #4A4A43` (secondary text, ~8:1)
- `--olive: #4F5A2A` (single accent: links, active chapter, primary button bg with paper text, ~6.6:1)
- `--olive-ink: #3B4420` (hover/pressed)
- `--rule: #CFC9BC` (hairlines, non-text only)
- `--error: #9E2A1F` (form errors, ≥ 7:1)
- Dark band (story overlay, footer): bg `--ink`, text `--paper`, secondary `#B9B4A7` (≥ 7:1 on ink), accent on dark `#A9B77A` (olive-light, ≥ 7:1 on ink).
- Forbidden: purple or blue gradients in the UI. The 3D dusk sky is a muted slate→amber gradient (`#2B3138` → `#C98B5A`) with no purple.

Type (IBM Plex Sans 400/500/600, Plex Mono 400/500). Modular scale 1.25, base 17px:
- `--fs-xs: 13px` (mono labels, uppercase, letter-spacing .08em)
- `--fs-sm: 14px`, `--fs-base: 17px` (line-height 1.6), `--fs-md: 21px`, `--fs-lg: 27px`, `--fs-xl: 34px`, `--fs-2xl: 43px`, `--fs-3xl: 54px`, `--fs-display: 68px` (line-height 1.05, weight 500, letter-spacing -0.01em)
- At ≥1800px viewport, scale display/3xl by 1.15 via `clamp()`.
- Numbers, areas, prices and specs use Plex Mono with `font-variant-numeric: tabular-nums`.

Spacing (4px base): `--s-1:4 --s-2:8 --s-3:12 --s-4:16 --s-5:24 --s-6:32 --s-7:48 --s-8:64 --s-9:96 --s-10:128 --s-11:192` (px).
Layout: 12-column grid, 24px gutter, content max-width 1280px, side margins 80px at 1440 and 64px at 1280. Section vertical padding `--s-10`. Border radius 2px max (architectural; no rounded "cards"). Focus ring `outline: 2px solid var(--olive); outline-offset: 3px` (on dark: `#A9B77A`).

## File layout

```
tessera-sathorn/
  package.json  .npmrc (save-exact=true)  vite.config.js  playwright.config.js  vitest.config.js
  index.html
  public/favicon.svg                     # tessera mark
  src/main.js                            # boot: fonts/css, UI modules, scene or fallback
  src/content/facts.js                   # all facts, unit types, chapters (from PRODUCT.md)
  src/styles/tokens.css base.css layout.css sections.css
  src/lib/prng.js                        # mulberry32
  src/lib/scroll-progress.js             # pure fn: scrollY → {chapterIndex, t}
  src/scene/index.js                     # createScene(canvas, opts) → {goToChapter, setProgress, dispose}
  src/scene/webgl-support.js
  src/scene/materials.js lighting.js camera-rig.js
  src/scene/sets/exterior.js lobby.js residence.js skyline.js ground.js
  src/scene/fallback.js                  # inserts static SVG fallback
  src/ui/chapter-nav.js story.js residences.js booking-form.js nav.js
  src/ui/floorplans.js                   # SVG plan generators per type
  src/ui/location-map.js                 # SVG map
  src/ui/icons.js                        # SVG line icons (1.5px stroke, 24px grid)
  src/lib/validate.js                    # pure form validation
  tests/unit/*.test.js                   # vitest
  tests/e2e/*.spec.js                    # playwright
```

## Ordered items

- [ ] 1. Scaffold the project with exact-pinned dependencies.
      Create `package.json` (`"type":"module"`, name `tessera-sathorn`, `private:true`) with scripts: `dev: vite`, `build: vite build`, `preview: vite preview --port 4173 --strictPort`, `test:unit: vitest run`, `test:e2e: playwright test`. Add `.npmrc` with `save-exact=true`. Install with `npm install --save-exact`: deps `three` (baseline 0.171.0), `@fontsource/ibm-plex-sans` (5.1.1), `@fontsource/ibm-plex-mono` (5.1.1). devDeps `vite` (6.0.7), `vitest` (2.1.8), `@playwright/test` (1.49.1), `@axe-core/playwright` (4.10.1). Confirm no `^`/`~` in package.json. Write a minimal `index.html` + `src/main.js` that imports the CSS.
      Files: package.json, .npmrc, vite.config.js (base `./`), index.html, src/main.js, src/styles/*.css (tokens filled in per above)
      Verify: `npm.cmd run build` (cwd project root) succeeds and creates `dist/index.html`.

- [ ] 2. Content module and page skeleton with real copy.
      `src/content/facts.js` exports `PROJECT`, `UNITS` (id, label, bedrooms, sqm, priceLabel, floors, note), `CHAPTERS` (id, title, lede, specs[{label,value}]), `AMENITIES`, `DISTANCES`, all verbatim from PRODUCT.md. Build the semantic `index.html` skeleton:
      - skip link "Skip to content" → `#main`
      - `<header>`: inline SVG logo (four-tile square, one tile olive) + wordmark "TESSERA SATHORN", with `<nav aria-label="Primary">` links Residence (#story), Residences (#residences), Amenities (#amenities), Location (#location), and a primary button-link "Book a viewing" (#booking)
      - `<main id="main">` sections: `#story`, `#overview` (a short statement plus a mono key-figures row: 42 storeys · 168 residences · Freehold · Q4 2028, as one ruled row, not cards), `#residences`, `#amenities`, `#location`, `#booking`
      - `<footer>` with the verbatim note "Concept demonstration. Tessera Sathorn is a fictional project." and "Design: design studio". No invented phone numbers or emails.
      Section heads use a mono index label ("02 / Residences") + a Sans heading. Vary the section layouts (split, full-bleed table, asymmetric map) so no "hero + 3 cards" pattern appears.
      Files: src/content/facts.js, index.html, src/styles/layout.css, sections.css, src/ui/nav.js (current-section highlighting via IntersectionObserver, `aria-current="true"`)
      Verify: `npm.cmd run build` passes. `npm.cmd run dev` page shows all sections with real copy and no console errors (checked again in item 9).

- [ ] 3. Pure logic modules + unit tests (testing infrastructure).
      `src/lib/prng.js` (mulberry32). `src/lib/scroll-progress.js`: `mapScroll(scrollTop, storyTop, storyHeight, viewportH, chapterCount=4)` → `{progress 0..chapterCount-1, chapterIndex, local t}`, with each chapter getting a 35% hold zone before its transition. `src/lib/validate.js`: `validateBooking(values)` → `{field: message}`. Rules: name required (2–80 chars); email RFC-lite regex; phone optional-format `+` and digits/spaces/dashes, 8–16 digits, required; unit type one of UNITS ids; date required, ≥ tomorrow, ≤ 180 days ahead. Messages are short, e.g. "Enter your full name.", "Enter a valid email address.", "Choose a date from tomorrow onward."
      Files: src/lib/*.js, vitest.config.js (environment node, include tests/unit), tests/unit/prng.test.js, scroll-progress.test.js, validate.test.js
      Verify: `npm.cmd run test:unit`, all tests pass.

- [ ] 4. Scene core: renderer, lighting, camera rig, WebGL fallback.
      `webgl-support.js` returns false if `?nowebgl` is set or context creation fails. `fallback.js` replaces the canvas with an inline SVG: a line-drawn tower elevation over a dusk skyline silhouette in paper/ink/olive, with `role="img"` + `aria-label`. `scene/index.js`:
      - WebGLRenderer(antialias, `setPixelRatio(Math.min(devicePixelRatio, 2))`), sRGB output, ACESFilmic tone mapping, PCFSoft shadows
      - resize via ResizeObserver
      - render loop runs only while the canvas is intersecting (IntersectionObserver) and `document.visibilityState === "visible"`
      - `lighting.js`: HemisphereLight (sky `#C9CFD3`, ground `#3A3428`, 0.6), a low warm DirectionalLight from the west (`#E9A86B`) with a shadow map of 2048 and a tight frustum, `scene.fog = new Fog(...)` with colour lerped per chapter, and a sky dome sphere (BackSide ShaderMaterial vertical gradient slate→amber)
      - `camera-rig.js`: PerspectiveCamera fov 40. Keyframes per chapter `{pos, target, fov}`. Segments 1→2 and 3→4 interpolate on a CatmullRomCurve3 with smoothstep easing. Segment 2→3 drives a DOM ink overlay opacity (0→1→0) and swaps set visibility at the midpoint. Per-frame damping `1 - exp(-dt*5)`.
      - Set `dataset.sceneReady="true"` after the first frame, and expose `window.__tessera = { goToChapter(i), chapter }`.
      Files: src/scene/index.js, webgl-support.js, fallback.js, lighting.js, camera-rig.js, materials.js (shared palette: concrete `#BDB7AA`, bronze glass with transmission off, opacity 0.35, metalness 0.6; travertine `#D8CDB8`; oak `#9C7A55`; ink metal `#2A2A26`; olive fabric `#5B6634`)
      Verify: `npm.cmd run build` passes. `npm.cmd run test:unit` still passes.

- [ ] 5. Procedural sets: exterior tower, ground, lobby, level-34 residence, instanced skyline.
      - `exterior.js`: tower 30×26 m footprint, 42 slabs at 3.5 m (148 m total). Facade is vertical fluted fins (InstancedMesh of thin boxes) plus bronze glazing planes. Crown is set back at 41–42. Garden court with low planters (boxes), a 7.2 m double-height glass entrance at ground on the south face facing Sathorn Road.
      - `ground.js`: road strip, pavement, river plane to the west (MeshStandardMaterial roughness 0.2, colour `#3E4A4A`), park plane to the north-east (`#55603A`).
      - `lobby.js`: interior behind the entrance with travertine floor, oak slat wall (InstancedMesh), two lift cores, a low bench.
      - `residence.js` (hidden until the lift swap; positioned at y = 34×3.5): living room ~7.5×6 m, ceiling 3.1 m, oak floor, sofa/table/rug as simple boxes in olive/ink, full-height west glazing with thin mullions, sliding door to a 2.4 m deep balcony with a low-iron glass balustrade.
      - `skyline.js`: ~700 InstancedMesh boxes on a seeded ring (r 180–1200 m, excluding the river corridor), heights 20–220 m. Windows use one deterministic CanvasTexture used as `emissiveMap` with emissive `#F2C98A`, intensity raised in chapter 4. Per-instance colour via `setColorAt`.
      All geometry is merged or instanced where repeated, with `castShadow` only on the tower, lobby and residence furniture. Camera keyframes: ch1 street level SE looking up at the tower; ch2 inside the lobby at 1.7 m; ch3 inside the living room looking west; ch4 on the balcony edge looking west over the skyline.
      Files: src/scene/sets/*.js, src/scene/index.js (assemble)
      Verify: `npm.cmd run build` passes. In `npm.cmd run dev`, each chapter renders with no console errors (Playwright confirms in item 9). Draw calls under ~150 (log `renderer.info.render.calls` in dev only).

- [ ] 6. Story section UI: sticky canvas, editorial annotations, chapter navigation, reduced motion.
      `#story` is 400vh tall. Inside it, a `position: sticky; top:0; height:100vh` stage holds the canvas (`role="img"`, `aria-label="3D walkthrough of a Tessera Sathorn residence"`, `aria-describedby="story-desc"`). Left column (5 of 12 cols) is a paper panel over a subtle paper gradient scrim (no glassmorphism). It shows the current chapter's mono index "01 / 04", title, lede, and a spec list `<dl>` in Mono with hairline rules. All 4 chapters exist in the DOM as `<article>`s; the inactive ones are hidden with `hidden` for AT. `#story-desc` is a visually-hidden paragraph per chapter describing the view (e.g. "Street view of a 42-storey tower with vertical concrete fins and bronze glass at dusk.").
      Chapter nav: `<nav aria-label="Chapters">` with 4 buttons (≥ 44×44, mono labels "01 Arrival" …), `aria-current="step"` on the active one. Left/Right/Up/Down arrows move between buttons when focused, with roving tabindex. Activating a button scrolls to that chapter's hold zone (smooth, or instant under reduced motion) and calls `goToChapter`. A polite `aria-live` region announces "Chapter 2 of 4: Lobby".
      `prefers-reduced-motion: reduce`: no damping or tweening, the camera snaps to the nearest chapter keyframe, the lift overlay is a plain cut, and smooth scrolling is off.
      Files: src/ui/story.js, src/ui/chapter-nav.js, index.html (#story markup), src/styles/sections.css
      Verify: `npm.cmd run build` and `npm.cmd run test:unit` pass.

- [ ] 7. Residences, floor plans, amenities, location map.
      - Residences: a semantic `<table>` (caption "Residence types", `<th scope>`) with columns Type · Interior · Floors · From. Mono numerals, right-aligned. Rows are 1BR (floors 5–33), 2BR (5–37), 3BR (14–40), Penthouse (41–42, "Price on request", duplex). Below it, an ARIA tabs widget (tablist of 4 types, arrow keys, Home/End) that shows `floorplans.js` SVGs.
      - Floor plans: drawn at a consistent 1 m = 8 px scale (penthouse shown as two levels side by side). Walls in ink at 3px, rooms labelled in Mono xs with sqm, olive marks the balcony, plus a north arrow and a 5 m scale bar. Each SVG has `role="img"` + `<title>` ("2 Bedroom floor plan, 96 sqm"). Room areas must sum to roughly the unit area.
      - Amenities: an asymmetric two-column editorial list, NOT cards. Rows: Level 38 Sky lounge · Level 38 35 m infinity pool · Level 12 Wellness floor · Level 3 Residents' library · Private lift lobby (3 Bedroom and Penthouse). Each row is a 24px SVG line icon (from `icons.js`, `aria-hidden`) + mono level + title + one line of copy.
      - Location: an inline stylized SVG map (`role="img"` with `<title>` + `<desc>`) in paper/ink/olive. It shows Sathorn Road, Rama IV Road, Narathiwat Ratchanakharin Road, the BTS Silom line with stations Surasak, Chong Nonsi and Sala Daeng, the Chao Phraya curve on the west, Lumphini Park as an olive-tint block to the north-east, and the site marker (tessera mark). Beside it, a mono distance list: BTS Chong Nonsi 350 m · Lumphini Park 1.9 km · Chao Phraya River 2.2 km. No map embeds.
      Files: src/ui/residences.js, floorplans.js, icons.js, location-map.js, index.html, sections.css
      Verify: `npm.cmd run build` passes. Add `tests/unit/floorplans.test.js` checking each generated SVG string has a `<title>` and room areas within ±10% of the unit sqm; `npm.cmd run test:unit` passes.

- [ ] 8. Booking form with validation and an accessible success state.
      Form heading "Book a private viewing". Fields: Full name, Email, Phone, Preferred residence (select from UNITS), Preferred date (`type=date`, min = tomorrow). Each has a visible `<label>`, `autocomplete` attrs, 48px tall inputs, and an error `<p id="err-x">` tied via `aria-describedby` (with the hint id where present) plus `aria-invalid`. Use `novalidate`, validate on submit with `validateBooking`, and focus the first invalid field. After the first submit, re-validate on blur/input. On success, hide the form and show a `role="status"` region with a focused heading (`tabindex="-1"`): "Thank you, {first name}. This is a demonstration, so nothing was sent." plus a "Book another viewing" button that resets the form. A note near the submit button reads "Demonstration only. No data leaves this page." Do not use fetch/XHR.
      Files: src/ui/booking-form.js, index.html, sections.css
      Verify: `npm.cmd run build` and `npm.cmd run test:unit` pass.

- [ ] 9. Playwright: smoke, a11y, keyboard, real-size screenshots.
      `playwright.config.js`: Chromium only, with projects `desktop-1440` (1440×900), `desktop-1920` (1920×1080) and `desktop-1280` (1280×800). `webServer: { command: "npm.cmd run build && npm.cmd run preview", port: 4173, reuseExistingServer: true }`. Launch args `--use-gl=swiftshader` / `--enable-unsafe-swiftshader` so WebGL works headless. Tests:
      - `smoke.spec.js`: no console errors; `html[data-scene-ready=true]` within 15 s; footer note text present; no "lorem" in the body text; `?nowebgl` shows the SVG fallback and no canvas.
      - `a11y.spec.js`: AxeBuilder with tags wcag2a, wcag2aa, wcag21aa, zero violations on the default page, the `?nowebgl` page, and the form error state.
      - `keyboard.spec.js`: first Tab focuses the skip link; arrow keys move between chapter buttons and update `aria-current`; residence tabs work with arrows; submitting an empty form puts focus on Full name with `aria-invalid=true`; a valid submit focuses the success heading; all buttons/links have bounding box ≥ 44×44 (excluding inline text links).
      - `screenshots.spec.js`: for each chapter (via `__tessera.goToChapter` + scroll), plus residences, amenities, location and booking, save viewport-size PNGs to `tests/screenshots/<project>/<name>.png`. Also run with `reducedMotion: "reduce"`.
      Run `npx.cmd playwright install chromium` first.
      Files: playwright.config.js, tests/e2e/*.spec.js
      Verify: `npm.cmd run test:e2e`, all specs pass in all 3 projects. Then open the screenshots and visually check layout at each size (no overlap, text not clipped, panel readable over the scene).

- [ ] 10. Critique and polish pass (impeccable principles, applied manually).
      Review the screenshots against this checklist and fix issues:
      - typographic hierarchy clear within 1 second per section
      - spacing only from the scale
      - one accent colour
      - no nested boxes or cards, and no repeated hero+3-cards
      - copy free of banned words and exclamation marks (grep `src` and `index.html` for the banned list in PRODUCT.md)
      - the 3D panel text stays legible over every chapter
      - the 1280×800 layout doesn't clip the story panel
      - fallback SVG looks intentional
      - single-column fallback under 900px is readable
      Re-run the full suite afterwards.
      Files: as needed
      Verify: `npm.cmd run build`, `npm.cmd run test:unit`, `npm.cmd run test:e2e` all pass; screenshots re-generated.

## A11y checklist (must all hold)
- [ ] All text AA (≥ 4.5:1, large ≥ 3:1). Text over the 3D scene sits on the opaque/scrimmed paper panel.
- [ ] Interactive targets ≥ 44×44 px. Visible `:focus-visible` ring on every control, including on dark bands.
- [ ] Skip link. Landmarks: header, nav (Primary, Chapters), main, footer. One h1 and an ordered heading tree.
- [ ] Chapter buttons + arrow keys. Canvas `role="img"` + aria-label + per-chapter text description. Live region announces chapter changes.
- [ ] Residence tabs follow the ARIA tabs pattern. The table has caption + scoped headers.
- [ ] Form: labels, autocomplete, `aria-invalid`, errors via `aria-describedby`, focus management on error and success, `role="status"` success.
- [ ] prefers-reduced-motion honoured (no camera tweening, no smooth scroll).
- [ ] WebGL-off fallback is a labelled SVG. axe reports zero violations.

## Finalize-step deliverables (not written now)
- `DESIGN.md`: brand idea (tessera mark), colour tokens with measured contrast ratios, type scale, spacing scale, grid, components (section head, spec list, chapter nav, table, tabs, form fields/errors/success, buttons, focus), 3D art direction (materials, lighting, fog, palette, camera chapters), motion and reduced-motion rules, forbidden patterns, and critique findings with the fixes applied.
- `README.md`: what it is (concept demo, fictional), the stack and pinned versions, commands (`npm.cmd install`, `npm.cmd run dev`, `build`, `test:unit`, `npx.cmd playwright install chromium`, `test:e2e`), test hooks (`?nowebgl`, `__tessera.goToChapter`, `data-scene-ready`), file layout, and known limits (desktop-first, no backend).

---

# 3D realism upgrade

User request (Thai): make the 3D models much more realistic, including tasteful furniture. The site already works and was APPROVED. This is an upgrade of `src\scene\**` only, plus copy sync and docs. It is NOT a rewrite: keep the scene API (`createScene` → `setProgress`, `jumpTo`, `goToChapter`, `dispose`), the 4-chapter camera structure (street → lobby continuous, ink "Level 34" lift cut, living → balcony continuous), the material keys used by the sets, and all UI/CSS/copy outside what is listed here.

Project root: `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn` (not a git repo, so make no commits). Never touch `C:\Users\dusitm\Desktop\Test-Kiro\checkers.py`.

## Commands (verified working in this environment)
- Use an UPPERCASE `C:` with `--prefix`. A lowercase `c:` makes vitest load twice and every suite fails. `cd` and any command starting with `node ` are blocked by permission rules.
- Build: `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run build`. Baseline scene chunk: `dist\assets\scene-*.js` 555 kB / 140 kB gzip.
- Unit: `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run test:unit`. Baseline: 4 files, 23 tests.
- E2E: `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run test:e2e`. Baseline: 42 tests across 3 projects. It uses the local full Chromium `chromium-1248` plus SwiftShader. Do NOT re-download headless-shell or change the launch config.
- Screenshots only: `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run shots`. This writes `screenshots\<project>\*.png` and mirrors them to `tests\screenshots\<project>\`.

## Hard constraints (must hold after every item)
1. `prefers-reduced-motion`: the camera snaps to chapter keyframes, with no tweening. Add no new animation (no swaying plants, no flicker). The scene stays static apart from camera moves.
2. `?nowebgl` shows the SVG fallback and no canvas. If `createScene` throws, it still falls back (main.js try/catch).
3. Keyboard chapter controls, the live region, the canvas `role="img"` + `aria-label` + `aria-describedby="story-desc"`, and the per-chapter `CHAPTERS[i].description` text alternatives all keep working. Rewrite the descriptions so they match the new scene accurately.
4. Text contrast is WCAG AA. Story text sits on the opaque paper panel, so a richer scene doesn't change its contrast. Add no text over the canvas without an opaque or scrimmed backing. axe must report zero violations.
5. No forbidden patterns: no purple-blue gradients (the sky stays slate→amber), no emoji, no cards in cards, no repeated hero+3 cards, no hype copy, no lorem. Chapter `lede` and `specs` stay verbatim from PRODUCT.md.
6. All randomness comes from `mulberry32` with fixed seeds, so screenshots stay deterministic.
7. Everything is procedural. The default is NO external assets: this machine's network is flaky and TLS fails, and procedural assets keep the bundle small. Never disable TLS verification. If an implementer still wants a CC0 asset, they get one attempt and must fall back to procedural on failure. The asset goes under `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\public\`, is credited in README.md, and must be under 1 MB.
8. Tests stay green: build, unit (23 existing + new), e2e (42 existing + new). Keep `playwright.config.js` unchanged.
9. Performance budget: ≤ 250 draw calls in any chapter pose. DPR cap 2 (already there). The render loop pauses offscreen (already there). The scene stays a lazy `import()` chunk. Scene chunk ≤ 680 kB raw / ≤ 175 kB gzip. `data-scene-ready` must arrive within the 20 s e2e timeout under SwiftShader.
10. Sets must not touch `document` in `materials.js`, `textures.js`, `furniture\*.js` or `residence.js`, so unit tests can build them in vitest's node environment. Only `exterior.js` and `skyline.js` keep their existing CanvasTextures.

## Design decisions (made here; do not re-decide)
- **Tone mapping: keep ACESFilmic**, exposure tuned in the 0.9–1.1 range per set (interior 1.0, exterior 0.95). The current look is warm, ACES fits it, and AgX would desaturate the amber dusk.
- **Shadows: keep `THREE.PCFShadowMap`** and set `sun.shadow.radius = 3` and `sun.shadow.blurSamples = 12`. In three 0.186, `PCFSoftShadowMap` is removed: `three.module.js` warns "PCFSoftShadowMap has been removed. Using PCFShadowMap instead." The warning would be console noise for no gain, so don't use it. VSM bleeds light through thin furniture. Bias: `shadow.bias = -0.0003`, `normalBias = 0.03`. Re-tune if acne or peter-panning shows. Only the sun casts shadows. Point lights never do: SwiftShader cost, and six cube shadow maps.
- **Environment lighting: two PMREM maps**, both generated at startup from a `PMREMGenerator`, with no downloads:
  - `envInterior` comes from `RoomEnvironment` (`three/addons/environments/RoomEnvironment.js`).
  - `envDusk` comes from `pmrem.fromScene()` of a small private scene holding the existing slate→amber sky shader sphere plus a bright sun disc.
  - `scene.environment` switches in `showSet()`: `envDusk` for exterior, `envInterior` for residence. `scene.environmentIntensity` is 0.6 exterior / 0.35 interior.
  - Outdoor reflective materials (tower glass, river, balcony glass, skyline glass) set `material.envMap = envDusk` explicitly, so they always reflect the dusk sky.
- **No post-processing (no EffectComposer, bloom or SMAA).** It would roughly double frame cost under SwiftShader, add about 30–50 kB, and the renderer already uses MSAA (`antialias: true`). "Glow" comes from emissive `MeshBasicMaterial` shades and LED strips with `toneMapped: false`, plus light falloff.
- **No glass transmission.** `MeshPhysicalMaterial.transmission` adds an extra opaque-scene render pass. Glass uses `MeshPhysicalMaterial` with `transparent`, tuned `opacity`, `roughness` 0.02–0.08, `envMap`, `ior` 1.5, `specularIntensity` 1, and `depthWrite: false`.
- **Procedural textures as `DataTexture`, generated by pure functions.** `src\scene\texture-data.js` holds pure, seeded functions that return `{ width, height, data: Uint8Array }`. `src\scene\textures.js` wraps them in `THREE.DataTexture` with `RepeatWrapping`, mipmaps, `anisotropy` 8, and sRGB only for colour maps. Pure functions can be unit-tested in node and keep `document` out of `materials.js`. Sizes: 1024² for oak floor and marble, 512² for everything else, about 12 textures, generated once and shared.
- **Contact shadows / AO: baked soft-shadow decals.** Each furniture builder can add a horizontal plane just above the floor. It uses one shared radial-gradient DataTexture (`MeshBasicMaterial`, `transparent`, `depthWrite: false`, black at about 0.45 opacity, `polygonOffset`). It is cheap, deterministic and works in SwiftShader. Real SSAO would need post-processing, which is excluded.
- **Geometry kit + batching.** `src\scene\geometry-kit.js` exports:
  - `roundedBox(w,h,d,r,segments=3)`, a cached `RoundedBoxGeometry` from `three/addons/geometries/RoundedBoxGeometry.js`
  - `lathe(points, segs)`
  - `tube(points, radius)`
  - `extrudeProfile(shape, depth, bevel)`
  - `cushion(w,h,d,sag)`, a rounded box with the top vertices displaced down by `sag·(1-(2x/w)²)(1-(2z/d)²)`, then `computeVertexNormals()`
  - a `Batcher` class: `add(geometry, material, matrix)` → `build()` returns one `Mesh` per material via `BufferGeometryUtils.mergeGeometries` (geometries are cloned, transformed, and attributes normalised to position/normal/uv)

  Every static set and furniture piece goes through a Batcher. Repeats (dining chairs, stools, books, fins, trees, street lamps, skyline) use `InstancedMesh`.
- **Equal point-light count per set (3 each).** Light count changes force a shader recompile on the lift swap. Lobby and residence each own exactly 3 `PointLight`s, and the exterior's lights live in the lobby group.
- **Lobby: no reception desk.** The verbatim lede is "with no front desk in the way", so a desk would contradict the copy. Use a low travertine console against the oak wall instead (sculpture + vase, no counter), plus lounge seating.
- **No bedroom glimpse.** The camera path never faces a bedroom door, so it would cost geometry for nothing visible.
- **River legibility: clear the sightline** (the root cause, see finding F2), make the water read, and lower the ch4 target slightly.
- **Dispose.** `createScene().dispose()` traverses the scene and disposes every geometry, material and texture (deduplicated with a `Set`), then disposes both PMREM targets and the `PMREMGenerator`.
- **Render-info hook.** The scene object gets `info()` → `{ calls, triangles }` from the last `renderer.info.render`. `window.__tessera.renderInfo()` passes it through (and returns `null` without WebGL). A new e2e test asserts `calls ≤ 250` for every chapter.

## Open review findings folded in
- **F1 stray cream plane (confirmed by reading code).** It is the floor-lamp shade `box(m.warmLight, 0.32, 0.22, 0.32, 0.9, 1.55, 1.75)` in `src\scene\sets\residence.js`. It sits at eye height (1.55 m), 2.2 m directly in front of the ch3 camera at local (3.1, 1.55, 1.7), so it fills the view as an unshaded `MeshBasicMaterial` rectangle. Fix: remove it. The new floor lamp stands in the south-west corner, outside the camera corridor, and a unit test enforces the keep-out corridor.
- **F2 river not legible from balcony (root cause found by reading code; final look needs verification during implementation).** The ch4 view ray already lands on the river: about 9° down from 120 m reaches the ground about 735 m west, inside the river at world x −910..−610. But skyline blocks between r 180 and 580 m to the west stand up to 220 m tall and block it. The river material (`#3E4A4A`, no env) is also as dark as the ground. Fix in `skyline.js` + `ground.js` + `camera-rig.js` (FEAT-002 / FEAT-003).
- **F3 amenity one-liners missing from PRODUCT.md (confirmed).** Copy the five `AMENITIES[].copy` strings from `src\content\facts.js` verbatim into PRODUCT.md. Also add the four updated scene descriptions, so PRODUCT.md stays the single source.
- **F4 DESIGN.md and README.md owed** → finalize step.

## Ordered items

- [ ] 1. **Rendering pipeline, textures, materials, geometry kit (foundation, FEAT-001).**
      - Add the pure texture generators in `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\texture-data.js`, seeded via `mulberry32`, using value noise + fbm helpers:
        - `oakPlanks(1024)`: 180 mm planks, staggered ends, per-plank tone variation, grain streaks, a roughness channel in alpha
        - `walnut(512)`
        - `marble(1024)`: warm white with grey-olive veins via domain-warped fbm
        - `travertine(512)`: banded beige with pores
        - `linen(512)` / `boucle(512)`: luminance for roughness/bump
        - `concrete(512)`, `brushedMetal(512)` (horizontal streaks), `woolRug(512)` (tight loop noise + border band in olive/paper)
        - `waterNormal(512)`: tiling ripple normal map
        - `contactShadow(128)`: radial falloff alpha
        - `interiorWindows` stays a CanvasTexture in exterior.js
      - `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\textures.js` wraps them as cached DataTextures. Set colour maps to `SRGBColorSpace`; roughness/bump/normal maps stay `NoColorSpace`.
      - Rewrite `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\materials.js`. Keep every existing key (`concrete`, `concreteDark`, `glass`, `lowIron`, `travertine`, `oak`, `oakDark`, `inkMetal`, `oliveFabric`, `plaster`, `stone`, `planting`, `paving`, `court`, `road`, `river`, `warmLight`) so the current sets still build. Upgrade them to textured `MeshStandardMaterial` / `MeshPhysicalMaterial`. Add `walnut`, `marble`, `brass` (metalness 1, roughness 0.32, brushed roughnessMap), `bronze`, `linenOlive`, `linenPaper`, `boucle`, `leather` (cognac `#7A4A2A`, roughness 0.55), `wool`, `ceramic` (paper glaze, roughness 0.25, clearcoat 0.3), `smokedGlass`, `leaf` (`#55603A`, DoubleSide), `soil`, `ledStrip` (MeshBasic `#FFD9A8`, toneMapped false), `shadowDecal`. Return `{ ...materials, dispose() }`.
      - Add `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\geometry-kit.js` (roundedBox, lathe, tube, extrudeProfile, cushion, Batcher, contactShadow(w,d) plane helper).
      - Update `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\lighting.js`:
        - PCFShadowMap with radius/blurSamples, sun shadow mapSize stays 2048
        - build `envDusk` from a private sky scene via PMREM, and `envInterior` from RoomEnvironment
        - export `setEnvironment(set)`
        - keep `setFocus`/`setTime`/`follow`
        - tune hemi to 0.35 (env now provides fill)
      - Update `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\index.js`:
        - pass the renderer into lighting for PMREM
        - per-set exposure and env in `showSet`
        - `info()`; full `dispose()`
        - keep the dev draw-call log, now logged per chapter on change
      - In `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\ui\story.js`, add `renderInfo()` to `window.__tessera`.
      Files: the six paths above, plus new `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\tests\unit\texture-data.test.js` (each generator: correct length `w*h*4`; deterministic, same seed gives identical bytes; values not all equal; oak alpha/roughness within 0.35–0.8×255) and `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\tests\unit\geometry-kit.test.js` (Batcher merges N boxes of one material into 1 mesh, and vertex count equals the sum; cushion top centre is lower than its corners by ≈ sag).
      Verify: build passes, and report the scene chunk size. Unit: 23 old + new tests pass. E2E: 42 pass (the scene looks similar but with textures and env light).

- [ ] 2. **Chapter 1 exterior + city + river, and chapter 2 lobby (FEAT-002).** Depends on item 1.
      - **Exterior**, `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\sets\exterior.js`:
        - Fins: replace box fins with a fluted fin profile (`extrudeProfile` of a 0.28×0.7 m shape with two 40 mm flutes and a 15 mm bevel), still one InstancedMesh per face set.
        - Slabs: slab edges become bevelled `roundedBox` instances with a 0.12 m drip shadow line (a thin dark instance under each slab).
        - Glazing: split into per-floor glazing bands with a 1.5 m mullion rhythm drawn into the emissive interior texture. Keep the CanvasTexture and add curtain tones plus 3 brightness tiers. Tower glass becomes `MeshPhysicalMaterial` (bronze `#6B5A45`, opacity 0.45, roughness 0.05, metalness 0.2, envMap envDusk).
        - Amenity bands: add recessed amenity bands at level 12 (wellness) and level 38 (sky lounge). These are 1 m set-back glass with warm interior glow, plus a thin pool-edge LED line at 38.
        - Crown: louvres from `extrudeProfile`, and a parapet cap.
        - Podium: travertine-clad (`m.travertine`) with 0.6 m panel joints in the texture repeat.
        - Entrance: the canopy becomes a 14×4 m cantilever, `roundedBox` 0.35 thick, with a bronze fascia and 6 emissive soffit downlights (instanced discs).
        - Garden court: lawn panels, clipped hedges (`roundedBox`, `m.planting`), and a 12×3 m reflecting pool (dark water, envDusk).
        - Trees: 8 instanced trees with a tapered `tube` trunk plus a canopy of 5 jittered icosahedra merged into one geometry (vertex jitter seeded), one InstancedMesh for canopies and one for trunks.
        - 10 bollard lights along the court path, instanced.
      - **Ground**, `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\sets\ground.js`:
        - Road: road surface textured (asphalt noise), kerbs as instanced roundedBoxes, a 3 m footpath with paving texture.
        - Street lamps: 30 instanced lamps along Sathorn Road (tube pole + emissive head).
        - River: the river plane uses a new material: colour `#5C6B69`, roughness 0.06, metalness 0, `normalMap` waterNormal (repeat 40×800, normalScale 0.35), `envMap` envDusk, `envMapIntensity` 1.3.
        - River banks: add 6 m embankment strips on both banks (`m.concrete`) and an instanced row of promenade lights (emissive, 12 m spacing, both banks, ±1500 m).
      - **Skyline**, `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\sets\skyline.js`:
        - River sightline: keep the existing river corridor exclusion. ADD a west-view wedge for blocks with world `x < -100` and `|z| < 0.5·|x|`, measuring `d = sqrt(x²+z²)`. Skip the block if `d > 540`. Otherwise clamp its height `h = min(h, max(8, 96·(1 - d/600)))`. This keeps every rooftop under the balcony→river sightline (camera about 120 m up, river near bank at 610 m).
        - Building variety: use 2 building geometries (a plain box, and a box with a 70 % setback top tier merged in). Split the instance list between them, so there are 2 InstancedMeshes and still about 700 blocks.
        - Window texture: 2× resolution with mullion lines.
        - Facades: add `roughness` 0.6, `metalness` 0.1 and envMap envDusk on the facade material, so facades pick up sky.
      - **Lobby**, `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\sets\lobby.js`. Keep the travertine floor, oak slat wall, two lift cores and bench, and refine them:
        - floor: book-matched travertine tile texture (1.2 m tiles)
        - oak slats: rounded-profile slats, still instanced
        - LED cove: the cove becomes a recessed `ledStrip` in a plaster bulkhead
        - lift cores: travertine-clad, with bronze portal frames (`extrudeProfile`) and brushed bronze doors split in two leaves
        - ceiling: a coffered ceiling grid (instanced roundedBox beams) with 12 instanced emissive downlights
        - pendant: a sculptural pendant over the lounge, 9 LatheGeometry hand-blown globes (`smokedGlass` + inner emissive core) on brass rods (`tube`), merged by Batcher
        - lounge group: lounge group on a 3.6×2.6 m wool rug, made of two boucle lounge chairs (cushion seat + curved back via `extrudeProfile`), a 2.4 m olive linen sofa (separate seat/back cushions via `cushion`), and a round travertine drum table (`lathe`)
        - planters: two large travertine planters (`lathe`) holding olive trees (tube trunk + leaf clusters)
        - console: a low travertine console on the oak wall with a ceramic vessel (`lathe`), NOT a reception desk
        - shadows: contact-shadow decals under all furniture
        - lights: exactly 3 PointLights
      - Batch all static lobby/exterior meshes per material.
      - The lobby furniture builders go in the shared library, which item 3 extends:
        - `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\furniture\seating.js`: `modularSofa`, `boucleChair`
        - `tables.js`: `drumTable`
        - `decor.js`: `rug`, `vase`, `plantedTree`
        - `lighting.js`: `globePendant`
      Files: the four set files, plus `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\index.js` if the `towerGlow` lookup changes (it currently finds the first child with an `emissiveMap`; replace it with an explicit `exterior.userData.glowMaterials` array).
      Verify:
      - Build passes and the chunk stays within budget.
      - Unit tests pass.
      - Add `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\tests\unit\skyline-sightline.test.js`. Export a pure `placeBlocks(rand)` from skyline.js, keeping three's math only and no document, and assert that every block in the west wedge stays below the sightline.
      - Run `run shots` and open `screenshots\desktop-1440\chapter-01-arrival.png` and `chapter-02-lobby.png`. Confirm fins, canopy, trees and the lobby furniture read, and that nothing is floating or clipped.

- [ ] 3. **Chapter 3 living room + chapter 4 balcony (FEAT-003).** Depends on item 1. It is independent of item 2 except for shared files `index.js` / `camera-rig.js`.
      - Create the furniture builders, each returning a `THREE.Group` that is batched internally and sits on y=0 with a contact-shadow decal: `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\furniture\` containing:
        - `seating.js`:
          - `modularSofa` (3 seat + 3 back cushions with sag, plinth base, arm bolsters)
          - `loungeChair` (cognac leather sling on a brass `tube` frame)
          - `diningChair` (walnut frame + linen seat, as a geometry for instancing)
          - `barStool` (brass ring + walnut seat)
          - `outdoorLounger` (teak slats + olive cushion)
        - `tables.js`:
          - `marbleCoffeeTable` (rounded-rectangle `extrudeProfile` top 1.3×0.8, 40 mm bevel, on a recessed plinth)
          - `sideTable` (travertine drum)
          - `diningTable` (walnut 2.2×1.0 with tapered legs)
          - `kitchenIsland` (walnut base with marble waterfall top)
          - `outdoorLowTable`
        - `lighting.js`:
          - `floorLamp` (arc of `tube` brass + linen shade via `lathe`, shade emissive interior)
          - `pendant` (lathe dome in brass/ceramic + emissive disc)
          - `linearPendant` (for dining)
        - `decor.js`:
          - `rug` (wool texture, 3.2×2.4)
          - `books` (InstancedMesh of varied spines in paper/ink/olive/rust)
          - `vase` (lathe ceramic, 3 profiles)
          - `artFrame` (walnut frame, 40 mm, with an abstract canvas: a DataTexture of three olive/ink/paper tessera blocks, no text)
          - `plant` (lathe planter + procedural leaves: seeded instanced leaf quads with a curved leaf geometry on stems, about 120 leaves)
          - `sheerCurtain` (wavy `PlaneGeometry` displaced by a sine of x, linenPaper at opacity 0.55, DoubleSide)
          - `mediaConsole` (walnut, fluted front via `extrudeProfile`, brass pulls)
      - Rebuild `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\sets\residence.js` with the same `RESIDENCE_ORIGIN`, room bounds (x −3.75..3.85, z −3.1..3.1, H 3.1), glazing line x −3.75 and balcony (2.4 m deep).
      - **Architecture:**
        - engineered oak floor (oakPlanks, repeat so planks are 180 mm)
        - 90 mm walnut skirting
        - plaster walls
        - a 300 mm perimeter ceiling cove on the east/south/north walls with a hidden `ledStrip`
        - 6 recessed downlights (instanced emissive discs)
        - full-height glazing in slim bronze frames (`extrudeProfile` mullions 50×120), a sliding door in its track, open at z −0.5..1.7 as now
        - a door frame + flush walnut door on the south wall at x 3.0
        - a kitchen run along the north wall x 0.8..3.7: walnut base units, a marble backsplash, tall cabinets, and a brass tap
      - **Layout** (local centres, sofa facing north, camera looking west):

        | Item | Placement |
        |---|---|
        | rug | (−0.7, 0, 1.4), 3.2×2.4 |
        | modular sofa | along the south wall, x −2.4..0.6, z 2.3..3.0, facing −z |
        | marble coffee table | (−0.9, 0, 1.4) |
        | side table | (0.9, 0, 2.6) |
        | lounge armchair | (−1.9, 0, 0.2), facing south-east |
        | floor lamp | (−3.2, 0, 2.7), shade head at y 1.75, z ≥ 2.2 |
        | art frame | 1.4×1.0 on the south wall above the sofa, centre (−0.9, 1.75, 3.0) |
        | media console | south wall x 1.2..2.5 (books, 2 vases on top) |
        | dining table | (−1.9, 0, −2.0), long axis x, 6 chairs as an InstancedMesh (2 per long side + 1 at each end, end chair x ≥ −3.25), linear pendant at y 2.25 |
        | kitchen island | (2.3, 0, −1.3), 2.4×0.95, marble top, 3 bar stools on its south side, 2 pendants at y 2.2 |
        | potted plants | 2 (a fiddle-leaf style at (−3.3, 0, −0.9), a smaller one on the console) |
        | sheer curtains | stacked at both ends of the glazing (z −3.0..−2.3 and 2.2..3.0) |
        | point lights | exactly 3: a floor-lamp glow, a dining pendant, and a living fill at (1.0, 2.7, 0.5) |

      - **Keep-out corridor (prevents F1 recurring):** no mesh other than floor, rug, ceiling, walls and glazing may come within 1.2 m of the ch3 and ch4 keyframe positions. Nothing taller than y 0.9 may sit within 0.6 m (XZ) of the `path23` samples. Delete the old lamp shade box (F1).
      - **Balcony:**
        - stone deck (travertine texture, 600 mm tiles)
        - slab edge with drip line
        - soffit with 4 recessed downlights
        - the side walls become fluted concrete fins matching the tower
        - frameless low-iron glass balustrade panels (5 × 1.16 m, `smokedGlass`-like low-iron physical material, envDusk) on brushed-bronze shoe + standoffs, with a 50 mm round bronze cap rail (`tube`) at 1.1 m
        - 2 outdoor loungers at (−4.6, 0, −2.1) and (−5.4, 0, −2.1) facing west
        - an outdoor low table between them
        - 2 concrete trough planters with grasses (instanced blades) at z 2.4..2.9
      - **Camera** (`C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\scene\camera-rig.js`):
        - keep the ch3 position, and set the target to R(−6, 1.15, −0.2) so the dining corner and sofa both frame
        - ch4 target goes from R(−60, −9, −9) to R(−60, −11, −4), slightly lower and more on-axis to the river
        - adjust the `path23` midpoints only if the keep-out test fails
        - do not move ch1/ch2
      - **Tests:** add `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\tests\unit\residence-layout.test.js`:
        - build `createResidence(createMaterials())` in node
        - sample `createCameraRig(RESIDENCE_ORIGIN).poseAt(p)` for p in 2..3 (step 0.05)
        - assert the keep-out rules via `Box3.setFromObject` on each furniture group (tagged `userData.furniture = true`)
        - assert every furniture group's bbox min y is within ±0.02 m of 0 (floor) or the object is tagged `userData.mount = 'wall' | 'ceiling'` and touches the wall/ceiling plane (no floating objects)
      Files: the furniture dir (4 new files: seating.js, tables.js, lighting.js, decor.js), residence.js, camera-rig.js, the new unit test.
      Verify:
      - Build passes and the chunk stays within budget.
      - Unit tests pass, including residence-layout.
      - Run `run shots` and open `screenshots\desktop-1440\chapter-03-living-room.png`, `screenshots\desktop-1920\chapter-03-living-room.png` and `screenshots\desktop-1440\chapter-04-balcony.png`. Confirm:
        - no floating cream plane
        - the sofa/table/dining/kitchen read as furniture with materials
        - the river is visible as a lighter reflective band beyond lower blocks (**needs verification during implementation**: if it is still hard to read, raise `envMapIntensity` or lower the wedge cap, and keep the sky colours)

- [ ] 4. **Text alternatives, PRODUCT.md sync, perf test, visual pass (FEAT-004).** Depends on items 2 and 3.
      - **Descriptions:** rewrite `CHAPTERS[].description` in `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\src\content\facts.js` to match the scene. Each is one or two plain sentences with no hype. Do not change ledes/specs. Example for living: "A level 34 living room facing west: oak floor, an olive linen sofa, a marble coffee table on a wool rug, a walnut dining table for six and a kitchen island, with full-height glazing over the city."
      - **PRODUCT.md:** in `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\PRODUCT.md`, add a "Amenity copy (verbatim)" list with the five `AMENITIES` one-liners (F3) and a "3D scene descriptions" list with the four descriptions.
      - **Perf test:** add a `renderInfo` e2e test in `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\tests\e2e\smoke.spec.js`: for chapters 0..3, call `goToChapter(i)`, wait 300 ms, and assert `window.__tessera.renderInfo().calls <= 250`. Also assert `renderInfo()` returns null under `?nowebgl`.
      - **Visual pass:**
        - Regenerate screenshots (`run shots`) and open all 4 chapters at 1280/1440/1920 plus the `-reduced` versions.
        - Check: no floating or clipped geometry, no z-fighting, no shadow acne, no blown-out emissives, the river reads, the panel stays readable, and nothing purple.
        - Fix issues in the set files.
      - **Report:** record the scene chunk raw/gzip before (555/140 kB) and after, the draw calls per chapter, and the triangle counts in `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\.agents\tasks\verification.md` under a new "3D realism upgrade" section.
      Verify: build, unit (all) and e2e (42 + new) all pass. axe still has zero violations (it is part of e2e).

- [ ] 5. **Finalize (after the review loop approves).**
      - **Critique/polish:** do a critique/polish pass using impeccable principles against the screenshots and record the findings + fixes in DESIGN.md.
      - **DESIGN.md:** write `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\DESIGN.md` per the earlier "Finalize-step deliverables" list. Its 3D art direction section covers the materials library, lighting/env/exposure, the furniture list, the performance budget and measured numbers.
      - **README.md:** write `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\README.md`. Include the commands with the uppercase-`C:` `--prefix` note, test hooks including `renderInfo()`, and "all 3D assets procedural, no external assets" (or a CC0 credit if any external asset was added).
      - **.gitignore:** create `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\.gitignore` with `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `*.log`.
      - **Cleanup:** delete `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\test-results\` and the scratch logs in the project root (`build.log`, `e2e.log`, `install.log`, `ls.log`, `preview.log`, `pwinstall.log`, `unit.log`). The user asked earlier to remove unneeded files. Keep `screenshots\` and `tests\screenshots\`.
      Verify: build, unit and e2e all pass once more. Then delete `test-results\` again, since e2e recreates it.

---

# A+B presentation redesign

User request (Thai, verbatim intent): the cream box beside the tower looks odd. Redesign the presentation so it looks professional and matches what the world's best property sites do. The user chose **A + B**:
- **A**: a cinematic full-bleed walkthrough
- **B**: an interactive Tower Explorer

This is a redesign of the presentation layer on the existing, working site. It is NOT a rewrite. Reuse the scene sets, materials, furniture, camera rig, content, floor plans, booking form and tests. Update tests only where the UI legitimately changes.

The existing implement-and-review loop implements this section. The workflow tail was not restructured. The review gate is unchanged: `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\.agents\tasks\review.json`, and the loop stops when its top-level `"verdict"` is `"APPROVED"`.

## Constraints (restated, must hold after every item)
- **Project root:** `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn`. Use ABSOLUTE paths and an UPPERCASE `C:` in `--prefix`, because a lowercase `c:` loads vitest twice. `cd` and commands starting with `node ` are blocked.
- **Commands:**
  - `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run build`
  - `... run test:unit` (baseline 8 files / 71 tests)
  - `... run test:e2e` (baseline 45 tests, about 8 min)
  - `... run shots`
- **Environment:**
  - Not a git repo: no git, no worktree, no commits.
  - Do NOT touch `C:\Users\dusitm\Desktop\Test-Kiro\checkers.py`. Do NOT delete any `*.log` file.
  - **No new npm dependencies.** The IBM Plex Sans 300 weight already ships inside the installed `@fontsource/ibm-plex-sans` (`300.css` exists), so importing it is not a new dependency.
  - Do NOT re-download Playwright browsers. Full Chromium `chromium-1248` is installed. Keep `playwright.config.js` launch args (`--use-angle=swiftshader`, `--enable-unsafe-swiftshader`) unchanged.
  - Never disable TLS verification. The network is flaky, so plan for no downloads.
- **Kept as-is:**
  - The amenities section, the location SVG map, the booking form (validation + `role="status"` success), and the footer note "Concept demonstration. Tessera Sathorn is a fictional project."
  - English copy, no hype, no lorem, no "!".
  - Forbidden: purple/blue gradients, emoji icons, cards-in-cards, and repeated hero+3 cards.
  - Chapter `lede`/`specs` stay verbatim from PRODUCT.md.
- **Viewports:** 1440×900 and 1920×1080 are primary, and 1280×800 must not break. Under 900 px, a graceful single column.
- **Performance and determinism:**
  - DPR cap 2, render loop paused offscreen, scene stays a lazy `import()` chunk (≤ 680 kB raw / ≤ 175 kB gzip).
  - ≤ 250 draw calls in every chapter pose AND in explorer mode.
  - All randomness from `mulberry32`.
- **A11y:** axe zero violations, targets ≥ 44 px, visible focus, full keyboard operation, reduced motion honoured, and `?nowebgl` never shows a blank canvas.

## Design decisions (made here; do not re-decide)
1. **One renderer, one canvas, two hosts.** The Tower Explorer reuses the SAME `WebGLRenderer`, scene and canvas.
   - **Moving the canvas.** `createScene` gains `setMode('story' | 'explorer', hostEl)`. It moves the `<canvas>` with `hostEl.appendChild(canvas)` (moving a canvas keeps its WebGL context), re-points the ResizeObserver at the new parent, and switches the camera state.
   - **Poster frame.** Before the canvas leaves a host, `scene.snapshot(posterCanvas)` renders once and immediately `drawImage`s the WebGL canvas into that host's 2D `<canvas class="scene-poster" aria-hidden="true">`. This is synchronous after `render()`, so `preserveDrawingBuffer` is not needed. The vacated host then shows a still frame instead of a blank one while it scrolls away.
   - **Why:** a second WebGL context would double GPU memory and startup cost under SwiftShader. A fixed full-page canvas would fight the paper sections.
2. **Explorer = architectural-model presentation.** In explorer mode:
   - **Visible:** the exterior + lobby groups and a new site plinth (a 0.8 m travertine disc of radius 46 m under the tower).
   - **Hidden:** the skyline, ground, residence, sky dome and sun disc.
   - **Background and fog:** `scene.background = #EAE6DC` (paper-2) and `scene.fog = Fog(#EAE6DC, 700, 1600)`.
   - **Light:** `setEnvironment('exterior')`, `setTime(0.15)`, exposure 1.0.

   **Why:** a city around the tower would occlude low floors from an orbit camera and make picking unreliable. The isolated scale-model look on paper is the norm for stacking-plan explorers. It also reads as a calm continuation of the paper page.
3. **Picking with no per-floor meshes.**
   - **Pick proxy:** two invisible boxes (`MeshBasicMaterial({ visible: false })`). One is the body (31.2 × 140.2 × 27.2 m), the other the crown (25.2 × 7.5 × 21.2 m on top). The renderer skips them, and `Raycaster` still hits them.
   - **Floor lookup:** the hit point's `y` goes through the pure `levelAtHeight(y)`.
   - **Highlight:** ONE hover mesh and ONE selected mesh (unit `BoxGeometry`, scaled and moved per level), so +2 draw calls.
4. **Floor data lives in a new pure module, `src/content/tower.js`.** It imports `UNITS`, `AMENITIES` and `CHAPTERS` from `facts.js`, has no DOM and no three, and is unit-tested. It holds both the zoning and the band geometry (heights match `TOWER` in `exterior.js`).
5. **Floor control for keyboard users = a native vertical range input.**
   - `<input type="range" min="1" max="42">` with `writing-mode: vertical-lr; direction: rtl`, so level 42 is at the top.
   - Arrows, PageUp/PageDown and Home/End all come for free.
   - `aria-valuetext` reads e.g. "Level 24, 5 residences".
   - Enter (handled in keydown) opens the panel.
   - It doubles as the visible floor scale beside the tower.

   **Why:** native semantics beat a custom listbox, and it is one tab stop.
6. **Remove the residence-types `<table>`.** Its data (sqm, floors, price) already appears in each floor-plan tab's `.plan-meta` and in the explorer panel. Keep the floor-plan ARIA tabs (`#plan-tabs`, `#panel-*`) under the explorer as "Floor plans". The keyboard tabs test stays valid.
7. **Fixed header with two tones.**
   - `.site-header` becomes `position: fixed` (top/left/right 0).
   - Tone `data-tone="scene"` (while `#story` is under the header): transparent with a top ink scrim, paper text, olive-light underline. The logo tiles switch to paper and olive-light via CSS `fill` classes.
   - Tone `data-tone="paper"` (elsewhere): the current look.
   - "Book a viewing" stays `.btn-primary` olive in both tones.
   - **Nav labels:** **Walkthrough** (`#story`) · **Residences** (`#residences`) · Amenities · Location. This fixes "Residence" vs "Residences".
8. **No view shift.** Delete `VIEW_SHIFT`/`filmOffset` in story mode, so the hero tower is centred. The explorer uses `camera.setViewOffset(w, h, panelOpen ? panelW / 2 : 0, 0, w, h)` to keep the tower centred in the space left of the open panel, and `clearViewOffset()` when it closes.
9. **Display weight.** Import `@fontsource/ibm-plex-sans/300.css` in `main.js`. Chapter/hero titles use weight 300.

## A. Cinematic full-bleed walkthrough: layout spec

**Shared horizontal anchor:** `--edge: max(var(--margin), calc((100% - var(--content-max)) / 2))`. That is 80 px at 1440, 64 px at 1280 and 320 px at 1920, aligned with the header logo. Define it in `tokens.css`.

**Stage:** `.story { height: 400vh }`. `.story-stage { position: sticky; top: 0; height: 100vh }`. The scene fills the stage, and the fixed header floats over it. In `story.js`, the scroll metrics no longer subtract the header height, because the stage sticks at 0. In `scroll-progress` calls, replace `headerH` with `0` for both `mapScroll` and `scrollTargetFor`.

**Remove:**
- the paper `.story-panel` box
- the paper `.story-scrim`
- `.story-intro` / `.story-sub`
- `padding-left: 42%` on `.lift-overlay` (the caption is centred)

**New DOM inside `.story-stage`** (after `.scene`), as `.story-overlay` (`position:absolute; inset:0; pointer-events:none`, children `pointer-events:auto`):

| Element | Placement & style |
|---|---|
| `.scrim-bl` (aria-hidden) | `position:absolute; left:0; bottom:0; width:min(1180px, 80%); height:70%;` `background: radial-gradient(130% 100% at 0% 100%, rgba(20,20,18,.82) 0%, rgba(20,20,18,.62) 38%, rgba(20,20,18,0) 72%)`. Neutral ink only. |
| `.scrim-b` (aria-hidden) | full width, `bottom:0; height:180px; background: linear-gradient(0deg, rgba(20,20,18,.72), rgba(20,20,18,0))`, behind the spec row. |
| `.scrim-r` (aria-hidden) | `right:0; top:0; bottom:0; width:340px; background: linear-gradient(270deg, rgba(20,20,18,.55), rgba(20,20,18,0))`, behind the rail. |
| `.chapters` (contains the 4 `<article class="chapter">`; inactive ones `hidden`) | Each article is `position:absolute; left:var(--edge); bottom: calc(var(--s-6) + var(--spec-h) + var(--s-6)); max-width: 640px`. `--spec-h: 64px`. |
| `.chapter .index-label` | Mono `--fs-xs`, uppercase, `color: var(--olive-light)`. Text "01 / 04 · Arrival", "02 / 04", "03 / 04", "04 / 04". |
| chapter title | Plex Sans **300**, `font-size: clamp(56px, 5.4vw, 104px)`, `line-height: 1.0`, `letter-spacing: -0.02em`, `max-width: 9ch; text-wrap: balance`, `color: var(--on-dark)`, margin-top `--s-3`. 78 px at 1440, 69 px at 1280, 104 px at 1920. |
| chapter lede | Plex Sans 400, `--fs-md` (21 px), line-height 1.45, `max-width: 32em`, `color: var(--on-dark)`, margin-top `--s-4`, one line where it fits. |
| `.specs` (one per article, inside it, positioned against the stage) | `position:absolute; left:var(--edge); right: calc(var(--edge) + 200px); bottom: var(--s-6); min-height: var(--spec-h); display:flex; flex-wrap:nowrap; border-top:1px solid rgba(244,241,234,.28)`. Each `<div>` is `padding: var(--s-3) var(--s-6) 0 0` and adds `border-left:1px solid rgba(244,241,234,.28); padding-left: var(--s-6)` from the 2nd item. `dt`: Mono xs uppercase, letter-spacing .08em, `var(--on-dark-2)`. `dd`: Mono `--fs-sm`, tabular-nums, `var(--on-dark)`, margin-top `--s-1`, `max-width: 24em` (the long facade value may wrap to 2 lines). |
| `.chapter-nav` (right rail) | `position:absolute; right:var(--edge); top:50%; transform:translateY(-50%); width:176px`. `<ol>` is vertical, gap 0. Each `<button>` is `min-height:56px; width:100%; display:flex; justify-content:flex-end; align-items:center; gap:var(--s-3); padding-right:var(--s-5); text-align:right; background:transparent; border:0;` with `.num` (Mono xs) + label (Sans `--fs-sm`), `color: var(--on-dark-2)`. Rail track: `ol::after` 1 px line at `right:0`, full height, `rgba(244,241,234,.28)`. Progress fill: `ol::before` 2 px wide at `right:0`, `height: calc(var(--story-progress, 0) * 100%)`, `background: var(--olive-light)`. `story.js` sets `--story-progress` = `progress / 3` on scroll. Active (`aria-current="step"`): label + num `var(--on-dark)`, num `var(--olive-light)`, plus a 2 × 24 px olive-light tick (`::after` on the button) at the rail. Hover: `var(--on-dark)`. Focus: `outline: 2px solid var(--olive-light); outline-offset: 3px`. |

**Chapter 1 = the hero intro, shown once.**
- **Article content:**
  - index label "01 / 04 · Arrival"
  - `<h1 id="story-title">Tessera Sathorn</h1>` in the display style. `max-width: 8ch` wraps it as "Tessera / Sathorn".
  - the verbatim lede "A tower of 42 storeys, set back from Sathorn Road behind a garden court."
  - the 4 specs (HEIGHT 148 m · STOREYS 42 · RESIDENCES 168 · FACADE fluted precast concrete, bronze-tinted glass)
- **Other chapters:** articles 2–4 keep `<h2 id="chapter-<id>-title">` with the chapter title.
- **No duplication:** the separate `.story-intro` block and the sub-line are deleted, so there is no duplicated project and chapter heading.
- **Labelling:** `#story` keeps `aria-labelledby="story-title"`. Article 1 is `aria-labelledby="story-title"`.
- `renderChapters` in `src/ui/story.js` builds this.
- The h1 must stay in the DOM when chapter 1 is hidden. That is fine, because it is still in the document and axe's `page-has-heading-one` checks the DOM. Verify with axe.

**Contrast (must hold over any frame).**
- **Measurement:** text sits where the bottom-left scrim's alpha is ≥ 0.6. The worst-case scene pixel behind it is the amber horizon `#C98B5A`. 0.6 × ink over that gives about `#5D4632` (L ≈ 0.07), so paper `#F4F1EA` (L ≈ 0.88) reaches about 7:1, and on-dark-2 `#B9B4A7` about 4.9:1.
- **Placement:** keep `.chapter` text inside the inner 38 % radius of the radial scrim. The spec row sits on `.scrim-b` (alpha ≥ 0.5 at its top, ≥ 0.72 at the bottom). The rail sits on `.scrim-r`.
- **Text shadow:** add `text-shadow: 0 1px 2px rgba(20,20,18,.35)` to overlay text as belt-and-braces.
- **Gate:** the visual pass must check all 4 chapters × 3 viewports.

**Header over the scene.**
- `[data-tone="scene"]`:
  - `background: linear-gradient(180deg, rgba(20,20,18,.62), rgba(20,20,18,0))`
  - `border-bottom-color: transparent`
  - `.wordmark` and nav links `var(--on-dark)`
  - `aria-current` underline `var(--olive-light)`
  - the logo `rect.tile` fill `var(--on-dark)` and `rect.tile-accent` fill `var(--olive-light)`. Change the inline SVG rects in `index.html` to classes.
- `[data-tone="paper"]`: the current paper header.
- **Switching:** `nav.js` toggles the tone with an IntersectionObserver on `#story`. Tone is `scene` while `#story`'s bounding rect bottom > header height.
- **Scroll margin:** add `section[id] { scroll-margin-top: var(--header-h) }` for the fixed header. `tests/e2e/helpers.js` `scrollToSection` already subtracts the header height.

**Composition fixes (scene).**
- **Ch1 centred:** remove the `VIEW_SHIFT` filmOffset block in `src/scene/index.js` `applyPose` (set `camera.filmOffset = 0`). Keep the ch1 keyframe `pos (62, 1.7, 110) → target (0, 60, 0), fov 54`. The tower is at x = 0, so it centres. If the canopy/base collides with the bottom-left title at 1280, nudge the ch1 target to `(4, 62, 0)` and keep the tower within ±40 px of the canvas centre.
- **Hero stands out.** In `src/scene/sets/skyline.js`, export pure `heroCap(x, z, w, d)` and apply it in `placeBlocks` after the wedge rule:
  - **(a) Near the ch1 camera:** `C1 = (62, 110)` and `dc = hypot(x-62, z-110) - 0.5*hypot(w, d)`. Cap `h ≤ 1.7 + max(0, dc) * 0.56`, so every block subtends ≤ 60 % of the tower's elevation angle (the tower top is 49° from C1, and tan(29.4°) ≈ 0.56).
  - **(b) Within 600 m of the tower** (`hypot(x, z) < 600`): cap `h ≤ 88` (≤ 60 % of 148 m).
  - **(c) Darken:** blocks with `hypot(x, z) < 600` get `tone = 0.55 + 0.45 * tone`, so they lean toward the darker `#615C54`.
  - **Seeding:** the `rand()` call order must not change, so other blocks keep their positions.
  - **Effect:** this also keeps the ch4 river view clear. Keep the fog as is.
- **Ch3 kitchen island in shot.** In `src/scene/camera-rig.js`, change the ch3 key to `pos: R(3.6, 1.6, 1.25), target: R(-3.6, 0.95, -1.9), fov: 62`. From the south-east of the room this looks WSW, so the island (2.3, -1.3) sits to the right of the frame, the sofa/rug/coffee table to the left, and dining + west glazing in the centre. Change the first `path23` midpoint to `R(0.6, 1.6, 1.2)`.
  - **Keep-out:** run `tests/unit/residence-layout.test.js`. The new position is ≥ 1.2 m from the island + stools box (x 1.1..3.5, z -1.78..-0.4) and from the sofa/side table. If the test fails, move pos along +x/-z by ≤ 0.2 m steps, keeping x ≤ 3.65.
  - **Description:** update `CHAPTERS[2].description` in `facts.js` (and PRODUCT.md's "3D scene descriptions" item 3) to mention "a walnut kitchen island with a marble top".
  - **Gate:** confirm in the 1440/1920/1280 screenshots that the island is visibly in frame and the sofa is not cut in half. Tune the target ±0.5 m if needed.

## B. Tower Explorer: spec

**Placement:** the `#residences` section stays the 3rd section, after the walkthrough and overview. It contains:
1. `.explorer` stage, the full viewport: `height: 100vh; min-height: 720px; position: relative; background: var(--paper-2); overflow: hidden`
2. below it, the existing floor-plan tabs block in a `.container` (title "Floor plans")

The `<table class="units-table">` and `#units-body` are removed, along with `renderTable` and the `.units-table` CSS.

**Explorer DOM** (`index.html`; `src/ui/explorer.js` fills dynamic parts):

| Element | Placement & style |
|---|---|
| `.explorer-scene` | `position:absolute; inset:0`. The WebGL canvas is re-hosted here in explorer mode. It holds `<canvas class="scene-poster" aria-hidden="true">` for the poster. Under `?nowebgl` it holds the SVG elevation instead. |
| `.explorer-intro` | `position:absolute; left:var(--edge); top: calc(var(--header-h) + var(--s-7)); width: 320px` (290 px ≤ 1360 px). Contents: index label "03 / Residences" · `<h2 id="residences-title">Choose a level</h2>` (`--fs-2xl`, weight 400) · `<p class="section-intro">` "Drag to turn the tower. Choose a level to see its residences, areas and prices." · mix `<dl class="mix">` (Mono, hairline rows): 1 Bedroom 64 · 2 Bedroom 72 · 3 Bedroom 30 · Penthouse 2 · **Total 168**. The counts are computed from `tower.js`, not hard-coded. · `<button class="btn btn-secondary" id="enter-sample">Enter the sample residence</button>` with Mono xs under it: "Level 34 · 2 Bedroom · 96 sqm". |
| `.floor-scale` | `position:absolute; left: calc(var(--tower-x, 50%) + 120px); top: var(--tower-top, 12%); height: calc(var(--tower-bottom, 90%) - var(--tower-top, 12%)); width: 160px`. Contains `<label for="floor-range" class="visually-hidden">Level</label>` and `<input id="floor-range" type="range" min="1" max="42" step="1">` (vertical: `writing-mode: vertical-lr; direction: rtl; height:100%; width:44px`; hairline track `var(--ink-2)`; 20 px olive thumb with paper 2 px ring). Next to it, `aria-hidden` zone labels in Mono xs, positioned at `bottom: calc((level-1)/41*100%)`: "42–41 Penthouse", "38 Sky lounge · Pool", "34 Sample residence", "12 Wellness", "3 Library", "1–2 Lobby". |
| `.floor-readout` | `position:absolute; left: var(--tower-x, 50%); transform: translateX(-50%); bottom: var(--s-6)`. Mono `--fs-sm` "Level 24 · 5 residences" + `<button class="btn btn-secondary" id="floor-open">View level 24</button>`. |
| `#floor-live` | `<p class="visually-hidden" aria-live="polite">`, announcing e.g. "Level 24. 2 × 1 Bedroom, 2 × 2 Bedroom, 1 × 3 Bedroom. 3 of 5 available." |
| `.floor-tip` (aria-hidden) | Pointer tooltip, `position:absolute; transform: translate(16px, -50%)`, placed at the pointer. Paper bg, 1 px `var(--rule)` border, radius 2 px, Mono xs ink, `padding: var(--s-2) var(--s-3)`, no shadow. Text from `tooltipFor(level)`, e.g. "Level 24 · 1–3 Bedroom · 58–168 sqm", "Level 38 · Sky lounge and 35 m pool", "Levels 41–42 · Penthouse duplex · 420 sqm", "Level 12 · Wellness floor". |
| `.floor-panel` | `<aside id="floor-panel" role="dialog" aria-modal="false" aria-labelledby="floor-panel-title" hidden>`. `position:absolute; top: var(--header-h); right:0; bottom:0; width: clamp(400px, 32vw, 480px); background: var(--paper); border-left: 1px solid var(--rule); padding: var(--s-6) var(--s-7); overflow-y:auto`. ONE edge-anchored surface, with no inner boxed cards. Contents in order: close `<button class="panel-close" aria-label="Close level details">` (44×44, top-right, SVG X line icon added to `icons.js`) · Mono index "Level 24" · `<h3 id="floor-panel-title" tabindex="-1">` "Residences on level 24" (or the amenity title) · residence rows `<dl class="floor-units">` (hairline rows, per type on this floor: type label · `96 sqm` · `From THB 31.5M` / "Price on request" · "2 of 2 available"; Mono for numbers) · type switcher (only if the floor has >1 type): `<div role="group" aria-label="Floor plan">` of buttons with `aria-pressed`, ≥ 44 px · `<figure>` with `floorPlanSvg(typeId)` (existing) · note row for 3BR/PH "Private lift lobby" and, on level 34, "This is the level of the sample residence in the walkthrough." · `<button class="btn btn-primary" id="panel-book">Book a viewing for this residence</button>`. Amenity/lobby/podium levels show the `AMENITIES` copy (or the lobby chapter lede) instead of rows/plan, plus "Book a viewing". The lobby panel also gets "See the lobby" → walkthrough chapter 2. |

**`--tower-x/top/bottom`:** after each explorer render, `scene` calls `opts.onExplorerFrame({ x, top, bottom })`. These are CSS px of the projected tower centre, roof (y = 147.5) and base (y = 0), and `explorer.js` writes them as CSS custom properties on `.explorer`. The fallback values above apply with no WebGL.

**Panel open state:** `.explorer[data-panel="open"]` hides `.explorer-intro` at widths ≤ 1360 px (so 1280 never overlaps). The tower, scale and readout follow `--tower-x`, which moves left with `setViewOffset`.

**Explorer camera state** (new pure module `src/scene/explorer-rig.js`, which imports only three):
- **Target and orbit:** target `(0, 74, 0)`. Base azimuth = the ch1 camera azimuth, `atan2(110, 62)` ≈ 60.6° from +x toward +z (south-east, the same face the walkthrough opens on). Distance `D = 380 m`, elevation 6° (camera y = 74 + 380·sin 6° ≈ 113.7). `fov 28`. At that fov and distance the 148 m tower fills about 78 % of the view height (2·380·tan 14° = 189.5 m visible).
- **Yaw:** `yaw ∈ [-35°, +35°]`, clamped, applied around the base azimuth. No zoom, no pitch control, and the wheel is ignored, so page scroll keeps working.
- **API:** `createExplorerRig()` returns `{ camera, poseFor(yawDeg) → {pos, target, fov}, clampYaw }`. Pose changes copy into the shared camera, and the story rig's pose is re-applied on `setMode('story')`.
- **Drag:** `pointerdown` on the explorer canvas captures the pointer. `dx` px → `yawTarget -= dx * 0.25°`. Damped `yaw += (yawTarget - yaw) * (1 - exp(-dt*6))`. A move of more than 4 px counts as a drag, not a click.
- **Idle:** after 4 s without pointer input, `yawTarget = 12° · sin(2π t / 24 s)`, a gentle sway. The render loop marks dirty only while idle sway runs AND the canvas is intersecting AND the document is visible.
- **Reduced motion:** no idle sway, and yaw snaps instantly (no damping). `setViewOffset` changes apply instantly.
- **Draw-call budget:** exterior + lobby + plinth + 2 highlight meshes. This must stay ≤ 250 (ch1 today is 124 including skyline and ground).
- **New scene API:**
  - `setMode(mode, host, posterOut?)`
  - `setExplorerYaw(deg)`, `getExplorerYaw()`, `setIdle(bool)`
  - `pickLevel(clientX, clientY) → level | null`
  - `setHighlight({ hover: level|null, selected: level|null })`
  - `setPanelOffset(px)`
  - `screenPointForLevel(level) → {x, y}` (client coords of that band's centre on the south-east corner face, for tests)
  - `snapshot(canvas2d)`
  - `info()` (existing, works in both modes)
- **Mode switching** (`src/ui/explorer.js`): an IntersectionObserver with thresholds `[0, .25, .5, .75, 1]` on `#story` and `.explorer`. The host with the larger `intersectionRatio` wins. On change, call `scene.snapshot(<vacated host poster>)`, then `scene.setMode(...)`.
- **Highlight look:** `MeshBasicMaterial({ color: '#A9B77A', transparent: true, depthWrite: false, toneMapped: false })`. Opacity is 0.28 for hover and 0.5 for selected. Size is the band footprint + 0.8 m on each axis, by band height − 0.15 m.
- **Amenity and penthouse cues:** levels 12 and 38 also get distinct labels in the scale, tooltip and panel. The crown band (41–42) highlights as one duplex block when either level is chosen.

**Keyboard / a11y contract (Explorer):**
- **Tab order:** `#enter-sample` → `#floor-range` → `#floor-open` → (panel when open). The canvas is not focusable. It has `role="img"` + `aria-label="3D model of the Tessera Sathorn tower. Use the level control to choose a level."` while in explorer mode, and the story label is restored in story mode.
- **`#floor-range` keys:**
  - Up/Right = +1 level; Down/Left = −1
  - PageUp/PageDown = ±5
  - Home = 1; End = 42
  - Each change sets the selected highlight, updates `aria-valuetext` (`describeLevel(n).short`, e.g. "Level 24, 5 residences"; "Level 38, sky lounge and 35 m pool"), updates `.floor-readout`, and announces in `#floor-live`.
  - Enter opens the panel.
- **Panel open** (Enter on the range, `#floor-open`, a 3D click, or an SVG band click): `hidden=false`, focus moves to `#floor-panel-title`, and `aria-expanded="true"` is set on `#floor-open`.
- **Panel close:** Escape (keydown on the panel) or `.panel-close` → hidden. Focus returns to the invoker (`#floor-range` for range/3D/SVG opens, `#floor-open` for the button).
- **`#panel-book`:**
  - closes the panel (focus not returned)
  - calls the new export `selectUnit(typeId)` from `booking-form.js` (sets `#f-unit` value and dispatches `change`)
  - scrolls `#booking` into view (instant under reduced motion)
  - focuses `#f-name` with `preventScroll: true`
  - On amenity floors `typeId` is `''` (no preselect).
- **`#enter-sample`:** calls `story.goTo(2)`. `initStory` now returns `{ goTo }`, and `main.js` passes it to `initExplorer`. Smooth unless reduced motion. Focus moves to the 3rd chapter rail button.
- **Mouse:** hover sets the hover highlight + tooltip. Click (not drag) selects + opens. The cursor is `grab`/`grabbing` on the canvas.
- **Targets:** all controls ≥ 44 × 44, and the focus ring is `var(--olive)` on paper.
- **`?nowebgl`:** `.explorer-scene` gets `towerElevationSvg()` from new `src/ui/tower-elevation.js`. It is a line elevation in paper/ink/olive at the same proportions (bands per level from `tower.js`, crown narrower, zone labels), `role="img"` + `<title>`. Each band is `<rect class="band" data-level="n">` with pointer hover/click driving the SAME tooltip, highlight class (`fill: #A9B77A`) and panel. Keyboard uses the same `#floor-range`. With no `onExplorerFrame`, `--tower-*` come from the SVG's band positions measured once in `explorer.js` via `getBoundingClientRect` of bands 1 and 42.

**Test hook:** `window.__tessera.explorer = { selectLevel(n), open(n), close(), setYaw(deg), getYaw(), idle(on), screenPointForLevel(n), get mode() }`. These are thin wrappers, and they work under `?nowebgl` (`setYaw`/`getYaw` are no-ops returning 0; `screenPointForLevel` uses the SVG band rect).

## Floor zoning (exact; `src/content/tower.js`)

| Levels | Use | Residences per level | Count |
|---|---|---|---|
| 1–2 | Lobby, double height (7.2 m) | – | 0 |
| 3 | Residents' library | – | 0 |
| 4 | Podium, building services | – | 0 |
| 5–11 (7 levels) | Residential | 3 × 1 Bedroom + 3 × 2 Bedroom | 42 |
| 12 | Wellness floor | – | 0 |
| 13 (1 level) | Residential | 3 × 1 Bedroom + 3 × 2 Bedroom | 6 |
| 14–33 (20 levels) | Residential | 2 × 1 Bedroom + 2 × 2 Bedroom + 1 × 3 Bedroom | 100 |
| 34–37 (4 levels) | Residential (34 = sample residence level) | 2 × 2 Bedroom + 1 × 3 Bedroom | 12 |
| 38 | Sky lounge + 35 m infinity pool | – | 0 |
| 39–40 (2 levels) | Residential | 3 × 3 Bedroom | 6 |
| 41–42 | Penthouse duplex | 2 duplex penthouses spanning both levels (counted once) | 2 |
| **Total** | | | **168** |

- **By type:** 1 Bedroom 8×3 + 20×2 = **64**; 2 Bedroom 8×3 + 20×2 + 4×2 = **72**; 3 Bedroom 20 + 4 + 6 = **30**; Penthouse **2**. 64 + 72 + 30 + 2 = **168**.
- **Ranges:** these match `UNITS[].floors` exactly as min–max levels: 1BR 5–33, 2BR 5–37, 3BR 14–40, PH 41–42.
- **Interior area per level:** at most 504 sqm on residential levels (5–11/13: 462; 14–33: 476; 34–37: 360; 39–40: 504) and 420 per crown level. This fits the 30 × 26 m plate (780 sqm gross) and the 24 × 20 m crown (480 sqm).

**Band geometry** (must match `TOWER` in `exterior.js`: `lobbyH` 7.2, storey 3.5, `bodyTop` 140, `crownTop` 147.5):
- **Levels 1 and 2:** 0–3.6 and 3.6–7.2 (they highlight together as the lobby).
- **Levels 3–40:** `y0 = 7.2 + (L-3)*3.5`, `y1 = y0 + 3.5`. Level 40 ends at 140.2. Clamp the top of level 40 to 140.
- **Levels 41 and 42:** 140–143.75 and 143.75–147.5, with the crown footprint 24 × 20.
- **Body footprint:** 30 × 26.

**Exports:**
- `LEVELS`: 42 entries `{ level, kind: 'lobby'|'library'|'podium'|'residential'|'wellness'|'amenity'|'penthouse', label, units: [{type, count}], y0, y1, w, d }`
- `levelAtHeight(y)`
- `bandFor(level)`: for 1/2 returns the 0–7.2 lobby band, and for 41/42 the 140–147.5 duplex band
- `totals()` → `{ '1br', '2br', '3br', ph, all }`
- `typeRange(typeId)` → `{ min, max }`
- `describeLevel(level)` → `{ short, tooltip, announce }`
- `availability(level)` → `[{ type, total, available }]`

**Availability (fictional, deterministic):** iterate residences in ascending level order with `mulberry32(SCENE_SEED + 500)`, and mark a residence sold if `rand() < 0.38`. The two penthouses are fixed at 1 available, 1 reserved. Precompute once at module load. Panel text: "3 of 5 available". When 0: "Sold out on this level". Prices are the type's `UNITS[].priceLabel` ("From THB 18.9M" etc.; PH "Price on request"). No floor premiums are invented.

## Files

**Change:**
- `index.html`:
  - header SVG tile classes
  - nav labels Walkthrough/Residences
  - story overlay markup; remove `.story-panel`/`.story-intro`/`.story-scrim`
  - `#residences` explorer markup; remove the table
  - index labels: overview "02 / Overview", residences "03 / Residences" (amenities 04, location 05, viewing 06 stay)
- `src/main.js`:
  - import the 300 weight
  - pass `onExplorerFrame`
  - `initExplorer({ scene, story, reducedMotion })`
  - under `?nowebgl`, render the elevation SVG
- `src/styles/tokens.css`: `--edge`, `--spec-h`
- `src/styles/layout.css`: fixed header and its two tones, scroll-margin
- `src/styles/sections.css`: story overlay, scrims, rail, specs row, explorer, panel, tooltip, range; remove the `.story-panel`/`.units-table` rules; the ≤ 900 px fallback
- `src/ui/story.js`:
  - new `renderChapters`
  - header offset 0
  - `--story-progress`
  - return `{ goTo }`
  - keep `window.__tessera.goToChapter/chapter/renderInfo`
- `src/ui/chapter-nav.js`: markup only; keyboard logic unchanged
- `src/ui/nav.js`: header tone
- `src/ui/residences.js`: drop `renderTable`, keep the tabs
- `src/ui/booking-form.js`: export `selectUnit`
- `src/ui/icons.js`: `close` icon
- `src/content/facts.js`: ch3 description
- `PRODUCT.md`: ch3 scene description; a short "Tower zoning" table matching the zoning table above
- `src/scene/index.js`:
  - remove `VIEW_SHIFT`
  - modes, explorer camera, highlight meshes, pick proxy, plinth, poster snapshot
  - `onExplorerFrame`
  - draw-call log per mode
- `src/scene/camera-rig.js`: ch3 key, `path23` midpoint
- `src/scene/sets/skyline.js`: `heroCap` + tone darkening
- `src/scene/lighting.js`: `setExplorer(on)` toggles sky/disc visibility, `scene.background` and fog colour/range, and restores them on off

**Create:**
- `src/content/tower.js`
- `src/scene/explorer-rig.js`
- `src/ui/explorer.js`
- `src/ui/tower-elevation.js`

**New / updated tests:**
- `tests/unit/tower.test.js`:
  - `totals().all === 168` and `PROJECT.residences === 168`; per type 64/72/30/2
  - levels 1..42 each exactly once; kinds at 1–2, 3, 4, 12, 38, 41–42 as tabled
  - `typeRange` equals `UNITS[].floors` for every type (parse "5–33")
  - per-level area ≤ 504 (≤ 420 for crown levels)
  - bands contiguous from 0 to 147.5; `levelAtHeight` at 0 → 1, 3.7 → 2, 7.2 → 3, 139.9 → 40, 140.1 → 41, 147.4 → 42, −1/200 → null
  - `availability` deterministic, `0 ≤ available ≤ total`, totals per level match `units`
  - `describeLevel(38).tooltip` contains "Sky lounge"
- `tests/unit/explorer-rig.test.js`:
  - `clampYaw(90) === 35`
  - pose distance to target ≈ 380
  - projecting (0, 0, 0) and (0, 147.5, 0) at aspect 1.6 gives NDC y within (−0.95, 0.95) and a span ≥ 1.4 (the tower fills ≥ 70 % of the height) for yaw −35, 0, 35
- `tests/unit/skyline-hero.test.js`: for every block from `placeBlocks(mulberry32(SCENE_SEED))`:
  - the elevation angle from C1 (62, 1.7, 110), measured to `max(1, centreDist - halfDiag)`, is ≤ 0.6 × the tower-top angle (atan(146.3 / 126.2))
  - blocks within 600 m have h ≤ 88
  - the existing sightline test still passes
- `tests/unit/tower-elevation.test.js`: the SVG string has `<title>`, exactly 42 `.band` rects with `data-level` 1..42 (levels 1 and 2 are the two halves of the lobby, and 41/42 the two halves of the crown), and no `NaN`
- `tests/unit/residence-layout.test.js`: unchanged; must pass with the new ch3 key
- `tests/e2e/explorer.spec.js` (new; runs in all 3 projects):
  - (1) **Keyboard:** scroll to `#residences`; `__tessera.explorer.idle(false)`; focus `#floor-range`; press `Home` then `ArrowUp` ×23 → value 24, `#floor-live` contains "Level 24"; Enter → `#floor-panel` visible with `role="dialog"`, `#floor-panel-title` focused; Escape → hidden and `#floor-range` focused.
  - (2) **Mouse:** `screenPointForLevel(24)` → `page.mouse.move` → `.floor-tip` contains "Level 24"; click → panel title contains "level 24".
  - (3) **Book:** open level 24, press the "3 Bedroom" plan button, click "Book a viewing for this residence" → `#f-unit` has value `3br`, `#f-name` focused, `#booking` in viewport.
  - (4) **Sample residence:** "Enter the sample residence" → `__tessera.chapter === 2` (poll).
  - (5) **Draw calls:** `renderInfo().calls ≤ 250` in explorer mode, and `explorer.mode === 'explorer'`.
  - (6) **Reduced motion:** with `reducedMotion: 'reduce'`, `getYaw()` is unchanged after 1.5 s idle.
  - (7) **`?nowebgl`:** click `.band[data-level="38"]` → panel title contains "Sky lounge"; Escape closes.
- `tests/e2e/a11y.spec.js`: add "explorer panel open has no axe violations" (open level 24 via the hook, then audit). Keep the existing 3 tests.
- `tests/e2e/keyboard.spec.js`: the chapter test stays as is. The 44 px selector adds `.explorer button, .floor-panel button` (open the panel first in a second test, or in the same test via the hook).
- `tests/e2e/smoke.spec.js`:
  - the `?nowebgl` test also asserts `.explorer-scene svg[role="img"]` is visible
  - the default test asserts the nav link texts are exactly `["Walkthrough", "Residences", "Amenities", "Location"]`
- `tests/e2e/screenshots.spec.js`:
  - add `section-explorer` (after `idle(false)` + `setYaw(0)`), `section-explorer-panel` (level 24 open), `section-explorer-nowebgl`, and `section-floorplans` (scroll to `#plans`)
  - `SECTIONS` keeps `residences`

## Ordered items

- [ ] A1. **Data + pure modules + unit tests.** Create `src/content/tower.js` (zoning, bands, availability, `describeLevel`), `src/scene/explorer-rig.js`, and `src/ui/tower-elevation.js`, plus `heroCap` in `skyline.js`. Add the 4 new unit test files. Update the ch3 description in `facts.js` and PRODUCT.md, and add the PRODUCT.md tower zoning table.
      Files: as listed.
      Verify: `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run test:unit`. All old tests and the new ones pass, including the 168 assertion.

- [ ] A2. **Walkthrough overlay + header + composition.** Depends on A1 (`heroCap`).
      - `index.html` story/header/nav markup; `story.js` (`renderChapters`, offset 0, `--story-progress`, return `{ goTo }`); `chapter-nav.js` markup.
      - `nav.js` tone; `tokens.css`/`layout.css`/`sections.css` story + header rules; 300-weight import in `main.js`.
      - `index.js`: remove `VIEW_SHIFT`. `camera-rig.js`: ch3 key.
      - Update the e2e nav-label assertion.
      Verify: build passes. Unit passes (incl. residence-layout). `run test:e2e` passes (smoke, a11y, keyboard, screenshots). Open `screenshots\desktop-1440\chapter-01..04*.png`, `desktop-1280` and `desktop-1920`. Check: no opaque box; title bottom-left, readable; spec row single line (facade may wrap 2 lines); rail on the right with the active chapter; hero tower centred and clearly the tallest/brightest; island visible in ch3; header transparent over the scene.

- [ ] A3. **Explorer scene mode.** Depends on A1.
      - **In `src/scene/index.js`:** `setMode`, the explorer camera via `explorer-rig.js`, the plinth, pick proxy, 2 highlight meshes, `setViewOffset` panel offset, `snapshot`, `onExplorerFrame`, `pickLevel`, `screenPointForLevel`, and idle/yaw.
      - **In `src/scene/lighting.js`:** `setExplorer`.
      - **Render loop:** it stays dirty-driven. Idle sway only when allowed.
      Verify: build passes. The chunk stays ≤ 680 / 175 kB (report it). Unit passes.

- [ ] A4. **Explorer UI + fallback + booking hook.** Depends on A2, A3.
      - `src/ui/explorer.js` (mode switching, range, readout, tooltip, panel, focus management, Escape, book flow, enter-sample, `__tessera.explorer`).
      - `index.html` `#residences` markup (table removed, plans kept); `residences.js` (no table); `booking-form.js` `selectUnit`; `icons.js` close.
      - `sections.css` explorer/panel/tooltip/range + ≤ 900 px fallback: stage `height: 70vh`, the panel becomes a static full-width block under the stage, and the scale moves under the readout.
      - `main.js` wiring incl. `?nowebgl` elevation.
      - Add `tests/e2e/explorer.spec.js` and the a11y/keyboard/smoke/screenshots updates.
      Verify: build, unit and `run test:e2e` all pass in all 3 projects (45 old − 0 + new). Open `section-explorer*.png` at 1280/1440/1920. Check: tower centred; scale aligned to the tower; panel flush right on paper with no nested boxes; at 1280 with the panel open nothing overlaps; draw calls logged ≤ 250.

- [ ] A5. **Visual + copy pass and records.**
      - Re-run `run shots` and inspect every chapter and explorer PNG at 3 sizes, plus `-reduced`. Fix contrast/overlap issues in CSS: raise the scrim alpha rather than adding boxes.
      - Grep `index.html`, `src/content` and `src/ui` for banned words, "lorem" and "!".
      - Append an "A+B presentation redesign" section to `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\.agents\tasks\verification.md`: build size, unit/e2e counts, draw calls per chapter + explorer, screenshots inspected, and the contrast reasoning.
      Verify: build, unit and e2e all green. Then delete `test-results\` (it is recreated by e2e; it is not a `*.log`).

## Known gaps / assumptions
- **Level 4 use.** PRODUCT.md does not say what level 4 is. It is labelled "Podium, building services", with no residences and no invented amenity.
- **Availability** is fictional but seeded and consistent across reloads. Prices are only the PRODUCT.md "from" prices.
- **Level 2 vs the lobby.** The 7.2 m lobby occupies levels 1–2 by height. Levels 1 and 2 stay separate stops on the range (both describe the lobby) so the control maps 1:1 to 42 storeys.
