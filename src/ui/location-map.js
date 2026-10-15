// Stylized, hand-placed SVG map of the Sathorn area. Not to scale. North up.

const INK = '#1A1A17';
const INK2 = '#4A4A43';
const OLIVE = '#4F5A2A';
const RULE = '#CFC9BC';

const label = (x, y, text, { rotate = 0, anchor = 'start', fill = INK2, size = 11, weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}"` +
  (rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '') +
  `>${text}</text>`;

const station = (x, y) =>
  `<circle cx="${x}" cy="${y}" r="5.5" fill="#F4F1EA" stroke="${INK}" stroke-width="2"/>`;

export function locationMapSvg() {
  const minor = [
    'M150 470 L330 420',
    'M200 150 L250 520',
    'M300 120 L340 300',
    'M520 330 L560 540',
    'M600 300 L640 520',
    'M250 80 L560 20',
    'M560 420 L800 380',
    'M330 470 L560 410',
  ]
    .map((d) => `<path d="${d}" stroke="${RULE}" stroke-width="1.2" fill="none"/>`)
    .join('');

  return `<svg viewBox="0 0 800 560" role="img" aria-labelledby="map-title map-desc" xmlns="http://www.w3.org/2000/svg" font-family="'IBM Plex Mono', monospace" letter-spacing="1">
<title id="map-title">Map of Tessera Sathorn and its surroundings</title>
<desc id="map-desc">Tessera Sathorn sits on Sathorn Road just east of Narathiwat Ratchanakharin Road. BTS Chong Nonsi is about 350 m to the north-west on foot. Lumphini Park lies to the north-east beyond Rama IV Road, and the Chao Phraya River curves along the west. Not to scale.</desc>
<rect width="800" height="560" fill="#EAE6DC"/>
${minor}
<path d="M70 0 C160 140 30 300 110 400 S150 520 60 560" stroke="#D3D2C6" stroke-width="38" fill="none" stroke-linecap="butt"/>
${label(132, 250, 'CHAO PHRAYA RIVER', { rotate: -90, anchor: 'middle' })}
<rect x="632" y="40" width="158" height="196" fill="#DADDC8" stroke="${OLIVE}" stroke-width="1"/>
${label(711, 132, 'LUMPHINI', { anchor: 'middle', fill: INK })}
${label(711, 148, 'PARK', { anchor: 'middle', fill: INK })}
<path d="M90 320 L529 178" stroke="${INK}" stroke-width="2" fill="none"/>
${label(226, 266, 'SILOM ROAD', { rotate: -17.9, anchor: 'middle' })}
<path d="M110 402 L620 250" stroke="${INK}" stroke-width="3.5" fill="none"/>
${label(250, 384, 'SATHORN ROAD', { rotate: -16.6, anchor: 'middle', fill: INK, weight: 500 })}
<path d="M380 60 L620 250 L800 262" stroke="${INK}" stroke-width="3" fill="none"/>
${label(452, 108, 'RAMA IV ROAD', { rotate: 38.4, anchor: 'middle' })}
<path d="M392 135 L480 532" stroke="${INK}" stroke-width="2.5" fill="none"/>
${label(472, 452, 'NARATHIWAT RATCHANAKHARIN RD', { rotate: 77.4, anchor: 'middle', size: 10 })}
<path d="M529 178 L417 214 L426 255 L436 297 L260 350 L120 392" stroke="${INK2}" stroke-width="4" stroke-dasharray="10 4" fill="none"/>
${station(529, 178)}${label(541, 170, 'Sala Daeng', { fill: INK, size: 12 })}
${station(426, 255)}${label(402, 264, 'Chong Nonsi', { fill: INK, size: 12, anchor: 'end' })}
${station(260, 350)}${label(260, 334, 'Surasak', { fill: INK, size: 12, anchor: 'middle' })}
<path d="M478 304 L438 316 L431 306 L426 262" stroke="${OLIVE}" stroke-width="2.5" stroke-dasharray="2 4" stroke-linecap="round" fill="none"/>
${label(442, 234, '350 M ON FOOT', { fill: OLIVE, size: 11, weight: 500 })}
<g transform="translate(470 312)">
<rect x="0" y="0" width="8" height="8" fill="${INK}"/><rect x="10" y="0" width="8" height="8" fill="${OLIVE}"/>
<rect x="0" y="10" width="8" height="8" fill="${INK}"/><rect x="10" y="10" width="8" height="8" fill="${INK}"/>
</g>
${label(496, 334, 'TESSERA SATHORN', { fill: INK, size: 12, weight: 500 })}
<g transform="translate(40 44)"><path d="M0 18 V-14 M-6 -6 L0 -14 L6 -6" stroke="${INK}" stroke-width="1.5" fill="none"/>${label(12, 4, 'N', { fill: INK })}</g>
${label(24, 536, 'NOT TO SCALE · BTS SILOM LINE DASHED', { size: 10 })}
</svg>`;
}
