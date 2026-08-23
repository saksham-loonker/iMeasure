import { buildFrameSnapshot, captureFrameAnchor, createMeasurementRecord } from "./engine.js";
import { getMeasureMode, TRACKING_REASONS, TRACKING_STATES } from "./modes.js";
import { getReferenceTargetById } from "./references.js";

function createInitialFrame(modeId = "precision") {
  const mode = getMeasureMode(modeId);

  return {
    bestHit: null,
    buffer: [],
    cameraPosition: [0, 0, 0],
    confidence: 0,
    distanceFromCamera: 0,
    focusPoint: [0, 0, -1],
    guidance: "Move your phone slowly until the reticle finds a stable surface.",
    hardwareTier: "warming-up",
    pointCloudSummary: {
      count: 0,
      averageConfidence: 0,
      confidenceAvailable: false,
    },
    profile: {
      requiredSamples: mode.requiredSamples,
      maxSpreadMeters: mode.maxSpreadMeters,
      minConfidence: mode.minConfidence,
      minDistanceMeters: mode.minDistanceMeters,
      maxDistanceMeters: mode.maxDistanceMeters,
    },
    stable: false,
    canCapture: false,
    spreadMeters: Infinity,
    tracking: {
      state: TRACKING_STATES.UNAVAILABLE,
      reason: TRACKING_REASONS.NONE,
    },
  };
}

export function createInitialMeasureState() {
  const mode = getMeasureMode("precision");

  return {
    capability: {
      status: "checking",
      isARSupported: null,
      raw: null,
      message: "Checking AR availability...",
    },
    modeId: mode.id,
    unitId: mode.defaultUnit,
    snapMode: mode.defaultSnapMode,
    compareTargetId: "door-width",
    tracking: {
      state: TRACKING_STATES.UNAVAILABLE,
      reason: TRACKING_REASONS.NONE,
    },
    pointCloudSummary: {
      count: 0,
      averageConfidence: 0,
      confidenceAvailable: false,
    },
    sampleBuffer: [],
    currentFrame: createInitialFrame(mode.id),
    startCapture: null,
    lastMeasurement: null,
    measurementHistory: [],
    savedMeasurements: [],
    showSavedPanel: false,
    showPointCloud: false,
    depthDebugEnabled: false,
    lastNotice: "Move your phone until the reticle locks in.",
  };
}

function reopenMeasurementStart(measurement) {
  return {
    point: measurement.startPoint,
    confidence: measurement.startConfidence,
    hardwareTier: measurement.hardwareTier,
    hitType: "Reopened",
    spreadMeters: 0,
    capturedAt: measurement.capturedAt,
  };
}

export function measureReducer(state, action) {
  switch (action.type) {
    case "CAPABILITY_RESOLVED":
      return {
        ...state,
        capability: {
          status: action.payload?.status ?? "ready",
          isARSupported: action.payload?.isARSupported ?? true,
          raw: action.payload?.raw ?? null,
          message: action.payload?.message ?? "AR profile ready.",
        },
      };

    case "SET_MODE": {
      const mode = getMeasureMode(action.payload);
      return {
        ...state,
        modeId: mode.id,
        unitId: mode.defaultUnit,
        snapMode: mode.defaultSnapMode,
      };
    }

    case "SET_UNIT":
      return {
        ...state,
        unitId: action.payload,
      };

    case "SET_SNAP_MODE":
      return {
        ...state,
        snapMode: action.payload,
      };

    case "SET_COMPARE_TARGET":
      return {
        ...state,
        compareTargetId: action.payload,
      };

    case "POINT_CLOUD_UPDATED":
      return {
        ...state,
        pointCloudSummary: action.payload,
      };

    case "TRACKING_UPDATED":
      return {
        ...state,
        tracking: action.payload,
      };

    case "FRAME_UPDATED": {
      const modeId = action.payload?.modeId ?? state.modeId;
      const tracking = action.payload?.tracking ?? state.tracking;
      const pointCloudSummary =
        action.payload?.pointCloudSummary ?? state.pointCloudSummary;
      const snapshot = buildFrameSnapshot({
        modeId,
        capability: state.capability,
        tracking,
        pointCloudSummary,
        buffer: state.sampleBuffer,
        hitTestResults: action.payload?.hitTestResults ?? [],
        cameraOrientation: action.payload?.cameraOrientation ?? {},
      });

      return {
        ...state,
        tracking,
        pointCloudSummary,
        sampleBuffer: snapshot.buffer,
        currentFrame: snapshot,
        lastNotice: snapshot.guidance,
      };
    }

    case "CAPTURE_POINT": {
      if (!state.currentFrame.canCapture) {
        return {
          ...state,
          lastNotice: state.currentFrame.guidance,
        };
      }

      const currentCapture = captureFrameAnchor(state.currentFrame);

      if (!state.startCapture || state.lastMeasurement) {
        return {
          ...state,
          startCapture: currentCapture,
          lastMeasurement: null,
          sampleBuffer: [],
          lastNotice: "Start point locked. Move to the second point and capture again.",
        };
      }

      const measurement = createMeasurementRecord({
        startCapture: state.startCapture,
        endCapture: currentCapture,
        modeId: state.modeId,
        unitId: state.unitId,
        snapMode: state.snapMode,
        compareTarget: getReferenceTargetById(state.compareTargetId),
      });

      return {
        ...state,
        startCapture: null,
        lastMeasurement: measurement,
        measurementHistory: [measurement, ...state.measurementHistory],
        lastNotice: `Measured ${measurement.formattedDistance}.`,
      };
    }

    case "RESET_MEASUREMENT":
      return {
        ...state,
        startCapture: null,
        lastMeasurement: null,
        sampleBuffer: [],
        currentFrame: {
          ...state.currentFrame,
          buffer: [],
          confidence: 0,
          stable: false,
          canCapture: false,
          spreadMeters: Infinity,
          guidance: "Move your phone slowly until the reticle finds a stable surface.",
        },
        lastNotice: "Measurement cleared.",
      };

    case "UNDO_POINT":
      if (state.startCapture && !state.lastMeasurement) {
        return {
          ...state,
          startCapture: null,
          lastNotice: "Start point removed.",
        };
      }

      if (state.lastMeasurement) {
        return {
          ...state,
          startCapture: reopenMeasurementStart(state.lastMeasurement),
          lastMeasurement: null,
          measurementHistory: state.measurementHistory.filter(
            (measurement) => measurement.id !== state.lastMeasurement.id
          ),
          lastNotice: "Previous measurement reopened. Capture a new endpoint.",
        };
      }

      return state;

    case "SAVE_LAST_MEASUREMENT":
      if (!state.lastMeasurement) {
        return {
          ...state,
          lastNotice: "Capture a measurement before saving it.",
        };
      }

      if (
        state.savedMeasurements.some(
          (measurement) => measurement.id === state.lastMeasurement.id
        )
      ) {
        return {
          ...state,
          lastNotice: "That measurement is already in your saved library.",
        };
      }

      return {
        ...state,
        savedMeasurements: [
          {
            ...state.lastMeasurement,
            savedAt: new Date().toISOString(),
          },
          ...state.savedMeasurements,
        ],
        lastNotice: "Saved to your quick-measure library.",
      };

    case "CLEAR_SAVED_MEASUREMENTS":
      return {
        ...state,
        savedMeasurements: [],
        lastNotice: "Saved measurements cleared.",
      };

    case "TOGGLE_SAVED_PANEL":
      return {
        ...state,
        showSavedPanel: !state.showSavedPanel,
      };

    case "TOGGLE_POINT_CLOUD":
      return {
        ...state,
        showPointCloud: !state.showPointCloud,
      };

    case "TOGGLE_DEPTH_DEBUG":
      return {
        ...state,
        depthDebugEnabled: !state.depthDebugEnabled,
      };

    default:
      return state;
  }
}
