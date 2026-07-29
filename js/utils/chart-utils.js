import { CHART_COLORS } from "../config/constants.js";

const colorAssignments = new Map();
let nextColorIndex = 0;

/** Keeps the same color for the same category label across every chart in the session. */
export function colorForLabel(label) {
  if (!colorAssignments.has(label)) {
    colorAssignments.set(label, CHART_COLORS[nextColorIndex % CHART_COLORS.length]);
    nextColorIndex += 1;
  }
  return colorAssignments.get(label);
}

export function colorsForLabels(labels) {
  return labels.map(colorForLabel);
}

export function buildPercentages(counts) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  return counts.map((n) => (total ? Math.round((n / total) * 1000) / 10 : 0));
}
