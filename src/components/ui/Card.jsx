// components/ui/Card.jsx — glass morphism card
import React from 'react'
import { motion } from 'framer-motion'

export default function Card({ children, className = '', animate = true, ...props }) {
  const Wrapper = animate ? motion.div : 'div'
  const anim = animate
    ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } }
    : {}

  return (
    <Wrapper
      className={`glass rounded-2xl shadow-xl shadow-teal-50 p-6 ${className}`}
      {...anim}
      {...props}
    >
      {children}
    </Wrapper>
  )
}
