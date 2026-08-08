// All motion runs through GSAP, gated behind prefers-reduced-motion.
// When the user asks for reduced motion, nothing here runs: the inline
// head script never adds html.motion, so no element is ever hidden.
//
// Every navigation is a client-side swap (see ClientRouter in Base.astro), so
// this boots per page rather than once per module load, and tears its own
// ScrollTriggers down first — they would otherwise pile up pointing at
// elements that no longer exist.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initScramble } from './scramble.js';
import { initSmoothScroll, resetSmoothScroll } from './smoothscroll.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const SNAP = 'power4.out';

function heroIntro() {
  const svg = document.querySelector('.ml99-draw');
  const snaps = gsap.utils.toArray('.hero-snap');
  const tl = gsap.timeline();

  if (svg) {
    const paths = svg.querySelectorAll('.ml99-path');
    paths.forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, {
        strokeDasharray: len,
        strokeDashoffset: len,
        opacity: 1,
      });
    });
    tl.to(paths, {
      strokeDashoffset: 0,
      duration: 0.7,
      stagger: 0.045,
      ease: 'power3.inOut',
    });
  }

  if (snaps.length) {
    tl.to(
      snaps,
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.07, ease: SNAP },
      svg ? '-=0.2' : 0
    );
  }
}

function headingReveals() {
  gsap.utils.toArray('[data-split]').forEach((el) => {
    const split = new SplitText(el, { type: 'chars,words', mask: 'chars' });
    gsap.from(split.chars, {
      yPercent: 120,
      duration: 0.45,
      stagger: 0.02,
      ease: SNAP,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

function scrollReveals() {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: SNAP,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

// Scroll and the cursor both move the same gradient, so neither one writes
// background-position directly — they each own a variable that global.css
// composes into the final position. See .grad-scroll there.
function gradientScroll() {
  const els = gsap.utils.toArray('.grad-scroll');
  if (!els.length) return;
  gsap.to(els, {
    '--grad-scroll': 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
    },
  });
}

// Last known cursor position, kept at module scope so a client-side nav
// re-seeds the new page's mark where the cursor actually is instead of
// snapping it back to centre.
const pointer = { x: 0.5, y: 0.5 };

// pointermove fires several times per frame, so the raw values are eased
// toward on GSAP's ticker rather than tweened per event — a tween per event
// would spend longer being built than being played.
function gradientPointer() {
  const els = gsap.utils.toArray('.grad-scroll');
  // A touch screen has no cursor to follow: the pointer only exists during a
  // tap, so this would read as a jump on contact rather than a shift.
  if (!els.length || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return null;
  }

  const current = { x: pointer.x, y: pointer.y };

  const apply = () => {
    els.forEach((el) => {
      el.style.setProperty('--grad-x', current.x.toFixed(4));
      el.style.setProperty('--grad-y', current.y.toFixed(4));
    });
  };

  // Clamped here rather than in CSS: the position budget in .grad-scroll
  // has no headroom past 0–100%, and clamp() inside background-position
  // stops Chrome repainting on a custom-property change. clientX can sit a
  // pixel or two outside the viewport over the scrollbar, which is all it
  // takes to push the tiled gradient's seam into the glyphs.
  const clamp01 = gsap.utils.clamp(0, 1);

  const onMove = (event) => {
    pointer.x = clamp01(event.clientX / window.innerWidth);
    pointer.y = clamp01(event.clientY / window.innerHeight);
  };

  const follow = (time, deltaTime) => {
    const dx = pointer.x - current.x;
    const dy = pointer.y - current.y;
    // Settled — skip the write so an idle cursor costs no repaints at all.
    if (Math.abs(dx) < 0.0004 && Math.abs(dy) < 0.0004) return;
    // Exponential ease, framed off elapsed time so the lag feels identical
    // at 60Hz and 144Hz.
    const k = 1 - Math.exp(-deltaTime / 90);
    current.x += dx * k;
    current.y += dy * k;
    apply();
  };

  apply();
  window.addEventListener('pointermove', onMove, { passive: true });
  gsap.ticker.add(follow);

  return () => {
    window.removeEventListener('pointermove', onMove);
    gsap.ticker.remove(follow);
  };
}

let mm;

function boot() {
  const root = document.documentElement;
  // If the failsafe in Base.astro already fired, the hero is on screen and
  // playing the intro now would yank it back out and redraw it. Everything
  // else animates from wherever it is, so it stays.
  const late = !root.classList.contains('motion');
  root.classList.add('motion-ready');

  initSmoothScroll();

  mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    if (!late) heroIntro();
    headingReveals();
    scrollReveals();
    gradientScroll();
    const stopPointer = gradientPointer();
    initScramble();
    // matchMedia runs this on revert, which teardown() triggers per swap.
    return () => stopPointer?.();
  });
}

function teardown() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  if (mm) {
    mm.revert();
    mm = null;
  }
}

// astro:page-load fires on the initial load as well as after every swap.
document.addEventListener('astro:page-load', boot);
document.addEventListener('astro:before-swap', teardown);
document.addEventListener('astro:after-swap', resetSmoothScroll);
