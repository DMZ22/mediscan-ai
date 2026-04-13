"""
MediScan Predictor — CDC Diabetes Health Indicators dataset version.
22 features: HighBP, HighChol, BMI, Age, GenHlth etc.
"""
import pickle, json, logging, warnings
import numpy as np
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)

warnings.filterwarnings("ignore")

ML_DIR = Path(__file__).resolve().parent
MODEL_PATH = ML_DIR / "ensemble_model.pkl"
METRICS_PATH = ML_DIR / "metrics.json"

_pipeline = None
_metrics = None

FEATURE_COLUMNS = [
    "HighBP", "HighChol", "CholCheck", "BMI", "Smoker",
    "Stroke", "HeartDiseaseorAttack", "PhysActivity", "Fruits",
    "Veggies", "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost",
    "GenHlth", "MentHlth", "PhysHlth", "DiffWalk", "Sex",
    "Age", "Education", "Income"
]

RECOMMENDATIONS = {
    "low": (
        "Low diabetes risk. Maintain healthy habits: daily exercise, "
        "balanced diet, limit processed sugar. Annual checkup recommended."
    ),
    "medium": (
        "Moderate risk detected. Recommend: reduce BMI if elevated, "
        "monitor blood pressure, increase physical activity to 150 min/week. "
        "Schedule HbA1c test. Follow-up in 3 months."
    ),
    "high": (
        "High risk detected. Consult endocrinologist urgently. "
        "Order fasting glucose + HbA1c + lipid panel. "
        "Strict dietary changes required. Weekly BP monitoring."
    ),
    "critical": (
        "Critical diabetes risk. Immediate medical intervention required. "
        "Urgent specialist referral. Consider hospitalization if symptomatic. "
        "Emergency glucose panel, ophthalmology and nephrology referral."
    ),
}

AGE_LABELS = {
    1: "18-24", 2: "25-29", 3: "30-34", 4: "35-39", 5: "40-44",
    6: "45-49", 7: "50-54", 8: "55-59", 9: "60-64", 10: "65-69",
    11: "70-74", 12: "75-79", 13: "80+",
}

GENHLTH_LABELS = {1: "Excellent", 2: "Very Good", 3: "Good", 4: "Fair", 5: "Poor"}


def load_model():
    global _pipeline, _metrics
    if not MODEL_PATH.exists():
        logger.warning(f"ML model not found at {MODEL_PATH}. Diabetes predictions will be unavailable.")
        return None
    with open(MODEL_PATH, "rb") as f:
        _pipeline = pickle.load(f)
    if METRICS_PATH.exists():
        with open(METRICS_PATH) as f:
            _metrics = json.load(f)
    auc = _metrics.get("roc_auc", "N/A") if _metrics else "N/A"
    threshold = _pipeline.get("optimal_threshold", 0.5) if isinstance(_pipeline, dict) else 0.5
    logger.info(f"MediScan ML model loaded | ROC-AUC: {auc} | Threshold: {threshold}")
    return _pipeline


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        load_model()
    return _pipeline


def get_risk_level(prob: float, threshold: float = 0.5) -> str:
    # Scale the probability relative to optimal threshold
    if prob >= min(threshold * 1.6, 0.85):
        return "critical"
    elif prob >= min(threshold * 1.2, 0.65):
        return "high"
    elif prob >= threshold:
        return "medium"
    return "low"


def compute_risk_factors(features: dict) -> list:
    factors = []

    if features.get("HighBP", 0) == 1:
        factors.append({"factor": "High Blood Pressure", "value": "Yes",
                        "status": "critical", "note": "Major diabetes risk factor"})
    if features.get("HighChol", 0) == 1:
        factors.append({"factor": "High Cholesterol", "value": "Yes",
                        "status": "high", "note": "Increases insulin resistance"})
    bmi = features.get("BMI", 0)
    if bmi >= 30:
        factors.append({"factor": "Obesity (BMI)", "value": round(bmi, 1),
                        "status": "critical", "note": f"BMI {bmi:.1f} — Obese range (>=30)"})
    elif bmi >= 25:
        factors.append({"factor": "Overweight (BMI)", "value": round(bmi, 1),
                        "status": "elevated", "note": f"BMI {bmi:.1f} — Overweight range (25-30)"})
    genhlth = features.get("GenHlth", 1)
    if genhlth >= 4:
        factors.append({"factor": "Poor General Health", "value": GENHLTH_LABELS.get(int(genhlth), str(genhlth)),
                        "status": "high", "note": "Self-reported fair/poor health strongly correlates with diabetes"})
    age_cat = features.get("Age", 1)
    if age_cat >= 9:
        factors.append({"factor": "Age Risk Factor", "value": AGE_LABELS.get(int(age_cat), str(age_cat)),
                        "status": "elevated", "note": "Risk increases significantly after age 60"})
    if features.get("HeartDiseaseorAttack", 0) == 1:
        factors.append({"factor": "Heart Disease History", "value": "Yes",
                        "status": "critical", "note": "Strong comorbidity with diabetes"})
    if features.get("Stroke", 0) == 1:
        factors.append({"factor": "Stroke History", "value": "Yes",
                        "status": "high", "note": "Associated with metabolic syndrome"})
    if features.get("PhysActivity", 0) == 0:
        factors.append({"factor": "No Physical Activity", "value": "None",
                        "status": "elevated", "note": "Sedentary lifestyle increases risk by 30%"})
    if features.get("HvyAlcoholConsump", 0) == 1:
        factors.append({"factor": "Heavy Alcohol Use", "value": "Yes",
                        "status": "elevated", "note": "Disrupts blood sugar regulation"})
    physhlth = features.get("PhysHlth", 0)
    if physhlth >= 15:
        factors.append({"factor": "Frequent Physical Illness", "value": f"{int(physhlth)} days/month",
                        "status": "elevated", "note": "Chronic illness increases metabolic risk"})

    return factors[:6]


def compute_perturbation_importance(features: dict, pipeline: dict) -> dict:
    model = pipeline["model"]
    preprocessor = pipeline["preprocessor"]
    arr = np.array([[features[c] for c in FEATURE_COLUMNS]])
    arr_pp = preprocessor.transform(arr)
    try:
        base_prob = float(model.predict_proba(arr_pp)[0][1])
    except Exception:
        return {}

    contributions = {}
    for i, col in enumerate(FEATURE_COLUMNS):
        perturbed = arr.copy()
        perturbed[0][i] = 0
        pp = preprocessor.transform(perturbed)
        try:
            prob_without = float(model.predict_proba(pp)[0][1])
            contributions[col] = round(base_prob - prob_without, 4)
        except Exception:
            contributions[col] = 0.0
    return contributions


def get_model_breakdown(pipeline: dict, arr_pp) -> dict:
    breakdown = {}
    try:
        for name, estimator in pipeline["model"].estimators_:
            try:
                prob = float(estimator.predict_proba(arr_pp)[0][1])
                breakdown[name] = round(prob, 4)
            except Exception:
                pass
    except Exception:
        pass
    return breakdown


def predict_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    pipeline = get_pipeline()
    preprocessor = pipeline["preprocessor"]
    model = pipeline["model"]
    threshold = pipeline.get("optimal_threshold", 0.5)

    features = {
        "HighBP": float(data.get("high_bp", 0)),
        "HighChol": float(data.get("high_chol", 0)),
        "CholCheck": float(data.get("chol_check", 1)),
        "BMI": float(data.get("bmi", 25)),
        "Smoker": float(data.get("smoker", 0)),
        "Stroke": float(data.get("stroke", 0)),
        "HeartDiseaseorAttack": float(data.get("heart_disease", 0)),
        "PhysActivity": float(data.get("phys_activity", 1)),
        "Fruits": float(data.get("fruits", 1)),
        "Veggies": float(data.get("veggies", 1)),
        "HvyAlcoholConsump": float(data.get("heavy_alcohol", 0)),
        "AnyHealthcare": float(data.get("any_healthcare", 1)),
        "NoDocbcCost": float(data.get("no_doc_cost", 0)),
        "GenHlth": float(data.get("gen_health", 3)),
        "MentHlth": float(data.get("ment_health", 0)),
        "PhysHlth": float(data.get("phys_health", 0)),
        "DiffWalk": float(data.get("diff_walk", 0)),
        "Sex": float(data.get("sex", 0)),
        "Age": float(data.get("age_category", 5)),
        "Education": float(data.get("education", 4)),
        "Income": float(data.get("income", 5)),
    }

    arr = np.array([[features[c] for c in FEATURE_COLUMNS]])
    arr_pp = preprocessor.transform(arr)

    probability = float(model.predict_proba(arr_pp)[0][1])
    risk_level = get_risk_level(probability)
    confidence = abs(probability - 0.5) * 2
    risk_factors = compute_risk_factors(features)
    shap_vals = compute_perturbation_importance(features, pipeline)
    breakdown = get_model_breakdown(pipeline, arr_pp)

    return {
        "risk_score": round(probability, 4),
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "confidence": round(confidence, 4),
        "recommendations": RECOMMENDATIONS[risk_level],
        "shap_values": shap_vals,
        "model_breakdown": breakdown,
        "features_used": {k: round(v, 2) for k, v in features.items()},
    }


def get_model_info() -> dict:
    global _metrics
    return _metrics or {"status": "metrics not available"}
