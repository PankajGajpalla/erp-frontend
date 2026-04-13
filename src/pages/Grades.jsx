import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getGradesAPI, deleteGradeAPI } from "../api"
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

// Group an array of grade records by subject name
function groupBySubject(grades) {
  const map = {}
  for (const g of grades) {
    if (!map[g.subject]) map[g.subject] = []
    map[g.subject].push(g)
  }
  return map
}

export default function Grades() {
  const { user, isAdmin } = useAuth()

  const [grades, setGrades]               = useState([])
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState("")
  const [success, setSuccess]             = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [searchId, setSearchId]           = useState("")
  const [showReportCard, setShowReportCard] = useState(false)

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
    fetchGrades(searchId)
  }

  const grouped = groupBySubject(grades)
  const subjects = Object.keys(grouped)

  // Overall stats across all grades
  const totalMarks  = grades.reduce((s, g) => s + g.marks, 0)
  const totalMax    = grades.reduce((s, g) => s + g.total_marks, 0)
  const avgPct      = totalMax > 0 ? ((totalMarks / totalMax) * 100).toFixed(1) : 0
  const overall     = overallGrade(parseFloat(avgPct))

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Grades</h2>
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

        {/* Admin: search */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">View Student Grades</h3>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="number" placeholder="Student ID" value={searchId}
                onChange={(e) => { setSearchId(e.target.value); setError("") }} min="1"
                className="border border-gray-300 rounded-lg px-4 py-2 w-36 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={loading}
                className="bg-gray-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50">
                {loading ? "Loading..." : "Load Grades"}
              </button>
            </form>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
          </div>
        )}

        {!isAdmin && error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {!isAdmin && success && <p className="text-green-600 text-sm mb-4">{success}</p>}

        {loading && (
          <div className="bg-white rounded-xl shadow p-8 flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading grades...
          </div>
        )}

        {!loading && grades.length === 0 && (isAdmin ? searchId : true) && (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-gray-400">No grades found.</p>
          </div>
        )}

        {/* Summary cards */}
        {!loading && grades.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
                <p className="text-xs text-gray-500 mb-1">Subjects</p>
                <p className="text-3xl font-bold text-gray-800">{subjects.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
                <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                <p className="text-3xl font-bold text-gray-800">{avgPct}%</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5 border-l-4 border-purple-500">
                <p className="text-xs text-gray-500 mb-1">Overall Grade</p>
                <p className={`text-3xl font-bold ${overall.color}`}>{overall.grade}</p>
              </div>
            </div>

            {/* Subject-wise sections */}
            <div className="space-y-4">
              {subjects.map((subject) => {
                const tests = grouped[subject]
                const subjectTotal  = tests.reduce((s, g) => s + g.marks, 0)
                const subjectMax    = tests.reduce((s, g) => s + g.total_marks, 0)
                const subjectPct    = subjectMax > 0 ? ((subjectTotal / subjectMax) * 100).toFixed(1) : 0
                const subjectGrade  = overallGrade(parseFloat(subjectPct))

                return (
                  <div key={subject} className="bg-white rounded-xl shadow overflow-hidden">
                    {/* Subject header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">{subject}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{tests.length} test{tests.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Mini progress bar */}
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-28 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${barColor(parseFloat(subjectPct))}`}
                              style={{ width: `${Math.min(subjectPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${pctColor(parseFloat(subjectPct))}`}>
                            {subjectPct}%
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${gradeColor(subjectGrade.grade)}`}>
                          {subjectGrade.grade}
                        </span>
                      </div>
                    </div>

                    {/* Tests table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b bg-gray-50">
                          <th className="text-left px-5 py-2 font-medium">Test</th>
                          <th className="text-left px-5 py-2 font-medium">Marks</th>
                          <th className="text-left px-5 py-2 font-medium">Total</th>
                          <th className="text-left px-5 py-2 font-medium">%</th>
                          <th className="text-left px-5 py-2 font-medium">Grade</th>
                          {isAdmin && <th className="px-5 py-2" />}
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((g) => {
                          const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                          return (
                            <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                              <td className="px-5 py-3 font-medium text-gray-700">
                                {g.test_title || <span className="text-gray-400 italic">Unnamed Test</span>}
                              </td>
                              <td className="px-5 py-3 text-gray-800">{g.marks}</td>
                              <td className="px-5 py-3 text-gray-500">{g.total_marks}</td>
                              <td className="px-5 py-3">
                                <span className={`font-semibold ${pctColor(parseFloat(pct))}`}>{pct}%</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>
                                  {g.grade}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-5 py-3 text-right">
                                  {deleteConfirmId === g.id ? (
                                    <div className="flex gap-1 justify-end items-center">
                                      <span className="text-xs text-red-600">Delete?</span>
                                      <button onClick={() => handleDelete(g.id)}
                                        className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">Yes</button>
                                      <button onClick={() => setDeleteConfirmId(null)}
                                        className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">No</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setDeleteConfirmId(g.id)}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs">
                                      Delete
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
