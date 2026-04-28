import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { StatCard, LoadingState, Alert } from "../components/UI"
import { getTeacherMeAPI } from "../api"

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await getTeacherMeAPI()
        setTeacher(res.data)
      } catch (err) {
        setError("Failed to load your profile. Please try again.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">🏠 Dashboard</h2>

        {loading ? (
          <LoadingState message="Loading your profile…" />
        ) : error ? (
          <Alert type="error" message={error} />
        ) : teacher ? (
          <div className="space-y-6">

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl flex-shrink-0">
                👨‍🏫
              </div>
              <div>
                <h3 className="text-2xl font-bold">Welcome, {teacher.name}!</h3>
                <p className="text-blue-100 mt-1">{teacher.subject} Teacher</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "📋 Mark Attendance", to: "/teacher/attendance", color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700" },
                { label: "🎓 My Students",     to: "/teacher/students",   color: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700" },
                { label: "📝 Grades",          to: "/teacher/grades",     color: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700" },
                { label: "📢 Notices",         to: "/teacher/notices",    color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700" },
              ].map((item) => (
                <a key={item.to} href={item.to}
                  className={`border rounded-xl p-4 text-center font-medium transition text-sm ${item.color}`}>
                  {item.label}
                </a>
              ))}
            </div>

            {/* Profile Details */}
            <div>
              <h3 className="section-title mb-4">My Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard label="Full Name"       value={teacher.name}            color="blue" />
                <StatCard label="Specialisation"  value={teacher.subject || "—"}  color="purple" />
                <StatCard label="Email"           value={teacher.email}           color="green" />
                <StatCard label="Phone"           value={teacher.phone || "—"}    color="yellow" />
              </div>
            </div>

            {/* Assigned Subjects */}
            {teacher.subjects && teacher.subjects.length > 0 && (
              <div>
                <h3 className="section-title mb-3">Assigned Subjects</h3>
                <div className="card overflow-hidden">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Course</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacher.subjects.map((s) => (
                        <tr key={s.id}>
                          <td className="font-medium">{s.name}</td>
                          <td>
                            <span className="badge-blue">{s.course_name || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        ) : null}
      </main>
    </div>
  )
}
