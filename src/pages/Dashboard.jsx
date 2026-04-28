import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts"

import Sidebar from "../components/Sidebar"
import { StatCard, LoadingState, Alert } from "../components/UI"
import { getDashboardSummaryAPI, getDashboardChartsAPI, getStudentAPI, getOverdueFeesAPI, attendanceSummaryAPI, getAttendanceHeatmapAPI } from "../api"

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
  const [charts, setCharts]       = useState(null)
  const [overdue, setOverdue]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [showAllOverdue, setShowAllOverdue] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, oRes, cRes] = await Promise.all([
          getDashboardSummaryAPI(),
          getOverdueFeesAPI().catch(() => ({ data: [] })),
          getDashboardChartsAPI().catch(() => ({ data: null })),
        ])
        setStats(sRes.data)
        setOverdue(Array.isArray(oRes.data) ? oRes.data : [])
        setCharts(cRes.data)
      } catch (err) {
        setError("Failed to load dashboard")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingState message="Loading dashboard…" />
  if (error) return <Alert type="error" message={error} />

  // Chart data
  const feePieData = [
    { name: "Collected", value: parseFloat(stats.total_paid?.toFixed(2) || 0) },
    { name: "Pending",   value: parseFloat(stats.total_pending?.toFixed(2) || 0) },
  ]
  const courseBarData = (stats.course_stats || [])
    .filter((c) => c.students > 0)
    .sort((a, b) => b.students - a.students)
    .map((c) => ({ name: c.name, Students: c.students }))

  const visibleOverdue = showAllOverdue ? overdue : overdue.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Admin Dashboard</h2>
        <p className="text-slate-400 text-sm">Overview of ABS Foundation</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Students"     value={stats.total_students}              color="blue" />
        <StatCard label="Total Fees"         value={formatCurrency(stats.total_fees)}  color="yellow" />
        <StatCard label="Fees Collected"     value={formatCurrency(stats.total_paid)}  color="green" />
        <StatCard label="Fees Pending"       value={formatCurrency(stats.total_pending)} color="red" />
        <StatCard label="Total Teachers"     value={stats.total_teachers ?? "—"}       color="purple" />
        <StatCard label="Today's Attendance" value={stats.attendance_today?.pct != null ? stats.attendance_today.pct.toFixed(1) + "%" : "—"} color="blue" />
      </div>

      {/* Row 1 — Fee pie + Students by course */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-4">Fee Collection Status</h3>
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
            <p className="text-slate-400 text-center py-10">No fee data yet</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">Students by Course</h3>
          {courseBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, courseBarData.length * 42)}>
              <BarChart data={courseBarData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [v, "Students"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Students" fill="#2563eb" radius={[0, 4, 4, 0]}
                  label={{ position: "right", fontSize: 11, fill: "#6b7280" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-10">No course data yet</p>
          )}
        </div>
      </div>

      {/* Row 2 — Monthly fee trend + Monthly enrollment */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
          <div className="card p-5">
            <h3 className="section-title mb-1">Monthly Fee Collection</h3>
            <p className="text-xs text-slate-400 mb-4">Last 6 months</p>
            {charts.monthly_fees?.some(m => m.collected > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts.monthly_fees} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(v), "Collected"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="collected" stroke="#2563eb" strokeWidth={2}
                    fill="url(#feeGrad)" dot={{ fill: "#2563eb", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-center py-10 text-sm">No payment data yet</p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-1">Student Enrollment Trend</h3>
            <p className="text-xs text-slate-400 mb-4">Last 12 months</p>
            {charts.monthly_enrollment?.some(m => m.students > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.monthly_enrollment} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [v, "New Students"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="students" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-center py-10 text-sm">No enrollment data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Row 3 — Course-wise attendance */}
      {charts?.course_attendance?.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-1">Course-wise Attendance</h3>
          <p className="text-xs text-slate-400 mb-4">Last 30 days · ≥75% is healthy</p>
          <ResponsiveContainer width="100%" height={Math.max(180, charts.course_attendance.length * 44)}>
            <BarChart data={charts.course_attendance} layout="vertical"
              margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="course" width={160}
                tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="attendance" radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 11, fill: "#6b7280", formatter: (v) => `${v}%` }}>
                {charts.course_attendance.map((entry, i) => (
                  <Cell key={i}
                    fill={entry.attendance >= 85 ? "#22c55e" : entry.attendance >= 75 ? "#f59e0b" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-3 text-xs text-slate-400">
            <span><span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1.5" />≥ 85% Excellent</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-yellow-400 mr-1.5" />75–85% Good</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-1.5" />&lt; 75% Low</span>
          </div>
        </div>
      )}

      {/* Upcoming Exams & Recent Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-4">📅 Upcoming Exams (Next 7 Days)</h3>
          {(stats.upcoming_exams || []).length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No upcoming exams</p>
          ) : (
            <ul className="space-y-2">
              {(stats.upcoming_exams || []).map((ex) => {
                const d = new Date(ex.exam_date)
                const dateLabel = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                return (
                  <li key={ex.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    <span>
                      <span className="font-medium text-slate-500 mr-1">{dateLabel}</span>
                      — {ex.title} <span className="text-slate-400">({ex.subject})</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">📢 Recent Notices</h3>
          {(stats.recent_notices || []).length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No recent notices</p>
          ) : (
            <ul className="space-y-3">
              {(stats.recent_notices || []).map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.date}</p>
                  </div>
                  {n.course && (
                    <span className="badge-blue flex-shrink-0">{n.course}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Overdue Fee Reminders */}
      {overdue.length > 0 && (
        <div className="card overflow-hidden">
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
          <div className="overflow-x-auto">
            <table className="tbl min-w-[600px]">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th>Pending</th>
                  <th>Days Late</th>
                </tr>
              </thead>
              <tbody>
                {visibleOverdue.map((f, i) => {
                  const days = daysOverdue(f.due_date)
                  return (
                    <tr key={f.fee_id ?? i}>
                      <td className="font-medium">{f.student_name || "—"}</td>
                      <td className="font-mono text-xs text-slate-500">{f.student_code || f.student_id}</td>
                      <td>{f.description || "—"}</td>
                      <td className="text-red-600 font-medium">{formatDate(f.due_date)}</td>
                      <td className="font-semibold text-red-700">{formatCurrency(f.pending)}</td>
                      <td>
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
        </div>
      )}
    </div>
  )
}

// ─── Info Row ─────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800 mt-0.5 font-medium">{value || "—"}</span>
    </div>
  )
}

// ─── Attendance Heatmap ───────────────────────────────────────
function AttendanceHeatmap({ heatmap }) {
  const days = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    days.push({ key, date: d, status: heatmap[key] || null })
  }

  return (
    <div className="card p-5">
      <h3 className="section-title mb-3">Attendance Heatmap (Last 90 Days)</h3>
      <div className="flex flex-wrap gap-1">
        {days.map(({ key, date, status }) => (
          <div key={key} title={`${key}: ${status || "No record"}`}
            className={`w-4 h-4 rounded-sm ${
              status === "present" ? "bg-emerald-500" :
              status === "absent"  ? "bg-red-400"  :
              "bg-slate-200"
            }`} />
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate-400">
        <span><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-1" />Present</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-red-400 mr-1" />Absent</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-slate-200 mr-1" />No Record</span>
      </div>
    </div>
  )
}

// ─── Student Dashboard ────────────────────────────────────────
function StudentDashboard({ studentId }) {
  const [profile, setProfile] = useState(null)
  const [attSummary, setAttSummary] = useState(null)
  const [heatmap, setHeatmap] = useState({})
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
        const [sRes, attRes, heatRes] = await Promise.all([
          getStudentAPI(studentId),
          attendanceSummaryAPI(studentId).catch(() => ({ data: null })),
          getAttendanceHeatmapAPI(studentId).catch(() => ({ data: null })),
        ])
        setProfile(sRes.data)
        setAttSummary(attRes.data)
        setHeatmap(heatRes.data?.heatmap || {})
      } catch (err) {
        setError("Failed to load your profile")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [studentId])

  if (loading) return <LoadingState message="Loading your dashboard…" />
  if (error) return <Alert type="error" message={error} />

  const p = profile || {}
  const mediumLabel = p.medium ? p.medium.charAt(0).toUpperCase() + p.medium.slice(1) : null

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ── */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white flex items-center gap-4 sm:gap-5">
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
          <div className="flex flex-wrap gap-1 mt-2">
            {p.course && (
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{p.course}</span>
            )}
            {(p.additional_courses || []).map((ac) => (
              <span key={ac.id} className="bg-white/10 border border-white/30 text-white/90 text-xs px-2 py-0.5 rounded-full">
                +{ac.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "📋 Attendance", to: "/student/attendance", color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" },
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

      {/* ── Attendance Summary ── */}
      {attSummary && (
        <div className="card p-5">
          <h3 className="section-title mb-3">Attendance Summary</h3>
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>{attSummary.present ?? 0} Present / {attSummary.absent ?? 0} Absent</span>
            <span className="font-semibold text-slate-800">{attSummary.percentage != null ? attSummary.percentage.toFixed(1) : "—"}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                (attSummary.percentage || 0) >= 75 ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(attSummary.percentage || 0, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Attendance Heatmap ── */}
      {Object.keys(heatmap).length > 0 && <AttendanceHeatmap heatmap={heatmap} />}

      {/* ── Profile Details ── */}
      <div className="card p-6">
        <h3 className="section-title mb-4 pb-2 border-b border-slate-100">My Profile</h3>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Information</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <InfoRow label="Full Name"    value={p.name} />
          <InfoRow label="Father Name"  value={p.father_name} />
          <InfoRow label="Date of Birth" value={p.dob} />
          <InfoRow label="Email"        value={p.email} />
          <InfoRow label="Mobile No."   value={p.phone} />
          <InfoRow label="Parent Mobile" value={p.parent_phone} />
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Address</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InfoRow label="Permanent Address" value={p.permanent_address} />
          <InfoRow label="Local Address"     value={p.local_address} />
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Academic Details</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow label="School / College" value={p.school_college_name} />
          <InfoRow label="Course"           value={p.course} />
          <InfoRow label="Medium"           value={mediumLabel} />
          <InfoRow label="Admission Date"   value={p.admission_date} />
          <InfoRow label="Total Fees"       value={p.fees ? `₹${Number(p.fees).toLocaleString()}` : null} />
          {(p.additional_courses || []).length > 0 && (
            <div className="col-span-2 md:col-span-3">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Additional Courses</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(p.additional_courses || []).map((ac) => (
                  <span key={ac.id} className="badge-blue">{ac.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────
export default function Dashboard() {
  const { user, isAdmin, isStudent } = useAuth()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        {isAdmin
          ? <AdminDashboard />
          : <StudentDashboard studentId={user?.student_id} />
        }
      </main>
    </div>
  )
}
