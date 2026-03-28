import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import {
  getStudentsAPI,
  addStudentAPI,
  updateStudentAPI,
  deleteStudentAPI
} from "../api"

export default function Students() {
  const [students, setStudents] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: "", age: "", email: "", phone: "", address: "", course: "", fees: "" })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    let result = students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    )
    if (courseFilter !== "all") {
      result = result.filter((s) => s.course === courseFilter)
    }
    setFiltered(result)
  }, [search, students, courseFilter])

  async function fetchStudents() {
    try {
      const res = await getStudentsAPI()
      setStudents(res.data.students)
    } catch (err) {
      setError("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.name || !form.age || !form.email) {
      setError("Name, age and email are required")
      return
    }

    try {
      if (editId) {
        await updateStudentAPI(editId, {
          ...form,
          age: parseInt(form.age),
          fees: form.fees ? parseFloat(form.fees) : null
        })
        setSuccess("Student updated!")
        setEditId(null)
      } else {
        await addStudentAPI({
          ...form,
          age: parseInt(form.age),
          fees: form.fees ? parseFloat(form.fees) : null
        })
        setSuccess("Student added!")
      }
      setForm({ name: "", age: "", email: "", phone: "", address: "", course: "", fees: "" })
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong")
    }
  }

  function handleEdit(student) {
    setEditId(student.id)
    setForm({
      name: student.name,
      age: student.age,
      email: student.email,
      phone: student.phone || "",
      address: student.address || "",
      course: student.course || "",
      fees: student.fees || ""
    })
    setError("")
    setSuccess("")
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this student?")) return
    try {
      await deleteStudentAPI(id)
      setSuccess("Student deleted!")
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
    }
  }

  const uniqueCourses = [...new Set(students.map((s) => s.course).filter(Boolean))]

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">🎓 Students</h2>

        {/* Add / Edit Form */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            {editId ? "Edit Student" : "Add Student"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
            <input type="text" name="name" placeholder="Name" value={form.name}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" name="age" placeholder="Age" value={form.age}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" name="email" placeholder="Email" value={form.email}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="phone" placeholder="Phone (optional)" value={form.phone}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="address" placeholder="Address (optional)" value={form.address}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="course" placeholder="Course (optional)" value={form.course}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" name="fees" placeholder="Fees (optional)" value={form.fees}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
              {editId ? "Update" : "Add"}
            </button>
            {editId && (
              <button type="button"
                onClick={() => { setEditId(null); setForm({ name: "", age: "", email: "", phone: "", address: "", course: "", fees: "" }) }}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition">
                Cancel
              </button>
            )}
          </form>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={() => { setSearch(""); setCourseFilter("all") }}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
            >
              Clear
            </button>
            <p className="text-sm text-gray-400">
              Showing {filtered.length} of {students.length} students
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading students...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400">No students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-6 py-3">ID</th>
                    <th className="text-left px-6 py-3">Name</th>
                    <th className="text-left px-6 py-3">Age</th>
                    <th className="text-left px-6 py-3">Email</th>
                    <th className="text-left px-6 py-3">Phone</th>
                    <th className="text-left px-6 py-3">Course</th>
                    <th className="text-left px-6 py-3">Fees</th>
                    <th className="text-left px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-6 py-3">{s.id}</td>
                      <td className="px-6 py-3 font-medium">{s.name}</td>
                      <td className="px-6 py-3">{s.age}</td>
                      <td className="px-6 py-3">{s.email}</td>
                      <td className="px-6 py-3">{s.phone || "—"}</td>
                      <td className="px-6 py-3">
                        {s.course
                          ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{s.course}</span>
                          : "—"}
                      </td>
                      <td className="px-6 py-3">{s.fees ? `₹${s.fees}` : "—"}</td>
                      <td className="px-6 py-3 flex gap-2">
                        <button onClick={() => handleEdit(s)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs transition">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(s.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}