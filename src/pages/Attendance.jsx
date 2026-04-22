import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getAttendanceAPI,
  getStudentAttendanceAPI,
  markAttendanceAPI,
  attendanceSummaryAPI,
  subjectWiseAttendanceAPI,
  searchStudentsAPI,
  getCoursesAPI,
  getStudentsByCourseAPI,
  markAttendanceBulkAPI,
  checkAttendanceBulkAPI,
} from "../api"

const PAGE_SIZE = 20

// ── Attendance percentage badge ───────────────────────────────
function PctBadge({ pct }) {
  const color = pct >= 75 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{pct}%</span>
}

// ── Progress bar ──────────────────────────────────────────────
function AttBar({ pct }) {
  const bg = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${bg}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

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

  // Date-range filter
  const [startDate, setStartDate]         = useState("")
  const [endDate, setEndDate]             = useState("")
  const [rangeApplied, setRangeApplied]   = useState(false)

  // Mark attendance form (admin only)
  const [form, setForm] = useState({
    student_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "present"
  })

  // Admin view mode: "search" | "course"
  const [adminTab, setAdminTab]           = useState("search")

  // Search by student (admin)
  const [searchQuery, setSearchQuery]     = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Browse by Course (admin)
  const [courses, setCourses]             = useState([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [courseStudents, setCourseStudents] = useState([])
  const [summaries, setSummaries]         = useState({})   // student_id → summary
  const [courseLoading, setCourseLoading] = useState(false)
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [coursePage, setCoursePage]       = useState(1)
  const [expandedStudent, setExpandedStudent] = useState(null) // student obj
  const [expandedAtt, setExpandedAtt]     = useState([])
  const [expandedLoading, setExpandedLoading] = useState(false)

  // Bulk Mark state
  const [bulkCourse, setBulkCourse]       = useState("")
  const [bulkDate, setBulkDate]           = useState(new Date().toISOString().split("T")[0])
  const [bulkStudents, setBulkStudents]   = useState([])
  const [bulkAttendance, setBulkAttendance] = useState({}) // student_id -> "present"|"absent"
  const [bulkOriginal, setBulkOriginal]   = useState({})  // existing marks from DB
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkSuccess, setBulkSuccess]     = useState("")
  const [bulkError, setBulkError]         = useState("")

  useEffect(() => { fetchAttendance() }, [])
  useEffect(() => {
    if (isAdmin) loadCourses()
  }, [isAdmin])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  // When course page changes, load summaries for visible students
  useEffect(() => {
    if (courseStudents.length === 0) return
    const pageStudents = courseStudents.slice((coursePage - 1) * PAGE_SIZE, coursePage * PAGE_SIZE)
    const missing = pageStudents.filter(s => !summaries[s.id])
    if (missing.length > 0) loadSummariesForPage(missing)
  }, [coursePage, courseStudents])

  const filtered = useMemo(() => {
    return attendance.filter((a) => {
      const matchStatus = statusFilter === "all" || a.status === statusFilter
      const matchDate   = !dateFilter || a.date === dateFilter
      return matchStatus && matchDate
    })
  }, [attendance, statusFilter, dateFilter])

  async function loadCourses() {
    try {
      const res = await getCoursesAPI()
      setCourses(res.data.courses || [])
    } catch { /* silent */ }
  }

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

  async function handleCourseChange(e) {
    const course = e.target.value
    setSelectedCourse(course)
    setCourseStudents([])
    setSummaries({})
    setCoursePage(1)
    setExpandedStudent(null)
    setExpandedAtt([])
    if (!course) return

    setCourseLoading(true)
    try {
      const res = await getStudentsByCourseAPI(course)
      const students = res.data.students || []
      setCourseStudents(students)
      // Load summaries for first page immediately
      const firstPage = students.slice(0, PAGE_SIZE)
      if (firstPage.length > 0) loadSummariesForPage(firstPage)
    } catch { setError("Failed to load students for this course") }
    finally { setCourseLoading(false) }
  }

  async function loadSummariesForPage(students) {
    setSummariesLoading(true)
    try {
      const results = await Promise.all(
        students.map(s => attendanceSummaryAPI(s.id).then(r => ({ id: s.id, data: r.data })).catch(() => ({ id: s.id, data: null })))
      )
      setSummaries(prev => {
        const next = { ...prev }
        results.forEach(r => { if (r.data) next[r.id] = r.data })
        return next
      })
    } catch { /* silent */ }
    finally { setSummariesLoading(false) }
  }

  async function handleExpandStudent(student) {
    if (expandedStudent?.id === student.id) { setExpandedStudent(null); setExpandedAtt([]); return }
    setExpandedStudent(student)
    setExpandedLoading(true)
    setExpandedAtt([])
    try {
      const res = await getStudentAttendanceAPI(student.id)
      setExpandedAtt(res.data.attendance || [])
    } catch { setExpandedAtt([]) }
    finally { setExpandedLoading(false) }
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
    if (!searchQuery.trim()) { setError("Enter a name, student ID, email or phone"); return }
    setLoading(true); setSearchResults([]); setSelectedStudent(null)
    try {
      const res = await searchStudentsAPI(searchQuery.trim())
      const students = res.data.students || res.data || []
      if (students.length === 0) { setError("No student found matching that query"); setLoading(false); return }
      if (students.length === 1) {
        await loadStudentAttendance(students[0])
      } else {
        setSearchResults(students); setLoading(false)
      }
    } catch { setError("Search failed — try again"); setLoading(false) }
  }

  async function loadStudentAttendance(student) {
    setLoading(true); setSearchResults([]); setSelectedStudent(student)
    try {
      const params = {}
      if (startDate) params.start_date = startDate
      if (endDate)   params.end_date   = endDate
      const [attRes, summaryRes] = await Promise.all([
        getStudentAttendanceAPI(student.id, params),
        attendanceSummaryAPI(student.id),
      ])
      setAttendance(attRes.data.attendance)
      setSummary(summaryRes.data)
    } catch { setError("Failed to load attendance for this student") }
    finally { setLoading(false) }
  }

  function clearAll() {
    setStatusFilter("all"); setDateFilter(""); setSummary(null)
    setSearchQuery(""); setSearchResults([]); setSelectedStudent(null)
    setStartDate(""); setEndDate(""); setRangeApplied(false)
    fetchAttendance()
  }

  async function handleLoadBulkStudents() {
    if (!bulkCourse || !bulkDate) { setBulkError("Select a course and date first"); return }
    setBulkError(""); setBulkSuccess("")
    setBulkLoading(true); setBulkStudents([]); setBulkAttendance({}); setBulkOriginal({})
    try {
      const [studRes, checkRes] = await Promise.all([
        getStudentsByCourseAPI(bulkCourse),
        checkAttendanceBulkAPI({ course: bulkCourse, date: bulkDate })
      ])
      const students = studRes.data.students || []
      setBulkStudents(students)
      // Build existing marks map
      const existing = {}
      const checkData = checkRes.data?.records || checkRes.data || []
      if (Array.isArray(checkData)) {
        checkData.forEach(r => { existing[r.student_id] = r.status })
      }
      setBulkOriginal(existing)
      // Default attendance: use existing or "present"
      const att = {}
      students.forEach(s => { att[s.id] = existing[s.id] || "present" })
      setBulkAttendance(att)
    } catch (err) {
      setBulkError("Failed to load students or attendance data")
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkSubmit() {
    const unmarked = bulkStudents.filter(s => !bulkOriginal[s.id])
    if (unmarked.length === 0) { setBulkError("All students are already marked for this date"); return }
    setBulkError(""); setBulkSuccess(""); setBulkSubmitting(true)
    try {
      const records = unmarked.map(s => ({
        student_id: s.id,
        date: bulkDate,
        status: bulkAttendance[s.id] || "present"
      }))
      await markAttendanceBulkAPI({ records })
      setBulkSuccess(`✅ Attendance marked for ${records.length} student${records.length > 1 ? "s" : ""}!`)
      // Refresh existing marks
      const checkRes = await checkAttendanceBulkAPI({ course: bulkCourse, date: bulkDate })
      const existing = {}
      const checkData = checkRes.data?.records || checkRes.data || []
      if (Array.isArray(checkData)) {
        checkData.forEach(r => { existing[r.student_id] = r.status })
      }
      setBulkOriginal(existing)
    } catch (err) {
      setBulkError(err.response?.data?.detail || "Failed to mark attendance")
    } finally {
      setBulkSubmitting(false)
    }
  }

  // Pagination helpers for course view
  const totalPages    = Math.ceil(courseStudents.length / PAGE_SIZE)
  const pageStudents  = courseStudents.slice((coursePage - 1) * PAGE_SIZE, coursePage * PAGE_SIZE)

  const presentCount = filtered.filter(a => a.status === "present").length
  const absentCount  = filtered.filter(a => a.status === "absent").length
  const rangedPct    = filtered.length > 0 ? ((presentCount / filtered.length) * 100).toFixed(1) : 0

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Attendance</h2>

        {/* ── Admin: Mark Attendance ── */}
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

        {/* ── Admin: Tab Switcher ── */}
        {isAdmin && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setAdminTab("search")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition
                ${adminTab === "search" ? "bg-gray-800 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}>
              🔍 Search by Student
            </button>
            <button
              onClick={() => setAdminTab("course")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition
                ${adminTab === "course" ? "bg-gray-800 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}>
              🎓 Browse by Course
            </button>
            <button
              onClick={() => setAdminTab("bulk")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition
                ${adminTab === "bulk" ? "bg-gray-800 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"}`}>
              📝 Bulk Mark
            </button>
          </div>
        )}

        {/* ── Admin Tab: Search by Student ── */}
        {isAdmin && adminTab === "search" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Search by Student</h3>
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Name / Student ID / Email / Phone</label>
                <input
                  type="text"
                  placeholder="Search by name, STU0001, email or phone…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]) }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
              <button type="submit" className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">Search</button>
              <button type="button" onClick={clearAll} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition">Show All</button>
            </form>

            {searchResults.length > 1 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">{searchResults.length} students found — click one to view attendance:</p>
                <div className="divide-y border rounded-lg overflow-hidden">
                  {searchResults.map((s) => (
                    <button key={s.id} onClick={() => loadStudentAttendance(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition flex items-center gap-4 text-sm">
                      <span className="font-mono text-xs text-gray-400 w-20 shrink-0">{s.student_code || `#${s.id}`}</span>
                      <span className="font-medium text-gray-800 flex-1">{s.name}</span>
                      <span className="text-gray-400">{s.email || s.phone || ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedStudent && (
              <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
                <span className="font-mono text-xs text-blue-400">{selectedStudent.student_code || `#${selectedStudent.id}`}</span>
                <span className="font-semibold text-blue-800">{selectedStudent.name}</span>
                {selectedStudent.course && <span className="text-blue-500">· {selectedStudent.course}</span>}
              </div>
            )}

            {summary && isAdmin && (
              <div className="mt-4 flex gap-6 text-center">
                <div><p className="text-2xl font-bold text-green-600">{summary.attendance_percentage}%</p><p className="text-xs text-gray-500">Attendance</p></div>
                <div><p className="text-2xl font-bold text-blue-600">{summary.present}</p><p className="text-xs text-gray-500">Present</p></div>
                <div><p className="text-2xl font-bold text-gray-600">{summary.total_classes}</p><p className="text-xs text-gray-500">Total Classes</p></div>
              </div>
            )}
          </div>
        )}

        {/* ── Admin Tab: Browse by Course ── */}
        {isAdmin && adminTab === "course" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-wrap gap-3 items-end mb-5">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={handleCourseChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Select a course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}{c.duration ? ` (${c.duration})` : ""}</option>
                  ))}
                </select>
              </div>
              {selectedCourse && courseStudents.length > 0 && (
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">{courseStudents.length}</span> students enrolled
                </div>
              )}
            </div>

            {courseLoading ? (
              <div className="flex items-center gap-2 text-gray-400 py-6 justify-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Loading students...
              </div>
            ) : !selectedCourse ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">🎓</p>
                <p className="text-sm">Select a course above to view attendance</p>
              </div>
            ) : courseStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm">No students enrolled in this course</p>
              </div>
            ) : (
              <>
                {/* Course attendance table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="text-left px-4 py-3 font-medium">#</th>
                        <th className="text-left px-4 py-3 font-medium">Student ID</th>
                        <th className="text-left px-4 py-3 font-medium">Name</th>
                        <th className="text-left px-4 py-3 font-medium">Present</th>
                        <th className="text-left px-4 py-3 font-medium">Total</th>
                        <th className="text-left px-4 py-3 font-medium">Attendance %</th>
                        <th className="text-center px-4 py-3 font-medium">Status</th>
                        <th className="text-center px-4 py-3 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageStudents.map((s, idx) => {
                        const sum = summaries[s.id]
                        const pct = sum?.attendance_percentage ?? null
                        const isExpanded = expandedStudent?.id === s.id
                        return (
                          <>
                            <tr key={s.id} className={`border-t transition ${isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                              <td className="px-4 py-3 text-gray-400 text-xs">{(coursePage - 1) * PAGE_SIZE + idx + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.student_code || `#${s.id}`}</td>
                              <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                              <td className="px-4 py-3 text-blue-600 font-semibold">{sum ? sum.present : summariesLoading ? "…" : "—"}</td>
                              <td className="px-4 py-3 text-gray-500">{sum ? sum.total_classes : summariesLoading ? "…" : "—"}</td>
                              <td className="px-4 py-3">
                                {pct !== null ? (
                                  <div className="flex items-center gap-2">
                                    <AttBar pct={pct} />
                                    <PctBadge pct={pct} />
                                  </div>
                                ) : summariesLoading ? (
                                  <span className="text-xs text-gray-400">Loading…</span>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {pct !== null ? (
                                  <span className={`text-xs font-medium ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                                    {pct >= 75 ? "✅ Good" : pct >= 50 ? "⚠️ Low" : "❌ Critical"}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleExpandStudent(s)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition
                                    ${isExpanded ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                                  {isExpanded ? "Hide ▲" : "View ▼"}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded attendance records */}
                            {isExpanded && (
                              <tr key={`${s.id}-exp`} className="bg-blue-50 border-t border-blue-100">
                                <td colSpan={8} className="px-6 py-3">
                                  {expandedLoading ? (
                                    <div className="flex items-center gap-2 text-gray-400 py-2">
                                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                      Loading records…
                                    </div>
                                  ) : expandedAtt.length === 0 ? (
                                    <p className="text-gray-400 text-sm py-2">No attendance records found.</p>
                                  ) : (
                                    <div>
                                      <p className="text-xs font-semibold text-gray-500 mb-2">{expandedAtt.length} attendance records</p>
                                      <div className="max-h-52 overflow-y-auto rounded border border-blue-200 bg-white">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-gray-50 border-b">
                                              <th className="text-left px-3 py-2 font-medium text-gray-500">Date</th>
                                              <th className="text-left px-3 py-2 font-medium text-gray-500">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {expandedAtt.map((a) => (
                                              <tr key={a.id} className="border-t hover:bg-gray-50">
                                                <td className="px-3 py-1.5 text-gray-700">{a.date}</td>
                                                <td className="px-3 py-1.5">
                                                  <span className={`px-2 py-0.5 rounded-full font-medium
                                                    ${a.status === "present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                    {a.status === "present" ? "✅ Present" : "❌ Absent"}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      Showing {(coursePage - 1) * PAGE_SIZE + 1}–{Math.min(coursePage * PAGE_SIZE, courseStudents.length)} of {courseStudents.length} students
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCoursePage(1)}
                        disabled={coursePage === 1}
                        className="px-2 py-1 rounded text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        «
                      </button>
                      <button
                        onClick={() => setCoursePage(p => p - 1)}
                        disabled={coursePage === 1}
                        className="px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        ‹ Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - coursePage) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push("…")
                          acc.push(p)
                          return acc
                        }, [])
                        .map((p, i) =>
                          p === "…" ? (
                            <span key={`dot-${i}`} className="px-2 py-1 text-gray-400 text-sm">…</span>
                          ) : (
                            <button key={p}
                              onClick={() => setCoursePage(p)}
                              className={`px-3 py-1 rounded text-sm border transition
                                ${p === coursePage ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 hover:bg-gray-100"}`}>
                              {p}
                            </button>
                          )
                        )}
                      <button
                        onClick={() => setCoursePage(p => p + 1)}
                        disabled={coursePage === totalPages}
                        className="px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        Next ›
                      </button>
                      <button
                        onClick={() => setCoursePage(totalPages)}
                        disabled={coursePage === totalPages}
                        className="px-2 py-1 rounded text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        »
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Admin Tab: Bulk Mark ── */}
        {isAdmin && adminTab === "bulk" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Bulk Mark Attendance</h3>

            {/* Step 1: Select Course + Date */}
            <div className="flex flex-wrap gap-3 items-end mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Course</label>
                <select value={bulkCourse} onChange={e => { setBulkCourse(e.target.value); setBulkStudents([]); setBulkAttendance({}); setBulkOriginal({}); setBulkSuccess(""); setBulkError("") }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Select a course —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}{c.duration ? ` (${c.duration})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                <input type="date" value={bulkDate} onChange={e => { setBulkDate(e.target.value); setBulkStudents([]); setBulkAttendance({}); setBulkOriginal({}); setBulkSuccess(""); setBulkError("") }}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleLoadBulkStudents} disabled={bulkLoading || !bulkCourse || !bulkDate}
                className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                {bulkLoading ? "Loading…" : "Load Students"}
              </button>
            </div>

            {bulkError && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{bulkError}</p></div>}
            {bulkSuccess && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{bulkSuccess}</p></div>}

            {/* Step 2: Student list */}
            {bulkStudents.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-sm text-gray-500 font-medium">{bulkStudents.length} students · {bulkDate}</p>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const att = {}
                      bulkStudents.forEach(s => { att[s.id] = "present" })
                      setBulkAttendance(att)
                    }} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                      All Present
                    </button>
                    <button onClick={() => {
                      const att = {}
                      bulkStudents.forEach(s => { att[s.id] = "absent" })
                      setBulkAttendance(att)
                    }} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                      All Absent
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 text-xs">
                        <th className="text-left px-4 py-2 font-medium">Student ID</th>
                        <th className="text-left px-4 py-2 font-medium">Name</th>
                        <th className="text-center px-4 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkStudents.map(s => {
                        const alreadyMarked = !!bulkOriginal[s.id]
                        const status = bulkAttendance[s.id] || "present"
                        return (
                          <tr key={s.id} className={`border-t ${alreadyMarked ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                            <td className="px-4 py-2 font-mono text-xs text-gray-400">{s.student_code || `#${s.id}`}</td>
                            <td className="px-4 py-2 text-gray-800">
                              {s.name}
                              {alreadyMarked && (
                                <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Already Marked</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {alreadyMarked ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${bulkOriginal[s.id] === "present" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                                  {bulkOriginal[s.id] === "present" ? "✅ Present" : "❌ Absent"}
                                </span>
                              ) : (
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => setBulkAttendance(prev => ({ ...prev, [s.id]: "present" }))}
                                    className={`px-3 py-1 rounded text-xs font-medium transition
                                      ${status === "present" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-green-100"}`}>
                                    Present
                                  </button>
                                  <button
                                    onClick={() => setBulkAttendance(prev => ({ ...prev, [s.id]: "absent" }))}
                                    className={`px-3 py-1 rounded text-xs font-medium transition
                                      ${status === "absent" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-100"}`}>
                                    Absent
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {bulkStudents.some(s => !bulkOriginal[s.id]) && (
                  <button onClick={handleBulkSubmit} disabled={bulkSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                    {bulkSubmitting ? "Submitting…" : `Submit Attendance (${bulkStudents.filter(s => !bulkOriginal[s.id]).length} students)`}
                  </button>
                )}
              </>
            )}

            {!bulkLoading && bulkStudents.length === 0 && bulkCourse && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-sm">Click "Load Students" to fetch students for this course and date.</p>
              </div>
            )}

            {!bulkCourse && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-2">📝</p>
                <p className="text-sm">Select a course and date above, then click "Load Students".</p>
              </div>
            )}
          </div>
        )}

        {/* ── Student: Date Range Filter ── */}
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
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Apply</button>
              {rangeApplied && (
                <button type="button" onClick={handleClearDateRange}
                  className="bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-300 transition">Clear</button>
              )}
            </form>
            {rangeApplied && (
              <div className="mt-4 flex gap-6 flex-wrap">
                <div className="text-center"><p className="text-2xl font-bold text-green-600">{rangedPct}%</p><p className="text-xs text-gray-500">In Range</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-blue-600">{presentCount}</p><p className="text-xs text-gray-500">Present</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-red-500">{absentCount}</p><p className="text-xs text-gray-500">Absent</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-gray-600">{filtered.length}</p><p className="text-xs text-gray-500">Total</p></div>
              </div>
            )}
          </div>
        )}

        {/* ── Filters bar (search tab / student view) ── */}
        {(!isAdmin || adminTab === "search") && (
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
                  className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">Clear</button>
              )}
              <p className="text-sm text-gray-400 ml-auto">{filtered.length} of {attendance.length} records</p>
            </div>
          </div>
        )}

        {/* ── Student: Attendance Summary ── */}
        {!isAdmin && summary && !rangeApplied && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">My Attendance Summary</h3>
            <div className="flex gap-8 text-center mb-4">
              <div><p className="text-3xl font-bold text-green-600">{summary.attendance_percentage}%</p><p className="text-sm text-gray-500">Attendance</p></div>
              <div><p className="text-3xl font-bold text-blue-600">{summary.present}</p><p className="text-sm text-gray-500">Present</p></div>
              <div><p className="text-3xl font-bold text-gray-600">{summary.total_classes}</p><p className="text-sm text-gray-500">Total Classes</p></div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all duration-500
                ${summary.attendance_percentage >= 75 ? "bg-green-500" : summary.attendance_percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${summary.attendance_percentage}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {summary.attendance_percentage >= 75 ? "✅ Good attendance!" : summary.attendance_percentage >= 50 ? "⚠️ Below recommended 75%" : "❌ Critical — attendance very low!"}
            </p>
          </div>
        )}

        {/* ── Student: Subject-wise Attendance ── */}
        {!isAdmin && subjectSummary.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Subject-wise Attendance</h3>
            <div className="space-y-3">
              {subjectSummary.map((s) => (
                <div key={s.subject_id ?? "general"} className="flex items-center gap-4">
                  <div className="w-36 text-sm font-medium text-gray-700 truncate">{s.subject_name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all duration-500 ${s.percentage >= 75 ? "bg-green-500" : s.percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${s.percentage}%` }} />
                  </div>
                  <div className="text-sm font-semibold w-12 text-right">{s.percentage}%</div>
                  <div className="text-xs text-gray-400 w-24 text-right">{s.present}/{s.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Attendance Records Table (Search tab / Student view) ── */}
        {(!isAdmin || adminTab === "search") && (
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
                      {!isAdmin && <td className="px-6 py-3 text-gray-500">{a.subject_name || a.subject_id || "—"}</td>}
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
        )}

      </main>
    </div>
  )
}
