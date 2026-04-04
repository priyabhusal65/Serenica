// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { studentAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [token, setToken]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('serenica_token')
    const savedUser  = localStorage.getItem('serenica_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  /**
   * Call this after a successful /auth/login or /auth/register response.
   * userData should contain at minimum: { id, role }
   * The name/email are fetched from /student/profile so they are always accurate.
   */
  const login = async (userData, accessToken) => {
    // Store token immediately so subsequent requests are authenticated
    localStorage.setItem('serenica_token', accessToken)
    setToken(accessToken)

    let enrichedUser = { ...userData }

    // FIX: for students, fetch real profile so we get the correct name/email
    if (userData.role === 'student' || !userData.role) {
      try {
        // studentAPI reads the token from localStorage (just set above)
        const profileRes = await studentAPI.getProfile()
        enrichedUser = {
          ...enrichedUser,
          name:  profileRes.data.name,
          email: profileRes.data.email,
          age:   profileRes.data.age,
          course: profileRes.data.course,
        }
      } catch {
        // Non-fatal — keep whatever was passed in
      }
    }

    setUser(enrichedUser)
    localStorage.setItem('serenica_user', JSON.stringify(enrichedUser))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('serenica_token')
    localStorage.removeItem('serenica_user')
  }

  // Call this to refresh the stored profile (e.g. after profile update)
  const refreshUser = async () => {
    if (!token) return
    try {
      const profileRes = await studentAPI.getProfile()
      const updated = { ...user, ...profileRes.data }
      setUser(updated)
      localStorage.setItem('serenica_user', JSON.stringify(updated))
    } catch {
      // Ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}