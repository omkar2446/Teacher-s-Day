import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://teacher-s-day-1.onrender.com/api' : '/api')
const api = axios.create({ baseURL: apiBaseUrl })
api.interceptors.request.use((config) => { const token = localStorage.getItem('teacher_day_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config })
api.interceptors.response.use((response) => response, (error) => { if (error.response?.status === 401) { localStorage.removeItem('teacher_day_token'); if (window.location.pathname.startsWith('/admin')) window.location.assign('/login') } return Promise.reject(error) })
export const getCard = (slug) => api.get(`/cards/${slug}`)
export const recordScan = (slug, timezone) => api.post(`/cards/${slug}/scan`, { timezone })
export const login = (credentials) => api.post('/auth/login', credentials)
export const getTeachers = () => api.get('/teachers')
export const getTeacher = (id) => api.get(`/teachers/${id}`)
export const createTeacher = (data) => api.post('/teachers', data)
export const updateTeacher = (id, data) => api.put(`/teachers/${id}`, data)
export const getQR = (id) => api.get(`/cards/teacher-${String(id).padStart(3, '0')}/qr`)
export const eventICS = () => `${apiBaseUrl}/events/teacher-day.ics`
export const uploadPhoto = (file) => { const form = new FormData(); form.append('photo', file); return api.post('/upload/photo', form) }
export default api
