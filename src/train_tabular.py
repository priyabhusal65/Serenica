"""
train_tabular.py
----------------
Trains a Random Forest classifier on the processed student dataset
to predict mental health Risk_Level (Low / Medium / High).
Uses class_weight='balanced' to fix Low risk being ignored.

Run from ANY directory:
    python train_tabular.py
    python src/train_tabular.py
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

# ── Always resolve paths relative to this file's location ────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)

DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

PROCESSED_PATH = os.path.join(DATA_DIR,   "processed_data.csv")
MODEL_PATH     = os.path.join(MODELS_DIR, "risk_model.pkl")
ENCODERS_PATH  = os.path.join(MODELS_DIR, "label_encoders.pkl")

FEATURE_COLS = [
    "Age", "Course", "Gender", "CGPA",
    "Stress_Level", "Depression_Score", "Anxiety_Score",
    "Sleep_Quality", "Physical_Activity", "Diet_Quality",
    "Social_Support", "Relationship_Status", "Substance_Use",
    "Counseling_Service_Use", "Family_History", "Chronic_Illness",
    "Financial_Stress", "Extracurricular_Involvement",
    "Semester_Credit_Load", "Residence_Type"
]
TARGET_COL = "Risk_Level_Encoded"


def load_data():
    df = pd.read_csv(PROCESSED_PATH)
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]
    print(f"[INFO] Dataset: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"[INFO] Target distribution:\n{df['Risk_Level'].value_counts()}\n")
    return X, y


def train_model(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)
    print("[INFO] Model trained.")

    y_pred = model.predict(X_test)
    print(f"[RESULT] Test Accuracy: {accuracy_score(y_test, y_pred):.2%}\n")

    encoders = joblib.load(ENCODERS_PATH)
    class_names = encoders["Risk_Level"].classes_

    print("[RESULT] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=class_names, zero_division=0))

    print("[RESULT] Feature Importances (top 8):")
    importances = pd.Series(model.feature_importances_, index=FEATURE_COLS)
    importances = importances.sort_values(ascending=False)
    for feat, imp in importances.head(8).items():
        bar = "█" * int(imp * 40)
        print(f"  {feat:<35} {bar} {imp:.3f}")

    return model


def save_model(model):
    joblib.dump(model, MODEL_PATH)
    print(f"\n[INFO] Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    X, y = load_data()
    model = train_model(X, y)
    save_model(model)
    print("\n[DONE] Training complete.")