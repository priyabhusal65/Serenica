// services/api.js — all backend API calls
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

// ── Student API instance ──────────────────────────────────────
// Uses serenica_token (set on student login/register)
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60 seconds — Groq LLM can be slow
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('serenica_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// FIX: on 401, clear stale student token and redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.response?.status, err.response?.data || err.message)
    if (err.response?.status === 401) {
      localStorage.removeItem('serenica_token')
      localStorage.removeItem('serenica_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Admin API instance ────────────────────────────────────────
// Separate instance so it NEVER touches serenica_token.
// Uses serenica_admin_token (set on admin login).
const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('serenica_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// FIX: on 401, clear stale admin token and redirect to admin login
adminApi.interceptors.response.use(
  res => res,
  err => {
    console.error('[Admin API Error]', err.response?.status, err.response?.data || err.message)
    if (err.response?.status === 401) {
      localStorage.removeItem('serenica_admin_token')
      localStorage.removeItem('serenica_admin_role')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth endpoints ────────────────────────────────────────────
export const authAPI = {
  register:   data => api.post('/auth/register',        data),
  login:      data => api.post('/auth/login',           data),
  adminLogin: data => adminApi.post('/auth/admin/login', data),
}

// ── Student endpoints ─────────────────────────────────────────
export const assessmentAPI = {
  submit:  data => api.post('/assessment/submit', data),
  getById: id   => api.get(`/assessment/${id}`),
}

export const studentAPI = {
  getProfile:    ()   => api.get('/student/profile'),
  updateProfile: data => api.put('/student/profile', data),
  getHistory:    ()   => api.get('/student/history'),
  getProgress:   ()   => api.get('/student/progress-chart'),
}

// ── Admin endpoints — all use adminApi ───────────────────────
export const adminAPI = {
  getStats:             ()           => adminApi.get('/admin/stats'),
  getRiskDistribution:  ()           => adminApi.get('/admin/risk-distribution-chart'),
  getStudentGrowth:     (weeks = 12) => adminApi.get(`/admin/student-growth-chart?weeks=${weeks}`),
  getAverageScores:     (days = 30)  => adminApi.get(`/admin/average-score-chart?days=${days}`),
  getStudentsPerCourse: ()           => adminApi.get('/admin/students-per-course-chart'),
  getHighRiskStudents:  (limit = 50) => adminApi.get(`/admin/high-risk-students?limit=${limit}`),
  getStudentHistory:    id           => adminApi.get(`/admin/student-history/${id}`),
}

export default api