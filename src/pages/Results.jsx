// pages/Results.jsx — assessment results with charts and AI response
import React from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { CheckCircle, AlertTriangle, Info, ArrowRight, RefreshCw, Home, MessageSquare } from 'lucide-react'
import Card from '../components/ui/Card'

// Risk level visual config
const RISK_CONFIG = {
  'Low Risk': {
    gradient: 'from-teal-50 to-teal-100',
    badge:    'bg-teal-500',
    text:     'text-teal-700',
    border:   'border-teal-200',
    icon:     CheckCircle,
    message:  'Great news! Your mental wellness profile looks positive. Keep up your healthy habits.',
    emoji:    '🌿',
  },
  'Medium Risk': {
    gradient: 'from-yellow-50 to-amber-50',
    badge:    'bg-yellow-500',
    text:     'text-yellow-700',
    border:   'border-yellow-200',
    icon:     Info,
    message:  "You're experiencing some challenges. Consider speaking to a counselor or a trusted person.",
    emoji:    '🌤️',
  },
  'High Risk': {
    gradient: 'from-red-50 to-rose-50',
    badge:    'bg-red-500',
    text:     'text-red-700',
    border:   'border-red-200',
    icon:     AlertTriangle,
    message:  'Your results indicate you may need support. Please reach out to your campus counseling centre.',
    emoji:    '💛',
  },
}

// Radar chart data builder from answers
function buildRadarData(answers) {
  return [
    { subject: 'Stress',   value: Math.round((11 - (answers.stress_level    || 5)) * 10), fullMark: 100 },
    { subject: 'Sleep',    value: Math.round((answers.sleep_quality          || 5) * 10),  fullMark: 100 },
    { subject: 'Academic', value: Math.round((11 - (answers.depression_score || 5)) * 10), fullMark: 100 },
    { subject: 'Social',   value: Math.round((answers.social_support          || 5) * 10), fullMark: 100 },
    { subject: 'Emotional',value: Math.round((11 - (answers.anxiety_score     || 5)) * 10), fullMark: 100 },
  ]
}

// Bar chart data from answers
function buildBarData(answers) {
  return [
    { name: 'Stress',     value: answers.stress_level      || 5, color: '#f87171' },
    { name: 'Depression', value: answers.depression_score  || 5, color: '#fb923c' },
    { name: 'Anxiety',    value: answers.anxiety_score     || 5, color: '#facc15' },
    { name: 'Sleep',      value: answers.sleep_quality     || 5, color: '#4ade80' },
    { name: 'Social',     value: answers.social_support    || 5, color: '#2dd4bf' },
  ]
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()

  // Get result data passed from Assessment page
  const { result, answers } = location.state || {}

  // If no data (e.g. direct URL access), redirect
  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 blob-bg">
        <p className="font-body text-sage-600">No results found.</p>
        <Link to="/assessment" className="text-teal-600 font-medium font-body hover:underline">Take an assessment →</Link>
      </div>
    )
  }

  const riskLevel  = result.final_risk || 'Low Risk'
  const cfg        = RISK_CONFIG[riskLevel] || RISK_CONFIG['Low Risk']
  const Icon       = cfg.icon
  const radarData  = buildRadarData(answers || {})
  const barData    = buildBarData(answers || {})

  // Parse suggestions from rag_response or summary
  const suggestions = result.rag_response || result.summary || ''

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
          <p className="font-body text-sm text-sage-500 mb-2">Your mental health risk level</p>
          <h1 className={`font-display text-4xl sm:text-5xl font-bold ${cfg.text} mb-4`}>
            {riskLevel}
          </h1>
          <p className="font-body text-sage-600 max-w-lg mx-auto leading-relaxed">
            {cfg.message}
          </p>

          {/* Confidence scores */}
          {result.tabular_confidence && (
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="text-center">
                <div className="font-display text-xl font-bold text-teal-700">
                  {Math.round((result.tabular_confidence || 0) * 100)}%
                </div>
                <div className="font-body text-xs text-sage-400">Questionnaire confidence</div>
              </div>
              {result.text_confidence > 0 && (
                <div className="text-center">
                  <div className="font-display text-xl font-bold text-sage-600">
                    {Math.round((result.text_confidence || 0) * 100)}%
                  </div>
                  <div className="font-body text-xs text-sage-400">Text analysis confidence</div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Charts grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Radar chart */}
          <Card>
            <h2 className="font-display text-lg font-semibold text-teal-900 mb-4">Wellness Profile</h2>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: '#64748b' }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#0d9488"
                  fill="#0d9488"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            <p className="font-body text-xs text-sage-400 text-center mt-2">Higher = healthier in each dimension</p>
          </Card>

          {/* Bar chart */}
          <Card>
            <h2 className="font-display text-lg font-semibold text-teal-900 mb-4">Section Scores</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#64748b' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [`${v}/10`, 'Score']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── Section breakdown ── */}
        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-teal-900 mb-5">Section Breakdown</h2>
          <div className="space-y-4">
            {radarData.map((item) => {
              const pct = item.value
              const barColor = pct >= 70 ? 'bg-teal-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
              return (
                <div key={item.subject}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-body font-medium text-sage-700">{item.subject}</span>
                    <span className="font-body font-semibold text-teal-700">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-sage-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${barColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── AI Personalised Response ── */}
        {suggestions && (
          <Card className="mb-8 bg-gradient-to-br from-teal-50/60 to-sage-50/60">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-teal-500" />
              <h2 className="font-display text-lg font-semibold text-teal-900">Personalised Guidance</h2>
              <span className="ml-auto bg-teal-100 text-teal-600 text-xs font-body px-2 py-1 rounded-full">AI-powered</span>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="font-body text-sage-700 leading-relaxed whitespace-pre-line text-sm">
                {suggestions}
              </p>
            </div>
          </Card>
        )}

        {/* ── ML details ── */}
        <Card className="mb-8">
          <h2 className="font-display text-lg font-semibold text-teal-900 mb-4">Assessment Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            {[
              { label: 'Questionnaire Risk', value: result.tabular_risk || '—' },
              { label: 'Text Analysis Risk',  value: result.text_risk || '—' },
              { label: 'Final Risk',          value: result.final_risk || '—' },
            ].map((item) => (
              <div key={item.label} className="bg-sage-50 rounded-xl p-4">
                <div className="font-display text-sm font-semibold text-teal-800">{item.value}</div>
                <div className="font-body text-xs text-sage-400 mt-1">{item.label}</div>
              </div>
            ))}
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

        {/* Emergency notice for high risk */}
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
                  university's counselling centre, or call a mental health helpline. You don't have to face this alone.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
