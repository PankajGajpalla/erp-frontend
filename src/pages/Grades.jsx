import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getGradesAPI, addGradeAPI, deleteGradeAPI } from "../api"

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

export default function Grades() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [grades, setGrades] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filters
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [gradeFilter, setGradeFilter] = useState("all")

  // Admin search
  const [searchId, setSearchId] = useState("")

  // Add grade form
  const [form, setForm] = useState({
    student_id: "",
    subject: "",
    marks: "",
    total_marks: ""
  })

  useEffect(() => {
    if (!isAdmin) {
      fetchGrades(user.student_id)
    }
  }, [])

  // Apply filters whenever grades, subjectFilter or gradeFilter changes
  useEffect(() => {
    let result = [...grades]
    if (subjectFilter !== "all") {
      result = result.filter((g) => g.subject === subjectFilter)
    }
    if (gradeFilter !== "all") {
      result = result.filter((g) => g.grade === gradeFilter)
    }
    setFiltered(result)
  }, [grades, subjectFilter, gradeFilter])

  async function fetchGrades(id) {
    if (!id) return
    setLoading(true)
    setError("")
    try {
      const res = await getGradesAPI(id)
      setGrades(res.data.grades)
    } catch (err) {
      setError("Failed to load grades")
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.student_id || !form.subject || !form.marks || !form.total_marks) {
      setError("All fields are required")
      return
    }

    if (parseFloat(form.marks) > parseFloat(form.total_marks)) {
      setError("Marks cannot exceed total marks")
      return
    }

    try {
      await addGradeAPI({
        student_id: parseInt(form.student_id),
        subject: form.subject,
        marks: parseFloat(form.marks),
        total_marks: parseFloat(form.total_marks)
      })
      setSuccess("Grade added!")
      setForm({ student_id: "", subject: "", marks: "", total_marks: "" })
      if (searchId) fetchGrades(searchId)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add grade")
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this grade?")) return
    try {
      await deleteGradeAPI(id)
      setSuccess("Grade deleted!")
      if (searchId) fetchGrades(searchId)
      else fetchGrades(user.student_id)
    } catch (err) {
      setError("Delete failed")
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchId) {
      setError("Enter a student ID")
      return
    }
    fetchGrades(searchId)
  }

  function clearFilters() {
    setSubjectFilter("all")
    setGradeFilter("all")
  }

  // Unique subjects and grades for dropdowns
  const uniqueSubjects = [...new Set(grades.map((g) => g.subject))]
  const uniqueGrades = ["A+", "A", "B", "C", "D", "F"]

  // Summary
  const totalSubjects = grades.length
  const avgPercentage = totalSubjects > 0
    ? (grades.reduce((sum, g) => sum + (g.marks / g.total_marks) * 100, 0) / totalSubjects).toFixed(1)
    : 0

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Grades</h2>

        {/* Admin: Add Grade */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Grade</h3>
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
              <input
                type="number"
                placeholder="Student ID"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Marks"
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Total Marks"
                value={form.total_marks}
                onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add Grade
              </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
          </div>
        )}

        {/* Admin: Search */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">View Student Grades</h3>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="number"
                placeholder="Student ID"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Load Grades
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        {grades.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-gray-600">Filter:</span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Subjects</option>
                {uniqueSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Grades</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button
                onClick={clearFilters}
                className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
              >
                Clear
              </button>
              <p className="text-sm text-gray-400 ml-auto">
                Showing {filtered.length} of {grades.length} records
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        {grades.length > 0 && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Subjects</p>
              <p className="text-3xl font-bold text-gray-800">{totalSubjects}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Average Percentage</p>
              <p className="text-3xl font-bold text-gray-800">{avgPercentage}%</p>
            </div>
          </div>
        )}

        {/* Grades Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading grades...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400">No grades found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">Subject</th>
                  <th className="text-left px-6 py-3">Marks</th>
                  <th className="text-left px-6 py-3">Total</th>
                  <th className="text-left px-6 py-3">Percentage</th>
                  <th className="text-left px-6 py-3">Grade</th>
                  {isAdmin && <th className="text-left px-6 py-3">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium">{g.subject}</td>
                    <td className="px-6 py-3">{g.marks}</td>
                    <td className="px-6 py-3">{g.total_marks}</td>
                    <td className="px-6 py-3">
                      {((g.marks / g.total_marks) * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor(g.grade)}`}>
                        {g.grade}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  )
}