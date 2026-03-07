import React from "react";
import type { EDL } from "./types/edl";
import { SmartTimeline } from "./components/SmartTimeline";

export const SmartComposition: React.FC<{ edl: EDL }> = ({ edl }) => {
  return <SmartTimeline edl={edl} />;
};
