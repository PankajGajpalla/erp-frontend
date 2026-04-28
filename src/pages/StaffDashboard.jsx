import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { StatCard, LoadingState, Alert } from "../components/UI"
import { getStaffDashboardAPI } from "../api"

export default function StaffDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getStaffDashboardAPI()
      .then(r => setStats(r.data))
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Welcome, {user?.sub} 👋</h2>
          <p className="text-slate-400 text-sm mt-1">Staff Dashboard — ABS Foundation</p>
        </div>

        {loading && <LoadingState />}
        {error && <Alert type="error" message={error} />}

        {stats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatCard label="Total Students"    value={stats.total_students} color="blue"  icon="🎓" />
              <StatCard label="Total Courses"     value={stats.total_courses}  color="purple" icon="📚" />
              <StatCard label="Today's Attendance"
                value={stats.attendance_today?.pct != null ? stats.attendance_today.pct.toFixed(1) + "%" : "—"}
                color="green" icon="📋" />
            </div>

            {/* Attendance detail */}
            {stats.attendance_today && (
              <div className="card p-5">
                <h3 className="section-title mb-3">Today's Attendance</h3>
                <div className="flex gap-6 text-sm mb-3">
                  <span className="text-emerald-600 font-medium">✅ Present: {stats.attendance_today.present}</span>
                  <span className="text-red-500 font-medium">❌ Absent: {stats.attendance_today.absent}</span>
                </div>
                {(stats.attendance_today.present + stats.attendance_today.absent) > 0 && (
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className="h-3 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${stats.attendance_today.pct}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "🎓 Students",   to: "/staff/students",   color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700" },
                { label: "📋 Attendance", to: "/staff/attendance", color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" },
                { label: "📝 Grades",     to: "/staff/grades",     color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700" },
                { label: "📢 Notices",    to: "/staff/notices",    color: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700" },
              ].map(item => (
                <a key={item.to} href={item.to}
                  className={`border rounded-xl p-4 text-center font-medium transition text-sm ${item.color}`}>
                  {item.label}
                </a>
              ))}
            </div>

            {/* Upcoming Exams & Recent Notices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="section-title mb-4">📅 Upcoming Exams</h3>
                {(stats.upcoming_exams || []).length === 0
                  ? <p className="text-slate-400 text-sm text-center py-4">No upcoming exams</p>
                  : <ul className="space-y-2">
                      {stats.upcoming_exams.map(ex => (
                        <li key={ex.id} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1 w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-slate-500 mr-1">
                              {new Date(ex.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                            — {ex.title} <span className="text-slate-400">({ex.subject})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                }
              </div>

              <div className="card p-5">
                <h3 className="section-title mb-4">📢 Recent Notices</h3>
                {(stats.recent_notices || []).length === 0
                  ? <p className="text-slate-400 text-sm text-center py-4">No recent notices</p>
                  : <ul className="space-y-3">
                      {stats.recent_notices.map(n => (
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
                }
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
