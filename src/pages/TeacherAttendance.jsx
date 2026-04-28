import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { Alert, LoadingState, TabBar } from "../components/UI"
import {
  getCoursesAPI,
  getStudentsByCourseAPI,
  markAttendanceBulkAPI,
  checkAttendanceBulkAPI,
  getStudentAttendanceAPI,
} from "../api"

export default function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState("mark")

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <h2 className="text-xl font-bold text-slate-800 mb-5">Attendance</h2>
        <div className="mb-5">
          <TabBar
            tabs={[{ key: "mark", label: "Mark Attendance" }, { key: "view", label: "View Attendance" }]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === "mark" && <MarkAttendance />}
        {activeTab === "view" && <ViewAttendance />}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
function MarkAttendance() {
  const [date, setDate]                   = useState(new Date().toISOString().split("T")[0])
  const [courses, setCourses]             = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents]           = useState([])
  const [attendance, setAttendance]       = useState({})
  const [originalStatus, setOriginalStatus] = useState({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState("")
  const [success, setSuccess]             = useState("")

  useEffect(() => {
    getCoursesAPI().then((r) => setCourses(r.data.courses)).catch(() => {})
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 5000); return () => clearTimeout(t) }
  }, [success])

  function handleCourseChange(e) {
    const courseId = e.target.value
    if (!courseId) {
      setSelectedCourse(null); setStudents([]); setAttendance({}); setOriginalStatus({})
      return
    }
    setSelectedCourse(courses.find((c) => c.id === parseInt(courseId)) || null)
    setStudents([]); setAttendance({}); setOriginalStatus({})
  }

  async function loadStudents(e) {
    e.preventDefault()
    setError(""); setSuccess("")
    if (!selectedCourse) { setError("Please select a course"); return }
    if (!date)           { setError("Please select a date");   return }

    setLoadingStudents(true)
    try {
      const studRes = await getStudentsByCourseAPI(selectedCourse.name)
      const list    = studRes.data.students
      if (list.length === 0) { setError(`No students found in course "${selectedCourse.name}"`); return }

      const ids      = list.map((s) => s.id)
      const checkRes = await checkAttendanceBulkAPI({ date, student_ids: ids })
      const existingMap = {}
      checkRes.data.records.forEach((r) => { existingMap[r.student_id] = r.status })

      const initial = {}
      list.forEach((s) => { initial[s.id] = existingMap[s.id] ?? "present" })

      setStudents(list)
      setAttendance(initial)
      setOriginalStatus(existingMap)
    } catch {
      setError("Failed to load students")
    } finally {
      setLoadingStudents(false)
    }
  }

  function toggleAttendance(id) {
    setAttendance((prev) => ({ ...prev, [id]: prev[id] === "present" ? "absent" : "present" }))
  }

  function markAll(status) {
    const upd = {}
    students.forEach((s) => { upd[s.id] = status })
    setAttendance(upd)
  }

  async function handleSubmit() {
    const changed = students.filter((s) => {
      const orig = originalStatus[s.id]
      return orig === undefined || orig !== attendance[s.id]
    })

    if (changed.length === 0) {
      setSuccess("Nothing to save — all attendance is already up to date.")
      return
    }

    setError(""); setSubmitting(true)
    try {
      const records = changed.map((s) => ({ student_id: s.id, date, status: attendance[s.id] }))
      const res = await markAttendanceBulkAPI(records)

      const parts = []
      if (res.data.marked  > 0) parts.push(`${res.data.marked} new`)
      if (res.data.updated > 0) parts.push(`${res.data.updated} updated`)
      const smsPart = res.data.sms_sent > 0 ? ` · ${res.data.sms_sent} SMS sent to parents` : ""
      setSuccess(`Saved! ${parts.join(", ")}${smsPart}`)

      const newOrig = { ...originalStatus }
      changed.forEach((s) => { newOrig[s.id] = attendance[s.id] })
      setOriginalStatus(newOrig)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save attendance")
    } finally {
      setSubmitting(false)
    }
  }

  const presentCount  = students.filter((s) => attendance[s.id] === "present").length
  const absentCount   = students.filter((s) => attendance[s.id] === "absent").length
  const newCount      = students.filter((s) => originalStatus[s.id] === undefined).length
  const editedCount   = students.filter((s) => {
    const orig = originalStatus[s.id]
    return orig !== undefined && orig !== attendance[s.id]
  }).length
  const unchangedCount = students.filter((s) => {
    const orig = originalStatus[s.id]
    return orig !== undefined && orig === attendance[s.id]
  }).length
  const toSubmitCount = newCount + editedCount
  const alreadyMarkedCount = students.filter((s) => originalStatus[s.id] !== undefined).length

  return (
    <div className="space-y-5">

      {/* ── Selection form ── */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Select Date &amp; Course</h3>
        <form onSubmit={loadStudents} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="form-label">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="form-label">Course *</label>
            <select onChange={handleCourseChange} value={selectedCourse?.id || ""} className="inp">
              <option value="">Select course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={loadingStudents} className="btn-primary w-full">
              {loadingStudents ? "Loading…" : "Load Students"}
            </button>
          </div>
        </form>

        {error   && <div className="mt-3"><Alert type="error"   message={error}   onClose={() => setError("")} /></div>}
        {success && <div className="mt-3"><Alert type="success" message={success} onClose={() => setSuccess("")} /></div>}
      </div>

      {/* ── Student table ── */}
      {students.length > 0 && (
        <div className="card overflow-hidden">

          {/* Header bar */}
          <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-start gap-3">
            <div>
              <h3 className="section-title">
                {students.length} Students — {selectedCourse?.name} — {date}
              </h3>
              <p className="text-sm text-slate-400 mt-1 flex flex-wrap gap-3">
                <span className="text-green-600 font-medium">✓ {presentCount} present</span>
                <span className="text-red-500 font-medium">✗ {absentCount} absent</span>
                {alreadyMarkedCount > 0 && (
                  <span className="text-blue-500">
                    · {alreadyMarkedCount} already marked
                    {editedCount > 0 && <span className="text-orange-500 ml-1">({editedCount} edited)</span>}
                    {unchangedCount > 0 && <span className="text-slate-400 ml-1">({unchangedCount} unchanged)</span>}
                  </span>
                )}
                {students.filter((s) => s.is_additional).length > 0 && (
                  <span className="text-indigo-500">
                    · {students.filter((s) => !s.is_additional).length} primary
                    + {students.filter((s) => s.is_additional).length} additional
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => markAll("present")} className="btn-success text-xs px-3 py-1.5">All Present</button>
              <button onClick={() => markAll("absent")}  className="btn-danger text-xs px-3 py-1.5">All Absent</button>
            </div>
          </div>

          {/* ── Mobile card list (shown on small screens) ── */}
          <div className="md:hidden divide-y divide-slate-100">
            {students.map((s) => {
              const isPresent   = attendance[s.id] === "present"
              const orig        = originalStatus[s.id]
              const isNew       = orig === undefined
              const isEdited    = !isNew && orig !== attendance[s.id]
              const isUnchanged = !isNew && !isEdited

              return (
                <div key={s.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 transition
                    ${isUnchanged
                      ? (isPresent ? "bg-green-50/50" : "bg-red-50/50")
                      : (isPresent ? "bg-green-50"    : "bg-red-50")}`}>

                  {/* Left: student info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                      {s.is_additional && (
                        <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-medium">+Add</span>
                      )}
                      {isEdited && (
                        <span className="badge badge-yellow text-[10px]">edited</span>
                      )}
                      {isUnchanged && (
                        <span className="badge badge-blue text-[10px]">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{s.student_code || `#${s.id}`}</p>
                  </div>

                  {/* Right: status badge + big toggle button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${isPresent ? "badge-green" : "badge-red"}`}>
                      {isPresent ? "P" : "A"}
                    </span>
                    <button
                      onClick={() => toggleAttendance(s.id)}
                      className={`min-w-[96px] py-2 px-3 rounded-lg text-sm font-semibold transition active:scale-95
                        ${isPresent
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}>
                      {isPresent ? "Mark Absent" : "Mark Present"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Desktop table (hidden on mobile) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Mark State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isPresent   = attendance[s.id] === "present"
                  const orig        = originalStatus[s.id]
                  const isNew       = orig === undefined
                  const isEdited    = !isNew && orig !== attendance[s.id]
                  const isUnchanged = !isNew && !isEdited

                  const rowBg = isUnchanged
                    ? (isPresent ? "bg-green-50/60" : "bg-red-50/60")
                    : (isPresent ? "bg-green-50"    : "bg-red-50")

                  return (
                    <tr key={s.id} className={`border-b border-slate-100 transition ${rowBg}`}>
                      <td className="text-slate-400 font-mono text-xs">{s.student_code || s.id}</td>
                      <td className="font-medium text-slate-800">
                        {s.name}
                        {s.is_additional && (
                          <span className="ml-2 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-medium">+Add</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${s.is_additional ? "badge-purple" : "badge-blue"}`}>
                          {s.is_additional ? `${selectedCourse?.name} (+)` : (s.course || selectedCourse?.name)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isPresent ? "badge-green" : "badge-red"}`}>
                          {isPresent ? "Present" : "Absent"}
                        </span>
                      </td>
                      <td>
                        {isNew       && <span className="badge badge-gray">New</span>}
                        {isUnchanged && <span className="badge badge-blue">✓ Marked</span>}
                        {isEdited    && (
                          <span className="badge badge-yellow">
                            ✏️ Edited ({orig} → {attendance[s.id]})
                          </span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => toggleAttendance(s.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            isPresent ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}>
                          Mark {isPresent ? "Absent" : "Present"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {toSubmitCount === 0
                ? "No changes — nothing to submit"
                : <>Will submit <strong>{toSubmitCount}</strong> record{toSubmitCount !== 1 ? "s" : ""}
                    {newCount > 0      && <span className="ml-1 text-slate-600">({newCount} new{editedCount > 0 ? `, ${editedCount} edited` : ""})</span>}
                    {editedCount > 0 && newCount === 0 && <span className="ml-1 text-slate-600">({editedCount} edited)</span>}
                    {unchangedCount > 0 && <span className="ml-1 text-slate-400">· {unchangedCount} unchanged skipped</span>}
                  </>
              }
            </p>
            <button onClick={handleSubmit} disabled={submitting || toSubmitCount === 0} className="btn-primary">
              {submitting ? "Saving…" : toSubmitCount === 0 ? "Nothing to Save" : `Submit (${toSubmitCount})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
function ViewAttendance() {
  const [studentId, setStudentId] = useState("")
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")

  async function handleSearch(e) {
    e.preventDefault()
    if (!studentId) { setError("Enter a student ID"); return }
    setLoading(true); setError("")
    try {
      const res = await getStudentAttendanceAPI(studentId)
      setRecords(res.data.attendance)
      if (res.data.attendance.length === 0) setError("No attendance records found for this student")
    } catch { setError("Failed to load attendance") }
    finally { setLoading(false) }
  }

  const present = records.filter((r) => r.status === "present").length
  const total   = records.length
  const pct     = total > 0 ? ((present / total) * 100).toFixed(1) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="section-title mb-3">View Student Attendance</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input type="number" placeholder="Student ID" value={studentId} min="1"
            onChange={(e) => { setStudentId(e.target.value); setError("") }}
            className="inp w-40" />
          <button type="submit" disabled={loading} className="btn-ghost">
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
        {error && <div className="mt-3"><Alert type="error" message={error} onClose={() => setError("")} /></div>}
      </div>

      {records.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[["Total Classes", total, "border-blue-500", "text-blue-600"],
              ["Present", present, "border-green-500", "text-green-600"],
              [`${pct}%`, "Attendance", "border-purple-500", "text-purple-600"]].map(([val, label, border, text]) => (
              <div key={label} className={`card p-5 border-l-4 ${border}`}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold ${text}`}>{val}</p>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      <span className={`badge ${r.status === "present" ? "badge-green" : "badge-red"}`}>
                        {r.status === "present" ? "Present" : "Absent"}
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
