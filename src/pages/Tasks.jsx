import { useEffect, useState, useMemo } from "react"
import Sidebar from "../components/Sidebar"
import { getEmployeesAPI, createTaskAPI, getAllTasksAPI, editTaskAPI, updateTaskStatusAPI, deleteTaskAPI } from "../api"

const FREQ_OPTIONS   = ["one-time", "daily", "weekly", "monthly"]
const PRIORITY_OPTS  = ["low", "medium", "high"]
const STATUS_OPTS    = ["pending", "in_progress", "completed"]

const PRIORITY_COLOR = { high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-green-100 text-green-700" }
const STATUS_COLOR   = { pending: "bg-gray-100 text-gray-600", in_progress: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700" }
const STATUS_LABEL   = { pending: "Pending", in_progress: "In Progress", completed: "Completed" }

const EMPTY_FORM = { title: "", description: "", assigned_to: "", frequency: "one-time", priority: "medium", due_date: "" }

export default function Tasks() {
  const [tasks, setTasks]           = useState([])
  const [employees, setEmployees]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editId, setEditId]         = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")
  const [deleteId, setDeleteId]     = useState(null)
  const [showForm, setShowForm]     = useState(false)

  // Filters
  const [filterStatus,    setFilterStatus]    = useState("")
  const [filterFreq,      setFilterFreq]      = useState("")
  const [filterPriority,  setFilterPriority]  = useState("")
  const [filterEmployee,  setFilterEmployee]  = useState("")
  const [search,          setSearch]          = useState("")

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function fetchAll() {
    setLoading(true)
    try {
      const [tasksRes, empRes] = await Promise.all([getAllTasksAPI(), getEmployeesAPI()])
      setTasks(tasksRes.data.tasks || [])
      setEmployees(empRes.data.employees || [])
    } catch { setError("Failed to load tasks") }
    finally { setLoading(false) }
  }

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError("")
  }

  function openEdit(task) {
    setEditId(task.id)
    setForm({
      title: task.title,
      description: task.description || "",
      assigned_to: String(task.assigned_to),
      frequency: task.frequency,
      priority: task.priority,
      due_date: task.due_date || "",
    })
    setShowForm(true)
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.assigned_to) { setError("Title and assignee are required"); return }
    setSubmitting(true); setError("")
    try {
      const payload = { ...form, assigned_to: parseInt(form.assigned_to), due_date: form.due_date || null }
      if (editId) {
        const r = await editTaskAPI(editId, payload)
        setTasks(prev => prev.map(t => t.id === editId ? r.data.task : t))
        setSuccess("Task updated")
      } else {
        const r = await createTaskAPI(payload)
        setTasks(prev => [r.data.task, ...prev])
        setSuccess("Task created")
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditId(null)
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed")
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteTaskAPI(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      setSuccess("Task deleted")
      setDeleteId(null)
    } catch { setError("Delete failed"); setDeleteId(null) }
  }

  async function handleStatusChange(task, newStatus) {
    try {
      const r = await updateTaskStatusAPI(task.id, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === task.id ? r.data.task : t))
    } catch { setError("Status update failed") }
  }

  const filtered = useMemo(() => {
    let list = tasks
    if (filterStatus)   list = list.filter(t => t.status === filterStatus)
    if (filterFreq)     list = list.filter(t => t.frequency === filterFreq)
    if (filterPriority) list = list.filter(t => t.priority === filterPriority)
    if (filterEmployee) list = list.filter(t => t.assigned_to === parseInt(filterEmployee))
    if (search.trim())  list = list.filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.assigned_to_name || "").toLowerCase().includes(search.toLowerCase())
    )
    return list
  }, [tasks, filterStatus, filterFreq, filterPriority, filterEmployee, search])

  const stats = useMemo(() => ({
    total:     tasks.length,
    pending:   tasks.filter(t => t.status === "pending").length,
    inProgress:tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  }), [tasks])

  function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
  }

  function isOverdue(task) {
    return task.due_date && task.status !== "completed" && new Date(task.due_date) < new Date()
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 pt-20 md:pt-6 space-y-5 overflow-x-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Task Management</h1>
            <p className="text-sm text-gray-400">Assign and track tasks for staff and teachers</p>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Assign Task</button>
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

        {/* Create / Edit form */}
        {showForm && (
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{editId ? "Edit Task" : "Assign New Task"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="form-label">Task Title *</label>
                  <input className="inp" placeholder="e.g. Update student records" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="inp" rows={2} placeholder="Optional details…" value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Assign To *</label>
                  <select className="inp" value={form.assigned_to}
                    onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
                    <option value="">— Select Employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.username} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="inp" value={form.due_date}
                    onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Frequency</label>
                  <select className="inp" value={form.frequency}
                    onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                    {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select className="inp" value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                  {submitting ? "Saving…" : editId ? "Update Task" : "Assign Task"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError("") }} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <input className="inp flex-1 min-w-[160px]" placeholder="Search title or employee…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="inp w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select className="inp w-auto" value={filterFreq} onChange={e => setFilterFreq(e.target.value)}>
            <option value="">All Frequency</option>
            {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
          <select className="inp w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <select className="inp w-auto" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
            <option value="">All Employees</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.username}</option>)}
          </select>
          {(filterStatus || filterFreq || filterPriority || filterEmployee || search) && (
            <button onClick={() => { setFilterStatus(""); setFilterFreq(""); setFilterPriority(""); setFilterEmployee(""); setSearch("") }}
              className="btn-ghost text-sm">Clear</button>
          )}
          <span className="text-xs text-gray-400">{filtered.length} tasks</span>
        </div>

        {/* Task list */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading tasks…</div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-gray-400">No tasks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Task</th>
                    <th className="text-left px-4 py-3 w-32">Assigned To</th>
                    <th className="text-center px-4 py-3 w-24">Frequency</th>
                    <th className="text-center px-4 py-3 w-20">Priority</th>
                    <th className="text-center px-4 py-3 w-24">Due Date</th>
                    <th className="text-center px-4 py-3 w-28">Status</th>
                    <th className="text-center px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(task => (
                    <tr key={task.id} className={`border-t hover:bg-gray-50 transition ${isOverdue(task) ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800 leading-tight">{task.title}</p>
                        {task.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
                        {task.notes && <p className="text-xs text-blue-500 mt-0.5 italic">Note: {task.notes}</p>}
                        {isOverdue(task) && <span className="text-xs text-red-500 font-semibold">⚠ Overdue</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{task.assigned_to_name}</p>
                        <p className="text-xs text-gray-400">by {task.assigned_by}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-500 capitalize">{task.frequency}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PRIORITY_COLOR[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{fmtDate(task.due_date)}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={task.status}
                          onChange={e => handleStatusChange(task, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-semibold border-0 cursor-pointer ${STATUS_COLOR[task.status]}`}
                        >
                          {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(task)} className="text-blue-400 hover:text-blue-600 text-sm">✏️</button>
                          {deleteId === task.id ? (
                            <span className="flex gap-1">
                              <button onClick={() => handleDelete(task.id)} className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">Yes</button>
                              <button onClick={() => setDeleteId(null)} className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">No</button>
                            </span>
                          ) : (
                            <button onClick={() => setDeleteId(task.id)} className="text-gray-300 hover:text-red-500 text-sm">🗑️</button>
                          )}
                        </div>
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
