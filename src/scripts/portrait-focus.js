// Which founder portrait is in colour, on devices that cannot hover.
//
// The portraits are duotone by default and lift to the real photograph on
// hover (see .portrait-card:hover in global.css). That rule lives inside
// @media (hover: hover), so a phone never reached it and the colour
// photographs were simply unreachable there. Scroll is the phone's cursor:
// whichever portrait takes up the most of the screen is the one you are
// looking at, so that is the one that gets its colour back.

// How much of its own height a portrait must have on screen before it counts
// as something you are looking at rather than scenery. Below this nobody
// wins, which is what stops a section clipping the edge of the screen from
// leaving a straggler lit.
export const VISIBLE_FLOOR = 0.4;

// How far a challenger must beat the sitting winner before the lead changes.
// Two portraits crossing at nearly equal size would otherwise trade the lead
// back and forth on every pixel of scroll.
export const LEAD_MARGIN = 1.08;

/**
 * @param {{top: number, height: number, width: number}[]} boxes
 *        Document-relative geometry, one per portrait frame.
 * @param {number} scrollY
 * @param {number} viewportHeight
 * @param {number} current Index holding the lead, or -1 for none.
 * @returns {number} Index of the winner, or -1 if nobody qualifies.
 */
export function pickFocus(boxes, scrollY, viewportHeight, current = -1) {
  const areas = boxes.map(({ top, height, width }) => {
    // Zero-sized means either an empty photo slot or geometry read before
    // layout ran. Neither is a candidate, and dividing by that height below
    // would hand back NaN.
    if (!(height > 0) || !(width > 0)) return 0;
    const y = top - scrollY;
    const visible = Math.min(y + height, viewportHeight) - Math.max(y, 0);
    if (visible / height < VISIBLE_FLOOR) return 0;
    // Width is measured rather than assumed equal. In both the stacked and
    // the three-up layout the frames happen to match, so visible height alone
    // would rank them identically — but the comparison should say what it
    // means, and the page is one grid change away from that not holding.
    return visible * width;
  });

  let best = -1;
  let bestArea = 0;
  for (let i = 0; i < areas.length; i += 1) {
    if (areas[i] > bestArea) {
      bestArea = areas[i];
      best = i;
    }
  }

  if (best === -1) return -1;

  // Only defend a lead that is still real: an incumbent that has fallen under
  // the floor scores 0 here and hands over without the challenger needing the
  // margin.
  const held = current >= 0 ? areas[current] || 0 : 0;
  if (held > 0 && best !== current && bestArea < held * LEAD_MARGIN) return current;

  return best;
}

// getBoundingClientRect() is the wrong tool here, and quietly so:
// html.motion [data-reveal] parks every card at translateY(28px) until GSAP
// reveals it, and a ResizeObserver never fires on a transform change — so a
// rect cached for a card below the fold would stay 28px wrong forever.
// offsetTop is layout, not paint, and ignores transforms entirely.
function documentTop(el) {
  let y = 0;
  let node = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

export function initPortraitFocus() {
  // The exact complement of the (hover: hover) rule in global.css. Written as
  // one negated query rather than a second guess at what a touch device is,
  // so the two can never both drive a card and never both go quiet.
  if (window.matchMedia('(hover: hover)').matches) return null;

  const cards = Array.from(document.querySelectorAll('.portrait-card')).filter((card) =>
    card.querySelector('.portrait-color')
  );
  if (!cards.length) return null;

  const frames = cards.map((card) => card.querySelector('.portrait-frame'));
  let boxes = [];
  let current = -1;
  let lastY = null;
  let stopped = false;

  // Measured on layout changes only. The alternative — reading rects on the
  // ticker — would land after starTrails() has written to the starfield on
  // that same ticker, forcing a synchronous layout on every scrolled frame.
  const measure = () => {
    boxes = frames.map((frame) => ({
      top: documentTop(frame),
      height: frame.offsetHeight,
      width: frame.offsetWidth,
    }));
    // The geometry moved, so whatever the last scroll position decided about
    // it is stale. Clearing this forces the next tick to recompute.
    lastY = null;
  };

  const paint = (next) => {
    if (next === current) return;
    if (current >= 0) cards[current].style.removeProperty('--portrait-color');
    if (next >= 0) cards[next].style.setProperty('--portrait-color', '1');
    current = next;
  };

  const follow = () => {
    const y = window.scrollY;
    // Scroll can fire without the page having moved, so this is not dead
    // weight — but the real reason a page at rest costs nothing is that a
    // page at rest does not fire scroll at all.
    if (y === lastY) return;
    lastY = y;
    paint(pickFocus(boxes, y, window.innerHeight, current));
  };

  // Width is all the frames' own boxes depend on — they are aspect-square —
  // so observing them alone catches an orientation change and nothing else.
  // Reflow ABOVE the cards moves them without ever resizing them, and that is
  // the case that actually bites: the display face ships font-display: swap,
  // and the clamp()ed heading right above the first card re-wraps when it
  // lands, walking every frame down the page. Watching the body catches that
  // as a document-height change, and fonts.ready catches the specific moment
  // even when the re-wrap happens to leave the height alone.
  const observer = new ResizeObserver(measure);
  frames.forEach((frame) => observer.observe(frame));
  observer.observe(document.body);

  measure();
  follow();
  // Resolves whenever it resolves, which can be after a client-side
  // navigation has already torn this driver down.
  document.fonts.ready.then(() => {
    if (!stopped) measure();
  });

  // A passive scroll listener rather than gsap.ticker, alone among this
  // codebase's drivers. GSAP parks its rAF loop only while it holds fewer
  // than two listeners, and on a reduced-motion phone nothing else registers
  // — so a ticker callback here would keep the main thread waking every
  // frame, for the whole session, for exactly the people who asked for less.
  // starTrails needs per-frame velocity; this only needs to react to scroll.
  window.addEventListener('scroll', follow, { passive: true });

  return () => {
    stopped = true;
    window.removeEventListener('scroll', follow);
    observer.disconnect();
    cards.forEach((card) => card.style.removeProperty('--portrait-color'));
  };
}
