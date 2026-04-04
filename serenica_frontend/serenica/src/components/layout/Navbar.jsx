// components/layout/Navbar.jsx
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Menu, X, Leaf, BarChart2, ClipboardList, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const links = user ? [
    { to: '/dashboard',  label: 'Dashboard', icon: BarChart2 },
    { to: '/assessment', label: 'Assessment', icon: ClipboardList },
    { to: '/history',    label: 'My History', icon: User },
  ] : []

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/40 shadow-sm shadow-teal-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-sage-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-teal-800 tracking-tight">
              Serenica
            </span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium font-body transition-all
                    ${isActive(to)
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-sage-600 hover:text-teal-700 hover:bg-teal-50'
                    }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden md:block text-sm text-sage-600 font-body">
                  Hi, <span className="font-medium text-teal-700">{user.name?.split(' ')[0]}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-sage-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-body"
                >
                  <LogOut size={15} />
                  <span className="hidden md:block">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"    className="px-4 py-2 text-sm font-medium text-teal-700 hover:text-teal-900 font-body">Sign in</Link>
                <Link to="/register" className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-md shadow-teal-200 font-body">Get started</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {user && (
              <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && user && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-white/40 bg-white/90 backdrop-blur-xl"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-body transition-all
                    ${isActive(to) ? 'bg-teal-100 text-teal-700' : 'text-sage-700 hover:bg-teal-50'}`}
                >
                  <Icon size={16} /> {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
