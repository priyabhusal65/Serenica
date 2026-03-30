"""
predict.py
----------
Load saved model and predict risk level for a new student.
Edit the new_student dictionary at the bottom and run this file.

Run from ANY directory:
    python predict.py
    python src/predict.py
"""

import joblib
import numpy as np
import pandas as pd
import os

# ── Always resolve paths relative to this file's location ────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)

MODELS_DIR    = os.path.join(BASE_DIR, "models")
MODEL_PATH    = os.path.join(MODELS_DIR, "risk_model.pkl")
ENCODERS_PATH = os.path.join(MODELS_DIR, "label_encoders.pkl")

FEATURE_COLS = [
    "Age", "Course", "Gender", "CGPA",
    "Stress_Level", "Depression_Score", "Anxiety_Score",
    "Sleep_Quality", "Physical_Activity", "Diet_Quality",
    "Social_Support", "Relationship_Status", "Substance_Use",
    "Counseling_Service_Use", "Family_History", "Chronic_Illness",
    "Financial_Stress", "Extracurricular_Involvement",
    "Semester_Credit_Load", "Residence_Type"
]


def load_model_and_encoders():
    model    = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODERS_PATH)
    return model, encoders


def encode_input(raw_input, encoders):
    cat_cols = [
        "Course", "Gender", "Sleep_Quality", "Physical_Activity", "Diet_Quality",
        "Social_Support", "Relationship_Status", "Substance_Use",
        "Counseling_Service_Use", "Family_History", "Chronic_Illness",
        "Extracurricular_Involvement", "Residence_Type"
    ]
    encoded = {}
    for col, val in raw_input.items():
        if col in cat_cols:
            le = encoders[col]
            if val in le.classes_:
                encoded[col] = le.transform([val])[0]
            else:
                encoded[col] = 0
        else:
            encoded[col] = val
    return encoded


def predict_risk(student_data):
    model, encoders = load_model_and_encoders()
    encoded = encode_input(student_data, encoders)

    X = pd.DataFrame([[encoded[col] for col in FEATURE_COLS]], columns=FEATURE_COLS)
    pred_encoded = model.predict(X)[0]
    pred_proba   = model.predict_proba(X)[0]

    label_le    = encoders["Risk_Level"]
    risk_label  = label_le.inverse_transform([pred_encoded])[0]
    class_names = label_le.classes_

    print("\n" + "=" * 50)
    print("  RISK PREDICTION RESULT")
    print("=" * 50)
    print(f"  Predicted Risk Level : {risk_label}")
    print("\n  Confidence scores:")
    for cls, prob in zip(class_names, pred_proba):
        bar = "█" * int(prob * 30)
        print(f"    {cls:8s}  {bar}  {prob:.1%}")
    print("=" * 50)
    return risk_label


if __name__ == "__main__":
    new_student = {
        "Age": 20,
        "Course": "Engineering",
        "Gender": "Female",
        "CGPA": 2.8,
        "Stress_Level": 4,
        "Depression_Score": 3,
        "Anxiety_Score": 4,
        "Sleep_Quality": "Poor",
        "Physical_Activity": "Low",
        "Diet_Quality": "Average",
        "Social_Support": "Low",
        "Relationship_Status": "Single",
        "Substance_Use": "Occasionally",
        "Counseling_Service_Use": "Never",
        "Family_History": "Yes",
        "Chronic_Illness": "No",
        "Financial_Stress": 4,
        "Extracurricular_Involvement": "Low",
        "Semester_Credit_Load": 24,
        "Residence_Type": "Off-Campus"
    }

    predict_risk(new_student)