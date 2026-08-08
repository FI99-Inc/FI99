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

function gradientScroll() {
  const els = gsap.utils.toArray('.grad-scroll');
  if (!els.length) return;
  gsap.to(els, {
    backgroundPosition: '100% 100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
    },
  });
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
    initScramble();
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
