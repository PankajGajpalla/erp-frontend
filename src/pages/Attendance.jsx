import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getAttendanceAPI,
  getStudentAttendanceAPI,
  markAttendanceAPI,
  attendanceSummaryAPI,
  subjectWiseAttendanceAPI
} from "../api"

export default function Attendance() {
  const { user, isAdmin } = useAuth()

  const [attendance, setAttendance]       = useState([])
  const [summary, setSummary]             = useState(null)
  const [subjectSummary, setSubjectSummary] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState("")
  const [success, setSuccess]             = useState("")
  const [submitting, setSubmitting]       = useState(false)

  // Filters
  const [statusFilter, setStatusFilter]   = useState("all")
  const [dateFilter, setDateFilter]       = useState("")

  // Date-range filter (Feature 3)
  const [startDate, setStartDate]         = useState("")
  const [endDate, setEndDate]             = useState("")
  const [rangeApplied, setRangeApplied]   = useState(false)

  // Mark attendance form (admin only)
  const [form, setForm] = useState({
    student_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "present"
  })

  // Search by student id (admin only)
  const [searchId, setSearchId] = useState("")

  useEffect(() => { fetchAttendance() }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  // Apply local filters (derived — no extra state needed)
  const filtered = useMemo(() => {
    return attendance.filter((a) => {
      const matchStatus = statusFilter === "all" || a.status === statusFilter
      const matchDate   = !dateFilter || a.date === dateFilter
      return matchStatus && matchDate
    })
  }, [attendance, statusFilter, dateFilter])

  async function fetchAttendance(params = {}) {
    setLoading(true); setError("")
    try {
      if (isAdmin) {
        const res = await getAttendanceAPI()
        setAttendance(res.data.attendance)
      } else {
        if (!user?.student_id) { setError("Student ID not found. Please login again."); return }
        const [attRes, summaryRes, subjRes] = await Promise.all([
          getStudentAttendanceAPI(user.student_id, params),
          attendanceSummaryAPI(user.student_id),
          subjectWiseAttendanceAPI(user.student_id)
        ])
        setAttendance(attRes.data.attendance)
        setSummary(summaryRes.data)
        setSubjectSummary(subjRes.data.subjects)
      }
    } catch { setError("Failed to load attendance") }
    finally { setLoading(false) }
  }

  async function handleApplyDateRange(e) {
    e.preventDefault()
    if (!startDate && !endDate) { setError("Select at least one date"); return }
    setRangeApplied(true)
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate)   params.end_date   = endDate
    await fetchAttendance(params)
  }

  function handleClearDateRange() {
    setStartDate(""); setEndDate(""); setRangeApplied(false)
    fetchAttendance()
  }

  async function handleMark(e) {
    e.preventDefault(); setError(""); setSuccess("")
    if (!form.student_id || !form.date) { setError("Student ID and date are required"); return }
    setSubmitting(true)
    try {
      await markAttendanceAPI({ ...form, student_id: parseInt(form.student_id) })
      setSuccess("✅ Attendance marked successfully!")
      setForm({ student_id: "", date: new Date().toISOString().split("T")[0], status: "present" })
      fetchAttendance()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to mark attendance")
    } finally { setSubmitting(false) }
  }

  async function handleSearch(e) {
    e.preventDefault(); setError("")
    if (!searchId) { setError("Enter a student ID"); return }
    setLoading(true)
    try {
      const params = {}
      if (startDate) params.start_date = startDate
      if (endDate)   params.end_date   = endDate
      const [attRes, summaryRes] = await Promise.all([
        getStudentAttendanceAPI(searchId, params),
        attendanceSummaryAPI(searchId)
      ])
      setAttendance(attRes.data.attendance)
      setSummary(summaryRes.data)
    } catch { setError("Student not found") }
    finally { setLoading(false) }
  }

  function clearAll() {
    setStatusFilter("all"); setDateFilter(""); setSummary(null)
    setSearchId(""); setStartDate(""); setEndDate(""); setRangeApplied(false)
    fetchAttendance()
  }

  // Summary stats for ranged data
  const presentCount = filtered.filter(a => a.status === "present").length
  const absentCount  = filtered.filter(a => a.status === "absent").length
  const rangedPct    = filtered.length > 0 ? ((presentCount / filtered.length) * 100).toFixed(1) : 0

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
              <input type="number" placeholder="Student ID" value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <button type="submit" disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {submitting ? "Marking..." : "Mark"}
              </button>
            </form>
            {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
            {success && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
          </div>
        )}

        {/* Admin: Search by Student + Date Range */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Search by Student</h3>
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Student ID</label>
                <input type="number" placeholder="e.g. 5" value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit"
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
                Search
              </button>
              <button type="button" onClick={clearAll}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition">
                Show All
              </button>
            </form>

            {summary && isAdmin && (
              <div className="mt-4 flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.attendance_percentage}%</p>
                  <p className="text-xs text-gray-500">Attendance</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{summary.present}</p>
                  <p className="text-xs text-gray-500">Present</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">{summary.total_classes}</p>
                  <p className="text-xs text-gray-500">Total Classes</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Student: Date Range Filter (Feature 3) */}
        {!isAdmin && (
          <div className="bg-white rounded-xl shadow p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📅 Filter by Date Range</h3>
            <form onSubmit={handleApplyDateRange} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
                Apply
              </button>
              {rangeApplied && (
                <button type="button" onClick={handleClearDateRange}
                  className="bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
                  Clear
                </button>
              )}
            </form>

            {/* Ranged mini-summary */}
            {rangeApplied && (
              <div className="mt-4 flex gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{rangedPct}%</p>
                  <p className="text-xs text-gray-500">In Range</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{presentCount}</p>
                  <p className="text-xs text-gray-500">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{absentCount}</p>
                  <p className="text-xs text-gray-500">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{filtered.length}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters bar */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {(statusFilter !== "all" || dateFilter) && (
              <button onClick={() => { setStatusFilter("all"); setDateFilter("") }}
                className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
                Clear
              </button>
            )}
            <p className="text-sm text-gray-400 ml-auto">
              {filtered.length} of {attendance.length} records
            </p>
          </div>
        </div>

        {/* Student: Attendance Summary */}
        {!isAdmin && summary && !rangeApplied && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">My Attendance Summary</h3>
            <div className="flex gap-8 text-center mb-4">
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
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500
                  ${summary.attendance_percentage >= 75 ? "bg-green-500"
                    : summary.attendance_percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${summary.attendance_percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {summary.attendance_percentage >= 75 ? "✅ Good attendance!"
                : summary.attendance_percentage >= 50 ? "⚠️ Attendance below recommended 75%"
                : "❌ Critical — attendance very low!"}
            </p>
          </div>
        )}

        {/* Student: Subject-wise Attendance Breakdown */}
        {!isAdmin && subjectSummary.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Subject-wise Attendance</h3>
            <div className="space-y-3">
              {subjectSummary.map((s) => (
                <div key={s.subject_id ?? "general"} className="flex items-center gap-4">
                  <div className="w-36 text-sm font-medium text-gray-700 truncate">{s.subject_name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${s.percentage >= 75 ? "bg-green-500" : s.percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                  <div className="text-sm font-semibold w-12 text-right">{s.percentage}%</div>
                  <div className="text-xs text-gray-400 w-24 text-right">{s.present}/{s.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading attendance...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400">No attendance records found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  {isAdmin && <th className="text-left px-6 py-3">Student ID</th>}
                  <th className="text-left px-6 py-3">Date</th>
                  {!isAdmin && <th className="text-left px-6 py-3">Subject</th>}
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                    {isAdmin && <td className="px-6 py-3 text-gray-600">{a.student_id}</td>}
                    <td className="px-6 py-3 text-gray-700">{a.date}</td>
                    {!isAdmin && (
                      <td className="px-6 py-3 text-gray-500">{a.subject_name || a.subject_id || "—"}</td>
                    )}
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${a.status === "present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {a.status === "present" ? "✅ Present" : "❌ Absent"}
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
