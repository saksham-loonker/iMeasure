import React, { useEffect, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ViroARSceneNavigator, ViroUtils } from "@reactvision/react-viro";

import ARViewScene from "./src/components/ARView";
import UIOverlay from "./src/components/UIOverlay";
import { useMeasure } from "./src/context/MeasureContext";

function LoadingState({ title, message }) {
  return (
    <View style={styles.stateShell}>
      <View style={styles.stateCard}>
        <View style={styles.spinner} />
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateMessage}>{message}</Text>
      </View>
    </View>
  );
}

function ActionState({ title, message, actionLabel, onAction }) {
  return (
    <View style={styles.stateShell}>
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateMessage}>{message}</Text>
        <Pressable style={styles.stateAction} onPress={onAction}>
          <Text style={styles.stateActionText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Main() {
  const { state, actions } = useMeasure();
  const [permissionStatus, setPermissionStatus] = useState("checking");
  const [supportStatus, setSupportStatus] = useState("checking");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function requestCameraPermission() {
      if (Platform.OS !== "android") {
        if (!cancelled) {
          setPermissionStatus("granted");
        }
        return;
      }

      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera access",
            message:
              "iMeasure needs camera access so ARCore can place and verify measurement points.",
            buttonPositive: "Allow",
            buttonNegative: "Not now",
          }
        );

        if (!cancelled) {
          setPermissionStatus(
            granted === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied"
          );
        }
      } catch (error) {
        if (!cancelled) {
          setPermissionStatus("denied");
          actions.resolveCapability({
            status: "unknown",
            isARSupported: true,
            raw: { error: String(error) },
            message:
              "Camera permission could not be confirmed. Conservative capture rules are enabled.",
          });
        }
      }
    }

    async function resolveSupport() {
      try {
        if (typeof ViroUtils?.isARSupportedOnDevice === "function") {
          const result = await ViroUtils.isARSupportedOnDevice();
          const isARSupported =
            typeof result === "boolean"
              ? result
              : Boolean(result?.isARSupported ?? result?.supported ?? true);

          if (!cancelled) {
            actions.resolveCapability({
              status: "ready",
              isARSupported,
              raw: result,
              message: isARSupported
                ? "AR hardware detected. Stability thresholds will adapt live."
                : "This device did not report AR support.",
            });
            setSupportStatus("ready");
          }
          return;
        }

        if (!cancelled) {
          actions.resolveCapability({
            status: "unknown",
            isARSupported: true,
            raw: null,
            message:
              "Direct hardware probing is unavailable. Using live tracking quality instead.",
          });
          setSupportStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          actions.resolveCapability({
            status: "unknown",
            isARSupported: true,
            raw: { error: String(error) },
            message:
              "Could not inspect AR support directly. Running with conservative capture rules.",
          });
          setSupportStatus("ready");
        }
      }
    }

    requestCameraPermission();
    resolveSupport();

    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  if (permissionStatus === "checking" || supportStatus === "checking") {
    return (
      <LoadingState
        title="Preparing the measurement stack"
        message="Checking camera access, AR availability, and the correct precision profile for this device."
      />
    );
  }

  if (permissionStatus !== "granted") {
    return (
      <ActionState
        title="Camera permission is required"
        message="This app depends on ARCore camera tracking. Grant camera access and try again."
        actionLabel="Try again"
        onAction={() => {
          setPermissionStatus("checking");
          setRetryNonce((currentValue) => currentValue + 1);
        }}
      />
    );
  }

  if (state.capability.isARSupported === false) {
    return (
      <ActionState
        title="AR is not supported on this device"
        message="iMeasure can only replace a hardware-backed measure app on devices that expose ARCore-compatible tracking."
        actionLabel="Recheck device"
        onAction={() => {
          setSupportStatus("checking");
          setRetryNonce((currentValue) => currentValue + 1);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus={Platform.OS !== "android"}
        depthEnabled
        depthDebugEnabled={state.depthDebugEnabled}
        initialScene={{
          scene: ARViewScene,
        }}
        style={styles.arView}
      />
      <UIOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111f",
  },
  arView: {
    flex: 1,
  },
  stateShell: {
    flex: 1,
    backgroundColor: "#07111f",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  stateCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: "rgba(7, 17, 31, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(168, 202, 255, 0.18)",
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderTopColor: "#81d4fa",
    alignSelf: "center",
    marginBottom: 18,
  },
  stateTitle: {
    color: "#f8fbff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  stateMessage: {
    color: "#b5c7de",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  stateAction: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#45c4ff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  stateActionText: {
    color: "#041118",
    fontWeight: "700",
    fontSize: 14,
  },
});
