// components/form/ProgressBar.jsx — section progress indicator
import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function ProgressBar({ sections, currentIndex, answers }) {
  // Calculate how many questions in a section are answered
  const isSectionComplete = (section) => {
    return section.questions.every((q) => {
      if (q.type === 'textarea') return true // optional
      const val = answers[q.id]
      return val !== undefined && val !== null && val !== ''
    })
  }

  const totalProgress = Math.round(((currentIndex + 1) / sections.length) * 100)

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div className="flex items-center justify-between text-xs font-body text-sage-500">
        <span>Section {currentIndex + 1} of {sections.length}</span>
        <span className="text-teal-600 font-medium">{totalProgress}% complete</span>
      </div>
      <div className="w-full h-2 bg-sage-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-400 to-sage-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${totalProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Section dots */}
      <div className="flex items-center justify-between gap-1">
        {sections.map((section, idx) => {
          const done      = idx < currentIndex || isSectionComplete(section)
          const active    = idx === currentIndex
          const upcoming  = idx > currentIndex

          return (
            <div key={section.id} className="flex flex-col items-center gap-1 flex-1">
              <motion.div
                animate={{ scale: active ? 1.15 : 1 }}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium font-body
                  transition-all duration-300
                  ${done    ? 'bg-teal-500 text-white shadow-md shadow-teal-200' : ''}
                  ${active  ? 'bg-teal-600 text-white shadow-lg shadow-teal-300 ring-4 ring-teal-100' : ''}
                  ${upcoming? 'bg-sage-100 text-sage-400' : ''}
                `}
              >
                {done && idx < currentIndex ? <Check size={14} /> : section.icon}
              </motion.div>
              <span className={`text-xs font-body hidden sm:block truncate max-w-[60px] text-center
                ${active ? 'text-teal-700 font-medium' : 'text-sage-400'}`}>
                {section.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
