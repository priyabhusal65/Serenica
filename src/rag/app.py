"""
app.py
------
Streamlit UI for the Mental Health Risk Assessment System.
ChromaDB / RAG expander removed. Suggestions section added.

Run from the project root:
    streamlit run src/app.py
"""

import sys, os

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(SRC_DIR) == "rag":
    SRC_DIR = os.path.dirname(SRC_DIR)
sys.path.insert(0, SRC_DIR)

import streamlit as st
from pipeline import assess_student

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Mental Health Risk Assessment",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .risk-high   { background:#fee2e2; border-left:5px solid #ef4444;
                   padding:16px; border-radius:8px; color:#991b1b; font-weight:600; }
    .risk-medium { background:#fef9c3; border-left:5px solid #eab308;
                   padding:16px; border-radius:8px; color:#854d0e; font-weight:600; }
    .risk-low    { background:#dcfce7; border-left:5px solid #22c55e;
                   padding:16px; border-radius:8px; color:#166534; font-weight:600; }
    .response-box { background:#f8fafc; border:1px solid #e2e8f0;
                    border-radius:10px; padding:20px; margin-top:10px;
                    line-height:1.7; }
    .suggestion-card { background:#f0f9ff; border:1px solid #bae6fd;
                       border-radius:8px; padding:12px 16px; margin-bottom:8px;
                       color:#0c4a6e; font-size:0.95rem; }
    .summary-box { background:#f5f3ff; border-left:4px solid #8b5cf6;
                   border-radius:0 8px 8px 0; padding:14px 18px;
                   color:#4c1d95; margin-bottom:12px; }
</style>
""", unsafe_allow_html=True)

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/brain.png", width=60)
    st.title("Mental Health\nRisk Assessment")
    st.caption("AI-powered student wellbeing system")
    st.divider()
    st.info(
        "This tool uses machine learning to assess mental health risk "
        "and provides personalised support resources. It does **not** "
        "replace professional care."
    )
    st.divider()
    st.caption("Built with: Random Forest · Logistic Regression · TF-IDF · Groq LLaMA")

# ── Main layout ───────────────────────────────────────────────────────────────
st.title("🧠 Student Mental Health Assessment")
st.caption("Fill in your profile and describe how you're feeling to get personalised support.")

col_form, col_result = st.columns([1, 1], gap="large")

# ── LEFT: Input Form ──────────────────────────────────────────────────────────
with col_form:
    st.subheader("📋 Student Profile")

    with st.form("assessment_form"):
        c1, c2 = st.columns(2)
        with c1:
            age    = st.number_input("Age", 16, 40, 20)
            gender = st.selectbox("Gender", ["Male", "Female", "Other"])
            cgpa   = st.slider("CGPA", 0.0, 4.0, 2.8, 0.1)
        with c2:
            course = st.selectbox("Course", [
                "Engineering", "Medicine", "Business", "Arts",
                "Science", "Law", "Education", "Other"
            ])
            semester_load = st.number_input("Semester Credit Load", 10, 30, 18)
            residence     = st.selectbox("Residence Type", [
                "On-Campus", "Off-Campus", "With Family"
            ])

        st.divider()
        st.markdown("**Mental Health Indicators**")
        c3, c4 = st.columns(2)
        with c3:
            stress      = st.slider("Stress Level (1–5)",      1, 5, 3)
            depression  = st.slider("Depression Score (1–5)",   1, 5, 2)
            anxiety     = st.slider("Anxiety Score (1–5)",      1, 5, 2)
            financial   = st.slider("Financial Stress (1–5)",   1, 5, 2)
        with c4:
            sleep    = st.selectbox("Sleep Quality",    ["Good", "Average", "Poor"])
            activity = st.selectbox("Physical Activity",["High", "Moderate", "Low"])
            diet     = st.selectbox("Diet Quality",     ["Good", "Average", "Poor"])

        st.divider()
        st.markdown("**Background**")
        c5, c6 = st.columns(2)
        with c5:
            social       = st.selectbox("Social Support",      ["High", "Moderate", "Low"])
            relationship = st.selectbox("Relationship Status", ["Single", "In Relationship", "Married", "Divorced"])
            substance    = st.selectbox("Substance Use",       ["Never", "Occasionally", "Frequently"])
        with c6:
            counseling   = st.selectbox("Counseling Service Use", ["Never", "Occasionally", "Regularly"])
            family_hist  = st.selectbox("Family History (MH)",    ["Yes", "No"])
            chronic      = st.selectbox("Chronic Illness",         ["Yes", "No"])
            extracurr    = st.selectbox("Extracurricular Involvement", ["High", "Moderate", "Low"])

        st.divider()
        st.markdown("**How are you feeling? (in your own words)**")
        user_text = st.text_area(
            "Describe what's on your mind...",
            placeholder="e.g. I've been feeling really anxious lately and can't sleep...",
            height=100
        )

        submitted = st.form_submit_button(
            "🔍 Assess My Risk Level",
            use_container_width=True,
            type="primary"
        )

# ── RIGHT: Results ────────────────────────────────────────────────────────────
with col_result:
    st.subheader("📊 Assessment Results")

    if not submitted:
        st.info("Fill in the form on the left and click **Assess My Risk Level** to see results.")

    elif not user_text.strip():
        st.warning("Please describe how you're feeling in the text box before submitting.")

    else:
        student_data = {
            "Age": age, "Course": course, "Gender": gender, "CGPA": cgpa,
            "Stress_Level": stress, "Depression_Score": depression,
            "Anxiety_Score": anxiety, "Sleep_Quality": sleep,
            "Physical_Activity": activity, "Diet_Quality": diet,
            "Social_Support": social, "Relationship_Status": relationship,
            "Substance_Use": substance, "Counseling_Service_Use": counseling,
            "Family_History": family_hist, "Chronic_Illness": chronic,
            "Financial_Stress": financial,
            "Extracurricular_Involvement": extracurr,
            "Semester_Credit_Load": semester_load,
            "Residence_Type": residence
        }

        with st.spinner("Analysing your profile..."):
            try:
                result = assess_student(student_data, user_text)
            except Exception as e:
                st.error(f"Pipeline error: {e}")
                st.stop()

        # ── Risk badge ──────────────────────────────────────────────────────
        risk = result["final_risk"]
        css_class = {
            "High Risk":   "risk-high",
            "Medium Risk": "risk-medium",
            "Low Risk":    "risk-low"
        }.get(risk, "risk-medium")
        icon = {"High Risk": "🔴", "Medium Risk": "🟡", "Low Risk": "🟢"}.get(risk, "🟡")

        st.markdown(
            f'<div class="{css_class}">{icon} Predicted Risk Level: <strong>{risk}</strong></div>',
            unsafe_allow_html=True
        )

        # ── Summary ─────────────────────────────────────────────────────────
        if result.get("summary"):
            st.markdown("")
            st.markdown(
                f'<div class="summary-box">💜 {result["summary"]}</div>',
                unsafe_allow_html=True
            )

        # ── Model Confidence ────────────────────────────────────────────────
        st.markdown("")
        with st.expander("📈 Model Confidence Breakdown", expanded=False):
            tc1, tc2 = st.columns(2)
            with tc1:
                st.caption("Tabular Model (survey data)")
                for label, pct in result["tabular_confidence"].items():
                    st.progress(int(pct), text=f"{label}: {pct}%")
            with tc2:
                st.caption("Text Model (your message)")
                if result["text_confidence"]:
                    for label, pct in result["text_confidence"].items():
                        st.progress(int(pct), text=f"{label}: {pct}%")
                else:
                    st.caption("No text model output available.")

        # ── Model explanation ───────────────────────────────────────────────
        with st.expander("🔍 What drove this prediction?", expanded=False):
            st.markdown(result.get("model_explanation", "No explanation available."))

        # ── Personalised support message ────────────────────────────────────
        st.markdown("### 💬 Personalised Support")
        rag = result.get("rag_response", "")
        if rag:
            # Render each paragraph separated by a blank line
            paragraphs = [p.strip() for p in rag.split("\n\n") if p.strip()]
            formatted  = "<br><br>".join(paragraphs)
            st.markdown(
                f'<div class="response-box">{formatted}</div>',
                unsafe_allow_html=True
            )

        # ── Suggestions ─────────────────────────────────────────────────────
        suggestions = result.get("suggestions", [])
        if suggestions:
            st.markdown("### ✅ Recommended Actions")
            for s in suggestions:
                st.markdown(
                    f'<div class="suggestion-card">→ {s}</div>',
                    unsafe_allow_html=True
                )

        # ── Crisis resources ────────────────────────────────────────────────
        if result["crisis_resources"]:
            st.error("🚨 If you are in crisis, please reach out immediately:")
            st.markdown("""
| Helpline | Contact |
|----------|---------|
| TPO Nepal | 1166 |
| iCall (India) | 9152987821 |
| Vandrevala Foundation | 1860-2662-345 (24/7) |
| iCall Email | icall@tiss.edu |
| International | findahelpline.com |
""")

        # ── Disclaimer ──────────────────────────────────────────────────────
        st.divider()
        st.caption(
            "⚠️ This assessment is for informational purposes only and is not a "
            "clinical diagnosis. Please consult a qualified mental health professional "
            "for personalised care."
        )