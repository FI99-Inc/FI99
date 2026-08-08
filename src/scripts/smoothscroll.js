// Lenis drives the scroll position; GSAP drives Lenis. Running both off the
// single gsap.ticker keeps ScrollTrigger reading a position that has already
// settled for the frame, which is what stops scrubbed animations from
// juddering a frame behind the page.
//
// One instance for the whole session — a client-side navigation swaps the
// document body, not the scroller, so re-creating it per page would stack
// wheel listeners.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let lenis = null;

function tick(time) {
  // gsap.ticker reports seconds; Lenis wants milliseconds.
  lenis.raf(time * 1000);
}

export function initSmoothScroll() {
  if (lenis) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  lenis = new Lenis({
    duration: 1.05,
    // Standard exponential ease-out: fast off the wheel, long tail.
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Touch keeps the platform's own momentum. Overriding it is what makes
    // smooth-scroll libraries feel laggy on phones.
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  // Lenis is already frame-locked, so GSAP must not try to compensate for
  // long frames by rewriting its own delta.
  gsap.ticker.lagSmoothing(0);
}

// After a swap the new page is shorter or taller and starts at the top, but
// Lenis is still holding the old document's scroll extent.
export function resetSmoothScroll() {
  if (!lenis) return;
  lenis.scrollTo(0, { immediate: true });
  lenis.resize();
  // The swap also copies the incoming document's <html> class list over this
  // one, dropping Lenis's own `lenis` class and with it the rules in
  // lenis.css. Lenis re-stamps it the next time it recomputes, which is the
  // next scroll — restoring it here closes that window.
  if (typeof lenis.updateClassName === 'function') lenis.updateClassName();
  else lenis.rootElement.classList.add('lenis');
}
