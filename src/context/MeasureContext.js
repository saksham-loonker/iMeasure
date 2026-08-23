import React, { createContext, useContext, useReducer } from "react";

import { summarizePointCloud } from "../measurement/engine.js";
import {
  MEASURE_MODE_LIST,
  SNAP_MODE_OPTIONS,
  TRACKING_REASONS,
  TRACKING_STATES,
  UNIT_OPTIONS,
} from "../measurement/modes.js";
import {
  getReferenceTargetById,
  REFERENCE_TARGETS,
} from "../measurement/references.js";
import {
  createInitialMeasureState,
  measureReducer,
} from "../measurement/state.js";

const MeasureContext = createContext(null);

export function MeasureProvider({ children }) {
  const [state, dispatch] = useReducer(
    measureReducer,
    undefined,
    createInitialMeasureState
  );

  const value = {
    state,
    modeList: MEASURE_MODE_LIST,
    unitOptions: UNIT_OPTIONS,
    snapOptions: SNAP_MODE_OPTIONS,
    referenceTargets: REFERENCE_TARGETS,
    compareTarget: getReferenceTargetById(state.compareTargetId),
    trackingConstants: {
      states: TRACKING_STATES,
      reasons: TRACKING_REASONS,
    },
    actions: {
      resolveCapability(payload) {
        dispatch({ type: "CAPABILITY_RESOLVED", payload });
      },
      setMode(modeId) {
        dispatch({ type: "SET_MODE", payload: modeId });
      },
      setUnit(unitId) {
        dispatch({ type: "SET_UNIT", payload: unitId });
      },
      setSnapMode(snapMode) {
        dispatch({ type: "SET_SNAP_MODE", payload: snapMode });
      },
      setCompareTarget(targetId) {
        dispatch({ type: "SET_COMPARE_TARGET", payload: targetId });
      },
      updateFrame(update) {
        dispatch({
          type: "FRAME_UPDATED",
          payload: {
            hitTestResults: update?.hitTestResults ?? update ?? [],
            cameraOrientation: update?.cameraOrientation ?? {},
            tracking: state.tracking,
            pointCloudSummary: state.pointCloudSummary,
          },
        });
      },
      updatePointCloud(pointCloudUpdate) {
        dispatch({
          type: "POINT_CLOUD_UPDATED",
          payload: summarizePointCloud(pointCloudUpdate),
        });
      },
      updateTrackingState(nextState, nextReason) {
        dispatch({
          type: "TRACKING_UPDATED",
          payload: {
            state: nextState,
            reason: nextReason,
          },
        });
      },
      capturePoint() {
        dispatch({ type: "CAPTURE_POINT" });
      },
      undoPoint() {
        dispatch({ type: "UNDO_POINT" });
      },
      resetMeasurement() {
        dispatch({ type: "RESET_MEASUREMENT" });
      },
      saveLastMeasurement() {
        dispatch({ type: "SAVE_LAST_MEASUREMENT" });
      },
      clearSavedMeasurements() {
        dispatch({ type: "CLEAR_SAVED_MEASUREMENTS" });
      },
      toggleSavedPanel() {
        dispatch({ type: "TOGGLE_SAVED_PANEL" });
      },
      togglePointCloud() {
        dispatch({ type: "TOGGLE_POINT_CLOUD" });
      },
      toggleDepthDebug() {
        dispatch({ type: "TOGGLE_DEPTH_DEBUG" });
      },
    },
  };

  return <MeasureContext.Provider value={value}>{children}</MeasureContext.Provider>;
}

export function useMeasure() {
  const context = useContext(MeasureContext);

  if (!context) {
    throw new Error("useMeasure must be used within MeasureProvider");
  }

  return context;
}
