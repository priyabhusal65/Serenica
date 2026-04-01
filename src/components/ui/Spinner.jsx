// components/ui/Spinner.jsx — loading spinner
import React from 'react'

export default function Spinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin`}
           style={{ borderWidth: '3px' }} />
      {text && <p className="text-sm text-sage-600 font-body animate-pulse">{text}</p>}
    </div>
  )
}
