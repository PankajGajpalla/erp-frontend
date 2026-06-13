import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getGradesAPI, addGradeAPI, deleteGradeAPI,
  getCoursesAPI, getSubjectsByCourseAPI, getStudentsByCourseAPI,
} from "../api"
import ReportCardModal from "../components/ReportCardModal"

// ── Helpers ───────────────────────────────────────────────────
function gradeColor(grade) {
  const map = { "A+": "bg-green-100 text-green-700", "A": "bg-green-100 text-green-600", "B": "bg-blue-100 text-blue-700", "C": "bg-yellow-100 text-yellow-700", "D": "bg-orange-100 text-orange-700", "F": "bg-red-100 text-red-700" }
  return map[grade] || "bg-gray-100 text-gray-700"
}
function pctColor(pct)  { return pct >= 75 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600" }
function barColor(pct)  { return pct >= 75 ? "bg-green-500"   : pct >= 50 ? "bg-yellow-500"   : "bg-red-500" }
function overallGrade(pct) {
  if (pct >= 90) return { grade: "A+", color: "text-green-600" }
  if (pct >= 80) return { grade: "A",  color: "text-green-500" }
  if (pct >= 70) return { grade: "B",  color: "text-blue-600" }
  if (pct >= 60) return { grade: "C",  color: "text-yellow-600" }
  if (pct >= 50) return { grade: "D",  color: "text-orange-600" }
  return           { grade: "F",  color: "text-red-600" }
}
function groupBySubject(grades) {
  const map = {}
  for (const g of grades) {
    if (!map[g.subject]) map[g.subject] = []
    map[g.subject].push(g)
  }
  return map
}

// ── Step badge (Add Grades) ────────────────────────────────────
function StepBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? "text-blue-600 font-semibold" : done ? "text-green-600" : "text-gray-400"}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
        ${active ? "border-blue-600 text-blue-600" : done ? "border-green-500 bg-green-500 text-white" : "border-gray-300 text-gray-400"}`}>
        {done ? "✓" : n}
      </span>
      {label}
    </div>
  )
}

// ── Add Grades (bulk — same as teacher) ───────────────────────
function AddGrades() {
  const [courses, setCourses]   = useState([])
  const [subjects, setSubjects] = useState([])

  const [testTitle, setTestTitle]           = useState("")
  const [testDate, setTestDate]             = useState(new Date().toISOString().split("T")[0])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [totalMarks, setTotalMarks]         = useState("")

  const [students, setStudents] = useState([])
  const [marks, setMarks]       = useState({})
  const [absent, setAbsent]     = useState({})

  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")

  const step = students.length > 0 ? 3 : 1

  useEffect(() => {
    getCoursesAPI().then((r) => setCourses(r.data.courses)).catch(() => {})
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 5000); return () => clearTimeout(t) }
  }, [success])

  async function handleCourseChange(e) {
    const id = e.target.value
    if (!id) { setSelectedCourse(null); setSubjects([]); setSelectedSubject(null); return }
    const c = courses.find((c) => c.id === parseInt(id))
    setSelectedCourse(c); setSelectedSubject(null); setSubjects([]); setStudents([]); setMarks({})
    setLoadingSubjects(true)
    try {
      const res = await getSubjectsByCourseAPI(id)
      setSubjects(res.data.subjects)
    } catch { setError("Failed to load subjects") }
    finally { setLoadingSubjects(false) }
  }

  function handleSubjectChange(e) {
    const id = e.target.value
    if (!id) { setSelectedSubject(null); return }
    setSelectedSubject(subjects.find((s) => s.id === parseInt(id)) || null)
    setStudents([]); setMarks({})
  }

  async function handleLoadStudents(e) {
    e.preventDefault()
    setError(""); setSuccess("")
    if (!testTitle.trim())     { setError("Test title is required"); return }
    if (!selectedCourse)       { setError("Please select a course"); return }
    if (!selectedSubject)      { setError("Please select a subject"); return }
    if (!totalMarks || parseFloat(totalMarks) <= 0) { setError("Total marks must be greater than 0"); return }
    setLoadingStudents(true)
    try {
      const res = await getStudentsByCourseAPI(selectedCourse.name)
      const list = res.data.students
      if (list.length === 0) { setError(`No students found in "${selectedCourse.name}"`); return }
      setStudents(list)
      const def = {}, abs = {}
      list.forEach((s) => { def[s.id] = ""; abs[s.id] = false })
      setMarks(def); setAbsent(abs)
    } catch { setError("Failed to load students") }
    finally { setLoadingStudents(false) }
  }

  function toggleAbsent(id) {
    setAbsent((prev) => ({ ...prev, [id]: !prev[id] }))
    if (!absent[id]) setMarks((prev) => ({ ...prev, [id]: "" }))
  }

  async function handleSave() {
    setError(""); setSuccess("")
    const missing  = students.filter((s) => !absent[s.id] && (marks[s.id] === "" || marks[s.id] === undefined))
    if (missing.length > 0) { setError(`Enter marks for all ${missing.length} remaining students (or skip them)`); return }
    const invalid  = students.filter((s) => !absent[s.id] && parseFloat(marks[s.id]) > parseFloat(totalMarks))
    if (invalid.length > 0) { setError(`Marks exceed total (${totalMarks}) for: ${invalid.map((s) => s.name).join(", ")}`); return }
    const negative = students.filter((s) => !absent[s.id] && parseFloat(marks[s.id]) < 0)
    if (negative.length > 0) { setError("Marks cannot be negative"); return }

    setSaving(true); setSaveProgress(0)
    let saved = 0, failed = 0, skippedAbsent = 0
    for (const s of students) {
      if (absent[s.id]) { skippedAbsent++; setSaveProgress(Math.round(((saved + skippedAbsent) / students.length) * 100)); continue }
      try {
        await addGradeAPI({ student_id: s.id, subject: selectedSubject.name, marks: parseFloat(marks[s.id]), total_marks: parseFloat(totalMarks), test_title: testTitle.trim(), test_date: testDate.split("-").reverse().join("-") })
        saved++; setSaveProgress(Math.round(((saved + skippedAbsent) / students.length) * 100))
      } catch { failed++ }
    }
    setSaving(false); setSaveProgress(0)
    if (failed === 0) {
      const absentNote = skippedAbsent > 0 ? ` · ${skippedAbsent} skipped` : ""
      setSuccess(`Grades saved for ${saved} students — ${testTitle} / ${selectedSubject.name}${absentNote}`)
      setStudents([]); setMarks({}); setAbsent({}); setTestTitle(""); setTestDate(new Date().toISOString().split("T")[0]); setSelectedCourse(null); setSelectedSubject(null); setSubjects([]); setTotalMarks("")
    } else {
      setError(`${saved} saved, ${failed} failed. Check and retry.`)
    }
  }

  const filledCount  = students.filter((s) => !absent[s.id] && marks[s.id] !== "").length
  const absentCount  = students.filter((s) => absent[s.id]).length
  const invalidCount = students.filter((s) => !absent[s.id] && marks[s.id] !== "" && parseFloat(marks[s.id]) > parseFloat(totalMarks)).length

  return (
    <div className="space-y-5">
      {/* Steps header */}
      <div className="card p-4 flex gap-6 flex-wrap">
        <StepBadge n={1} label="Test Details"  active={step === 1} done={step > 1} />
        <span className="text-gray-300 self-center">—</span>
        <StepBadge n={2} label="Load Students" active={step === 1} done={step > 1} />
        <span className="text-gray-300 self-center">—</span>
        <StepBadge n={3} label="Enter Marks"   active={step === 3} done={false} />
      </div>

      {/* Step 1 & 2: Test details */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">Test Details</h3>
        <form onSubmit={handleLoadStudents}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Test Title *</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Unit Test 1, Mid Term Exam, Final Exam"
                className="inp" />
            </div>
            <div>
              <label className="form-label">Test Date *</label>
              <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)}
                className="inp" />
            </div>
            <div>
              <label className="form-label">Course *</label>
              <select value={selectedCourse?.id || ""} onChange={handleCourseChange}
                className="inp">
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Subject *</label>
              <select value={selectedSubject?.id || ""} onChange={handleSubjectChange}
                disabled={!selectedCourse || loadingSubjects}
                className="inp">
                <option value="">{loadingSubjects ? "Loading subjects..." : "Select subject"}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.teacher_name ? ` — ${s.teacher_name}` : ""}</option>)}
              </select>
              {selectedCourse && subjects.length === 0 && !loadingSubjects && (
                <p className="text-xs text-orange-500 mt-1">No subjects in this course. Add from the Courses page.</p>
              )}
            </div>
            <div>
              <label className="form-label">Total Marks *</label>
              <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 100" min="1"
                className="inp" />
            </div>
          </div>
          {error   && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
          {success && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
          <button type="submit" disabled={loadingStudents}
            className="btn-primary">
            {loadingStudents ? "Loading students..." : "Load Students →"}
          </button>
        </form>
      </div>

      {/* Step 3: Marks entry */}
      {students.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b bg-blue-50">
            <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Test</p><p className="font-bold text-gray-800">{testTitle}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Date</p><p className="font-semibold text-gray-700">{testDate.split("-").reverse().join("-")}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Course</p><p className="font-semibold text-gray-700">{selectedCourse?.name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Subject</p><p className="font-semibold text-gray-700">{selectedSubject?.name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Total Marks</p><p className="font-semibold text-gray-700">{totalMarks}</p></div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">{filledCount} / {students.length - absentCount} filled</p>
                {absentCount > 0 && <p className="text-xs text-orange-500 font-medium">{absentCount} skipped</p>}
                {invalidCount > 0 && <p className="text-xs text-red-600 font-medium">{invalidCount} exceed total!</p>}
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs uppercase">
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-left px-5 py-3">Marks (out of {totalMarks})</th>
                <th className="text-left px-5 py-3">%</th>
                <th className="text-left px-5 py-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const isAbsent = absent[s.id]
                const val = marks[s.id]
                const num = parseFloat(val)
                const tot = parseFloat(totalMarks)
                const pct = !isAbsent && val !== "" && !isNaN(num) ? ((num / tot) * 100).toFixed(1) : null
                const isOver = !isAbsent && val !== "" && num > tot
                const isNeg  = !isAbsent && val !== "" && num < 0
                const letterGrade = pct !== null
                  ? (num / tot >= 0.9 ? "A+" : num / tot >= 0.8 ? "A" : num / tot >= 0.7 ? "B" : num / tot >= 0.6 ? "C" : num / tot >= 0.5 ? "D" : "F")
                  : null
                return (
                  <tr key={s.id} className={`border-t transition ${isAbsent ? "bg-orange-50/60 opacity-70" : isOver || isNeg ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <td className="px-5 py-3">
                      <p className={`font-medium ${isAbsent ? "text-gray-400 line-through" : "text-gray-800"}`}>{s.name}</p>
                      <p className="text-xs text-gray-400">{s.student_code || `#${s.id}`}</p>
                    </td>
                    <td className="px-5 py-3">
                      {isAbsent ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-sm font-semibold">Skipped</span>
                          <button onClick={() => toggleAbsent(s.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 underline">undo</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input type="number" placeholder="—" value={val} min="0" max={totalMarks}
                            onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                            className={`border rounded-lg px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-2
                              ${isOver || isNeg ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500"}`} />
                          <button onClick={() => toggleAbsent(s.id)}
                            title="Skip student — no grade saved, no SMS sent"
                            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 transition whitespace-nowrap">
                            Skip
                          </button>
                        </div>
                      )}
                      {isOver && <p className="text-red-500 text-xs mt-0.5">Exceeds total!</p>}
                      {isNeg  && <p className="text-red-500 text-xs mt-0.5">Cannot be negative!</p>}
                    </td>
                    <td className="px-5 py-3">
                      {isAbsent
                        ? <span className="text-gray-400 text-xs font-medium">—</span>
                        : pct !== null
                          ? <span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                          : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {isAbsent
                        ? <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-bold">—</span>
                        : letterGrade
                          ? <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor(letterGrade)}`}>{letterGrade}</span>
                          : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-5 border-t">
            {saving && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Saving grades...</span><span>{saveProgress}%</span></div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${saveProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <button onClick={() => { setStudents([]); setMarks({}) }}
                className="text-sm text-gray-500 hover:text-gray-700 underline">← Back to test details</button>
              <button onClick={handleSave} disabled={saving || invalidCount > 0}
                className="btn-success">
                {saving ? "Saving..." : `Save Grades for ${students.length - absentCount} Student${students.length - absentCount !== 1 ? "s" : ""}${absentCount > 0 ? ` · ${absentCount} Skipped` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── View Performance (course-first flat list) ─────────────────
function ViewPerformance() {
  const [courses, setCourses]               = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [allGrades, setAllGrades]           = useState([])   // flat list with .student attached
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState("")
  const [success, setSuccess]               = useState("")
  const [filter, setFilter]                 = useState("")
  const [subjectFilter, setSubjectFilter]   = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Per-student detail panel
  const [detailStudent, setDetailStudent]   = useState(null)
  const [showReportCard, setShowReportCard] = useState(false)

  useEffect(() => {
    getCoursesAPI().then(r => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function loadCourseGrades(course) {
    setSelectedCourse(course)
    setAllGrades([])
    setFilter("")
    setSubjectFilter("")
    setDetailStudent(null)
    setError("")
    if (!course) return
    setLoading(true)
    try {
      const studentsRes = await getStudentsByCourseAPI(course.name)
      const students = studentsRes.data.students || []
      if (students.length === 0) { setLoading(false); return }
      // Parallel grade fetch for all students
      const results = await Promise.all(
        students.map(s =>
          getGradesAPI(s.id)
            .then(r => ({ student: s, grades: r.data.grades || [] }))
            .catch(() => ({ student: s, grades: [] }))
        )
      )
      const flat = []
      for (const { student, grades } of results) {
        for (const g of grades) flat.push({ ...g, student })
      }
      // Sort: test_date desc first, then id desc (most recently added)
      flat.sort((a, b) => {
        if (a.test_date && b.test_date) return new Date(b.test_date) - new Date(a.test_date)
        if (a.test_date) return -1
        if (b.test_date) return 1
        return b.id - a.id
      })
      setAllGrades(flat)
    } catch {
      setError("Failed to load grades")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteGradeAPI(id)
      setSuccess("Grade deleted")
      setDeleteConfirmId(null)
      setAllGrades(prev => prev.filter(g => g.id !== id))
    } catch {
      setError("Delete failed")
      setDeleteConfirmId(null)
    }
  }

  // Unique subjects for filter dropdown
  const uniqueSubjects = useMemo(() => [...new Set(allGrades.map(g => g.subject))].sort(), [allGrades])

  // Filtered flat list
  const filtered = useMemo(() => {
    let list = allGrades
    if (subjectFilter) list = list.filter(g => g.subject === subjectFilter)
    if (filter.trim()) {
      const q = filter.toLowerCase()
      list = list.filter(g =>
        g.student.name.toLowerCase().includes(q) ||
        g.subject.toLowerCase().includes(q) ||
        (g.test_title || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [allGrades, filter, subjectFilter])

  // Course-level stats
  const stats = useMemo(() => {
    if (!allGrades.length) return null
    const studentIds = new Set(allGrades.map(g => g.student.id))
    const avgPct = (allGrades.reduce((s, g) => s + (g.marks / g.total_marks) * 100, 0) / allGrades.length).toFixed(1)
    return { students: studentIds.size, tests: allGrades.length, avgPct, subjects: uniqueSubjects.length }
  }, [allGrades, uniqueSubjects])

  // Per-student grades (for drill-down panel)
  const detailGrades = useMemo(() => {
    if (!detailStudent) return []
    return allGrades.filter(g => g.student.id === detailStudent.id)
  }, [allGrades, detailStudent])

  const detailStats = useMemo(() => {
    if (!detailGrades.length) return null
    const totalM = detailGrades.reduce((s, g) => s + g.marks, 0)
    const totalMax = detailGrades.reduce((s, g) => s + g.total_marks, 0)
    const avgPct = totalMax > 0 ? ((totalM / totalMax) * 100).toFixed(1) : 0
    return { avgPct, overall: overallGrade(parseFloat(avgPct)) }
  }, [detailGrades])

  function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
  }

  return (
    <div className="space-y-5">

      {/* ── Course selector + stats ── */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-5 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">Select Course</label>
            <select
              value={selectedCourse?.id || ""}
              onChange={e => {
                const c = courses.find(c => c.id === parseInt(e.target.value))
                loadCourseGrades(c || null)
              }}
              className="inp"
            >
              <option value="">— Choose a course to view grades —</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {stats && (
            <div className="flex gap-5">
              {[
                { label: "Students",  value: stats.students,  color: "text-blue-600" },
                { label: "Entries",   value: stats.tests,     color: "text-gray-800" },
                { label: "Avg Score", value: `${stats.avgPct}%`, color: pctColor(parseFloat(stats.avgPct)) },
                { label: "Subjects",  value: stats.subjects,  color: "text-purple-600" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feedback */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm p-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading grades for all students…
        </div>
      )}
      {error   && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"><p className="text-red-600 text-sm">{error}</p></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5"><p className="text-green-600 text-sm">{success}</p></div>}

      {/* Empty state */}
      {selectedCourse && !loading && allGrades.length === 0 && !error && (
        <div className="card p-14 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-400">No grades recorded for <strong>{selectedCourse.name}</strong> yet.</p>
          <p className="text-xs text-gray-400 mt-1">Use the "Add Grades" tab to enter test results.</p>
        </div>
      )}

      {/* ── Main flat list ── */}
      {allGrades.length > 0 && !loading && (
        <div className="card overflow-hidden">

          {/* Filter bar */}
          <div className="p-4 border-b flex flex-wrap gap-3 items-center bg-gray-50">
            <input
              type="text"
              placeholder="Search student, subject or test title…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {filtered.length}{filtered.length !== allGrades.length ? ` of ${allGrades.length}` : ""} entries
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-24">Date</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Subject</th>
                  <th className="text-left px-4 py-3">Test</th>
                  <th className="text-center px-4 py-3 w-24">Score</th>
                  <th className="text-center px-4 py-3 w-16">%</th>
                  <th className="text-center px-4 py-3 w-16">Grade</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-10 text-center text-gray-400">No matching entries</td></tr>
                ) : filtered.map(g => {
                  const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                  return (
                    <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(g.test_date)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailStudent(prev => prev?.id === g.student.id ? null : g.student)}
                          className="text-left group"
                        >
                          <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition leading-tight">{g.student.name}</p>
                          <p className="text-xs text-gray-400">{g.student.student_code || `#${g.student.id}`}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{g.subject}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{g.test_title || <span className="text-gray-400 italic text-xs">Unnamed</span>}</td>
                      <td className="px-4 py-3 text-center font-mono text-gray-700">{g.marks}/{g.total_marks}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold text-sm ${pctColor(parseFloat(pct))}`}>{pct}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>{g.grade}</span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {deleteConfirmId === g.id ? (
                          <div className="flex flex-col gap-1 items-center">
                            <button onClick={() => handleDelete(g.id)} className="bg-red-500 text-white px-2 py-0.5 rounded text-xs w-full">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs w-full">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(g.id)}
                            className="text-gray-300 hover:text-red-500 transition text-base leading-none">🗑️</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Per-student drill-down panel ── */}
      {detailStudent && detailGrades.length > 0 && (
        <div className="card overflow-hidden border-t-4 border-blue-500">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 bg-blue-50 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0">
                {detailStudent.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800">{detailStudent.name}</p>
                <p className="text-xs text-gray-500">
                  {detailStudent.student_code || `#${detailStudent.id}`}
                  {selectedCourse && ` · ${selectedCourse.name}`}
                  {detailStats && ` · ${detailGrades.length} test${detailGrades.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              {detailStats && (
                <div className="ml-4 flex items-center gap-3">
                  <div className="text-center">
                    <p className={`text-xl font-bold ${pctColor(parseFloat(detailStats.avgPct))}`}>{detailStats.avgPct}%</p>
                    <p className="text-xs text-gray-400">Avg</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-bold ${detailStats.overall.color}`}>{detailStats.overall.grade}</p>
                    <p className="text-xs text-gray-400">Grade</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowReportCard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                📄 Report Card
              </button>
              <button
                onClick={() => setDetailStudent(null)}
                className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none transition px-1">×</button>
            </div>
          </div>

          {/* Subject-wise breakdown */}
          <div className="p-4 space-y-3">
            {Object.entries(groupBySubject(detailGrades)).map(([subject, tests]) => {
              const sTotal = tests.reduce((s, g) => s + g.marks, 0)
              const sMax   = tests.reduce((s, g) => s + g.total_marks, 0)
              const sPct   = sMax > 0 ? ((sTotal / sMax) * 100).toFixed(1) : 0
              const sGrade = overallGrade(parseFloat(sPct))
              return (
                <div key={subject} className="border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                    <p className="font-semibold text-gray-700 text-sm">{subject}</p>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${barColor(parseFloat(sPct))}`} style={{ width: `${Math.min(sPct, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold ${pctColor(parseFloat(sPct))}`}>{sPct}%</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(sGrade.grade)}`}>{sGrade.grade}</span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {tests.map(g => {
                        const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                        return (
                          <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                            <td className="px-4 py-2.5 text-xs text-gray-400 w-20 whitespace-nowrap">{fmtDate(g.test_date)}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-700">
                              {g.test_title || <span className="italic text-gray-400 text-xs">Unnamed</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-gray-600">{g.marks}/{g.total_marks}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`font-semibold text-xs ${pctColor(parseFloat(pct))}`}>{pct}%</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>{g.grade}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showReportCard && detailStudent && (
        <ReportCardModal studentId={detailStudent.id} onClose={() => setShowReportCard(false)} />
      )}
    </div>
  )
}

// ── Student self-view ─────────────────────────────────────────
function StudentGrades({ studentId }) {
  const [grades, setGrades]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState("")
  const [showReportCard, setShowReportCard] = useState(false)

  useEffect(() => {
    if (!studentId) { setError("Student ID not found."); setLoading(false); return }
    getGradesAPI(studentId)
      .then((r) => setGrades(r.data.grades || []))
      .catch(() => setError("Failed to load grades"))
      .finally(() => setLoading(false))
  }, [studentId])

  const { grouped, subjects_, avgPct, overall } = useMemo(() => {
    const grouped   = groupBySubject(grades)
    const subjects_ = Object.keys(grouped)
    const totalMarks = grades.reduce((s, g) => s + g.marks, 0)
    const totalMax   = grades.reduce((s, g) => s + g.total_marks, 0)
    const avgPct     = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0
    const overall    = overallGrade(parseFloat(avgPct))
    return { grouped, subjects_, avgPct, overall }
  }, [grades])

  if (loading) return (
    <div className="bg-white rounded-xl shadow p-8 flex items-center gap-3 text-gray-500">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading grades...
    </div>
  )
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>
  if (grades.length === 0) return (
    <div className="bg-white rounded-xl shadow p-12 text-center">
      <p className="text-4xl mb-3">📝</p><p className="text-gray-400">No grades found.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500"><p className="text-xs text-gray-500">Subjects</p><p className="text-2xl font-bold text-gray-800">{subjects_.length}</p></div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500"><p className="text-xs text-gray-500">Overall Score</p><p className="text-2xl font-bold text-gray-800">{avgPct}%</p></div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500"><p className="text-xs text-gray-500">Overall Grade</p><p className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</p></div>
      </div>
      <div className="space-y-4">
        {subjects_.map((subject) => {
          const tests  = grouped[subject]
          const sTotal = tests.reduce((s, g) => s + g.marks, 0)
          const sMax   = tests.reduce((s, g) => s + g.total_marks, 0)
          const sPct   = sMax > 0 ? ((sTotal / sMax) * 100).toFixed(1) : 0
          const sGrade = overallGrade(parseFloat(sPct))
          return (
            <div key={subject} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-800">{subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tests.length} test{tests.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${barColor(parseFloat(sPct))}`} style={{ width: `${Math.min(sPct, 100)}%` }} />
                    </div>
                    <span className={`text-sm font-semibold ${pctColor(parseFloat(sPct))}`}>{sPct}%</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${gradeColor(sGrade.grade)}`}>{sGrade.grade}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[380px]">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b bg-gray-50">
                      <th className="text-left px-5 py-2 font-medium">Test</th>
                      <th className="text-left px-5 py-2 font-medium">Marks</th>
                      <th className="text-left px-5 py-2 font-medium">Total</th>
                      <th className="text-left px-5 py-2 font-medium">%</th>
                      <th className="text-left px-5 py-2 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((g) => {
                      const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                      return (
                        <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-medium text-gray-700">{g.test_title || <span className="text-gray-400 italic">Unnamed</span>}</td>
                          <td className="px-5 py-3">{g.marks}</td>
                          <td className="px-5 py-3 text-gray-500">{g.total_marks}</td>
                          <td className="px-5 py-3"><span className={`font-semibold ${pctColor(parseFloat(pct))}`}>{pct}%</span></td>
                          <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>{g.grade}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
      {showReportCard && <ReportCardModal studentId={studentId} onClose={() => setShowReportCard(false)} />}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function Grades() {
  const { user, isAdmin, isStaff } = useAuth()
  const [activeTab, setActiveTab] = useState("view")

  // Admin and Staff see the management view; students see their own grades
  const isManagerView = isAdmin || isStaff

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-800">{isManagerView ? "Grades" : "My Grades"}</h2>
        </div>

        {isManagerView ? (
          <>
            {/* Tabs */}
            <div className="mb-5">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[{ key: "view", label: "View Performance" }, { key: "add", label: "Add Grades" }].map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.key ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {activeTab === "add"  && <AddGrades />}
            {activeTab === "view" && <ViewPerformance />}
          </>
        ) : (
          <StudentGrades studentId={user?.student_id} />
        )}
      </main>
    </div>
  )
}
