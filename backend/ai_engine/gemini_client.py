"""
Gemini AI Client — shared AI engine for MediScan AI platform.
Uses Google Gemini API (free tier: 15 RPM, 1500 RPD).
"""
import os
import json
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)

_model = None


def get_model():
    global _model
    if _model is None:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel("gemini-2.0-flash")
    return _model


def ask_gemini(prompt: str, system_instruction: str = "") -> str:
    """Send a prompt to Gemini and return text response."""
    try:
        model = get_model()
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise


def ask_gemini_json(prompt: str, system_instruction: str = "") -> dict:
    """Send a prompt to Gemini and parse JSON response."""
    try:
        raw = ask_gemini(prompt, system_instruction)
        # Extract JSON from markdown code blocks if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse Gemini JSON response, returning raw text")
        return {"raw_response": raw, "parse_error": True}
    except Exception as e:
        logger.error(f"Gemini JSON error: {e}")
        raise


def ask_gemini_vision(image_data: bytes, prompt: str, mime_type: str = "image/jpeg") -> str:
    """Send an image to Gemini Vision for analysis."""
    try:
        model = get_model()
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_data}
        ])
        return response.text
    except Exception as e:
        logger.error(f"Gemini Vision error: {e}")
        raise


# ── Disease Screening Prompts ────────────────────────────────────────

SCREENING_SYSTEM = """You are a clinical risk assessment AI. Analyze patient health indicators and provide a structured risk assessment.
IMPORTANT: Always include a medical disclaimer. You are an AI tool for screening, not a diagnosis.
Respond ONLY with valid JSON in the exact format specified."""


def screen_disease(disease_type: str, indicators: dict) -> dict:
    """Run AI-powered disease risk screening."""
    prompt = f"""Analyze these health indicators for {disease_type} risk assessment.

Patient indicators: {json.dumps(indicators)}

Respond with ONLY this JSON format:
{{
    "risk_score": <number 0-100>,
    "risk_level": "<low|medium|high|critical>",
    "risk_factors": [
        {{"factor": "<name>", "value": "<value>", "status": "<critical|high|elevated|normal>", "note": "<clinical note>"}}
    ],
    "recommendations": "<clinical recommendations as a paragraph>",
    "analysis": "<detailed clinical analysis paragraph explaining the risk assessment>",
    "disclaimer": "This is an AI-powered screening tool. Results should be reviewed by a qualified healthcare professional."
}}

Risk level guide: 0-25=low, 25-50=medium, 50-75=high, 75-100=critical.
Provide 3-6 risk factors sorted by severity. Be clinically accurate."""

    return ask_gemini_json(prompt, SCREENING_SYSTEM)


# ── Lab Report Prompts ───────────────────────────────────────────────

LAB_SYSTEM = """You are a clinical laboratory specialist AI. Analyze lab test results and provide interpretation.
IMPORTANT: Include medical disclaimer. Flag abnormal values clearly.
Respond ONLY with valid JSON in the exact format specified."""


def analyze_lab_values(panel_type: str, values: dict) -> dict:
    """Analyze manually entered lab values."""
    prompt = f"""Analyze these {panel_type} lab results:

{json.dumps(values, indent=2)}

Respond with ONLY this JSON:
{{
    "summary": "<overall interpretation paragraph>",
    "findings": [
        {{"test": "<name>", "value": <number>, "unit": "<unit>", "status": "<low|normal|high|critical>", "interpretation": "<what this means>"}}
    ],
    "concerns": ["<list of main clinical concerns>"],
    "recommendations": "<what the patient/doctor should do next>",
    "disclaimer": "AI-generated interpretation. Must be reviewed by a healthcare professional."
}}"""

    return ask_gemini_json(prompt, LAB_SYSTEM)


def extract_lab_from_image(image_data: bytes, mime_type: str = "image/jpeg") -> dict:
    """Extract lab values from uploaded report image/PDF."""
    prompt = """Extract ALL lab test values from this medical report image.

Respond with ONLY this JSON:
{
    "panel_type": "<detected panel type: cbc|lipid_panel|metabolic|liver_function|kidney_function|thyroid|comprehensive>",
    "values": {
        "<test_name>": {"value": <number>, "unit": "<unit>", "reference_range": "<low-high>"}
    },
    "patient_info": {"name": "<if visible>", "date": "<if visible>"},
    "extraction_confidence": "<high|medium|low>"
}

Extract every test value visible. Use standard medical abbreviations."""

    return ask_gemini_json(
        ask_gemini_vision(image_data, prompt, mime_type)
    ) if False else _extract_lab_vision(image_data, mime_type)


def _extract_lab_vision(image_data: bytes, mime_type: str) -> dict:
    """Internal: use Gemini Vision to extract lab values."""
    try:
        model = get_model()
        prompt = """Extract ALL lab test values from this medical report.

Respond with ONLY valid JSON:
{
    "panel_type": "<detected panel type: cbc|lipid_panel|metabolic|liver_function|kidney_function|thyroid|comprehensive>",
    "values": {
        "<test_name>": {"value": "<number>", "unit": "<unit>", "reference_range": "<low-high>"}
    },
    "patient_info": {"name": "<if visible>", "date": "<if visible>"},
    "extraction_confidence": "<high|medium|low>"
}"""

        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_data}
        ])
        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)
    except Exception as e:
        logger.error(f"Lab extraction error: {e}")
        return {"error": str(e), "values": {}}


# ── Medicine Prompts ─────────────────────────────────────────────────

MEDICINE_SYSTEM = """You are a clinical pharmacology AI. Provide accurate drug information.
IMPORTANT: Include disclaimer about consulting a pharmacist or doctor.
Respond ONLY with valid JSON."""


def analyze_drug(drug_name: str, fda_data: dict = None) -> dict:
    """Get detailed drug information using Gemini."""
    context = f"\nFDA data available: {json.dumps(fda_data)}" if fda_data else ""
    prompt = f"""Provide comprehensive information about the drug: {drug_name}{context}

Respond with ONLY this JSON:
{{
    "generic_name": "<generic name>",
    "brand_names": ["<brand names>"],
    "drug_class": "<pharmacological class>",
    "uses": ["<primary uses>"],
    "dosage": "<common dosage information>",
    "side_effects": {{
        "common": ["<common side effects>"],
        "serious": ["<serious side effects>"]
    }},
    "contraindications": ["<when NOT to use>"],
    "warnings": ["<important warnings>"],
    "interactions_summary": "<brief interaction overview>",
    "disclaimer": "Consult your doctor or pharmacist for personalized medical advice."
}}"""

    return ask_gemini_json(prompt, MEDICINE_SYSTEM)


def check_interactions(drug_list: list) -> dict:
    """Check drug-drug interactions."""
    prompt = f"""Analyze potential drug interactions between these medications:
{json.dumps(drug_list)}

Respond with ONLY this JSON:
{{
    "interactions": [
        {{
            "drug_pair": ["<drug1>", "<drug2>"],
            "severity": "<mild|moderate|severe|contraindicated>",
            "description": "<what happens>",
            "recommendation": "<what to do>"
        }}
    ],
    "safe_combinations": ["<pairs that are generally safe together>"],
    "overall_risk": "<low|moderate|high>",
    "recommendations": "<overall guidance>",
    "disclaimer": "This is an AI screening tool. Always consult a pharmacist or physician about drug interactions."
}}"""

    return ask_gemini_json(prompt, MEDICINE_SYSTEM)


# ── NLP / Health Assistant Prompts ───────────────────────────────────

SYMPTOM_SYSTEM = """You are a medical triage AI assistant. Analyze symptoms and suggest possible conditions.
CRITICAL: You are NOT providing a diagnosis. Always recommend seeing a doctor.
Never suggest specific medications or dosages. Focus on urgency assessment.
Respond ONLY with valid JSON."""

CHAT_SYSTEM = """You are MediScan AI Health Assistant — a helpful, empathetic medical information chatbot.
You provide general health information and guidance, NOT medical diagnoses.
Always recommend consulting a healthcare professional for medical concerns.
Keep responses concise, clear, and compassionate. Use simple language.
If asked about emergencies, always advise calling emergency services immediately."""


def analyze_symptoms(symptoms_text: str, patient_info: dict = None) -> dict:
    """Analyze free-text symptoms and suggest possible conditions."""
    context = f"\nPatient context: {json.dumps(patient_info)}" if patient_info else ""
    prompt = f"""Analyze these symptoms: "{symptoms_text}"{context}

Respond with ONLY this JSON:
{{
    "possible_conditions": [
        {{
            "condition": "<condition name>",
            "likelihood": "<high|moderate|low>",
            "severity": "<mild|moderate|severe|emergency>",
            "description": "<brief description>",
            "key_symptoms_matched": ["<which symptoms match>"]
        }}
    ],
    "urgency_level": "<routine|soon|urgent|emergency>",
    "urgency_note": "<explanation of urgency assessment>",
    "recommended_actions": ["<what the patient should do>"],
    "specialist_referral": "<suggested specialist if applicable>",
    "red_flags": ["<any warning signs requiring immediate attention>"],
    "disclaimer": "This is an AI-powered symptom analysis tool, NOT a medical diagnosis. Please consult a healthcare professional."
}}

List 2-5 possible conditions sorted by likelihood. Be conservative with severity ratings."""

    return ask_gemini_json(prompt, SYMPTOM_SYSTEM)


def health_chat(message: str, history: list = None) -> str:
    """Conversational health assistant."""
    chat_context = ""
    if history:
        chat_context = "\n\nConversation history:\n"
        for msg in history[-10:]:  # Keep last 10 messages for context
            role = msg.get("role", "user")
            chat_context += f"{role}: {msg.get('content', '')}\n"

    prompt = f"""{chat_context}
User message: {message}

Respond helpfully and empathetically. If the user describes symptoms, suggest they see a doctor.
If it's a medical emergency, advise calling emergency services.
Keep your response under 200 words. Do not use markdown formatting."""

    return ask_gemini(prompt, CHAT_SYSTEM)


def summarize_clinical_notes(notes_text: str) -> dict:
    """Summarize clinical/doctor notes into structured format."""
    prompt = f"""Summarize these clinical notes into a structured format:

"{notes_text}"

Respond with ONLY this JSON:
{{
    "summary": "<brief overall summary>",
    "key_findings": ["<important findings>"],
    "diagnoses": ["<mentioned diagnoses or conditions>"],
    "medications_mentioned": ["<any medications referenced>"],
    "vitals": {{"<vital_name>": "<value if mentioned>"}},
    "follow_up": "<any follow-up instructions>",
    "concerns": ["<flagged concerns>"]
}}"""

    return ask_gemini_json(prompt, """You are a clinical documentation specialist.
Extract and organize key information from clinical notes. Respond ONLY with valid JSON.""")
