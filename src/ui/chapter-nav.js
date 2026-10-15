// Chapter buttons with roving tabindex. Arrow keys move focus and activate the chapter.

const pad = (n) => String(n).padStart(2, '0');

/**
 * @param {HTMLElement} list  <ol> container
 * @param {{id:string,navLabel:string}[]} chapters
 * @param {(index:number) => void} onSelect
 */
export function createChapterNav(list, chapters, onSelect) {
  list.innerHTML = chapters
    .map(
      (c, i) =>
        `<li><button type="button" data-index="${i}" aria-controls="chapter-${c.id}" tabindex="${i === 0 ? 0 : -1}"${
          i === 0 ? ' aria-current="step"' : ''
        }><span class="num">${pad(i + 1)}</span><span>${c.navLabel}</span></button></li>`,
    )
    .join('');
  const buttons = [...list.querySelectorAll('button')];

  const setActive = (index) => {
    buttons.forEach((b, i) => {
      if (i === index) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    // Keep the roving tab stop on the active chapter unless focus is inside the nav.
    if (!list.contains(document.activeElement)) {
      buttons.forEach((b, i) => (b.tabIndex = i === index ? 0 : -1));
    }
  };

  const focusButton = (index) => {
    buttons.forEach((b, i) => (b.tabIndex = i === index ? 0 : -1));
    buttons[index].focus();
  };

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => onSelect(i));
    btn.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(buttons.length - 1, i + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, i - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = buttons.length - 1;
      if (next === null) return;
      e.preventDefault();
      if (next !== i) {
        focusButton(next);
        onSelect(next);
      }
    });
  });

  return { setActive, buttons };
}
