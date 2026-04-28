import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { LoadingState, Alert, EmptyState } from "../components/UI"
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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page-main">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Courses & Subjects</h2>

        {/* Course Form */}
        <div className="card p-6 mb-6">
          <h3 className="section-title mb-4 pb-2 border-b border-slate-100">
            {editCourseId ? "Edit Course" : "Add New Course"}
          </h3>
          <form onSubmit={handleCourseSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="form-label">Course Name *</label>
                <input type="text" name="name" value={courseForm.name} onChange={handleCourseChange}
                  placeholder="e.g. Class 10, B.Com, ITI" className="inp" />
              </div>
              <div>
                <label className="form-label">Duration</label>
                <input type="text" name="duration" value={courseForm.duration} onChange={handleCourseChange}
                  placeholder="e.g. 1 Year" className="inp" />
              </div>
              <div>
                <label className="form-label">Default Fees (₹)</label>
                <input type="number" name="fees" value={courseForm.fees} onChange={handleCourseChange}
                  placeholder="e.g. 12000" min="0" className="inp" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input type="text" name="description" value={courseForm.description} onChange={handleCourseChange}
                  placeholder="Short description" className="inp" />
              </div>
            </div>
            {error && <Alert type="error" message={error} className="mb-3" />}
            {success && <Alert type="success" message={success} className="mb-3" />}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Saving..." : editCourseId ? "Update Course" : "Add Course"}
              </button>
              {editCourseId && (
                <button type="button" onClick={() => { setEditCourseId(null); setCourseForm(EMPTY_COURSE) }} className="btn-ghost">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Course List */}
        <div className="space-y-3">
          {loading ? (
            <div className="card p-8"><LoadingState /></div>
          ) : courses.length === 0 ? (
            <EmptyState icon="📚" title="No courses yet. Add your first course above." />
          ) : courses.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              {/* Course Row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.duration && <span className="mr-3">Duration: {c.duration}</span>}
                    {c.fees && <span className="mr-3">Fees: ₹{c.fees.toLocaleString()}</span>}
                    {c.description && <span>{c.description}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}
                  className="btn-ghost text-xs px-3 py-1"
                >
                  {expandedCourseId === c.id ? "Hide Subjects" : "Manage Subjects"}
                </button>
                <button onClick={() => handleEditCourse(c)} className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs">Edit</button>
                {deleteConfirmId === c.id ? (
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-red-600 font-medium">Delete?</span>
                    <button onClick={() => handleDeleteCourse(c.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs">Yes</button>
                    <button onClick={() => setDeleteConfirmId(null)} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(c.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Delete</button>
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
    <div className="border-t border-slate-100 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-600 mb-3">Subjects in {courseName}</p>

      {/* Add/Edit Subject Form */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Subject name *" value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setError("") }}
          className="inp w-auto" />
        <select value={form.teacher_id}
          onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          className="inp w-auto bg-white">
          <option value="">— Assign Teacher (optional) —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
          ))}
        </select>
        <button type="submit" disabled={submitting} className="btn-primary text-xs px-4 py-1.5">
          {submitting ? "Saving..." : editId ? "Update" : "Add Subject"}
        </button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_SUBJECT) }} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
        )}
      </form>

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
      {success && <p className="text-emerald-600 text-xs mb-2">{success}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading subjects...</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-slate-400">No subjects added yet for this course.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200">
              <th className="text-left py-2 px-3 font-medium">Subject</th>
              <th className="text-left py-2 px-3 font-medium">Teacher</th>
              <th className="text-left py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-white transition">
                <td className="py-2 px-3 font-medium text-slate-800">{s.name}</td>
                <td className="py-2 px-3 text-slate-500">{s.teacher_name || <span className="text-slate-300">Not assigned</span>}</td>
                <td className="py-2 px-3">
                  {deleteConfirmId === s.id ? (
                    <div className="flex gap-1 items-center">
                      <span className="text-xs text-red-600">Delete?</span>
                      <button onClick={() => handleDelete(s.id)} className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">Yes</button>
                      <button onClick={() => setDeleteConfirmId(null)} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs">No</button>
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
