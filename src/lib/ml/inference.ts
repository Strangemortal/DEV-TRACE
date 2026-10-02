/**
 * DEV-TRACE Embedded Machine Learning Inference Engine
 * Executes the trained 60-tree Random Forest Ensemble in real-time (< 1ms)
 * without requiring a Python subprocess or external dependencies.
 */

import trainedModelData from "./trained_model.json";

export interface TelemetryFeatures {
  stability_score: number;
  duration_sec: number;
  keystroke_count: number;
  paste_count: number;
  total_pasted_chars: number;
  paste_ratio: number;
  max_single_paste_len: number;
  focus_lost_count: number;
  test_executions_count: number;
  hint_requests_count: number;
  paste_to_test_ratio: number;
  keystrokes_per_min: number;
  churn_index: number;
}

export interface MLPredictionResult {
  predictedClass: 0 | 1 | 2;
  classification: "Autonomous (High Integrity)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)";
  confidence: number; // 0 - 100%
  classProbabilities: {
    autonomous: number;
    aiAssisted: number;
    aiCarried: number;
  };
  modelName: string;
  version: string;
  treesEvaluated: number;
  topContributingFeatures: Array<{ feature: string; value: number; importance: number }>;
  extractedFeatures: TelemetryFeatures;
}

interface TreeNode {
  is_leaf: boolean;
  feature?: string;
  feature_idx?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  probabilities?: number[];
  predicted_class?: number;
}

/**
 * Extracts normalized feature vector from a candidate session or event list.
 */
export function extractFeaturesFromSession(session: {
  stability?: number;
  duration?: number;
  events?: Array<{ type: string; meta?: any; ts?: string }>;
}): TelemetryFeatures {
  const events = session.events || [];
  const duration_sec = Math.max(30, session.duration || 180);
  const stability_score = typeof session.stability === "number" ? session.stability : 85;

  let keystroke_count = 0;
  let paste_count = 0;
  let total_pasted_chars = 0;
  let max_single_paste_len = 0;
  let focus_lost_count = 0;
  let test_executions_count = 0;
  let hint_requests_count = 0;

  events.forEach((evt) => {
    const type = evt.type || "";
    if (type.includes("PASTE")) {
      paste_count++;
      const len = Number(evt.meta?.length || evt.meta?.pasted_length || evt.meta?.text_length || 100);
      total_pasted_chars += len;
      if (len > max_single_paste_len) max_single_paste_len = len;
    } else if (type.includes("FOCUS") || type.includes("TAB_SWITCH")) {
      focus_lost_count++;
    } else if (type.includes("EXECUTION") || type.includes("TEST")) {
      test_executions_count++;
    } else if (type.includes("HINT")) {
      hint_requests_count++;
    } else if (type.includes("KEYSTROKE")) {
      keystroke_count++;
    }
  });

  if (keystroke_count === 0) keystroke_count = 50;

  const paste_ratio = Number((total_pasted_chars / Math.max(1, keystroke_count + total_pasted_chars)).toFixed(4));
  const paste_to_test_ratio = Number((total_pasted_chars / (test_executions_count + 1)).toFixed(2));
  const keystrokes_per_min = Number(((keystroke_count / duration_sec) * 60).toFixed(1));
  const churn_index = Number(((100 - stability_score) * (paste_ratio + 0.1)).toFixed(2));

  return {
    stability_score,
    duration_sec,
    keystroke_count,
    paste_count,
    total_pasted_chars,
    paste_ratio,
    max_single_paste_len,
    focus_lost_count,
    test_executions_count,
    hint_requests_count,
    paste_to_test_ratio,
    keystrokes_per_min,
    churn_index,
  };
}

/**
 * Traverses a single serialized Decision Tree.
 */
function evaluateTree(node: TreeNode, features: TelemetryFeatures): number[] {
  if (node.is_leaf || !node.feature || node.threshold === undefined) {
    return node.probabilities || [0.33, 0.33, 0.34];
  }

  const featVal = (features as any)[node.feature] ?? 0;
  if (featVal <= node.threshold) {
    return node.left ? evaluateTree(node.left, features) : node.probabilities || [0, 0, 0];
  } else {
    return node.right ? evaluateTree(node.right, features) : node.probabilities || [0, 0, 0];
  }
}

/**
 * Executes the full Random Forest Ensemble inference on candidate telemetry.
 */
export function predictCandidateIntegrity(session: {
  stability?: number;
  duration?: number;
  events?: Array<{ type: string; meta?: any; ts?: string }>;
}): MLPredictionResult {
  const features = extractFeaturesFromSession(session);
  const trees = (trainedModelData.trees || []) as TreeNode[];

  // Average probability votes across all trees in the ensemble
  let sumProb0 = 0;
  let sumProb1 = 0;
  let sumProb2 = 0;

  trees.forEach((tree) => {
    const probs = evaluateTree(tree, features);
    sumProb0 += probs[0] || 0;
    sumProb1 += probs[1] || 0;
    sumProb2 += probs[2] || 0;
  });

  const totalTrees = Math.max(1, trees.length);
  const avgProb0 = sumProb0 / totalTrees;
  const avgProb1 = sumProb1 / totalTrees;
  const avgProb2 = sumProb2 / totalTrees;

  let predictedClass: 0 | 1 | 2 = 0;
  let confidence = avgProb0;

  if (avgProb2 >= avgProb0 && avgProb2 >= avgProb1) {
    predictedClass = 2;
    confidence = avgProb2;
  } else if (avgProb1 >= avgProb0 && avgProb1 >= avgProb2) {
    predictedClass = 1;
    confidence = avgProb1;
  } else {
    predictedClass = 0;
    confidence = avgProb0;
  }

  const classLabels: Record<number, any> = {
    0: "Autonomous (High Integrity)",
    1: "AI-Assisted (Normal)",
    2: "AI-Carried (Plagiarism Risk)",
  };

  // Rank features by importance and candidate magnitude
  const importances = (trainedModelData.feature_importances || {}) as Record<string, number>;
  const topContributingFeatures = Object.entries(importances)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([feat, imp]) => ({
      feature: feat,
      value: (features as any)[feat] ?? 0,
      importance: Number((imp * 100).toFixed(1)),
    }));

  return {
    predictedClass,
    classification: classLabels[predictedClass],
    confidence: Number((confidence * 100).toFixed(1)),
    classProbabilities: {
      autonomous: Number((avgProb0 * 100).toFixed(1)),
      aiAssisted: Number((avgProb1 * 100).toFixed(1)),
      aiCarried: Number((avgProb2 * 100).toFixed(1)),
    },
    modelName: trainedModelData.model_name || "Random Forest Classifier",
    version: trainedModelData.version || "2.4.0",
    treesEvaluated: totalTrees,
    topContributingFeatures,
    extractedFeatures: features,
  };
}
