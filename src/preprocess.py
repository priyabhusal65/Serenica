"""
preprocess.py
-------------
Loads raw student data, cleans it, creates the Risk_Level target column,
encodes categorical features, and saves the processed data ready for training.

Run from ANY directory:
    python preprocess.py
    python src/preprocess.py
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import joblib
import os

# ── Always resolve paths relative to this file's location ────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
# If script is in src/, go up one level to project root
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)

DATA_DIR       = os.path.join(BASE_DIR, "data")
MODELS_DIR     = os.path.join(BASE_DIR, "models")

RAW_PATH       = os.path.join(DATA_DIR,   "students_mental_health_survey.csv")
PROCESSED_PATH = os.path.join(DATA_DIR,   "processed_data.csv")
ENCODERS_PATH  = os.path.join(MODELS_DIR, "label_encoders.pkl")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR,   exist_ok=True)


def load_data(path):
    df = pd.read_csv(path)
    print(f"[INFO] Loaded data: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def clean_data(df):
    df["CGPA"] = df["CGPA"].fillna(df["CGPA"].median())
    for col in ["Substance_Use", "Counseling_Service_Use"]:
        df[col] = df[col].fillna(df[col].mode()[0])
    print("[INFO] Missing values filled.")
    return df


def create_risk_label(df):
    score = pd.Series(0, index=df.index)

    score += df["Stress_Level"]
    score += df["Depression_Score"]
    score += df["Anxiety_Score"]
    score += df["Financial_Stress"]

    # ordinal mapping
    score += df["Sleep_Quality"].map({"Good": 0, "Average": 1, "Poor": 2}).fillna(1)
    score += df["Physical_Activity"].map({"High": 0, "Moderate": 1, "Low": 2}).fillna(1)
    score += df["Diet_Quality"].map({"Good": 0, "Average": 1, "Poor": 2}).fillna(1)
    score += df["Social_Support"].map({"High": 0, "Moderate": 1, "Low": 2}).fillna(1)

    # binary flag 
    score += (df["Family_History"] == "Yes").astype(int)
    score += (df["Chronic_Illness"] == "Yes").astype(int)

    # +1 flag if CGPA is below 2.5.
    score += df["Substance_Use"].map({"Never": 0, "Occasionally": 1, "Frequently": 2}).fillna(0)
    score += (df["Counseling_Service_Use"] != "Never").astype(int)

    score += (df["CGPA"] < 2.5).astype(int)

    def label(s):
        if s <= 8:
            return "Low"
        elif s <= 14:
            return "Medium"
        else:
            return "High"

    df["Risk_Score"] = score
    df["Risk_Level"] = score.apply(label)

    print("[INFO] Risk_Level created.")
    print(df["Risk_Level"].value_counts())
    return df


def encode_features(df):
    cat_cols = [
        "Course", "Gender", "Sleep_Quality", "Physical_Activity", "Diet_Quality",
        "Social_Support", "Relationship_Status", "Substance_Use",
        "Counseling_Service_Use", "Family_History", "Chronic_Illness",
        "Extracurricular_Involvement", "Residence_Type"
    ]

    encoders = {}
    for col in cat_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le

    target_le = LabelEncoder()
    df["Risk_Level_Encoded"] = target_le.fit_transform(df["Risk_Level"])
    encoders["Risk_Level"] = target_le

    joblib.dump(encoders, ENCODERS_PATH)
    print(f"[INFO] Encoders saved to {ENCODERS_PATH}")
    return df


def save_processed(df):
    df.to_csv(PROCESSED_PATH, index=False)
    print(f"[INFO] Processed data saved to {PROCESSED_PATH}")


if __name__ == "__main__":
    df = load_data(RAW_PATH)
    df = clean_data(df)
    df = create_risk_label(df)
    df = encode_features(df)
    save_processed(df)
    print("\n[DONE] Preprocessing complete.")