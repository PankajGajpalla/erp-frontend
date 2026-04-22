import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
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
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🏠 Dashboard</h2>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading your profile...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
            {error}
          </div>
        ) : teacher ? (
          <div className="space-y-6">

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white flex items-center gap-6">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl flex-shrink-0">
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
                { label: "📋 Mark Attendance", to: "/teacher/attendance", color: "bg-green-50 hover:bg-green-100 border-green-200" },
                { label: "🎓 My Students", to: "/teacher/students", color: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
                { label: "📝 Grades", to: "/teacher/grades", color: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
                { label: "📢 Notices", to: "/teacher/notices", color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200" },
              ].map((item) => (
                <a key={item.to} href={item.to}
                  className={`border rounded-xl p-4 text-center font-medium text-gray-700 transition ${item.color}`}>
                  {item.label}
                </a>
              ))}
            </div>

            {/* Profile Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">My Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-500 mb-1">Full Name</p>
                  <p className="text-xl font-bold text-gray-800">{teacher.name}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
                  <p className="text-sm text-gray-500 mb-1">Specialisation</p>
                  <p className="text-xl font-bold text-gray-800">{teacher.subject || "—"}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-xl font-bold text-gray-800 break-words">{teacher.email}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <p className="text-xl font-bold text-gray-800">{teacher.phone || "—"}</p>
                </div>
              </div>
            </div>

            {/* Assigned Subjects */}
            {teacher.subjects && teacher.subjects.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Assigned Subjects</h3>
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                        <th className="text-left px-5 py-3 font-medium">Subject</th>
                        <th className="text-left px-5 py-3 font-medium">Course</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacher.subjects.map((s) => (
                        <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                          <td className="px-5 py-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              {s.course_name || "—"}
                            </span>
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