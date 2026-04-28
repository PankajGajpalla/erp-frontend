import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getGradesAPI, addGradeAPI, deleteGradeAPI, getStudentAPI,
  getCoursesAPI, getSubjectsByCourseAPI, getStudentsByCourseAPI, searchStudentsAPI,
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
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [totalMarks, setTotalMarks]         = useState("")

  const [students, setStudents] = useState([])
  const [marks, setMarks]       = useState({})

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
            <div className="md:col-span-2">
              <label className="form-label">Test Title *</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Unit Test 1, Mid Term Exam, Final Exam"
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
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Course</p><p className="font-semibold text-gray-700">{selectedCourse?.name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Subject</p><p className="font-semibold text-gray-700">{selectedSubject?.name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide">Total Marks</p><p className="font-semibold text-gray-700">{totalMarks}</p></div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">{filledCount} / {students.length} filled</p>
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
                  <tr key={s.id} className={`border-t transition ${isOver || isNeg ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.student_code || `#${s.id}`}</p>
                    </td>
                    <td className="px-5 py-3">
                      <input type="number" placeholder="—" value={val} min="0" max={totalMarks}
                        onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                        className={`border rounded-lg px-3 py-1.5 w-28 text-sm focus:outline-none focus:ring-2
                          ${isOver || isNeg ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500"}`} />
                      {isOver && <p className="text-red-500 text-xs mt-0.5">Exceeds total!</p>}
                      {isNeg  && <p className="text-red-500 text-xs mt-0.5">Cannot be negative!</p>}
                    </td>
                    <td className="px-5 py-3">
                      {pct !== null
                        ? <span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {letterGrade
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
                {saving ? "Saving..." : `Save Grades for ${students.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── View Performance (admin — with delete + report card) ───────
function ViewPerformance() {
  const [viewMode, setViewMode]               = useState("search")

  // Search
  const [searchQuery, setSearchQuery]         = useState("")
  const [searchResults, setSearchResults]     = useState([])
  const [searching, setSearching]             = useState(false)

  // Browse by course
  const [courses, setCourses]                 = useState([])
  const [selectedCourse, setSelectedCourse]   = useState("")
  const [courseStudents, setCourseStudents]   = useState([])
  const [courseLoading, setCourseLoading]     = useState(false)

  // Student data
  const [student, setStudent]                 = useState(null)
  const [grades, setGrades]                   = useState([])
  const [subjects, setSubjects]               = useState([])   // for add-grade dropdown
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")
  const [success, setSuccess]                 = useState("")

  // Add grade inline
  const EMPTY = { testTitle: "", subjectId: "", marks: "", totalMarks: "" }
  const [showAddForm, setShowAddForm]         = useState(false)
  const [addForm, setAddForm]                 = useState(EMPTY)
  const [adding, setAdding]                   = useState(false)

  // Delete
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Report card
  const [showReportCard, setShowReportCard]   = useState(false)

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

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) { setError("Enter a name, student ID, email or phone"); return }
    setSearching(true); setError(""); setSearchResults([]); setStudent(null); setGrades([])
    try {
      const res = await searchStudentsAPI(searchQuery.trim())
      const list = res.data.students || []
      if (list.length === 0)    setError("No student found matching that query")
      else if (list.length === 1) await loadStudentGrades(list[0])
      else setSearchResults(list)
    } catch { setError("Search failed — try again") }
    finally { setSearching(false) }
  }

  async function loadStudentGrades(s) {
    setLoading(true); setError(""); setSearchResults([])
    setStudent(null); setGrades([]); setShowAddForm(false); setAddForm(EMPTY)
    try {
      const [studentRes, gradesRes] = await Promise.all([getStudentAPI(s.id), getGradesAPI(s.id)])
      const profile = studentRes.data
      setStudent(profile)
      setGrades(gradesRes.data.grades || [])
      if ((gradesRes.data.grades || []).length === 0) setError("No grades found for this student yet.")
      // Load subjects for add-grade dropdown
      if (profile.course) {
        setLoadingSubjects(true)
        try {
          const cRes = await getCoursesAPI()
          const match = cRes.data.courses.find(c => c.name === profile.course)
          if (match) {
            const sjRes = await getSubjectsByCourseAPI(match.id)
            setSubjects(sjRes.data.subjects || [])
          }
        } catch { /* non-fatal */ }
        finally { setLoadingSubjects(false) }
      }
    } catch { setError("Failed to load student data") }
    finally { setLoading(false) }
  }

  async function handleAddGrade(e) {
    e.preventDefault(); setError("")
    if (!addForm.testTitle.trim())                             { setError("Test title is required"); return }
    if (!addForm.subjectId)                                    { setError("Select a subject"); return }
    if (!addForm.marks || isNaN(parseFloat(addForm.marks)))    { setError("Enter valid marks"); return }
    if (!addForm.totalMarks || parseFloat(addForm.totalMarks) <= 0) { setError("Enter total marks > 0"); return }
    if (parseFloat(addForm.marks) > parseFloat(addForm.totalMarks)) { setError("Marks cannot exceed total marks"); return }
    if (parseFloat(addForm.marks) < 0)                        { setError("Marks cannot be negative"); return }
    const selectedSubject = subjects.find(s => s.id === parseInt(addForm.subjectId))
    setAdding(true)
    try {
      await addGradeAPI({
        student_id: student.id,
        subject: selectedSubject?.name || addForm.subjectId,
        marks: parseFloat(addForm.marks),
        total_marks: parseFloat(addForm.totalMarks),
        test_title: addForm.testTitle.trim(),
      })
      setSuccess(`Grade added — ${addForm.testTitle} / ${selectedSubject?.name}`)
      setAddForm(EMPTY); setShowAddForm(false)
      await loadStudentGrades(student)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add grade")
    } finally { setAdding(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteGradeAPI(id)
      setSuccess("Grade deleted!")
      setDeleteConfirmId(null)
      if (student) await loadStudentGrades(student)
    } catch { setError("Delete failed"); setDeleteConfirmId(null) }
  }

  function clearStudent() {
    setStudent(null); setGrades([]); setError(""); setSuccess("")
    setSearchQuery(""); setSearchResults([])
    setSelectedCourse(""); setCourseStudents([])
    setShowAddForm(false); setAddForm(EMPTY)
  }

  const { grouped, subjects_, avgPct, overall } = useMemo(() => {
    const grouped   = groupBySubject(grades)
    const subjects_ = Object.keys(grouped)
    const totalMarks = grades.reduce((s, g) => s + g.marks, 0)
    const totalMax   = grades.reduce((s, g) => s + g.total_marks, 0)
    const avgPct     = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0
    const overall    = overallGrade(parseFloat(avgPct))
    return { grouped, subjects_, avgPct, overall }
  }, [grades])

  return (
    <div className="space-y-5">

      {/* ── Student selector ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <h3 className="text-base font-semibold text-gray-700">Find Student</h3>
          <div className="flex border rounded-lg overflow-hidden text-sm">
            <button onClick={() => { setViewMode("search"); setSelectedCourse(""); setCourseStudents([]) }}
              className={`px-4 py-1.5 font-medium transition ${viewMode === "search" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
              Search
            </button>
            <button onClick={() => { setViewMode("course"); setSearchQuery(""); setSearchResults([]) }}
              className={`px-4 py-1.5 font-medium transition ${viewMode === "course" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
              Browse by Course
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {viewMode === "search" ? (
            <form onSubmit={handleSearch} className="flex gap-2">
              <input type="text" placeholder="Search by name, STU0001, email or phone…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]) }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={searching}
                className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm">
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
                <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Loading students…
                </div>
              ) : selectedCourse && courseStudents.length === 0 ? (
                <p className="text-sm text-gray-400">No students in this course.</p>
              ) : courseStudents.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400">{courseStudents.length} student{courseStudents.length !== 1 ? "s" : ""} — click to view grades</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                    {courseStudents.map((s) => (
                      <button key={s.id} onClick={() => loadStudentGrades(s)}
                        className={`text-left rounded-lg border px-3 py-2.5 transition hover:shadow-md hover:border-blue-400 hover:bg-blue-50
                          ${student?.id === s.id ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 bg-white"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-mono text-xs text-gray-400">{s.student_code || `#${s.id}`}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{s.name}</p>
                        {s.phone && <p className="text-xs text-gray-400 truncate mt-0.5">{s.phone}</p>}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Multiple search matches */}
          {searchResults.length > 1 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">{searchResults.length} students found — click one:</p>
              <div className="divide-y border rounded-lg overflow-hidden">
                {searchResults.map((s) => (
                  <button key={s.id} onClick={() => loadStudentGrades(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition flex items-center gap-4 text-sm">
                    <span className="font-mono text-xs text-gray-400 w-20 shrink-0">{s.student_code || `#${s.id}`}</span>
                    <span className="font-medium text-gray-800 flex-1">{s.name}</span>
                    <span className="text-gray-400 text-xs">{s.course || ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm p-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading grades…
        </div>
      )}

      {/* Student banner */}
      {student && !loading && (
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          {student.photo
            ? <img src={student.photo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            : <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">🎓</div>
          }
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-800">{student.name}</p>
            <p className="text-gray-500 text-sm">
              <span className="font-mono mr-2">{student.student_code || `#${student.id}`}</span>
              {student.course && <span>· {student.course}</span>}
            </p>
          </div>
          {grades.length > 0 && (
            <div className="text-right mr-2">
              <p className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</p>
              <p className="text-xs text-gray-400">{avgPct}% average</p>
            </div>
          )}
          <div className="flex gap-2 flex-shrink-0">
            {grades.length > 0 && (
              <button onClick={() => setShowReportCard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                📄 Report Card
              </button>
            )}
            <button onClick={() => setShowAddForm(v => !v)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
              {showAddForm ? "✕ Cancel" : "+ Add Grade"}
            </button>
            <button onClick={clearStudent}
              className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none transition px-1">×</button>
          </div>
        </div>
      )}

      {/* Add Grade Form */}
      {showAddForm && student && !loading && (
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Grade for {student.name}</h3>
          <form onSubmit={handleAddGrade}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="sm:col-span-2">
                <label className="form-label">Test Title *</label>
                <input type="text" value={addForm.testTitle}
                  onChange={e => setAddForm(f => ({ ...f, testTitle: e.target.value }))}
                  placeholder="e.g. Unit Test 1, Mid Term, Final Exam"
                  className="inp" />
              </div>
              <div>
                <label className="form-label">Subject *</label>
                {loadingSubjects ? (
                  <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400">Loading...</div>
                ) : subjects.length > 0 ? (
                  <select value={addForm.subjectId}
                    onChange={e => setAddForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="inp">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <input type="text" value={addForm.subjectId}
                    onChange={e => setAddForm(f => ({ ...f, subjectId: e.target.value }))}
                    placeholder="Type subject name"
                    className="inp" />
                )}
                {!loadingSubjects && subjects.length === 0 && student?.course && (
                  <p className="text-xs text-orange-500 mt-1">No subjects for "{student.course}" — type manually</p>
                )}
              </div>
              <div>
                <label className="form-label">Total Marks *</label>
                <input type="number" value={addForm.totalMarks} min="1"
                  onChange={e => setAddForm(f => ({ ...f, totalMarks: e.target.value }))}
                  placeholder="e.g. 100"
                  className="inp" />
              </div>
              <div>
                <label className="form-label">Marks Obtained *</label>
                <input type="number" value={addForm.marks} min="0" max={addForm.totalMarks || undefined}
                  onChange={e => setAddForm(f => ({ ...f, marks: e.target.value }))}
                  placeholder="e.g. 75"
                  className="inp" />
                {addForm.marks && addForm.totalMarks && parseFloat(addForm.marks) > parseFloat(addForm.totalMarks) && (
                  <p className="text-xs text-red-500 mt-0.5">Exceeds total marks!</p>
                )}
              </div>
              {addForm.marks && addForm.totalMarks && parseFloat(addForm.totalMarks) > 0 && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 sm:col-span-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <span className="font-semibold text-gray-700 text-sm">
                    {((parseFloat(addForm.marks) / parseFloat(addForm.totalMarks)) * 100).toFixed(1)}%
                  </span>
                  {(() => {
                    const pct = (parseFloat(addForm.marks) / parseFloat(addForm.totalMarks)) * 100
                    const g = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F"
                    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g)}`}>{g}</span>
                  })()}
                </div>
              )}
            </div>
            <button type="submit" disabled={adding}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 text-sm">
              {adding ? "Saving..." : "Save Grade"}
            </button>
          </form>
        </div>
      )}

      {/* Summary cards */}
      {grades.length > 0 && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Subjects</p>
              <p className="text-2xl font-bold text-gray-800">{subjects_.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Overall Score</p>
              <p className="text-2xl font-bold text-gray-800">{avgPct}%</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500">Overall Grade</p>
              <p className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</p>
            </div>
          </div>

          {/* Subject-wise tables */}
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
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b bg-gray-50">
                          <th className="text-left px-5 py-2 font-medium">Test</th>
                          <th className="text-left px-5 py-2 font-medium">Marks</th>
                          <th className="text-left px-5 py-2 font-medium">Total</th>
                          <th className="text-left px-5 py-2 font-medium">%</th>
                          <th className="text-left px-5 py-2 font-medium">Grade</th>
                          <th className="px-5 py-2" />
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
                              <td className="px-5 py-3">
                                <span className={`font-semibold ${pctColor(parseFloat(pct))}`}>{pct}%</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>{g.grade}</span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                {deleteConfirmId === g.id ? (
                                  <div className="flex gap-1 justify-end items-center">
                                    <span className="text-xs text-red-600">Delete?</span>
                                    <button onClick={() => handleDelete(g.id)} className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">Yes</button>
                                    <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">No</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeleteConfirmId(g.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs">Delete</button>
                                )}
                              </td>
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
        </>
      )}

      {showReportCard && student && (
        <ReportCardModal studentId={student.id} onClose={() => setShowReportCard(false)} />
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
