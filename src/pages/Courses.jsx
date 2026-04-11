import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { getCoursesAPI, addCourseAPI, updateCourseAPI, deleteCourseAPI } from "../api"

const EMPTY = { name: "", description: "", duration: "", fees: "" }

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { fetchCourses() }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  async function fetchCourses() {
    try {
      const res = await getCoursesAPI()
      setCourses(res.data.courses)
    } catch {
      setError("Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Course name is required"); return }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration: form.duration.trim() || null,
      fees: form.fees ? parseFloat(form.fees) : null,
    }

    setSubmitting(true)
    try {
      if (editId) {
        await updateCourseAPI(editId, payload)
        setSuccess("Course updated!")
        setEditId(null)
      } else {
        await addCourseAPI(payload)
        setSuccess("Course added!")
      }
      setForm(EMPTY)
      fetchCourses()
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(course) {
    setEditId(course.id)
    setForm({
      name: course.name || "",
      description: course.description || "",
      duration: course.duration || "",
      fees: course.fees || "",
    })
    setError("")
    setSuccess("")
  }

  function handleCancel() {
    setEditId(null)
    setForm(EMPTY)
    setError("")
    setSuccess("")
  }

  async function handleDelete(id) {
    try {
      await deleteCourseAPI(id)
      setSuccess("Course deleted!")
      setDeleteConfirmId(null)
      fetchCourses()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
      setDeleteConfirmId(null)
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Courses</h2>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">
            {editId ? "Edit Course" : "Add New Course"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Course Name *</label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Class 10, B.Com, ITI Electrician"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                <input
                  type="text" name="duration" value={form.duration} onChange={handleChange}
                  placeholder="e.g. 1 Year, 6 Months"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Default Fees (₹)</label>
                <input
                  type="number" name="fees" value={form.fees} onChange={handleChange}
                  placeholder="e.g. 12000" min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text" name="description" value={form.description} onChange={handleChange}
                  placeholder="Short description (optional)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                {submitting ? "Saving..." : editId ? "Update Course" : "Add Course"}
              </button>
              {editId && (
                <button type="button" onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Course List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-gray-400">No courses added yet.</p>
              <p className="text-gray-400 text-sm mt-1">Add your first course above.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Course Name</th>
                  <th className="px-5 py-3 text-left">Duration</th>
                  <th className="px-5 py-3 text-left">Default Fees</th>
                  <th className="px-5 py-3 text-left">Description</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-5 py-3 text-gray-600">{c.duration || "—"}</td>
                    <td className="px-5 py-3 text-gray-800">{c.fees ? `₹${c.fees.toLocaleString()}` : "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{c.description || "—"}</td>
                    <td className="px-5 py-3">
                      {deleteConfirmId === c.id ? (
                        <div className="flex gap-1 items-center">
                          <span className="text-xs text-red-600 font-medium">Delete?</span>
                          <button onClick={() => handleDelete(c.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">No</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(c)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs">Edit</button>
                          <button onClick={() => setDeleteConfirmId(c.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Delete</button>
                        </div>
                      )}
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
