import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
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
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Attendance</h2>
        <div className="bg-white rounded-xl shadow mb-5">
          <div className="flex border-b">
            {[{ key: "mark", label: "Mark Attendance" }, { key: "view", label: "View Attendance" }].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
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

// ─────────────────────────────────────────────────────────────────────────────
// MARK ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
function MarkAttendance() {
  const [date, setDate]                   = useState(new Date().toISOString().split("T")[0])
  const [courses, setCourses]             = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents]           = useState([])
  const [attendance, setAttendance]       = useState({})  // current toggled status
  const [originalStatus, setOriginalStatus] = useState({}) // status already in DB (undefined = not yet marked)
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
      // 1 — Load all students for this course (primary + additional)
      const studRes = await getStudentsByCourseAPI(selectedCourse.name)
      const list    = studRes.data.students
      if (list.length === 0) {
        setError(`No students found in course "${selectedCourse.name}"`)
        return
      }

      // 2 — Check which students already have attendance recorded for this date
      const ids      = list.map((s) => s.id)
      const checkRes = await checkAttendanceBulkAPI({ date, student_ids: ids })
      const existingMap = {}
      checkRes.data.records.forEach((r) => { existingMap[r.student_id] = r.status })

      // 3 — Initialise attendance:
      //     already-marked → use their DB status
      //     not yet marked  → default "present"
      const initial = {}
      list.forEach((s) => { initial[s.id] = existingMap[s.id] ?? "present" })

      setStudents(list)
      setAttendance(initial)
      setOriginalStatus(existingMap)   // only students that are already in the DB
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
    // Only submit students whose status has actually changed:
    //   • never-marked (not in originalStatus) → always include (first mark → SMS)
    //   • already-marked but status changed    → include (edit → no SMS)
    //   • already-marked and status unchanged  → SKIP (no DB write, no SMS)
    const changed = students.filter((s) => {
      const orig = originalStatus[s.id]   // undefined if not yet marked
      return orig === undefined || orig !== attendance[s.id]
    })

    if (changed.length === 0) {
      setSuccess("Nothing to save — all attendance is already up to date.")
      return
    }

    setError(""); setSubmitting(true)
    try {
      const records = changed.map((s) => ({
        student_id: s.id,
        date,
        status: attendance[s.id],
      }))
      const res = await markAttendanceBulkAPI(records)

      // Build success message
      const parts = []
      if (res.data.marked  > 0) parts.push(`${res.data.marked} new`)
      if (res.data.updated > 0) parts.push(`${res.data.updated} updated`)
      const smsPart = res.data.sms_sent > 0 ? ` · ${res.data.sms_sent} SMS sent to parents` : ""
      setSuccess(`Saved! ${parts.join(", ")}${smsPart}`)

      // Reflect the saved state back into originalStatus so re-submitting
      // without further changes shows "nothing to save"
      const newOrig = { ...originalStatus }
      changed.forEach((s) => { newOrig[s.id] = attendance[s.id] })
      setOriginalStatus(newOrig)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save attendance")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived counts ─────────────────────────────────────────────────────────
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

      {/* ── Selection form ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Select Date &amp; Course</h3>
        <form onSubmit={loadStudents} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Course *</label>
            <select onChange={handleCourseChange} value={selectedCourse?.id || ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={loadingStudents}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium">
              {loadingStudents ? "Loading…" : "Load Students"}
            </button>
          </div>
        </form>

        {error   && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
        {success && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
      </div>

      {/* ── Student table ────────────────────────────────────────────────────── */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">

          {/* Header bar */}
          <div className="p-5 border-b flex flex-wrap justify-between items-start gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-700">
                {students.length} Students — {selectedCourse?.name} — {date}
              </h3>

              {/* Attendance counts */}
              <p className="text-sm text-gray-400 mt-1 flex flex-wrap gap-3">
                <span className="text-green-600 font-medium">✓ {presentCount} present</span>
                <span className="text-red-500 font-medium">✗ {absentCount} absent</span>
                {alreadyMarkedCount > 0 && (
                  <span className="text-blue-500">
                    · {alreadyMarkedCount} already marked
                    {editedCount > 0 && <span className="text-orange-500 ml-1">({editedCount} edited)</span>}
                    {unchangedCount > 0 && <span className="text-gray-400 ml-1">({unchangedCount} unchanged)</span>}
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

            {/* Bulk actions */}
            <div className="flex gap-2">
              <button onClick={() => markAll("present")}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition">
                All Present
              </button>
              <button onClick={() => markAll("absent")}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition">
                All Absent
              </button>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs uppercase">
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Mark State</th>
                <th className="text-left px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const isPresent   = attendance[s.id] === "present"
                const orig        = originalStatus[s.id]          // undefined → not yet marked
                const isNew       = orig === undefined
                const isEdited    = !isNew && orig !== attendance[s.id]
                const isUnchanged = !isNew && !isEdited

                // Row tint: full colour for new rows, muted for unchanged already-marked
                const rowBg = isUnchanged
                  ? (isPresent ? "bg-green-50/60" : "bg-red-50/60")
                  : (isPresent ? "bg-green-50"    : "bg-red-50")

                return (
                  <tr key={s.id} className={`border-t transition ${rowBg}`}>

                    {/* ID */}
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                      {s.student_code || s.id}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {s.name}
                      {s.is_additional && (
                        <span className="ml-2 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-medium"
                          title="Enrolled via additional course">
                          +Add
                        </span>
                      )}
                    </td>

                    {/* Course type */}
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.is_additional ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-700"
                      }`}>
                        {s.is_additional ? `${selectedCourse?.name} (+)` : (s.course || selectedCourse?.name)}
                      </span>
                    </td>

                    {/* Current status */}
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isPresent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {isPresent ? "Present" : "Absent"}
                      </span>
                    </td>

                    {/* Mark state badge */}
                    <td className="px-5 py-3">
                      {isNew && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          New
                        </span>
                      )}
                      {isUnchanged && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600 flex items-center gap-1 w-fit">
                          ✓ Already Marked
                        </span>
                      )}
                      {isEdited && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600 flex items-center gap-1 w-fit">
                          ✏️ Edited
                          <span className="text-gray-400 font-normal">
                            ({orig} → {attendance[s.id]})
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Toggle */}
                    <td className="px-5 py-3">
                      <button onClick={() => toggleAttendance(s.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          isPresent
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}>
                        Mark {isPresent ? "Absent" : "Present"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer — submit */}
          <div className="p-5 border-t flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {toSubmitCount === 0
                ? "No changes — nothing to submit"
                : <>
                    Will submit <strong>{toSubmitCount}</strong> record{toSubmitCount !== 1 ? "s" : ""}
                    {newCount > 0      && <span className="ml-1 text-gray-600">({newCount} new{editedCount > 0 ? `, ${editedCount} edited` : ""})</span>}
                    {editedCount > 0 && newCount === 0 && <span className="ml-1 text-gray-600">({editedCount} edited)</span>}
                    {unchangedCount > 0 && <span className="ml-1 text-gray-400">· {unchangedCount} unchanged skipped</span>}
                  </>
              }
            </p>
            <button onClick={handleSubmit} disabled={submitting || toSubmitCount === 0}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
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
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-3">View Student Attendance</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input type="number" placeholder="Student ID" value={studentId} min="1"
            onChange={(e) => { setStudentId(e.target.value); setError("") }}
            className="border border-gray-300 rounded-lg px-4 py-2 w-40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm">
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
      </div>

      {records.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[["Total Classes", total, "blue"], ["Present", present, "green"], ["Attendance %", `${pct}%`, "purple"]].map(([label, val, color]) => (
              <div key={label} className={`bg-white rounded-xl shadow p-5 border-l-4 border-${color}-500`}>
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-2xl font-bold text-${color}-600`}>{val}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-5 py-3">{r.date}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === "present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
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
