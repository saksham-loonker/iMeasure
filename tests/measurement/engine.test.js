import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFrameSnapshot,
  createMeasurementRecord,
  summarizePointCloud,
} from "../../src/measurement/engine.js";

test("summarizePointCloud calculates density and average confidence", () => {
  const summary = summarizePointCloud({
    pointCloud: {
      points: [
        [0, 0, 0, 0.5],
        [1, 0, 0, 1],
      ],
    },
  });

  assert.deepEqual(summary, {
    count: 2,
    averageConfidence: 0.75,
    confidenceAvailable: true,
  });
});

test("buildFrameSnapshot prefers stronger hit types and reaches stable lock", () => {
  let buffer = [];
  let snapshot;

  for (let index = 0; index < 8; index += 1) {
    snapshot = buildFrameSnapshot({
      modeId: "quick",
      capability: {
        isARSupported: true,
      },
      tracking: {
        state: 3,
        reason: 1,
      },
      pointCloudSummary: {
        count: 180,
        averageConfidence: 0.88,
        confidenceAvailable: true,
      },
      buffer,
      hitTestResults: [
        {
          type: "FeaturePoint",
          transform: {
            position: [0.28, 0.91, -1.15],
          },
        },
        {
          type: "ExistingPlaneUsingExtent",
          transform: {
            position: [0.3, 0.9, -1.1],
          },
        },
      ],
      cameraOrientation: {
        position: [0, 1.4, 0],
        forward: [0, 0, -1],
      },
    });

    buffer = snapshot.buffer;
  }

  assert.equal(snapshot.bestHit.type, "ExistingPlaneUsingExtent");
  assert.equal(snapshot.stable, true);
  assert.ok(snapshot.confidence >= 0.8);
  assert.equal(snapshot.hardwareTier, "depth-ready");
});

test("buildFrameSnapshot blocks capture while tracking is limited", () => {
  const snapshot = buildFrameSnapshot({
    modeId: "precision",
    capability: {
      isARSupported: true,
    },
    tracking: {
      state: 2,
      reason: 2,
    },
    pointCloudSummary: {
      count: 12,
      averageConfidence: 0.4,
      confidenceAvailable: true,
    },
    buffer: [],
    hitTestResults: [],
    cameraOrientation: {
      position: [0, 0, 0],
      forward: [0, 0, -1],
    },
  });

  assert.equal(snapshot.stable, false);
  assert.match(snapshot.guidance, /Move slower/i);
});

test("createMeasurementRecord builds snapped distance and compare insight", () => {
  const record = createMeasurementRecord({
    startCapture: {
      point: [0, 0, 0],
      confidence: 0.82,
      hardwareTier: "plane-locked",
    },
    endCapture: {
      point: [2, 0.1, 2],
      confidence: 0.79,
      hardwareTier: "plane-locked",
    },
    modeId: "room",
    unitId: "m",
    snapMode: "auto",
    compareTarget: {
      id: "door-width",
      label: "Door width",
      meters: 0.91,
    },
  });

  assert.equal(record.appliedSnapMode, "horizontal");
  assert.equal(record.formattedDistance, "2.83 m");
  assert.equal(record.compare.deltaMeters.toFixed(2), "1.92");
  assert.equal(record.qualityLabel, "High confidence");
});
