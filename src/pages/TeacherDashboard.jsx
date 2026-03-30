import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { getTeacherMeAPI } from "../api"

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getTeacherMeAPI()
        setTeacher(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🏠 Dashboard</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : teacher ? (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl">
                👨‍🏫
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Welcome, {teacher.name}!
                </h3>
                <p className="text-gray-500 mt-1">
                  {teacher.subject} Teacher
                </p>
              </div>
            </div>

            {/* Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                <p className="text-sm text-gray-500 mb-1">Full Name</p>
                <p className="text-xl font-bold text-gray-800">{teacher.name}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
                <p className="text-sm text-gray-500 mb-1">Subject</p>
                <p className="text-xl font-bold text-gray-800">{teacher.subject}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-xl font-bold text-gray-800">{teacher.email}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="text-xl font-bold text-gray-800">{teacher.phone || "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-500">Failed to load profile.</p>
        )}
      </main>
    </div>
  )
}