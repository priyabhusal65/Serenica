// pages/History.jsx — view all past assessments
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { studentAPI } from '../services/api'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const RISK_COLORS = { 'Low Risk': '#14b8a6', 'Medium Risk': '#f59e0b', 'High Risk': '#ef4444' }
const RISK_ORDER  = { 'Low Risk': 1, 'Medium Risk': 2, 'High Risk': 3 }

function RiskPill({ level }) {
  const colors = {
    'Low Risk':    'bg-teal-100 text-teal-700',
    'Medium Risk': 'bg-yellow-100 text-yellow-700',
    'High Risk':   'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-body font-medium px-3 py-1 rounded-full ${colors[level] || 'bg-sage-100 text-sage-600'}`}>
      {level}
    </span>
  )
}

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentAPI.getHistory()
      .then((res) => setHistory(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Build chart data
  const chartData = [...history].reverse().map((a, i) => ({
    index: i + 1,
    date:  new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Stress:     a.stress_level,
    Anxiety:    a.anxiety_score,
    Depression: a.depression_score,
    Sleep:      a.sleep_quality,
    riskNum:    RISK_ORDER[a.final_risk] || 1,
  }))

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" text="Loading your history..." />
    </div>
  )

  return (
    <div className="blob-bg min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-teal-900 mb-2"
        >
          Your Assessment History
        </motion.h1>
        <p className="font-body text-sage-500 text-sm mb-8">Track your mental wellness journey over time.</p>

        {history.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-body text-sage-500">No assessments completed yet.</p>
          </Card>
        ) : (
          <>
            {/* Progress chart */}
            {chartData.length > 1 && (
              <Card className="mb-8">
                <h2 className="font-display text-lg font-semibold text-teal-900 mb-4">Score Trends Over Time</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12 }} />
                    <Line type="monotone" dataKey="Stress"     stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Anxiety"    stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Depression" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Sleep"      stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Assessment list */}
            <div className="space-y-4">
              {history.map((assessment, idx) => {
                const prev = history[idx + 1]
                const trend = prev
                  ? RISK_ORDER[assessment.final_risk] < RISK_ORDER[prev.final_risk]
                    ? 'improved' : RISK_ORDER[assessment.final_risk] > RISK_ORDER[prev.final_risk]
                    ? 'worsened' : 'same'
                  : null

                return (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card animate={false} className="hover:shadow-xl transition-shadow">
                      <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Clock size={18} className="text-teal-400" />
                          </div>
                          <div>
                            <p className="font-body font-medium text-teal-900 text-sm">
                              {new Date(assessment.created_at).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs font-body text-sage-400">
                              <span>Stress: <b className="text-sage-600">{assessment.stress_level}/10</b></span>
                              <span>Anxiety: <b className="text-sage-600">{assessment.anxiety_score}/10</b></span>
                              <span>Sleep: <b className="text-sage-600">{assessment.sleep_quality}/10</b></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {trend === 'improved' && <span className="flex items-center gap-1 text-xs text-teal-600 font-body"><TrendingDown size={14} />Improving</span>}
                          {trend === 'worsened' && <span className="flex items-center gap-1 text-xs text-red-500 font-body"><TrendingUp size={14} />Needs attention</span>}
                          {trend === 'same'     && <span className="flex items-center gap-1 text-xs text-sage-400 font-body"><Minus size={14} />Stable</span>}
                          <RiskPill level={assessment.final_risk} />
                        </div>
                      </div>

                      {/* Summary snippet */}
                      {assessment.summary && (
                        <div className="mt-4 pt-4 border-t border-sage-100">
                          <p className="font-body text-xs text-sage-500 leading-relaxed line-clamp-2">
                            {assessment.summary}
                          </p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
