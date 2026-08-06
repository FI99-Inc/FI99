// All motion runs through GSAP, gated behind prefers-reduced-motion.
// When the user asks for reduced motion, nothing here runs: the inline
// head script never adds html.motion, so no element is ever hidden.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initScramble } from './scramble.js';

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
    const split = new SplitText(el, { type: 'chars', mask: 'chars' });
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

function tickers() {
  gsap.utils.toArray('.ticker-track').forEach((track) => {
    gsap.to(track, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
  });
}

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  heroIntro();
  headingReveals();
  scrollReveals();
  tickers();
  initScramble();
});
