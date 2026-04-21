import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"

import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Students from "./pages/Students"
import Attendance from "./pages/Attendance"
import Fees from "./pages/Fees"
import Teachers from "./pages/Teachers"
import Grades from "./pages/Grades"
import Timetable from "./pages/Timetable"
import Notices from "./pages/Notices"
import ImportStudents from "./pages/ImportStudents"
import Courses from "./pages/Courses"
import TeacherDashboard from "./pages/TeacherDashboard"
import TeacherAttendance from "./pages/TeacherAttendance"
import TeacherStudents from "./pages/TeacherStudents"
import TeacherGrades from "./pages/TeacherGrades"
import AdminAccounts from "./pages/AdminAccounts"

// ─── Loading Spinner ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}

// ─── Route Guards ────────────────────────────────────────────

// Any logged in user
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

// Admin only
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === "student") return <Navigate to="/student/dashboard" replace />
  if (user.role === "teacher") return <Navigate to="/teacher" replace />
  if (user.role !== "admin") return <Navigate to="/login" replace />
  return children
}

// ✅ Teacher only route
function TeacherRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== "teacher") return <Navigate to="/dashboard" replace />
  return children
}

// ✅ Redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) {
    if (user.role === "teacher") return <Navigate to="/teacher" replace />
    if (user.role === "student") return <Navigate to="/student/dashboard" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

// ─── 404 Page ────────────────────────────────────────────────
function NotFound() {
  const { user } = useAuth()
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-300 mb-4">404</p>
        <p className="text-xl font-semibold text-gray-700 mb-2">Page not found</p>
        <p className="text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
        <a
          href={
            user?.role === "teacher"
              ? "/teacher"
              : user?.role === "student"
              ? "/student/dashboard"
              : "/dashboard"
          }
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes — redirect to dashboard if logged in */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Admin routes */}
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/students" element={<AdminRoute><Students /></AdminRoute>} />
        <Route path="/attendance" element={<AdminRoute><Attendance /></AdminRoute>} />
        <Route path="/fees" element={<AdminRoute><Fees /></AdminRoute>} />
        <Route path="/teachers" element={<AdminRoute><Teachers /></AdminRoute>} />
        <Route path="/grades" element={<AdminRoute><Grades /></AdminRoute>} />
        <Route path="/timetable" element={<AdminRoute><Timetable /></AdminRoute>} />
        <Route path="/notices" element={<AdminRoute><Notices /></AdminRoute>} />
        <Route path="/import" element={<AdminRoute><ImportStudents /></AdminRoute>} />
        <Route path="/courses" element={<AdminRoute><Courses /></AdminRoute>} />
        <Route path="/admin-accounts" element={<AdminRoute><AdminAccounts /></AdminRoute>} />

        {/* Teacher routes */}
        <Route path="/teacher" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
        <Route path="/teacher/attendance" element={<TeacherRoute><TeacherAttendance /></TeacherRoute>} />
        <Route path="/teacher/students" element={<TeacherRoute><TeacherStudents /></TeacherRoute>} />
        <Route path="/teacher/grades" element={<TeacherRoute><TeacherGrades /></TeacherRoute>} />
        <Route path="/teacher/timetable" element={<TeacherRoute><Timetable /></TeacherRoute>} />
        <Route path="/teacher/notices" element={<TeacherRoute><Notices /></TeacherRoute>} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/student/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/student/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
        <Route path="/student/grades" element={<ProtectedRoute><Grades /></ProtectedRoute>} />
        <Route path="/student/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
        <Route path="/student/notices" element={<ProtectedRoute><Notices /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  )
}