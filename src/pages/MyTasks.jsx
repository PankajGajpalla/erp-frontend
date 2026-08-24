import { useEffect, useState, useMemo } from "react"
import Sidebar from "../components/Sidebar"
import { getMyTasksAPI, updateTaskStatusAPI } from "../api"

const STATUS_OPTS  = ["pending", "in_progress", "completed"]
const STATUS_LABEL = { pending: "Pending", in_progress: "In Progress", completed: "Completed" }
const STATUS_COLOR = { pending: "bg-yellow-100 text-yellow-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700" }
const PRIORITY_COLOR = { high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-green-100 text-green-700" }
const FREQ_ICON = { "one-time": "1️⃣", daily: "📅", weekly: "📆", monthly: "🗓️" }

export default function MyTasks() {
  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState("")
  const [filterStatus, setFilter] = useState("")
  const [noteModal, setNoteModal] = useState(null) // { task, newStatus }
  const [noteText, setNoteText]   = useState("")
  const [saving, setSaving]       = useState(false)

  useEffect(() => { fetchTasks() }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function fetchTasks() {
    setLoading(true)
    try {
      const r = await getMyTasksAPI()
      setTasks(r.data.tasks || [])
    } catch { setError("Failed to load tasks") }
    finally { setLoading(false) }
  }

  function openStatusUpdate(task, newStatus) {
    if (newStatus === "completed") {
      setNoteModal({ task, newStatus })
      setNoteText("")
    } else {
      applyStatus(task, newStatus, "")
    }
  }

  async function applyStatus(task, newStatus, notes) {
    setSaving(true)
    try {
      const r = await updateTaskStatusAPI(task.id, { status: newStatus, notes: notes || undefined })
      setTasks(prev => prev.map(t => t.id === task.id ? r.data.task : t))
      setSuccess(newStatus === "completed" ? "Task marked as completed!" : "Status updated")
      setNoteModal(null)
    } catch { setError("Failed to update status") }
    finally { setSaving(false) }
  }

  const filtered = useMemo(() =>
    filterStatus ? tasks.filter(t => t.status === filterStatus) : tasks,
    [tasks, filterStatus]
  )

  const stats = useMemo(() => ({
    total:      tasks.length,
    pending:    tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed:  tasks.filter(t => t.status === "completed").length,
  }), [tasks])

  function fmtDate(d) {
    if (!d) return null
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
  }

  function isOverdue(task) {
    return task.due_date && task.status !== "completed" && new Date(task.due_date) < new Date()
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 pt-20 md:pt-6 space-y-5 overflow-x-hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
          <p className="text-sm text-gray-400">Tasks assigned to you by admin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",       value: stats.total,      color: "text-gray-800" },
            { label: "Pending",     value: stats.pending,    color: "text-yellow-600" },
            { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
            { label: "Completed",   value: stats.completed,  color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {error   && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-red-600 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-green-600 text-sm">{success}</div>}

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {["", ...STATUS_OPTS].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterStatus === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
              {s ? STATUS_LABEL[s] : "All"}
              {s && <span className="ml-1 text-xs opacity-75">({tasks.filter(t => t.status === s).length})</span>}
            </button>
          ))}
        </div>

        {/* Task cards */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="card p-14 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-400">{filterStatus ? "No tasks with this status" : "No tasks assigned to you yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(task => (
              <div key={task.id} className={`card p-5 flex flex-col gap-3 ${isOverdue(task) ? "border-l-4 border-red-400" : task.status === "completed" ? "border-l-4 border-green-400" : task.status === "in_progress" ? "border-l-4 border-blue-400" : "border-l-4 border-yellow-400"}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 leading-tight">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Assigned by {task.assigned_by}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${PRIORITY_COLOR[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>

                {/* Description */}
                {task.description && <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>}

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    {FREQ_ICON[task.frequency] || "🔁"} {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                  </span>
                  {task.due_date && (
                    <span className={`flex items-center gap-1 ${isOverdue(task) ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                      📅 Due: {fmtDate(task.due_date)} {isOverdue(task) && "⚠ Overdue"}
                    </span>
                  )}
                </div>

                {/* Completion note */}
                {task.notes && (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 italic">
                    Note: {task.notes}
                  </div>
                )}

                {/* Status + action */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[task.status]}`}>
                    {STATUS_LABEL[task.status]}
                  </span>
                  <div className="flex gap-1">
                    {task.status === "pending" && (
                      <button onClick={() => openStatusUpdate(task, "in_progress")}
                        className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        Start
                      </button>
                    )}
                    {task.status === "in_progress" && (
                      <button onClick={() => openStatusUpdate(task, "completed")}
                        className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        Mark Done
                      </button>
                    )}
                    {task.status === "completed" && (
                      <button onClick={() => openStatusUpdate(task, "in_progress")}
                        className="text-xs px-2.5 py-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note modal for completing a task */}
        {noteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setNoteModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Mark as Completed</h3>
              <p className="text-sm text-gray-500 mb-4">Add an optional completion note for the admin.</p>
              <p className="text-sm font-semibold text-gray-700 mb-2">"{noteModal.task.title}"</p>
              <textarea
                className="inp w-full"
                rows={3}
                placeholder="e.g. Done, all records updated..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => applyStatus(noteModal.task, "completed", noteText)}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "✅ Mark Done"}</button>
                <button onClick={() => setNoteModal(null)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
