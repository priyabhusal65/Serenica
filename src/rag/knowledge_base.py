"""
src/rag/knowledge_base.py
--------------------------
Builds and persists a ChromaDB vector store with mental health knowledge.
Compatible with ChromaDB >= 1.0.0.

Run once to build the DB:
  python src/rag/knowledge_base.py
"""

import os
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

# ── Paths ─────────────────────────────────────────────────────────────────────
_HERE = os.path.dirname(os.path.abspath(__file__))
BASE_DIR    = os.path.dirname(os.path.dirname(_HERE))   # mental_health/
CHROMA_PATH = os.path.join(BASE_DIR, "data", "chroma_db")

# ── Knowledge documents ───────────────────────────────────────────────────────
DOCUMENTS = [
    # ── HIGH RISK ─────────────────────────────────────────────────────────────
    {
        "id": "hr_001",
        "text": "Crisis support for suicidal thoughts: If you are having thoughts of suicide or self-harm, please reach out immediately. Call or text a crisis line — in Nepal call 1166 (Transcultural Psychosocial Organization). You are not alone and help is available right now.",
        "metadata": {"risk_level": "High Risk", "category": "crisis_support"},
    },
    {
        "id": "hr_002",
        "text": "Emergency mental health resources: If you feel you may harm yourself or others, go to the nearest emergency room or call emergency services. Tell a trusted person — a friend, family member, or lecturer — what you are experiencing. You do not have to face this alone.",
        "metadata": {"risk_level": "High Risk", "category": "emergency"},
    },
    {
        "id": "hr_003",
        "text": "Reaching out when you feel hopeless: Hopelessness is a symptom, not a fact. Depression distorts thinking and makes permanent solutions seem appealing to temporary problems. Please speak to a counsellor or psychiatrist — effective treatments exist and recovery is possible.",
        "metadata": {"risk_level": "High Risk", "category": "hopelessness"},
    },
    {
        "id": "hr_004",
        "text": "Severe depression warning signs: Persistent sadness lasting more than two weeks, loss of interest in all activities, changes in sleep and appetite, difficulty concentrating, feelings of worthlessness, and thoughts of death are serious symptoms. Seek professional help promptly.",
        "metadata": {"risk_level": "High Risk", "category": "depression_severe"},
    },
    {
        "id": "hr_005",
        "text": "Talking to a mental health professional: A psychiatrist or clinical psychologist can assess your situation properly and recommend therapy, medication, or both. Your university counselling centre is a good first step — sessions are usually free and confidential.",
        "metadata": {"risk_level": "High Risk", "category": "professional_help"},
    },
    {
        "id": "hr_006",
        "text": "Safety planning: Work with a counsellor to create a personal safety plan. This includes identifying warning signs, coping strategies you can use alone, people you can contact for support, and professional crisis numbers. Having a written plan reduces risk significantly.",
        "metadata": {"risk_level": "High Risk", "category": "safety_planning"},
    },
    {
        "id": "hr_007",
        "text": "Financial stress and mental health crisis: Severe financial pressure is one of the strongest drivers of mental health crises in students. Contact your university's student welfare office — emergency bursaries, fee deferrals, and food-bank access may be available immediately.",
        "metadata": {"risk_level": "High Risk", "category": "financial_crisis"},
    },

    # ── MEDIUM RISK ───────────────────────────────────────────────────────────
    {
        "id": "mr_001",
        "text": "Managing anxiety: Practice diaphragmatic breathing every day. Breathe in slowly for 4 counts, hold for 4, out for 6. This activates the parasympathetic nervous system and reduces the physical symptoms of anxiety within minutes.",
        "metadata": {"risk_level": "Medium Risk", "category": "anxiety_management"},
    },
    {
        "id": "mr_002",
        "text": "Sleep hygiene tips for mental health: Maintain a consistent sleep schedule even on weekends. Avoid screens for 30 minutes before bed. Keep your room cool and dark. Poor sleep dramatically worsens anxiety and depression — treating sleep is treating mental health.",
        "metadata": {"risk_level": "Medium Risk", "category": "sleep"},
    },
    {
        "id": "mr_003",
        "text": "Mindfulness for stress and anxiety: Mindfulness means paying attention to the present moment without judgement. Start with 5 minutes daily — sit quietly, focus on your breath, and gently return attention when your mind wanders. Apps like Insight Timer offer free guided sessions.",
        "metadata": {"risk_level": "Medium Risk", "category": "mindfulness"},
    },
    {
        "id": "mr_004",
        "text": "Academic stress management: Break large assignments into smaller daily tasks. Use the Pomodoro technique — 25 minutes focused work, 5-minute break. Talk to your academic advisor if your workload feels unmanageable. Most universities allow credit-load adjustments.",
        "metadata": {"risk_level": "Medium Risk", "category": "academic_stress"},
    },
    {
        "id": "mr_005",
        "text": "Building social support at university: Loneliness amplifies stress and depression. Join one club or society that matches an interest. Attend one campus event per week. Even brief positive interactions — chatting with a classmate — measurably improve mood.",
        "metadata": {"risk_level": "Medium Risk", "category": "social_support"},
    },
    {
        "id": "mr_006",
        "text": "Exercise as a mental health tool: 30 minutes of moderate exercise three times per week reduces depression and anxiety symptoms as effectively as medication in mild-to-moderate cases. Walking, cycling, or any activity you enjoy counts — consistency matters more than intensity.",
        "metadata": {"risk_level": "Medium Risk", "category": "exercise"},
    },
    {
        "id": "mr_007",
        "text": "When to seek counselling: You don't need to be in crisis to see a counsellor. If stress, anxiety, or low mood has persisted for more than two weeks and is affecting your studies or relationships, that's a good reason to book an appointment. Early help leads to better outcomes.",
        "metadata": {"risk_level": "Medium Risk", "category": "counselling_prompt"},
    },

    # ── LOW RISK ──────────────────────────────────────────────────────────────
    {
        "id": "lr_001",
        "text": "Maintaining good mental health: Regular physical activity, consistent sleep, balanced nutrition, and meaningful social connection are the four pillars of mental wellness. Protecting these habits during exam season is especially important.",
        "metadata": {"risk_level": "Low Risk", "category": "maintenance"},
    },
    {
        "id": "lr_002",
        "text": "Stress inoculation and resilience: Mild stress can be beneficial — it sharpens focus and builds resilience. Reframe challenges as growth opportunities. Reflect on past difficulties you have overcome to remind yourself of your coping capacity.",
        "metadata": {"risk_level": "Low Risk", "category": "resilience"},
    },
    {
        "id": "lr_003",
        "text": "Journalling for wellbeing: Writing 10 minutes per day about your thoughts and feelings reduces rumination and increases self-awareness. Gratitude journalling — noting three positive things each day — is linked to higher life satisfaction in university students.",
        "metadata": {"risk_level": "Low Risk", "category": "journalling"},
    },
    {
        "id": "lr_004",
        "text": "Healthy study habits: Spaced repetition and active recall are more effective than re-reading. Take regular breaks. Study in well-lit, comfortable spaces. Adequate preparation reduces exam anxiety and improves both performance and mental health.",
        "metadata": {"risk_level": "Low Risk", "category": "study_habits"},
    },
    {
        "id": "lr_005",
        "text": "Nutrition and mental health: A diet rich in whole grains, vegetables, fruits, and lean protein supports brain function and mood stability. Limit caffeine — more than 3 cups of coffee per day is linked to increased anxiety. Stay hydrated.",
        "metadata": {"risk_level": "Low Risk", "category": "nutrition"},
    },
    {
        "id": "lr_006",
        "text": "Digital wellbeing: Excessive social media use is associated with increased anxiety and depression in students. Set screen-time limits, turn off non-essential notifications, and avoid checking your phone within the first 30 minutes of waking.",
        "metadata": {"risk_level": "Low Risk", "category": "digital_wellbeing"},
    },
    {
        "id": "lr_007",
        "text": "Time management for students: Use a weekly planner to schedule study, rest, exercise, and social time. Protect leisure time as seriously as study time — rest is not a reward, it is a requirement for sustained performance and mental health.",
        "metadata": {"risk_level": "Low Risk", "category": "time_management"},
    },
]


def build_knowledge_base():
    print("=" * 60)
    print("  BUILDING MENTAL HEALTH KNOWLEDGE BASE")
    print("=" * 60)

    os.makedirs(CHROMA_PATH, exist_ok=True)

    embed_fn = SentenceTransformerEmbeddingFunction(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    client = chromadb.PersistentClient(path=CHROMA_PATH)

    # Delete existing collection if present
    try:
        client.delete_collection("mental_health_kb")
        print("[INFO] Existing collection 'mental_health_kb' deleted.")
    except Exception:
        pass

    collection = client.create_collection(
        name="mental_health_kb",
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"},
    )

    ids       = [doc["id"]   for doc in DOCUMENTS]
    texts     = [doc["text"] for doc in DOCUMENTS]
    metadatas = [doc["metadata"] for doc in DOCUMENTS]

    collection.add(ids=ids, documents=texts, metadatas=metadatas)

    print(f"[INFO] Knowledge base built successfully.")
    print(f"[INFO] Total documents stored: {collection.count()}")
    print(f"[INFO] ChromaDB path: {CHROMA_PATH}")

    # Quick test
    print("\n[TEST] Running test query: 'I feel anxious and cannot sleep'")
    results = collection.query(query_texts=["I feel anxious and cannot sleep"], n_results=3)
    print("       Top 3 results:")
    for i, (doc, meta) in enumerate(
        zip(results["documents"][0], results["metadatas"][0]), 1
    ):
        print(f"       {i}. [{meta['risk_level']} / {meta['category']}] {doc[:80]}...")

    print("\n[DONE] Knowledge base ready.")


if __name__ == "__main__":
    build_knowledge_base()