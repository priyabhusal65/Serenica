// App.jsx — main app with routing and auth protection
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import Landing    from './pages/Landing'
import Login      from './pages/Login'
import Register   from './pages/Register'
import Dashboard  from './pages/Dashboard'
import Assessment from './pages/Assessment'
import Results    from './pages/Results'
import History    from './pages/History'
import Spinner    from './components/ui/Spinner'

// ProtectedRoute — redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center blob-bg">
        <Spinner size="lg" text="Loading Serenica..." />
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

// PublicOnlyRoute — redirects to dashboard if already logged in
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={
          <PublicOnlyRoute><Login /></PublicOnlyRoute>
        } />

        <Route path="/register" element={
          <PublicOnlyRoute><Register /></PublicOnlyRoute>
        } />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        <Route path="/assessment" element={
          <ProtectedRoute><Assessment /></ProtectedRoute>
        } />

        <Route path="/results" element={
          <ProtectedRoute><Results /></ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute><History /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}