// pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, ClipboardList, AlertTriangle, TrendingUp,
  ShieldCheck, LogOut, Calendar,
  RefreshCw, ArrowUp, ArrowDown, Minus,
  UserCheck, Brain,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { adminAPI } from '../services/api'
import Spinner from '../components/ui/Spinner'

// ── Admin auth guard ──────────────────────────────────────────
function useAdminAuth() {
  const navigate = useNavigate()
  const token = localStorage.getItem('serenica_admin_token')
  const role  = localStorage.getItem('serenica_admin_role')
  useEffect(() => {
    if (!token) navigate('/admin/login', { replace: true })
  }, [token, navigate])
  const logout = () => {
    localStorage.removeItem('serenica_admin_token')
    localStorage.removeItem('serenica_admin_role')
    navigate('/admin/login', { replace: true })
  }
  return { token, role, logout }
}

// ── Risk colours ──────────────────────────────────────────────
const RISK = {
  'Low Risk':    { bg: 'bg-teal-500',  light: 'bg-teal-50',  text: 'text-teal-700',  border: 'border-teal-200'  },
  'Medium Risk': { bg: 'bg-amber-400', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'High Risk':   { bg: 'bg-red-500',   light: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200'   },
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconBg, iconColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-3xl font-bold text-slate-800 font-display leading-none">{value ?? '—'}</p>
      <p className="text-sm text-slate-500 mt-1.5 font-body">{label}</p>
    </motion.div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-xs font-body">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-700">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
      <div className="mb-5">
        <h3 className="font-display text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 font-body mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ message = 'No data available yet' }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-300">
      <Brain size={28} />
      <p className="text-sm font-body">{message}</p>
    </div>
  )
}

// ── Risk Distribution ─────────────────────────────────────────
function RiskDistributionChart({ data }) {
  if (!data?.labels?.length) return <EmptyState />
  const total = data.values.reduce((a, b) => a + b, 0) || 1
  const items = data.labels.map((label, i) => ({
    label,
    count: data.values[i],
    pct:   Math.round((data.values[i] / total) * 100),
    ...RISK[label],
  }))
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${item.bg}`} />
              <span className="text-sm font-body font-medium text-slate-700">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-800 font-display">{item.count} students</span>
              <span className={`text-xs font-semibold font-body ${item.text} min-w-[36px] text-right`}>{item.pct}%</span>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${item.bg} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${item.pct}%` }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-400 font-body pt-1">Total assessments: {total}</p>
    </div>
  )
}

// ── Student Growth ────────────────────────────────────────────
function StudentGrowthChart({ data }) {
  if (!data?.labels?.length) return <EmptyState />
  const chartData = data.labels.map((label, i) => ({ week: label, 'New Students': data.values[i] }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="New Students" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Average Scores ────────────────────────────────────────────
function AverageScoresChart({ data }) {
  if (!data?.length) return <EmptyState />
  const chartData = data.map(d => ({
    ...d,
    day: d.date ? d.date.slice(5).replace('-', '/') : d.date,
  }))
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'avg_stress',     label: 'Stress',     color: '#ef4444' },
          { key: 'avg_anxiety',    label: 'Anxiety',    color: '#f59e0b' },
          { key: 'avg_depression', label: 'Depression', color: '#8b5cf6' },
        ].map(s => (
          <div key={s.key} className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-xs font-body font-medium text-slate-600">{s.label}</span>
            <span className="text-xs font-bold text-slate-800 font-display">
              {(data.reduce((a, b) => a + (b[s.key] || 0), 0) / data.length).toFixed(1)}
              <span className="font-normal text-slate-400">/10</span>
            </span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip unit="/10" />} />
          <Line type="monotone" dataKey="avg_stress"     stroke="#ef4444" strokeWidth={2} dot={false} name="Stress" />
          <Line type="monotone" dataKey="avg_anxiety"    stroke="#f59e0b" strokeWidth={2} dot={false} name="Anxiety" />
          <Line type="monotone" dataKey="avg_depression" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Depression" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 font-body mt-2">
        Scale: 1 = very low, 10 = very high · Lower is healthier for all three metrics
      </p>
    </>
  )
}

// ── Students per Course ───────────────────────────────────────
function StudentsPerCourseChart({ data }) {
  if (!data?.labels?.length) return <EmptyState />
  const chartData = data.labels.map((label, i) => ({
    course:   label.length > 18 ? label.slice(0, 16) + '…' : label,
    fullName: label,
    Students: data.values[i],
  }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 36)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontFamily: 'DM Sans', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="course" width={110} tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: '#475569' }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-xs font-body">
                <p className="font-semibold text-slate-700 mb-1">{d.fullName}</p>
                <p className="text-slate-500">Students: <span className="font-bold text-slate-800">{payload[0].value}</span></p>
              </div>
            )
          }}
        />
        <Bar dataKey="Students" fill="#14b8a6" radius={[0, 4, 4, 0]} maxBarSize={22}
          label={{ position: 'right', fontSize: 11, fontFamily: 'DM Sans', fill: '#64748b', formatter: v => v }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function AdminDashboard() {
  const { role, logout } = useAdminAuth()

  const [stats, setStats]                 = useState(null)
  const [riskDist, setRiskDist]           = useState(null)
  const [studentGrowth, setStudentGrowth] = useState(null)
  const [avgScores, setAvgScores]         = useState(null)
  const [perCourse, setPerCourse]         = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [refreshing, setRefreshing]       = useState(false)

  const fetchAll = useCallback(async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      const [sR, rR, gR, aR, cR] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getRiskDistribution(),
        adminAPI.getStudentGrowth(12),
        adminAPI.getAverageScores(30),
        adminAPI.getStudentsPerCourse(),
      ])
      setStats(sR.data)
      setRiskDist(rR.data)
      setStudentGrowth(gR.data)
      setAvgScores(aR.data)
      setPerCourse(cR.data)
    } catch (e) {
      if (e.response?.status === 401) logout()
      else setError('Could not load dashboard. Make sure the backend is running.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <Spinner size="lg" text="Loading admin dashboard..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 font-body" style={{ background: '#f8fafc' }}>

      {/* ── Topbar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-md">
              <ShieldCheck size={17} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-slate-800 text-sm leading-none">Serenica Admin</p>
              <p className="text-xs text-slate-400 font-body capitalize mt-0.5">{role} portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Page heading ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of student mental wellness across the platform.</p>
        </motion.div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* ── Stats grid ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Users}         label="Total students"       value={stats.total_students}    iconBg="bg-teal-50"   iconColor="text-teal-600"   delay={0}    />
            <StatCard icon={ClipboardList} label="Total assessments"    value={stats.total_assessments} iconBg="bg-blue-50"   iconColor="text-blue-500"   delay={0.05} />
            <StatCard icon={Calendar}      label="Assessments today"    value={stats.assessments_today} iconBg="bg-indigo-50" iconColor="text-indigo-500"  delay={0.10} />
            <StatCard icon={UserCheck}     label="Low risk students"    value={stats.low_risk_count}    iconBg="bg-teal-50"   iconColor="text-teal-600"   delay={0.15} />
            <StatCard icon={TrendingUp}    label="Medium risk students" value={stats.medium_risk_count} iconBg="bg-amber-50"  iconColor="text-amber-500"  delay={0.20} />
            <StatCard icon={AlertTriangle} label="High risk students"   value={stats.high_risk_count}   iconBg="bg-red-50"    iconColor="text-red-500"    delay={0.25} />
          </div>
        )}

        {/* ── Charts row 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Risk Distribution"
            subtitle="How many students fall into each risk category (all-time)"
          >
            <RiskDistributionChart data={riskDist} />
          </Section>

          <Section
            title="New Student Registrations"
            subtitle="How many students joined each week over the last 12 weeks"
          >
            <StudentGrowthChart data={studentGrowth} />
          </Section>
        </div>

        {/* ── Charts row 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Average Stress, Anxiety & Depression"
            subtitle="Platform-wide daily averages over the last 30 days (scale 1–10)"
          >
            <AverageScoresChart data={avgScores} />
          </Section>

          <Section
            title="Students by Course"
            subtitle="Which programmes have the most registered students"
          >
            <StudentsPerCourseChart data={perCourse} />
          </Section>
        </div>

        {/* ── How to read ── */}
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <p className="font-display text-sm font-semibold text-teal-800 mb-3">📖 How to read these charts</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-body text-teal-700">
            <p>• <b>Risk Distribution</b> — longer bar = more students at that risk level</p>
            <p>• <b>New Registrations</b> — taller bar = more students joined that week</p>
            <p>• <b>Avg Scores</b> — higher line = higher stress/anxiety/depression across campus</p>
            <p>• <b>Students by Course</b> — longer bar = more students enrolled in that programme</p>
          </div>
        </div>

      </div>
    </div>
  )
}