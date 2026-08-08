// Custom crosshair cursor. Desktop fine-pointers only, and only when the
// user has not asked for reduced motion. Touch devices never see this.
//
// The crosshair element is transition:persist'd, so it survives client-side
// navigations along with its tweens. Hover targets are matched by delegation
// rather than bound per element, which means a swapped-in page needs no
// rebinding at all.
import { gsap } from 'gsap';

const TARGETS = 'a, button, [role="button"], [data-cursor]';

let el = null;
let xTo = null;
let yTo = null;
let listening = false;

function activate() {
  if (!el) return;
  el.classList.add('is-active');
  gsap.to(el, { scale: 1.5, rotate: 45, duration: 0.18, ease: 'power4.out' });
}

function deactivate() {
  if (!el) return;
  el.classList.remove('is-active');
  gsap.to(el, { scale: 1, rotate: 0, duration: 0.18, ease: 'power4.out' });
}

function hit(node) {
  return node && node.closest ? node.closest(TARGETS) : null;
}

function listen() {
  if (listening) return;
  listening = true;

  window.addEventListener('pointermove', (e) => {
    if (!xTo) return;
    gsap.to(el, { opacity: 1, duration: 0.15 });
    xTo(e.clientX);
    yTo(e.clientY);
  });

  document.documentElement.addEventListener('pointerleave', () => {
    if (el) gsap.to(el, { opacity: 0, duration: 0.15 });
  });

  // Comparing the target and relatedTarget ancestors keeps the crosshair
  // steady while the pointer crosses between children of the same link,
  // which would otherwise read as a leave immediately followed by an enter.
  document.addEventListener('mouseover', (e) => {
    const to = hit(e.target);
    if (to && to !== hit(e.relatedTarget)) activate();
  });

  document.addEventListener('mouseout', (e) => {
    const from = hit(e.target);
    if (from && from !== hit(e.relatedTarget)) deactivate();
  });
}

function boot() {
  const fine = window.matchMedia('(pointer: fine)').matches;
  const motionOk = document.documentElement.classList.contains('motion');
  el = document.querySelector('.fi-cursor');
  if (!fine || !motionOk || !el) return;

  document.documentElement.classList.add('cursor-on');

  // The persisted element keeps its position across swaps; re-creating the
  // setters just re-points them at whatever is on the page now.
  if (!xTo) {
    gsap.set(el, { xPercent: 0, yPercent: 0, opacity: 0 });
    xTo = gsap.quickTo(el, 'x', { duration: 0.12, ease: 'power3.out' });
    yTo = gsap.quickTo(el, 'y', { duration: 0.12, ease: 'power3.out' });
  }

  listen();
}

document.addEventListener('astro:page-load', boot);
// A swap rewrites the <html> class list, taking cursor-on with it. Restoring
// it here rather than on page-load avoids a frame of the default arrow.
document.addEventListener('astro:after-swap', () => {
  if (xTo) document.documentElement.classList.add('cursor-on');
});
