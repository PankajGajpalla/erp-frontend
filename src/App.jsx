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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (user.role !== "admin") return <Navigate to="/dashboard" />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        }/>
        <Route path="/students" element={
          <AdminRoute><Students /></AdminRoute>
        }/>
        <Route path="/attendance" element={
          <ProtectedRoute><Attendance /></ProtectedRoute>
        }/>
        <Route path="/fees" element={
          <ProtectedRoute><Fees /></ProtectedRoute>
        }/>
        <Route path="/teachers" element={
          <ProtectedRoute><Teachers /></ProtectedRoute>
        }/>
        <Route path="/grades" element={
          <ProtectedRoute><Grades /></ProtectedRoute>
        }/>
        <Route path="/timetable" element={
          <ProtectedRoute><Timetable /></ProtectedRoute>
        }/>
        <Route path="/notices" element={
          <ProtectedRoute><Notices /></ProtectedRoute>
        }/>

        <Route path="/import" element={
          <AdminRoute><ImportStudents /></AdminRoute>
        }/>
      </Routes>
    </BrowserRouter>
  )
}