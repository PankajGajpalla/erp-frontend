import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getTeacherMeAPI,
  getStudentsByCourseAPI,
  markAttendanceBulkAPI,
  getAttendanceAPI,
  getStudentAttendanceAPI
} from "../api"

export default function TeacherDashboard() {
  const { user } = useAuth()

  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("mark")

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

  if (loading) return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </main>
    </div>
  )

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        {/* Teacher Profile */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{teacher?.name}</h2>
              <p className="text-gray-500">{teacher?.subject} · {teacher?.email}</p>
              {teacher?.phone && <p className="text-gray-400 text-sm">{teacher?.phone}</p>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="flex border-b">
            {[
              { key: "mark", label: "📋 Mark Attendance" },
              { key: "students", label: "🎓 My Students" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition border-b-2
                  ${activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "mark" && <MarkAttendance teacher={teacher} />}
        {activeTab === "students" && <MyStudents teacher={teacher} />}

      </main>
    </div>
  )
}

// ─── Mark Attendance ─────────────────────────────────────────
function MarkAttendance({ teacher }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [course, setCourse] = useState("")
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({}) // { student_id: "present" | "absent" }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function loadStudents(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!course || !date) {
      setError("Please select date and enter course")
      return
    }

    setLoading(true)
    try {
      const res = await getStudentsByCourseAPI(course)
      const studentList = res.data.students

      if (studentList.length === 0) {
        setError(`No students found in course "${course}"`)
        setStudents([])
        return
      }

      setStudents(studentList)

      // Default all to present
      const defaultAttendance = {}
      studentList.forEach((s) => {
        defaultAttendance[s.id] = "present"
      })
      setAttendance(defaultAttendance)
    } catch (err) {
      setError("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  function toggleAttendance(studentId) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present"
    }))
  }

  function markAll(status) {
    const updated = {}
    students.forEach((s) => { updated[s.id] = status })
    setAttendance(updated)
  }

  async function handleSubmit() {
    setError("")
    setSuccess("")

    const records = students.map((s) => ({
      student_id: s.id,
      date: date,
      status: attendance[s.id] || "absent"
    }))

    try {
      const res = await markAttendanceBulkAPI(records)
      setSuccess(`✅ Attendance saved! ${res.data.marked} marked, ${res.data.updated} updated`)
      setStudents([])
      setCourse("")
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save attendance")
    }
  }

  const presentCount = Object.values(attendance).filter((s) => s === "present").length
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length

  return (
    <div className="space-y-6">

      {/* Select Date & Course */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Date & Course</h3>
        <form onSubmit={loadStudents} className="flex flex-wrap gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Course name (e.g. BCA)"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Load Students
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
      </div>

      {/* Students Attendance */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                {students.length} Students — {course} — {date}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                ✅ Present: {presentCount} &nbsp;|&nbsp; ❌ Absent: {absentCount}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => markAll("present")}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Mark All Present
              </button>
              <button onClick={() => markAll("absent")}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition">
                Mark All Absent
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-6 py-3">ID</th>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const isPresent = attendance[s.id] === "present"
                return (
                  <tr key={s.id} className={`border-t transition
                    ${isPresent ? "bg-green-50" : "bg-red-50"}`}>
                    <td className="px-6 py-3">{s.id}</td>
                    <td className="px-6 py-3 font-medium">{s.name}</td>
                    <td className="px-6 py-3">{s.email}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${isPresent
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"}`}>
                        {isPresent ? "✅ Present" : "❌ Absent"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleAttendance(s.id)}
                        className={`px-4 py-1 rounded-lg text-xs font-medium transition
                          ${isPresent
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        Mark {isPresent ? "Absent" : "Present"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="p-6 border-t flex justify-end">
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Submit Attendance
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── My Students ─────────────────────────────────────────────
function MyStudents({ teacher }) {
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
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Search Students by Course</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Course name (e.g. BCA)"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit"
            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
            Search
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-700">{students.length} students in {course}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-6 py-3">ID</th>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-6 py-3">{s.id}</td>
                  <td className="px-6 py-3 font-medium">{s.name}</td>
                  <td className="px-6 py-3">{s.email}</td>
                  <td className="px-6 py-3">{s.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}