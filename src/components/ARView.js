import React from "react";
import {
  ViroAmbientLight,
  ViroARScene,
  ViroMaterials,
  ViroNode,
  ViroPolyline,
  ViroSphere,
  ViroText,
} from "@reactvision/react-viro";

import { useMeasure } from "../context/MeasureContext";
import {
  distanceBetweenPoints,
  formatDistance,
  getMidpoint,
} from "../utils/Geometry.js";

function getReticleMaterial(frame) {
  if (frame.canCapture) {
    return "reticleLocked";
  }

  if (frame.bestHit) {
    return "reticleTracking";
  }

  return "reticleSearching";
}

export default function ARViewScene() {
  const { state, actions } = useMeasure();

  const previewStart = state.startCapture?.point ?? state.lastMeasurement?.startPoint ?? null;
  const previewEnd =
    state.lastMeasurement?.endPoint ??
    (state.startCapture ? state.currentFrame.focusPoint : null);
  const previewDistance =
    previewStart && previewEnd
      ? distanceBetweenPoints(previewStart, previewEnd)
      : 0;

  return (
    <ViroARScene
      anchorDetectionTypes={["PlanesHorizontal", "PlanesVertical"]}
      displayPointCloud={state.showPointCloud}
      onARPointCloudUpdate={actions.updatePointCloud}
      onCameraARHitTest={actions.updateFrame}
      onTrackingUpdated={actions.updateTrackingState}
    >
      <ViroAmbientLight color="#ffffff" intensity={900} />

      <ViroNode position={state.currentFrame.focusPoint}>
        <ViroSphere
          radius={state.currentFrame.canCapture ? 0.008 : 0.006}
          materials={[getReticleMaterial(state.currentFrame)]}
        />
      </ViroNode>

      {previewStart ? (
        <ViroNode position={previewStart}>
          <ViroSphere radius={0.012} materials={["anchorStart"]} />
        </ViroNode>
      ) : null}

      {state.lastMeasurement?.endPoint ? (
        <ViroNode position={state.lastMeasurement.endPoint}>
          <ViroSphere radius={0.012} materials={["anchorEnd"]} />
        </ViroNode>
      ) : null}

      {previewStart && previewEnd ? (
        <ViroPolyline
          points={[previewStart, previewEnd]}
          thickness={0.0035}
          materials={[
            state.lastMeasurement ? "measurementComplete" : "measurementPreview",
          ]}
        />
      ) : null}

      {previewStart && previewEnd ? (
        <ViroText
          text={formatDistance(previewDistance, state.unitId)}
          position={getMidpoint(previewStart, previewEnd, 0.08)}
          scale={[0.18, 0.18, 0.18]}
          width={2.4}
          height={0.4}
          style={styles.distanceLabel}
          transformBehaviors={["billboard"]}
        />
      ) : null}

      <ViroText
        text={state.currentFrame.guidance}
        position={[0, 0.22, -0.7]}
        scale={[0.14, 0.14, 0.14]}
        width={3}
        height={0.5}
        style={styles.instructionLabel}
        transformBehaviors={["billboard"]}
      />
    </ViroARScene>
  );
}

ViroMaterials.createMaterials({
  reticleSearching: {
    diffuseColor: "#cfd8e3",
    lightingModel: "Constant",
  },
  reticleTracking: {
    diffuseColor: "#45c4ff",
    lightingModel: "Constant",
  },
  reticleLocked: {
    diffuseColor: "#5ef0a0",
    lightingModel: "Constant",
  },
  anchorStart: {
    diffuseColor: "#ffd166",
    lightingModel: "Constant",
  },
  anchorEnd: {
    diffuseColor: "#ff8a65",
    lightingModel: "Constant",
  },
  measurementPreview: {
    diffuseColor: "#45c4ff",
    lightingModel: "Constant",
  },
  measurementComplete: {
    diffuseColor: "#5ef0a0",
    lightingModel: "Constant",
  },
});

const styles = {
  distanceLabel: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  instructionLabel: {
    color: "#d7e2f3",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
};
