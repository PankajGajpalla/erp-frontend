import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { LoadingState, Alert, EmptyState, PaginationBar } from "../components/UI"
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

const PAGE_SIZE     = 20   // course-browse pagination
const ATT_PAGE_SIZE = 30   // attendance records table pagination

function PctBadge({ pct }) {
  const color = pct >= 75 ? "bg-emerald-100 text-emerald-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{pct}%</span>
}

function AttBar({ pct }) {
  const bg = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5">
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

  const [statusFilter, setStatusFilter]   = useState("all")
  const [dateFilter, setDateFilter]       = useState("")
  const [startDate, setStartDate]         = useState("")
  const [endDate, setEndDate]             = useState("")
  const [rangeApplied, setRangeApplied]   = useState(false)

  const [form, setForm] = useState({
    student_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "present"
  })

  const [adminTab, setAdminTab]           = useState("search")
  const [searchQuery, setSearchQuery]     = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)

  const [courses, setCourses]             = useState([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [courseStudents, setCourseStudents] = useState([])
  const [summaries, setSummaries]         = useState({})
  const [courseLoading, setCourseLoading] = useState(false)
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [coursePage, setCoursePage]       = useState(1)
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [expandedAtt, setExpandedAtt]     = useState([])
  const [expandedLoading, setExpandedLoading] = useState(false)

  const [attPage, setAttPage]             = useState(1)

  const [bulkCourse, setBulkCourse]       = useState("")
  const [bulkDate, setBulkDate]           = useState(new Date().toISOString().split("T")[0])
  const [bulkStudents, setBulkStudents]   = useState([])
  const [bulkAttendance, setBulkAttendance] = useState({})
  const [bulkOriginal, setBulkOriginal]   = useState({})
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkSuccess, setBulkSuccess]     = useState("")
  const [bulkError, setBulkError]         = useState("")

  useEffect(() => { fetchAttendance() }, [])
  useEffect(() => { if (isAdmin) loadCourses() }, [isAdmin])
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

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

  // Reset attendance-records page when filters or selected student change
  useEffect(() => { setAttPage(1) }, [statusFilter, dateFilter, selectedStudent])

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
    setCourseStudents([]); setSummaries({}); setCoursePage(1)
    setExpandedStudent(null); setExpandedAtt([])
    if (!course) return
    setCourseLoading(true)
    try {
      const res = await getStudentsByCourseAPI(course)
      const students = res.data.students || []
      setCourseStudents(students)
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
    setExpandedStudent(student); setExpandedLoading(true); setExpandedAtt([])
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
      setSuccess("Attendance marked successfully!")
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
      const existing = {}
      const checkData = checkRes.data?.records || checkRes.data || []
      if (Array.isArray(checkData)) { checkData.forEach(r => { existing[r.student_id] = r.status }) }
      setBulkOriginal(existing)
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
      const records = unmarked.map(s => ({ student_id: s.id, date: bulkDate, status: bulkAttendance[s.id] || "present" }))
      await markAttendanceBulkAPI({ records })
      setBulkSuccess(`Attendance marked for ${records.length} student${records.length > 1 ? "s" : ""}!`)
      const checkRes = await checkAttendanceBulkAPI({ course: bulkCourse, date: bulkDate })
      const existing = {}
      const checkData = checkRes.data?.records || checkRes.data || []
      if (Array.isArray(checkData)) { checkData.forEach(r => { existing[r.student_id] = r.status }) }
      setBulkOriginal(existing)
    } catch (err) {
      setBulkError(err.response?.data?.detail || "Failed to mark attendance")
    } finally {
      setBulkSubmitting(false)
    }
  }

  const totalPages    = Math.ceil(courseStudents.length / PAGE_SIZE)
  const pageStudents  = courseStudents.slice((coursePage - 1) * PAGE_SIZE, coursePage * PAGE_SIZE)
  const presentCount  = filtered.filter(a => a.status === "present").length
  const absentCount   = filtered.filter(a => a.status === "absent").length
  const rangedPct     = filtered.length > 0 ? ((presentCount / filtered.length) * 100).toFixed(1) : 0

  const tabBtn = (tab, label) => (
    <button onClick={() => setAdminTab(tab)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition
        ${adminTab === tab ? "bg-slate-800 text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"}`}>
      {label}
    </button>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">

        <h2 className="text-2xl font-bold text-slate-800 mb-6">📋 Attendance</h2>

        {/* Admin: Mark Attendance */}
        {isAdmin && (
          <div className="card p-6 mb-6">
            <h3 className="section-title mb-4">Mark Attendance</h3>
            <form onSubmit={handleMark} className="flex flex-wrap gap-3">
              <input type="number" placeholder="Student ID" value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="inp w-32" />
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="inp w-auto" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="inp w-auto bg-white">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Marking..." : "Mark"}
              </button>
            </form>
            {error && <Alert type="error" message={error} className="mt-3" />}
            {success && <Alert type="success" message={success} className="mt-3" />}
          </div>
        )}

        {/* Admin: Tab Switcher */}
        {isAdmin && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {tabBtn("search", "🔍 Search by Student")}
            {tabBtn("course", "🎓 Browse by Course")}
            {tabBtn("bulk", "📝 Bulk Mark")}
          </div>
        )}

        {/* Admin Tab: Search by Student */}
        {isAdmin && adminTab === "search" && (
          <div className="card p-6 mb-6">
            <h3 className="section-title mb-4">Search by Student</h3>
            <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="form-label">Name / Student ID / Email / Phone</label>
                <input
                  type="text" placeholder="Search by name, STU0001, email or phone…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]) }}
                  className="inp" />
              </div>
              <div>
                <label className="form-label">From Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="inp w-auto" />
              </div>
              <div>
                <label className="form-label">To Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="inp w-auto" />
              </div>
              <button type="submit" className="btn bg-slate-700 hover:bg-slate-800 text-white">Search</button>
              <button type="button" onClick={clearAll} className="btn-ghost">Show All</button>
            </form>

            {searchResults.length > 1 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">{searchResults.length} students found — click one to view attendance:</p>
                <div className="divide-y border border-slate-200 rounded-lg overflow-hidden">
                  {searchResults.map((s) => (
                    <button key={s.id} onClick={() => loadStudentAttendance(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition flex items-center gap-4 text-sm">
                      <span className="font-mono text-xs text-slate-400 w-20 shrink-0">{s.student_code || `#${s.id}`}</span>
                      <span className="font-medium text-slate-800 flex-1">{s.name}</span>
                      <span className="text-slate-400">{s.email || s.phone || ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedStudent && (
              <div className="mt-4 flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 text-sm">
                <span className="font-mono text-xs text-primary-400">{selectedStudent.student_code || `#${selectedStudent.id}`}</span>
                <span className="font-semibold text-primary-800">{selectedStudent.name}</span>
                {selectedStudent.course && <span className="text-primary-500">· {selectedStudent.course}</span>}
              </div>
            )}

            {summary && isAdmin && (
              <div className="mt-4 flex gap-6 text-center">
                <div><p className="text-2xl font-bold text-emerald-600">{summary.attendance_percentage}%</p><p className="text-xs text-slate-500">Attendance</p></div>
                <div><p className="text-2xl font-bold text-primary-600">{summary.present}</p><p className="text-xs text-slate-500">Present</p></div>
                <div><p className="text-2xl font-bold text-slate-600">{summary.total_classes}</p><p className="text-xs text-slate-500">Total Classes</p></div>
              </div>
            )}
          </div>
        )}

        {/* Admin Tab: Browse by Course */}
        {isAdmin && adminTab === "course" && (
          <div className="card p-6 mb-6">
            <div className="flex flex-wrap gap-3 items-end mb-5">
              <div className="flex-1 min-w-[220px]">
                <label className="form-label">Select Course</label>
                <select value={selectedCourse} onChange={handleCourseChange} className="inp bg-white">
                  <option value="">— Select a course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}{c.duration ? ` (${c.duration})` : ""}</option>
                  ))}
                </select>
              </div>
              {selectedCourse && courseStudents.length > 0 && (
                <div className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">{courseStudents.length}</span> students enrolled
                </div>
              )}
            </div>

            {courseLoading ? (
              <LoadingState message="Loading students…" />
            ) : !selectedCourse ? (
              <EmptyState icon="🎓" title="Select a course above to view attendance" />
            ) : courseStudents.length === 0 ? (
              <EmptyState icon="📋" title="No students enrolled in this course" />
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Student ID</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Present</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Total</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Attendance %</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageStudents.map((s, idx) => {
                        const sum = summaries[s.id]
                        const pct = sum?.attendance_percentage ?? null
                        const isExpanded = expandedStudent?.id === s.id
                        return (
                          <>
                            <tr key={s.id} className={`border-t border-slate-100 transition ${isExpanded ? "bg-primary-50" : "hover:bg-slate-50"}`}>
                              <td className="px-4 py-3 text-slate-400 text-xs">{(coursePage - 1) * PAGE_SIZE + idx + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.student_code || `#${s.id}`}</td>
                              <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                              <td className="px-4 py-3 text-primary-600 font-semibold">{sum ? sum.present : summariesLoading ? "…" : "—"}</td>
                              <td className="px-4 py-3 text-slate-500">{sum ? sum.total_classes : summariesLoading ? "…" : "—"}</td>
                              <td className="px-4 py-3">
                                {pct !== null ? (
                                  <div className="flex items-center gap-2">
                                    <AttBar pct={pct} />
                                    <PctBadge pct={pct} />
                                  </div>
                                ) : summariesLoading ? (
                                  <span className="text-xs text-slate-400">Loading…</span>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {pct !== null ? (
                                  <span className={`text-xs font-medium ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                                    {pct >= 75 ? "✅ Good" : pct >= 50 ? "⚠️ Low" : "❌ Critical"}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleExpandStudent(s)}
                                  className={`px-3 py-1 rounded-lg text-xs font-medium transition
                                    ${isExpanded ? "bg-primary-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
                                  {isExpanded ? "Hide ▲" : "View ▼"}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr key={`${s.id}-exp`} className="bg-primary-50 border-t border-primary-100">
                                <td colSpan={8} className="px-6 py-3">
                                  {expandedLoading ? (
                                    <LoadingState message="Loading records…" />
                                  ) : expandedAtt.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-2">No attendance records found.</p>
                                  ) : (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 mb-2">{expandedAtt.length} attendance records</p>
                                      <div className="max-h-52 overflow-y-auto rounded border border-primary-200 bg-white">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                              <th className="text-left px-3 py-2 font-medium text-slate-500">Date</th>
                                              <th className="text-left px-3 py-2 font-medium text-slate-500">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {expandedAtt.map((a) => (
                                              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                                                <td className="px-3 py-1.5 text-slate-700">{a.date}</td>
                                                <td className="px-3 py-1.5">
                                                  <span className={`px-2 py-0.5 rounded-full font-medium text-xs
                                                    ${a.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
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

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      Showing {(coursePage - 1) * PAGE_SIZE + 1}–{Math.min(coursePage * PAGE_SIZE, courseStudents.length)} of {courseStudents.length} students
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCoursePage(1)} disabled={coursePage === 1}
                        className="px-2 py-1 rounded text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-40">«</button>
                      <button onClick={() => setCoursePage(p => p - 1)} disabled={coursePage === 1}
                        className="px-3 py-1 rounded text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-40">‹ Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - coursePage) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push("…")
                          acc.push(p); return acc
                        }, [])
                        .map((p, i) =>
                          p === "…" ? (
                            <span key={`dot-${i}`} className="px-2 py-1 text-slate-400 text-sm">…</span>
                          ) : (
                            <button key={p} onClick={() => setCoursePage(p)}
                              className={`px-3 py-1 rounded text-sm border transition
                                ${p === coursePage ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 hover:bg-slate-100"}`}>
                              {p}
                            </button>
                          )
                        )}
                      <button onClick={() => setCoursePage(p => p + 1)} disabled={coursePage === totalPages}
                        className="px-3 py-1 rounded text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-40">Next ›</button>
                      <button onClick={() => setCoursePage(totalPages)} disabled={coursePage === totalPages}
                        className="px-2 py-1 rounded text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-40">»</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Admin Tab: Bulk Mark */}
        {isAdmin && adminTab === "bulk" && (
          <div className="card p-6 mb-6">
            <h3 className="section-title mb-4">Bulk Mark Attendance</h3>

            <div className="flex flex-wrap gap-3 items-end mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label">Course</label>
                <select value={bulkCourse} onChange={e => { setBulkCourse(e.target.value); setBulkStudents([]); setBulkAttendance({}); setBulkOriginal({}); setBulkSuccess(""); setBulkError("") }}
                  className="inp bg-white">
                  <option value="">— Select a course —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}{c.duration ? ` (${c.duration})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input type="date" value={bulkDate} onChange={e => { setBulkDate(e.target.value); setBulkStudents([]); setBulkAttendance({}); setBulkOriginal({}); setBulkSuccess(""); setBulkError("") }}
                  className="inp w-auto" />
              </div>
              <button onClick={handleLoadBulkStudents} disabled={bulkLoading || !bulkCourse || !bulkDate}
                className="btn bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-50">
                {bulkLoading ? "Loading…" : "Load Students"}
              </button>
            </div>

            {bulkError && <Alert type="error" message={bulkError} className="mb-3" />}
            {bulkSuccess && <Alert type="success" message={bulkSuccess} className="mb-3" />}

            {bulkStudents.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-sm text-slate-500 font-medium">{bulkStudents.length} students · {bulkDate}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { const att = {}; bulkStudents.forEach(s => { att[s.id] = "present" }); setBulkAttendance(att) }}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">All Present</button>
                    <button onClick={() => { const att = {}; bulkStudents.forEach(s => { att[s.id] = "absent" }); setBulkAttendance(att) }}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">All Absent</button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs">
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
                          <tr key={s.id} className={`border-t border-slate-100 ${alreadyMarked ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                            <td className="px-4 py-2 font-mono text-xs text-slate-400">{s.student_code || `#${s.id}`}</td>
                            <td className="px-4 py-2 text-slate-800">
                              {s.name}
                              {alreadyMarked && (
                                <span className="ml-2 text-xs bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Already Marked</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {alreadyMarked ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${bulkOriginal[s.id] === "present" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                                  {bulkOriginal[s.id] === "present" ? "✅ Present" : "❌ Absent"}
                                </span>
                              ) : (
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => setBulkAttendance(prev => ({ ...prev, [s.id]: "present" }))}
                                    className={`px-3 py-1 rounded text-xs font-medium transition
                                      ${status === "present" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-100"}`}>
                                    Present
                                  </button>
                                  <button
                                    onClick={() => setBulkAttendance(prev => ({ ...prev, [s.id]: "absent" }))}
                                    className={`px-3 py-1 rounded text-xs font-medium transition
                                      ${status === "absent" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-red-100"}`}>
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
                  <button onClick={handleBulkSubmit} disabled={bulkSubmitting} className="btn-primary disabled:opacity-50">
                    {bulkSubmitting ? "Submitting…" : `Submit Attendance (${bulkStudents.filter(s => !bulkOriginal[s.id]).length} students)`}
                  </button>
                )}
              </>
            )}

            {!bulkLoading && bulkStudents.length === 0 && bulkCourse && (
              <EmptyState icon="📋" title='Click "Load Students" to fetch students for this course and date.' />
            )}

            {!bulkCourse && (
              <EmptyState icon="📝" title='Select a course and date above, then click "Load Students".' />
            )}
          </div>
        )}

        {/* Student: Date Range Filter */}
        {!isAdmin && (
          <div className="card p-5 mb-6">
            <h3 className="section-title mb-3">📅 Filter by Date Range</h3>
            <form onSubmit={handleApplyDateRange} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="form-label">From</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="inp w-auto" />
              </div>
              <div>
                <label className="form-label">To</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="inp w-auto" />
              </div>
              <button type="submit" className="btn-primary">Apply</button>
              {rangeApplied && (
                <button type="button" onClick={handleClearDateRange} className="btn-ghost">Clear</button>
              )}
            </form>
            {rangeApplied && (
              <div className="mt-4 flex gap-6 flex-wrap">
                <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{rangedPct}%</p><p className="text-xs text-slate-500">In Range</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-primary-600">{presentCount}</p><p className="text-xs text-slate-500">Present</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-red-500">{absentCount}</p><p className="text-xs text-slate-500">Absent</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-slate-600">{filtered.length}</p><p className="text-xs text-slate-500">Total</p></div>
              </div>
            )}
          </div>
        )}

        {/* Filters bar */}
        {(!isAdmin || adminTab === "search") && (
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-slate-600">Filter:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="inp w-auto bg-white">
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="inp w-auto" />
              {(statusFilter !== "all" || dateFilter) && (
                <button onClick={() => { setStatusFilter("all"); setDateFilter("") }} className="btn-ghost">Clear</button>
              )}
              <p className="text-sm text-slate-400 ml-auto">{filtered.length} of {attendance.length} records</p>
            </div>
          </div>
        )}

        {/* Student: Attendance Summary */}
        {!isAdmin && summary && !rangeApplied && (
          <div className="card p-6 mb-6">
            <h3 className="section-title mb-4">My Attendance Summary</h3>
            <div className="flex gap-8 text-center mb-4">
              <div><p className="text-3xl font-bold text-emerald-600">{summary.attendance_percentage}%</p><p className="text-sm text-slate-500">Attendance</p></div>
              <div><p className="text-3xl font-bold text-primary-600">{summary.present}</p><p className="text-sm text-slate-500">Present</p></div>
              <div><p className="text-3xl font-bold text-slate-600">{summary.total_classes}</p><p className="text-sm text-slate-500">Total Classes</p></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all duration-500
                ${summary.attendance_percentage >= 75 ? "bg-emerald-500" : summary.attendance_percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${summary.attendance_percentage}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {summary.attendance_percentage >= 75 ? "✅ Good attendance!" : summary.attendance_percentage >= 50 ? "⚠️ Below recommended 75%" : "❌ Critical — attendance very low!"}
            </p>
          </div>
        )}

        {/* Student: Subject-wise Attendance */}
        {!isAdmin && subjectSummary.length > 0 && (
          <div className="card p-6 mb-6">
            <h3 className="section-title mb-4">Subject-wise Attendance</h3>
            <div className="space-y-3">
              {subjectSummary.map((s) => (
                <div key={s.subject_id ?? "general"} className="flex items-center gap-4">
                  <div className="w-36 text-sm font-medium text-slate-700 truncate">{s.subject_name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all duration-500 ${s.percentage >= 75 ? "bg-emerald-500" : s.percentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${s.percentage}%` }} />
                  </div>
                  <div className="text-sm font-semibold w-12 text-right">{s.percentage}%</div>
                  <div className="text-xs text-slate-400 w-24 text-right">{s.present}/{s.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Records Table */}
        {(!isAdmin || adminTab === "search") && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-6"><LoadingState message="Loading attendance…" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon="📋" title="No attendance records found." />
            ) : (
              <>
                {/* Header row with count */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">
                    {isAdmin && selectedStudent
                      ? `${selectedStudent.name}'s Records`
                      : "Attendance Records"}
                  </span>
                  <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {isAdmin && <th>Student ID</th>}
                        <th>Date</th>
                        {!isAdmin && <th>Subject</th>}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered
                        .slice((attPage - 1) * ATT_PAGE_SIZE, attPage * ATT_PAGE_SIZE)
                        .map((a) => (
                          <tr key={a.id}>
                            {isAdmin && <td className="font-mono text-xs text-slate-400">{a.student_id}</td>}
                            <td className="font-medium">{a.date}</td>
                            {!isAdmin && <td>{a.subject_name || a.subject_id || "—"}</td>}
                            <td>
                              <span className={`badge ${a.status === "present" ? "badge-green" : "badge-red"}`}>
                                {a.status === "present" ? "✅ Present" : "❌ Absent"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  page={attPage}
                  total={filtered.length}
                  pageSize={ATT_PAGE_SIZE}
                  onChange={setAttPage}
                />
              </>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
