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
import { initWordCycle } from './wordcycle.js';

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

// Scroll velocity smears the starfield into short trails. Read straight off
// window.scrollY rather than from Lenis: Lenis runs with syncTouch off, so on
// a phone the platform scrolls natively and Lenis never sees the velocity.
// scrollY is true for wheel, touch, keyboard and anchor jumps alike.
function starTrails() {
  const field = document.querySelector('.starfield');
  if (!field) return null;

  // px per 60fps frame that counts as full tilt.
  const V_MAX = 48;
  const LAG_MAX = 12;

  let last = null;
  let warp = 0;
  let lag = 0;
  let idle = false;

  const follow = (time, deltaTime) => {
    const y = window.scrollY;
    // First frame after boot has no previous sample, and a swap resets the
    // scroll to 0 — differencing against that would fire a full-tilt streak
    // on arrival at every page.
    if (last === null) {
      last = y;
      return;
    }
    // Normalised to a 60fps frame so the streak is the same length on a
    // 144Hz display as on a 60Hz one.
    const v = ((y - last) / Math.max(deltaTime, 1)) * 16.667;
    last = y;

    const target = Math.min(Math.abs(v) / V_MAX, 1);
    // Asymmetric on purpose, and the whole trick: snap into the streak,
    // ease out of it. Decaying as fast as it builds would read as the field
    // breathing with the scroll. The slow tail is what the eye reads as a
    // trail being left behind.
    const tau = target > warp ? 45 : 165;
    warp += (target - warp) * (1 - Math.exp(-deltaTime / tau));

    // Stars lag against the scroll — down the page shifts them up — which is
    // how a distant layer behaves. Clamped to the same full-tilt velocity so
    // a violent flick cannot throw the field off screen.
    const lagTarget = -Math.max(-1, Math.min(1, v / V_MAX)) * LAG_MAX;
    lag += (lagTarget - lag) * (1 - Math.exp(-deltaTime / 110));

    const settled = warp < 0.002 && Math.abs(lag) < 0.05;
    // One last write to land exactly on rest, then nothing until the page
    // moves again — an idle sky must not repaint 170 stars every frame.
    if (settled && idle) return;
    if (settled) {
      warp = 0;
      lag = 0;
    }
    idle = settled;

    field.style.setProperty('--star-warp', warp.toFixed(4));
    field.style.setProperty('--star-lag', `${lag.toFixed(2)}px`);
  };

  gsap.ticker.add(follow);

  return () => {
    gsap.ticker.remove(follow);
    // The field is transition:persist, so it outlives this page — leaving a
    // stale streak stamped on it would carry over to the next one.
    field.style.removeProperty('--star-warp');
    field.style.removeProperty('--star-lag');
  };
}

// Clicking the mark drops a ripple across it. The rings themselves live in
// global.css (see .grad-scroll[data-ripple]) — everything here does is aim
// one, run it outward, and hand the slot back.
const RIPPLE_SLOTS = 3;

function clickRipples() {
  const surfaces = gsap.utils.toArray('[data-ripple]');
  if (!surfaces.length) return null;

  const stops = [];

  surfaces.forEach((el) => {
    // One timeline per slot, so a fourth click within a wave's lifetime
    // recycles the oldest ring instead of leaving two tweens fighting over
    // the same variables.
    const running = new Array(RIPPLE_SLOTS).fill(null);
    let next = 0;

    const onDown = (event) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Out to the farthest corner: a wave that stopped at the nearest edge
      // would visibly die mid-glyph on an off-centre click.
      const reach = Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y)
      );

      const i = next;
      next = (next + 1) % RIPPLE_SLOTS;
      running[i]?.kill();

      gsap.set(el, { [`--r${i}x`]: x, [`--r${i}y`]: y, [`--r${i}r`]: 0, [`--r${i}a`]: 1 });

      running[i] = gsap
        .timeline({
          onStart: () => el.style.setProperty(`--ripple-${i}`, `var(--ripple-ring-${i})`),
          onComplete: () => {
            // Drop the layer rather than leaving it at alpha 0 — an idle
            // ripple would still be repainted on every scrolled frame.
            el.style.removeProperty(`--ripple-${i}`);
            running[i] = null;
          },
        })
        // Fast off the mark and decelerating: water spreads on the energy of
        // the impact and never gets any more.
        .to(el, { [`--r${i}r`]: reach + 40, duration: 1.25, ease: 'power2.out' }, 0)
        // Held bright, then dropped late, so the ring reads as a wave that
        // fades rather than a circle that shrinks away.
        .to(el, { [`--r${i}a`]: 0, duration: 1.25, ease: 'power2.in' }, 0);
    };

    el.addEventListener('pointerdown', onDown);
    stops.push(() => {
      el.removeEventListener('pointerdown', onDown);
      running.forEach((tl, i) => {
        tl?.kill();
        el.style.removeProperty(`--ripple-${i}`);
      });
    });
  });

  return () => stops.forEach((stop) => stop());
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
    const stops = [gradientPointer(), starTrails(), clickRipples(), initWordCycle()];
    initScramble();
    // matchMedia runs this on revert, which teardown() triggers per swap.
    return () => stops.forEach((stop) => stop?.());
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
