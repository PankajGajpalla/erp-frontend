import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts"

import Sidebar from "../components/Sidebar"
import { getDashboardSummaryAPI, getStudentAPI, getOverdueFeesAPI } from "../api"

// ─── Stats Card ──────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1 break-words">{value}</p>
    </div>
  )
}

const PIE_COLORS = ["#22c55e", "#ef4444", "#3b82f6"]

function formatCurrency(n) {
  return `₹${parseFloat(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}
function formatDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}
function daysOverdue(dueDateStr) {
  if (!dueDateStr) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dueDateStr)) / 86400000))
}

// ─── Admin Dashboard ──────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats]         = useState(null)
  const [overdue, setOverdue]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [showAllOverdue, setShowAllOverdue] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, oRes] = await Promise.all([
          getDashboardSummaryAPI(),
          getOverdueFeesAPI().catch(() => ({ data: [] })),
        ])
        setStats(sRes.data)
        setOverdue(Array.isArray(oRes.data) ? oRes.data : [])
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
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      Loading dashboard...
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
  )

  // Chart data
  const feePieData = [
    { name: "Collected", value: parseFloat(stats.total_paid?.toFixed(2) || 0) },
    { name: "Pending",   value: parseFloat(stats.total_pending?.toFixed(2) || 0) },
  ]
  const courseBarData = (stats.course_stats || []).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    Students: c.students,
  }))

  const visibleOverdue = showAllOverdue ? overdue : overdue.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Admin Dashboard</h2>
        <p className="text-gray-400 text-sm">Overview of your ERP system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard label="Total Students"      value={stats.total_students}              color="border-blue-500" />
        <StatCard label="Attendance Records"  value={stats.total_attendance}            color="border-green-500" />
        <StatCard label="Total Fees"          value={formatCurrency(stats.total_fees)}  color="border-yellow-500" />
        <StatCard label="Fees Collected"      value={formatCurrency(stats.total_paid)}  color="border-green-500" />
        <StatCard label="Fees Pending"        value={formatCurrency(stats.total_pending)} color="border-red-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Fee Collection Pie Chart */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Fee Collection Status</h3>
          {stats.total_fees > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={feePieData} cx="50%" cy="50%" outerRadius={80}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {feePieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-10">No fee data yet</p>
          )}
        </div>

        {/* Course-wise Students Bar Chart */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Students by Course</h3>
          {courseBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={courseBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-10">No course data yet</p>
          )}
        </div>
      </div>

      {/* Feature 5: Overdue Fee Reminders */}
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-red-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <h3 className="font-semibold text-red-700">Overdue Fee Reminders</h3>
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">{overdue.length}</span>
            </div>
            {overdue.length > 5 && (
              <button onClick={() => setShowAllOverdue(v => !v)}
                className="text-sm text-red-600 underline hover:text-red-800">
                {showAllOverdue ? "Show less" : `View all ${overdue.length}`}
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="text-left px-5 py-2 font-medium">Student</th>
                <th className="text-left px-5 py-2 font-medium">ID</th>
                <th className="text-left px-5 py-2 font-medium">Description</th>
                <th className="text-left px-5 py-2 font-medium">Due Date</th>
                <th className="text-left px-5 py-2 font-medium">Pending</th>
                <th className="text-left px-5 py-2 font-medium">Days Late</th>
              </tr>
            </thead>
            <tbody>
              {visibleOverdue.map((f, i) => {
                const days = daysOverdue(f.due_date)
                return (
                  <tr key={f.fee_id ?? i} className="border-t hover:bg-red-50 transition">
                    <td className="px-5 py-2.5 font-medium text-gray-800">{f.student_name || "—"}</td>
                    <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">{f.student_code || f.student_id}</td>
                    <td className="px-5 py-2.5 text-gray-600">{f.description || "—"}</td>
                    <td className="px-5 py-2.5 text-red-600 font-medium">{formatDate(f.due_date)}</td>
                    <td className="px-5 py-2.5 font-semibold text-red-700">{formatCurrency(f.pending)}</td>
                    <td className="px-5 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${days > 30 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        {days}d
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white flex items-center gap-4 sm:gap-5">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      <main className="flex-1 p-4 sm:p-8 bg-gray-50 min-h-screen">
        {isAdmin
          ? <AdminDashboard />
          : <StudentDashboard studentId={user?.student_id} />
        }
      </main>
    </div>
  )
}