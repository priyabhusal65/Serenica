// components/ui/Input.jsx — styled form input
import React from 'react'

export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-sage-800 font-body">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <Icon size={16} />
          </div>
        )}
        <input
          className={`
            w-full bg-white/80 border rounded-xl px-4 py-3 text-sm font-body
            text-sage-900 placeholder:text-sage-400
            border-sage-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100
            transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 font-body">{error}</p>
      )}
    </div>
  )
}
