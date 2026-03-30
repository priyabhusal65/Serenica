"""
merge_and_retrain.py
---------------------
Step 1: Merges Suicide_Detection.csv + anxiety_dataset.xlsx into a 3-class dataset
Step 2: Retrains the text classifier with all 3 risk levels

Run from ANY directory:
    python merge_and_retrain.py
    python src/merge_and_retrain.py
"""

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline
from sklearn.utils import resample
import joblib
import os
import numpy as np

# ── Always resolve paths relative to this file's location ────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)

DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

SUICIDE_CSV          = os.path.join(DATA_DIR,   "Suicide_Detection.csv")
ANXIETY_XLSX         = os.path.join(DATA_DIR,   "anxiety_dataset.xlsx")
MERGED_CSV           = os.path.join(DATA_DIR,   "merged_text_dataset.csv")
TEXT_MODEL_PATH      = os.path.join(MODELS_DIR, "text_model.pkl")
TEXT_VECTORIZER_PATH = os.path.join(MODELS_DIR, "text_vectorizer.pkl")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR,   exist_ok=True)

# ── Confidence threshold for High Risk ───────────────────────────────────────
HIGH_RISK_THRESHOLD = 0.45


def load_suicide_data():
    print("[INFO] Loading suicide dataset...")
    df = pd.read_csv(
        SUICIDE_CSV,
        engine="python",
        on_bad_lines="skip",
        encoding="utf-8",
        quoting=3
    )
    print(f"       Columns : {list(df.columns)}")
    print(f"       Shape   : {df.shape}")

    df.columns = df.columns.str.strip().str.lower()
    text_col  = next((c for c in df.columns if "text"  in c), None)
    class_col = next((c for c in df.columns if c in ["class", "label", "target"]), None)

    if not text_col or not class_col:
        raise ValueError(f"Could not find text/class columns. Found: {list(df.columns)}")

    df = df[[text_col, class_col]].rename(columns={text_col: "text", class_col: "raw_label"})
    df = df.dropna(subset=["text"])
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"] != ""]

    def map_label(val):
        v = str(val).lower().strip()
        return "High Risk" if ("suicide" in v and "non" not in v) else "Low Risk"

    df["risk_label"] = df["raw_label"].apply(map_label)
    print(f"\n[INFO] Suicide dataset distribution:")
    print(df["risk_label"].value_counts())
    return df[["text", "risk_label"]]


def load_anxiety_data():
    print("\n[INFO] Loading anxiety dataset...")
    df = pd.read_excel(ANXIETY_XLSX)
    df.columns = df.columns.str.strip().str.lower()
    df = df.dropna(subset=["text"])
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"] != ""]

    def map_label(val):
        try:
            v = float(val)
            if v == 1.0:   return "Medium Risk"
            elif v == 0.0: return "Low Risk"
        except:
            pass
        return None

    df["risk_label"] = df["label"].apply(map_label)
    df = df.dropna(subset=["risk_label"])

    print(f"[INFO] Anxiety dataset distribution:")
    print(df["risk_label"].value_counts())
    return df[["text", "risk_label"]]


def get_synthetic_low_risk():
    examples = [
        "I feel great today and really motivated to work",
        "Had an amazing time with my friends this weekend",
        "Life is good, feeling happy and calm",
        "Just finished a great workout, feeling energized",
        "Everything is going well, I'm really content",
        "I'm happy and doing well, no complaints",
        "Feeling peaceful and grateful for everything I have",
        "Had a wonderful day, everything went smoothly",
        "I'm in a great mood today, things are looking up",
        "Spent time with family, feeling loved and supported",
        "I aced my exam and I'm really proud of myself",
        "The weather is beautiful and I feel wonderful",
        "Feeling very relaxed after a long vacation",
        "I'm excited about the future and all its possibilities",
        "Today was productive and I feel accomplished",
        "My anxiety has been much better lately, feeling stable",
        "I went for a walk and it really helped my mood",
        "Talked to a friend and felt much better afterward",
        "I've been sleeping well and feeling rested",
        "Things are improving slowly but I feel hopeful",
        "I'm managing my stress better these days",
        "Feeling fine, just a normal day nothing special",
        "I'm okay, just taking things one day at a time",
        "Not perfect but doing alright overall",
        "I had a good meal and watched a movie, feeling fine",
        "Work was okay today, nothing to complain about",
        "I'm doing well considering everything going on",
        "Feeling calm and at peace with where I am in life",
        "I passed my test and treated myself to something nice",
        "Had coffee with a friend and laughed a lot today",
    ]
    return pd.DataFrame({"text": examples, "risk_label": ["Low Risk"] * len(examples)})


def get_synthetic_medium_risk():
    examples = [
        "I feel scared and don't know what to do anymore",
        "I'm really scared and confused about everything",
        "I don't know what to do, everything feels overwhelming",
        "I feel lost and don't know how to move forward",
        "I'm scared about the future and feel stuck",
        "Everything feels too much, I don't know where to turn",
        "I feel like I can't cope but I'm trying to get help",
        "I've been really anxious and scared lately",
        "I don't know what's wrong with me, I feel so lost",
        "I'm overwhelmed and scared but I don't want to give up",
        "I feel hopeless about my situation but not about life",
        "Things feel really hard right now, I'm struggling",
        "I'm having a really difficult time and feel scared",
        "I feel like I'm falling apart but I want to get better",
        "I'm terrified about what's happening in my life",
    ]
    return pd.DataFrame({"text": examples, "risk_label": ["Medium Risk"] * len(examples)})


def get_synthetic_high_risk():
    examples = [
        "I've been crying every day and feel completely hopeless",
        "I cry myself to sleep every night, nothing feels worth it",
        "I feel completely hopeless and see no way out",
        "Every day I wake up and wish I hadn't, I feel so hopeless",
        "I've given up hope, crying is all I can do anymore",
        "I feel worthless and hopeless, nothing will ever get better",
        "I can't stop crying and I don't see the point anymore",
        "I feel empty and hopeless, like there's no future for me",
        "I've been crying for weeks and I feel completely broken",
        "Hopeless, worthless, and exhausted — I can't go on like this",
    ]
    return pd.DataFrame({"text": examples, "risk_label": ["High Risk"] * len(examples)})


def merge_datasets():
    suicide_df       = load_suicide_data()
    anxiety_df       = load_anxiety_data()
    synthetic_low    = get_synthetic_low_risk()
    synthetic_medium = get_synthetic_medium_risk()
    synthetic_high   = get_synthetic_high_risk()

    high_risk   = suicide_df[suicide_df["risk_label"] == "High Risk"]
    medium_risk = anxiety_df[anxiety_df["risk_label"] == "Medium Risk"]
    low_anxiety = anxiety_df[anxiety_df["risk_label"] == "Low Risk"]
    low_suicide = suicide_df[suicide_df["risk_label"] == "Low Risk"]

    TARGET = 2000

    high_risk = high_risk.sample(min(TARGET, len(high_risk)), random_state=42)

    medium_risk = pd.concat([medium_risk, synthetic_medium], ignore_index=True)
    medium_risk = resample(medium_risk, replace=True, n_samples=TARGET, random_state=42)
    print(f"\n[INFO] Medium Risk upsampled to {len(medium_risk)} rows")

    low_from_anxiety = low_anxiety.sample(min(1200, len(low_anxiety)), random_state=42)
    low_from_suicide = low_suicide.sample(min(500,  len(low_suicide)), random_state=42)
    low_risk = pd.concat([low_from_anxiety, low_from_suicide, synthetic_low], ignore_index=True)
    low_risk = resample(low_risk, replace=len(low_risk) < TARGET, n_samples=TARGET, random_state=42)

    high_risk = pd.concat([high_risk, synthetic_high], ignore_index=True)
    high_risk = high_risk.sample(min(TARGET, len(high_risk)), random_state=42)

    merged = pd.concat([high_risk, medium_risk, low_risk], ignore_index=True)
    merged = merged.sample(frac=1, random_state=42).reset_index(drop=True)

    print(f"\n[INFO] Final merged dataset distribution:")
    print(merged["risk_label"].value_counts())
    print(f"[INFO] Total rows: {len(merged)}")

    merged.to_csv(MERGED_CSV, index=False)
    print(f"[INFO] Merged dataset saved to {MERGED_CSV}")
    return merged


def train_model(df):
    print("\n[INFO] Training 3-class text classifier (Logistic Regression)...")

    X = df["text"]
    y = df["risk_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[INFO] Train: {len(X_train)} | Test: {len(X_test)}")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=10000,
            sublinear_tf=True,
            min_df=2,
            strip_accents="unicode",
            analyzer="word"
        )),
        ("clf", LogisticRegression(
            class_weight="balanced",
            max_iter=2000,
            C=0.5,
            random_state=42
        ))
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = (y_pred == y_test).mean() * 100
    print(f"\n[RESULT] Test Accuracy: {acc:.2f}%")
    print("\n[RESULT] Classification Report:")
    print(classification_report(y_test, y_pred))

    joblib.dump(pipeline, TEXT_MODEL_PATH)
    joblib.dump(pipeline.named_steps["tfidf"], TEXT_VECTORIZER_PATH)
    print(f"[INFO] Model saved to {TEXT_MODEL_PATH}")
    print(f"[INFO] Vectorizer saved to {TEXT_VECTORIZER_PATH}")

    return pipeline


def predict_with_threshold(pipeline, text, threshold=HIGH_RISK_THRESHOLD):
    probs     = pipeline.predict_proba([text])[0]
    classes   = pipeline.classes_
    prob_dict = dict(zip(classes, probs))

    high_risk_prob = prob_dict.get("High Risk", 0)

    if high_risk_prob >= threshold:
        label = "High Risk"
    else:
        filtered = {k: v for k, v in prob_dict.items() if k != "High Risk"}
        label = max(filtered, key=filtered.get)

    return label, {c: f"{p*100:.1f}%" for c, p in prob_dict.items()}


def test_predictions(pipeline):
    print("\n[TEST] Sample predictions (with confidence threshold):")
    print("-" * 70)
    tests = [
        ("I want to end my life, nothing matters anymore",           "High Risk"),
        ("I've been feeling really stressed and overwhelmed lately",  "Medium Risk"),
        ("Had a great day today, feeling calm and motivated",         "Low Risk"),
        ("I can't sleep and feel very anxious about everything",      "Medium Risk"),
        ("I've been crying every day and feel completely hopeless",   "High Risk"),
        ("Everything is fine, I'm happy and doing well",             "Low Risk"),
        ("I feel scared and don't know what to do anymore",          "Medium Risk"),
    ]

    all_correct = 0
    for text, expected in tests:
        label, prob_dict = predict_with_threshold(pipeline, text)
        correct = "✓" if label == expected else "✗"
        all_correct += (label == expected)
        print(f"\n  {correct} Text     : '{text[:65]}'")
        print(f"    Predicted : {label:12s}  (expected: {expected})")
        print(f"    Probs     : {prob_dict}")

    print(f"\n[RESULT] Sample accuracy: {all_correct}/{len(tests)} correct")
    print(f"[INFO]   High Risk threshold used: {HIGH_RISK_THRESHOLD}")


if __name__ == "__main__":
    print("=" * 60)
    print("  MERGING DATASETS + RETRAINING TEXT MODEL")
    print("=" * 60)

    merged_df = merge_datasets()
    pipeline  = train_model(merged_df)
    test_predictions(pipeline)

    print("\n[DONE] Text model retrained with 3 classes successfully!")
    print(f"       Model saved to: {TEXT_MODEL_PATH}")
    print(f"\n[NOTE] Use predict_with_threshold() in your app")
    print(f"       for more accurate High Risk detection.")