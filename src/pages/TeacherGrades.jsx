import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { Alert, LoadingState, TabBar } from "../components/UI"
import { getCoursesAPI, getSubjectsByCourseAPI, getStudentsByCourseAPI, addGradeAPI, getGradesAPI, getStudentAPI, searchStudentsAPI } from "../api"

function gradeColor(grade) {
  const map = { "A+": "bg-green-100 text-green-700", "A": "bg-green-100 text-green-600", "B": "bg-blue-100 text-blue-700", "C": "bg-yellow-100 text-yellow-700", "D": "bg-orange-100 text-orange-700", "F": "bg-red-100 text-red-700" }
  return map[grade] || "bg-slate-100 text-slate-700"
}

function getOverallGrade(pct) {
  if (pct >= 90) return { grade: "A+", color: "text-green-600" }
  if (pct >= 80) return { grade: "A",  color: "text-green-500" }
  if (pct >= 70) return { grade: "B",  color: "text-blue-600" }
  if (pct >= 60) return { grade: "C",  color: "text-yellow-600" }
  if (pct >= 50) return { grade: "D",  color: "text-orange-600" }
  return { grade: "F", color: "text-red-600" }
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
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [totalMarks, setTotalMarks]     = useState("")
  const [students, setStudents]   = useState([])
  const [marks, setMarks]         = useState({})
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
      const def = {}
      list.forEach((s) => { def[s.id] = "" })
      setMarks(def)
    } catch { setError("Failed to load students") }
    finally { setLoadingStudents(false) }
  }

  async function handleSave() {
    setError(""); setSuccess("")
    const missing = students.filter((s) => marks[s.id] === "" || marks[s.id] === undefined)
    if (missing.length > 0) { setError(`Enter marks for all ${missing.length} remaining students`); return }
    const invalid = students.filter((s) => parseFloat(marks[s.id]) > parseFloat(totalMarks))
    if (invalid.length > 0) { setError(`Marks exceed total (${totalMarks}) for: ${invalid.map((s) => s.name).join(", ")}`); return }
    const negative = students.filter((s) => parseFloat(marks[s.id]) < 0)
    if (negative.length > 0) { setError("Marks cannot be negative"); return }

    setSaving(true); setSaveProgress(0)
    let saved = 0, failed = 0
    for (const s of students) {
      try {
        await addGradeAPI({ student_id: s.id, subject: selectedSubject.name, marks: parseFloat(marks[s.id]), total_marks: parseFloat(totalMarks), test_title: testTitle.trim() })
        saved++; setSaveProgress(Math.round((saved / students.length) * 100))
      } catch { failed++ }
    }
    setSaving(false); setSaveProgress(0)
    if (failed === 0) {
      setSuccess(`Grades saved for ${saved} students — ${testTitle} / ${selectedSubject.name}`)
      setStudents([]); setMarks({}); setTestTitle(""); setSelectedCourse(null); setSelectedSubject(null); setSubjects([]); setTotalMarks("")
    } else {
      setError(`${saved} saved, ${failed} failed. Check and retry.`)
    }
  }

  const filledCount  = students.filter((s) => marks[s.id] !== "").length
  const invalidCount = students.filter((s) => marks[s.id] !== "" && parseFloat(marks[s.id]) > parseFloat(totalMarks)).length

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
            <div className="md:col-span-2">
              <label className="form-label">Test Title *</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Unit Test 1, Mid Term Exam, Final Exam" className="inp" />
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
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Course</p><p className="font-semibold text-slate-700">{selectedCourse?.name}</p></div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Subject</p><p className="font-semibold text-slate-700">{selectedSubject?.name}</p></div>
              <div><p className="text-xs text-slate-500 uppercase tracking-wide">Total Marks</p><p className="font-semibold text-slate-700">{totalMarks}</p></div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">{filledCount} / {students.length} filled</p>
                {invalidCount > 0 && <p className="text-xs text-red-600 font-medium">{invalidCount} exceed total!</p>}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="tbl min-w-[480px]">
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
                  const val = marks[s.id]
                  const num = parseFloat(val)
                  const tot = parseFloat(totalMarks)
                  const pct = val !== "" && !isNaN(num) ? ((num / tot) * 100).toFixed(1) : null
                  const isOver = val !== "" && num > tot
                  const isNeg  = val !== "" && num < 0
                  const letterGrade = pct !== null
                    ? (num / tot >= 0.9 ? "A+" : num / tot >= 0.8 ? "A" : num / tot >= 0.7 ? "B" : num / tot >= 0.6 ? "C" : num / tot >= 0.5 ? "D" : "F")
                    : null
                  return (
                    <tr key={s.id} className={`${isOver || isNeg ? "bg-red-50" : ""}`}>
                      <td>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">ID: {s.id}</p>
                      </td>
                      <td>
                        <input type="number" placeholder="—" value={val} min="0" max={totalMarks}
                          onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                          className={`border rounded-lg px-3 py-1.5 w-28 text-sm focus:outline-none focus:ring-2
                            ${isOver || isNeg ? "border-red-400 focus:ring-red-300" : "border-slate-200 focus:ring-primary-500"}`} />
                        {isOver && <p className="text-red-500 text-xs mt-0.5">Exceeds total!</p>}
                        {isNeg  && <p className="text-red-500 text-xs mt-0.5">Cannot be negative!</p>}
                      </td>
                      <td>
                        {pct !== null
                          ? <span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td>
                        {letterGrade
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
                {saving ? "Saving..." : `Save Grades for ${students.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── View Performance ──────────────────────────────────────────
function ViewPerformance() {
  const [viewMode, setViewMode]             = useState("search")
  const [searchQuery, setSearchQuery]       = useState("")
  const [searchResults, setSearchResults]   = useState([])
  const [searching, setSearching]           = useState(false)
  const [courses, setCourses]               = useState([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [courseStudents, setCourseStudents] = useState([])
  const [courseLoading, setCourseLoading]   = useState(false)
  const [student, setStudent]   = useState(null)
  const [grades, setGrades]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    getCoursesAPI().then((r) => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedCourse) { setCourseStudents([]); return }
    setCourseLoading(true)
    getStudentsByCourseAPI(selectedCourse)
      .then((r) => setCourseStudents(r.data.students || r.data || []))
      .catch(() => setCourseStudents([]))
      .finally(() => setCourseLoading(false))
  }, [selectedCourse])

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) { setError("Enter a name, student ID, email or phone"); return }
    setSearching(true); setError(""); setSearchResults([]); setStudent(null); setGrades([])
    try {
      const res = await searchStudentsAPI(searchQuery.trim())
      const list = res.data.students || []
      if (list.length === 0) { setError("No student found matching that query") }
      else if (list.length === 1) { await loadStudentGrades(list[0]) }
      else { setSearchResults(list) }
    } catch { setError("Search failed — try again") }
    finally { setSearching(false) }
  }

  async function loadStudentGrades(s) {
    setLoading(true); setError(""); setSearchResults([]); setStudent(null); setGrades([])
    try {
      const [studentRes, gradesRes] = await Promise.all([getStudentAPI(s.id), getGradesAPI(s.id)])
      setStudent(studentRes.data)
      setGrades(gradesRes.data.grades || [])
      if ((gradesRes.data.grades || []).length === 0) setError("No grades found for this student yet.")
    } catch { setError("Failed to load student data") }
    finally { setLoading(false) }
  }

  function clearStudent() {
    setStudent(null); setGrades([]); setError("")
    setSearchQuery(""); setSearchResults([])
    setSelectedCourse(""); setCourseStudents([])
  }

  const avgPct = grades.length > 0
    ? ((grades.reduce((s, g) => s + g.marks, 0) / grades.reduce((s, g) => s + g.total_marks, 0)) * 100).toFixed(1)
    : 0
  const overall = getOverallGrade(parseFloat(avgPct))

  const bySubject = grades.reduce((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = []
    acc[g.subject].push(g)
    return acc
  }, {})

  return (
    <div className="space-y-5">

      {/* ── Student Selector ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <h3 className="section-title">Find Student</h3>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-sm">
            <button onClick={() => { setViewMode("search"); setSelectedCourse(""); setCourseStudents([]) }}
              className={`px-4 py-1.5 font-medium transition ${viewMode === "search" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              Search
            </button>
            <button onClick={() => { setViewMode("course"); setSearchQuery(""); setSearchResults([]) }}
              className={`px-4 py-1.5 font-medium transition ${viewMode === "course" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              Browse by Course
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {viewMode === "search" ? (
            <form onSubmit={handleSearch} className="flex gap-2">
              <input type="text" placeholder="Search by name, STU0001, email or phone…"
                value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]) }}
                className="inp" />
              <button type="submit" disabled={searching} className="btn-ghost">
                {searching ? "…" : "Search"}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="form-label">Select Course</label>
                <select value={selectedCourse}
                  onChange={(e) => { setSelectedCourse(e.target.value); setStudent(null); setGrades([]) }}
                  className="inp">
                  <option value="">— Choose a course —</option>
                  {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {courseLoading ? (
                <LoadingState message="Loading students…" />
              ) : selectedCourse && courseStudents.length === 0 ? (
                <p className="text-sm text-slate-400">No students in this course.</p>
              ) : courseStudents.length > 0 ? (
                <>
                  <p className="text-xs text-slate-400">{courseStudents.length} student{courseStudents.length !== 1 ? "s" : ""} — click to view performance</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                    {courseStudents.map((s) => (
                      <button key={s.id} onClick={() => loadStudentGrades(s)}
                        className={`text-left rounded-lg border px-3 py-2.5 transition hover:shadow-md hover:border-primary-400 hover:bg-blue-50
                          ${student?.id === s.id ? "border-primary-500 bg-blue-50 shadow-md" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-mono text-xs text-slate-400">{s.student_code || `#${s.id}`}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{s.name}</p>
                        {s.phone && <p className="text-xs text-slate-400 truncate mt-0.5">{s.phone}</p>}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {searchResults.length > 1 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">{searchResults.length} students found — click one:</p>
              <div className="divide-y border border-slate-200 rounded-lg overflow-hidden">
                {searchResults.map((s) => (
                  <button key={s.id} onClick={() => loadStudentGrades(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition flex items-center gap-4 text-sm">
                    <span className="font-mono text-xs text-slate-400 w-20 shrink-0">{s.student_code || `#${s.id}`}</span>
                    <span className="font-medium text-slate-800 flex-1">{s.name}</span>
                    <span className="text-slate-400 text-xs">{s.course || ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <Alert type="error" message={error} onClose={() => setError("")} />}
        </div>
      </div>

      {loading && <LoadingState message="Loading grades…" />}

      {/* ── Student banner ── */}
      {student && !loading && (
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">🎓</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-slate-800">{student.name}</p>
            <p className="text-slate-500 text-sm">
              <span className="font-mono mr-2">{student.student_code || `#${student.id}`}</span>
              {student.course && <span>· {student.course}</span>}
            </p>
          </div>
          {grades.length > 0 && (
            <div className="text-right mr-2">
              <p className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</p>
              <p className="text-xs text-slate-400">{avgPct}% average</p>
            </div>
          )}
          <button onClick={clearStudent} className="text-slate-400 hover:text-red-500 text-xl font-bold leading-none transition">×</button>
        </div>
      )}

      {/* ── Summary cards ── */}
      {grades.length > 0 && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 border-l-4 border-primary-500">
              <p className="text-sm text-slate-500">Tests</p>
              <p className="text-2xl font-bold text-primary-600">{grades.length}</p>
            </div>
            <div className="card p-5 border-l-4 border-green-500">
              <p className="text-sm text-slate-500">Avg %</p>
              <p className="text-2xl font-bold text-green-600">{avgPct}%</p>
            </div>
            <div className="card p-5 border-l-4 border-purple-500">
              <p className="text-sm text-slate-500">Overall</p>
              <p className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</p>
            </div>
          </div>

          {Object.entries(bySubject).map(([subjectName, subGrades]) => {
            const subAvg = ((subGrades.reduce((s, g) => s + g.marks, 0) / subGrades.reduce((s, g) => s + g.total_marks, 0)) * 100).toFixed(1)
            return (
              <div key={subjectName} className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <p className="font-semibold text-slate-700">{subjectName}</p>
                  <span className={`text-sm font-bold ${parseFloat(subAvg) >= 50 ? "text-green-600" : "text-red-600"}`}>{subAvg}% avg</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="tbl min-w-[380px]">
                    <thead>
                      <tr><th>Test</th><th>Marks</th><th>Total</th><th>%</th><th>Grade</th></tr>
                    </thead>
                    <tbody>
                      {subGrades.map((g) => {
                        const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                        return (
                          <tr key={g.id}>
                            <td className="font-medium">{g.test_title || "—"}</td>
                            <td>{g.marks}</td>
                            <td>{g.total_marks}</td>
                            <td><span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span></td>
                            <td><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>{g.grade}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
