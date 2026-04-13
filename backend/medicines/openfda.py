"""
OpenFDA Drug API wrapper — free, no API key required.
https://open.fda.gov/apis/drug/
"""
import logging
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://api.fda.gov/drug"


def search_drug(query: str, limit: int = 5) -> list:
    """Search for drugs by name using OpenFDA."""
    try:
        response = requests.get(
            f"{BASE_URL}/label.json",
            params={
                "search": f'openfda.brand_name:"{query}"+openfda.generic_name:"{query}"',
                "limit": limit,
            },
            timeout=10,
        )
        if response.status_code != 200:
            return []

        results = response.json().get("results", [])
        drugs = []
        for r in results:
            openfda = r.get("openfda", {})
            drugs.append({
                "brand_name": openfda.get("brand_name", ["Unknown"])[0],
                "generic_name": openfda.get("generic_name", ["Unknown"])[0],
                "manufacturer": openfda.get("manufacturer_name", ["Unknown"])[0],
                "route": openfda.get("route", ["Unknown"])[0],
                "substance_name": openfda.get("substance_name", []),
                "product_type": openfda.get("product_type", ["Unknown"])[0],
                "indications": (r.get("indications_and_usage") or [""])[0][:300],
                "warnings": (r.get("warnings") or [""])[0][:300],
            })
        return drugs
    except Exception as e:
        logger.error(f"OpenFDA search error: {e}")
        return []


def get_drug_label(drug_name: str) -> dict:
    """Get detailed drug label information from OpenFDA."""
    try:
        response = requests.get(
            f"{BASE_URL}/label.json",
            params={
                "search": f'openfda.brand_name:"{drug_name}"+openfda.generic_name:"{drug_name}"',
                "limit": 1,
            },
            timeout=10,
        )
        if response.status_code != 200:
            return {}

        results = response.json().get("results", [])
        if not results:
            return {}

        r = results[0]
        openfda = r.get("openfda", {})

        return {
            "brand_name": openfda.get("brand_name", ["Unknown"])[0],
            "generic_name": openfda.get("generic_name", ["Unknown"])[0],
            "manufacturer": openfda.get("manufacturer_name", ["Unknown"])[0],
            "route": openfda.get("route", []),
            "substance_name": openfda.get("substance_name", []),
            "product_type": openfda.get("product_type", ["Unknown"])[0],
            "pharm_class": openfda.get("pharm_class_epc", []),
            "indications": r.get("indications_and_usage", []),
            "dosage": r.get("dosage_and_administration", []),
            "warnings": r.get("warnings", []),
            "adverse_reactions": r.get("adverse_reactions", []),
            "contraindications": r.get("contraindications", []),
            "drug_interactions": r.get("drug_interactions", []),
            "precautions": r.get("precautions", []),
            "overdosage": r.get("overdosage", []),
        }
    except Exception as e:
        logger.error(f"OpenFDA label error: {e}")
        return {}


def get_adverse_events(drug_name: str, limit: int = 5) -> list:
    """Get reported adverse events for a drug."""
    try:
        response = requests.get(
            f"{BASE_URL}/event.json",
            params={
                "search": f'patient.drug.openfda.brand_name:"{drug_name}"',
                "count": "patient.reaction.reactionmeddrapt.exact",
                "limit": limit,
            },
            timeout=10,
        )
        if response.status_code != 200:
            return []

        return [
            {"reaction": r["term"], "count": r["count"]}
            for r in response.json().get("results", [])
        ]
    except Exception as e:
        logger.error(f"OpenFDA adverse events error: {e}")
        return []
