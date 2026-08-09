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
