// Custom crosshair cursor. Desktop fine-pointers only, and only when the
// user has not asked for reduced motion. Touch devices never see this.
import { gsap } from 'gsap';

const fine = window.matchMedia('(pointer: fine)').matches;
const motionOk = document.documentElement.classList.contains('motion');
const el = document.querySelector('.fi-cursor');

if (fine && motionOk && el) {
  document.documentElement.classList.add('cursor-on');

  gsap.set(el, { xPercent: 0, yPercent: 0, opacity: 0 });
  const xTo = gsap.quickTo(el, 'x', { duration: 0.12, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.12, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    gsap.to(el, { opacity: 1, duration: 0.15 });
    xTo(e.clientX);
    yTo(e.clientY);
  });

  document.documentElement.addEventListener('pointerleave', () => {
    gsap.to(el, { opacity: 0, duration: 0.15 });
  });

  const activate = () => {
    el.classList.add('is-active');
    gsap.to(el, { scale: 1.5, rotate: 45, duration: 0.18, ease: 'power4.out' });
  };
  const deactivate = () => {
    el.classList.remove('is-active');
    gsap.to(el, { scale: 1, rotate: 0, duration: 0.18, ease: 'power4.out' });
  };

  document
    .querySelectorAll('a, button, [role="button"], [data-cursor]')
    .forEach((target) => {
      target.addEventListener('mouseenter', activate);
      target.addEventListener('mouseleave', deactivate);
    });
}
