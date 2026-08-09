# Portrait focus on touch devices

## Problem

The founder portraits are duotone by default and lift to the real photograph on
hover (`global.css`, `.portrait-card:hover .portrait-img`). That rule sits inside
`@media (hover: hover)`, so a phone or tablet never triggers it. On touch devices
the colour photographs are unreachable — you only ever see the duotone.

This affects both places `PersonCard` renders: the compact cut in the home page
PERSONNEL section and the full cards on `/team`.

## Intent

Duotone stays the default and the design. Scrolling becomes the phone's
equivalent of the mouse: the portrait currently occupying the most screen area
lifts to full colour, one at a time, cross-faded.

## Decisions

| Question | Decision |
| --- | --- |
| Scope | Any device where `(hover: hover)` does not match, and only while the `sm:` breakpoint has the cards stacked single-column. Both pages. In the 3-up layout (≥640px, no hover — a tablet, or a phone rotated to landscape) the three frames are grid siblings of identical size and move together, so no scroll position makes one dominate; the driver stays out and those devices stay fully duotone. Mouse behaviour is unchanged. |
| Winner rule | Largest visible area of the **portrait frame**, not the card. |
| Feel | Winner-takes-all, cross-faded over 0.45s, with a visibility floor so nobody is lit at the edges. |

Measuring the frame rather than the card is what makes the rule survive `/team`,
where the bio and links make a card far taller than its portrait. A card-area
rule would let a bio-heavy card win while its photograph is already scrolled off
the top — colouring an image nobody can see.

## Design

### 1. A colour layer in the markup

`.portrait-frame` becomes a positioning context holding two copies of the
portrait:

- the existing `<img>`, duotone, as the base;
- a colour copy above it, `alt=""` and `aria-hidden="true"`.

The copy is hidden from assistive tech because it is the same photograph as the
base; without that it would be announced twice.

Both use identical `widths` and `sizes`, so the browser resolves the same
`srcset` candidate for each and the second is served from cache. One download.

The `[ NO PHOTO ON FILE ]` branch gets no colour layer, and the driver skips any
card that lacks one.

### 2. One variable owns the effect

```css
.portrait-frame { position: relative; overflow: hidden; }
.portrait-img   { filter: url(#fi-duotone) contrast(1.05); }

.portrait-color {
  position: absolute;
  inset: 0;
  opacity: var(--portrait-color, 0);
  transition: opacity 0.45s ease;
}

@media (hover: hover) {
  .portrait-card:hover { --portrait-color: 1; }
}
```

Hover and scroll both write `--portrait-color`; neither knows about the other.
This follows the pattern `.grad-scroll` already establishes, where scroll and
cursor each own a variable that CSS composes.

The old `filter: none` hover rule and its `transition: filter 0.5s ease` are
removed. That transition never actually animated: a `filter` list containing a
`url()` reference is not interpolable, so the change was discrete and the
declaration only delayed a snap. Cross-fading opacity gives hover a real fade
for the first time, and is compositor-friendly on mobile.

While editing the block, correct its stale comment — it describes the sources as
"a studio headshot, a phone snapshot taken at night, and an empty slot". All
three people have photographs now; `Base.astro` already says so correctly.

### 3. The scroll driver

`initPortraitFocus()` in a new `src/scripts/portrait-focus.js`, returning a stop
function like `starTrails()` and the gradient drivers do. It gets its own module
rather than a function in `motion.js` — the same shape `scramble.js`,
`wordcycle.js` and `smoothscroll.js` already take — because its winner-picking
half is pure arithmetic and worth unit-testing on its own, and `motion.js` is
already past 400 lines.

**Gate.** Return `null` immediately if `(hover: hover)` matches. This is the
exact complement of the CSS rule, so hover and scroll can never both drive the
same card. A second gate returns `null` at `(min-width: 40rem)`, the `sm:`
breakpoint where `sm:grid-cols-3` puts the three frames side by side as grid
siblings of identical size. Side by side, no scroll position makes one of them
the one you are looking at, so nothing there can earn colour — the driver
stays out and that layout stays fully duotone, exactly as it was before this
feature.

**Measurement cache.** Each frame's document offset and size are measured once
and refreshed by a `ResizeObserver` on the frames and on `document.body`.
Watching the frames covers image load, orientation change, and their own
resize. Watching the body catches reflow that moves the cards without ever
resizing them — the display face ships `font-display: swap`, and the
heading above the first card re-wrapping when it lands walks every frame down
the page without triggering a frame-level ResizeObserver. `document.fonts.ready`
triggers one more re-measure for the case where the swap happens to leave the
document height unchanged; it is guarded by a `stopped` flag so a re-measure
firing after a client-side navigation has already torn the driver down is a
no-op rather than a write to a detached page.

Measurement walks the `offsetTop` / `offsetParent` chain rather than reading
`getBoundingClientRect()`. `html.motion [data-reveal]` parks every card at
`translateY(28px)` until GSAP reveals it, and a `ResizeObserver` never fires on
a transform change — so a rect cached for a card still below the fold would stay
28px wrong permanently. `offsetTop` is layout rather than paint and ignores
transforms entirely.

During scroll the driver does pure arithmetic against `window.scrollY`:

```
top     = cachedTop - scrollY
visible = min(top + height, viewportHeight) - max(top, 0)
area    = max(visible, 0) * cachedWidth
```

Width is cached and multiplied in rather than assumed equal. In both layouts the
frames happen to be the same width, so visible height alone would rank them
identically — but the page is only ever one grid change away from that not
holding, and the comparison should say what it means.

No `getBoundingClientRect()` in the scroll path. This matters regardless of
callback ordering: ticker listener 0 is GSAP's own `Timeline.updateRoot`,
added the moment `gsap-core` loads, so it runs ahead of every other ticker
callback and writes that frame's tween styles first. A rect read on the
ticker after that write would force a synchronous layout on every scrolled
frame, whatever position this driver's own callback happened to occupy in the
list.

**Driver.** A passive `scroll` listener, not `gsap.ticker`. GSAP parks its
rAF loop only while it holds fewer than two listeners, and on a
reduced-motion phone nothing else in this file registers a ticker callback —
so putting this driver on the ticker would give the main thread a reason to
wake every frame for the entire session, for exactly the people who asked for
less motion. The listener early-outs when `scrollY` has not changed since the
last call, and scroll does not fire at all while the page is at rest, so an
idle page costs nothing either way.

**Winner.** Largest visible area wins, and must clear **40% of its own height**
on screen to win at all. Below that threshold there is no winner and every
portrait returns to duotone — so a section only clipping the edge of the screen
reads as pure duotone rather than leaving a straggler coloured.

**Hysteresis.** A challenger must beat the incumbent's visible area by **8%**
before the lead changes, so two near-equal portraits cannot strobe against each
other at the handover.

**Writes.** `--portrait-color` is set only when the winner changes, not per
frame.

**Teardown.** The stop sets the `stopped` flag, removes the scroll listener,
disconnects the `ResizeObserver`, and clears `--portrait-color` from every
card.

### 4. Reduced motion

`initPortraitFocus()` registers in `boot()` but **outside** the
`prefers-reduced-motion: no-preference` matchMedia block that gates everything
else in the file. Its stop is held separately and called from `teardown()`.

The effect carries information — which person you are looking at — rather than
decoration. Gating it would mean a touch user who asked for reduced motion never
sees a colour photograph at all, which is the original complaint. Under that
preference the CSS transition drops to `none`, so the change is an instant swap
with no animation.

### 5. `/team`

No page-specific work. `PersonCard` is shared, so `/team` inherits the driver.
It lands harder there: bios and links make each card roughly a screen tall, so
the coloured portrait tracks the person being read almost one to one.

## Out of scope

- Any change to desktop behaviour on either page.
- Dimming or de-emphasising unfocused cards' text.
- Proportional colour — two half-coloured portraits at every handover would
  soften the "three strangers read as one set" effect the duotone exists for.

## Verification

- Touch emulation at phone width, home page: exactly one portrait coloured while
  scrolling through PERSONNEL; none coloured once the section leaves the screen.
- Same on `/team`, where the lit portrait should follow the bio being read.
- Desktop with a mouse: unchanged behaviour, except hover now fades rather than
  snapping.
- `prefers-reduced-motion: reduce` on touch: colour still tracks scroll, with no
  cross-fade.
- Network panel: three portrait requests, not six.
- Client-side navigation between `/` and `/team` and back: no duplicated tickers,
  no card left coloured after the swap.
