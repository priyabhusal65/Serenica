// services/api.js — all backend API calls
import axios from 'axios'

// In dev the Vite proxy (vite.config.js) forwards API paths to localhost:8000,
// eliminating CORS errors. In production set VITE_API_URL to your backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60 seconds — Groq LLM can be slow
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('serenica_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global response error logging
api.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.response?.status, err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export const authAPI = {
  register:   data => api.post('/auth/register',     data),
  login:      data => api.post('/auth/login',        data),
  adminLogin: data => api.post('/auth/admin/login',  data),   // FIX: was missing
}

export const assessmentAPI = {
  submit:  data => api.post('/assessment/submit',   data),
  getById: id   => api.get(`/assessment/${id}`),              // FIX: was missing
}

export const studentAPI = {
  getProfile:    ()   => api.get('/student/profile'),
  updateProfile: data => api.put('/student/profile', data),
  getHistory:    ()   => api.get('/student/history'),
  getProgress:   ()   => api.get('/student/progress-chart'),
}

export const adminAPI = {
  getStats:             ()          => api.get('/admin/stats'),
  getRiskDistribution:  ()          => api.get('/admin/risk-distribution-chart'),
  getStudentGrowth:     (weeks = 12) => api.get(`/admin/student-growth-chart?weeks=${weeks}`),
  getAverageScores:     (days = 30)  => api.get(`/admin/average-score-chart?days=${days}`),
  getStudentsPerCourse: ()          => api.get('/admin/students-per-course-chart'),
  getHighRiskStudents:  (limit = 50) => api.get(`/admin/high-risk-students?limit=${limit}`),
  getStudentHistory:    id          => api.get(`/admin/student-history/${id}`),
}

export default api