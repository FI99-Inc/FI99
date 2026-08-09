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

test('the incumbent only holds the lead because it is the incumbent', () => {
  const boxes = [
    { top: 0, height: 100, width: 100 },
    { top: 0, height: 105, width: 100 },
  ];
  // Same geometry, different incumbent, different winner: proof that
  // `current` is what decided it and not the areas.
  assert.equal(pickFocus(boxes, 0, VH, -1), 1);
  assert.equal(pickFocus(boxes, 0, VH, 0), 0);
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
