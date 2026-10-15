# Cinematic full-bleed walkthrough and Tower Explorer (A+B)

The paper story panel is gone. The walkthrough is now a full-bleed 3D stage, with the chapter text sitting directly on neutral-ink scrims and a right-edge chapter rail. The residence table has been replaced by a Tower Explorer that reuses the same WebGL renderer and canvas, on a paper-2 "scale model" background, with a native vertical range control, Raycaster picking and a slim right-edge paper panel. The structural goals are met at 1280, 1440 and 1920: no opaque box over the scene, a centred and dominant hero tower, the project title shown only in chapter 1, correct nav labels, an exact 168-residence zoning with a unit test, and a working `?nowebgl` elevation. Pixel sampling of the screenshots still finds a contrast failure in the small olive-light chapter index label.

Watch for: the `01 / 04 · ARRIVAL` index label measures about 3.4–3.7:1 against its scrim at all three viewports, and `04 / 04` sits on lit skyline windows (**confirmed**, sampled). The rail scrim reads as a visible dark halo in the ch1 sky and on the ch3 white wall (**confirmed**, visual). The 1 Bedroom plan's Bath/Entry labels collide inside the new panel (**confirmed**, visual, carried over from the existing drawing).

**Verdict**: NEEDS_CHANGES

## High-level view

The walkthrough now follows the cinematic pattern: the scene fills the viewport, the title block anchors bottom-left on a radial ink scrim, the specs run as a single Mono row along the bottom, and the rail is vertically centred on the right. All gradients are neutral `rgba(20,20,18,…)`. Paper text and the spec row clear AA comfortably. The one small text element in the accent colour does not: olive-light at 13 px on a background of L ≈ 0.08–0.095 gives about 3.5:1, against the 4.5:1 required. The plan's contrast budget assumed alpha ≥ 0.6 ink behind the text, but the ch1 label sits higher in the radial falloff, where the sky shows through.

The hero composition is fixed. With `VIEW_SHIFT` removed and `heroCap()` lowering and darkening the near skyline, the tower is centred at every viewport and is clearly the tallest, brightest form. The rail scrim was strengthened to protect the rail labels over the ch3 wall. It is a 400×300 radial with a long falloff, so on bright or flat frames it shows as a dark circular stain. The rail text measures fine. The scrim itself undercuts the "pro" finish the user asked for.

The Tower Explorer meets the interaction contract in code and in e2e. Picking runs a Raycaster against proxy boxes plus `levelAtHeight`. Escape and focus return are handled on the panel. `selectUnit` is followed by a scroll to `#booking` and focus on `#f-name`, and `setViewOffset` keeps the tower centred left of the panel. The panel is a single flush-right paper surface with hairline rows, not cards. Level 38 and the 41–42 crown get distinct labels in the scale, tooltip and panel, and `tower.test.js` asserts 168 = 64/72/30/2. The visual blemish is the reused 1 Bedroom plan SVG: in the panel's `fit` crop, its Bath/Entry labels and areas overprint each other and spill past the wall line.

<details>
<summary>Issues (3)</summary>

1. **Chapter index label fails AA contrast** — `.chapter .index-label` (olive-light `#A9B77A`, 13 px) measures about 3.4–3.7:1 over the ch1 scrim at 1280, 1440 and 1920, and drops to about 2–4:1 where `04 / 04` crosses lit windows in ch4. Render the label in `--on-dark` (paper), or raise the scrim alpha at the label's height to ≥ 0.8 so its background is L ≤ 0.04. Then re-sample.
2. **Rail scrim reads as a dark halo** — `.scrim-r` (radial 400×300 at 0.84→0.76→0) leaves a visible circular smudge in the ch1/ch2 sky and on the ch3 white wall. Replace it with a soft vertical band (a linear 270° gradient behind the rail, or a tighter ellipse with a shorter falloff) that keeps the rail labels at ≥ 4.5:1 without a visible blob.
3. **Plan labels collide in the floor panel** — in `section-explorer-panel` (all three viewports), the 1 Bedroom "Bath 5.3 sqm" / "Entry 8 sqm" labels overprint and extend past the plan outline. Fix the label placement for small rooms in `floorplans.js` (stack, abbreviate or leader-line), since the plan is now a primary element of the explorer.

</details>

<details>
<summary>Details</summary>

### Index-label contrast over the scrim

Background luminance was sampled from the PNGs in 6 px strips directly above and below each label, excluding glyph pixels. The figures are relative luminance. Olive-light `#A9B77A` is L = 0.437, paper is L = 0.88 and on-dark-2 is L = 0.46.

```
ch1 1440  label strip bg L 0.072–0.083  → olive-light ≈ 3.5–3.7:1   FAIL (needs 4.5)
ch1 1920  bg L 0.084–0.098               → ≈ 3.3–3.6:1             FAIL
ch1 1280  bg L 0.082–0.094               → ≈ 3.4–3.7:1             FAIL
ch4 1440  bg p50 0.009 / p80 0.083 / max 0.152 (lit windows) → ≈ 2.4–3.7:1 on window pixels  FAIL
ch4 1280  bg max 0.145; ch4 1920 bg max 0.246  → same pattern     FAIL
ch2/ch3   bg L 0.020–0.028               → ≈ 6–7:1                 pass
```

Paper text passes everywhere, including the ch1 title and lede (≥ 7:1 at L 0.08) and the ch3 lede over the rug (background L ≤ 0.075). The spec row passes (L ≤ 0.03 behind it). So do the rail labels: L 0.016–0.042 behind on-dark-2 gives ≥ 5.7:1, including the ch3 wall. The failure is specific to the accent-coloured index label (**confirmed**). The `rgba(20,20,18,.35)` text-shadow is too faint to change the measured ratio.

verification.md's contrast section claims "at alpha ≥ 0.72 the composite is ≤ #4A4239". That holds only nearer the corner of the radial. The ch1 label sits about 400 px up the stage, where the effective alpha over the slate sky is lower. The verification itself notes that axe cannot measure this, so the screenshots are the gate.

### Rail scrim halo

`.scrim-r` is `radial-gradient(400px 300px at calc(100% - var(--edge) - 88px) 50%, .84 → .76 at 55% → 0)`. The plateau out to 55 % followed by a fast fade gives the ellipse a hard visible edge. In ch1 (all viewports) it shows as a dark ring in the open sky to the right of the tower. In ch3 it puts a grey disc on the white wall and pendant area. The rail text it protects only needs a narrow band around x = right edge − 176 px. A vertical linear band, or a radial with a monotonic falloff and no plateau, would keep the measured ≥ 5.7:1 without the stain (**confirmed**, visual).

### Explorer and panel

In the idle state (1280/1440/1920), the tower sits centred on the travertine plinth, and the scale track runs from the roof to the base. The zone labels (42–41 Penthouse, 38 Sky lounge · Pool, 34 Sample residence, 12 Wellness, 3 Library, 1–2 Lobby) sit to its right, and the intro and readout sit left with no overlap. In the hover state, the olive sleeve is on level 24 and the tooltip reads "Level 24 · 1–3 Bedroom · 58–168 sqm". With the panel open, there is a single paper panel with a left hairline, the tower re-centred left of it, and the intro and readout hidden. Level 38 shows "Sky lounge and 35 m infinity pool", the amenity copy, "No residences on this level." and a plain "Book a viewing". Under `?nowebgl`, the SVG elevation with 42 bands appears, the selected band is olive and the same panel opens.

The panel title wraps as "Residences on level / 24" at 1440 and 1920, leaving an orphaned number (minor, not listed as an issue). The 1 Bedroom plan's Bath and Entry cells are too narrow for their labels, so "5.3 sqm" and "8 sqm" overprint and run past the outer wall (**confirmed**). verification.md lists this as a known limit. It is now the most prominent graphic in the panel, so it needs fixing rather than accepting.

### Checks that pass

- **Walkthrough.** No opaque box over the scene in any chapter at any of the three viewports. The project title appears only in ch1 (h1). Ch2–4 show only their chapter titles. The header, title block, spec row and rail do not collide anywhere, though the spec row's top rule ends well short of the rail.
- **Navigation and content.** The nav reads Walkthrough · Residences · Amenities · Location. The footer note is present verbatim. There are no emoji, no purple or blue gradients and no cards-in-cards.
- **Draw calls.** Per verification.md, the most is 169 (ch3 at 1920) and explorer mode uses 107, all within the 250 budget.
- **Build, unit and e2e** (as recorded in verification.md): the build passes (chunk 651 kB / 173 kB gzip), 91 unit tests pass and 78 e2e tests pass at 1 worker. A 2-worker run had 10 `openReady` timeouts. The final 1-worker run passed and the 10 failures were attributed to host load, which is plausible but means the suite is load-sensitive.
- **Full-page screenshot.** The long ink area below the hero in `full-page.png` is expected: the 400vh story stage is rendered once in a full-page capture. It is not a layout defect.

</details>

<details>
<summary>File map</summary>

- `src/styles/sections.css`: story overlay, scrims (`.scrim-bl/-b/-r`), chapter head and index label, rail, explorer, panel, range, tooltip
- `src/styles/layout.css`: fixed two-tone header
- `src/styles/tokens.css`: `--edge`, `--spec-h`, on-dark tokens
- `index.html`: story overlay markup, explorer markup, nav labels, table removed
- `src/ui/explorer.js`, `src/ui/tower-elevation.js`, `src/content/tower.js`: explorer UI, `?nowebgl` elevation, zoning data
- `src/scene/index.js`, `src/scene/explorer-rig.js`, `src/scene/sets/skyline.js`, `src/scene/camera-rig.js`: shared-canvas modes, picking, view offset, `heroCap`, ch3 key
- `src/ui/booking-form.js`: `selectUnit`
- `tests/unit/tower.test.js`, `explorer-rig.test.js`, `skyline-hero.test.js`, `tower-elevation.test.js`; `tests/e2e/explorer.spec.js`
- Screenshots: `screenshots/desktop-{1280,1440,1920}/`

</details>
