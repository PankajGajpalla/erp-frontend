import { useEffect, useMemo, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import {
  getTeachersAPI, addTeacherAPI, updateTeacherAPI, deleteTeacherAPI,
  createTeacherLoginAPI, getSubjectsAPI, assignSubjectsToTeacherAPI,
  getTeacherCredentialsAPI, updateTeacherCredentialsAPI,
} from "../api"

const EMPTY_FORM = { name: "", email: "", subject: "", phone: "" }

// ─── Assign Subjects Modal ───────────────────────────────────────
function AssignSubjectsModal({ teacher, allSubjects, onClose, onSaved }) {
  // allSubjects: [{ id, name, course_id, course_name, teacher_id, teacher_name }]
  // teacher.subjects: [{ id, name, course_id, course_name }]

  const initialSelected = new Set((teacher.subjects || []).map((s) => s.id))
  const [selected, setSelected] = useState(initialSelected)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Group subjects by course
  const byCourse = {}
  allSubjects.forEach((s) => {
    const key = s.course_name || `Course ${s.course_id}`
    if (!byCourse[key]) byCourse[key] = []
    byCourse[key].push(s)
  })

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCourse(subjects) {
    const ids = subjects.map((s) => s.id)
    const allChecked = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      await assignSubjectsToTeacherAPI(teacher.id, { subject_ids: [...selected] })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = selected.size
  const courseNames = Object.keys(byCourse)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-800">📚 Assign Subjects</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-gray-700">{teacher.name}</span>
              {teacher.subject && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {teacher.subject}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none mt-1">×</button>
        </div>

        {/* Subject list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {allSubjects.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm">No subjects found. Add subjects from the Courses page first.</p>
            </div>
          ) : (
            courseNames.map((courseName) => {
              const courseSubjects = byCourse[courseName]
              const allChecked = courseSubjects.every((s) => selected.has(s.id))
              const someChecked = courseSubjects.some((s) => selected.has(s.id))
              return (
                <div key={courseName}>
                  {/* Course header with select-all */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={() => toggleCourse(courseSubjects)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{courseName}</span>
                    <span className="text-xs text-gray-400">({courseSubjects.length} subjects)</span>
                  </div>

                  {/* Subjects */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                    {courseSubjects.map((s) => {
                      const isChecked = selected.has(s.id)
                      const assignedTo = s.teacher_id && s.teacher_id !== teacher.id ? s.teacher_name : null
                      return (
                        <label key={s.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition
                            ${isChecked ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200 hover:border-blue-200"}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(s.id)}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                            {assignedTo && (
                              <p className="text-xs text-orange-500 truncate">→ {assignedTo}</p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          {error && (
            <p className="text-red-600 text-sm mb-3">{error}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              {selectedCount === 0 ? "No subjects selected" : `${selectedCount} subject${selectedCount !== 1 ? "s" : ""} selected`}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50">
                {saving ? "Saving..." : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Teachers Page ──────────────────────────────────────────
export default function Teachers() {
  const { isAdmin } = useAuth()

  const [teachers, setTeachers] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [loginModal, setLoginModal] = useState(null)       // teacher object
  const [loginCreds, setLoginCreds] = useState(null)        // { has_login, username }
  const [loginForm, setLoginForm] = useState({ username: "", password: "", showPass: false })
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState("")
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [assignModal, setAssignModal] = useState(null) // teacher object
  const formRef = useRef(null)

  useEffect(() => {
    fetchTeachers()
    if (isAdmin) fetchAllSubjects()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return teachers.filter((t) => {
      const subjectNames = (t.subjects || []).map((s) => s.name.toLowerCase()).join(" ")
      return (
        t.name.toLowerCase().includes(q) ||
        (t.subject || "").toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        subjectNames.includes(q)
      )
    })
  }, [teachers, search])

  async function fetchTeachers() {
    try {
      const res = await getTeachersAPI()
      setTeachers(res.data.teachers)
    } catch {
      setError("Failed to load teachers")
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllSubjects() {
    try {
      const res = await getSubjectsAPI()
      setAllSubjects(res.data.subjects || [])
    } catch { /* silent */ }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Invalid email format")
      return
    }

    setSubmitting(true)
    try {
      if (editId) {
        await updateTeacherAPI(editId, form)
        setSuccess("✅ Teacher updated!")
        setEditId(null)
      } else {
        await addTeacherAPI(form)
        setSuccess("✅ Teacher added!")
      }
      setForm(EMPTY_FORM)
      fetchTeachers()
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(teacher) {
    setEditId(teacher.id)
    setForm({
      name: teacher.name,
      email: teacher.email,
      subject: teacher.subject || "",
      phone: teacher.phone || ""
    })
    setError("")
    setSuccess("")
    formRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function handleCancel() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  async function handleDelete(id) {
    try {
      await deleteTeacherAPI(id)
      setSuccess("✅ Teacher deleted!")
      setDeleteConfirmId(null)
      fetchTeachers()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
      setDeleteConfirmId(null)
    }
  }

  async function handleManageLogin(teacher) {
    setLoginModal(teacher)
    setLoginError("")
    setLoginSuccess("")
    setLoginLoading(true)
    setLoginCreds(null)
    setLoginForm({ username: "", password: "", showPass: false })
    try {
      const res = await getTeacherCredentialsAPI(teacher.id)
      setLoginCreds(res.data)
      setLoginForm({ username: res.data.username || "", password: "", showPass: false })
    } catch {
      setLoginError("Failed to load login info")
    } finally {
      setLoginLoading(false)
    }
  }

  async function submitManageLogin(e) {
    e.preventDefault()
    setLoginError("")
    setLoginSuccess("")

    if (!loginForm.username.trim()) { setLoginError("Username is required"); return }
    if (loginForm.username.trim().length < 3) { setLoginError("Username must be at least 3 characters"); return }
    if (!loginCreds?.has_login && !loginForm.password) { setLoginError("Password is required to create a new login"); return }
    if (loginForm.password && loginForm.password.length < 6) { setLoginError("Password must be at least 6 characters"); return }

    setLoginSubmitting(true)
    try {
      const res = await updateTeacherCredentialsAPI(loginModal.id, {
        username: loginForm.username.trim(),
        password: loginForm.password || undefined,
      })
      setLoginSuccess(res.data.message)
      setLoginCreds({ has_login: true, username: loginForm.username.trim() })
      setLoginForm(f => ({ ...f, password: "" }))
    } catch (err) {
      setLoginError(err.response?.data?.detail || "Failed to update login")
    } finally {
      setLoginSubmitting(false)
    }
  }

  function handleAssignSaved() {
    setAssignModal(null)
    setSuccess("✅ Subjects assigned successfully!")
    fetchTeachers()
    fetchAllSubjects()
  }

  // Enrich allSubjects with teacher_name for "already assigned" hint
  const enrichedSubjects = allSubjects.map((s) => {
    const assignedTeacher = teachers.find((t) => (t.subjects || []).some((ts) => ts.id === s.id))
    return {
      ...s,
      teacher_id: assignedTeacher?.id ?? null,
      teacher_name: assignedTeacher?.name ?? null
    }
  })

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">👨‍🏫 Teachers</h2>

        {/* Admin: Add / Edit Form */}
        {isAdmin && (
          <div ref={formRef} className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              {editId ? "✏️ Edit Teacher" : "➕ Add Teacher"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
              <input type="text" placeholder="Name *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="email" placeholder="Email *" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Specialization (e.g. Mathematics)" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
            <p className="text-xs text-gray-400 mt-2">
              💡 After adding a teacher, use the <strong>Assign Subjects</strong> button in the table to link them to specific subjects.
            </p>
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
        )}

        {/* Search */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="🔍 Search by name, email or subject..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => setSearch("")}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
              Clear
            </button>
            <p className="text-sm text-gray-400">
              Showing {filtered.length} of {teachers.length} teachers
            </p>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 flex items-center gap-3 text-gray-500">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Loading teachers...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl mb-3">👨‍🏫</p>
                <p className="text-gray-400">No teachers found.</p>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-5 py-3">ID</th>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Email</th>
                    <th className="text-left px-5 py-3">Subjects Assigned</th>
                    <th className="text-left px-5 py-3">Phone</th>
                    {isAdmin && <th className="text-left px-5 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-5 py-3 text-gray-400">{t.id}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{t.name}</p>
                        {t.subject && (
                          <p className="text-xs text-gray-400">{t.subject}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{t.email}</td>
                      <td className="px-5 py-3">
                        {(t.subjects || []).length === 0 ? (
                          <span className="text-xs text-gray-400 italic">None assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(t.subjects || []).map((s) => (
                              <span key={s.id}
                                className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium"
                                title={s.course_name}>
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{t.phone || "—"}</td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          {deleteConfirmId === t.id ? (
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-red-600 font-medium">Sure?</span>
                              <button onClick={() => handleDelete(t.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition">
                                Yes
                              </button>
                              <button onClick={() => setDeleteConfirmId(null)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs transition">
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={() => setAssignModal(t)}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs transition">
                                📚 Assign Subjects
                              </button>
                              <button onClick={() => handleEdit(t)}
                                className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs transition">
                                Edit
                              </button>
                              <button onClick={() => setDeleteConfirmId(t.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition">
                                Delete
                              </button>
                              <button onClick={() => handleManageLogin(t)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs transition">
                                🔑 Login
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Assign Subjects Modal */}
        {assignModal && (
          <AssignSubjectsModal
            teacher={assignModal}
            allSubjects={enrichedSubjects}
            onClose={() => setAssignModal(null)}
            onSaved={handleAssignSaved}
          />
        )}

        {/* Manage Login Modal */}
        {loginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              {/* Header */}
              <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">🔑 Manage Login</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-medium text-gray-700">{loginModal.name}</span>
                  </p>
                </div>
                <button onClick={() => setLoginModal(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
              </div>

              <div className="px-6 py-5">
                {loginLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 py-4 justify-center">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading login info...
                  </div>
                ) : (
                  <>
                    {/* Status badge */}
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-4 text-sm font-medium
                      ${loginCreds?.has_login ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                      <span>{loginCreds?.has_login ? "✅" : "⚠️"}</span>
                      {loginCreds?.has_login
                        ? `Login exists — Username: ${loginCreds.username}`
                        : "No login created yet for this teacher"}
                    </div>

                    <form onSubmit={submitManageLogin} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input type="text" placeholder="Enter username (min 3 chars)"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          New Password {loginCreds?.has_login
                            ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                            : <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type={loginForm.showPass ? "text" : "password"}
                            placeholder={loginCreds?.has_login ? "Leave blank to keep unchanged" : "Set a password (min 6 chars)"}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12" />
                          <button type="button"
                            onClick={() => setLoginForm(f => ({ ...f, showPass: !f.showPass }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {loginForm.showPass ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      {loginError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                          <p className="text-red-600 text-sm">{loginError}</p>
                        </div>
                      )}
                      {loginSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                          <p className="text-green-600 text-sm">{loginSuccess}</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button type="submit" disabled={loginSubmitting}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50">
                          {loginSubmitting ? "Saving..." : loginCreds?.has_login ? "Update Login" : "Create Login"}
                        </button>
                        <button type="button" onClick={() => setLoginModal(null)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-sm transition">
                          Close
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
