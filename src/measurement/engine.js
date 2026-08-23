import {
  applySnapMode,
  averagePoint,
  clamp,
  distanceBetweenPoints,
  formatDistance,
  formatSignedDistance,
  getAxisBreakdown,
  isValidPoint,
  spreadFromPoint,
  toArray,
} from "../utils/Geometry.js";
import {
  getMeasureMode,
  TRACKING_REASONS,
  TRACKING_STATES,
} from "./modes.js";

const HIT_TYPE_SCORES = {
  DepthPoint: 1,
  ExistingPlaneUsingExtent: 0.96,
  ExistingPlane: 0.9,
  EstimatedHorizontalPlane: 0.78,
  EstimatedVerticalPlane: 0.78,
  FeaturePoint: 0.62,
  Unknown: 0.4,
};

function getHitTypeScore(type) {
  return HIT_TYPE_SCORES[type] ?? HIT_TYPE_SCORES.Unknown;
}

function normalizeHitResult(hitResult) {
  const position = toArray(hitResult?.transform?.position ?? hitResult?.position);

  if (!isValidPoint(position)) {
    return null;
  }

  return {
    type: hitResult?.type ?? "Unknown",
    position,
  };
}

export function summarizePointCloud(pointCloudUpdate) {
  const points =
    pointCloudUpdate?.pointCloud?.points ?? pointCloudUpdate?.points ?? [];

  if (!Array.isArray(points) || points.length === 0) {
    return {
      count: 0,
      averageConfidence: 0,
      confidenceAvailable: false,
    };
  }

  let totalConfidence = 0;
  let confidenceSamples = 0;

  for (const point of points) {
    if (Array.isArray(point) && Number.isFinite(point[3])) {
      totalConfidence += point[3];
      confidenceSamples += 1;
    }
  }

  return {
    count: points.length,
    averageConfidence: confidenceSamples ? totalConfidence / confidenceSamples : 0,
    confidenceAvailable: confidenceSamples > 0,
  };
}

function scoreHitResult(hitResult, pointCloudSummary, cameraPosition) {
  let score = getHitTypeScore(hitResult.type);

  if (pointCloudSummary.count >= 160) {
    score += 0.08;
  } else if (pointCloudSummary.count >= 80) {
    score += 0.05;
  } else if (pointCloudSummary.count >= 20) {
    score += 0.02;
  }

  if (pointCloudSummary.confidenceAvailable) {
    score += pointCloudSummary.averageConfidence * 0.08;
  }

  if (cameraPosition) {
    const cameraDistance = distanceBetweenPoints(cameraPosition, hitResult.position);

    if (cameraDistance >= 0.15 && cameraDistance <= 4) {
      score += 0.04;
    }

    if (cameraDistance > 8) {
      score -= 0.08;
    }
  }

  return clamp(score, 0, 1);
}

function pickBestHitResult(hitTestResults, pointCloudSummary, cameraPosition) {
  return (Array.isArray(hitTestResults) ? hitTestResults : [])
    .map(normalizeHitResult)
    .filter(Boolean)
    .map((hitResult) => ({
      ...hitResult,
      score: scoreHitResult(hitResult, pointCloudSummary, cameraPosition),
    }))
    .sort((left, right) => right.score - left.score)[0];
}

function inferHardwareTier(capability, pointCloudSummary, bestHit) {
  if (capability?.isARSupported === false) {
    return "unsupported";
  }

  if (
    bestHit?.type === "DepthPoint" ||
    pointCloudSummary.averageConfidence >= 0.82 ||
    pointCloudSummary.count >= 160
  ) {
    return "depth-ready";
  }

  if ((bestHit?.type ?? "").startsWith("ExistingPlane") || pointCloudSummary.count >= 70) {
    return "plane-locked";
  }

  return "feature-point";
}

function deriveProfile(mode, hardwareTier, pointCloudSummary, bestHit) {
  const profile = {
    requiredSamples: mode.requiredSamples,
    maxSpreadMeters: mode.maxSpreadMeters,
    minConfidence: mode.minConfidence,
    minDistanceMeters: mode.minDistanceMeters,
    maxDistanceMeters: mode.maxDistanceMeters,
  };

  if (hardwareTier === "depth-ready") {
    profile.requiredSamples = Math.max(4, profile.requiredSamples - 1);
    profile.maxSpreadMeters *= 0.9;
    profile.minConfidence = Math.max(0.68, profile.minConfidence - 0.05);
  }

  if (hardwareTier === "feature-point") {
    profile.requiredSamples += 2;
    profile.maxSpreadMeters *= 0.8;
    profile.maxDistanceMeters = Math.min(profile.maxDistanceMeters, 2.5);
    profile.minConfidence = Math.min(0.94, profile.minConfidence + 0.05);
  }

  if (bestHit?.type === "FeaturePoint") {
    profile.requiredSamples += 1;
    profile.maxSpreadMeters *= 0.9;
  }

  if (pointCloudSummary.count < 25) {
    profile.requiredSamples += 1;
  }

  return profile;
}

function getTrackingMultiplier(tracking) {
  if (tracking?.state === TRACKING_STATES.NORMAL) {
    return 1;
  }

  if (tracking?.state === TRACKING_STATES.LIMITED) {
    return 0.35;
  }

  return 0.12;
}

function buildGuidance({
  capability,
  tracking,
  bestHit,
  stable,
  withinRange,
  pointCloudSummary,
}) {
  if (capability?.isARSupported === false) {
    return "This device did not report AR support.";
  }

  if (tracking?.state === TRACKING_STATES.LIMITED) {
    if (tracking.reason === TRACKING_REASONS.EXCESSIVE_MOTION) {
      return "Move slower and keep the camera steady.";
    }

    if (tracking.reason === TRACKING_REASONS.INSUFFICIENT_FEATURES) {
      return "Aim at a textured, well-lit surface so AR can lock cleanly.";
    }

    return "Tracking is limited. Hold still for a more reliable lock.";
  }

  if (!bestHit) {
    return "Scan a wall, floor, or object edge until the reticle finds a surface.";
  }

  if (!withinRange) {
    return "Move a little closer so the measurement stays inside the reliable range.";
  }

  if (pointCloudSummary.count < 20) {
    return "Keep moving slowly to collect more depth and feature points.";
  }

  if (!stable) {
    return "Hold steady until the lock meter fills for a repeatable reading.";
  }

  return "Locked and ready to capture.";
}

export function getQualityLabel(confidence) {
  if (confidence >= 0.9) {
    return "Locked in";
  }

  if (confidence >= 0.75) {
    return "High confidence";
  }

  if (confidence >= 0.58) {
    return "Moderate confidence";
  }

  return "Needs verification";
}

export function buildFrameSnapshot({
  modeId = "precision",
  capability,
  tracking = {
    state: TRACKING_STATES.UNAVAILABLE,
    reason: TRACKING_REASONS.NONE,
  },
  pointCloudSummary = summarizePointCloud(),
  buffer = [],
  hitTestResults = [],
  cameraOrientation = {},
}) {
  const mode = getMeasureMode(modeId);
  const cameraPosition = toArray(cameraOrientation?.position);
  const bestHit = pickBestHitResult(hitTestResults, pointCloudSummary, cameraPosition) ?? null;
  const hardwareTier = inferHardwareTier(capability, pointCloudSummary, bestHit);
  const profile = deriveProfile(mode, hardwareTier, pointCloudSummary, bestHit);

  let nextBuffer = Array.isArray(buffer) ? [...buffer] : [];

  if (bestHit) {
    nextBuffer.push({
      point: bestHit.position,
      weight: bestHit.score,
      type: bestHit.type,
    });
  } else {
    nextBuffer = nextBuffer.slice(-Math.max(profile.requiredSamples - 2, 0));
  }

  nextBuffer = nextBuffer.slice(-(profile.requiredSamples + 6));

  const focusPoint = nextBuffer.length
    ? averagePoint(nextBuffer)
    : bestHit?.position ?? [0, 0, -1];
  const spreadMeters = nextBuffer.length ? spreadFromPoint(nextBuffer, focusPoint) : Infinity;
  const sampleProgress = clamp(nextBuffer.length / profile.requiredSamples, 0, 1);
  const trackingMultiplier = getTrackingMultiplier(tracking);
  const stabilityFactor = bestHit
    ? 1 - clamp(spreadMeters / profile.maxSpreadMeters, 0, 1)
    : 0;
  const confidence = clamp(
    (bestHit?.score ?? 0) * 0.45 +
      sampleProgress * 0.25 +
      stabilityFactor * 0.2 +
      trackingMultiplier * 0.1,
    0,
    1
  );
  const distanceFromCamera = bestHit
    ? distanceBetweenPoints(cameraPosition, focusPoint)
    : 0;
  const withinRange =
    distanceFromCamera >= profile.minDistanceMeters &&
    distanceFromCamera <= profile.maxDistanceMeters;
  const stable = Boolean(
    bestHit &&
      tracking.state === TRACKING_STATES.NORMAL &&
      capability?.isARSupported !== false &&
      nextBuffer.length >= profile.requiredSamples &&
      spreadMeters <= profile.maxSpreadMeters &&
      confidence >= profile.minConfidence &&
      withinRange
  );

  return {
    bestHit,
    buffer: nextBuffer,
    cameraPosition,
    confidence,
    distanceFromCamera,
    focusPoint,
    guidance: buildGuidance({
      capability,
      tracking,
      bestHit,
      stable,
      withinRange,
      pointCloudSummary,
    }),
    hardwareTier,
    pointCloudSummary,
    profile,
    stable,
    canCapture: stable,
    spreadMeters,
    tracking,
  };
}

export function captureFrameAnchor(frameSnapshot) {
  return {
    point: toArray(frameSnapshot.focusPoint),
    confidence: frameSnapshot.confidence,
    hitType: frameSnapshot.bestHit?.type ?? "Unknown",
    hardwareTier: frameSnapshot.hardwareTier,
    spreadMeters: frameSnapshot.spreadMeters,
    capturedAt: new Date().toISOString(),
  };
}

export function createMeasurementRecord({
  startCapture,
  endCapture,
  modeId,
  unitId,
  snapMode,
  compareTarget,
}) {
  const startPoint = toArray(startCapture?.point);
  const rawEndPoint = toArray(endCapture?.point);
  const snapped = applySnapMode(startPoint, rawEndPoint, snapMode);
  const distanceMeters = distanceBetweenPoints(startPoint, snapped.endPoint);
  const confidence = clamp(
    ((startCapture?.confidence ?? 0) + (endCapture?.confidence ?? 0)) / 2,
    0,
    1
  );

  return {
    id: `measure-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: new Date().toISOString(),
    modeId,
    unitId,
    snapMode,
    appliedSnapMode: snapped.appliedSnapMode,
    startPoint,
    endPoint: snapped.endPoint,
    rawEndPoint,
    startConfidence: startCapture?.confidence ?? 0,
    endConfidence: endCapture?.confidence ?? 0,
    distanceMeters,
    formattedDistance: formatDistance(distanceMeters, unitId),
    axes: getAxisBreakdown(startPoint, snapped.endPoint),
    confidence,
    qualityLabel: getQualityLabel(confidence),
    hardwareTier:
      endCapture?.hardwareTier ?? startCapture?.hardwareTier ?? "feature-point",
    compare: compareTarget
      ? {
          id: compareTarget.id,
          label: compareTarget.label,
          targetMeters: compareTarget.meters,
          deltaMeters: distanceMeters - compareTarget.meters,
          formattedDelta: formatSignedDistance(
            distanceMeters - compareTarget.meters,
            unitId
          ),
        }
      : null,
  };
}
