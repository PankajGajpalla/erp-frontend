import { useState } from "react"
import Sidebar from "../components/Sidebar"
import { getStudentsByCourseAPI } from "../api"

export default function TeacherStudents() {
  const [course, setCourse] = useState("")
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSearch(e) {
    e.preventDefault()
    if (!course) {
      setError("Enter a course name")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await getStudentsByCourseAPI(course)
      setStudents(res.data.students)
      if (res.data.students.length === 0) {
        setError(`No students found in course "${course}"`)
      }
    } catch (err) {
      setError("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🎓 My Students</h2>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Search by Course</h3>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              placeholder="Course name (e.g. BCA)"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={loading}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {students.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-700">
                {students.length} students in {course}
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Phone</th>
                  <th className="text-left px-6 py-3">Address</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3">{s.id}</td>
                    <td className="px-6 py-3 font-medium">{s.name}</td>
                    <td className="px-6 py-3">{s.email}</td>
                    <td className="px-6 py-3">{s.phone || "—"}</td>
                    <td className="px-6 py-3">{s.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  )
}