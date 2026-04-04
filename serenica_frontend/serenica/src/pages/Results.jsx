// pages/Results.jsx — fixed: charts driven by ML model output, not raw answers
import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import {
  CheckCircle, AlertTriangle, Info,
  RefreshCw, Home, MessageSquare, Brain,
} from 'lucide-react'
import Card from '../components/ui/Card'

// ─────────────────────────────────────────────────────────────
// Risk level visual config
// ─────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  'Low Risk': {
    gradient: 'from-teal-50 to-teal-100',
    text:     'text-teal-700',
    border:   'border-teal-200',
    icon:     CheckCircle,
    message:  'Great news! Your mental wellness profile looks positive. Keep up your healthy habits.',
    emoji:    '🌿',
  },
  'Medium Risk': {
    gradient: 'from-yellow-50 to-amber-50',
    text:     'text-yellow-700',
    border:   'border-yellow-200',
    icon:     Info,
    message:  "You're experiencing some challenges. Consider speaking to a counselor or a trusted person.",
    emoji:    '🌤️',
  },
  'High Risk': {
    gradient: 'from-red-50 to-rose-50',
    text:     'text-red-700',
    border:   'border-red-200',
    icon:     AlertTriangle,
    message:  'Your results indicate you may need support. Please reach out to your campus counseling centre.',
    emoji:    '💛',
  },
}



// ─────────────────────────────────────────────────────────────
// FIX 3 — Model Confidence Breakdown card
// Shows ALL three class probabilities from BOTH models, not just
// the single winning confidence score.
//
// The backend currently only returns tabular_confidence and
// text_confidence as single floats (the winning class's prob).
// We render what we have accurately and label it clearly.
// See the backend fix in ml_service.py that adds full proba dicts.
// ─────────────────────────────────────────────────────────────
function ConfidenceBar({ label, pct, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-body">
        <span className="text-sage-600 font-medium">{label}</span>
        <span className="font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-sage-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function ModelConfidenceCard({ result }) {
  // FIX: use the full proba objects returned by the updated backend.
  // Fall back gracefully if only the old single-float fields exist.
  const tabProba  = result.tabular_probabilities  // { 'Low Risk': 0.05, 'Medium Risk': 0.20, 'High Risk': 0.75 }
  const textProba = result.text_probabilities     // { 'Low Risk': 0.65, 'Medium Risk': 0.25, 'High Risk': 0.10 }

  const riskColors = {
    'Low Risk':    '#14b8a6',
    'Medium Risk': '#f59e0b',
    'High Risk':   '#ef4444',
  }
  const LABELS = ['Low Risk', 'Medium Risk', 'High Risk']

  return (
    <Card className="mb-8">
      <div className="flex items-center gap-2 mb-5">
        <Brain size={18} className="text-teal-500" />
        <h2 className="font-display text-lg font-semibold text-teal-900">Model Confidence</h2>
        <span className="ml-auto bg-sage-100 text-sage-600 text-xs font-body px-2 py-1 rounded-full">
          From your trained ML models
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Tabular model */}
        <div className="bg-teal-50/60 rounded-2xl p-4 space-y-3">
          <p className="font-body text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">
            📊 Survey Model (Random Forest)
          </p>
          <p className="font-body text-xs text-sage-500 mb-3">
            Predicted: <span className="font-semibold text-teal-700">{result.tabular_risk}</span>
          </p>
          {tabProba
            ? LABELS.map(lbl => (
                <ConfidenceBar
                  key={lbl} label={lbl}
                  pct={Math.round((tabProba[lbl] || 0) * 100)}
                  color={riskColors[lbl]}
                />
              ))
            : (
              // Fallback: only winning confidence available (old backend)
              <ConfidenceBar
                label={result.tabular_risk}
                pct={Math.round((result.tabular_confidence || 0) * 100)}
                color={riskColors[result.tabular_risk] || '#14b8a6'}
              />
            )
          }
        </div>

        {/* Text model */}
        <div className="bg-sage-50/60 rounded-2xl p-4 space-y-3">
          <p className="font-body text-xs font-semibold text-sage-700 uppercase tracking-wide mb-3">
            💬 Text Model (TF-IDF + Logistic Regression)
          </p>
          <p className="font-body text-xs text-sage-500 mb-3">
            Predicted: <span className="font-semibold text-sage-700">{result.text_risk || '—'}</span>
          </p>
          {textProba
            ? LABELS.map(lbl => (
                <ConfidenceBar
                  key={lbl} label={lbl}
                  pct={Math.round((textProba[lbl] || 0) * 100)}
                  color={riskColors[lbl]}
                />
              ))
            : result.text_confidence > 0
            ? (
              <ConfidenceBar
                label={result.text_risk}
                pct={Math.round((result.text_confidence || 0) * 100)}
                color={riskColors[result.text_risk] || '#14b8a6'}
              />
            )
            : <p className="font-body text-xs text-sage-400 italic">No free text was provided — text model not used.</p>
          }
        </div>
      </div>

      {/* FIX 4 — Fusion explanation so the user understands WHY final risk differs */}
      <div className="mt-4 bg-white/70 border border-sage-100 rounded-xl p-4">
        <p className="font-body text-xs font-semibold text-sage-700 mb-1">How your final risk was calculated</p>
        <p className="font-body text-xs text-sage-500 leading-relaxed">
          The final risk is a weighted combination: your <strong>Survey Model carries 60%</strong> of the decision
          and the <strong>Text Model carries 40%</strong>. When the two models disagree, the system always
          errs toward the <strong>higher (safer) risk level</strong> to ensure no student in distress is
          underclassified.
        </p>
        {result.tabular_risk !== result.final_risk && (
          <p className="font-body text-xs text-amber-600 mt-2 font-medium">
            ⚠️ Note: The Survey Model predicted <strong>{result.tabular_risk}</strong> but your final result
            is <strong>{result.final_risk}</strong> because the Text Model's output shifted the weighted score.
          </p>
        )}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Results page
// ─────────────────────────────────────────────────────────────
export default function Results() {
  const location = useLocation()
  const { result, answers } = location.state || {}

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 blob-bg">
        <p className="font-body text-sage-600">No results found.</p>
        <Link to="/assessment" className="text-teal-600 font-medium font-body hover:underline">
          Take an assessment →
        </Link>
      </div>
    )
  }

  const riskLevel = result.final_risk || 'Low Risk'
  const cfg       = RISK_CONFIG[riskLevel] || RISK_CONFIG['Low Risk']
  const Icon      = cfg.icon

  return (
    <div className="blob-bg min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Risk level hero ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-gradient-to-br ${cfg.gradient} border ${cfg.border} rounded-3xl p-8 sm:p-10 mb-8 text-center shadow-xl`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="text-6xl mb-4"
          >
            {cfg.emoji}
          </motion.div>

          <p className="font-body text-sm text-sage-500 mb-2">
            Your mental health risk level — determined by your trained ML models
          </p>
          <h1 className={`font-display text-4xl sm:text-5xl font-bold ${cfg.text} mb-4`}>
            {riskLevel}
          </h1>
          <p className="font-body text-sage-600 max-w-lg mx-auto leading-relaxed">
            {cfg.message}
          </p>

          {/* Model predictions summary */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <div className="bg-white/60 backdrop-blur rounded-xl px-4 py-2 text-center">
              <div className="font-body text-xs text-sage-400 mb-0.5">📊 Survey Model</div>
              <div className="font-display text-sm font-bold text-teal-700">{result.tabular_risk}</div>
              <div className="font-body text-xs text-sage-400">
                {Math.round((result.tabular_confidence || 0) * 100)}% confidence
              </div>
            </div>
            <div className="text-sage-300 font-body text-lg">+</div>
            <div className="bg-white/60 backdrop-blur rounded-xl px-4 py-2 text-center">
              <div className="font-body text-xs text-sage-400 mb-0.5">💬 Text Model</div>
              <div className="font-display text-sm font-bold text-sage-600">
                {result.text_risk || 'N/A'}
              </div>
              <div className="font-body text-xs text-sage-400">
                {result.text_confidence > 0
                  ? `${Math.round((result.text_confidence || 0) * 100)}% confidence`
                  : 'Not used'}
              </div>
            </div>
            <div className="text-sage-300 font-body text-lg">=</div>
            <div className={`bg-white/80 backdrop-blur rounded-xl px-4 py-2 text-center border-2 ${cfg.border}`}>
              <div className="font-body text-xs text-sage-400 mb-0.5">🎯 Final Risk</div>
              <div className={`font-display text-sm font-bold ${cfg.text}`}>{riskLevel}</div>
              <div className="font-body text-xs text-sage-400">60% survey + 40% text</div>
            </div>
          </div>
        </motion.div>

        {/* ── Model Confidence Card (FIX 3 & 4) ── */}
        <ModelConfidenceCard result={result} />

        {/* ── AI Personalised Response ── */}
        {(result.rag_response || result.summary) && (
          <Card className="mb-8 bg-gradient-to-br from-teal-50/60 to-sage-50/60">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-teal-500" />
              <h2 className="font-display text-lg font-semibold text-teal-900">Personalised Guidance</h2>
              <span className="ml-auto bg-teal-100 text-teal-600 text-xs font-body px-2 py-1 rounded-full">
                AI-powered (Groq LLaMA)
              </span>
            </div>
            <p className="font-body text-sage-700 leading-relaxed whitespace-pre-line text-sm">
              {result.rag_response || result.summary}
            </p>
          </Card>
        )}

        {/* ── Assessment Details ── */}
        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-teal-900 mb-4">Assessment Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            {[
              { label: 'Survey Model Risk',  value: result.tabular_risk  || '—' },
              { label: 'Text Model Risk',    value: result.text_risk     || '—' },
              { label: 'Final Risk',         value: result.final_risk    || '—' },
            ].map((item) => {
              const riskColor =
                item.value === 'High Risk'   ? 'text-red-600 bg-red-50 border-red-100' :
                item.value === 'Medium Risk' ? 'text-yellow-600 bg-yellow-50 border-yellow-100' :
                item.value === 'Low Risk'    ? 'text-teal-600 bg-teal-50 border-teal-100' :
                                               'text-sage-600 bg-sage-50 border-sage-100'
              return (
                <div key={item.label} className={`rounded-xl p-4 border ${riskColor}`}>
                  <div className="font-display text-sm font-bold">{item.value}</div>
                  <div className="font-body text-xs mt-1 opacity-70">{item.label}</div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Action buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-teal-600 text-white font-body font-medium py-3 px-6 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-200"
          >
            <Home size={16} /> Back to Dashboard
          </Link>
          <Link
            to="/assessment"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-sage-100 text-sage-700 font-body font-medium py-3 px-6 rounded-xl hover:bg-sage-200 border border-sage-200 transition-all"
          >
            <RefreshCw size={16} /> Take another assessment
          </Link>
        </div>

        {/* Emergency notice for High Risk */}
        {riskLevel === 'High Risk' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-sm font-semibold text-red-700 mb-1">Please seek support</p>
                <p className="font-body text-sm text-red-600 leading-relaxed">
                  Your results suggest you may benefit from professional support. Please reach out to your
                  university&#39;s counselling centre, or call a mental health helpline.
                  You don&#39;t have to face this alone.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-center font-body text-xs text-sage-400 mt-8">
          ⚠️ This assessment is for informational purposes only and is not a clinical diagnosis.
          Please consult a qualified mental health professional for personalised care.
        </p>
      </div>
    </div>
  )
}