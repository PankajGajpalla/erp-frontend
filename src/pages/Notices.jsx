import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getNoticesAPI, addNoticeAPI, deleteNoticeAPI, getCoursesAPI, markNoticeReadAPI } from "../api"

export default function Notices() {
  const { isAdmin } = useAuth()

  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [courses, setCourses] = useState([])

  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const [form, setForm] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
    course: ""
  })

  useEffect(() => {
    fetchNotices()
    if (isAdmin) {
      getCoursesAPI().then(r => setCourses(r.data.courses || [])).catch(() => {})
    }
  }, [])

  // ✅ Auto clear success after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return notices.filter((n) => {
      const matchText = n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      const matchDate = !dateFilter || n.date === dateFilter
      return matchText && matchDate
    })
  }, [notices, search, dateFilter])

  async function fetchNotices() {
    try {
      const res = await getNoticesAPI()
      const list = res.data.notices
      setNotices(list)
      if (!isAdmin && list.length > 0) {
        list.forEach(n => markNoticeReadAPI(n.id).catch(() => {}))
      }
    } catch (err) {
      setError("Failed to load notices")
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.title.trim() || !form.content.trim() || !form.date) {
      setError("All fields are required")
      return
    }

    setSubmitting(true)
    try {
      await addNoticeAPI({
        title: form.title.trim(),
        content: form.content.trim(),
        date: form.date,
        course: form.course || null
      })
      setSuccess("✅ Notice posted!")
      setForm({
        title: "",
        content: "",
        date: new Date().toISOString().split("T")[0],
        course: ""
      })
      fetchNotices()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add notice")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNoticeAPI(id)
      setSuccess("✅ Notice deleted!")
      setDeleteConfirmId(null)
      fetchNotices()
    } catch (err) {
      setError("Delete failed")
      setDeleteConfirmId(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📢 Notices</h2>

        {/* Admin: Add Notice */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Post a Notice</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <input type="text" placeholder="Notice Title *" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="date" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— All Students —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <textarea placeholder="Notice content..." value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <button type="submit" disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {submitting ? "Posting..." : "Post Notice"}
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
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="🔍 Search by title or content..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => { setSearch(""); setDateFilter("") }}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
              Clear
            </button>
            <p className="text-sm text-gray-400">
              Showing {filtered.length} of {notices.length} notices
            </p>
          </div>
        </div>

        {/* Notices List */}
        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading notices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-4xl mb-3">📢</p>
            <p className="text-gray-400">
              {notices.length === 0 ? "No notices posted yet." : "No notices match the search."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((n) => (
              <div key={n.id} className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-800">{n.title}</h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        📅 {n.date}
                      </span>
                      {n.course
                        ? <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full font-medium">🎓 {n.course}</span>
                        : <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">🌐 Everyone</span>
                      }
                      {isAdmin && n.read_count > 0 && (
                        <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">👁 {n.read_count} read</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{n.content}</p>
                  </div>
                  {isAdmin && (
                    <div className="ml-4 flex-shrink-0">
                      {deleteConfirmId === n.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-red-600 font-medium">Sure?</span>
                          <button onClick={() => handleDelete(n.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition">
                            Yes
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs transition">
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(n.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition">
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}