// components/ui/Button.jsx — reusable button with variants
import React from 'react'
import { motion } from 'framer-motion'

export default function Button({
  children,
  variant = 'primary',  // primary | secondary | ghost | danger
  size = 'md',          // sm | md | lg
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-xl transition-all duration-200 focus-visible:ring-2 ring-teal-400 ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 hover:shadow-teal-300 active:scale-[0.98]',
    secondary: 'bg-sage-100 text-sage-800 hover:bg-sage-200 border border-sage-200',
    ghost:     'text-teal-700 hover:bg-teal-50 hover:text-teal-800',
    outline:   'border-2 border-teal-500 text-teal-700 hover:bg-teal-50',
    danger:    'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Processing...
        </>
      ) : children}
    </motion.button>
  )
}
