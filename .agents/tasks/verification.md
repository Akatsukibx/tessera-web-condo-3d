# Verification — Tessera Sathorn (iteration 1)

No `review.json` existed, so this was iteration 1. All 10 plan items already had code in place. This run finished item 9 (Playwright runs on the local full Chromium, screenshots go to both paths) and item 10 (visual critique and fixes).

Note: npm scripts were run as `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run <script>`, with an **uppercase** `C:` drive letter. With a lowercase `c:` prefix, vitest loads two copies of its runner and every suite fails with `Cannot read properties of undefined (reading 'config')`. That is an environment quirk, not a code defect. `cd` and `node` are blocked by the user's permission rules.

## 1. Build
`npm.cmd run build` passes (vite 8.3.4, `✓ built in 1.83s`) and writes `dist\index.html` (10.92 kB). The scene chunk is 555 kB / 140 kB gzip.

## 2. Unit tests
`npm.cmd run test:unit`: **4 files, 23 tests passed** (prng, scroll-progress, validate, floorplans).

## 3. `shots` script
`package.json` has `"shots": "playwright test tests/e2e/screenshots.spec.js"`.

## 4. Playwright config / screenshots
- `playwright.config.js` sets `launchOptions.executablePath` to `%LOCALAPPDATA%\ms-playwright\chromium-1248\chrome-win64\chrome.exe`, which is the full Chromium already installed. It can be overridden with `PW_CHROMIUM`. Nothing was re-downloaded and TLS verification was not touched.
- Launch args: `--use-gl=swiftshader --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. WebGL renders headless, and `data-scene-ready=true` is reached in every project.
- Projects: desktop-1440 (1440×900), desktop-1920 (1920×1080), desktop-1280 (1280×800).
- PNGs per project are written to `screenshots\<project>\` and mirrored to `tests\screenshots\<project>\`:
  - `chapter-01-arrival`, `chapter-02-lobby`, `chapter-03-living-room`, `chapter-04-balcony`
  - the same four with a `-reduced` suffix (reducedMotion: reduce)
  - `section-overview`, `section-residences`, `section-amenities`, `section-location`, `section-booking`
  - `section-booking-errors`, `fallback-nowebgl`, `full-page` (fullPage)

## 5. Visual review (PNGs opened and inspected)
None of the 4 chapters render a blank canvas at 1440, 1920 or 1280. The tower/skyline, lobby (oak slats, lift cores, bench), living room (west glazing, olive sofa) and balcony at dusk all render. The paper panel is opaque and readable over every chapter.

Defects found and fixed:
| Defect | Fix |
|---|---|
| At 1920 the story panel sat at x=80 while the header content starts at x=320, so they were misaligned | `.story-panel { left: max(var(--margin), calc((100% - var(--content-max)) / 2)) }` (sections.css) |
| Residences table: the "TYPE" header was smaller than INTERIOR/FLOORS/FROM, because `.units-table .n` overrode the font size | `.units-table thead .n { font-size: var(--fs-xs) }` |
| Primary nav kept "Residence" highlighted while viewing the booking section | nav.js now observes every `main section[id]`, so the highlight clears on sections without a nav link |
| Location map: the "Chong Nonsi" label touched the Narathiwat Rd line | label moved to (402, 264) |
| WebGL fallback: the 148 m dimension line crossed the "LEVEL 34" label, and the sun circle was half-hidden behind the skyline as a stray arc | dimension line moved +70 px right; sun moved to (800, 250), r 56 |

After the fixes, the re-generated PNGs were checked again: 1920 arrival, 1440 location, 1440 fallback and 1440 booking-errors are all correct.

## 6. axe (@axe-core/playwright, tags wcag2a/wcag2aa/wcag21aa)
The check requires **zero violations of any impact**, not just zero serious/critical. It passes in all 3 projects for:
- the default page
- `/?nowebgl`
- the form error state (after an empty submit)

## 7. Keyboard e2e (passes in all 3 projects)
- The first Tab focuses the skip link.
- Chapter nav: ArrowRight/Down/Left/Home/End move focus. `aria-current="step"` follows the focused chapter, and the live region reads "Chapter 4 of 4: Balcony at dusk". Enter activates a chapter.
- Residence tabs: arrows/Home/End with wrap-around, `aria-selected`, and the matching panel is shown or hidden.
- An empty submit focuses `#f-name` with `aria-invalid=true`, and `aria-describedby` contains `err-name`. The phone field is described by `hint-phone err-phone`.
- A valid submit focuses `#success-heading` ("Thank you, Napat. This is a demonstration, so nothing was sent."), inside `role="status"`. "Book another viewing" resets the form and refocuses the name field.
- All buttons, control links and tabs are at least 44×44 px.

## Full e2e run (final, after fixes)
`npm.cmd run test:e2e` → **42 passed (1.7m)**: smoke, a11y, keyboard and screenshots × 3 projects. Smoke also confirms no console errors, the verbatim footer note, no banned words, no "lorem", no "!" in body text, and that `?nowebgl` shows the SVG fallback with no canvas.

## Copy check
I grepped `index.html`, `src/content`, and `src/ui` for the banned words, "lorem" and "!". The only matches are JS operators and HTML comments, so the UI copy is clean.

## Servers
The preview server was started and stopped by the Playwright `webServer`. Port 4173 was free before the run and is free after it.

# 3D realism upgrade

Covers FEAT-001..004 (plan.md "3D realism upgrade"). Measured in the FEAT-004 run.

## Results
- Build: passes (vite 8.3.4). Scene chunk `dist\assets\scene-*.js`: before 555 kB / 140 kB gzip, after **645.90 kB / 170.90 kB gzip** (budget 680 / 175).
- Unit: **8 files, 71 tests passed** (23 original + texture-data, geometry-kit, skyline-sightline, residence-layout).
- E2E: **45 passed (8.5 min)** = 42 original + the new `draw calls stay within budget` test in each of the 3 projects. axe reports zero violations in all projects (default, `?nowebgl`, form error state). The `?nowebgl` smoke test now also asserts `window.__tessera.renderInfo()` is `null`.

## Draw calls and triangles (`window.__tessera.renderInfo()`, SwiftShader, shadow pass included)

| Chapter | 1280 | 1440 | 1920 |
|---|---|---|---|
| 1 Arrival | 124 / 307,062 | 124 / 307,062 | 124 / 307,062 |
| 2 Lobby | 121 / 293,304 | 121 / 293,304 | 121 / 293,304 |
| 3 Living room | 159 / 226,022 | 159 / 226,022 | 160 / 230,438 |
| 4 Balcony | 83 / 155,334 | 83 / 155,334 | 83 / 155,334 |

All within the 250-call budget.

## Screenshots inspected
All 4 chapter PNGs at desktop-1280, desktop-1440 and desktop-1920, plus the `-reduced` variants (byte-identical in size to the normal shots, since reduced motion snaps to the same keyframes). Checked:
- Arrival: fluted fins, bronze glass, lit canopy and garden-court trees read. No floating geometry.
- Lobby: coffered ceiling, LED cove, travertine cores with bronze portals, globe pendant, olive sofa and two boucle chairs on the rug, olive trees, console. No desk.
- Living room: oak planks at real scale, olive linen sofa, marble coffee table on the wool rug, leather armchair, arc floor lamp, dining for six with linear pendant, plant, sheers. No cream plane.
- Balcony: bronze cap rail in the foreground, lit blocks, the river as a lighter sun-glinted band to the west.
- No z-fighting, shadow acne, blown emissives or purple hue seen. The paper panel stays opaque and readable. No set-file fixes were needed in FEAT-004.

Known limits (carried from FEAT-002/003, not defects that block): the kitchen island is outside the ch3 frame; the balcony glass panels are barely visible at ch4 (the rail reads); loungers only show during the ch3→ch4 move; the reflecting pool is not legible from the ch1 street camera. The scene descriptions mention only what the chapter frames show, so the island, loungers and pool are left out of them.

## Cross-FEAT integration check (fixer, iteration 1)
`review.json` held only the reset placeholder, so this run checked the seams between FEAT-001..004. No code changes were needed.
- Build: passes. `dist\assets\scene-DzzS0Pl9.js` **645.90 kB / 170.90 kB gzip** (budget 680 / 175).
- Unit: **8 files, 71 tests passed** (1.97 s).
- E2E: **45 passed (8.0 min)**, 2 workers, no timeouts. This includes `screenshots.spec.js` (the same spec `run shots` runs), so all PNGs under `screenshots\` and `tests\screenshots\` were regenerated by this run.
- Draw calls / triangles from the e2e `[render-info]` log: ch1 124 / 307,062; ch2 121 / 293,304; ch3 159 / 226,022 (1920: 160 / 230,438); ch4 83 / 155,334. The numbers match at 1280 and 1440, and all are under 250.
- Seams checked in code:
  - Light count: lobby and residence each have exactly 3 PointLights. The exterior, ground and skyline add none, so the visible light count stays the same across the lift swap and nothing recompiles.
  - Dispose: geometries, materials and textures are each collected in a Set and disposed once. PMREM render-target textures are skipped and freed by `lighting.dispose()`. When `mats.dispose()` runs after that, re-disposing a palette material is a no-op in three.
  - Imports, determinism and DOM use: no broken imports (build and e2e load the chunk with no console errors). No `Math.random` anywhere in `src`. Inside `src\scene`, `document` is only used by `exterior.js`, `skyline.js`, `fallback.js` and `webgl-support.js`, plus `index.js` for its `visibilityState` check. No temporary specs are left in `tests\e2e`.
- Screenshots opened: all 4 chapters at 1280, 1440 and 1920, plus the `-reduced` variants at 1440 (ch3, ch4), 1920 (ch3) and 1280 (ch4). Each reduced shot has the same byte size as its normal shot. No floating or clipped geometry, z-fighting, shadow acne, blown emissives or purple. The river reads at ch4 in every project, and the panel stays readable. The known limits listed above are unchanged.

## Review findings (3D realism)
- F1 stray cream plane: **fixed** (FEAT-003). The lamp-shade box is gone; the keep-out corridor is enforced by `tests\unit\residence-layout.test.js`.
- F2 river not legible: **fixed** (FEAT-002/003). West sightline wedge in `skyline.js`, reflective river with ripple normal map; visible at ch4 in every project.
- F3 amenity one-liners missing from PRODUCT.md: **fixed** (FEAT-004). PRODUCT.md now has "Amenity copy (verbatim)" and "3D scene descriptions (verbatim text alternatives)".

# A+B presentation redesign (iteration 1)

`review.json` only had the reset placeholder, so this was the first iteration and the full plan (A1–A5) was implemented.

Environment note: in this session, foreground shell commands returned exit -1 with no output. Every command was run as a background `cmd /c "... > file 2>&1"` and the output file was read back. The commands were `npm.cmd --prefix C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn run build | test:unit | test:e2e [-- --workers=1] | shots`. Those temporary output files have been deleted.

## What changed
- **A. Walkthrough.**
  - The paper `.story-panel`, the paper scrim and the `.story-intro` are gone. The canvas is full-bleed at 100vh and the fixed header floats over it.
  - New `.story-overlay` with neutral-ink scrims only: radial bottom-left, a bottom band and a rail-centred radial on the right.
  - Chapter 1 is the hero intro: `h1` "Tessera Sathorn" in Plex Sans 300, shown once. Chapters 2–4 use `h2`.
  - Specs are one Mono row with hairline separators along the bottom.
  - Right-edge rail (176 px, 56 px buttons) with the `--story-progress` fill, an `aria-current="step"` tick, the existing roving-tabindex arrow keys, and an olive-light focus ring.
  - Header tones `data-tone="scene"|"paper"`: transparent with an ink scrim over the story, paper elsewhere. The logo tiles use CSS classes. "Book a viewing" stays olive in both tones.
  - Nav labels are now Walkthrough · Residences · Amenities · Location.
  - `VIEW_SHIFT` was removed, so the ch1 tower is centred.
  - `heroCap()` in `skyline.js` caps nearby blocks: ≤ 60 % of the tower's elevation angle from the street camera, and ≤ 88 m within 600 m. It also darkens blocks within 600 m. The seeded order is unchanged.
  - ch3 key is `R(3.6,1.6,1.25) → R(-3.6,0.95,-1.9)`, fov 62. The ch3 description in facts.js and PRODUCT.md now mentions the island.
  - While the scene is in explorer mode, the story pose is kept current, so the stage is right on return.
- **B. Tower Explorer** (`#residences`). The residence-types table is gone. The floor-plan tabs are kept underneath as "Floor plans".
  - **Shared renderer.** The explorer uses the same `WebGLRenderer` and canvas. `scene.setMode('story'|'explorer', host, poster)` moves the canvas into `.explorer-scene` and leaves a 2D poster frame behind. Mode is picked by whichever host has more visible height.
  - **Explorer camera.** New pure `explorer-rig.js`: distance 400 m, elevation 6°, fov 28, yaw clamped to ±35°. There is no zoom, and the wheel is ignored.
  - **Model look.** Skyline, ground, residence, sky and sun disc are hidden. A white plinth replaces them, on a paper-2 background with matching fog.
  - **Interaction.** Drag rotates (more than 4 px counts as a drag). Idle sway starts after 4 s and is off under reduced motion. Raycaster picking runs against two pick boxes plus `levelAtHeight`. One hover sleeve and one selected sleeve mesh are added (+3 draw calls with the plinth).
  - **Panel position.** `setViewOffset` keeps the tower centred left of the open panel.
  - **Data.** `src/content/tower.js` holds the zoning (exactly 168 residences: 64/72/30/2), height bands, seeded availability, `describeLevel` and `levelCopy`.
  - **Exterior alignment.** The exterior's recessed amenity storeys were shifted one slab down (`AMENITY = {9, 35}`), so the 3D recesses line up with levels 12 and 38.
  - **Controls.** A native vertical `<input type="range">` (1–42) with `aria-valuetext`. PageUp/PageDown step ±5 and Enter opens the panel. A polite live region announces each level. A tooltip shows "Level N · <type> · <sqm>".
  - **Side panel.** One paper, edge-anchored `role="dialog"` panel with:
    - level, units, area, "From THB …" (Mono), and availability
    - an `aria-pressed` plan switcher and an SVG plan (new `fit` crop)
    - private-lift and sample-level notes
    - "Book a viewing for this residence"
    - Behaviour: focus moves to the title on open and back to the invoker on close. Escape and the close button both close it. Intro and readout are hidden while the panel is open.
  - **Booking.** "Book a viewing…" calls the new `selectUnit()`, scrolls to `#booking` and focuses `#f-name`. "Enter the sample residence" goes to chapter 3 and focuses the third rail button.
  - **`?nowebgl`.** `tower-elevation.js` provides an SVG elevation with 42 clickable `.band` rects that drive the same tooltip, highlight and panel.
  - **Test hook.** `window.__tessera.explorer` exposes selectLevel, open, close, setYaw, getYaw, idle, screenPointForLevel and mode.

## Results (final run, on the final code)
- **Build:** passes. `dist\assets\scene-CMPXeyas.js` is **651.28 kB / 172.99 kB gzip** (budget 680 / 175). Main chunk 42.14 kB, CSS 35.18 kB.
- **Unit:** **12 files, 91 tests passed**. That is the 8 earlier files plus:
  - `tower.test.js`: 168 total, mix 64/72/30/2, amenity/wellness/penthouse labels, `typeRange` = `UNITS.floors`, bands, `levelAtHeight`, availability, descriptions
  - `explorer-rig.test.js`
  - `skyline-hero.test.js`
  - `tower-elevation.test.js`
  - a new fit-mode case in `floorplans.test.js`
  - `residence-layout.test.js` passes with the new ch3 key.
- **E2E:** **78 passed (22.0 min)** with `--workers=1`. It covers:
  - `explorer.spec.js` ×3 projects: keyboard range + Enter/Escape/close focus return, mouse hover tooltip + canvas click via `screenPointForLevel`, book preselects `3br` with `#f-name` focused and `#booking` in view, the sample residence opens chapter 3, the draw-call budget, no idle rotation under reduced motion, and `?nowebgl` band click + Escape
  - axe at zero violations of any impact for default, `?nowebgl`, the explorer panel open, the `?nowebgl` panel open and the form error state
  - a new rail position/44 px test, the 44 px test with the panel open, and smoke asserting the nav labels, a single h1, no `.story-panel`/`.units-table`, and 42 SVG bands under `?nowebgl`
- **Earlier runs in this session.** A 2-worker run had 78/78 pass. A later 2-worker run had 10 failures, all `openReady` timeouts: the page JS had not executed within 20 s, with `main` still empty. The host was heavily loaded by other processes at the time (Kiro, Docker, Chrome), and the failures were not assertion failures. The final run, at 1 worker, passed 78/78.
- **Draw calls / triangles** (`[render-info]`, identical at 1280 and 1440, with 1920 in brackets):

  | Pose | Calls / triangles | 1920 |
  |---|---|---|
  | ch1 | 124 / 307,050 | |
  | ch2 | 119 / 292,860 | (120) |
  | ch3 | 165 / 228,034 | (169 / 228,940) |
  | ch4 | 84 / 155,324 | |
  | explorer | 107 / 232,104 | |

  All are ≤ 250.
- **Preview server:** only the Playwright `webServer` started it. After the run, port 4173 had no listener, only TIME_WAIT sockets. `test-results\` was deleted. No `*.log` files were touched, and `checkers.py` was not touched.

## Screenshots (opened and checked)
Location: `C:\Users\dusitm\Desktop\Test-Kiro\tessera-sathorn\screenshots\desktop-{1440,1920,1280}\` (mirrored to `tests\screenshots\`):
- `chapter-01-arrival` … `chapter-04-balcony` (+ `-reduced`)
- `section-explorer`, `section-explorer-hover`, `section-explorer-panel` (level 24), `section-explorer-panel-38`
- `section-explorer-nowebgl`, `section-explorer-nowebgl-panel`
- `section-floorplans`, `section-*`, `full-page`, `fallback-nowebgl`, `section-booking-errors`

What I checked:
- **No opaque card over the scene** in any chapter at 1280, 1440 or 1920. Text sits on neutral ink gradients only.
- **Hero tower centred and dominant in ch1** at all three sizes. It is the tallest form, and nearby blocks are lower and darker.
- **ch3:** the walnut island with its marble top and stools is clearly in frame on the right. The sofa, rug, coffee table, armchair and dining set read whole on the left and centre.
- **Legibility:** title, lede and spec row are legible over every chapter. The facade value wraps to 2 lines as the plan allows. The rail is legible over the bright ch3 wall and island after the rail scrim was strengthened.
- **No overlap** between the header, the rail (vertically centred on the right), the title block (bottom-left) and the spec row (bottom).
- **Explorer idle:** tower centred, the level scale aligned to the tower's projected top and base, zone labels next to it, and the readout bottom-left clear of the model.
- **Hover:** the olive sleeve is on level 24 and the tooltip reads "Level 24 · 1–3 Bedroom · 58–168 sqm".
- **Panel open:** one flush-right paper panel with no nested boxes. The tower re-centres left of the panel. Intro and readout are hidden, so nothing overlaps at 1280, 1440 or 1920.
- **`?nowebgl`:** the SVG elevation re-centres when the panel opens.

Defects found while inspecting, all fixed and re-verified:
- the rail was faint over the bright ch3 wall (stronger rail-centred scrim)
- the lede had an orphan word (`text-wrap: balance`)
- the readout overlapped the plinth (moved bottom-left, stacked)
- the 1920 intro overlapped the shifted tower with the panel open (intro and readout hidden while open)
- the plan in the panel was tiny (`fit` crop)
- the `?nowebgl` scale labels were clipped by the panel (the SVG narrows while open)
- the full page showed the lobby frame after returning from the explorer (story pose kept current)
- the amenity panel button read "for this residence" (now "Book a viewing")

## Contrast reasoning
- **Overlay text** is paper `#F4F1EA` and on-dark-2 `#B9B4A7` over neutral ink scrims:
  - bottom-left radial alpha: 0.86 at the corner, 0.72 at 40 %
  - bottom band: up to 0.74
  - rail radial: 0.84 → 0.76
  - header: 0.8 → 0.55
- **Worst case over the brightest scene pixel:** amber `#C98B5A`, or the ch3 plaster `#E6E0D4` behind the rail. At alpha ≥ 0.72 the composite is ≤ about `#4A4239`, which gives paper ≥ 7:1 and on-dark-2 ≥ 4.5:1. All overlay text also has a 1–2 px ink text-shadow.
- **Explorer text** is ink and ink-2 on paper/paper-2, and the zone labels get a paper halo where they cross the plinth shadow.
- **Not verifiable automatically:** axe cannot measure text over a WebGL canvas, so the overlay figures are calculated, not measured. The screenshot pass was the visual gate.

## Known limits
- The intro copy says "Drag to turn the tower" under `?nowebgl` too, where only clicking bands applies.
- The 1 Bedroom "Bath/Entry" labels in the plan overlap slightly. This comes from the existing plan drawing and also shows in the Floor plans tabs.
