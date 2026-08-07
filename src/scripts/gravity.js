// The hero 99's concentric rings gravitate toward the pointer — inner
// rings pulled hardest, so the mark seems to watch the cursor. Desktop
// fine-pointers only, and only when the user has not asked for reduced
// motion. Touch devices never see this.
import { gsap } from 'gsap';

const fine = window.matchMedia('(pointer: fine)').matches;
const motionOk = document.documentElement.classList.contains('motion');
const svg = document.querySelector('.hero-99');

if (fine && motionOk && svg) {
  // Paths come in two digit groups of four, outermost ring first.
  const RINGS = 4;
  // SVG user units. Ring gap is 8 minus the stroke, and adjacent rings
  // drift apart by at most MAX_SHIFT / RINGS, so neighbors never touch.
  const MAX_SHIFT = 6;

  const movers = Array.from(svg.querySelectorAll('.ml99-path')).map(
    (path, i) => {
      const depth = ((i % RINGS) + 1) / RINGS;
      return {
        depth,
        x: gsap.quickTo(path, 'x', { duration: 0.5, ease: 'power3.out' }),
        y: gsap.quickTo(path, 'y', { duration: 0.5, ease: 'power3.out' }),
      };
    }
  );

  window.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const nx = gsap.utils.clamp(
      -1,
      1,
      (e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)
    );
    const ny = gsap.utils.clamp(
      -1,
      1,
      (e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)
    );
    movers.forEach((m) => {
      m.x(nx * MAX_SHIFT * m.depth);
      m.y(ny * MAX_SHIFT * m.depth);
    });
  });
}
