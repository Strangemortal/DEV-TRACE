"""
DEV-TRACE Model Training Pipeline
Trains an ensemble Random Forest classifier on telemetry datasets to detect:
- Class 0: Autonomous (High Integrity)
- Class 1: AI-Assisted (Normal)
- Class 2: AI-Carried (Plagiarism Risk)

Exports:
1. Python model: models/devtrace_random_forest.joblib
2. Standalone TypeScript/Node Inference Engine: src/lib/ml/trained_model.json
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATASET_PATH = os.path.join(ROOT_DIR, "datasets", "telemetry_training_set.csv")
MODELS_DIR = os.path.join(ROOT_DIR, "models")
TS_MODEL_DIR = os.path.join(ROOT_DIR, "src", "lib", "ml")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(TS_MODEL_DIR, exist_ok=True)

FEATURE_COLS = [
    "stability_score",
    "duration_sec",
    "keystroke_count",
    "paste_count",
    "total_pasted_chars",
    "paste_ratio",
    "max_single_paste_len",
    "focus_lost_count",
    "test_executions_count",
    "hint_requests_count",
    "paste_to_test_ratio",
    "keystrokes_per_min",
    "churn_index",
]

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["paste_to_test_ratio"] = df["total_pasted_chars"] / (df["test_executions_count"] + 1)
    df["keystrokes_per_min"] = (df["keystroke_count"] / df["duration_sec"].clip(lower=30)) * 60
    df["churn_index"] = (100 - df["stability_score"]) * (df["paste_ratio"] + 0.1)
    return df

def serialize_tree(tree, feature_names):
    """Serialize scikit-learn DecisionTreeClassifier tree to a JSON-compatible dict."""
    tree_ = tree.tree_
    
    def recurse(node):
        if tree_.feature[node] != -2:  # Not a leaf
            feat_idx = int(tree_.feature[node])
            return {
                "is_leaf": False,
                "feature": feature_names[feat_idx],
                "feature_idx": feat_idx,
                "threshold": float(tree_.threshold[node]),
                "left": recurse(tree_.children_left[node]),
                "right": recurse(tree_.children_right[node]),
            }
        else:  # Leaf node
            val = tree_.value[node][0]
            total = float(np.sum(val))
            probs = [float(v / total) for v in val] if total > 0 else [0.0, 0.0, 0.0]
            pred_class = int(np.argmax(probs))
            return {
                "is_leaf": True,
                "probabilities": probs,
                "predicted_class": pred_class,
                "samples": int(tree_.n_node_samples[node]),
            }

    return recurse(0)

def train_and_export():
    print("==================================================")
    print("🧠 DEV-TRACE Telemetry ML Model Training")
    print("==================================================")

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}. Run scripts/import_datasets.py first.")

    df_raw = pd.read_csv(DATASET_PATH)
    print(f"📊 Loaded {len(df_raw)} records from {DATASET_PATH}")

    df = engineer_features(df_raw)
    X = df[FEATURE_COLS]
    y = df["integrity_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"   Training samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Train Random Forest Classifier
    rf = RandomForestClassifier(
        n_estimators=60,
        max_depth=6,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    # Evaluate
    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1_macro = f1_score(y_test, y_pred, average="macro")
    f1_weighted = f1_score(y_test, y_pred, average="weighted")
    cm = confusion_matrix(y_test, y_pred)

    print("\n📈 Model Evaluation Metrics:")
    print(f"   ✓ Accuracy:        {acc * 100:.2f}%")
    print(f"   ✓ F1-Score (Macro): {f1_macro * 100:.2f}%")
    print(f"   ✓ F1-Score (Wtd):   {f1_weighted * 100:.2f}%")
    print("\n📋 Detailed Classification Report:")
    target_names = ["0: Autonomous", "1: AI-Assisted", "2: AI-Carried (Plagiarism)"]
    print(classification_report(y_test, y_pred, target_names=target_names))

    # Feature Importances
    importances = dict(zip(FEATURE_COLS, [round(float(v), 4) for v in rf.feature_importances_]))
    sorted_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    print("\n🔍 Top Telemetry Feature Importances:")
    for feat, imp in sorted_importances[:6]:
        bar = "█" * int(imp * 40)
        print(f"   {feat:22s} | {imp * 100:5.1f}% {bar}")

    # 1. Export Python Joblib
    joblib_path = os.path.join(MODELS_DIR, "devtrace_random_forest.joblib")
    joblib.dump(rf, joblib_path)
    print(f"\n💾 Saved Python model to: {joblib_path}")

    # 2. Export Serialized Trees for TypeScript/Node Engine
    trees_json = [serialize_tree(est, FEATURE_COLS) for est in rf.estimators_]

    feature_stats = {}
    for col in FEATURE_COLS:
        feature_stats[col] = {
            "mean": float(X[col].mean()),
            "std": float(X[col].std()),
            "min": float(X[col].min()),
            "max": float(X[col].max()),
        }

    model_metadata = {
        "model_name": "DEV-TRACE Telemetry Random Forest Classifier",
        "version": "2.4.0",
        "n_estimators": len(rf.estimators_),
        "max_depth": 6,
        "features": FEATURE_COLS,
        "feature_importances": importances,
        "feature_stats": feature_stats,
        "class_labels": {
            0: "Autonomous (High Integrity)",
            1: "AI-Assisted (Normal)",
            2: "AI-Carried (Plagiarism Risk)",
        },
        "metrics": {
            "test_accuracy": round(float(acc), 4),
            "macro_f1": round(float(f1_macro), 4),
            "weighted_f1": round(float(f1_weighted), 4),
            "test_samples": int(len(X_test)),
            "train_samples": int(len(X_train)),
        },
        "trees": trees_json,
    }

    # Save to src/lib/ml/trained_model.json
    ts_model_path = os.path.join(TS_MODEL_DIR, "trained_model.json")
    with open(ts_model_path, "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)
    print(f"🚀 Exported Real-Time TypeScript Model Bundle to: {ts_model_path}")

    # Save metrics log in models/
    metrics_log_path = os.path.join(MODELS_DIR, "model_metrics.json")
    with open(metrics_log_path, "w", encoding="utf-8") as f:
        json.dump({
            "metrics": model_metadata["metrics"],
            "feature_importances": sorted_importances,
            "confusion_matrix": cm.tolist(),
        }, f, indent=2)
    print(f"📄 Saved Metrics Log to: {metrics_log_path}")
    print("\n✅ Model training, validation, and dual-export complete!")

if __name__ == "__main__":
    train_and_export()
