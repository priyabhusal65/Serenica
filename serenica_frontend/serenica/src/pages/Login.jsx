// pages/Login.jsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Leaf, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

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
      const res = await authAPI.login(form)
      const { access_token, student_id, role } = res.data

      // FIX: pass role + id so AuthContext can fetch the real profile name
      await login(
        { id: student_id, role: role || 'student', email: form.email },
        access_token,
      )
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="blob-bg min-h-screen flex items-center justify-center px-4 py-12">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sage-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-sage-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Leaf size={20} className="text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-teal-800">Serenica</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-900">Welcome back</h1>
          <p className="font-body text-sm text-sage-500 mt-1">Sign in to your wellness account</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl shadow-2xl shadow-teal-50 p-8">
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
              label="Email address"
              type="email"
              name="email"
              placeholder="you@university.edu"
              icon={Mail}
              value={form.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="Your password"
              icon={Lock}
              value={form.password}
              onChange={handleChange}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-sage-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-teal-600 font-medium hover:text-teal-700">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center font-body text-xs text-sage-400 mt-6">
          Your data is private, encrypted, and never shared.
        </p>
      </motion.div>
    </div>
  )
}