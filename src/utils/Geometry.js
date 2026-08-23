const METERS_TO_CENTIMETERS = 100;
const METERS_TO_INCHES = 39.3700787402;
const METERS_TO_FEET = 3.280839895;

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function toArray(point) {
  if (Array.isArray(point)) {
    return [Number(point[0]) || 0, Number(point[1]) || 0, Number(point[2]) || 0];
  }

  if (point && typeof point === "object") {
    return [Number(point.x) || 0, Number(point.y) || 0, Number(point.z) || 0];
  }

  return [0, 0, 0];
}

export function isValidPoint(point) {
  const [x, y, z] = toArray(point);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);
}

export function vectorBetweenPoints(startPoint, endPoint) {
  const [startX, startY, startZ] = toArray(startPoint);
  const [endX, endY, endZ] = toArray(endPoint);
  return [endX - startX, endY - startY, endZ - startZ];
}

export function magnitude(vector) {
  const [x, y, z] = toArray(vector);
  return Math.hypot(x, y, z);
}

export function distanceBetweenPoints(startPoint, endPoint) {
  if (!isValidPoint(startPoint) || !isValidPoint(endPoint)) {
    return 0;
  }

  return magnitude(vectorBetweenPoints(startPoint, endPoint));
}

export function averagePoint(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return [0, 0, 0];
  }

  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (const sample of samples) {
    const point = toArray(sample?.point ?? sample);
    const weight = Math.max(Number(sample?.weight ?? 1) || 0, 0) || 1;

    totalWeight += weight;
    sumX += point[0] * weight;
    sumY += point[1] * weight;
    sumZ += point[2] * weight;
  }

  return [sumX / totalWeight, sumY / totalWeight, sumZ / totalWeight];
}

export function spreadFromPoint(samples, centerPoint) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return Infinity;
  }

  return samples.reduce((maxDistance, sample) => {
    const point = sample?.point ?? sample;
    return Math.max(maxDistance, distanceBetweenPoints(point, centerPoint));
  }, 0);
}

export function getMidpoint(startPoint, endPoint, labelOffsetY = 0.05) {
  const [startX, startY, startZ] = toArray(startPoint);
  const [endX, endY, endZ] = toArray(endPoint);

  return [
    (startX + endX) / 2,
    (startY + endY) / 2 + labelOffsetY,
    (startZ + endZ) / 2,
  ];
}

export function getAxisBreakdown(startPoint, endPoint) {
  const [deltaX, deltaY, deltaZ] = vectorBetweenPoints(startPoint, endPoint).map(
    (value) => Math.abs(value)
  );

  return {
    x: deltaX,
    y: deltaY,
    z: deltaZ,
    horizontal: Math.hypot(deltaX, deltaZ),
    vertical: deltaY,
  };
}

export function applySnapMode(startPoint, endPoint, snapMode = "auto") {
  const start = toArray(startPoint);
  const end = toArray(endPoint);
  const [deltaX, deltaY, deltaZ] = vectorBetweenPoints(start, end);
  const horizontalDistance = Math.hypot(deltaX, deltaZ);
  const verticalDistance = Math.abs(deltaY);

  if (snapMode === "horizontal") {
    return {
      endPoint: [end[0], start[1], end[2]],
      appliedSnapMode: "horizontal",
    };
  }

  if (snapMode === "vertical") {
    return {
      endPoint: [start[0], end[1], start[2]],
      appliedSnapMode: "vertical",
    };
  }

  if (snapMode === "free") {
    return {
      endPoint: end,
      appliedSnapMode: "free",
    };
  }

  if (verticalDistance >= Math.max(horizontalDistance * 1.35, 0.12)) {
    return {
      endPoint: [start[0], end[1], start[2]],
      appliedSnapMode: "vertical",
    };
  }

  if (horizontalDistance >= Math.max(verticalDistance * 1.35, 0.12)) {
    return {
      endPoint: [end[0], start[1], end[2]],
      appliedSnapMode: "horizontal",
    };
  }

  return {
    endPoint: end,
    appliedSnapMode: "free",
  };
}

export function formatDistance(meters, unitId = "adaptive") {
  const safeMeters = Math.max(Number(meters) || 0, 0);

  if (unitId === "cm") {
    return `${(safeMeters * METERS_TO_CENTIMETERS).toFixed(1)} cm`;
  }

  if (unitId === "m") {
    return `${safeMeters.toFixed(2)} m`;
  }

  if (unitId === "in") {
    return `${(safeMeters * METERS_TO_INCHES).toFixed(2)} in`;
  }

  if (unitId === "ft") {
    return `${(safeMeters * METERS_TO_FEET).toFixed(2)} ft`;
  }

  if (safeMeters < 1) {
    return `${(safeMeters * METERS_TO_CENTIMETERS).toFixed(1)} cm`;
  }

  return `${safeMeters.toFixed(2)} m`;
}

export function formatSignedDistance(meters, unitId = "adaptive") {
  const numericValue = Number(meters) || 0;
  const sign = numericValue > 0 ? "+" : numericValue < 0 ? "-" : "";
  return `${sign}${formatDistance(Math.abs(numericValue), unitId)}`;
}
