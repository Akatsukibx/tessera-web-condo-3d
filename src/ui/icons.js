// SVG line icons on a 24px grid, 1.5px stroke, drawn by hand. Decorative only (aria-hidden).

const PATHS = {
  // Sofa: lounge
  lounge:
    '<path d="M4 11V8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V11"/>' +
    '<path d="M3 11.5h3V15h12v-3.5h3V17H3z"/><path d="M5 17v2M19 17v2"/>',
  // Water lines: pool
  pool:
    '<path d="M3 15c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1"/>' +
    '<path d="M3 19c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1"/>' +
    '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0M16 13V5.5a1.5 1.5 0 0 1 3 0M8 8h8M8 11h8"/>',
  // Dumbbell: wellness
  wellness:
    '<path d="M8.5 12h7"/><rect x="5" y="8" width="3.5" height="8" rx="0.5"/>' +
    '<rect x="15.5" y="8" width="3.5" height="8" rx="0.5"/><path d="M3 10.5v3M21 10.5v3"/>',
  // Open book: library
  library:
    '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/>' +
    '<path d="M12 6.5v13"/>',
  // Lift doors with arrows
  lift:
    '<rect x="4" y="3" width="16" height="18" rx="0.5"/><path d="M12 3v18"/>' +
    '<path d="M7 10l1.5-1.5L10 10M14 8.5l1.5 1.5L17 8.5"/>',
  // Close: two crossed lines
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};

/**
 * @param {keyof typeof PATHS} name
 * @returns {string} SVG markup
 */
export function icon(name) {
  const body = PATHS[name] || '';
  return (
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
  );
}
