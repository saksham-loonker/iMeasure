import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialMeasureState,
  measureReducer,
} from "../../src/measurement/state.js";

test("capture flow starts and completes a measurement only when frame is stable", () => {
  let state = createInitialMeasureState();

  state = measureReducer(state, {
    type: "FRAME_UPDATED",
    payload: {
      modeId: "quick",
      capability: { isARSupported: true },
      tracking: { state: 3, reason: 1 },
      pointCloudSummary: {
        count: 120,
        averageConfidence: 0.9,
        confidenceAvailable: true,
      },
      hitTestResults: [
        {
          type: "ExistingPlaneUsingExtent",
          transform: { position: [0, 0.75, -0.8] },
        },
      ],
      cameraOrientation: {
        position: [0, 1.4, 0],
        forward: [0, 0, -1],
      },
    },
  });

  for (let index = 0; index < 7; index += 1) {
    state = measureReducer(state, {
      type: "FRAME_UPDATED",
      payload: {
        modeId: "quick",
        capability: { isARSupported: true },
        tracking: { state: 3, reason: 1 },
        pointCloudSummary: {
          count: 120,
          averageConfidence: 0.9,
          confidenceAvailable: true,
        },
        hitTestResults: [
          {
            type: "ExistingPlaneUsingExtent",
            transform: { position: [0, 0.75, -0.8] },
          },
        ],
        cameraOrientation: {
          position: [0, 1.4, 0],
          forward: [0, 0, -1],
        },
      },
    });
  }

  state = measureReducer(state, { type: "CAPTURE_POINT" });
  assert.ok(state.startCapture);
  assert.equal(state.lastMeasurement, null);

  state = measureReducer(state, {
    type: "FRAME_UPDATED",
    payload: {
      modeId: "quick",
      capability: { isARSupported: true },
      tracking: { state: 3, reason: 1 },
      pointCloudSummary: {
        count: 150,
        averageConfidence: 0.92,
        confidenceAvailable: true,
      },
      hitTestResults: [
        {
          type: "ExistingPlaneUsingExtent",
          transform: { position: [0.6, 0.75, -1.2] },
        },
      ],
      cameraOrientation: {
        position: [0, 1.4, 0],
        forward: [0, 0, -1],
      },
    },
  });

  for (let index = 0; index < 7; index += 1) {
    state = measureReducer(state, {
      type: "FRAME_UPDATED",
      payload: {
        modeId: "quick",
        capability: { isARSupported: true },
        tracking: { state: 3, reason: 1 },
        pointCloudSummary: {
          count: 150,
          averageConfidence: 0.92,
          confidenceAvailable: true,
        },
        hitTestResults: [
          {
            type: "ExistingPlaneUsingExtent",
            transform: { position: [0.6, 0.75, -1.2] },
          },
        ],
        cameraOrientation: {
          position: [0, 1.4, 0],
          forward: [0, 0, -1],
        },
      },
    });
  }

  state = measureReducer(state, { type: "CAPTURE_POINT" });

  assert.ok(state.lastMeasurement);
  assert.equal(state.measurementHistory.length, 1);
});

test("saving the current measurement moves it to favorites", () => {
  let state = createInitialMeasureState();

  state = {
    ...state,
    lastMeasurement: {
      id: "measure-1",
      formattedDistance: "91.0 cm",
    },
  };

  state = measureReducer(state, { type: "SAVE_LAST_MEASUREMENT" });

  assert.equal(state.savedMeasurements.length, 1);
  assert.equal(state.savedMeasurements[0].id, "measure-1");
});
