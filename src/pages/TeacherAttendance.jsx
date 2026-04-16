import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { getCoursesAPI, getSubjectsByCourseAPI, getStudentsByCourseAPI, markAttendanceBulkAPI, getStudentAttendanceAPI } from "../api"

export default function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState("mark")

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
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

function MarkAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)   // full course object
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null) // full subject object
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    getCoursesAPI().then((r) => setCourses(r.data.courses)).catch(() => {})
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t) }
  }, [success])

  async function handleCourseChange(e) {
    const courseId = e.target.value
    if (!courseId) { setSelectedCourse(null); setSubjects([]); setSelectedSubject(null); setStudents([]); return }
    const course = courses.find((c) => c.id === parseInt(courseId))
    setSelectedCourse(course)
    setSelectedSubject(null)
    setStudents([])
    setAttendance({})
    setLoadingSubjects(true)
    try {
      const res = await getSubjectsByCourseAPI(courseId)
      setSubjects(res.data.subjects)
    } catch { setError("Failed to load subjects") }
    finally { setLoadingSubjects(false) }
  }

  async function handleSubjectChange(e) {
    const subjectId = e.target.value
    if (!subjectId) { setSelectedSubject(null); setStudents([]); return }
    const subject = subjects.find((s) => s.id === parseInt(subjectId))
    setSelectedSubject(subject)
    setStudents([])
    setAttendance({})
    setError("")
  }

  async function loadStudents(e) {
    e.preventDefault()
    setError(""); setSuccess("")
    if (!selectedCourse) { setError("Please select a course"); return }
    if (!selectedSubject) { setError("Please select a subject"); return }
    if (!date) { setError("Please select a date"); return }
    setLoadingStudents(true)
    try {
      const res = await getStudentsByCourseAPI(selectedCourse.name)
      const list = res.data.students
      if (list.length === 0) { setError(`No students found in course "${selectedCourse.name}"`); return }
      setStudents(list)
      const def = {}
      list.forEach((s) => { def[s.id] = "present" })
      setAttendance(def)
    } catch { setError("Failed to load students") }
    finally { setLoadingStudents(false) }
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
    setError(""); setSuccess(""); setSubmitting(true)
    try {
      const records = students.map((s) => ({
        student_id: s.id,
        date,
        status: attendance[s.id] || "absent",
        subject_id: selectedSubject.id
      }))
      const res = await markAttendanceBulkAPI(records)
      setSuccess(
        `Attendance saved! ${res.data.marked} marked, ${res.data.updated} updated` +
        (res.data.sms_sent > 0 ? ` · ${res.data.sms_sent} SMS sent` : "")
      )
      setStudents([])
      setSelectedCourse(null)
      setSelectedSubject(null)
      setSubjects([])
    } catch (err) { setError(err.response?.data?.detail || "Failed to save attendance") }
    finally { setSubmitting(false) }
  }

  const presentCount = Object.values(attendance).filter((s) => s === "present").length
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Select Date, Course & Subject</h3>
        <form onSubmit={loadStudents} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <select onChange={handleSubjectChange} value={selectedSubject?.id || ""} disabled={!selectedCourse || loadingSubjects}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50">
              <option value="">{loadingSubjects ? "Loading..." : "Select subject"}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.teacher_name ? ` — ${s.teacher_name}` : ""}</option>)}
            </select>
            {selectedCourse && subjects.length === 0 && !loadingSubjects && (
              <p className="text-xs text-orange-500 mt-1">No subjects found. Add subjects in Courses page.</p>
            )}
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={loadingStudents}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium">
              {loadingStudents ? "Loading..." : "Load Students"}
            </button>
          </div>
        </form>

        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
        {success && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-700">
                {students.length} Students — {selectedCourse?.name} / {selectedSubject?.name} — {date}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Present: {presentCount} | Absent: {absentCount}
                {students.filter(s => s.is_additional).length > 0 && (
                  <span className="ml-3 text-indigo-500">
                    · {students.filter(s => !s.is_additional).length} primary + {students.filter(s => s.is_additional).length} additional course students
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markAll("present")} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition">All Present</button>
              <button onClick={() => markAll("absent")} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition">All Absent</button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Course</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const isPresent = attendance[s.id] === "present"
                return (
                  <tr key={s.id} className={`border-t transition ${isPresent ? "bg-green-50" : "bg-red-50"}`}>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{s.student_code || s.id}</td>
                    <td className="px-5 py-3 font-medium">
                      {s.name}
                      {s.is_additional && (
                        <span className="ml-2 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-medium" title="Enrolled in this as an additional course">
                          +Add
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${s.is_additional ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-700"}`}>
                        {s.is_additional ? `${selectedCourse?.name} (+)` : s.course || selectedCourse?.name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPresent ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {isPresent ? "Present" : "Absent"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleAttendance(s.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${isPresent ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        Mark {isPresent ? "Absent" : "Present"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="p-5 border-t flex justify-end">
            <button onClick={handleSubmit} disabled={submitting}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
              {submitting ? "Saving..." : "Submit Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewAttendance() {
  const [studentId, setStudentId] = useState("")
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
  const total = records.length
  const pct = total > 0 ? ((present / total) * 100).toFixed(1) : 0

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
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
      </div>

      {records.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[["Total Classes", total, "blue"], ["Present", present, "green"], ["Percentage", `${pct}%`, "purple"]].map(([label, val, color]) => (
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
                  <th className="text-left px-5 py-3">Subject ID</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-5 py-3">{r.date}</td>
                    <td className="px-5 py-3 text-gray-500">{r.subject_id || "—"}</td>
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
