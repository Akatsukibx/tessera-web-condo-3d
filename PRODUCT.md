# PRODUCT.md — Tessera Sathorn

Final project name: **Tessera Sathorn** (use this exact spelling everywhere; short form "Tessera" is allowed in running copy).

Name check: a web search for "Tessera Sathorn" condominium Bangkok returned no real project with this name. The nearest real names are "The Issara Sathorn", "Sathorn House", "Sathorn Gardens" and "The Met". Tessera Sathorn is clearly distinct from all of them.

## Summary

Tessera Sathorn is a fictional high-rise luxury condominium in Sathorn, Bangkok. This website is a concept demo: a desktop-first, English-only marketing site. Its centrepiece is a scroll-driven Three.js scene that walks the visitor from the street, through the lobby, into a sample residence and out to a balcony at dusk. Each step carries spec notes in the style of an architecture magazine.

"Tessera" is a single tile in a mosaic. The brand idea is precise, modular, well-made parts that add up to a calm whole. The logo mark is a square split into four tiles, with one tile in olive.

## Audience

- Affluent Thai buyers looking for a primary city residence in the CBD.
- International buyers and investors, including foreign freehold quota buyers, who compare Bangkok with Singapore and Hong Kong.
- They are short on time and fluent in property. They want facts (size, price, floor, orientation, transit) more than adjectives.

## Goals

1. Convey quality through restraint, precise detail and real numbers.
2. Let the visitor understand the residence spatially via the 3D walkthrough.
3. Make the unit types and prices easy to compare (table + floor plans).
4. Show the location advantage: BTS Chong Nonsi on foot, Lumphini Park, the river.
5. Convert visitors to "Book a private viewing".

## Key messages

- A short walk to BTS Chong Nonsi, in the centre of Sathorn.
- 168 residences across 42 storeys. Few homes per floor, generous ceilings.
- Freehold ownership. Completion Q4 2028.
- Considered materials and 3.1 m ceilings throughout.
- Sky lounge and a 35 m infinity pool on level 38.

## Facts (single source of truth; must match everywhere)

| Item | Value |
|---|---|
| Name | Tessera Sathorn |
| Type | High-rise luxury condominium |
| Location | Sathorn, Bangkok |
| Transit | BTS Chong Nonsi, approx. 350 m walk (about 5 min) |
| Nearby | Lumphini Park, Chao Phraya River |
| Storeys | 42 |
| Residences | 168 |
| Tenure | Freehold |
| Completion | Q4 2028 |
| Ceiling height | 3.1 m (residences) |
| Private lift lobby | 3 Bedroom and Penthouse residences |
| Level 38 | Sky lounge + 35 m infinity pool |
| Other amenities | Residents' library, wellness floor |
| Design | Credited only as "design studio" (no invented firm names) |

Unit types:

| Type | Interior | From |
|---|---|---|
| 1 Bedroom | 58 sqm | THB 18.9M |
| 2 Bedroom | 96 sqm | THB 31.5M |
| 3 Bedroom | 168 sqm | THB 58M |
| Penthouse (duplex, floors 41–42) | 420 sqm | Price on request |

Supporting details the plan adds. These are coherent with the facts above, so use them as given:
- Residents' library on level 3. Wellness floor (gym, sauna, treatment rooms) on level 12.
- Sample residence in the 3D story: a 2 Bedroom (96 sqm) on level 34, living room facing west toward the river.
- Lobby: double-height, 7.2 m.
- Approximate distances: Lumphini Park 1.9 km, Chao Phraya River (Sathorn Pier) 2.2 km.

## Tower zoning (used by the Tower Explorer, `src/content/tower.js`)

| Levels | Use | Residences per level | Count |
|---|---|---|---|
| 1–2 | Lobby, double height (7.2 m) | – | 0 |
| 3 | Residents' library | – | 0 |
| 4 | Podium, building services | – | 0 |
| 5–11 | Residential | 3 × 1 Bedroom + 3 × 2 Bedroom | 42 |
| 12 | Wellness floor | – | 0 |
| 13 | Residential | 3 × 1 Bedroom + 3 × 2 Bedroom | 6 |
| 14–33 | Residential | 2 × 1 Bedroom + 2 × 2 Bedroom + 1 × 3 Bedroom | 100 |
| 34–37 | Residential (34 is the sample residence level) | 2 × 2 Bedroom + 1 × 3 Bedroom | 12 |
| 38 | Sky lounge + 35 m infinity pool | – | 0 |
| 39–40 | Residential | 3 × 3 Bedroom | 6 |
| 41–42 | Penthouse duplex | 2 duplex penthouses across both levels | 2 |
| **Total** | | | **168** |

By type: 1 Bedroom 64, 2 Bedroom 72, 3 Bedroom 30, Penthouse 2. Availability shown in the explorer is fictional and seeded, so it is the same on every load.

## Story chapters (3D, verbatim copy)

1. **Arrival.** "A tower of 42 storeys, set back from Sathorn Road behind a garden court." Specs: Height 148 m · Storeys 42 · Residences 168 · Facade: fluted precast concrete, bronze-tinted glass.
2. **Lobby.** "A double-height hall in travertine and oak, with no front desk in the way." Specs: Ceiling 7.2 m · Floor: honed travertine · Walls: rift-cut oak slats.
3. **Living room.** "Level 34. A 2 Bedroom residence, open to the west." Specs: Interior 96 sqm · Ceiling 3.1 m · Orientation: west · Floor: engineered oak.
4. **Balcony at dusk.** "The city turns on its lights. The river is to the west." Specs: Level 34 · Balcony depth 2.4 m · View: west across Sathorn · Balustrade: low-iron glass.

## Amenity copy (verbatim)

1. Level 38 · **Sky lounge.** "A residents’ lounge near the top of the tower, open to the west."
2. Level 38 · **35 m infinity pool.** "A 35 m pool beside the sky lounge, with the city below."
3. Level 12 · **Wellness floor.** "Gym, sauna and treatment rooms on one floor."
4. Level 3 · **Residents’ library.** "A quiet reading room with long tables."
5. 3 Bed · PH · **Private lift lobby.** "3 Bedroom and Penthouse residences open from a private lift lobby."

## 3D scene descriptions (verbatim text alternatives)

1. **Arrival.** "Street view at dusk of a 42-storey tower with fluted concrete fins and bronze glass. A lit entrance canopy sits behind a garden court with trees."
2. **Lobby.** "Inside the double-height lobby: a travertine floor, a wall of oak slats and two lift cores. A globe pendant hangs over an olive sofa and two lounge chairs on a wool rug, with olive trees in planters and no front desk."
3. **Living room.** "A level 34 living room facing west: an oak floor, an olive linen sofa, a marble coffee table on a wool rug, a walnut dining table for six and a walnut kitchen island with a marble top, with full-height glazing over the city."
4. **Balcony at dusk.** "From the balcony at dusk, past a glass balustrade with a bronze rail, looking west across lit city blocks to the river under an amber sky."

## Hard constraints

- English only. Short, clear, restrained copy. No exclamation marks.
- Banned words: unparalleled, world-class, best-ever, iconic, breathtaking, luxurious lifestyle, exclusive (as hype), stunning, ultimate.
- No lorem ipsum, no placeholder text, no stock or placeholder images. Every visual is procedural 3D or hand-built SVG.
- No generic AI look: no purple-blue gradients, no emoji as icons (SVG line icons only), no cards nested in cards, and no repeated "hero + 3 cards" pattern.
- Palette: paper white, near-black ink, olive as the only accent. All text passes WCAG AA.
- Type: IBM Plex Sans + IBM Plex Mono (Mono for numbers, areas, prices, specs).
- Desktop-first with a mouse: design at 1440×900 and 1920×1080, and it must not break at 1280×800. Mobile only needs a graceful single-column fallback.
- Accessibility: AA contrast, targets ≥ 44 px, visible focus, full keyboard operation, semantic landmarks, labelled form fields, errors linked with aria-describedby, and a text alternative for the 3D scene.
- Respect prefers-reduced-motion. Without WebGL, show a styled static SVG fallback, never a blank canvas.
- Booking form is client-side only. It must say clearly that no data is sent.
- Footer note, verbatim: "Concept demonstration. Tessera Sathorn is a fictional project."
