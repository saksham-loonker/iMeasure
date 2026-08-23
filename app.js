import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import Main from "./main";
import { MeasureProvider } from "./src/context/MeasureContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <MeasureProvider>
        <StatusBar style="light" translucent />
        <Main />
      </MeasureProvider>
    </SafeAreaProvider>
  );
}
