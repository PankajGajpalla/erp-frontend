import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { Navigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import { getDashboardSummaryAPI, getStudentAPI } from "../api"

// ─── Stats Card ──────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1 break-words">{value}</p>
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboardSummaryAPI()
        setStats(res.data)
      } catch (err) {
        setError("Failed to load dashboard")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center gap-3 text-gray-500">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      Loading dashboard...
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
      {error}
    </div>
  )

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
      <p className="text-gray-400 text-sm mb-6">Overview of your ERP system</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Students"
          value={stats.total_students}
          color="border-blue-500"
        />
        <StatCard
          label="Attendance Records"
          value={stats.total_attendance}
          color="border-green-500"
        />
        <StatCard
          label="Total Fees"
          value={`₹${stats.total_fees.toFixed(2)}`}
          color="border-yellow-500"
        />
        <StatCard
          label="Fees Collected"
          value={`₹${stats.total_paid.toFixed(2)}`}
          color="border-green-500"
        />
        <StatCard
          label="Fees Pending"
          value={`₹${stats.total_pending.toFixed(2)}`}
          color="border-red-500"
        />
      </div>
    </div>
  )
}

// ─── Student Dashboard ────────────────────────────────────────
function StudentDashboard({ studentId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      if (!studentId) {
        setError("Student ID not found. Please login again.")
        setLoading(false)
        return
      }
      try {
        // ✅ Only fetch profile — attendance and fees are on separate pages
        const res = await getStudentAPI(studentId)
        setProfile(res.data)
      } catch (err) {
        setError("Failed to load your profile")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  if (loading) return (
    <div className="flex items-center gap-3 text-gray-500">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      Loading your dashboard...
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
      {error}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome back, {profile?.name}! 👋</h2>
        <p className="text-blue-100 mt-1">
          {profile?.course ? `Course: ${profile.course}` : "No course assigned"}
        </p>
      </div>

      {/* Profile Cards */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Full Name" value={profile.name} color="border-blue-500" />
          <StatCard label="Age" value={profile.age} color="border-purple-500" />
          <StatCard label="Course" value={profile.course || "—"} color="border-yellow-500" />
          <StatCard label="Email" value={profile.email} color="border-pink-500" />
          <StatCard label="Phone" value={profile.phone || "—"} color="border-green-500" />
          <StatCard label="Address" value={profile.address || "—"} color="border-orange-500" />
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "📋 Attendance", to: "/student/attendance", color: "bg-green-50 hover:bg-green-100 border-green-200" },
          { label: "💰 My Fees", to: "/student/fees", color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200" },
          { label: "📝 Grades", to: "/student/grades", color: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
          { label: "📢 Notices", to: "/student/notices", color: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
        ].map((item) => (
          <a
            key={item.to}
            href={item.to}
            className={`border rounded-xl p-4 text-center font-medium text-gray-700 transition ${item.color}`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────
export default function Dashboard() {
  const { user, isAdmin, isStudent } = useAuth()

  // ✅ Role based redirect
  if (isStudent) return <Navigate to="/student/dashboard" replace />

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        {isAdmin
          ? <AdminDashboard />
          : <StudentDashboard studentId={user?.student_id} />
        }
      </main>
    </div>
  )
}