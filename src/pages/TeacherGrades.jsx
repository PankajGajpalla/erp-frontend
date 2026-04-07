import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { getStudentsByCourseAPI, addGradeAPI, getGradesAPI, getStudentAPI } from "../api"

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

function getOverallGrade(pct) {
  if (pct >= 90) return { grade: "A+", color: "text-green-600" }
  if (pct >= 80) return { grade: "A", color: "text-green-500" }
  if (pct >= 70) return { grade: "B", color: "text-blue-600" }
  if (pct >= 60) return { grade: "C", color: "text-yellow-600" }
  if (pct >= 50) return { grade: "D", color: "text-orange-600" }
  return { grade: "F", color: "text-red-600" }
}

export default function TeacherGrades() {
  const [activeTab, setActiveTab] = useState("add")

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Grades</h2>

        <div className="bg-white rounded-xl shadow mb-6">
          <div className="flex border-b">
            {[
              { key: "add", label: "➕ Add Grades" },
              { key: "view", label: "📊 View Performance" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition border-b-2
                  ${activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}>
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

// ─── Add Grades ───────────────────────────────────────────────
function AddGrades() {
  const [course, setCourse] = useState("")
  const [subject, setSubject] = useState("")
  const [totalMarks, setTotalMarks] = useState("")
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saveProgress, setSaveProgress] = useState(0)

  // ✅ Auto clear success after 4 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000)
      return () => clearTimeout(timer)
    }
  }, [success])

  async function loadStudents(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!course.trim() || !subject.trim() || !totalMarks) {
      setError("All fields are required")
      return
    }

    if (parseFloat(totalMarks) <= 0) {
      setError("Total marks must be greater than 0")
      return
    }

    setLoading(true)
    try {
      const res = await getStudentsByCourseAPI(course.trim())
      const studentList = res.data.students
      if (studentList.length === 0) {
        setError(`No students found in course "${course}"`)
        setStudents([])
        return
      }
      setStudents(studentList)
      const defaultMarks = {}
      studentList.forEach((s) => { defaultMarks[s.id] = "" })
      setMarks(defaultMarks)
    } catch (err) {
      setError("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGrades() {
    setError("")
    setSuccess("")

    // ✅ Validate all marks filled
    const missing = students.filter((s) => marks[s.id] === "" || marks[s.id] === undefined)
    if (missing.length > 0) {
      setError(`Please enter marks for all ${missing.length} students`)
      return
    }

    // ✅ Validate no negative marks
    const negative = students.filter((s) => parseFloat(marks[s.id]) < 0)
    if (negative.length > 0) {
      setError(`Marks cannot be negative for: ${negative.map(s => s.name).join(", ")}`)
      return
    }

    // Validate marks don't exceed total
    const invalid = students.filter((s) => parseFloat(marks[s.id]) > parseFloat(totalMarks))
    if (invalid.length > 0) {
      setError(`Marks exceed total (${totalMarks}) for: ${invalid.map(s => s.name).join(", ")}`)
      return
    }

    setSaving(true)
    setSaveProgress(0)

    // ✅ Save all grades and track progress
    let saved = 0
    let failed = 0
    for (const student of students) {
      try {
        await addGradeAPI({
          student_id: student.id,
          subject: subject.trim(),
          marks: parseFloat(marks[student.id]),
          total_marks: parseFloat(totalMarks)
        })
        saved++
        setSaveProgress(Math.round((saved / students.length) * 100))
      } catch (err) {
        failed++
      }
    }

    setSaving(false)
    setSaveProgress(0)

    if (failed === 0) {
      setSuccess(`✅ Grades saved for ${saved} students in ${subject}!`)
      setStudents([])
      setCourse("")
      setSubject("")
      setTotalMarks("")
      setMarks({})
    } else {
      setError(`⚠️ ${saved} saved, ${failed} failed. Check student IDs and try again.`)
    }
  }

  // ✅ Live stats
  const filledCount = students.filter((s) => marks[s.id] !== "").length
  const invalidCount = students.filter((s) =>
    marks[s.id] !== "" && parseFloat(marks[s.id]) > parseFloat(totalMarks)
  ).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Course & Subject</h3>
        <form onSubmit={loadStudents} className="flex flex-wrap gap-3">
          <input type="text" placeholder="Course (e.g. BCA)" value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Subject (e.g. Mathematics)" value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Total Marks" value={totalMarks}
            onChange={(e) => setTotalMarks(e.target.value)} min="1"
            className="border border-gray-300 rounded-lg px-4 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </span>
            ) : "Load Students"}
          </button>
        </form>
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Enter Marks — {subject} — {course}
              </h3>
              <div className="flex gap-4 mt-1 text-sm">
                <span className="text-gray-400">Total: {totalMarks}</span>
                <span className="text-blue-600">{filledCount}/{students.length} filled</span>
                {invalidCount > 0 && (
                  <span className="text-red-600">{invalidCount} exceed total!</span>
                )}
              </div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-6 py-3">ID</th>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Course</th>
                <th className="text-left px-6 py-3">Marks (out of {totalMarks})</th>
                <th className="text-left px-6 py-3">%</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const val = marks[s.id]
                const pct = val !== "" && !isNaN(parseFloat(val))
                  ? ((parseFloat(val) / parseFloat(totalMarks)) * 100).toFixed(1)
                  : "—"
                const isOver = val !== "" && parseFloat(val) > parseFloat(totalMarks)
                const isNeg = val !== "" && parseFloat(val) < 0
                const hasError = isOver || isNeg

                return (
                  <tr key={s.id} className={`border-t transition ${hasError ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-3 text-gray-400">{s.id}</td>
                    <td className="px-6 py-3 font-medium">{s.name}</td>
                    <td className="px-6 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        {s.course}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <input
                        type="number"
                        placeholder="0"
                        value={val || ""}
                        min="0"
                        max={totalMarks}
                        onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                        className={`border rounded-lg px-3 py-1 w-28 text-sm focus:outline-none focus:ring-2
                          ${hasError
                            ? "border-red-400 focus:ring-red-400"
                            : "border-gray-300 focus:ring-blue-500"}`}
                      />
                      {isOver && <p className="text-red-500 text-xs mt-1">Exceeds total!</p>}
                      {isNeg && <p className="text-red-500 text-xs mt-1">Cannot be negative!</p>}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {pct !== "—" ? (
                        <span className={parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}>
                          {pct}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="p-6 border-t">
            {/* ✅ Progress bar while saving */}
            {saving && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Saving grades...</span>
                  <span>{saveProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${saveProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleSaveGrades}
                disabled={saving || invalidCount > 0}
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save Grades for ${students.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── View Performance ─────────────────────────────────────────
function ViewPerformance() {
  const [studentId, setStudentId] = useState("")
  const [student, setStudent] = useState(null)
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSearch(e) {
    e.preventDefault()
    if (!studentId) {
      setError("Enter a student ID")
      return
    }
    setLoading(true)
    setError("")
    setGrades([])
    setStudent(null)
    try {
      const [studentRes, gradesRes] = await Promise.all([
        getStudentAPI(studentId),
        getGradesAPI(studentId)
      ])
      setStudent(studentRes.data)
      setGrades(gradesRes.data.grades)
      if (gradesRes.data.grades.length === 0) {
        setError("No grades found for this student")
      }
    } catch (err) {
      setError("Student not found")
    } finally {
      setLoading(false)
    }
  }

  const totalSubjects = grades.length
  const avgPercentage = totalSubjects > 0
    ? (grades.reduce((sum, g) => sum + (g.marks / g.total_marks) * 100, 0) / totalSubjects).toFixed(1)
    : 0
  const overall = getOverallGrade(parseFloat(avgPercentage))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Search Student Performance</h3>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input type="number" placeholder="Student ID" value={studentId} min="1"
            onChange={(e) => { setStudentId(e.target.value); setError("") }}
            className="border border-gray-300 rounded-lg px-4 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </span>
            ) : "Search"}
          </button>
        </form>
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {student && (
        <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
            🎓
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-800">{student.name}</h4>
            <p className="text-gray-500">{student.course || "No course"} · ID: {student.id}</p>
          </div>
        </div>
      )}

      {grades.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Subjects</p>
              <p className="text-3xl font-bold text-gray-800">{totalSubjects}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Average Percentage</p>
              <p className="text-3xl font-bold text-gray-800">{avgPercentage}%</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500">Overall Grade</p>
              <p className={`text-3xl font-bold ${overall.color}`}>{overall.grade}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-700">Subject-wise Performance</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">Subject</th>
                  <th className="text-left px-6 py-3">Marks</th>
                  <th className="text-left px-6 py-3">Total</th>
                  <th className="text-left px-6 py-3">Percentage</th>
                  <th className="text-left px-6 py-3">Grade</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => {
                  const pct = ((g.marks / g.total_marks) * 100).toFixed(1)
                  return (
                    <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium">{g.subject}</td>
                      <td className="px-6 py-3">{g.marks}</td>
                      <td className="px-6 py-3">{g.total_marks}</td>
                      <td className="px-6 py-3">
                        <span className={`font-medium ${parseFloat(pct) >= 50 ? "text-green-600" : "text-red-600"}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>
                          {g.grade}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}