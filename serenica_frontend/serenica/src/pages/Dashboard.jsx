// pages/Dashboard.jsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList, Clock, ArrowRight, Leaf,
  AlertTriangle, CheckCircle, Info,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { studentAPI } from '../services/api'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'

const riskConfig = {
  'Low Risk':    { color: 'bg-teal-100 text-teal-700 border-teal-200',       icon: CheckCircle   },
  'Medium Risk': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Info          },
  'High Risk':   { color: 'bg-red-100 text-red-700 border-red-200',          icon: AlertTriangle },
}

function RiskBadge({ level }) {
  const cfg = riskConfig[level] || riskConfig['Low Risk']
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium font-body px-3 py-1.5 rounded-full border ${cfg.color}`}>
      <Icon size={12} />
      {level}
    </span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [history, setHistory]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const histRes = await studentAPI.getHistory()
        setHistory(histRes.data || [])
      } catch (e) {
        console.error('Dashboard fetch error:', e)
        // FIX: 401 means token is missing or expired.
        // The global interceptor in api.js already redirects to /login,
        // but we guard here too in case it fires before the redirect completes.
        if (e.response?.status === 401) {
          localStorage.removeItem('serenica_token')
          localStorage.removeItem('serenica_user')
          window.location.href = '/login'
          return
        }
        setFetchError('Failed to load your dashboard. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const latestAssessment = history[0]
  const totalAssessments = history.length

  const riskCounts = history.reduce((acc, a) => {
    acc[a.final_risk] = (acc[a.final_risk] || 0) + 1
    return acc
  }, {})

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" text="Loading your dashboard..." />
      </div>
    )
  }

  return (
    <div className="blob-bg min-h-screen pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="font-body text-sage-500 text-sm mb-1">{greeting} 👋</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-teal-900">
            {user?.name || 'Welcome back'}
          </h1>
          <p className="font-body text-sage-600 mt-2">Here's your mental wellness overview.</p>
        </motion.div>

        {/* Error banner — only shown for non-401 errors */}
        {fetchError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            {fetchError}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Assessments', value: totalAssessments,                     icon: '📋' },
            { label: 'Latest Risk',        value: latestAssessment?.final_risk || '—', icon: '🎯', isRisk: true },
            { label: 'Low Risk',           value: riskCounts['Low Risk']    || 0,       icon: '✅' },
            { label: 'High Risk',          value: riskCounts['High Risk']   || 0,       icon: '⚠️' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl p-5 shadow-md"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="font-display text-2xl font-bold text-teal-900">
                {stat.isRisk && stat.value !== '—'
                  ? <RiskBadge level={stat.value} />
                  : stat.value}
              </div>
              <div className="font-body text-xs text-sage-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Start new assessment CTA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Link to="/assessment" className="block group">
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-8 shadow-xl shadow-teal-200 hover:shadow-teal-300 transition-all hover:-translate-y-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <ClipboardList size={24} className="text-white" />
                  </div>
                  <ArrowRight size={20} className="text-teal-200 group-hover:translate-x-1 transition-transform" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">
                  {totalAssessments === 0 ? 'Start your first assessment' : 'Take a new assessment'}
                </h2>
                <p className="font-body text-teal-100 text-sm leading-relaxed">
                  {totalAssessments === 0
                    ? 'Complete your first 5-section mental health assessment to receive personalised insights and AI-powered guidance.'
                    : 'Regular check-ins help track your progress and catch changes in your mental wellbeing early.'}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 bg-white/20 text-white text-sm font-body px-4 py-2 rounded-xl">
                  Takes about 5 minutes →
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Wellness tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <div className="flex items-center gap-2 mb-5">
                <Leaf size={16} className="text-teal-500" />
                <h3 className="font-display font-semibold text-teal-800">Wellness tip</h3>
              </div>
              <div className="space-y-4">
                {[
                  { emoji: '😴', tip: 'Aim for 7–9 hours of sleep each night.' },
                  { emoji: '🚶', tip: 'A 20-minute walk can reduce anxiety by 40%.' },
                  { emoji: '🧘', tip: 'Deep breathing for 5 minutes lowers cortisol.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-teal-50/60 rounded-xl">
                    <span className="text-xl">{item.emoji}</span>
                    <p className="font-body text-xs text-sage-600 leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-teal-900">Recent assessments</h2>
              <Link to="/history" className="font-body text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {history.slice(0, 3).map((assessment) => (
                <Card key={assessment.id} animate={false} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                      <Clock size={16} className="text-teal-400" />
                    </div>
                    <div>
                      <p className="font-body text-sm font-medium text-teal-900">
                        {new Date(assessment.created_at).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </p>
                      <p className="font-body text-xs text-sage-400">
                        Stress: {assessment.stress_level}/10 · Anxiety: {assessment.anxiety_score}/10
                      </p>
                    </div>
                  </div>
                  <RiskBadge level={assessment.final_risk} />
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {history.length === 0 && !fetchError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center py-16 glass rounded-2xl"
          >
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="font-display text-xl font-semibold text-teal-800 mb-2">No assessments yet</h3>
            <p className="font-body text-sm text-sage-500 mb-6 max-w-sm mx-auto">
              Take your first assessment to start tracking your mental wellness journey.
            </p>
            <Link
              to="/assessment"
              className="inline-flex items-center gap-2 bg-teal-600 text-white font-body text-sm font-medium px-6 py-3 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-200"
            >
              Start now <ArrowRight size={16} />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}