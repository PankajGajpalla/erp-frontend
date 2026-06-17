import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { Alert, LoadingState, TabBar } from "../components/UI"
import { getCoursesAPI, getSubjectsByCourseAPI, getStudentsByCourseAPI, addGradeAPI, getGradesAPI } from "../api"
import ReportCardModal from "../components/ReportCardModal"

function gradeColor(grade) {
  const map = { "A+": "bg-green-100 text-green-700", "A": "bg-green-100 text-green-600", "B": "bg-blue-100 text-blue-700", "C": "bg-yellow-100 text-yellow-700", "D": "bg-orange-100 text-orange-700", "F": "bg-red-100 text-red-700" }
  return map[grade] || "bg-slate-100 text-slate-700"
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

export default function TeacherGrades() {
  const [activeTab, setActiveTab] = useState("add")

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <h2 className="text-xl font-bold text-slate-800 mb-5">Grades</h2>
        <div className="mb-5">
          <TabBar
            tabs={[{ key: "add", label: "Add Grades" }, { key: "view", label: "View Performance" }]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>
        {activeTab === "add" && <AddGrades />}
        {activeTab === "view" && <ViewPerformance />}
      </main>
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────
function StepBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${active ? "text-primary-600 font-semibold" : done ? "text-green-600" : "text-slate-400"}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
        ${active ? "border-primary-600 text-primary-600" : done ? "border-green-500 bg-green-500 text-white" : "border-slate-300 text-slate-400"}`}>
        {done ? "✓" : n}
      </span>
      {label}
    </div>
  )
}

// ── Add Grades ────────────────────────────────────────────────
function AddGrades() {
  const [courses, setCourses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [testTitle, setTestTitle]       = useState("")
  const [testDate, setTestDate]         = useState(new Date().toISOString().split("T")[0])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [totalMarks, setTotalMarks]     = useState("")
  const [students, setStudents]         = useState([])
  const [marks, setMarks]               = useState({})
  const [studentStatus, setStudentStatus] = useState({})  // null | "absent" | "skip"
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState("")

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
    e.preventDefault(); setError(""); setSuccess("")
    if (!testTitle.trim())      { setError("Test title is required"); return }
    if (!selectedCourse)        { setError("Please select a course"); return }
    if (!selectedSubject)       { setError("Please select a subject"); return }
    if (!totalMarks || parseFloat(totalMarks) <= 0) { setError("Total marks must be greater than 0"); return }
    setLoadingStudents(true)
    try {
      const res = await getStudentsByCourseAPI(selectedCourse.name)
      const list = res.data.students
      if (list.length === 0) { setError(`No students found in "${selectedCourse.name}"`); return }
      setStudents(list)
      const def = {}, st = {}
      list.forEach((s) => { def[s.id] = ""; st[s.id] = null })
      setMarks(def); setStudentStatus(st)
    } catch { setError("Failed to load students") }
    finally { setLoadingStudents(false) }
  }

  function setStatus(id, status) {
    setStudentStatus((prev) => ({ ...prev, [id]: prev[id] === status ? null : status }))
    setMarks((prev) => ({ ...prev, [id]: "" }))
  }

  async function handleSave() {
    setError(""); setSuccess("")
    const normal   = (s) => !studentStatus[s.id]
    const missing  = students.filter((s) => normal(s) && (marks[s.id] === "" || marks[s.id] === undefined))
    if (missing.length > 0) { setError(`Enter marks for all ${missing.length} remaining students (or mark absent/skip)`); return }
    const invalid  = students.filter((s) => normal(s) && parseFloat(marks[s.id]) > parseFloat(totalMarks))
    if (invalid.length > 0) { setError(`Marks exceed total (${totalMarks}) for: ${invalid.map((s) => s.name).join(", ")}`); return }
    const negative = students.filter((s) => normal(s) && parseFloat(marks[s.id]) < 0)
    if (negative.length > 0) { setError("Marks cannot be negative"); return }

    setSaving(true); setSaveProgress(0)
    let saved = 0, failed = 0, cntAbsent = 0, cntSkipped = 0
    for (const s of students) {
      const st = studentStatus[s.id]
      if (st === "absent")  { cntAbsent++;  setSaveProgress(Math.round(((saved + cntAbsent + cntSkipped) / students.length) * 100)); continue }
      if (st === "skip")    { cntSkipped++; setSaveProgress(Math.round(((saved + cntAbsent + cntSkipped) / students.length) * 100)); continue }
      try {
        await addGradeAPI({ student_id: s.id, subject: selectedSubject.name, marks: parseFloat(marks[s.id]), total_marks: parseFloat(totalMarks), test_title: testTitle.trim(), test_date: testDate.split("-").reverse().join("-") })
        saved++; setSaveProgress(Math.round(((saved + cntAbsent + cntSkipped) / students.length) * 100))
      } catch { failed++ }
    }
    setSaving(false); setSaveProgress(0)
    if (failed === 0) {
      const notes = [cntAbsent > 0 && `${cntAbsent} absent`, cntSkipped > 0 && `${cntSkipped} skipped`].filter(Boolean).join(" · ")
      setSuccess(`Grades saved for ${saved} students — ${testTitle} / ${selectedSubject.name}${notes ? ` · ${notes}` : ""}`)
      setStudents([]); setMarks({}); setStudentStatus({}); setTestTitle(""); setTestDate(new Date().toISOString().split("T")[0]); setSelectedCourse(null); setSelectedSubject(null); setSubjects([]); setTotalMarks("")
    } else {
      setError(`${saved} saved, ${failed} failed. Check and retry.`)
    }
  }

  const filledCount   = students.filter((s) => !studentStatus[s.id] && marks[s.id] !== "").length
  const absentCount   = students.filter((s) => studentStatus[s.id] === "absent").length
  const skippedCount  = students.filter((s) => studentStatus[s.id] === "skip").length
  const invalidCount  = students.filter((s) => !studentStatus[s.id] && marks[s.id] !== "" && parseFloat(marks[s.id]) > parseFloat(totalMarks)).length

  return (
    <div className="space-y-5">
      {/* Steps header */}
      <div className="card p-4 flex gap-6 flex-wrap">
        <StepBadge n={1} label="Test Details" active={step === 1} done={step > 1} />
        <span className="text-slate-300 self-center">—</span>
        <StepBadge n={2} label="Load Students" active={step === 1} done={step > 1} />
        <span className="text-slate-300 self-center">—</span>
        <StepBadge n={3} label="Enter Marks" active={step === 3} done={false} />
      </div>

      {/* Step 1 & 2 */}
      <div className="card p-6">
        <h3 className="section-title mb-4 pb-2 border-b border-slate-100">Test Details</h3>
        <form onSubmit={handleLoadStudents}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Test Title *</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Unit Test 1, Mid Term Exam, Final Exam" className="inp" />
            </div>
            <div>
              <label className="form-label">Test Date *</label>
              <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)}
                className="inp" />
            </div>
            <div>
              <label className="form-label">Course *</label>
              <select value={selectedCourse?.id || ""} onChange={handleCourseChange} className="inp">
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Subject *</label>
              <select value={selectedSubject?.id || ""} onChange={handleSubjectChange}
                disabled={!selectedCourse || loadingSubjects} className="inp">
                <option value="">{loadingSubjects ? "Loading subjects..." : "Select subject"}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.teacher_name ? ` — ${s.teacher_name}` : ""}</option>
                ))}
              </select>
              {selectedCourse && subjects.length === 0 && !loadingSubjects && (
                <p className="text-xs text-orange-500 mt-1">No subjects in this course. Add subjects from the Courses page.</p>
              )}
            </div>
            <div>
              <label className="form-label">Total Marks *</label>
              <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 100" min="1" className="inp" />
            </div>
          </div>
          {error   && <div className="mb-3"><Alert type="error"   message={error}   onClose={() => setError("")} /></div>}
          {success && <div className="mb-3"><Alert type="success" message={success} onClose={() => setSuccess("")} /></div>}
          <button type="submit" disabled={loadingStudents} className="btn-primary">
            {loadingStudents ? "Loading students..." : "Load Students →"}
          </button>
        </form>
      </div>

      {/* Step 3: Mark entry table */}
      {students.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-blue-50">
            <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Test</p><p className="font-bold text-slate-800">{testTitle}</p></div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Date</p><p className="font-semibold text-slate-700">{testDate.split("-").reverse().join("-")}</p></div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Course</p><p className="font-semibold text-slate-700">{selectedCourse?.name}</p></div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Subject</p><p className="font-semibold text-slate-700">{selectedSubject?.name}</p></div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Total Marks</p><p className="font-semibold text-slate-700">{totalMarks}</p></div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">{filledCount} / {students.length - absentCount - skippedCount} filled</p>
                {absentCount  > 0 && <p className="text-xs text-orange-500 font-medium">{absentCount} absent</p>}
                {skippedCount > 0 && <p className="text-xs text-gray-400 font-medium">{skippedCount} skipped</p>}
                {invalidCount > 0 && <p className="text-xs text-red-600 font-medium">{invalidCount} exceed total!</p>}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="tbl min-w-[520px]">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Marks (out of {totalMarks})</th>
                  <th>%</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const status    = studentStatus[s.id]
                  const isAbsent  = status === "absent"
                  const isSkipped = status === "skip"
                  const val = marks[s.id]
                  const num = parseFloat(val)
                  const tot = parseFloat(totalMarks)
                  const pct = !status && val !== "" && !isNaN(num) ? ((num / tot) * 100).toFixed(1) : null
                  const isOver = !status && val !== "" && num > tot
                  const isNeg  = !status && val !== "" && num < 0
                  const letterGrade = pct !== null
                    ? (num / tot >= 0.9 ? "A+" : num / tot >= 0.8 ? "A" : num / tot >= 0.7 ? "B" : num / tot >= 0.6 ? "C" : num / tot >= 0.5 ? "D" : "F")
                    : null
                  return (
                    <tr key={s.id} className={`transition ${isAbsent ? "bg-orange-50/60 opacity-70" : isSkipped ? "bg-gray-50/80 opacity-70" : isOver || isNeg ? "bg-red-50" : ""}`}>
                      <td>
                        <p className={`font-medium ${status ? "text-slate-400 line-through" : "text-slate-800"}`}>{s.name}</p>
                        <p className="text-xs text-slate-400">ID: {s.id}</p>
                      </td>
                      <td>
                        {status ? (
                          <div className="flex items-center gap-2">
                            {isAbsent  && <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm font-semibold">Absent</span>}
                            {isSkipped && <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-sm font-semibold">Skipped</span>}
                            <button onClick={() => setStatus(s.id, status)}
                              className="text-xs text-slate-400 hover:text-slate-600 underline">undo</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input type="number" placeholder="—" value={val} min="0" max={totalMarks}
                              onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                              className={`border rounded-lg px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-2
                                ${isOver || isNeg ? "border-red-400 focus:ring-red-300" : "border-slate-200 focus:ring-primary-500"}`} />
                            <button onClick={() => setStatus(s.id, "absent")}
                              title="Student was absent from the test"
                              className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 px-2 py-1 rounded-lg hover:bg-orange-50 transition whitespace-nowrap">
                              Absent
                            </button>
                            <button onClick={() => setStatus(s.id, "skip")}
                              title="Skip entry — no grade saved"
                              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 transition whitespace-nowrap">
                              Skip
                            </button>
                          </div>
                        )}
                        {isOver && <p className="text-red-500 text-xs mt-0.5">Exceeds total!</p>}
                        {isNeg  && <p className="text-red-500 text-xs mt-0.5">Cannot be negative!</p>}
                      </td>
                      <td>
                        {status
                          ? <span className="text-gray-400 text-xs font-medium">—</span>
                          : pct !== null
                            ? <span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                            : <span className="text-slate-300">—</span>}
                      </td>
                      <td>
                        {status
                          ? <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">—</span>
                          : letterGrade
                            ? <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor(letterGrade)}`}>{letterGrade}</span>
                            : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-5 border-t border-slate-100">
            {saving && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Saving grades...</span><span>{saveProgress}%</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary-500 transition-all duration-300" style={{ width: `${saveProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <button onClick={() => { setStudents([]); setMarks({}) }} className="text-sm text-slate-500 hover:text-slate-700 underline">
                ← Back to test details
              </button>
              <button onClick={handleSave} disabled={saving || invalidCount > 0} className="btn-success">
                {saving ? "Saving..." : (() => {
                  const grading = students.length - absentCount - skippedCount
                  const notes = [absentCount > 0 && `${absentCount} absent`, skippedCount > 0 && `${skippedCount} skipped`].filter(Boolean).join(" · ")
                  return `Save Grades for ${grading} Student${grading !== 1 ? "s" : ""}${notes ? ` · ${notes}` : ""}`
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── View Performance (same layout as admin Grades) ────────────
function ViewPerformance() {
  const [courses, setCourses]               = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [allGrades, setAllGrades]           = useState([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState("")
  const [filter, setFilter]                 = useState("")
  const [subjectFilter, setSubjectFilter]   = useState("")
  const [detailStudent, setDetailStudent]   = useState(null)
  const [showReportCard, setShowReportCard] = useState(false)

  useEffect(() => {
    getCoursesAPI().then(r => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  async function loadCourseGrades(course) {
    setSelectedCourse(course)
    setAllGrades([]); setFilter(""); setSubjectFilter(""); setDetailStudent(null); setError("")
    if (!course) return
    setLoading(true)
    try {
      const studentsRes = await getStudentsByCourseAPI(course.name)
      const students = studentsRes.data.students || []
      if (students.length === 0) { setLoading(false); return }
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

  const uniqueSubjects = useMemo(() => [...new Set(allGrades.map(g => g.subject))].sort(), [allGrades])

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

  const stats = useMemo(() => {
    if (!allGrades.length) return null
    const studentIds = new Set(allGrades.map(g => g.student.id))
    const avgPct = (allGrades.reduce((s, g) => s + (g.marks / g.total_marks) * 100, 0) / allGrades.length).toFixed(1)
    return { students: studentIds.size, tests: allGrades.length, avgPct, subjects: uniqueSubjects.length }
  }, [allGrades, uniqueSubjects])

  const detailGrades = useMemo(() => {
    if (!detailStudent) return []
    return allGrades.filter(g => g.student.id === detailStudent.id)
  }, [allGrades, detailStudent])

  const detailStats = useMemo(() => {
    if (!detailGrades.length) return null
    const totalM   = detailGrades.reduce((s, g) => s + g.marks, 0)
    const totalMax = detailGrades.reduce((s, g) => s + g.total_marks, 0)
    const avgPct   = totalMax > 0 ? ((totalM / totalMax) * 100).toFixed(1) : 0
    return { avgPct, overall: overallGrade(parseFloat(avgPct)) }
  }, [detailGrades])

  function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
  }

  return (
    <div className="space-y-5">

      {/* Course selector + stats */}
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
                { label: "Students",  value: stats.students,      color: "text-blue-600" },
                { label: "Entries",   value: stats.tests,         color: "text-gray-800" },
                { label: "Avg Score", value: `${stats.avgPct}%`,  color: pctColor(parseFloat(stats.avgPct)) },
                { label: "Subjects",  value: stats.subjects,      color: "text-purple-600" },
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

      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm p-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading grades for all students…
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"><p className="text-red-600 text-sm">{error}</p></div>}

      {selectedCourse && !loading && allGrades.length === 0 && !error && (
        <div className="card p-14 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-gray-400">No grades recorded for <strong>{selectedCourse.name}</strong> yet.</p>
          <p className="text-xs text-gray-400 mt-1">Use the "Add Grades" tab to enter test results.</p>
        </div>
      )}

      {/* Flat grade list */}
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
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-24">Date</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Subject</th>
                  <th className="text-left px-4 py-3">Test</th>
                  <th className="text-center px-4 py-3 w-24">Score</th>
                  <th className="text-center px-4 py-3 w-16">%</th>
                  <th className="text-center px-4 py-3 w-16">Grade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">No matching entries</td></tr>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-student drill-down panel */}
      {detailStudent && detailGrades.length > 0 && (
        <div className="card overflow-hidden border-t-4 border-blue-500">
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
                  {` · ${detailGrades.length} test${detailGrades.length !== 1 ? "s" : ""}`}
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
