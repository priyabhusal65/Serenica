// components/form/RadioQuestion.jsx

import React from 'react'
import { motion } from 'framer-motion'

// Multiple choice question
export function RadioQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-body font-semibold text-sage-800 leading-relaxed">{question.text}</p>
      <div className="flex flex-col gap-2">
        {question.options.map(opt => {
          const isSelected = value === opt.value
          return (
            <motion.button
              key={String(opt.value)}
              type="button"
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onChange(question.id, opt.value)}
              className={`
                w-full px-4 py-3.5 rounded-xl text-sm font-body text-left transition-all border-2 flex items-center gap-3
                ${isSelected
                  ? 'border-teal-400 bg-teal-50 text-teal-800 font-medium shadow-sm shadow-teal-100'
                  : 'border-sage-100 bg-white/60 text-sage-700 hover:border-teal-200 hover:bg-teal-50/40'}
              `}
            >
              <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all
                ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-sage-300'}`}>
                {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
              </span>
              {opt.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Yes / No question with custom labels
export function YesNoQuestion({ question, value, onChange }) {
  const options = [
    { label: question.yesLabel || 'Yes', value: question.trueValue  ?? true  },
    { label: question.noLabel  || 'No',  value: question.falseValue ?? false },
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm font-body font-semibold text-sage-800 leading-relaxed">{question.text}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        {options.map(opt => {
          const isSelected = value === opt.value
          const isYes = opt.label === (question.yesLabel || 'Yes')
          return (
            <motion.button
              key={String(opt.value)}
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(question.id, opt.value)}
              className={`
                flex-1 py-3.5 px-4 rounded-xl text-sm font-body font-medium transition-all border-2 text-left sm:text-center flex items-center gap-3
                ${isSelected
                  ? isYes
                    ? 'border-teal-400 bg-teal-50 text-teal-800'
                    : 'border-sage-400 bg-sage-50 text-sage-800'
                  : 'border-sage-100 bg-white/60 text-sage-600 hover:border-sage-300'}
              `}
            >
              <span className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
                ${isSelected ? (isYes ? 'border-teal-500 bg-teal-500' : 'border-sage-500 bg-sage-500') : 'border-sage-300'}`}>
                {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
              </span>
              {opt.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Textarea question
export function TextareaQuestion({ question, value, onChange }) {
  const max = 600
  return (
    <div className="space-y-3">
      <p className="text-sm font-body font-semibold text-sage-800 leading-relaxed">{question.text}</p>
      <textarea
        value={value || ''}
        onChange={e => onChange(question.id, e.target.value.slice(0, max))}
        placeholder={question.placeholder}
        rows={5}
        className="w-full bg-white/80 border border-sage-200 rounded-xl px-4 py-3 text-sm font-body
                   text-sage-800 placeholder:text-sage-300 resize-none leading-relaxed
                   focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
      />
      <div className="flex justify-between items-center text-xs font-body text-sage-400">
        <span className="text-teal-600 italic">Completely optional — skip if you prefer.</span>
        <span>{(value || '').length} / {max}</span>
      </div>
    </div>
  )
}
