"""
OpenFDA Drug API wrapper with optional API key rotation.

OpenFDA is free without a key (40 req/min), but with a key you get 240 req/min.
Supports multiple keys via OPENFDA_API_KEYS env var for higher throughput.

Config:
  OPENFDA_API_KEY=key1              (single key, optional)
  OPENFDA_API_KEYS=key1,key2,key3   (multiple keys, optional)
  No keys = unauthenticated (40 req/min, still works fine)
"""
import os
import time
import logging
import threading
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://api.fda.gov/drug"


class OpenFDAKeyPool:
    """Optional API key pool for OpenFDA. Works without keys too."""

    COOLDOWN_SECONDS = 30

    def __init__(self):
        self._keys: list[str | None] = []
        self._failed: dict[int, float] = {}  # index -> failure timestamp
        self._index = 0
        self._lock = threading.Lock()
        self._initialized = False

    def _load_keys(self):
        keys = []
        single = os.getenv("OPENFDA_API_KEY", "").strip()
        if single:
            keys.append(single)

        multi = os.getenv("OPENFDA_API_KEYS", "").strip()
        if multi:
            for k in multi.split(","):
                k = k.strip()
                if k and k not in keys:
                    keys.append(k)

        if keys:
            logger.info(f"OpenFDA key pool: {len(keys)} key(s) loaded")
        else:
            logger.info("OpenFDA: no API keys, using unauthenticated access (40 req/min)")

        # None = unauthenticated fallback (always available as last resort)
        self._keys = keys + [None]

    def get_next_key(self) -> str | None:
        """Get next available API key via round-robin."""
        with self._lock:
            if not self._initialized:
                self._load_keys()
                self._initialized = True

            n = len(self._keys)
            now = time.time()

            # Try each key starting from current index
            for attempt in range(n):
                idx = (self._index + attempt) % n
                if idx in self._failed:
                    if now - self._failed[idx] >= self.COOLDOWN_SECONDS:
                        del self._failed[idx]
                    else:
                        continue

                self._index = (idx + 1) % n
                return self._keys[idx]

            # All keys in cooldown — use unauthenticated as fallback
            self._index = (self._index + 1) % n
            return None

    def mark_failed(self, key: str | None):
        """Mark a key as rate-limited."""
        with self._lock:
            try:
                idx = self._keys.index(key)
                self._failed[idx] = time.time()
                label = f"...{key[-6:]}" if key else "unauthenticated"
                logger.warning(f"OpenFDA key {label} rate limited, cooldown {self.COOLDOWN_SECONDS}s")
            except ValueError:
                pass

    def mark_success(self, key: str | None):
        """Clear failure state."""
        with self._lock:
            try:
                idx = self._keys.index(key)
                self._failed.pop(idx, None)
            except ValueError:
                pass


_pool = OpenFDAKeyPool()


def _fda_request(endpoint: str, params: dict, timeout: int = 10) -> dict | None:
    """Make an OpenFDA request with automatic key rotation and failover."""
    attempts = 3  # Max attempts across different keys

    for _ in range(attempts):
        key = _pool.get_next_key()

        req_params = dict(params)
        if key:
            req_params["api_key"] = key

        try:
            response = requests.get(
                f"{BASE_URL}/{endpoint}",
                params=req_params,
                timeout=timeout,
            )

            if response.status_code == 429:
                _pool.mark_failed(key)
                continue

            if response.status_code != 200:
                return None

            _pool.mark_success(key)
            return response.json()

        except requests.Timeout:
            _pool.mark_failed(key)
            continue
        except Exception as e:
            logger.error(f"OpenFDA request error: {e}")
            return None

    return None


def search_drug(query: str, limit: int = 5) -> list:
    """Search for drugs by name using OpenFDA."""
    data = _fda_request("label.json", {
        "search": f'openfda.brand_name:"{query}"+openfda.generic_name:"{query}"',
        "limit": limit,
    })

    if not data:
        return []

    drugs = []
    for r in data.get("results", []):
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


def get_drug_label(drug_name: str) -> dict:
    """Get detailed drug label information from OpenFDA."""
    data = _fda_request("label.json", {
        "search": f'openfda.brand_name:"{drug_name}"+openfda.generic_name:"{drug_name}"',
        "limit": 1,
    })

    if not data or not data.get("results"):
        return {}

    r = data["results"][0]
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


def get_adverse_events(drug_name: str, limit: int = 5) -> list:
    """Get reported adverse events for a drug."""
    data = _fda_request("event.json", {
        "search": f'patient.drug.openfda.brand_name:"{drug_name}"',
        "count": "patient.reaction.reactionmeddrapt.exact",
        "limit": limit,
    })

    if not data:
        return []

    return [
        {"reaction": r["term"], "count": r["count"]}
        for r in data.get("results", [])
    ]
