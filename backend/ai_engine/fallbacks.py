"""
Offline fallbacks for AI features when Gemini API is unavailable.
Uses rule-based clinical logic to provide useful responses.
"""


def fallback_screen_disease(disease_type: str, indicators: dict) -> dict:
    """Rule-based disease risk screening fallback."""
    risk_score = 0
    risk_factors = []

    # Common risk scoring rules
    age = indicators.get("age", 0)
    if isinstance(age, (int, float)) and age > 55:
        risk_score += 15
        risk_factors.append({"factor": "Age", "value": str(age), "status": "elevated", "note": "Age over 55 increases risk"})

    bmi = indicators.get("bmi", 0)
    if isinstance(bmi, (int, float)) and bmi > 30:
        risk_score += 15
        risk_factors.append({"factor": "BMI", "value": str(bmi), "status": "high", "note": "Obesity increases risk"})

    if indicators.get("smoking") or indicators.get("smoking_history") in ["current_light", "current_heavy", "currently"]:
        risk_score += 15
        risk_factors.append({"factor": "Smoking", "value": "Yes", "status": "high", "note": "Smoking significantly increases risk"})

    if indicators.get("diabetes"):
        risk_score += 15
        risk_factors.append({"factor": "Diabetes", "value": "Yes", "status": "critical", "note": "Diabetes is a major comorbidity"})

    if indicators.get("hypertension") or indicators.get("high_bp"):
        risk_score += 12
        risk_factors.append({"factor": "Hypertension", "value": "Yes", "status": "high", "note": "High blood pressure increases risk"})

    if indicators.get("family_history"):
        risk_score += 10
        risk_factors.append({"factor": "Family History", "value": "Yes", "status": "elevated", "note": "Genetic predisposition"})

    if indicators.get("heart_disease"):
        risk_score += 15
        risk_factors.append({"factor": "Heart Disease", "value": "Yes", "status": "critical", "note": "Cardiovascular comorbidity"})

    # Disease-specific adjustments
    if disease_type in ["Heart Disease", "Stroke"]:
        bp = indicators.get("blood_pressure", 0)
        if isinstance(bp, (int, float)) and bp > 140:
            risk_score += 10
        chol = indicators.get("cholesterol", 0)
        if isinstance(chol, (int, float)) and chol > 240:
            risk_score += 10

    if disease_type == "Liver Disease":
        if indicators.get("alcohol_use") == "heavy":
            risk_score += 20
        if indicators.get("hepatitis_exposure"):
            risk_score += 20
        if indicators.get("jaundice"):
            risk_score += 15

    if disease_type == "Lung Disease":
        if indicators.get("chronic_cough"):
            risk_score += 15
        if indicators.get("shortness_of_breath"):
            risk_score += 15

    if disease_type == "Kidney Disease":
        creat = indicators.get("creatinine", 0)
        if isinstance(creat, (int, float)) and creat > 1.3:
            risk_score += 15

    if disease_type == "Thyroid Disorder":
        if indicators.get("weight_change") in ["gain", "loss"]:
            risk_score += 10
        if indicators.get("fatigue"):
            risk_score += 10
        if indicators.get("neck_swelling"):
            risk_score += 15

    risk_score = min(risk_score, 95)

    if risk_score >= 70:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"

    recommendations = {
        "low": f"Low {disease_type} risk based on provided indicators. Maintain healthy lifestyle. Routine checkup recommended.",
        "medium": f"Moderate {disease_type} risk detected. Schedule a follow-up with your doctor within 3 months. Monitor modifiable risk factors.",
        "high": f"High {disease_type} risk. Consult a specialist soon. Further diagnostic tests recommended.",
        "critical": f"Critical {disease_type} risk. Urgent specialist referral recommended. Immediate diagnostic evaluation needed.",
    }

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors[:6],
        "recommendations": recommendations[risk_level],
        "analysis": f"Rule-based screening for {disease_type}. This analysis uses clinical risk factor scoring without AI. For more detailed analysis, configure a valid Gemini API key.",
        "disclaimer": "This is a rule-based screening tool. Results should be reviewed by a qualified healthcare professional.",
    }


def fallback_analyze_lab(panel_type: str, values: dict) -> dict:
    """Rule-based lab value interpretation fallback."""
    findings = []
    concerns = []

    for test_name, info in values.items():
        status = info.get("status", "normal")
        value = info.get("value", 0)
        unit = info.get("unit", "")

        interpretation = "Within normal range."
        if status in ("high", "critical_high"):
            interpretation = f"Elevated — above the normal reference range. Clinical evaluation recommended."
            concerns.append(f"{test_name.replace('_', ' ').title()} is elevated")
        elif status in ("low", "critical_low"):
            interpretation = f"Below normal — further investigation may be needed."
            concerns.append(f"{test_name.replace('_', ' ').title()} is low")

        findings.append({
            "test": test_name.replace("_", " ").title(),
            "value": value,
            "unit": unit,
            "status": status,
            "interpretation": interpretation,
        })

    abnormal_count = len(concerns)
    if abnormal_count == 0:
        summary = "All values are within normal reference ranges. No immediate concerns."
    elif abnormal_count <= 2:
        summary = f"{abnormal_count} value(s) outside normal range. Review flagged results with your physician."
    else:
        summary = f"{abnormal_count} values outside normal range. Clinical review recommended."

    return {
        "summary": summary,
        "findings": findings,
        "concerns": concerns,
        "recommendations": "Discuss these results with your healthcare provider for personalized guidance." if concerns else "Continue routine monitoring.",
        "disclaimer": "Rule-based interpretation. Must be reviewed by a healthcare professional.",
    }


def fallback_analyze_drug(drug_name: str) -> dict:
    """Basic drug info fallback."""
    return {
        "generic_name": drug_name,
        "brand_names": [drug_name.title()],
        "drug_class": "Information unavailable (AI offline)",
        "uses": ["Consult your pharmacist or doctor for drug information"],
        "dosage": "Refer to prescription label or pharmacist",
        "side_effects": {
            "common": ["Information unavailable — consult pharmacist"],
            "serious": ["Information unavailable — consult pharmacist"],
        },
        "contraindications": ["Consult your healthcare provider"],
        "warnings": ["Always follow your doctor's prescription"],
        "interactions_summary": "Drug interaction data requires AI service. Please consult a pharmacist.",
        "disclaimer": "Detailed AI analysis unavailable. Consult your doctor or pharmacist.",
    }


def fallback_check_interactions(drug_list: list) -> dict:
    """Basic interaction check fallback."""
    return {
        "interactions": [],
        "safe_combinations": [],
        "overall_risk": "unknown",
        "recommendations": f"AI-powered interaction analysis is currently unavailable. Please consult a pharmacist about potential interactions between: {', '.join(drug_list)}.",
        "disclaimer": "Detailed interaction analysis requires AI service. Always consult a pharmacist.",
    }


def fallback_analyze_symptoms(symptoms_text: str) -> dict:
    """Basic symptom triage fallback."""
    symptoms_lower = symptoms_text.lower()

    urgency = "routine"
    red_flags = []

    emergency_keywords = ["chest pain", "difficulty breathing", "unconscious", "seizure", "severe bleeding", "stroke", "heart attack", "can't breathe"]
    urgent_keywords = ["high fever", "vomiting blood", "severe pain", "sudden weakness", "confusion", "fainting"]

    for kw in emergency_keywords:
        if kw in symptoms_lower:
            urgency = "emergency"
            red_flags.append(f"Symptom '{kw}' may require immediate emergency care")

    if urgency != "emergency":
        for kw in urgent_keywords:
            if kw in symptoms_lower:
                urgency = "urgent"
                red_flags.append(f"Symptom '{kw}' should be evaluated promptly")

    if urgency == "routine" and any(w in symptoms_lower for w in ["pain", "fever", "swelling", "bleeding"]):
        urgency = "soon"

    return {
        "possible_conditions": [
            {
                "condition": "Multiple conditions possible",
                "likelihood": "moderate",
                "severity": "moderate" if urgency in ("urgent", "emergency") else "mild",
                "description": "AI-powered diagnosis suggestions are currently unavailable. Please describe your symptoms to a healthcare professional.",
                "key_symptoms_matched": [],
            }
        ],
        "urgency_level": urgency,
        "urgency_note": "Emergency: seek immediate medical attention" if urgency == "emergency" else "Please consult a healthcare professional for proper evaluation.",
        "recommended_actions": [
            "Consult a doctor for proper diagnosis",
            "Keep track of your symptoms (when they started, severity, triggers)",
            "Seek emergency care if symptoms worsen suddenly",
        ],
        "specialist_referral": "General practitioner / primary care physician",
        "red_flags": red_flags,
        "disclaimer": "This is a basic triage tool. AI analysis is currently unavailable. Please consult a healthcare professional.",
    }


def fallback_health_chat(message: str) -> str:
    """Basic health chat fallback."""
    msg = message.lower()

    if any(w in msg for w in ["emergency", "911", "chest pain", "can't breathe", "heart attack"]):
        return "If you are experiencing a medical emergency, please call emergency services (911) immediately or go to the nearest emergency room. Do not delay seeking help."

    if any(w in msg for w in ["hello", "hi", "hey"]):
        return "Hello! I'm the MediScan AI Health Assistant. I can help with general health questions. However, the AI service is currently in limited mode. For medical concerns, please consult a healthcare professional."

    if any(w in msg for w in ["diabetes", "blood sugar", "glucose"]):
        return "Diabetes is a condition where your body can't properly process blood sugar. Key management includes: regular blood sugar monitoring, balanced diet low in refined sugars, regular exercise, and taking prescribed medications. Please consult your doctor for personalized advice."

    if any(w in msg for w in ["blood pressure", "hypertension"]):
        return "High blood pressure can be managed through: reducing sodium intake, regular exercise, maintaining healthy weight, limiting alcohol, managing stress, and taking prescribed medications. Monitor your blood pressure regularly and follow your doctor's guidance."

    return "Thank you for your question. The AI health assistant is currently running in limited mode. For personalized health advice, please consult a healthcare professional. You can use the Symptom Checker or Lab Report Analyzer for basic assessments."


def fallback_summarize_notes(notes_text: str) -> dict:
    """Basic note extraction fallback."""
    words = notes_text.split()
    return {
        "summary": f"Clinical notes received ({len(words)} words). AI-powered summarization is currently unavailable. Please review the notes manually.",
        "key_findings": ["AI summarization unavailable — manual review required"],
        "diagnoses": [],
        "medications_mentioned": [],
        "vitals": {},
        "follow_up": "Review notes with healthcare team",
        "concerns": ["Automated analysis unavailable"],
    }
