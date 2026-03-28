import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getTeachersAPI, addTeacherAPI, updateTeacherAPI, deleteTeacherAPI, createTeacherLoginAPI } from "../api"

export default function Teachers() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [teachers, setTeachers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: "", email: "", subject: "", phone: "" })
  const [loginModal, setLoginModal] = useState(null) // holds teacher object
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState("")

  useEffect(() => {
    fetchTeachers()
  }, [])

  // Apply filters whenever teachers, search or subjectFilter changes
  useEffect(() => {
    const q = search.toLowerCase()
    let result = teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    )
    if (subjectFilter !== "all") {
      result = result.filter((t) => t.subject === subjectFilter)
    }
    setFiltered(result)
  }, [teachers, search, subjectFilter])

  async function fetchTeachers() {
    try {
      const res = await getTeachersAPI()
      setTeachers(res.data.teachers)
    } catch (err) {
      setError("Failed to load teachers")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.name || !form.email || !form.subject) {
      setError("Name, email and subject are required")
      return
    }

    try {
      if (editId) {
        await updateTeacherAPI(editId, form)
        setSuccess("Teacher updated!")
        setEditId(null)
      } else {
        await addTeacherAPI(form)
        setSuccess("Teacher added!")
      }
      setForm({ name: "", email: "", subject: "", phone: "" })
      fetchTeachers()
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong")
    }
  }

  function handleEdit(teacher) {
    setEditId(teacher.id)
    setForm({
      name: teacher.name,
      email: teacher.email,
      subject: teacher.subject,
      phone: teacher.phone || ""
    })
    setError("")
    setSuccess("")
  }

  async function handleDelete(id) {
    if (!confirm("Delete this teacher?")) return
    try {
      await deleteTeacherAPI(id)
      setSuccess("Teacher deleted!")
      fetchTeachers()
    } catch (err) {
      setError(err.response?.data?.detail || "Delete failed")
    }
  }

  function handleCreateLogin(teacher) {
    setLoginModal(teacher)
    setLoginForm({ username: "", password: "" })
    setLoginError("")
    setLoginSuccess("")
  }

  async function submitCreateLogin(e) {
    e.preventDefault()
    setLoginError("")
    setLoginSuccess("")

    if (!loginForm.username || !loginForm.password) {
      setLoginError("All fields required")
      return
    }

    try {
      const res = await createTeacherLoginAPI({
        username: loginForm.username,
        password: loginForm.password,
        teacher_id: loginModal.id
      })
      setLoginSuccess(res.data.message)
      setTimeout(() => setLoginModal(null), 2000)
    } catch (err) {
      setLoginError(err.response?.data?.detail || "Failed to create login")
    }
  }

  // Get unique subjects for filter dropdown
  const uniqueSubjects = [...new Set(teachers.map((t) => t.subject))]

  function clearFilters() {
    setSearch("")
    setSubjectFilter("all")
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">👨‍🏫 Teachers</h2>

        {/* Admin: Add / Edit Form */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              {editId ? "Edit Teacher" : "Add Teacher"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                  onClick={() => { setEditId(null); setForm({ name: "", email: "", subject: "", phone: "" }) }}
                  className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
              )}
            </form>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search by name, email or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            <button
              onClick={clearFilters}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
            >
              Clear
            </button>
            <p className="text-sm text-gray-400">
              Showing {filtered.length} of {teachers.length} teachers
            </p>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading teachers...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400">No teachers found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Subject</th>
                  <th className="text-left px-6 py-3">Phone</th>
                  {isAdmin && <th className="text-left px-6 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3">{t.id}</td>
                    <td className="px-6 py-3 font-medium">{t.name}</td>
                    <td className="px-6 py-3">{t.email}</td>
                    <td className="px-6 py-3">{t.subject}</td>
                    <td className="px-6 py-3">{t.phone || "—"}</td>
                    {isAdmin && (
                      <td className="px-6 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleEdit(t)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs transition">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(t.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition">
                            Delete
                          </button>
                          <button onClick={() => handleCreateLogin(t)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs transition">
                            Create Login
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
          {/* Create Login Modal */}
          {loginModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  Create Login for {loginModal.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Teacher ID: {loginModal.id} · Subject: {loginModal.subject}
                </p>
                <form onSubmit={submitCreateLogin} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
                  {loginSuccess && <p className="text-green-500 text-sm">{loginSuccess}</p>}
                  <div className="flex gap-3 mt-4">
                    <button type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                      Create Login
                    </button>
                    <button type="button" onClick={() => setLoginModal(null)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
      </main>
    </div>
  )
}