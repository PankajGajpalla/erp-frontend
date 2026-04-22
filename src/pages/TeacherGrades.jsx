import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { getCoursesAPI, getSubjectsByCourseAPI, getStudentsByCourseAPI, addGradeAPI, getGradesAPI, getStudentAPI, searchStudentsAPI } from "../api"

function gradeColor(grade) {
  const map = { "A+": "bg-green-100 text-green-700", "A": "bg-green-100 text-green-600", "B": "bg-blue-100 text-blue-700", "C": "bg-yellow-100 text-yellow-700", "D": "bg-orange-100 text-orange-700", "F": "bg-red-100 text-red-700" }
  return map[grade] || "bg-gray-100 text-gray-700"
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
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Grades</h2>
        <div className="bg-white rounded-xl shadow mb-5">
          <div className="flex border-b">
            {[{ key: "add", label: "Add Grades" }, { key: "view", label: "View Performance" }].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition border-b-2 ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
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
    <div className={`flex items-center gap-2 text-sm ${active ? "text-blue-600 font-semibold" : done ? "text-green-600" : "text-gray-400"}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
        ${active ? "border-blue-600 text-blue-600" : done ? "border-green-500 bg-green-500 text-white" : "border-gray-300 text-gray-400"}`}>
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

  // Form fields
  const [testTitle, setTestTitle]       = useState("")
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [totalMarks, setTotalMarks]     = useState("")

  // Students + marks
  const [students, setStudents]   = useState([])
  const [marks, setMarks]         = useState({})

  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState("")

  // Determine current step
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
    setSelectedCourse(c)
    setSelectedSubject(null)
    setSubjects([])
    setStudents([])
    setMarks({})
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
    setStudents([])
    setMarks({})
  }

  async function handleLoadStudents(e) {
    e.preventDefault()
    setError(""); setSuccess("")
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
        await addGradeAPI({
          student_id: s.id,
          subject: selectedSubject.name,
          marks: parseFloat(marks[s.id]),
          total_marks: parseFloat(totalMarks),
          test_title: testTitle.trim()
        })
        saved++
        setSaveProgress(Math.round((saved / students.length) * 100))
      } catch { failed++ }
    }
    setSaving(false); setSaveProgress(0)

    if (failed === 0) {
      setSuccess(`Grades saved for ${saved} students — ${testTitle} / ${selectedSubject.name}`)
      setStudents([]); setMarks({})
      setTestTitle(""); setSelectedCourse(null); setSelectedSubject(null)
      setSubjects([]); setTotalMarks("")
    } else {
      setError(`${saved} saved, ${failed} failed. Check and retry.`)
    }
  }

  const filledCount   = students.filter((s) => marks[s.id] !== "").length
  const invalidCount  = students.filter((s) => marks[s.id] !== "" && parseFloat(marks[s.id]) > parseFloat(totalMarks)).length

  return (
    <div className="space-y-5">

      {/* Steps header */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-6 flex-wrap">
        <StepBadge n={1} label="Test Details" active={step === 1} done={step > 1} />
        <span className="text-gray-300 self-center">—</span>
        <StepBadge n={2} label="Load Students" active={step === 1} done={step > 1} />
        <span className="text-gray-300 self-center">—</span>
        <StepBadge n={3} label="Enter Marks" active={step === 3} done={false} />
      </div>

      {/* Step 1 & 2: Test details form */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">Test Details</h3>
        <form onSubmit={handleLoadStudents}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Test Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Test Title *</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Unit Test 1, Mid Term Exam, Final Exam"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {/* Course */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Course *</label>
              <select value={selectedCourse?.id || ""} onChange={handleCourseChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
              <select value={selectedSubject?.id || ""} onChange={handleSubjectChange}
                disabled={!selectedCourse || loadingSubjects}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50">
                <option value="">{loadingSubjects ? "Loading subjects..." : "Select subject"}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.teacher_name ? ` — ${s.teacher_name}` : ""}</option>
                ))}
              </select>
              {selectedCourse && subjects.length === 0 && !loadingSubjects && (
                <p className="text-xs text-orange-500 mt-1">No subjects in this course. Add subjects from the Courses page.</p>
              )}
            </div>
            {/* Total Marks */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Marks *</label>
              <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 100" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
          {success && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}

          <button type="submit" disabled={loadingStudents}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
            {loadingStudents ? "Loading students..." : "Load Students →"}
          </button>
        </form>
      </div>

      {/* Step 3: Mark entry table */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b bg-blue-50">
            <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Test</p>
                <p className="font-bold text-gray-800">{testTitle}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Course</p>
                <p className="font-semibold text-gray-700">{selectedCourse?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Subject</p>
                <p className="font-semibold text-gray-700">{selectedSubject?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Marks</p>
                <p className="font-semibold text-gray-700">{totalMarks}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">{filledCount} / {students.length} filled</p>
                {invalidCount > 0 && <p className="text-xs text-red-600 font-medium">{invalidCount} exceed total!</p>}
              </div>
            </div>
          </div>

          {/* Marks Table */}
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
                      <p className="text-xs text-gray-400">ID: {s.id}</p>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number" placeholder="—" value={val}
                        min="0" max={totalMarks}
                        onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                        className={`border rounded-lg px-3 py-1.5 w-28 text-sm focus:outline-none focus:ring-2
                          ${isOver || isNeg ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500"}`}
                      />
                      {isOver && <p className="text-red-500 text-xs mt-0.5">Exceeds total!</p>}
                      {isNeg  && <p className="text-red-500 text-xs mt-0.5">Cannot be negative!</p>}
                    </td>
                    <td className="px-5 py-3">
                      {pct !== null ? (
                        <span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {letterGrade ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor(letterGrade)}`}>{letterGrade}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Save */}
          <div className="p-5 border-t">
            {saving && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Saving grades...</span><span>{saveProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${saveProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <button onClick={() => { setStudents([]); setMarks({}) }}
                className="text-sm text-gray-500 hover:text-gray-700 underline">
                ← Back to test details
              </button>
              <button onClick={handleSave} disabled={saving || invalidCount > 0}
                className="bg-green-600 text-white px-8 py-2.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50">
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
  const [viewMode, setViewMode]             = useState("search") // "search" | "course"

  // Search mode
  const [searchQuery, setSearchQuery]       = useState("")
  const [searchResults, setSearchResults]   = useState([])
  const [searching, setSearching]           = useState(false)

  // Browse by course mode
  const [courses, setCourses]               = useState([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [courseStudents, setCourseStudents] = useState([])
  const [courseLoading, setCourseLoading]   = useState(false)

  // Selected student + their grades
  const [student, setStudent]   = useState(null)
  const [grades, setGrades]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  // Load courses once
  useEffect(() => {
    getCoursesAPI().then((r) => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  // Load students when course changes
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
    ? (grades.reduce((s, g) => s + (g.marks / g.total_marks) * 100, 0) / grades.length).toFixed(1)
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
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Mode tabs */}
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
            /* Search mode */
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, STU0001, email or phone…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]) }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={searching}
                className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm">
                {searching ? "…" : "Search"}
              </button>
            </form>
          ) : (
            /* Browse by course */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Course</label>
                <select value={selectedCourse}
                  onChange={(e) => { setSelectedCourse(e.target.value); setStudent(null); setGrades([]) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— Choose a course —</option>
                  {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {courseLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Loading students…
                </div>
              ) : selectedCourse && courseStudents.length === 0 ? (
                <p className="text-sm text-gray-400">No students in this course.</p>
              ) : courseStudents.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400">{courseStudents.length} student{courseStudents.length !== 1 ? "s" : ""} — click to view performance</p>
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

          {/* Multiple search results */}
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
        </div>
      </div>

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="flex items-center gap-3 text-gray-400 text-sm p-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading grades…
        </div>
      )}

      {/* ── Student banner ── */}
      {student && !loading && (
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">🎓</div>
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
          <button onClick={clearStudent}
            className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none transition">×</button>
        </div>
      )}

      {/* ── Summary cards ── */}
      {grades.length > 0 && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Tests</p>
              <p className="text-2xl font-bold text-blue-600">{grades.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Avg %</p>
              <p className="text-2xl font-bold text-green-600">{avgPct}%</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500">Overall</p>
              <p className={`text-2xl font-bold ${overall.color}`}>{overall.grade}</p>
            </div>
          </div>

          {/* Grouped by subject */}
          {Object.entries(bySubject).map(([subjectName, subGrades]) => {
            const subAvg = (subGrades.reduce((s, g) => s + (g.marks / g.total_marks) * 100, 0) / subGrades.length).toFixed(1)
            return (
              <div key={subjectName} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50 flex justify-between items-center">
                  <p className="font-semibold text-gray-700">{subjectName}</p>
                  <span className={`text-sm font-bold ${parseFloat(subAvg) >= 50 ? "text-green-600" : "text-red-600"}`}>{subAvg}% avg</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
                      <th className="text-left px-5 py-2">Test</th>
                      <th className="text-left px-5 py-2">Marks</th>
                      <th className="text-left px-5 py-2">Total</th>
                      <th className="text-left px-5 py-2">%</th>
                      <th className="text-left px-5 py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subGrades.map((g) => {
                      const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                      return (
                        <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                          <td className="px-5 py-2 font-medium">{g.test_title || "—"}</td>
                          <td className="px-5 py-2">{g.marks}</td>
                          <td className="px-5 py-2">{g.total_marks}</td>
                          <td className="px-5 py-2">
                            <span className={`font-semibold ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
                          </td>
                          <td className="px-5 py-2">
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
        </>
      )}
    </div>
  )
}
