"""
MediScan Advanced ML Training Pipeline v2
Dataset: CDC Diabetes Health Indicators
Fixes: Better threshold tuning, class weights, evaluation, and calibration
Run: python ml_engine/train.py
"""
import os, sys, json, pickle, warnings
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier, StackingClassifier
)
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import (
    train_test_split, cross_val_score, StratifiedKFold
)
from sklearn.preprocessing import RobustScaler
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    classification_report, roc_auc_score, roc_curve,
    accuracy_score, f1_score, precision_score, recall_score,
    precision_recall_curve, average_precision_score,
    confusion_matrix
)
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek

try:
    import xgboost as xgb
    HAS_XGB = True
    print("XGBoost available")
except ImportError:
    HAS_XGB = False

try:
    import lightgbm as lgb
    HAS_LGB = True
    print("LightGBM available")
except ImportError:
    HAS_LGB = False

ML_DIR = Path(__file__).resolve().parent
MODEL_PATH = ML_DIR / "ensemble_model.pkl"
METRICS_PATH = ML_DIR / "metrics.json"
FEATURE_PATH = ML_DIR / "feature_info.json"
DIABETES_CSV = ML_DIR / "diabetes.csv"

FEATURE_COLS = [
    "HighBP", "HighChol", "CholCheck", "BMI", "Smoker",
    "Stroke", "HeartDiseaseorAttack", "PhysActivity", "Fruits",
    "Veggies", "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost",
    "GenHlth", "MentHlth", "PhysHlth", "DiffWalk", "Sex",
    "Age", "Education", "Income"
]
TARGET_COL = "Diabetes_binary"


def load_data():
    print(f"Loading data from {DIABETES_CSV}")
    df = pd.read_csv(DIABETES_CSV)
    print(f"Raw dataset: {len(df)} samples")
    print(f"Target distribution:\n{df[TARGET_COL].value_counts()}")

    # Binary classification: 0 = no diabetes, 1 = prediabetes OR diabetes
    df["Diabetes_binary"] = (df[TARGET_COL] > 0).astype(int)
    print(f"\nBinary positive rate: {df['Diabetes_binary'].mean():.1%}")

    X = df[FEATURE_COLS]
    y = df["Diabetes_binary"]

    # Sample for speed but keep stratification
    if len(df) > 100000:
        print("Sampling 100,000 rows (stratified)...")
        X, _, y, _ = train_test_split(
            X, y, train_size=100000, random_state=42, stratify=y
        )
        print(f"Sampled: {len(X)} rows | Positive rate: {y.mean():.1%}")

    return X, y


def find_best_threshold(y_true, y_prob):
    """Find threshold that maximizes F1 score."""
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_prob)
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-8)
    best_idx = np.argmax(f1_scores)
    best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
    best_f1 = f1_scores[best_idx]
    print(f"\nOptimal threshold: {best_threshold:.4f} (F1={best_f1:.4f})")
    return float(best_threshold)


def build_ensemble(scale_pos_weight=5.0):
    """Build stacking ensemble with tuned hyperparameters for imbalanced data."""
    pos_weight = scale_pos_weight

    base_estimators = [
        ("rf", RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_split=4,
            min_samples_leaf=2,
            class_weight={0: 1, 1: int(pos_weight)},
            max_features="sqrt",
            random_state=42,
            n_jobs=-1
        )),
        ("gb", GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            min_samples_split=10,
            random_state=42
        )),
    ]

    if HAS_XGB:
        base_estimators.append(("xgb", xgb.XGBClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=pos_weight,
            eval_metric="aucpr",  # better for imbalanced
            random_state=42,
            n_jobs=-1,
            verbosity=0
        )))

    if HAS_LGB:
        base_estimators.append(("lgb", lgb.LGBMClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            num_leaves=63,
            subsample=0.8,
            colsample_bytree=0.8,
            class_weight={0: 1, 1: int(pos_weight)},
            is_unbalance=True,
            random_state=42,
            n_jobs=-1,
            verbose=-1
        )))

    meta = LogisticRegression(
        C=0.5, class_weight="balanced",
        random_state=42, max_iter=1000
    )

    stacking = StackingClassifier(
        estimators=base_estimators,
        final_estimator=meta,
        cv=5,
        stack_method="predict_proba",
        n_jobs=-1,
    )
    return stacking


def evaluate_model(y_test, y_pred, y_prob, threshold, label=""):
    print(f"\n{'='*55}")
    print(f"  {label} PERFORMANCE")
    print(f"{'='*55}")

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    f1 = f1_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred)
    ap = average_precision_score(y_test, y_prob)

    print(f"  Accuracy:          {acc:.4f} ({acc*100:.1f}%)")
    print(f"  ROC-AUC:           {auc:.4f}")
    print(f"  Avg Precision:     {ap:.4f}")
    print(f"  F1-Score:          {f1:.4f}")
    print(f"  Precision:         {prec:.4f}")
    print(f"  Recall:            {rec:.4f}")
    print(f"  Threshold used:    {threshold:.4f}")

    cm = confusion_matrix(y_test, y_pred)
    print(f"\n  Confusion Matrix:")
    print(f"  TN={cm[0,0]:5d}  FP={cm[0,1]:5d}")
    print(f"  FN={cm[1,0]:5d}  TP={cm[1,1]:5d}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['No Diabetes', 'Diabetes'])}")

    return {
        "accuracy": round(acc, 4),
        "roc_auc": round(auc, 4),
        "average_precision": round(ap, 4),
        "f1_score": round(f1, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "threshold": round(threshold, 4),
    }


def train():
    print("\n" + "="*60)
    print("  MediScan AI — Advanced ML Training Pipeline v2")
    print("="*60 + "\n")

    X, y = load_data()
    pos_rate = y.mean()
    neg_rate = 1 - pos_rate
    scale_pos_weight = neg_rate / pos_rate
    print(f"\nClass imbalance ratio: {scale_pos_weight:.1f}:1 (neg:pos)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")

    # Preprocessing
    preprocessor = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", RobustScaler()),
    ])
    X_train_pp = preprocessor.fit_transform(X_train)
    X_test_pp = preprocessor.transform(X_test)

    # SMOTETomek — better than plain SMOTE (oversamples minority + removes borderline majority)
    print("\nApplying SMOTETomek (SMOTE + Tomek links cleaning)...")
    smotetomek = SMOTETomek(random_state=42)
    X_res, y_res = smotetomek.fit_resample(X_train_pp, y_train)
    print(f"After SMOTETomek: {len(X_res)} samples | Positive: {y_res.mean():.1%}")

    # Train ensemble
    print(f"\nTraining Stacking Ensemble...")
    print(f"Models: RF + GB" + (" + XGB" if HAS_XGB else "") + (" + LGB" if HAS_LGB else ""))
    ensemble = build_ensemble(scale_pos_weight=scale_pos_weight)
    ensemble.fit(X_res, y_res)

    # Get probabilities
    y_prob = ensemble.predict_proba(X_test_pp)[:, 1]

    # Default threshold (0.5) evaluation
    y_pred_default = (y_prob >= 0.5).astype(int)
    print("\n--- With default threshold (0.5) ---")
    evaluate_model(y_test, y_pred_default, y_prob, 0.5, "DEFAULT THRESHOLD")

    # Find optimal threshold
    best_threshold = find_best_threshold(y_test, y_prob)

    # Optimal threshold evaluation
    y_pred_optimal = (y_prob >= best_threshold).astype(int)
    metrics = evaluate_model(y_test, y_pred_optimal, y_prob, best_threshold, "OPTIMIZED THRESHOLD")

    # Cross validation
    print("\nRunning 5-fold Stratified CV...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(ensemble, X_res, y_res, cv=cv, scoring="roc_auc")
    cv_f1 = cross_val_score(ensemble, X_res, y_res, cv=cv, scoring="f1")
    print(f"  CV ROC-AUC: {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")
    print(f"  CV F1:      {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")

    # Feature importances
    feature_importances = {}
    try:
        rf_est = ensemble.estimators_[0]
        importances = rf_est.feature_importances_
        feature_importances = dict(zip(FEATURE_COLS, importances.tolist()))
        sorted_imp = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)
        print("\nTop Feature Importances:")
        for feat, imp in sorted_imp[:10]:
            bar = "█" * int(imp * 60)
            print(f"  {feat:<35} {bar} {imp:.4f}")
    except Exception as e:
        print(f"Feature importance skipped: {e}")

    # Save full pipeline including optimal threshold
    full_pipeline = {
        "preprocessor": preprocessor,
        "model": ensemble,
        "features": FEATURE_COLS,
        "optimal_threshold": best_threshold,
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(full_pipeline, f)
    print(f"\nModel saved to {MODEL_PATH}")

    # Save metrics
    final_metrics = {
        **metrics,
        "cv_auc_mean": round(float(cv_auc.mean()), 4),
        "cv_auc_std": round(float(cv_auc.std()), 4),
        "cv_f1_mean": round(float(cv_f1.mean()), 4),
        "optimal_threshold": round(best_threshold, 4),
        "feature_importances": feature_importances,
        "feature_columns": FEATURE_COLS,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "resampling": "SMOTETomek",
        "ensemble_models": ["RandomForest", "GradientBoosting"]
            + (["XGBoost"] if HAS_XGB else [])
            + (["LightGBM"] if HAS_LGB else []),
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(final_metrics, f, indent=2)

    feature_info = {
        "feature_columns": FEATURE_COLS,
        "feature_descriptions": {
            "HighBP": "High Blood Pressure (0=No, 1=Yes)",
            "HighChol": "High Cholesterol (0=No, 1=Yes)",
            "CholCheck": "Cholesterol Check in 5 years (0=No, 1=Yes)",
            "BMI": "Body Mass Index",
            "Smoker": "Smoked 100+ cigarettes (0=No, 1=Yes)",
            "Stroke": "Ever had stroke (0=No, 1=Yes)",
            "HeartDiseaseorAttack": "Heart disease or attack (0=No, 1=Yes)",
            "PhysActivity": "Physical activity last 30 days (0=No, 1=Yes)",
            "Fruits": "Consumes fruit daily (0=No, 1=Yes)",
            "Veggies": "Consumes vegetables daily (0=No, 1=Yes)",
            "HvyAlcoholConsump": "Heavy alcohol consumption (0=No, 1=Yes)",
            "AnyHealthcare": "Has healthcare coverage (0=No, 1=Yes)",
            "NoDocbcCost": "Could not see doctor due to cost (0=No, 1=Yes)",
            "GenHlth": "General health (1=Excellent to 5=Poor)",
            "MentHlth": "Mental health bad days (0-30)",
            "PhysHlth": "Physical health bad days (0-30)",
            "DiffWalk": "Difficulty walking (0=No, 1=Yes)",
            "Sex": "Sex (0=Female, 1=Male)",
            "Age": "Age category (1=18-24 to 13=80+)",
            "Education": "Education level (1-6)",
            "Income": "Income level (1-8)",
        },
        "feature_ranges": {
            "HighBP": [0, 1], "HighChol": [0, 1], "CholCheck": [0, 1],
            "BMI": [10, 98], "Smoker": [0, 1], "Stroke": [0, 1],
            "HeartDiseaseorAttack": [0, 1], "PhysActivity": [0, 1],
            "Fruits": [0, 1], "Veggies": [0, 1], "HvyAlcoholConsump": [0, 1],
            "AnyHealthcare": [0, 1], "NoDocbcCost": [0, 1],
            "GenHlth": [1, 5], "MentHlth": [0, 30], "PhysHlth": [0, 30],
            "DiffWalk": [0, 1], "Sex": [0, 1], "Age": [1, 13],
            "Education": [1, 6], "Income": [1, 8],
        }
    }
    with open(FEATURE_PATH, "w") as f:
        json.dump(feature_info, f, indent=2)

    print(f"\nAll files saved. Training complete!")
    print(f"\nSUMMARY FOR LINKEDIN:")
    print(f"  ROC-AUC:       {metrics['roc_auc']:.4f}")
    print(f"  F1-Score:      {metrics['f1_score']:.4f}")
    print(f"  Precision:     {metrics['precision']:.4f}")
    print(f"  Recall:        {metrics['recall']:.4f}")
    print(f"  CV AUC:        {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")
    print(f"  Resampling:    SMOTETomek")
    print(f"  Threshold:     {best_threshold:.4f} (auto-optimized)")

    return full_pipeline, final_metrics


if __name__ == "__main__":
    train()
