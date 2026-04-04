"""
services/ml_service.py
Loads the pre-trained Random Forest (tabular) and TF-IDF + Logistic
Regression (text) models and exposes assess_student().

FIXES applied:
1. assess_student() now returns full probability dicts for ALL three
   classes (tabular_proba, text_proba) so the frontend can render
   accurate per-class confidence bars.
2. _fuse_risks() now has a HIGH-RISK PROTECTION RULE: if the tabular
   model predicts High Risk with >= 65% confidence, the final result
   is always High Risk regardless of the text model. This prevents
   a Low Risk text prediction from overriding a strongly-signalled
   tabular High Risk — which is the safety-critical failure mode.
3. text_confidence returns the per-class probability for the predicted
   class (was already doing this, but now also captures full proba dict).
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Optional

import joblib
import numpy as np
import pandas as pd

from utils.config import settings

logger = logging.getLogger(__name__)

RISK_LABELS = {0: "Low Risk", 1: "Medium Risk", 2: "High Risk"}

# Tabular model confidence threshold above which High Risk
# from the survey model overrides the text model entirely.
HIGH_RISK_TABULAR_THRESHOLD = 0.65


@dataclass
class AssessmentResult:
    final_risk:          str
    tabular_risk:        str
    text_risk:           str
    tabular_confidence:  float
    text_confidence:     float
    # FIX 1 — full probability dicts for all three classes
    tabular_proba:       dict = field(default_factory=dict)
    text_proba:          dict = field(default_factory=dict)
    summary:             str  = ""
    suggestions:         list = field(default_factory=list)
    rag_response:        str  = ""  # filled by groq_service


class MLService:
    _instance: "MLService | None" = None

    def __init__(self) -> None:
        self.tabular_model      = None
        self.text_model         = None
        self.tfidf_vectorizer   = None
        self._loaded            = False

    @classmethod
    def get_instance(cls) -> "MLService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_models(self) -> None:
        if self._loaded:
            return

        tabular_path = settings.TABULAR_MODEL_PATH
        text_path    = settings.TEXT_MODEL_PATH
        tfidf_path   = settings.TFIDF_VECTORIZER_PATH

        if os.path.exists(tabular_path):
            self.tabular_model = joblib.load(tabular_path)
            logger.info("Tabular model loaded from %s", tabular_path)
        else:
            logger.warning("Tabular model not found at %s — using rule-based fallback", tabular_path)

        if os.path.exists(text_path) and os.path.exists(tfidf_path):
            self.text_model         = joblib.load(text_path)
            self.tfidf_vectorizer   = joblib.load(tfidf_path)
            logger.info("Text model loaded from %s", text_path)
        else:
            logger.warning("Text model not found — text prediction will use keyword fallback")

        self._loaded = True

    # ── Tabular prediction ────────────────────────────────────
    def _predict_tabular(self, student_data: dict) -> tuple[str, float, dict]:
        """
        Returns (risk_label, winning_confidence, full_proba_dict).
        full_proba_dict: {'Low Risk': float, 'Medium Risk': float, 'High Risk': float}
        """
        rel_map = {"single": 0, "in_relationship": 1, "married": 2, "divorced": 3}
        res_map = {"on-campus": 0, "off-campus": 1, "home": 2}

        feature_cols = [
            "stress_level", "depression_score", "anxiety_score", "sleep_quality",
            "physical_activity", "diet_quality", "social_support", "financial_stress",
            "extracurricular_involvement", "semester_credit_load",
            "substance_use", "counseling_service_use", "family_history", "chronic_illness",
            "relationship_status_encoded", "residence_type_encoded",
        ]

        row = {col: student_data.get(col, 0) for col in feature_cols
               if col not in ("relationship_status_encoded", "residence_type_encoded")}
        row["relationship_status_encoded"] = rel_map.get(
            str(student_data.get("relationship_status", "single")).lower(), 0
        )
        row["residence_type_encoded"] = res_map.get(
            str(student_data.get("residence_type", "home")).lower(), 2
        )

        if self.tabular_model is not None:
            try:
                expected = list(self.tabular_model.feature_names_in_)
            except AttributeError:
                expected = list(row.keys())

            df    = pd.DataFrame([{k: row.get(k, 0) for k in expected}])
            proba = self.tabular_model.predict_proba(df)[0]

            # Map class indices to risk labels
            classes = self.tabular_model.classes_  # e.g. [0, 1, 2]
            proba_dict = {RISK_LABELS[int(c)]: float(p) for c, p in zip(classes, proba)}

            pred_idx   = int(np.argmax(proba))
            win_label  = RISK_LABELS[int(classes[pred_idx])]
            win_conf   = float(proba[pred_idx])
            return win_label, win_conf, proba_dict

        # Rule-based fallback
        risk_label, conf = self._rule_based_risk(student_data)
        proba_dict = self._rule_based_proba(risk_label, conf)
        return risk_label, conf, proba_dict

    def _rule_based_risk(self, d: dict) -> tuple[str, float]:
        score = (
            d.get("stress_level", 5) +
            d.get("depression_score", 5) +
            d.get("anxiety_score", 5) +
            (10 - d.get("sleep_quality", 5)) +
            (10 - d.get("social_support", 5))
        ) / 5
        if d.get("substance_use"):   score += 1.5
        if d.get("family_history"):  score += 1.0
        if d.get("chronic_illness"): score += 0.5
        if score >= 7.5: return "High Risk",   0.85
        elif score >= 5: return "Medium Risk", 0.75
        else:            return "Low Risk",    0.80

    @staticmethod
    def _rule_based_proba(risk_label: str, conf: float) -> dict:
        remaining = 1.0 - conf
        if risk_label == "High Risk":
            return {"Low Risk": round(remaining * 0.3, 4),
                    "Medium Risk": round(remaining * 0.7, 4),
                    "High Risk": conf}
        elif risk_label == "Medium Risk":
            return {"Low Risk": round(remaining * 0.5, 4),
                    "Medium Risk": conf,
                    "High Risk": round(remaining * 0.5, 4)}
        else:
            return {"Low Risk": conf,
                    "Medium Risk": round(remaining * 0.7, 4),
                    "High Risk": round(remaining * 0.3, 4)}

    # ── Text prediction ───────────────────────────────────────
    def _predict_text(self, free_text: str) -> tuple[str, float, dict]:
        """
        Returns (risk_label, winning_confidence, full_proba_dict).
        """
        empty_proba = {"Low Risk": 0.6, "Medium Risk": 0.25, "High Risk": 0.15}

        if not free_text or not free_text.strip():
            return "Low Risk", 0.6, empty_proba

        if self.text_model and self.tfidf_vectorizer:
            vec   = self.tfidf_vectorizer.transform([free_text])
            proba = self.text_model.predict_proba(vec)[0]

            classes    = self.text_model.classes_
            proba_dict = {}
            for c, p in zip(classes, proba):
                # classes may be string labels directly from LogisticRegression
                label = c if isinstance(c, str) else RISK_LABELS.get(int(c), str(c))
                proba_dict[label] = float(p)

            # Ensure all three keys exist
            for k in ("Low Risk", "Medium Risk", "High Risk"):
                proba_dict.setdefault(k, 0.0)

            pred_label = max(proba_dict, key=proba_dict.get)
            win_conf   = proba_dict[pred_label]
            return pred_label, win_conf, proba_dict

        # Keyword fallback
        text_lower = free_text.lower()
        high_kw = ["hopeless", "suicidal", "can't go on", "worthless", "no point",
                   "want to die", "end it", "give up"]
        med_kw  = ["stressed", "overwhelmed", "anxious", "depressed", "lonely",
                   "struggling", "worried", "exhausted", "failing"]

        if any(kw in text_lower for kw in high_kw):
            d = {"Low Risk": 0.05, "Medium Risk": 0.13, "High Risk": 0.82}
            return "High Risk", 0.82, d
        elif any(kw in text_lower for kw in med_kw):
            d = {"Low Risk": 0.15, "Medium Risk": 0.70, "High Risk": 0.15}
            return "Medium Risk", 0.70, d
        d = {"Low Risk": 0.65, "Medium Risk": 0.25, "High Risk": 0.10}
        return "Low Risk", 0.65, d

    # ── FIX 2 — Improved risk fusion ─────────────────────────
    @staticmethod
    def _fuse_risks(
        tabular_risk: str, tabular_conf: float,
        text_risk:    str, text_conf:    float,
    ) -> str:
        """
        Weighted vote with HIGH-RISK PROTECTION RULE.

        Rule: If the tabular model (Random Forest on survey data) predicts
        High Risk with confidence >= HIGH_RISK_TABULAR_THRESHOLD (0.65),
        the final risk is always High Risk, regardless of the text model.
        This is the safety-first design choice for a mental health tool.

        Otherwise: weighted = tabular×0.6×conf + text×0.4×conf,
        with a +0.25 upward bias before rounding.
        """
        risk_order    = {"Low Risk": 0, "Medium Risk": 1, "High Risk": 2}
        reverse_order = {v: k for k, v in risk_order.items()}

        # HIGH-RISK PROTECTION RULE
        if tabular_risk == "High Risk" and tabular_conf >= HIGH_RISK_TABULAR_THRESHOLD:
            logger.info(
                "High-risk protection rule applied: tabular=High Risk (%.2f >= %.2f)",
                tabular_conf, HIGH_RISK_TABULAR_THRESHOLD
            )
            return "High Risk"

        weighted = (
            risk_order[tabular_risk] * 0.6 * tabular_conf +
            risk_order[text_risk]   * 0.4 * text_conf
        )
        idx = min(2, round(weighted + 0.25))
        return reverse_order[idx]

    # ── Public interface ──────────────────────────────────────
    def assess_student(self, student_data: dict, free_text: str = "") -> AssessmentResult:
        tabular_risk, tabular_conf, tabular_proba = self._predict_tabular(student_data)
        text_risk,    text_conf,    text_proba    = self._predict_text(free_text)

        final_risk  = self._fuse_risks(tabular_risk, tabular_conf, text_risk, text_conf)
        summary     = self._generate_summary(student_data, final_risk)
        suggestions = self._generate_suggestions(final_risk, student_data)

        return AssessmentResult(
            final_risk          = final_risk,
            tabular_risk        = tabular_risk,
            text_risk           = text_risk,
            tabular_confidence  = round(tabular_conf, 4),
            text_confidence     = round(text_conf, 4),
            tabular_proba       = {k: round(v, 4) for k, v in tabular_proba.items()},
            text_proba          = {k: round(v, 4) for k, v in text_proba.items()},
            summary             = summary,
            suggestions         = suggestions,
            rag_response        = "",
        )

    # ── Summary builder ───────────────────────────────────────
    @staticmethod
    def _generate_summary(data: dict, final_risk: str) -> str:
        stress     = data.get("stress_level",    "N/A")
        anxiety    = data.get("anxiety_score",   "N/A")
        depression = data.get("depression_score","N/A")
        sleep      = data.get("sleep_quality",   "N/A")
        return (
            f"Based on your assessment, you are classified as **{final_risk}**. "
            f"Your reported stress level is {stress}/10, anxiety score {anxiety}/10, "
            f"depression score {depression}/10, and sleep quality {sleep}/10. "
            f"This summary was generated from your questionnaire responses and free-text input."
        )

    @staticmethod
    def _generate_suggestions(risk: str, data: dict) -> list[str]:
        base = [
            "Maintain a regular sleep schedule of 7–9 hours.",
            "Engage in at least 30 minutes of physical activity daily.",
            "Practice mindfulness or relaxation techniques.",
        ]
        if risk == "High Risk":
            return [
                "**Seek immediate professional counseling support.**",
                "Contact your university's mental health helpline.",
                "Talk to a trusted friend, family member, or mentor today.",
                "Reduce your academic load temporarily if possible.",
            ] + base
        elif risk == "Medium Risk":
            return [
                "Consider booking an appointment with a counselor.",
                "Join a peer support or stress management group.",
                "Limit caffeine and screen time before bed.",
            ] + base
        else:
            return base + [
                "Continue your healthy habits and maintain social connections.",
                "Periodically check in with your mental well-being.",
            ]


# ── Module-level helpers ──────────────────────────────────────
_service = MLService.get_instance()

def load_models() -> None:
    _service.load_models()

def assess_student(student_data: dict, free_text: str = "") -> AssessmentResult:
    return _service.assess_student(student_data, free_text)