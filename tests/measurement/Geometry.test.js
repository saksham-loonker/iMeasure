import test from "node:test";
import assert from "node:assert/strict";

import {
  applySnapMode,
  averagePoint,
  clamp,
  distanceBetweenPoints,
  formatDistance,
  getAxisBreakdown,
  getMidpoint,
} from "../../src/utils/Geometry.js";

test("distanceBetweenPoints returns euclidean distance in meters", () => {
  assert.equal(distanceBetweenPoints([0, 0, 0], [3, 4, 0]), 5);
});

test("getMidpoint offsets above line while preserving center", () => {
  assert.deepEqual(getMidpoint([0, 0, 0], [2, 2, 2], 0.1), [1, 1.1, 1]);
});

test("averagePoint blends weighted samples", () => {
  const point = averagePoint([
    { point: [0, 0, 0], weight: 1 },
    { point: [2, 2, 2], weight: 3 },
  ]);

  assert.deepEqual(point, [1.5, 1.5, 1.5]);
});

test("applySnapMode auto snaps to horizontal when vertical drift is small", () => {
  const snapped = applySnapMode([0, 0, 0], [2, 0.2, 2], "auto");

  assert.equal(snapped.appliedSnapMode, "horizontal");
  assert.deepEqual(snapped.endPoint, [2, 0, 2]);
});

test("applySnapMode auto snaps to vertical when vertical dominates", () => {
  const snapped = applySnapMode([1, 0, 1], [1.1, 2, 1.1], "auto");

  assert.equal(snapped.appliedSnapMode, "vertical");
  assert.deepEqual(snapped.endPoint, [1, 2, 1]);
});

test("getAxisBreakdown reports horizontal and vertical components", () => {
  const axes = getAxisBreakdown([0, 0, 0], [3, 4, 12]);

  assert.deepEqual(axes, {
    x: 3,
    y: 4,
    z: 12,
    horizontal: Math.sqrt(153),
    vertical: 4,
  });
});

test("formatDistance supports metric and imperial units", () => {
  assert.equal(formatDistance(1.234, "m"), "1.23 m");
  assert.equal(formatDistance(1.234, "cm"), "123.4 cm");
  assert.equal(formatDistance(1.234, "in"), "48.58 in");
});

test("clamp keeps values within bounds", () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});
