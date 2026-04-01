// pages/Register.jsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, BookOpen, Leaf, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Register() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    age: '', gender: '', course: '', cgpa: '', residence_type: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState(1)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleNext = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // FIX: only send numeric fields when they have a value; omit empty strings
      const payload = {
        name:     form.name,
        email:    form.email,
        password: form.password,
        ...(form.age            && { age:            Number(form.age)  }),
        ...(form.gender         && { gender:         form.gender       }),
        ...(form.course         && { course:         form.course       }),
        ...(form.cgpa           && { cgpa:           Number(form.cgpa) }),
        ...(form.residence_type && { residence_type: form.residence_type }),
      }
      const res = await authAPI.register(payload)
      const { access_token, student_id, role } = res.data

      // FIX: pass role so AuthContext stores it; name is known here so pass it too
      // AuthContext will also fetch the full profile but having name as fallback is fine
      await login(
        { id: student_id, role: role || 'student', name: form.name, email: form.email },
        access_token,
      )
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      // Pydantic 422 errors come as an array
      if (Array.isArray(detail)) {
        setError(detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(' · '))
      } else {
        setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.')
      }
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="blob-bg min-h-screen flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-80 h-80 bg-sage-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-200/20 rounded-full blur-3xl" />
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
          <h1 className="font-display text-2xl font-bold text-teal-900">Create your account</h1>
          <p className="font-body text-sm text-sage-500 mt-1">
            {step === 1 ? 'Step 1 of 2 — Basic info' : 'Step 2 of 2 — Academic details'}
          </p>
        </div>

        {/* Step progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300
              ${s <= step ? 'bg-teal-500' : 'bg-sage-200'}`} />
          ))}
        </div>

        <div className="glass rounded-3xl shadow-2xl shadow-teal-50 p-8">

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl mb-5"
            >
              <AlertCircle size={15} />
              {error}
            </motion.div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-5">
              <Input label="Full name *"     type="text"     name="name"     placeholder="Priya Sharma"       icon={User} value={form.name}     onChange={handleChange} required />
              <Input label="Email address *" type="email"    name="email"    placeholder="you@university.edu" icon={Mail} value={form.email}    onChange={handleChange} required />
              <Input label="Password *"      type="password" name="password" placeholder="Min. 8 characters"  icon={Lock} value={form.password} onChange={handleChange} required />
              <Button type="submit" className="w-full mt-2" size="lg">
                Continue →
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Age" type="number" name="age" placeholder="21" value={form.age} onChange={handleChange} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-sage-800 font-body">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange}
                    className="w-full bg-white/80 border border-sage-200 rounded-xl px-4 py-3 text-sm font-body text-sage-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none">
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
              </div>

              <Input label="Course / Programme" type="text" name="course" placeholder="e.g. Computer Science" icon={BookOpen} value={form.course} onChange={handleChange} />

              <div className="grid grid-cols-2 gap-4">
                <Input label="CGPA" type="number" name="cgpa" placeholder="3.5" value={form.cgpa} onChange={handleChange} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-sage-800 font-body">Residence</label>
                  <select name="residence_type" value={form.residence_type} onChange={handleChange}
                    className="w-full bg-white/80 border border-sage-200 rounded-xl px-4 py-3 text-sm font-body text-sage-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none">
                    <option value="">Select</option>
                    <option value="on-campus">On-campus</option>
                    <option value="off-campus">Off-campus</option>
                    <option value="home">Home</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button type="submit" loading={loading} className="flex-1">Create account</Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-sage-500">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}