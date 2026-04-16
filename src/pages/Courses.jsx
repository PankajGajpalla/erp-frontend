import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import {
  getCoursesAPI, addCourseAPI, updateCourseAPI, deleteCourseAPI,
  getSubjectsByCourseAPI, addSubjectAPI, updateSubjectAPI, deleteSubjectAPI,
  getTeachersAPI
} from "../api"

const EMPTY_COURSE = { name: "", description: "", duration: "", fees: "" }
const EMPTY_SUBJECT = { name: "", teacher_id: "" }

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE)
  const [editCourseId, setEditCourseId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [expandedCourseId, setExpandedCourseId] = useState(null)

  useEffect(() => {
    Promise.all([fetchCourses(), fetchTeachers()])
  }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function fetchCourses() {
    try {
      const res = await getCoursesAPI()
      setCourses(res.data.courses)
    } catch { setError("Failed to load courses") }
    finally { setLoading(false) }
  }

  async function fetchTeachers() {
    try {
      const res = await getTeachersAPI()
      setTeachers(res.data.teachers)
    } catch {}
  }

  function handleCourseChange(e) {
    setCourseForm({ ...courseForm, [e.target.name]: e.target.value })
    if (error) setError("")
  }

  async function handleCourseSubmit(e) {
    e.preventDefault()
    if (!courseForm.name.trim()) { setError("Course name is required"); return }
    const payload = {
      name: courseForm.name.trim(),
      description: courseForm.description.trim() || null,
      duration: courseForm.duration.trim() || null,
      fees: courseForm.fees ? parseFloat(courseForm.fees) : null,
    }
    setSubmitting(true)
    try {
      if (editCourseId) {
        await updateCourseAPI(editCourseId, payload)
        setSuccess("Course updated!")
        setEditCourseId(null)
      } else {
        await addCourseAPI(payload)
        setSuccess("Course added!")
      }
      setCourseForm(EMPTY_COURSE)
      fetchCourses()
    } catch (err) { setError(err.response?.data?.detail || "Something went wrong") }
    finally { setSubmitting(false) }
  }

  function handleEditCourse(c) {
    setEditCourseId(c.id)
    setCourseForm({ name: c.name || "", description: c.description || "", duration: c.duration || "", fees: c.fees || "" })
    setError(""); setSuccess("")
  }

  async function handleDeleteCourse(id) {
    try {
      await deleteCourseAPI(id)
      setSuccess("Course deleted!")
      setDeleteConfirmId(null)
      if (expandedCourseId === id) setExpandedCourseId(null)
      fetchCourses()
    } catch (err) { setError(err.response?.data?.detail || "Delete failed"); setDeleteConfirmId(null) }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Courses & Subjects</h2>

        {/* Course Form */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">
            {editCourseId ? "Edit Course" : "Add New Course"}
          </h3>
          <form onSubmit={handleCourseSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Course Name *</label>
                <input type="text" name="name" value={courseForm.name} onChange={handleCourseChange}
                  placeholder="e.g. Class 10, B.Com, ITI"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                <input type="text" name="duration" value={courseForm.duration} onChange={handleCourseChange}
                  placeholder="e.g. 1 Year"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Default Fees (₹)</label>
                <input type="number" name="fees" value={courseForm.fees} onChange={handleCourseChange}
                  placeholder="e.g. 12000" min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input type="text" name="description" value={courseForm.description} onChange={handleCourseChange}
                  placeholder="Short description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
            {success && <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                {submitting ? "Saving..." : editCourseId ? "Update Course" : "Add Course"}
              </button>
              {editCourseId && (
                <button type="button" onClick={() => { setEditCourseId(null); setCourseForm(EMPTY_COURSE) }}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 transition">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Course List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow p-8 flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading...
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-4xl mb-3">📚</p>
              <p className="text-gray-400">No courses yet. Add your first course above.</p>
            </div>
          ) : courses.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow overflow-hidden">
              {/* Course Row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.duration && <span className="mr-3">Duration: {c.duration}</span>}
                    {c.fees && <span className="mr-3">Fees: ₹{c.fees.toLocaleString()}</span>}
                    {c.description && <span>{c.description}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition"
                >
                  {expandedCourseId === c.id ? "Hide Subjects" : "Manage Subjects"}
                </button>
                <button onClick={() => handleEditCourse(c)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs">Edit</button>
                {deleteConfirmId === c.id ? (
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                    <button onClick={() => handleDeleteCourse(c.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">Yes</button>
                    <button onClick={() => setDeleteConfirmId(null)}
                      className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(c.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Delete</button>
                )}
              </div>

              {/* Subjects Panel */}
              {expandedCourseId === c.id && (
                <SubjectsPanel courseId={c.id} courseName={c.name} teachers={teachers} />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

// ── Subjects panel per course ─────────────────────────────────
function SubjectsPanel({ courseId, courseName, teachers }) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_SUBJECT)
  const [editId, setEditId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => { fetchSubjects() }, [courseId])
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 2000); return () => clearTimeout(t) }
  }, [success])

  async function fetchSubjects() {
    try {
      const res = await getSubjectsByCourseAPI(courseId)
      setSubjects(res.data.subjects)
    } catch { setError("Failed to load subjects") }
    finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Subject name is required"); return }
    const payload = { course_id: courseId, name: form.name.trim(), teacher_id: form.teacher_id ? parseInt(form.teacher_id) : null }
    setSubmitting(true)
    try {
      if (editId) {
        await updateSubjectAPI(editId, payload)
        setSuccess("Subject updated!")
        setEditId(null)
      } else {
        await addSubjectAPI(payload)
        setSuccess("Subject added!")
      }
      setForm(EMPTY_SUBJECT)
      fetchSubjects()
    } catch (err) { setError(err.response?.data?.detail || "Something went wrong") }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteSubjectAPI(id)
      setSuccess("Subject deleted!")
      setDeleteConfirmId(null)
      fetchSubjects()
    } catch (err) { setError(err.response?.data?.detail || "Delete failed"); setDeleteConfirmId(null) }
  }

  return (
    <div className="border-t bg-gray-50 p-5">
      <p className="text-sm font-semibold text-gray-600 mb-3">Subjects in {courseName}</p>

      {/* Add/Edit Subject Form */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Subject name *" value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setError("") }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={form.teacher_id}
          onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">— Assign Teacher (optional) —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
          ))}
        </select>
        <button type="submit" disabled={submitting}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
          {submitting ? "Saving..." : editId ? "Update" : "Add Subject"}
        </button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_SUBJECT) }}
            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition">
            Cancel
          </button>
        )}
      </form>

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
      {success && <p className="text-green-600 text-xs mb-2">{success}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading subjects...</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-gray-400">No subjects added yet for this course.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b">
              <th className="text-left py-2 px-3 font-medium">Subject</th>
              <th className="text-left py-2 px-3 font-medium">Teacher</th>
              <th className="text-left py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-white transition">
                <td className="py-2 px-3 font-medium text-gray-800">{s.name}</td>
                <td className="py-2 px-3 text-gray-500">{s.teacher_name || <span className="text-gray-300">Not assigned</span>}</td>
                <td className="py-2 px-3">
                  {deleteConfirmId === s.id ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-red-600">Delete?</span>
                      <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">Yes</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs">No</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditId(s.id); setForm({ name: s.name, teacher_id: s.teacher_id || "" }) }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-0.5 rounded text-xs">Edit</button>
                      <button onClick={() => setDeleteConfirmId(s.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
