// The 99 as an instrument.
//
// Two effects share one pointer: the concentric rings part around it at
// different rates (outer rings travel furthest, so the tubes decouple into a
// lens), and a turbulence field pushes signal noise through the strokes. Both
// rest at zero, and the warp filter is detached entirely when nothing is near
// it — an untouched mark composites exactly like the static one.
//
// Callers are responsible for reduced-motion gating; motion.js only reaches
// this file from inside its no-preference matchMedia block.
import { gsap } from 'gsap';

// All distances are viewBox user units (the mark is 180x140).
const NEAR = 110; // pointer influence radius
const MAX_PUSH = 7; // outermost ring's travel at full intensity
const MAX_WARP = 7; // feDisplacementMap scale at full intensity
const RINGS = 4;

const POINTER_EASE = 0.14; // pointer catch-up per frame
// Asymmetric on purpose: the mark takes its time waking up and drops away
// quickly, so leaving the hero doesn't trail a second of decaying noise.
const ENGAGE_IN = 0.08;
const ENGAGE_OUT = 0.16;
const SLEEP = 0.002; // below this, stop writing and detach the filter

let svg;
let disp;
let warpGroup;
let warpFilter;
let digits = [];

// Client space -> viewBox user units. This has to come from the SVG's own
// matrix rather than the bounding rect: the hero swaps which axis is pinned
// between breakpoints, and whenever the element's aspect ratio drifts from
// the viewBox's, preserveAspectRatio letterboxes the content and a
// rect-proportion mapping silently aims at the wrong digit.
let ctm = null;
let ctmDirty = true;

// Pointer in viewBox units: `t` is where it actually is, `s` is the smoothed
// value everything reads from.
let tx = 0;
let ty = 0;
let sx = 0;
let sy = 0;
let engageTarget = 0;
let engage = 0;
let pulse = 0;
let filtered = false;
let running = false;

function measure() {
  const m = svg.getScreenCTM();
  ctm = m ? m.inverse() : null;
  ctmDirty = false;
}

function markDirty() {
  ctmDirty = true;
}

function toViewBox(clientX, clientY) {
  if (ctmDirty) measure();
  if (!ctm) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm);
  return { x: p.x, y: p.y };
}

// Ring 0 is the outermost stroke and moves the most; the innermost keeps a
// quarter of the travel so the digit still reads as one object.
function ringWeight(ring) {
  return (RINGS - ring) / RINGS;
}

function setFiltered(on) {
  if (on === filtered) return;
  filtered = on;
  if (on) warpGroup.setAttribute('filter', warpFilter);
  else warpGroup.removeAttribute('filter');
}

function frame() {
  sx += (tx - sx) * POINTER_EASE;
  sy += (ty - sy) * POINTER_EASE;
  engage +=
    (engageTarget - engage) * (engageTarget > engage ? ENGAGE_IN : ENGAGE_OUT);

  const power = Math.min(1, engage + pulse);

  if (power < SLEEP) {
    if (running) {
      // Settle to exact rest once, then go quiet.
      for (const digit of digits) {
        for (const path of digit.paths) path.removeAttribute('transform');
      }
      disp.setAttribute('scale', '0');
      setFiltered(false);
      running = false;
    }
    return;
  }
  running = true;
  setFiltered(true);

  let peak = 0;

  for (const digit of digits) {
    const vx = sx - digit.cx;
    const vy = sy - digit.cy;
    const dist = Math.hypot(vx, vy) || 1;

    // Quadratic falloff — the effect stays local instead of smearing across
    // the whole mark the moment the pointer enters the hero.
    const near = Math.max(0, 1 - dist / NEAR);
    const t = near * near * power;
    if (t > peak) peak = t;

    // Rings part away from the pointer.
    const ux = -(vx / dist);
    const uy = -(vy / dist);

    for (let i = 0; i < digit.paths.length; i++) {
      const amount = MAX_PUSH * t * ringWeight(i);
      const ox = ux * amount;
      const oy = uy * amount;
      digit.paths[i].setAttribute(
        'transform',
        `translate(${ox.toFixed(2)} ${oy.toFixed(2)})`
      );
    }
  }

  disp.setAttribute('scale', (MAX_WARP * peak).toFixed(2));
}

/**
 * Arms pointer interaction. Safe to call when the mark is absent or when the
 * component was rendered without `interactive`.
 */
export function initMark99() {
  svg = document.querySelector('[data-mark99]');
  if (!svg) return;

  disp = svg.querySelector('[data-mark99-disp]');
  warpGroup = svg.querySelector('[data-mark99-warp]');
  warpFilter = warpGroup && warpGroup.dataset.warpFilter;
  if (!disp || !warpFilter) return;

  digits = [...svg.querySelectorAll('.ml99-digit')].map((g) => ({
    cx: Number(g.dataset.cx),
    cy: Number(g.dataset.cy),
    paths: [...g.querySelectorAll('.ml99-path')],
  }));
  if (!digits.length) return;

  measure();
  addEventListener('resize', markDirty, { passive: true });
  addEventListener('scroll', markDirty, { passive: true });

  // Pointer tracking is for fine pointers only. Touch gets the tap pulse
  // below, which reads better than dragging a finger over your own artwork.
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (fine.matches) {
    addEventListener(
      'pointermove',
      (e) => {
        const p = toViewBox(e.clientX, e.clientY);
        if (!p) return;
        tx = p.x;
        ty = p.y;
        engageTarget = 1;
      },
      { passive: true }
    );
    document.documentElement.addEventListener('mouseleave', () => {
      engageTarget = 0;
    });
  }

  // Tap or click surges both effects and lets them fall back — the one
  // gesture that works identically on a trackpad and a phone.
  svg.addEventListener(
    'pointerdown',
    (e) => {
      const p = toViewBox(e.clientX, e.clientY);
      if (p) {
        tx = sx = p.x;
        ty = sy = p.y;
      }
      gsap.to(
        { v: 1 },
        {
          v: 0,
          duration: 0.75,
          ease: 'power2.out',
          onUpdate() {
            pulse = this.targets()[0].v;
          },
          onComplete() {
            pulse = 0;
          },
        }
      );
    },
    { passive: true }
  );

  gsap.ticker.add(frame);
}

/**
 * Winds the strokes back off as the hero leaves — the mark un-draws itself on
 * the way out, mirroring the intro. Call this only once the intro timeline has
 * finished, or it captures a half-drawn dash offset as its start value.
 */
export function armMark99Retrace() {
  if (!svg) return;
  const hero = svg.closest('.hero');
  const paths = svg.querySelectorAll('.ml99-path');
  if (!hero || !paths.length) return;

  gsap.to(paths, {
    strokeDashoffset: (i, target) => target.getTotalLength(),
    ease: 'none',
    stagger: { each: 0.06, from: 'end' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
    },
  });
}
