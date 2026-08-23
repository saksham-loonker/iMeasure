import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMeasure } from "../context/MeasureContext";
import {
  distanceBetweenPoints,
  formatDistance,
  getAxisBreakdown,
} from "../utils/Geometry.js";

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatTracking(state) {
  if (state === 3) {
    return "Normal";
  }

  if (state === 2) {
    return "Limited";
  }

  return "Starting";
}

export default function UIOverlay() {
  const {
    state,
    modeList,
    unitOptions,
    snapOptions,
    referenceTargets,
    compareTarget,
    actions,
  } = useMeasure();

  const liveDistance = state.startCapture
    ? distanceBetweenPoints(state.startCapture.point, state.currentFrame.focusPoint)
    : 0;
  const liveAxes = state.startCapture
    ? getAxisBreakdown(state.startCapture.point, state.currentFrame.focusPoint)
    : null;
  const displayedMeasurement =
    state.lastMeasurement?.formattedDistance ??
    (state.startCapture ? formatDistance(liveDistance, state.unitId) : "Ready");
  const confidencePercent = Math.round(state.currentFrame.confidence * 100);
  const totalDistance = state.measurementHistory.reduce(
    (sum, measurement) => sum + measurement.distanceMeters,
    0
  );
  const longestMeasurement = state.measurementHistory.reduce(
    (longest, measurement) =>
      measurement.distanceMeters > longest.distanceMeters ? measurement : longest,
    { distanceMeters: 0, formattedDistance: "0.0 cm" }
  );

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <View style={styles.topStack} pointerEvents="box-none">
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.eyebrow}>AR toolkit</Text>
              <Text style={styles.title}>iMeasure Pro</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{state.currentFrame.hardwareTier}</Text>
            </View>
          </View>
          <Text style={styles.heroMessage}>{state.capability.message}</Text>
          <View style={styles.lockMeterTrack}>
            <View
              style={[styles.lockMeterFill, { width: `${confidencePercent}%` }]}
            />
          </View>
          <View style={styles.metricRow}>
            <Metric label="Lock" value={`${confidencePercent}%`} />
            <Metric label="Tracking" value={formatTracking(state.tracking.state)} />
            <Metric label="Point cloud" value={`${state.pointCloudSummary.count}`} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
        >
          {modeList.map((mode) => (
            <Chip
              key={mode.id}
              label={mode.label}
              selected={state.modeId === mode.id}
              onPress={() => actions.setMode(mode.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.controlCard}>
          <Text style={styles.sectionLabel}>Units</Text>
          <View style={styles.controlRow}>
            {unitOptions.map((unit) => (
              <Chip
                key={unit.id}
                label={unit.label}
                selected={state.unitId === unit.id}
                onPress={() => actions.setUnit(unit.id)}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Snap</Text>
          <View style={styles.controlRow}>
            {snapOptions.map((snapMode) => (
              <Chip
                key={snapMode.id}
                label={snapMode.label}
                selected={state.snapMode === snapMode.id}
                onPress={() => actions.setSnapMode(snapMode.id)}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Compare against</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.referenceRow}
          >
            {referenceTargets.map((target) => (
              <Chip
                key={target.id}
                label={target.label}
                selected={state.compareTargetId === target.id}
                onPress={() => actions.setCompareTarget(target.id)}
              />
            ))}
          </ScrollView>

          <View style={styles.toggleRow}>
            <Chip
              label={state.showPointCloud ? "Hide points" : "Show points"}
              selected={state.showPointCloud}
              onPress={actions.togglePointCloud}
            />
            <Chip
              label={state.depthDebugEnabled ? "Hide depth" : "Depth debug"}
              selected={state.depthDebugEnabled}
              onPress={actions.toggleDepthDebug}
            />
            <Chip
              label={state.showSavedPanel ? "Hide library" : "Open library"}
              selected={state.showSavedPanel}
              onPress={actions.toggleSavedPanel}
            />
          </View>
        </View>
      </View>

      <View style={styles.bottomPanel} pointerEvents="box-none">
        <View style={styles.measurementCard}>
          <Text style={styles.measurementLabel}>
            {state.lastMeasurement ? "Measured" : state.startCapture ? "Live preview" : "Status"}
          </Text>
          <Text style={styles.measurementValue}>{displayedMeasurement}</Text>
          <Text style={styles.measurementMeta}>{state.lastNotice}</Text>

          {state.lastMeasurement?.compare ? (
            <Text style={styles.compareText}>
              {state.lastMeasurement.compare.label}: {state.lastMeasurement.compare.formattedDelta}
            </Text>
          ) : null}

          {liveAxes ? (
            <View style={styles.axisRow}>
              <Metric
                label="Horizontal"
                value={formatDistance(liveAxes.horizontal, state.unitId)}
              />
              <Metric
                label="Vertical"
                value={formatDistance(liveAxes.vertical, state.unitId)}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryAction} onPress={actions.resetMeasurement}>
            <Text style={styles.secondaryActionText}>Reset</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={actions.undoPoint}>
            <Text style={styles.secondaryActionText}>Undo</Text>
          </Pressable>
          <Pressable
            style={[
              styles.captureAction,
              !state.currentFrame.canCapture && styles.captureActionDisabled,
            ]}
            disabled={!state.currentFrame.canCapture}
            onPress={actions.capturePoint}
          >
            <Text style={styles.captureActionText}>
              {state.startCapture ? "Finish" : "Capture"}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={actions.saveLastMeasurement}>
            <Text style={styles.secondaryActionText}>Save</Text>
          </Pressable>
        </View>

        {state.showSavedPanel ? (
          <View style={styles.savedPanel}>
            <View style={styles.savedHeader}>
              <Text style={styles.savedTitle}>Daily library</Text>
              <Pressable onPress={actions.clearSavedMeasurements}>
                <Text style={styles.clearText}>Clear saved</Text>
              </Pressable>
            </View>

            <View style={styles.statsStrip}>
              <Metric label="Session count" value={`${state.measurementHistory.length}`} />
              <Metric label="Total" value={formatDistance(totalDistance, state.unitId)} />
              <Metric label="Longest" value={longestMeasurement.formattedDistance} />
            </View>

            <ScrollView style={styles.savedScroll}>
              {state.savedMeasurements.length === 0 ? (
                <Text style={styles.emptyState}>
                  Save measurements here for daily fit checks and repeat comparisons.
                </Text>
              ) : (
                state.savedMeasurements.map((measurement) => (
                  <View key={measurement.id} style={styles.savedItem}>
                    <Text style={styles.savedDistance}>{measurement.formattedDistance}</Text>
                    <Text style={styles.savedMeta}>
                      {measurement.qualityLabel} · {measurement.hardwareTier}
                    </Text>
                  </View>
                ))
              )}

              {state.measurementHistory.length > 0 ? (
                <>
                  <Text style={styles.historyHeading}>Recent session</Text>
                  {state.measurementHistory.map((measurement) => (
                    <View key={`${measurement.id}-history`} style={styles.savedItem}>
                      <Text style={styles.savedDistance}>{measurement.formattedDistance}</Text>
                      <Text style={styles.savedMeta}>
                        {measurement.appliedSnapMode} · {measurement.qualityLabel}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  topStack: {
    gap: 12,
  },
  heroCard: {
    backgroundColor: "rgba(7, 17, 31, 0.84)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.18)",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: "#9eb2cc",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    color: "#f8fbff",
    fontSize: 24,
    fontWeight: "800",
  },
  heroBadge: {
    backgroundColor: "rgba(69, 196, 255, 0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: "#81d4fa",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "capitalize",
  },
  heroMessage: {
    color: "#c7d7ea",
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  lockMeterTrack: {
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },
  lockMeterFill: {
    height: "100%",
    backgroundColor: "#5ef0a0",
    borderRadius: 999,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  metric: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  metricLabel: {
    color: "#8ea3bf",
    fontSize: 11,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  metricValue: {
    color: "#f8fbff",
    fontSize: 14,
    fontWeight: "700",
  },
  modeRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(7, 17, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.16)",
  },
  chipSelected: {
    backgroundColor: "#81d4fa",
    borderColor: "#81d4fa",
  },
  chipText: {
    color: "#d7e2f3",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: "#041118",
  },
  controlCard: {
    backgroundColor: "rgba(7, 17, 31, 0.84)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.18)",
  },
  sectionLabel: {
    color: "#9eb2cc",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
    marginBottom: 8,
    marginTop: 6,
  },
  controlRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  referenceRow: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  bottomPanel: {
    gap: 12,
  },
  measurementCard: {
    backgroundColor: "rgba(4, 10, 18, 0.92)",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.2)",
  },
  measurementLabel: {
    color: "#9eb2cc",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
  },
  measurementValue: {
    color: "#f8fbff",
    fontSize: 34,
    fontWeight: "800",
    marginTop: 8,
  },
  measurementMeta: {
    color: "#c7d7ea",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  compareText: {
    color: "#81d4fa",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  axisRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "rgba(7, 17, 31, 0.84)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.16)",
  },
  secondaryActionText: {
    color: "#d7e2f3",
    fontSize: 13,
    fontWeight: "700",
  },
  captureAction: {
    flex: 1.2,
    backgroundColor: "#5ef0a0",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  captureActionDisabled: {
    backgroundColor: "#3b4b58",
  },
  captureActionText: {
    color: "#041118",
    fontSize: 14,
    fontWeight: "800",
  },
  savedPanel: {
    backgroundColor: "rgba(7, 17, 31, 0.94)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.18)",
    maxHeight: 280,
  },
  savedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  savedTitle: {
    color: "#f8fbff",
    fontSize: 18,
    fontWeight: "800",
  },
  clearText: {
    color: "#ffb4a2",
    fontWeight: "700",
  },
  statsStrip: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  savedScroll: {
    flexGrow: 0,
  },
  emptyState: {
    color: "#a9bad0",
    fontSize: 13,
    lineHeight: 18,
  },
  savedItem: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  savedDistance: {
    color: "#f8fbff",
    fontWeight: "800",
    fontSize: 15,
  },
  savedMeta: {
    color: "#8ea3bf",
    fontSize: 12,
    marginTop: 4,
  },
  historyHeading: {
    color: "#9eb2cc",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
    marginTop: 8,
    marginBottom: 8,
  },
});
