import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getStaffDashboardAPI } from "../api"

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 sm:p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-gray-500">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <span className="text-3xl opacity-20">{icon}</span>
      </div>
    </div>
  )
}

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
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.sub} 👋</h2>
          <p className="text-gray-400 text-sm mt-1">Staff Dashboard — ABS Foundation</p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>}

        {stats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatCard label="Total Students" value={stats.total_students} color="border-blue-500" icon="🎓" />
              <StatCard label="Total Courses" value={stats.total_courses} color="border-purple-500" icon="📚" />
              <StatCard label="Today's Attendance"
                value={stats.attendance_today?.pct != null ? stats.attendance_today.pct.toFixed(1) + "%" : "—"}
                color="border-green-500" icon="📋" />
            </div>

            {/* Attendance detail */}
            {stats.attendance_today && (
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Today's Attendance</h3>
                <div className="flex gap-6 text-sm mb-3">
                  <span className="text-green-600 font-medium">✅ Present: {stats.attendance_today.present}</span>
                  <span className="text-red-500 font-medium">❌ Absent: {stats.attendance_today.absent}</span>
                </div>
                {(stats.attendance_today.present + stats.attendance_today.absent) > 0 && (
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="h-3 rounded-full bg-green-500 transition-all"
                      style={{ width: `${stats.attendance_today.pct}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "🎓 Students",   to: "/staff/students",   color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700" },
                { label: "📋 Attendance", to: "/staff/attendance", color: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700" },
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
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📅 Upcoming Exams</h3>
                {(stats.upcoming_exams || []).length === 0
                  ? <p className="text-gray-400 text-sm text-center py-4">No upcoming exams</p>
                  : <ul className="space-y-2">
                      {stats.upcoming_exams.map(ex => (
                        <li key={ex.id} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-gray-500 mr-1">
                              {new Date(ex.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                            — {ex.title} <span className="text-gray-400">({ex.subject})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                }
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📢 Recent Notices</h3>
                {(stats.recent_notices || []).length === 0
                  ? <p className="text-gray-400 text-sm text-center py-4">No recent notices</p>
                  : <ul className="space-y-3">
                      {stats.recent_notices.map(n => (
                        <li key={n.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{n.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{n.date}</p>
                          </div>
                          {n.course && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex-shrink-0">{n.course}</span>
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
