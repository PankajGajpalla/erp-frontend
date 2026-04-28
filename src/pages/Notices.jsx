import { useEffect, useMemo, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { LoadingState, Alert, EmptyState } from "../components/UI"
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
      setSuccess("Notice posted!")
      setForm({ title: "", content: "", date: new Date().toISOString().split("T")[0], course: "" })
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
      setSuccess("Notice deleted!")
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
      <main className="page-main">

        <h2 className="text-2xl font-bold text-slate-800 mb-6">📢 Notices</h2>

        {/* Admin: Add Notice */}
        {isAdmin && (
          <div className="card p-6 mb-6">
            <h3 className="section-title mb-4">Post a Notice</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <input type="text" placeholder="Notice Title *" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="inp flex-1" />
                <input type="date" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="inp w-auto" />
                <select value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="inp w-auto bg-white">
                  <option value="">— All Students —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <textarea placeholder="Notice content..." value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4} className="inp resize-none" />
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Posting..." : "Post Notice"}
              </button>
            </form>
            {error && <Alert type="error" message={error} className="mt-3" />}
            {success && <Alert type="success" message={success} className="mt-3" />}
          </div>
        )}

        {/* Search & Filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="Search by title or content..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="inp flex-1" />
            <input type="date" value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="inp w-auto" />
            <button onClick={() => { setSearch(""); setDateFilter("") }} className="btn-ghost">Clear</button>
            <p className="text-sm text-slate-400">Showing {filtered.length} of {notices.length} notices</p>
          </div>
        </div>

        {/* Notices List */}
        {loading ? (
          <LoadingState message="Loading notices…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📢" title={notices.length === 0 ? "No notices posted yet." : "No notices match the search."} />
        ) : (
          <div className="space-y-4">
            {filtered.map((n) => (
              <div key={n.id} className="card border-l-4 border-primary-500 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-800">{n.title}</h3>
                      <span className="badge-gray">📅 {n.date}</span>
                      {n.course
                        ? <span className="badge-blue">🎓 {n.course}</span>
                        : <span className="badge-green">🌐 Everyone</span>
                      }
                      {isAdmin && n.read_count > 0 && (
                        <span className="badge-gray">👁 {n.read_count} read</span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{n.content}</p>
                  </div>
                  {isAdmin && (
                    <div className="ml-4 flex-shrink-0">
                      {deleteConfirmId === n.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-red-600 font-medium">Sure?</span>
                          <button onClick={() => handleDelete(n.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition">Yes</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-2 py-1 rounded text-xs transition">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(n.id)} className="btn-danger text-xs px-3 py-1">Delete</button>
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
