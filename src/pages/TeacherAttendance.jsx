import { useState } from "react"
import Sidebar from "../components/Sidebar"
import { getStudentsByCourseAPI, markAttendanceBulkAPI, getStudentAttendanceAPI } from "../api"

export default function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState("mark")

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Attendance</h2>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow mb-6">
          <div className="flex border-b">
            {[
              { key: "mark", label: "✏️ Mark Attendance" },
              { key: "view", label: "👁️ View Attendance" },
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

        {activeTab === "mark" && <MarkAttendance />}
        {activeTab === "view" && <ViewAttendance />}
      </main>
    </div>
  )
}

// ─── Mark Attendance ─────────────────────────────────────────
function MarkAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [course, setCourse] = useState("")
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
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
      const defaultAttendance = {}
      studentList.forEach((s) => { defaultAttendance[s.id] = "present" })
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
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Select Date & Course
        </h3>
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
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? "Loading..." : "Load Students"}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
      </div>

      {/* Students Table */}
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
                ✅ All Present
              </button>
              <button onClick={() => markAll("absent")}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition">
                ❌ All Absent
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
                      <button onClick={() => toggleAttendance(s.id)}
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
            <button onClick={handleSubmit}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
              Submit Attendance
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── View Attendance ─────────────────────────────────────────
function ViewAttendance() {
  const [studentId, setStudentId] = useState("")
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSearch(e) {
    e.preventDefault()
    if (!studentId) {
      setError("Enter a student ID")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await getStudentAttendanceAPI(studentId)
      setRecords(res.data.attendance)
      if (res.data.attendance.length === 0) {
        setError("No attendance records found for this student")
      }
    } catch (err) {
      setError("Failed to load attendance")
    } finally {
      setLoading(false)
    }
  }

  const present = records.filter((r) => r.status === "present").length
  const total = records.length
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          View Student Attendance
        </h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="number"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={loading}
            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
            {loading ? "Loading..." : "Search"}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {records.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Classes</p>
              <p className="text-3xl font-bold text-gray-800">{total}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Present</p>
              <p className="text-3xl font-bold text-green-600">{present}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500">Percentage</p>
              <p className="text-3xl font-bold text-purple-600">{percentage}%</p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3">{r.date}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${r.status === "present"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}