import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getAttendanceAPI,
  getStudentAttendanceAPI,
  markAttendanceAPI,
  attendanceSummaryAPI
} from "../api"

export default function Attendance() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [attendance, setAttendance] = useState([])
  const [filtered, setFiltered] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filters
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  // Mark attendance form (admin only)
  const [form, setForm] = useState({ student_id: "", date: "", status: "present" })

  // Search by student id (admin only)
  const [searchId, setSearchId] = useState("")

  useEffect(() => {
    fetchAttendance()
  }, [])

  // Apply filters whenever attendance, statusFilter or dateFilter changes
  useEffect(() => {
    let result = [...attendance]

    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter)
    }

    if (dateFilter) {
      result = result.filter((a) => a.date === dateFilter)
    }

    setFiltered(result)
  }, [attendance, statusFilter, dateFilter])

  async function fetchAttendance() {
    setLoading(true)
    try {
      if (isAdmin) {
        const res = await getAttendanceAPI()
        setAttendance(res.data.attendance)
      } else {
        const [attRes, summaryRes] = await Promise.all([
          getStudentAttendanceAPI(user.student_id),
          attendanceSummaryAPI(user.student_id)
        ])
        setAttendance(attRes.data.attendance)
        setSummary(summaryRes.data)
      }
    } catch (err) {
      setError("Failed to load attendance")
    } finally {
      setLoading(false)
    }
  }

  async function handleMark(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.student_id || !form.date) {
      setError("All fields are required")
      return
    }

    try {
      await markAttendanceAPI({
        ...form,
        student_id: parseInt(form.student_id)
      })
      setSuccess("Attendance marked!")
      setForm({ student_id: "", date: "", status: "present" })
      fetchAttendance()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to mark attendance")
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    setError("")
    if (!searchId) {
      setError("Enter a student ID")
      return
    }
    try {
      const res = await getStudentAttendanceAPI(searchId)
      setAttendance(res.data.attendance)
    } catch (err) {
      setError("Student not found")
    }
  }

  function clearFilters() {
    setStatusFilter("all")
    setDateFilter("")
    fetchAttendance()
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Attendance</h2>

        {/* Admin: Mark Attendance */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Mark Attendance</h3>
            <form onSubmit={handleMark} className="flex flex-wrap gap-3">
              <input
                type="number"
                placeholder="Student ID"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Mark
              </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
          </div>
        )}

        {/* Admin: Search by Student */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Search by Student</h3>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="number"
                placeholder="Student ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Search
              </button>
              <button
                type="button"
                onClick={fetchAttendance}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Show All
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-600">Filter:</span>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Clear */}
            <button
              onClick={clearFilters}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>

            <p className="text-sm text-gray-400 ml-auto">
              Showing {filtered.length} of {attendance.length} records
            </p>
          </div>
        </div>

        {/* Student: Summary */}
        {!isAdmin && summary && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">My Summary</h3>
            <div className="flex gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600">{summary.attendance_percentage}%</p>
                <p className="text-sm text-gray-500">Attendance</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{summary.present}</p>
                <p className="text-sm text-gray-500">Present</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-600">{summary.total_classes}</p>
                <p className="text-sm text-gray-500">Total Classes</p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading attendance...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400">No attendance records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  {isAdmin && <th className="text-left px-6 py-3">Student ID</th>}
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50 transition">
                    {isAdmin && <td className="px-6 py-3">{a.student_id}</td>}
                    <td className="px-6 py-3">{a.date}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${a.status === "present"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  )
}