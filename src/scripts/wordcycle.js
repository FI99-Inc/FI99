// The hero tagline's last word cycles: "We create things." becomes software,
// apps, ideas, and back around.
//
// The gesture is the site's existing one — the masked vertical roll that
// headingReveals uses on every section title. The old word leaves upward out
// of a mask, the new one rolls up into it, one character at a time. Borrowing
// the reveal the page already speaks is what keeps this from reading as a
// widget bolted onto the hero.
//
// Nothing here runs under reduced motion: motion.js only calls this from
// inside its matchMedia block, so the markup's static "things." is the
// fallback — and "things." is also the word the cycle rests on longest, since
// it is the one the title, the footer and the OG description all say.

import { gsap } from 'gsap';

// The period travels with the word on purpose. Anything left standing after
// the rotator would be shoved back and forth as the word changes width, and a
// full stop twitching once every few seconds is all anyone would look at.
const WORDS = [
  'things.',
  'software.',
  'websites.',
  'apps.',
  'ideas.',
  'demos.',
  'prototypes.',
  'tools.',
  'experiments.',
  'trouble.',
];

// Seconds a word holds before it leaves. Long enough to be read twice rather
// than caught out of the corner of an eye — the hero is the one place on the
// site with nothing else competing for attention.
const HOLD = 3.2;
// "things." is the tagline proper, not one of the variations, so it sits
// noticeably longer every time the loop comes back around to it.
const HOLD_HOME = 5.6;

const OUT = 0.3;
const IN = 0.42;
const STAGGER = 0.024;

// Each character gets a mask (overflow hidden) and a mover inside it. Built
// per swap rather than once for every word: the slot has to hug whichever
// word is up, so there is nothing to reuse between them.
function paint(el, word) {
  el.textContent = '';
  return Array.from(word, (ch) => {
    const slot = document.createElement('span');
    slot.className = 'wc-slot';
    const mover = document.createElement('span');
    mover.className = 'wc-char';
    mover.textContent = ch === ' ' ? ' ' : ch;
    slot.appendChild(mover);
    el.appendChild(slot);
    return mover;
  });
}

export function initWordCycle() {
  const el = document.querySelector('[data-word-cycle]');
  if (!el) return null;

  // Both colors are read rather than written: the flash is the brand magenta
  // as the theme defines it, and the resting color is whatever the paragraph
  // inherits. A second copy of either token here would drift from global.css.
  const flash =
    getComputedStyle(document.documentElement).getPropertyValue('--color-magenta').trim() ||
    '#ff1f8f';
  const rest = getComputedStyle(el).color;

  const base = el.textContent.trim() || WORDS[0];
  let index = Math.max(WORDS.indexOf(base), 0);
  let chars = paint(el, WORDS[index]);
  let tl = null;
  let wait = null;

  const hold = (i) => (i === 0 ? HOLD_HOME : HOLD);

  function leave() {
    tl = gsap.timeline({ onComplete: enter });
    tl.to(chars, {
      // Past 100% because the mask in global.css is let out a descender's
      // worth at the bottom — a character that only travelled its own height
      // would still have an edge showing in that slack.
      yPercent: -130,
      duration: OUT,
      stagger: STAGGER,
      // Accelerating out, decelerating in: the word is pulled off screen and
      // the next one lands. Symmetrical easing reads like a slot machine.
      ease: 'power3.in',
    });
  }

  function enter() {
    index = (index + 1) % WORDS.length;
    chars = paint(el, WORDS[index]);
    tl = gsap.timeline({
      onComplete: () => {
        wait = gsap.delayedCall(hold(index), leave);
      },
    });
    tl.fromTo(
      chars,
      { yPercent: 130, color: flash },
      {
        yPercent: 0,
        color: rest,
        duration: IN,
        stagger: STAGGER,
        ease: 'power4.out',
      }
    );
  }

  // The first hold covers the hero intro — the paragraph is a .hero-snap and
  // is still fading in for the first second — so the cycle is never caught
  // mid-swap on arrival.
  wait = gsap.delayedCall(hold(index), leave);

  return () => {
    wait?.kill();
    tl?.kill();
    // Hand the element back the way it was found. A swap replaces this DOM
    // anyway, but leaving a half-flown word in span soup behind is the kind
    // of state that turns into a mystery later.
    el.textContent = base;
  };
}
