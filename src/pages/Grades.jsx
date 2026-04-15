import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getGradesAPI, addGradeAPI, deleteGradeAPI, getStudentAPI, getSubjectsByCourseAPI } from "../api"
import ReportCardModal from "../components/ReportCardModal"

function gradeColor(grade) {
  switch (grade) {
    case "A+": return "bg-green-100 text-green-700"
    case "A":  return "bg-green-100 text-green-600"
    case "B":  return "bg-blue-100 text-blue-700"
    case "C":  return "bg-yellow-100 text-yellow-700"
    case "D":  return "bg-orange-100 text-orange-700"
    case "F":  return "bg-red-100 text-red-700"
    default:   return "bg-gray-100 text-gray-700"
  }
}
function pctColor(pct) {
  if (pct >= 75) return "text-green-600"
  if (pct >= 50) return "text-yellow-600"
  return "text-red-600"
}
function barColor(pct) {
  if (pct >= 75) return "bg-green-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-red-500"
}
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

const EMPTY_ADD = { testTitle: "", subjectId: "", marks: "", totalMarks: "" }

export default function Grades() {
  const { user, isAdmin } = useAuth()

  const [grades, setGrades]                     = useState([])
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState("")
  const [success, setSuccess]                   = useState("")
  const [deleteConfirmId, setDeleteConfirmId]   = useState(null)
  const [searchId, setSearchId]                 = useState("")
  const [showReportCard, setShowReportCard]     = useState(false)

  // Admin — add grade form
  const [studentProfile, setStudentProfile]     = useState(null)
  const [subjects, setSubjects]                 = useState([])
  const [loadingSubjects, setLoadingSubjects]   = useState(false)
  const [addForm, setAddForm]                   = useState(EMPTY_ADD)
  const [adding, setAdding]                     = useState(false)
  const [showAddForm, setShowAddForm]           = useState(false)

  useEffect(() => {
    if (!isAdmin && user?.student_id) fetchGrades(user.student_id)
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function fetchGrades(id) {
    if (!id) return
    setLoading(true); setError("")
    try {
      const res = await getGradesAPI(id)
      setGrades(res.data.grades)
    } catch { setError("Failed to load grades") }
    finally { setLoading(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteGradeAPI(id)
      setSuccess("Grade deleted!")
      setDeleteConfirmId(null)
      if (searchId) fetchGrades(searchId)
      else if (user?.student_id) fetchGrades(user.student_id)
    } catch { setError("Delete failed"); setDeleteConfirmId(null) }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchId.trim()) { setError("Enter a student ID"); return }
    setStudentProfile(null); setSubjects([]); setAddForm(EMPTY_ADD); setShowAddForm(false)
    fetchGrades(searchId)
    // Also fetch student profile to get course → subjects
    try {
      const res = await getStudentAPI(searchId)
      const profile = res.data
      setStudentProfile(profile)
      if (profile.course) {
        setLoadingSubjects(true)
        // We need course_id — find by name from subjects endpoint
        // Use getSubjectsByCourseAPI via course name isn't possible without course_id
        // So we'll search all courses to find the id
        const { getCoursesAPI } = await import("../api")
        const coursesRes = await getCoursesAPI()
        const match = coursesRes.data.courses.find(c => c.name === profile.course)
        if (match) {
          const { getSubjectsByCourseAPI: getSubs } = await import("../api")
          const subjRes = await getSubs(match.id)
          setSubjects(subjRes.data.subjects || [])
        }
        setLoadingSubjects(false)
      }
    } catch { /* non-fatal */ setLoadingSubjects(false) }
  }

  async function handleAddGrade(e) {
    e.preventDefault()
    if (!addForm.testTitle.trim())                          { setError("Test title is required"); return }
    if (!addForm.subjectId)                                 { setError("Select a subject"); return }
    if (!addForm.marks || isNaN(parseFloat(addForm.marks))) { setError("Enter valid marks"); return }
    if (!addForm.totalMarks || parseFloat(addForm.totalMarks) <= 0) { setError("Enter total marks > 0"); return }
    if (parseFloat(addForm.marks) > parseFloat(addForm.totalMarks)) { setError("Marks cannot exceed total marks"); return }
    if (parseFloat(addForm.marks) < 0)                     { setError("Marks cannot be negative"); return }

    const selectedSubject = subjects.find(s => s.id === parseInt(addForm.subjectId))
    setAdding(true); setError("")
    try {
      await addGradeAPI({
        student_id: parseInt(searchId),
        subject: selectedSubject?.name || addForm.subjectId,
        marks: parseFloat(addForm.marks),
        total_marks: parseFloat(addForm.totalMarks),
        test_title: addForm.testTitle.trim(),
      })
      setSuccess(`Grade added — ${addForm.testTitle} / ${selectedSubject?.name}`)
      setAddForm(EMPTY_ADD)
      fetchGrades(searchId)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add grade")
    } finally { setAdding(false) }
  }

  const grouped  = groupBySubject(grades)
  const subjects_ = Object.keys(grouped)
  const totalMarks = grades.reduce((s, g) => s + g.marks, 0)
  const totalMax   = grades.reduce((s, g) => s + g.total_marks, 0)
  const avgPct     = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0
  const overall    = overallGrade(parseFloat(avgPct))

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{isAdmin ? "Grades" : "My Grades"}</h2>
          {!isAdmin && grades.length > 0 && (
            <button onClick={() => setShowReportCard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              📄 Download Report Card
            </button>
          )}
        </div>

        {showReportCard && (
          <ReportCardModal studentId={user.student_id} onClose={() => setShowReportCard(false)} />
        )}

        {/* Admin: Search + Add */}
        {isAdmin && (
          <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">View / Add Student Grades</h3>
              <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
                <input type="number" placeholder="Student ID" value={searchId}
                  onChange={(e) => { setSearchId(e.target.value); setError("") }} min="1"
                  className="border border-gray-300 rounded-lg px-4 py-2 w-36 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={loading}
                  className="bg-gray-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50">
                  {loading ? "Loading..." : "Load Grades"}
                </button>
              </form>

              {/* Student info banner */}
              {studentProfile && (
                <div className="mt-3 flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-3">
                  {studentProfile.photo
                    ? <img src={studentProfile.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">{studentProfile.name?.[0]}</div>
                  }
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{studentProfile.name}</p>
                    <p className="text-xs text-gray-500">{studentProfile.course || "No course"} · {studentProfile.student_code}</p>
                  </div>
                  <button onClick={() => setShowAddForm(v => !v)}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition">
                    {showAddForm ? "✕ Cancel" : "+ Add Grade"}
                  </button>
                </div>
              )}
            </div>

            {/* Add Grade Form */}
            {showAddForm && studentProfile && (
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Grade for {studentProfile.name}</h3>
                <form onSubmit={handleAddGrade}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Test Title *</label>
                      <input type="text" value={addForm.testTitle}
                        onChange={e => setAddForm(f => ({ ...f, testTitle: e.target.value }))}
                        placeholder="e.g. Unit Test 1, Mid Term, Final Exam"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                      {loadingSubjects ? (
                        <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400">Loading subjects...</div>
                      ) : subjects.length > 0 ? (
                        <select value={addForm.subjectId}
                          onChange={e => setAddForm(f => ({ ...f, subjectId: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="">Select subject</option>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={addForm.subjectId}
                          onChange={e => setAddForm(f => ({ ...f, subjectId: e.target.value }))}
                          placeholder="Type subject name"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {!loadingSubjects && subjects.length === 0 && studentProfile?.course && (
                        <p className="text-xs text-orange-500 mt-1">No subjects found for "{studentProfile.course}" — type manually</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total Marks *</label>
                      <input type="number" value={addForm.totalMarks} min="1"
                        onChange={e => setAddForm(f => ({ ...f, totalMarks: e.target.value }))}
                        placeholder="e.g. 100"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Marks Obtained *</label>
                      <input type="number" value={addForm.marks} min="0"
                        max={addForm.totalMarks || undefined}
                        onChange={e => setAddForm(f => ({ ...f, marks: e.target.value }))}
                        placeholder="e.g. 75"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {addForm.marks && addForm.totalMarks && parseFloat(addForm.marks) > parseFloat(addForm.totalMarks) && (
                        <p className="text-xs text-red-500 mt-0.5">Exceeds total marks!</p>
                      )}
                    </div>

                    {/* Preview */}
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

                  {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
                  {success && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}

                  <button type="submit" disabled={adding}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 text-sm">
                    {adding ? "Saving..." : "Save Grade"}
                  </button>
                </form>
              </div>
            )}

            {error && !showAddForm && <p className="text-red-600 text-sm">{error}</p>}
            {success && !showAddForm && <p className="text-green-600 text-sm">{success}</p>}
          </div>
        )}

        {!isAdmin && error  && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {!isAdmin && success && <p className="text-green-600 text-sm mb-4">{success}</p>}

        {loading && (
          <div className="bg-white rounded-xl shadow p-8 flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading grades...
          </div>
        )}

        {!loading && grades.length === 0 && (isAdmin ? !!searchId : true) && (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-400">No grades found.</p>
          </div>
        )}

        {/* Summary cards */}
        {!loading && grades.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4 sm:p-5 border-l-4 border-blue-500">
                <p className="text-xs text-gray-500 mb-1">Subjects</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{subjects_.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 sm:p-5 border-l-4 border-green-500">
                <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-800">{avgPct}%</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 sm:p-5 border-l-4 border-purple-500">
                <p className="text-xs text-gray-500 mb-1">Overall Grade</p>
                <p className={`text-2xl sm:text-3xl font-bold ${overall.color}`}>{overall.grade}</p>
              </div>
            </div>

            {/* Subject-wise sections */}
            <div className="space-y-4">
              {subjects_.map((subject) => {
                const tests      = grouped[subject]
                const sTotal     = tests.reduce((s, g) => s + g.marks, 0)
                const sMax       = tests.reduce((s, g) => s + g.total_marks, 0)
                const sPct       = sMax > 0 ? ((sTotal / sMax) * 100).toFixed(1) : 0
                const sGrade     = overallGrade(parseFloat(sPct))

                return (
                  <div key={subject} className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm sm:text-base">{subject}</p>
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
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 border-b bg-gray-50">
                            <th className="text-left px-4 sm:px-5 py-2 font-medium">Test</th>
                            <th className="text-left px-4 sm:px-5 py-2 font-medium">Marks</th>
                            <th className="text-left px-4 sm:px-5 py-2 font-medium">Total</th>
                            <th className="text-left px-4 sm:px-5 py-2 font-medium">%</th>
                            <th className="text-left px-4 sm:px-5 py-2 font-medium">Grade</th>
                            {isAdmin && <th className="px-4 sm:px-5 py-2" />}
                          </tr>
                        </thead>
                        <tbody>
                          {tests.map((g) => {
                            const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                            return (
                              <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                                <td className="px-4 sm:px-5 py-3 font-medium text-gray-700">
                                  {g.test_title || <span className="text-gray-400 italic">Unnamed Test</span>}
                                </td>
                                <td className="px-4 sm:px-5 py-3 text-gray-800">{g.marks}</td>
                                <td className="px-4 sm:px-5 py-3 text-gray-500">{g.total_marks}</td>
                                <td className="px-4 sm:px-5 py-3">
                                  <span className={`font-semibold ${pctColor(parseFloat(pct))}`}>{pct}%</span>
                                </td>
                                <td className="px-4 sm:px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>{g.grade}</span>
                                </td>
                                {isAdmin && (
                                  <td className="px-4 sm:px-5 py-3 text-right">
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
                                )}
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
      </main>
    </div>
  )
}
