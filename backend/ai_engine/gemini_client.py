"""
Gemini AI Client — shared AI engine for MediScan AI platform.
Supports multiple API keys with round-robin load balancing and automatic failover.

Configuration via environment variables:
  GEMINI_API_KEY=key1            (single key)
  GEMINI_API_KEYS=key1,key2,key3 (multiple keys — comma separated)

If both are set, all keys are pooled together.
Requests are distributed across working keys via round-robin.
Failed keys are temporarily disabled and retried after a cooldown period.
"""
import os
import json
import time
import logging
import threading
import google.generativeai as genai

logger = logging.getLogger(__name__)


# ── Multi-Key Pool ───────────────────────────────────────────────────

class GeminiKeyPool:
    """Thread-safe round-robin key pool with failover and cooldown."""

    COOLDOWN_SECONDS = 60  # How long to wait before retrying a failed key

    def __init__(self):
        self._keys: list[str] = []
        self._models: dict[str, genai.GenerativeModel] = {}
        self._failed: dict[str, float] = {}  # key -> timestamp of failure
        self._index = 0
        self._lock = threading.Lock()
        self._initialized = False

    def _load_keys(self):
        """Load API keys from environment variables."""
        keys = set()

        single = os.getenv("GEMINI_API_KEY", "").strip()
        if single:
            keys.add(single)

        multi = os.getenv("GEMINI_API_KEYS", "").strip()
        if multi:
            for k in multi.split(","):
                k = k.strip()
                if k:
                    keys.add(k)

        if not keys:
            raise ValueError(
                "No Gemini API keys configured. "
                "Set GEMINI_API_KEY or GEMINI_API_KEYS (comma-separated) in your .env"
            )

        self._keys = list(keys)
        logger.info(f"Gemini key pool initialized with {len(self._keys)} key(s)")

    def _get_model_for_key(self, api_key: str) -> genai.GenerativeModel:
        """Get or create a model instance for a specific API key."""
        if api_key not in self._models:
            genai.configure(api_key=api_key)
            self._models[api_key] = genai.GenerativeModel("gemini-2.0-flash")
        return self._models[api_key]

    def _is_key_available(self, key: str) -> bool:
        """Check if a key is available (not in cooldown)."""
        if key not in self._failed:
            return True
        elapsed = time.time() - self._failed[key]
        if elapsed >= self.COOLDOWN_SECONDS:
            del self._failed[key]
            logger.info(f"Gemini key ...{key[-6:]} cooldown expired, re-enabling")
            return True
        return False

    def _mark_failed(self, key: str):
        """Mark a key as failed and start cooldown."""
        self._failed[key] = time.time()
        logger.warning(f"Gemini key ...{key[-6:]} marked as failed, cooldown {self.COOLDOWN_SECONDS}s")

    def _mark_success(self, key: str):
        """Clear any failure state for a key."""
        self._failed.pop(key, None)

    def get_available_keys(self) -> list[str]:
        """Get list of keys in round-robin order, available ones first."""
        with self._lock:
            if not self._initialized:
                self._load_keys()
                self._initialized = True

            # Start from current index for round-robin
            n = len(self._keys)
            ordered = [self._keys[(self._index + i) % n] for i in range(n)]
            # Advance index for next call
            self._index = (self._index + 1) % n

        # Available keys first, then cooldown keys as last resort
        available = [k for k in ordered if self._is_key_available(k)]
        cooldown = [k for k in ordered if not self._is_key_available(k)]
        return available + cooldown

    def execute(self, fn, *args, **kwargs):
        """Execute a function with automatic key rotation and failover.

        fn receives (model, *args, **kwargs) and should return the result.
        On failure, the next key is tried. All keys exhausted raises the last error.
        """
        keys = self.get_available_keys()
        last_error = None

        for key in keys:
            try:
                # Configure genai for this specific key
                genai.configure(api_key=key)
                model = self._get_model_for_key(key)
                # Recreate model after configure to ensure it uses the right key
                model = genai.GenerativeModel("gemini-2.0-flash")
                self._models[key] = model

                result = fn(model, *args, **kwargs)
                self._mark_success(key)
                return result

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Rate limit or quota errors → failover to next key
                if any(term in error_str for term in ["quota", "rate", "limit", "429", "resource_exhausted"]):
                    logger.warning(f"Key ...{key[-6:]} rate limited, trying next key")
                    self._mark_failed(key)
                    continue

                # Auth errors → key is bad, skip it
                if any(term in error_str for term in ["invalid", "api_key", "401", "403", "permission"]):
                    logger.error(f"Key ...{key[-6:]} authentication failed, disabling")
                    self._mark_failed(key)
                    continue

                # Other errors (network, server) → try next key
                logger.warning(f"Key ...{key[-6:]} error: {e}, trying next key")
                self._mark_failed(key)
                continue

        # All keys exhausted
        logger.error(f"All {len(keys)} Gemini keys failed. Last error: {last_error}")
        raise last_error


# Global pool instance
_pool = GeminiKeyPool()


# ── Public API (same interface as before) ────────────────────────────

def ask_gemini(prompt: str, system_instruction: str = "") -> str:
    """Send a prompt to Gemini and return text response."""
    full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt

    def _call(model):
        response = model.generate_content(full_prompt)
        return response.text

    return _pool.execute(_call)


def ask_gemini_json(prompt: str, system_instruction: str = "") -> dict:
    """Send a prompt to Gemini and parse JSON response."""
    try:
        raw = ask_gemini(prompt, system_instruction)
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse Gemini JSON response, returning raw text")
        return {"raw_response": raw, "parse_error": True}


def ask_gemini_vision(image_data: bytes, prompt: str, mime_type: str = "image/jpeg") -> str:
    """Send an image to Gemini Vision for analysis."""
    def _call(model):
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": image_data}
        ])
        return response.text

    return _pool.execute(_call)


# ── Disease Screening Prompts ────────────────────────────────────────

SCREENING_SYSTEM = """You are a clinical risk assessment AI. Analyze patient health indicators and provide a structured risk assessment.
IMPORTANT: Always include a medical disclaimer. You are an AI tool for screening, not a diagnosis.
Respond ONLY with valid JSON in the exact format specified."""


def screen_disease(disease_type: str, indicators: dict) -> dict:
    """Run AI-powered disease risk screening with fallback."""
    from .fallbacks import fallback_screen_disease
    try:
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

        result = ask_gemini_json(prompt, SCREENING_SYSTEM)
        if not result.get("parse_error"):
            return result
    except Exception as e:
        logger.warning(f"Gemini screening failed, using fallback: {e}")
    return fallback_screen_disease(disease_type, indicators)


# ── Lab Report Prompts ───────────────────────────────────────────────

LAB_SYSTEM = """You are a clinical laboratory specialist AI. Analyze lab test results and provide interpretation.
IMPORTANT: Include medical disclaimer. Flag abnormal values clearly.
Respond ONLY with valid JSON in the exact format specified."""


def analyze_lab_values(panel_type: str, values: dict) -> dict:
    """Analyze lab values with fallback."""
    from .fallbacks import fallback_analyze_lab
    try:
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

        result = ask_gemini_json(prompt, LAB_SYSTEM)
        if not result.get("parse_error"):
            return result
    except Exception as e:
        logger.warning(f"Gemini lab analysis failed, using fallback: {e}")
    return fallback_analyze_lab(panel_type, values)


def extract_lab_from_image(image_data: bytes, mime_type: str = "image/jpeg") -> dict:
    """Extract lab values from uploaded report image/PDF."""
    return _extract_lab_vision(image_data, mime_type)


def _extract_lab_vision(image_data: bytes, mime_type: str) -> dict:
    """Internal: use Gemini Vision to extract lab values."""
    try:
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

        raw = ask_gemini_vision(image_data, prompt, mime_type)
        text = raw.strip()
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
    """Get detailed drug information with fallback."""
    from .fallbacks import fallback_analyze_drug
    try:
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

        result = ask_gemini_json(prompt, MEDICINE_SYSTEM)
        if not result.get("parse_error"):
            return result
    except Exception as e:
        logger.warning(f"Gemini drug analysis failed, using fallback: {e}")
    return fallback_analyze_drug(drug_name)


def check_interactions(drug_list: list) -> dict:
    """Check drug interactions with fallback."""
    from .fallbacks import fallback_check_interactions
    try:
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

        result = ask_gemini_json(prompt, MEDICINE_SYSTEM)
        if not result.get("parse_error"):
            return result
    except Exception as e:
        logger.warning(f"Gemini interaction check failed, using fallback: {e}")
    return fallback_check_interactions(drug_list)


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
    """Analyze symptoms with fallback."""
    from .fallbacks import fallback_analyze_symptoms
    try:
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

        result = ask_gemini_json(prompt, SYMPTOM_SYSTEM)
        if not result.get("parse_error"):
            return result
    except Exception as e:
        logger.warning(f"Gemini symptom analysis failed, using fallback: {e}")
    return fallback_analyze_symptoms(symptoms_text)


def health_chat(message: str, history: list = None) -> str:
    """Conversational health assistant with fallback."""
    from .fallbacks import fallback_health_chat
    try:
        chat_context = ""
        if history:
            chat_context = "\n\nConversation history:\n"
            for msg in history[-10:]:
                role = msg.get("role", "user")
                chat_context += f"{role}: {msg.get('content', '')}\n"

        prompt = f"""{chat_context}
User message: {message}

Respond helpfully and empathetically. If the user describes symptoms, suggest they see a doctor.
If it's a medical emergency, advise calling emergency services.
Keep your response under 200 words. Do not use markdown formatting."""

        return ask_gemini(prompt, CHAT_SYSTEM)
    except Exception as e:
        logger.warning(f"Gemini chat failed, using fallback: {e}")
        return fallback_health_chat(message)


def summarize_clinical_notes(notes_text: str) -> dict:
    """Summarize clinical notes with fallback."""
    from .fallbacks import fallback_summarize_notes
    try:
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

        result = ask_gemini_json(prompt, """You are a clinical documentation specialist.
Extract and organize key information from clinical notes. Respond ONLY with valid JSON.""")
        if not result.get("parse_error"):
            return result
    except Exception as e:
        logger.warning(f"Gemini note summary failed, using fallback: {e}")
    return fallback_summarize_notes(notes_text)
