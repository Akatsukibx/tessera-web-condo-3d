// Single source of truth for all project facts and copy. Values come verbatim from PRODUCT.md.

export const PROJECT = {
  name: 'Tessera Sathorn',
  type: 'High-rise luxury condominium',
  location: 'Sathorn, Bangkok',
  transit: 'BTS Chong Nonsi, approx. 350 m walk (about 5 min)',
  storeys: 42,
  residences: 168,
  tenure: 'Freehold',
  completion: 'Q4 2028',
  ceiling: '3.1 m',
  height: '148 m',
  lobbyHeight: '7.2 m',
  design: 'design studio',
  footerNote: 'Concept demonstration. Tessera Sathorn is a fictional project.',
};

/** @typedef {{id:string,label:string,sqm:number,priceLabel:string,floors:string,note:string}} Unit */

/** @type {Unit[]} */
export const UNITS = [
  { id: '1br', label: '1 Bedroom', sqm: 58, priceLabel: 'THB 18.9M', floors: '5–33', note: '' },
  { id: '2br', label: '2 Bedroom', sqm: 96, priceLabel: 'THB 31.5M', floors: '5–37', note: '' },
  { id: '3br', label: '3 Bedroom', sqm: 168, priceLabel: 'THB 58M', floors: '14–40', note: 'Private lift lobby' },
  { id: 'ph', label: 'Penthouse', sqm: 420, priceLabel: 'Price on request', floors: '41–42', note: 'Duplex, private lift lobby' },
];

/** @typedef {{label:string,value:string}} Spec */
/** @typedef {{id:string,title:string,navLabel:string,lede:string,specs:Spec[],description:string}} Chapter */

/** @type {Chapter[]} */
export const CHAPTERS = [
  {
    id: 'arrival',
    title: 'Arrival',
    navLabel: 'Arrival',
    lede: 'A tower of 42 storeys, set back from Sathorn Road behind a garden court.',
    specs: [
      { label: 'Height', value: '148 m' },
      { label: 'Storeys', value: '42' },
      { label: 'Residences', value: '168' },
      { label: 'Facade', value: 'fluted precast concrete, bronze-tinted glass' },
    ],
    description:
      'Street view at dusk of a 42-storey tower with fluted concrete fins and bronze glass. A lit entrance canopy sits behind a garden court with trees.',
  },
  {
    id: 'lobby',
    title: 'Lobby',
    navLabel: 'Lobby',
    lede: 'A double-height hall in travertine and oak, with no front desk in the way.',
    specs: [
      { label: 'Ceiling', value: '7.2 m' },
      { label: 'Floor', value: 'honed travertine' },
      { label: 'Walls', value: 'rift-cut oak slats' },
    ],
    description:
      'Inside the double-height lobby: a travertine floor, a wall of oak slats and two lift cores. A globe pendant hangs over an olive sofa and two lounge chairs on a wool rug, with olive trees in planters and no front desk.',
  },
  {
    id: 'living',
    title: 'Living room',
    navLabel: 'Living room',
    lede: 'Level 34. A 2 Bedroom residence, open to the west.',
    specs: [
      { label: 'Interior', value: '96 sqm' },
      { label: 'Ceiling', value: '3.1 m' },
      { label: 'Orientation', value: 'west' },
      { label: 'Floor', value: 'engineered oak' },
    ],
    description:
      'A level 34 living room facing west: an oak floor, an olive linen sofa, a marble coffee table on a wool rug, a walnut dining table for six and a walnut kitchen island with a marble top, with full-height glazing over the city.',
  },
  {
    id: 'balcony',
    title: 'Balcony at dusk',
    navLabel: 'Balcony',
    lede: 'The city turns on its lights. The river is to the west.',
    specs: [
      { label: 'Level', value: '34' },
      { label: 'Balcony depth', value: '2.4 m' },
      { label: 'View', value: 'west across Sathorn' },
      { label: 'Balustrade', value: 'low-iron glass' },
    ],
    description:
      'From the balcony at dusk, past a glass balustrade with a bronze rail, looking west across lit city blocks to the river under an amber sky.',
  },
];

export const KEY_FIGURES = [
  { label: 'Storeys', value: '42' },
  { label: 'Residences', value: '168' },
  { label: 'Tenure', value: 'Freehold' },
  { label: 'Completion', value: 'Q4 2028' },
];

export const AMENITIES = [
  {
    icon: 'lounge',
    level: 'Level 38',
    title: 'Sky lounge',
    copy: 'A residents’ lounge near the top of the tower, open to the west.',
  },
  {
    icon: 'pool',
    level: 'Level 38',
    title: '35 m infinity pool',
    copy: 'A 35 m pool beside the sky lounge, with the city below.',
  },
  {
    icon: 'wellness',
    level: 'Level 12',
    title: 'Wellness floor',
    copy: 'Gym, sauna and treatment rooms on one floor.',
  },
  {
    icon: 'library',
    level: 'Level 3',
    title: 'Residents’ library',
    copy: 'A quiet reading room with long tables.',
  },
  {
    icon: 'lift',
    level: '3 Bed · PH',
    title: 'Private lift lobby',
    copy: '3 Bedroom and Penthouse residences open from a private lift lobby.',
  },
];

export const DISTANCES = [
  { label: 'BTS Chong Nonsi', value: '350 m', note: 'About 5 min on foot' },
  { label: 'Lumphini Park', value: '1.9 km', note: 'To the north-east' },
  { label: 'Chao Phraya River', value: '2.2 km', note: 'Sathorn Pier, to the west' },
];
