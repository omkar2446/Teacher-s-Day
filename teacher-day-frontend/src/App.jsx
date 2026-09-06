import { Routes, Route, Navigate } from 'react-router-dom'
import PublicCard from './pages/PublicCard'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import TeacherEditor from './pages/TeacherEditor'
import QRPage from './pages/QRPage'
import NewTeacher from './pages/NewTeacher'

export default function App() {
  return <Routes>
    <Route path="/card/:slug" element={<PublicCard />} />
    <Route path="/login" element={<Login />} />
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="/admin/teachers" element={<AdminDashboard />} />
    <Route path="/admin/teachers/new" element={<NewTeacher />} />
    <Route path="/admin/teachers/:id" element={<TeacherEditor />} />
    <Route path="/admin/teachers/:id/qr" element={<QRPage />} />
    <Route path="*" element={<Navigate to="/card/teacher-001" replace />} />
  </Routes>
}
