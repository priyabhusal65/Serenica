// pages/Landing.jsx — beautiful hero landing page
import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Leaf, Shield, Brain, Heart, Star, ChevronDown } from 'lucide-react'

// Stagger animation helper
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: 'easeOut' },
})

export default function Landing() {
  return (
    <div className="blob-bg min-h-screen overflow-hidden">

      {/* ── Decorative blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-breathe" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-sage-200/30 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cream-200/20 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '4s' }} />
      </div>

      {/* ── Hero section ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

          {/* Badge */}
          <motion.div {...fadeUp(0)} className="flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium font-body px-4 py-2 rounded-full mb-8">
            <Leaf size={12} />
            University Mental Wellness Platform
          </motion.div>

          {/* Headline */}
          <motion.h1 {...fadeUp(0.1)} className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-teal-900 leading-tight mb-6">
            Your mental wellness{' '}
            <span className="italic text-teal-600">matters</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p {...fadeUp(0.2)} className="font-body text-lg sm:text-xl text-sage-600 leading-relaxed mb-10 max-w-2xl">
            Serenica helps university students understand their mental health through
            intelligent assessments, personalised insights, and compassionate guidance —
            all in a safe, private space.
          </motion.p>

          {/* CTAs */}
          <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-teal-600 text-white font-medium font-body px-8 py-4 rounded-2xl hover:bg-teal-700 shadow-xl shadow-teal-200 hover:shadow-teal-300 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Begin your assessment
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white/70 backdrop-blur text-teal-700 font-medium font-body px-8 py-4 rounded-2xl border border-teal-100 hover:bg-white hover:border-teal-200 transition-all hover:-translate-y-0.5"
            >
              Sign in to your account
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div {...fadeUp(0.4)} className="flex items-center gap-6 mt-12 text-sage-400 text-sm font-body">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-teal-400" />
              <span>Private & secure</span>
            </div>
            <div className="w-px h-4 bg-sage-200" />
            <div className="flex items-center gap-1.5">
              <Brain size={14} className="text-teal-400" />
              <span>AI-powered insights</span>
            </div>
            <div className="w-px h-4 bg-sage-200" />
            <div className="flex items-center gap-1.5">
              <Heart size={14} className="text-teal-400" />
              <span>Compassionate care</span>
            </div>
          </motion.div>
        </div>

        {/* ── Feature cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24"
        >
          {[
            {
              icon: '🧠',
              title: 'Smart Assessment',
              desc: 'Multi-section questionnaire covering stress, sleep, academic pressure, social wellbeing, and emotional health.',
              color: 'from-teal-50 to-teal-100',
            },
            {
              icon: '📊',
              title: 'Instant Results',
              desc: 'Receive your risk profile instantly with section-wise breakdown, scores, and personalised suggestions.',
              color: 'from-sage-50 to-sage-100',
            },
            {
              icon: '💬',
              title: 'AI Guidance',
              desc: 'Our LLM-powered assistant crafts personalised, empathetic responses tailored to your unique situation.',
              color: 'from-cream-50 to-cream-100',
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className={`glass rounded-2xl p-6 bg-gradient-to-br ${card.color} shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-default`}
            >
              <div className="text-3xl mb-4">{card.icon}</div>
              <h3 className="font-display text-lg font-semibold text-teal-900 mb-2">{card.title}</h3>
              <p className="font-body text-sm text-sage-600 leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-teal-900 mb-4">
            How Serenica works
          </h2>
          <p className="font-body text-sage-600 max-w-xl mx-auto">
            Three simple steps to understand your mental wellness.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Create your account', desc: 'Register with your university email and set up your private profile in under a minute.' },
            { step: '02', title: 'Complete the assessment', desc: 'Answer 5 sections of questions about your stress, sleep, academic life, social connections, and emotional state.' },
            { step: '03', title: 'Receive your insights', desc: 'Get your personalised risk profile, section scores, AI-generated guidance, and resource recommendations.' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              <div className="text-5xl font-display font-bold text-teal-100 mb-4 leading-none">{item.step}</div>
              <h3 className="font-display text-xl font-semibold text-teal-800 mb-2">{item.title}</h3>
              <p className="font-body text-sm text-sage-500 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-10 text-center shadow-2xl shadow-teal-200"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Your journey to wellness starts here
          </h2>
          <p className="font-body text-teal-100 mb-8 max-w-xl mx-auto">
            Join thousands of students using Serenica to understand and improve their mental health.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-teal-700 font-medium font-body px-8 py-4 rounded-2xl hover:bg-teal-50 shadow-xl transition-all hover:-translate-y-0.5"
          >
            Get started — it's free
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sage-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Leaf size={16} className="text-teal-500" />
            <span className="font-display text-teal-800 font-semibold">Serenica</span>
          </div>
          <p className="font-body text-xs text-sage-400 text-center">
            Built with care for student wellbeing · Final Year Project
          </p>
        </div>
      </footer>
    </div>
  )
}
