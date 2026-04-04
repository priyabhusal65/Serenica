// components/form/ScaleQuestion.jsx — 1-10 slider question
import React from 'react'
import { motion } from 'framer-motion'

export default function ScaleQuestion({ question, value, onChange }) {
  const { min = 1, max = 10, labels = {} } = question

  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  // Color intensity based on value (calm = teal, high = amber/red)
  const getColor = (step) => {
    if (step <= value) {
      const ratio = (value - min) / (max - min)
      if (ratio < 0.4) return 'bg-teal-500'
      if (ratio < 0.7) return 'bg-yellow-400'
      return 'bg-red-400'
    }
    return 'bg-sage-100'
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-body font-medium text-sage-700">{question.text}</p>

      {/* Scale dots */}
      <div className="flex gap-1.5 items-center justify-between">
        {steps.map((step) => (
          <motion.button
            key={step}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(question.id, step)}
            className={`
              flex-1 h-9 rounded-lg text-sm font-medium font-body transition-all duration-150
              ${step === value ? 'ring-2 ring-teal-400 ring-offset-1 shadow-md' : ''}
              ${getColor(step)}
              ${step <= value ? 'text-white' : 'text-sage-400 hover:bg-sage-200'}
            `}
          >
            {step}
          </motion.button>
        ))}
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-sage-400 font-body">
        <span>{labels[min] || min}</span>
        <span>{labels[max] || max}</span>
      </div>

      {/* Current value indicator */}
      {value && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-teal-600 font-medium font-body"
        >
          You selected: <span className="font-bold">{value}</span> / {max}
        </motion.p>
      )}
    </div>
  )
}
