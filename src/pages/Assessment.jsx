// pages/Assessment.jsx — multi-section assessment with proper error handling
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Send, AlertCircle, Info } from 'lucide-react'
import { SECTIONS } from '../services/questions'
import { assessmentAPI } from '../services/api'
import ProgressBar from '../components/form/ProgressBar'
import ScaleQuestion from '../components/form/ScaleQuestion'
import { RadioQuestion, YesNoQuestion, TextareaQuestion } from '../components/form/RadioQuestion'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'

export default function Assessment() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [answers, setAnswers]               = useState({})
  const [currentSection, setCurrentSection] = useState(0)
  const [loading, setLoading]               = useState(false)
  const [submitError, setSubmitError]       = useState('')
  const [errors, setErrors]                 = useState({})
  const [direction, setDirection]           = useState(1)

  const section = SECTIONS[currentSection]
  const isLast  = currentSection === SECTIONS.length - 1

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[questionId]; return n })
    setSubmitError('')
  }

  const validateSection = () => {
    const newErrors = {}
    section.questions.forEach(q => {
      if (q.type === 'textarea') return // optional
      const val = answers[q.id]
      if (val === undefined || val === null || val === '') {
        newErrors[q.id] = 'Please answer this question before continuing.'
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateSection()) return
    setDirection(1)
    setCurrentSection(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setDirection(-1)
    setCurrentSection(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!validateSection()) return
    setLoading(true)
    setSubmitError('')

    const clamp = (val, min, max) => Math.max(min, Math.min(max, Number(val) || min))

    // FIX: free_text must be null (not empty string '') when blank — backend
    // field is Optional[str] with max_length=2000; sending null is cleaner than ''
    // and avoids any edge-case whitespace validation.
    const freeTextRaw = (answers.free_text || '').trim()

    const payload = {
      stress_level:                clamp(answers.stress_level,                1, 10),
      depression_score:            clamp(answers.depression_score,            1, 10),
      anxiety_score:               clamp(answers.anxiety_score,               1, 10),
      sleep_quality:               clamp(answers.sleep_quality,               1, 10),
      physical_activity:           clamp(answers.physical_activity,           1, 10),
      diet_quality:                clamp(answers.diet_quality,                1, 10),
      social_support:              clamp(answers.social_support,              1, 10),
      financial_stress:            clamp(answers.financial_stress,            1, 10),
      extracurricular_involvement: clamp(answers.extracurricular_involvement, 1, 10),
      // semester_credit_load: radio options give 6/12/17/21, all within 1–30
      semester_credit_load:        clamp(answers.semester_credit_load,        1, 30),
      relationship_status:         answers.relationship_status || 'single',
      // FIX: only send residence_type when it has a value; omit rather than send undefined
      ...(answers.residence_type   && { residence_type: answers.residence_type }),
      substance_use:               answers.substance_use          ?? false,
      counseling_service_use:      answers.counseling_service_use ?? false,
      family_history:              answers.family_history         ?? false,
      chronic_illness:             answers.chronic_illness        ?? false,
      // FIX: send null when blank, truncate to backend max_length=2000 as safety net
      free_text: freeTextRaw ? freeTextRaw.slice(0, 2000) : null,
    }

    console.log('Submitting payload:', payload)

    try {
      const res = await assessmentAPI.submit(payload)
      navigate('/results', { state: { result: res.data, answers } })
    } catch (err) {
      console.error('Full error:', err)

      let msg = 'Something went wrong. Please try again.'

      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        msg = 'Cannot reach the server. Make sure your FastAPI backend is running on http://localhost:8000'
      } else if (err.response) {
        const status = err.response.status
        const detail = err.response.data?.detail

        if (status === 401) {
          msg = 'Your session has expired. Please log in again.'
        } else if (status === 422) {
          if (Array.isArray(detail)) {
            const fieldErrors = detail.map(e => `• ${e.loc?.join(' → ')}: ${e.msg}`).join('\n')
            msg = `Validation error — the following fields had issues:\n${fieldErrors}`
          } else {
            msg = `Validation error: ${JSON.stringify(detail)}`
          }
        } else if (status === 500) {
          msg = 'Server error. This may be a Groq API issue or database problem. Check your backend terminal for details.'
        } else {
          msg = typeof detail === 'string' ? detail : `Error ${status}: ${JSON.stringify(detail)}`
        }
      }

      setSubmitError(msg)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  const renderQuestion = (question) => {
    const props = { question, value: answers[question.id], onChange: handleAnswer }
    const qComponent = (() => {
      switch (question.type) {
        case 'scale':    return <ScaleQuestion    {...props} />
        case 'radio':    return <RadioQuestion    {...props} />
        case 'yesno':    return <YesNoQuestion    {...props} />
        case 'textarea': return <TextareaQuestion {...props} />
        default:         return null
      }
    })()

    return (
      <div key={question.id} className="space-y-1.5">
        {question.hint && (
          <div className="flex items-start gap-1.5 text-xs text-sage-400 font-body bg-sage-50 px-3 py-2 rounded-lg">
            <Info size={12} className="mt-0.5 shrink-0 text-teal-400" />
            <span>{question.hint}</span>
          </div>
        )}
        {qComponent}
        {errors[question.id] && (
          <p className="text-xs text-red-500 font-body flex items-center gap-1">
            <AlertCircle size={11} /> {errors[question.id]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="blob-bg min-h-screen pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-teal-900">
            Mental Wellness Assessment
          </h1>
          <p className="font-body text-sm text-sage-500 mt-2">
            Answer honestly — your responses are private, encrypted, and never shared.
          </p>
        </motion.div>

        {/* Global submit error */}
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 font-body">Submission failed</p>
                  <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap font-body">{submitError}</pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <Card animate={false} className="mb-6 py-5">
          <ProgressBar sections={SECTIONS} currentIndex={currentSection} answers={answers} />
        </Card>

        {/* Section card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSection}
            custom={direction}
            variants={{
              enter:  d => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
              center: { opacity: 1, x: 0 },
              exit:   d => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Card>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-7 pb-5 border-b border-sage-100">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-sage-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                  {section.icon}
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-teal-900">{section.title}</h2>
                  <p className="font-body text-sm text-sage-500">{section.subtitle}</p>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-10">
                {section.questions.map(renderQuestion)}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          {currentSection > 0 && (
            <Button variant="secondary" onClick={handleBack} className="flex-1" disabled={loading}>
              <ChevronLeft size={16} /> Previous
            </Button>
          )}
          {isLast ? (
            <Button onClick={handleSubmit} loading={loading} className="flex-1" size="lg">
              <Send size={16} /> Submit Assessment
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1" size="lg">
              Continue <ChevronRight size={16} />
            </Button>
          )}
        </div>

        <p className="text-center font-body text-xs text-sage-400 mt-4">
          Section {currentSection + 1} of {SECTIONS.length} ·{' '}
          {isLast ? 'Last section' : `${SECTIONS.length - currentSection - 1} more to go`}
        </p>
      </div>
    </div>
  )
}