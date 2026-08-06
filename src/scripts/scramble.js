// Text scramble/decode on hover and focus, for elements set in the mono
// face. Character count stays constant so mono text never shifts width.
const GLYPHS = '!<>-_/[]{}=+*^?#01';

function scramble(el, original) {
  if (el._scrambleTimer) clearInterval(el._scrambleTimer);

  let frame = 0;
  const total = original.length * 2;

  el._scrambleTimer = setInterval(() => {
    frame += 1;
    const revealed = Math.floor(frame / 2);
    let out = '';
    for (let i = 0; i < original.length; i += 1) {
      if (i < revealed || original[i] === ' ') {
        out += original[i];
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    el.textContent = out;
    if (frame >= total) {
      clearInterval(el._scrambleTimer);
      el._scrambleTimer = null;
      el.textContent = original;
    }
  }, 28);
}

export function initScramble() {
  document.querySelectorAll('[data-scramble]').forEach((el) => {
    const original = el.textContent.trim();
    el.textContent = original;
    const run = () => scramble(el, original);
    el.addEventListener('mouseenter', run);
    el.addEventListener('focus', run);
  });
}
