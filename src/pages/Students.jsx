import { useEffect, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import {
  getStudentsAPI,
  addStudentAPI,
  updateStudentAPI,
  deleteStudentAPI
} from "../api"

const EMPTY_FORM = { name: "", age: "", email: "", phone: "", address: "", course: "", fees: "", parent_phone: "" }

export default function Students() {
  const [students, setStudents] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const formRef = useRef(null)

  useEffect(() => { fetchStudents() }, [])

  // Auto clear success after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    const q = search.toLowerCase()
    let result = students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.course && s.course.toLowerCase().includes(q))
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
    if (error) setError("")
  }

  function validateForm() {
    if (!form.name.trim()) return "Name is required"
    if (!form.age || parseInt(form.age) < 5 || parseInt(form.age) > 100) return "Age must be between 5 and 100"
    if (!form.email.trim()) return "Email is required"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format"
    if (form.fees && parseFloat(form.fees) < 0) return "Fees cannot be negative"
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      name: form.name.trim(),
      age: parseInt(form.age),
      email: form.email.trim().toLowerCase(),
      phone: form.phone ? form.phone.trim() : null,
      address: form.address ? form.address.trim() : null,
      course: form.course ? form.course.trim() : null,
      fees: form.fees ? parseFloat(form.fees) : null,
      parent_phone: form.parent_phone ? form.parent_phone.trim() : null
    }

    setSubmitting(true)
    try {
      if (editId) {
        await updateStudentAPI(editId, payload)
        setSuccess("✅ Student updated successfully!")
        setEditId(null)
      } else {
        await addStudentAPI(payload)
        setSuccess("✅ Student added successfully!")
      }
      setForm(EMPTY_FORM)
      fetchStudents()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(", "))
      } else {
        setError(detail || "Something went wrong")
      }
    } finally {
      setSubmitting(false)
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
      fees: student.fees || "",
      parent_phone: student.parent_phone || "" 
    })
    setError("")
    setSuccess("")
    // ✅ Scroll to form
    formRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function handleCancel() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError("")
    setSuccess("")
  }

  async function handleDelete(id) {
    try {
      await deleteStudentAPI(id)
      setSuccess("✅ Student deleted!")
      setDeleteConfirmId(null)
      fetchStudents()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
      setDeleteConfirmId(null)
    }
  }

  const uniqueCourses = [...new Set(students.map((s) => s.course).filter(Boolean))]

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">🎓 Students</h2>

        {/* Add / Edit Form */}
        <div ref={formRef} className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            {editId ? "✏️ Edit Student" : "➕ Add Student"}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
            <input type="text" name="name" placeholder="Name *" value={form.name}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" name="age" placeholder="Age *" value={form.age}
              onChange={handleChange} min="5" max="100"
              className="border border-gray-300 rounded-lg px-4 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" name="email" placeholder="Email *" value={form.email}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="phone" placeholder="Phone" value={form.phone}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="address" placeholder="Address" value={form.address}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="course" placeholder="Course" value={form.course}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="number" name="fees" placeholder="Fees" value={form.fees}
              onChange={handleChange} min="0"
              className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" name="parent_phone" placeholder="Parent Phone (for SMS)"
              value={form.parent_phone || ""}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {submitting ? "Saving..." : editId ? "Update" : "Add"}
            </button>
            {editId && (
              <button type="button" onClick={handleCancel}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition">
                Cancel
              </button>
            )}
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

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search by name, email or course..."
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
            <div className="p-6 flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Loading students...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🎓</p>
              <p className="text-gray-400">No students found.</p>
              {search && <p className="text-gray-400 text-sm mt-1">Try clearing the search filter.</p>}
            </div>
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
                      <td className="px-6 py-3 text-gray-400">{s.id}</td>
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
                      <td className="px-6 py-3">
                        {deleteConfirmId === s.id ? (
                          // ✅ Inline delete confirmation
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-red-600 font-medium">Sure?</span>
                            <button onClick={() => handleDelete(s.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition">
                              Yes
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs transition">
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(s)}
                              className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs transition">
                              Edit
                            </button>
                            <button onClick={() => setDeleteConfirmId(s.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition">
                              Delete
                            </button>
                          </div>
                        )}
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
