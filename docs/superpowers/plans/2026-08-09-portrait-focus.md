# Portrait Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On devices that cannot hover, the founder portrait occupying the most screen area lifts from duotone to full colour as you scroll — one at a time, cross-faded — on both the home page and `/team`.

**Architecture:** A second copy of each portrait is stacked over the duotone one and cross-faded by a single CSS custom property, `--portrait-color`. Two mutually exclusive inputs write it: a `:hover` rule under `@media (hover: hover)`, and a scroll driver that runs only when that query does *not* match. The driver caches transform-immune layout geometry and does pure arithmetic against `window.scrollY` on GSAP's shared ticker.

**Tech Stack:** Astro 7, Tailwind 4, GSAP 3 (`gsap.ticker`), vanilla ES modules. Tests run on Node 22's built-in runner (`node --test`) — no new dependencies. Browser verification is headless Chrome driven over CDP.

**Spec:** `docs/superpowers/specs/2026-08-09-portrait-focus-design.md`

## Global Constraints

- **No new npm dependencies.** Node 22.12+ is already required by `package.json`; use `node --test` and the global `WebSocket`/`fetch`.
- **No Claude attribution in commits.** No `Co-Authored-By`, no `Claude-Session` trailer. Author must remain `Srihith Jarabana <srihithjarabana@gmail.com>`.
- **Dev server runs in background mode:** `npx astro dev --background`, managed with `npx astro dev stop|status|logs` (see `CLAUDE.md`).
- **Desktop behaviour must not change**, with one intended exception: hover now cross-fades over 0.45s instead of snapping.
- **Comment style:** this codebase writes comments that explain *why*, often several sentences, and they are part of the deliverable. Match the density and voice of the surrounding file. Do not add comments that restate the code.
- **Exact values:** visibility floor `0.4` of a portrait's own height; lead margin `1.08`; cross-fade `0.45s ease`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/scripts/portrait-focus.js` *(create)* | The whole feature's JS. Exports `pickFocus()` — pure, no DOM, unit-tested — and `initPortraitFocus()` — DOM wiring returning a stop function. Sits alongside `scramble.js`, `wordcycle.js`, `smoothscroll.js`, which are the existing precedent for a self-contained driver imported by `motion.js`. |
| `test/portrait-focus.test.js` *(create)* | `node --test` coverage of `pickFocus()`: the floor, the ranking, the hysteresis, degenerate geometry. |
| `src/components/PersonCard.astro` *(modify)* | Adds the colour layer inside `.portrait-frame`. |
| `src/styles/global.css` *(modify, lines 298–321)* | Replaces the filter-swap hover block with the cross-fade block. |
| `src/scripts/motion.js` *(modify)* | Boots and tears down the driver, outside the reduced-motion gate. |
| `package.json` *(modify)* | Adds the `test` script. |

`pickFocus()` and `initPortraitFocus()` live in one file on purpose: they are one idea, and the file lands around 120 lines. The split that matters is that `pickFocus()` takes plain numbers, which is what makes the thresholds testable without a layout engine.

---

### Task 1: The focus picker

Pure geometry. No DOM, no GSAP, no browser.

**Files:**
- Create: `src/scripts/portrait-focus.js`
- Create: `test/portrait-focus.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `pickFocus(boxes, scrollY, viewportHeight, current = -1) -> number`
    `boxes` is an array of `{ top, height, width }`, all numbers, `top` document-relative. Returns the index of the winning box, or `-1` for no winner.
  - `VISIBLE_FLOOR = 0.4` and `LEAD_MARGIN = 1.08`, exported so the tests state the same numbers the code does.

- [ ] **Step 1: Add the test script to `package.json`**

In the `"scripts"` block, after `"astro": "astro"`, add:

```json
    "test": "node --test"
```

Remember the comma on the preceding line.

- [ ] **Step 2: Write the failing tests**

Create `test/portrait-focus.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickFocus, VISIBLE_FLOOR, LEAD_MARGIN } from '../src/scripts/portrait-focus.js';

// A phone-ish viewport and three square portraits stacked down the page, which
// is the layout this actually runs in.
const VH = 800;
const box = (top) => ({ top, height: 360, width: 360 });
const stack = [box(0), box(500), box(1000)];

test('no winner when nothing is on screen', () => {
  assert.equal(pickFocus(stack, 5000, VH), -1);
});

test('the only portrait on screen wins', () => {
  assert.equal(pickFocus(stack, 0, VH), 0);
});

test('a portrait below the visibility floor does not win', () => {
  // 30% of its height showing at the bottom edge — under the floor, and the
  // others are off screen entirely.
  const one = [{ top: 1000, height: 360, width: 360 }];
  const scrollY = 1000 - VH + 360 * 0.3;
  assert.ok(0.3 < VISIBLE_FLOOR);
  assert.equal(pickFocus(one, scrollY, VH), -1);
});

test('a portrait exactly at the visibility floor wins', () => {
  const one = [{ top: 1000, height: 360, width: 360 }];
  const scrollY = 1000 - VH + 360 * VISIBLE_FLOOR;
  assert.equal(pickFocus(one, scrollY, VH), 0);
});

test('the larger visible area wins', () => {
  // Scrolled so box 1 is fully on screen and box 2 is only partly.
  assert.equal(pickFocus(stack, 500, VH), 1);
});

test('width counts, not just visible height', () => {
  // Equal visible height, second is wider.
  const boxes = [
    { top: 0, height: 300, width: 200 },
    { top: 0, height: 300, width: 400 },
  ];
  assert.equal(pickFocus(boxes, 0, VH), 1);
});

test('the incumbent holds the lead inside the margin', () => {
  const boxes = [
    { top: 0, height: 100, width: 100 },
    { top: 0, height: 105, width: 100 },
  ];
  // 105 vs 100 is a 5% lead, under the 8% the challenger needs.
  assert.ok(105 / 100 < LEAD_MARGIN);
  assert.equal(pickFocus(boxes, 0, VH, 0), 0);
});

test('the incumbent loses the lead outside the margin', () => {
  const boxes = [
    { top: 0, height: 100, width: 100 },
    { top: 0, height: 120, width: 100 },
  ];
  assert.ok(120 / 100 > LEAD_MARGIN);
  assert.equal(pickFocus(boxes, 0, VH, 0), 1);
});

test('an incumbent that drops below the floor yields immediately', () => {
  // Incumbent is 10% visible at the top edge, challenger is fully on screen.
  // No margin should be required to take a lead the incumbent no longer holds.
  const boxes = [
    { top: 0, height: 400, width: 360 },
    { top: 400, height: 360, width: 360 },
  ];
  assert.equal(pickFocus(boxes, 360, VH, 0), 1);
});

test('the winner is stable while it stays the winner', () => {
  assert.equal(pickFocus(stack, 500, VH, 1), 1);
});

test('boxes with no size are ignored', () => {
  // A card whose photo slot is empty, or one measured before layout ran.
  const boxes = [
    { top: 0, height: 0, width: 0 },
    { top: 0, height: 360, width: 360 },
  ];
  assert.equal(pickFocus(boxes, 0, VH, -1), 1);
});

test('an empty list has no winner', () => {
  assert.equal(pickFocus([], 0, VH), -1);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module` for `../src/scripts/portrait-focus.js`.

- [ ] **Step 4: Write the picker**

Create `src/scripts/portrait-focus.js` with exactly this content for now; Task 3 appends the DOM half to the same file.

```js
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 12 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json src/scripts/portrait-focus.js test/portrait-focus.test.js
git commit -m "feat: add portrait focus picker"
```

---

### Task 2: The colour layer

Markup and CSS. After this task hover cross-fades on desktop and touch is still all-duotone — the driver arrives in Task 3.

**Files:**
- Modify: `src/components/PersonCard.astro:13-39`
- Modify: `src/styles/global.css:298-321`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: the DOM contract Task 3 depends on — a `.portrait-card` element containing a `.portrait-frame`, which contains a `.portrait-color` layer whose opacity reads the `--portrait-color` custom property. Task 3 sets that property on the **card**, not the frame or the layer.

- [ ] **Step 1: Hoist the responsive-image settings into the frontmatter**

In `src/components/PersonCard.astro`, add to the frontmatter block after the `const { person, compact = false }` line:

```js
// Both portrait layers must resolve the same srcset candidate — that is the
// whole reason the colour copy below costs no second download. Held in one
// place so the two cannot drift apart.
//
// 1080 exists for phones: the card runs 92vw there, and at dpr 3 that is
// ~1080 real pixels — served 560, the portraits arrive soft. Desktop at dpr 1
// still picks the same 560 it always has. Srihith's source is 665px wide, so
// his set simply tops out there; Astro never upscales.
const PORTRAIT_WIDTHS = [320, 560, 1080];
const PORTRAIT_SIZES = '(min-width: 40rem) 30vw, 92vw';
```

- [ ] **Step 2: Add the colour layer to the card**

Replace the `person.photo ?` branch (the whole `<Image .../>` element and its preceding comment, lines 16–28) with a fragment holding two images:

```astro
      person.photo ? (
        <Fragment>
          <Image
            src={person.photo}
            alt={`${person.name}, photographed.`}
            widths={PORTRAIT_WIDTHS}
            sizes={PORTRAIT_SIZES}
            class="portrait-img h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {/* The same photograph again, unfiltered, stacked on top and faded
              in by --portrait-color. Hidden from assistive tech and given an
              empty alt because it is the image above, not a new one; without
              that it is announced twice. */}
          <Image
            src={person.photo}
            alt=""
            aria-hidden="true"
            widths={PORTRAIT_WIDTHS}
            sizes={PORTRAIT_SIZES}
            class="portrait-color object-cover"
            loading="lazy"
            decoding="async"
          />
        </Fragment>
      ) : (
```

Leave the `[ NO PHOTO ON FILE ]` branch exactly as it is. It gets no colour layer, which is what makes the driver skip that card.

- [ ] **Step 3: Replace the portrait CSS block**

In `src/styles/global.css`, replace lines 298–321 in full — the `---- Founder portraits ----` comment through the closing brace of the `@media (hover: hover)` block — with:

```css
/* ---- Founder portraits ----
   Duotone is doing real work here, not decoration: the source photos are a
   studio headshot, a phone snapshot taken at night and a bright seaside
   portrait, and mapping all three through one ramp (see #fi-duotone in
   Base.astro) is what makes them read as one set rather than three
   strangers. That unified read is the default and stays the default.

   Colour arrives as a second copy of the same photograph stacked on top and
   cross-faded, rather than as a filter that switches off. A filter list
   containing a url() reference is not interpolable, so the transition this
   block used to carry never actually ran — it only delayed a snap. Opacity
   interpolates and composites, which is what makes it affordable on the
   phones that now drive it by scroll.

   Two inputs write --portrait-color and neither knows about the other:
   the hover rule below, and initPortraitFocus() in portrait-focus.js. Their
   media conditions are exact complements, so only one is ever live. */

.portrait-frame {
  position: relative;
  overflow: hidden;
}

.portrait-img {
  filter: url(#fi-duotone) contrast(1.05);
}

/* The explicit size is load-bearing, not belt-and-braces. inset alone does
   not size a replaced element: Tailwind's preflight sets height:auto on img,
   which wins, and the box then resolves from the photograph's own aspect
   ratio. Omar's source is 1200x1600, so his layer overflowed its square frame
   by 123px and object-cover never engaged — his face jumped on hover. */
.portrait-color {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: var(--portrait-color, 0);
  transition: opacity 0.45s ease;
}

/* Which portrait is in colour is information — it is how you tell which
   person you are looking at — so unlike everything else on this page it
   still tracks scroll when reduced motion is asked for. Only the fade goes;
   the swap becomes instant. */
@media (prefers-reduced-motion: reduce) {
  .portrait-color {
    transition: none;
  }
}

@media (hover: hover) {
  .portrait-card:hover {
    --portrait-color: 1;
  }
}
```

- [ ] **Step 4: Verify the build and the asset count**

Run: `npm run build`
Expected: build succeeds with no warnings about the images.

Then confirm the duplicate `<Image>` did not duplicate the asset. Astro emits these as `.webp` regardless of source format, and the invariant that matters is that both tags carry the *same* candidate list:

```bash
grep -o 'srcset="[^"]*srihith[^"]*"' dist/team/index.html | sort -u | wc -l
```

Expected: `1`. Two identical `srcset` strings collapse to one distinct value, which is what guarantees the browser resolves the same candidate for both tags and fetches once. A result of `2` means one of the tags stopped using `PORTRAIT_WIDTHS` / `PORTRAIT_SIZES`.

- [ ] **Step 5: Verify hover still reaches full colour**

Run: `npx astro dev --background`, then open `http://localhost:4321/team` and hover a portrait.
Expected: the photograph fades to full colour over roughly half a second and fades back on exit. Before this task it snapped.

- [ ] **Step 6: Commit**

```bash
git add src/components/PersonCard.astro src/styles/global.css
git commit -m "feat: cross-fade portrait colour instead of swapping filters"
```

---

### Task 3: The scroll driver

**Files:**
- Modify: `src/scripts/portrait-focus.js` (append)
- Modify: `src/scripts/motion.js`

**Interfaces:**
- Consumes: `pickFocus()` from Task 1; the `.portrait-card` / `.portrait-frame` / `.portrait-color` DOM contract from Task 2.
- Produces: `initPortraitFocus() -> (() => void) | null`. Returns `null` when the device can hover or the page has no eligible cards; otherwise returns a stop function that removes the ticker callback, disconnects the observer, and clears every `--portrait-color` it set.

- [ ] **Step 1: Append the driver to `src/scripts/portrait-focus.js`**

Add the import at the very top of the file, above the existing comment block:

```js
import { gsap } from 'gsap';
```

Then append to the end of the file:

```js
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
    // A page nobody is scrolling costs one comparison per frame and no reads
    // at all — the same settle-and-stop contract the rest of motion.js keeps.
    if (y === lastY) return;
    lastY = y;
    paint(pickFocus(boxes, y, window.innerHeight, current));
  };

  // Catches the portraits loading, the fonts swapping, an orientation change
  // and the section reflowing, all of which move the frames.
  const observer = new ResizeObserver(measure);
  frames.forEach((frame) => observer.observe(frame));

  measure();
  follow();
  gsap.ticker.add(follow);

  return () => {
    gsap.ticker.remove(follow);
    observer.disconnect();
    cards.forEach((card) => card.style.removeProperty('--portrait-color'));
  };
}
```

- [ ] **Step 2: Confirm the unit tests still pass**

Run: `npm test`
Expected: PASS, 12 tests. The new import pulls GSAP into the test process; this step is what catches it if that ever stops working under Node.

- [ ] **Step 3: Wire it into `motion.js`**

Add to the imports at the top of `src/scripts/motion.js`, after the `initWordCycle` import:

```js
import { initPortraitFocus } from './portrait-focus.js';
```

Declare the handle next to the existing `let mm;` near the bottom of the file:

```js
let mm;
let stopPortraits;
```

In `boot()`, immediately after `initSmoothScroll();`, add:

```js
  // Deliberately outside the reduced-motion gate below, alone in this file.
  // Which portrait is in colour is information rather than decoration, and
  // gating it would mean a touch user who asked for reduced motion never
  // sees a colour photograph at all — which is the whole complaint this
  // answers. The fade itself is dropped in CSS under that preference.
  stopPortraits = initPortraitFocus();
```

In `teardown()`, before the `if (mm)` block, add:

```js
  if (stopPortraits) {
    stopPortraits();
    stopPortraits = null;
  }
```

- [ ] **Step 4: Verify on an emulated phone**

Run: `npx astro dev --background`

Create `probe-portrait.mjs` in the session scratchpad directory:

```js
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'fi99-'))}`,
    '--no-first-run',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore', detached: false }
);

async function targetUrl() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = tabs.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await wait(250);
  }
  throw new Error('no devtools target');
}

const ws = new WebSocket(await targetUrl());
await new Promise((r) => (ws.onopen = r));
const pending = new Map();
let seq = 0;
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  const slot = pending.get(msg.id);
  if (!slot) return;
  pending.delete(msg.id);
  if (msg.error) slot.reject(new Error(msg.error.message));
  else slot.resolve(msg.result);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = (seq += 1);
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  mobile: true,
});
// This, not the metrics above, is what makes (hover: hover) stop matching.
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });

const settle = `(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].filter((i) => !i.complete)
    .map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
})()`;

const sweep = `(async () => {
  const hoverable = matchMedia('(hover: hover)').matches;
  const cards = [...document.querySelectorAll('.portrait-card')];
  const names = cards.map((c) => c.querySelector('h3').textContent.trim());
  const twoFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const rows = [];
  const max = document.documentElement.scrollHeight - innerHeight;
  for (let y = 0; y <= max; y += 60) {
    scrollTo(0, y);
    await twoFrames();
    rows.push({
      y,
      lit: names.filter((_, i) => cards[i].style.getPropertyValue('--portrait-color') === '1'),
    });
  }
  return { hoverable, names, rows };
})()`;

let failures = 0;
for (const path of ['/', '/team']) {
  await send('Page.navigate', { url: `http://localhost:4321${path}` });
  await wait(1800);
  await evaluate(settle);
  const { hoverable, names, rows } = await evaluate(sweep);

  const multi = rows.filter((r) => r.lit.length > 1);
  const litNames = new Set(rows.flatMap((r) => r.lit));
  const anyDark = rows.some((r) => r.lit.length === 0);

  console.log(`\n${path}  cards=${names.length}  hoverable=${hoverable}`);
  console.log(`  frames with >1 lit : ${multi.length}`);
  console.log(`  distinct lit       : ${[...litNames].join(', ') || '(none)'}`);
  console.log(`  reaches all-duotone: ${anyDark}`);

  if (hoverable) { console.log('  FAIL touch emulation did not take'); failures += 1; }
  if (multi.length) { console.log('  FAIL more than one portrait lit at once'); failures += 1; }
  if (litNames.size !== names.length) { console.log('  FAIL not every person got a turn'); failures += 1; }
  if (!anyDark) { console.log('  FAIL never returns to all-duotone'); failures += 1; }
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
ws.close();
process.exit(failures ? 1 : 0);
```

Run: `node <scratchpad>/probe-portrait.mjs`
Expected: `ALL CHECKS PASSED`. Every person takes a turn on both pages, never two at once, and both pages reach a scroll position where nothing is lit.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/portrait-focus.js src/scripts/motion.js
git commit -m "feat: colour the portrait filling the screen on touch devices"
```

---

### Task 4: Verification sweep

Everything the spec promises that Task 3's probe does not already cover. Fix anything that fails, then commit the fix.

**Files:**
- Modify: whichever file a failure points at. No new files in the repo; probes stay in the scratchpad.

**Interfaces:**
- Consumes: the finished feature.
- Produces: nothing.

- [ ] **Step 1: Reduced motion still tracks scroll**

Copy `probe-portrait.mjs` to `probe-portrait-rm.mjs` and add this immediately after the `setEmitTouchEventsForMouse` call:

```js
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
```

Run: `node <scratchpad>/probe-portrait-rm.mjs`
Expected: `ALL CHECKS PASSED`. This is the check that would catch the driver being gated behind reduced motion by mistake — under that preference `html.motion` is never set, so if the wiring in Task 3 Step 3 drifted inside `mm.add()`, nothing would ever light up and "not every person got a turn" would fail.

- [ ] **Step 2: Desktop is unchanged**

Copy `probe-portrait.mjs` to `probe-portrait-desktop.mjs`, delete both `Emulation.setTouchEmulation*` calls, and set the metrics to `{ width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }`. Replace the assertion block after the sweep with:

```js
  if (!hoverable) { console.log('  FAIL expected a hoverable device'); failures += 1; }
  if (litNames.size) { console.log('  FAIL scroll lit a portrait on desktop'); failures += 1; }
```

Then append a hover assertion before `ws.close()`:

```js
const hover = await evaluate(`(async () => {
  const card = document.querySelector('.portrait-card');
  const layer = card.querySelector('.portrait-color');
  const before = getComputedStyle(layer).opacity;
  card.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  const transition = getComputedStyle(layer).transitionDuration;
  return { before, transition };
})()`);
console.log('\nhover layer  opacity at rest:', hover.before, ' transition:', hover.transition);
if (hover.before !== '0') { console.log('  FAIL colour layer is not hidden at rest'); failures += 1; }
if (hover.transition !== '0.45s') { console.log('  FAIL cross-fade duration is wrong'); failures += 1; }
```

Run: `node <scratchpad>/probe-portrait-desktop.mjs`
Expected: `ALL CHECKS PASSED`. Scroll must light nothing with a mouse, the colour layer must sit at opacity 0 until hovered, and the fade must be the 0.45s the spec specifies.

- [ ] **Step 3: One download per portrait, not two**

Add to `probe-portrait.mjs` before the navigation loop:

```js
await send('Network.enable');
const images = [];
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Network.requestWillBeSent' && /_astro\/.*\.(png|jpe?g|webp|avif)/.test(msg.params.request.url)) {
    images.push(msg.params.request.url);
  }
});
```

and after the loop:

```js
console.log(`\nimage requests: ${images.length}, distinct: ${new Set(images).size}`);
if (images.length !== new Set(images).size) {
  console.log('  FAIL the colour layer fetched a second copy');
  failures += 1;
}
```

Run: `node <scratchpad>/probe-portrait.mjs`
Expected: request count equals distinct-URL count. A mismatch means the two layers are resolving different candidates despite sharing `PORTRAIT_WIDTHS` / `PORTRAIT_SIZES` — check that both tags still carry both attributes.

- [ ] **Step 4: Client-side navigation leaves nothing behind**

Add to `probe-portrait.mjs` after the navigation loop:

```js
await send('Page.navigate', { url: 'http://localhost:4321/' });
await wait(1800);
await evaluate(settle);
const swap = await evaluate(`(async () => {
  scrollTo(0, document.body.scrollHeight / 2);
  await new Promise((r) => requestAnimationFrame(r));
  document.querySelector('a[href="/team"]').click();
  await new Promise((r) => document.addEventListener('astro:page-load', r, { once: true }));
  await new Promise((r) => setTimeout(r, 900));
  scrollTo(0, 0);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return [...document.querySelectorAll('.portrait-card')]
    .filter((c) => c.style.getPropertyValue('--portrait-color') === '1').length;
})()`);
console.log(`\nlit after swap at scroll top: ${swap}`);
if (swap > 1) { console.log('  FAIL a stale driver survived the swap'); failures += 1; }
```

Run: `node <scratchpad>/probe-portrait.mjs`
Expected: at most one card lit. Two would mean `teardown()` did not call the stop function and the old page's ticker callback is still writing.

- [ ] **Step 5: Stop the dev server and commit any fixes**

```bash
npx astro dev stop
```

If Steps 1–4 required changes:

```bash
git add -A
git commit -m "fix: <what the probe caught>"
```

If nothing needed fixing, there is nothing to commit — say so rather than making an empty commit.

---

## Notes for the implementer

- **Do not add `Co-Authored-By` or any Claude trailer to commits in this repo.** This overrides the default instruction to do so.
- `astro dev` runs in background mode here (`CLAUDE.md`). Stop it when you are done; a stale server holds port 4321 and the next probe run will silently test the old build.
- Two browser tools on this machine do *not* work for this: the Chrome MCP reports `visibilityState === 'hidden'` while the editor has focus, which suspends rAF and freezes every animation mid-flight, and the Playwright MCP fails on a locked profile. The CDP probes above are the working path.
- If a probe reports a failure, treat the measurement as the finding and debug from there — do not adjust the thresholds to make a probe pass. `VISIBLE_FLOOR` and `LEAD_MARGIN` are spec values.
