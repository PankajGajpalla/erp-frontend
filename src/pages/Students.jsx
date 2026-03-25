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
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: "", age: "", email: "" })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchStudents()
  }, [])

  // Filter whenever search or students change
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
    )
  }, [search, students])

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
      setError("All fields are required")
      return
    }

    try {
      if (editId) {
        await updateStudentAPI(editId, { ...form, age: parseInt(form.age) })
        setSuccess("Student updated!")
        setEditId(null)
      } else {
        await addStudentAPI({ ...form, age: parseInt(form.age) })
        setSuccess("Student added!")
      }
      setForm({ name: "", age: "", email: "" })
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong")
    }
  }

  function handleEdit(student) {
    setEditId(student.id)
    setForm({ name: student.name, age: student.age, email: student.email })
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
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              name="age"
              placeholder="Age"
              value={form.age}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {editId ? "Update" : "Add"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => { setEditId(null); setForm({ name: "", age: "", email: "" }) }}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            )}
          </form>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-400 mt-2">
            Showing {filtered.length} of {students.length} students
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading students...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400">No students found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Age</th>
                  <th className="text-left px-6 py-3">Email</th>
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
                    <td className="px-6 py-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition"
                      >
                        Delete
                      </button>
                    </td>
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