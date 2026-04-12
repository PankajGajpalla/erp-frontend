import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"

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

// ─── Info Row ─────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 mt-0.5 font-medium">{value || "—"}</span>
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
    <div className="flex items-center gap-3 text-gray-500 p-8">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      Loading your dashboard...
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
  )

  const p = profile || {}
  const mediumLabel = p.medium ? p.medium.charAt(0).toUpperCase() + p.medium.slice(1) : null

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white flex items-center gap-5">
        {p.photo ? (
          <img src={p.photo} alt={p.name} className="w-20 h-24 rounded-xl object-cover border-2 border-white/40 flex-shrink-0" />
        ) : (
          <div className="w-20 h-24 rounded-xl bg-white/20 flex items-center justify-center text-white text-3xl flex-shrink-0">🎓</div>
        )}
        <div>
          {p.student_code && (
            <span className="inline-block bg-white/20 text-white text-xs font-mono px-2 py-0.5 rounded mb-1">{p.student_code}</span>
          )}
          <h2 className="text-2xl font-bold">{p.name}</h2>
          {p.father_name && <p className="text-blue-100 text-sm">S/o {p.father_name}</p>}
          {p.course && (
            <span className="mt-2 inline-block bg-white/20 text-white text-xs px-3 py-1 rounded-full">{p.course}</span>
          )}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "📋 Attendance", to: "/student/attendance", color: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700" },
          { label: "💰 My Fees",    to: "/student/fees",       color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700" },
          { label: "📝 Grades",     to: "/student/grades",     color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700" },
          { label: "📢 Notices",    to: "/student/notices",    color: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700" },
        ].map((item) => (
          <a key={item.to} href={item.to}
            className={`border rounded-xl p-4 text-center font-medium transition text-sm ${item.color}`}>
            {item.label}
          </a>
        ))}
      </div>

      {/* ── Profile Details ── */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">My Profile</h3>

        {/* Personal */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Information</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <InfoRow label="Full Name"    value={p.name} />
          <InfoRow label="Father Name"  value={p.father_name} />
          <InfoRow label="Date of Birth" value={p.dob} />
          <InfoRow label="Email"        value={p.email} />
          <InfoRow label="Mobile No."   value={p.phone} />
          <InfoRow label="Parent Mobile" value={p.parent_phone} />
        </div>

        {/* Address */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InfoRow label="Permanent Address" value={p.permanent_address} />
          <InfoRow label="Local Address"     value={p.local_address} />
        </div>

        {/* Academic */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Academic Details</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="School / College" value={p.school_college_name} />
          <InfoRow label="Course"           value={p.course} />
          <InfoRow label="Medium"           value={mediumLabel} />
          <InfoRow label="Admission Date"   value={p.admission_date} />
          <InfoRow label="Total Fees"       value={p.fees ? `₹${Number(p.fees).toLocaleString()}` : null} />
        </div>
      </div>

    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────
export default function Dashboard() {
  const { user, isAdmin, isStudent } = useAuth()

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