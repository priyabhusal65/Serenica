// pages/AdminLogin.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react'
import { authAPI } from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.adminLogin(form)
      const { access_token, role } = res.data

      // Store admin token separately from student token
      localStorage.setItem('serenica_admin_token', access_token)
      localStorage.setItem('serenica_admin_role', role || 'admin')

      navigate('/admin/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid admin credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="blob-bg min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sage-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl shadow-xl shadow-teal-200 mb-5">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-teal-900">Admin Portal</h1>
          <p className="font-body text-sm text-sage-500 mt-1">Serenica — Staff access only</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl shadow-2xl shadow-teal-50 p-8">
          {/* Admin badge */}
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5 mb-6">
            <ShieldCheck size={14} className="text-teal-600 shrink-0" />
            <p className="font-body text-xs text-teal-700">
              This portal is restricted to authorised university staff.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl"
              >
                <AlertCircle size={15} />
                {error}
              </motion.div>
            )}

            <Input
              label="Admin email"
              type="email"
              name="email"
              placeholder="admin@university.edu"
              icon={Mail}
              value={form.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Your admin password"
              icon={Lock}
              value={form.password}
              onChange={handleChange}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              <ShieldCheck size={16} />
              Sign in to Admin Portal
            </Button>
          </form>
        </div>

        <p className="text-center font-body text-xs text-sage-400 mt-6">
          Student? <a href="/login" className="text-teal-600 hover:text-teal-700">Go to student login →</a>
        </p>
      </motion.div>
    </div>
  )
}