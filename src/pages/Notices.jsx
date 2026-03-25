import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getNoticesAPI, addNoticeAPI, deleteNoticeAPI } from "../api"

export default function Notices() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [notices, setNotices] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filters
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const [form, setForm] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split("T")[0]
  })

  useEffect(() => {
    fetchNotices()
  }, [])

  // Apply filters whenever notices, search or dateFilter changes
  useEffect(() => {
    const q = search.toLowerCase()
    let result = notices.filter((n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    )
    if (dateFilter) {
      result = result.filter((n) => n.date === dateFilter)
    }
    setFiltered(result)
  }, [notices, search, dateFilter])

  async function fetchNotices() {
    try {
      const res = await getNoticesAPI()
      setNotices(res.data.notices)
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

    if (!form.title || !form.content || !form.date) {
      setError("All fields are required")
      return
    }

    try {
      await addNoticeAPI(form)
      setSuccess("Notice posted!")
      setForm({
        title: "",
        content: "",
        date: new Date().toISOString().split("T")[0]
      })
      fetchNotices()
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add notice")
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this notice?")) return
    try {
      await deleteNoticeAPI(id)
      setSuccess("Notice deleted!")
      fetchNotices()
    } catch (err) {
      setError("Delete failed")
    }
  }

  function clearFilters() {
    setSearch("")
    setDateFilter("")
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">📢 Notices</h2>

        {/* Admin: Add Notice */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Post a Notice</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Notice Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <textarea
                placeholder="Notice content..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Post Notice
              </button>
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
              placeholder="🔍 Search by title or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={clearFilters}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
            >
              Clear
            </button>
            <p className="text-sm text-gray-400">
              Showing {filtered.length} of {notices.length} notices
            </p>
          </div>
        </div>

        {/* Notices List */}
        {loading ? (
          <p className="text-gray-500">Loading notices...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            No notices found.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((n) => (
              <div
                key={n.id}
                className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{n.title}</h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        📅 {n.date}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{n.content}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs transition"
                    >
                      Delete
                    </button>
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