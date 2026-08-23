export const TRACKING_STATES = {
  UNAVAILABLE: 1,
  LIMITED: 2,
  NORMAL: 3,
};

export const TRACKING_REASONS = {
  NONE: 1,
  EXCESSIVE_MOTION: 2,
  INSUFFICIENT_FEATURES: 3,
};

const MODE_MAP = {
  quick: {
    id: "quick",
    label: "Quick",
    summary: "Fast capture with looser stability rules.",
    requiredSamples: 8,
    maxSpreadMeters: 0.03,
    minConfidence: 0.74,
    minDistanceMeters: 0.08,
    maxDistanceMeters: 4.5,
    defaultUnit: "cm",
    defaultSnapMode: "auto",
  },
  precision: {
    id: "precision",
    label: "Precision",
    summary: "Extra averaging for repeatable readings.",
    requiredSamples: 12,
    maxSpreadMeters: 0.015,
    minConfidence: 0.82,
    minDistanceMeters: 0.08,
    maxDistanceMeters: 5,
    defaultUnit: "cm",
    defaultSnapMode: "auto",
  },
  room: {
    id: "room",
    label: "Room",
    summary: "Horizontal bias for floors, walls, and furniture fit checks.",
    requiredSamples: 10,
    maxSpreadMeters: 0.025,
    minConfidence: 0.76,
    minDistanceMeters: 0.25,
    maxDistanceMeters: 8,
    defaultUnit: "m",
    defaultSnapMode: "horizontal",
  },
  height: {
    id: "height",
    label: "Height",
    summary: "Vertical snap for doors, shelves, and people.",
    requiredSamples: 9,
    maxSpreadMeters: 0.02,
    minConfidence: 0.78,
    minDistanceMeters: 0.15,
    maxDistanceMeters: 4.5,
    defaultUnit: "cm",
    defaultSnapMode: "vertical",
  },
  object: {
    id: "object",
    label: "Object",
    summary: "Small-object workflow with tighter close-range checks.",
    requiredSamples: 8,
    maxSpreadMeters: 0.012,
    minConfidence: 0.8,
    minDistanceMeters: 0.08,
    maxDistanceMeters: 2.5,
    defaultUnit: "cm",
    defaultSnapMode: "auto",
  },
};

export const MEASURE_MODE_LIST = Object.values(MODE_MAP);

export const UNIT_OPTIONS = [
  { id: "cm", label: "cm" },
  { id: "m", label: "m" },
  { id: "in", label: "in" },
  { id: "ft", label: "ft" },
];

export const SNAP_MODE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "free", label: "Free" },
  { id: "horizontal", label: "Flat" },
  { id: "vertical", label: "Tall" },
];

export function getMeasureMode(modeId = "precision") {
  return MODE_MAP[modeId] ?? MODE_MAP.precision;
}
