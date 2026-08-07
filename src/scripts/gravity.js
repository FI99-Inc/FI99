// The hero 99's concentric rings gravitate toward the pointer — inner rings
// pulled hardest, so the mark seems to watch you. Runs whenever motion is
// allowed; only the input differs. Fine pointers track the cursor across the
// whole window. Touch tracks the finger instead, which covers both a
// deliberate drag on the mark and an ordinary scroll gesture, since a scroll
// is a touchmove too — so the rings stay alive on phones without a cursor.
import { gsap } from 'gsap';

const motionOk = document.documentElement.classList.contains('motion');
const svg = document.querySelector('.hero-99');

if (motionOk && svg) {
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

  const pull = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    const nx = gsap.utils.clamp(
      -1,
      1,
      (clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2)
    );
    const ny = gsap.utils.clamp(
      -1,
      1,
      (clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2)
    );
    movers.forEach((m) => {
      m.x(nx * MAX_SHIFT * m.depth);
      m.y(ny * MAX_SHIFT * m.depth);
    });
  };

  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => pull(e.clientX, e.clientY));
  } else {
    const track = (e) => {
      const touch = e.touches[0];
      if (touch) pull(touch.clientX, touch.clientY);
    };
    // passive: the handler only reads coordinates, so the browser must not
    // wait on it before scrolling.
    window.addEventListener('touchstart', track, { passive: true });
    window.addEventListener('touchmove', track, { passive: true });
    // Lifting off releases the rings back to rest rather than stranding them
    // wherever the finger happened to leave the screen.
    window.addEventListener('touchend', () => {
      movers.forEach((m) => {
        m.x(0);
        m.y(0);
      });
    });
  }
}
