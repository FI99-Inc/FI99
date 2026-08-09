// Drives the header status readout — see StatusReadout.astro for what it says
// and why it says it. This file only makes the numbers true.
//
// The readout is transition:persist'd, so a client-side navigation hands the
// same live node to the next page. Without that, every nav would blink the
// clock back to its placeholder dashes for a frame. The usual outcome of
// boot() is therefore "same node, still ticking, do nothing".

const SELECTOR = '[data-readout]';

let node = null;
let timer = null;
let fmt = null;

function formatter(zone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    // h23 rather than hour12:false. The latter is permitted to render midnight
    // as hour 24, which would show 24:07:11 for the first hour of every day.
    hourCycle: 'h23',
    timeZoneName: 'short',
  });
}

function set(selector, value) {
  const el = node.querySelector(selector);
  if (el && el.textContent !== value) el.textContent = value;
}

function paint() {
  const p = {};
  for (const part of fmt.formatToParts(new Date())) p[part.type] = part.value;

  // Assembled from parts instead of taking the locale's own date string, so
  // the ISO ordering holds whatever ICU build the browser happens to ship.
  set('[data-readout-date]', `${p.year}-${p.month}-${p.day}`);
  set('[data-readout-time]', `${p.hour}:${p.minute}`);
  set('[data-readout-secs]', `:${p.second}`);
  set('[data-readout-zone]', p.timeZoneName);
}

// Aligned to the wall-clock boundary rather than setInterval(1000): an
// interval accumulates the scheduler's lateness until the display sits a
// visible fraction behind, and eventually skips a number outright. Skipping a
// number is the one thing a clock cannot do. Date.now() % every is the
// distance past the last boundary, so the difference is the distance to the
// next one — and every real zone offset is a whole number of minutes, so this
// lands on a local boundary at both tick rates.
function schedule(every) {
  timer = window.setTimeout(() => {
    paint();
    schedule(every);
  }, every - (Date.now() % every));
}

function start() {
  // A field that rewrites itself every second is auto-updating content, so a
  // reduced-motion request drops the seconds entirely and steps the readout
  // once a minute — slow enough that it reads as static text.
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const secs = node.querySelector('[data-readout-secs]');
  if (secs) secs.classList.toggle('hidden', calm);

  paint();
  schedule(calm ? 60000 : 1000);
}

function stop() {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
}

function boot() {
  const el = document.querySelector(SELECTOR);
  if (!el) return;
  // The persisted node arrives already running. Re-initialising it would
  // orphan the live timeout and leave two chains repainting the same element.
  if (el === node && timer !== null) return;

  stop();
  node = el;
  fmt = formatter(el.dataset.zone || 'America/Toronto');
  start();
}

document.addEventListener('astro:page-load', boot);

// A background tab has no reason to keep a clock. Repainting on the way back
// matters more than the saved work does: resuming on the next scheduled tick
// alone would leave the readout showing whatever second the tab was hidden on.
document.addEventListener('visibilitychange', () => {
  if (!node) return;
  if (document.hidden) stop();
  else if (timer === null) start();
});
