// Highlights the primary nav link for the section currently in view, and switches the fixed
// header between its scene tone (over the walkthrough) and its paper tone (everywhere else).

function initHeaderTone() {
  const header = document.querySelector('.site-header');
  const story = document.getElementById('story');
  if (!header) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const over = story ? story.getBoundingClientRect().bottom > header.offsetHeight : false;
    header.dataset.tone = over ? 'scene' : 'paper';
  };
  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

export function initNav() {
  initHeaderTone();
  const links = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
  // Observe every main section so the highlight clears on sections without a nav link
  // (overview, booking) instead of sticking on the last linked one.
  const sections = [...document.querySelectorAll('main section[id]')];
  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const setCurrent = (id) => {
    links.forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => io.observe(s));
}
