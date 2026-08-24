import { useEffect, useState, useMemo } from "react"
import Sidebar from "../components/Sidebar"
import { createExpenseAPI, getExpensesAPI, getExpenseStatsAPI, editExpenseAPI, deleteExpenseAPI } from "../api"

const CATEGORIES = [
  "Rent", "Electricity", "Internet", "Salaries", "Stationery",
  "Maintenance", "Marketing", "Equipment", "Travel", "Miscellaneous"
]

const CAT_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-yellow-100 text-yellow-700",
  "bg-red-100 text-red-700", "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700", "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700", "bg-gray-100 text-gray-700",
]

function catColor(cat) {
  const idx = CATEGORIES.indexOf(cat)
  return CAT_COLORS[idx >= 0 ? idx : CAT_COLORS.length - 1]
}

const EMPTY_FORM = { title: "", category: "", amount: "", date: "", description: "" }

export default function Expenses() {
  const [expenses, setExpenses]   = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editId, setEditId]       = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [deleteId, setDeleteId]   = useState(null)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState("")

  // Filters
  const [search, setSearch]           = useState("")
  const [filterCat, setFilterCat]     = useState("")
  const [filterFrom, setFilterFrom]   = useState("")
  const [filterTo, setFilterTo]       = useState("")

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  async function fetchAll() {
    setLoading(true)
    try {
      const [expRes, statsRes] = await Promise.all([getExpensesAPI(), getExpenseStatsAPI()])
      setExpenses(expRes.data.expenses || [])
      setStats(statsRes.data)
    } catch { setError("Failed to load expenses") }
    finally { setLoading(false) }
  }

  async function refetchStats() {
    try {
      const r = await getExpenseStatsAPI()
      setStats(r.data)
    } catch {}
  }

  function openCreate() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] })
    setShowForm(true)
    setError("")
  }

  function openEdit(exp) {
    setEditId(exp.id)
    setForm({ title: exp.title, category: exp.category, amount: String(exp.amount), date: exp.date, description: exp.description || "" })
    setShowForm(true)
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.category || !form.amount || !form.date) {
      setError("Title, category, amount and date are required"); return
    }
    setSubmitting(true); setError("")
    try {
      const payload = { ...form, amount: parseFloat(form.amount) }
      if (editId) {
        const r = await editExpenseAPI(editId, payload)
        setExpenses(prev => prev.map(e => e.id === editId ? r.data.expense : e))
        setSuccess("Expense updated")
      } else {
        const r = await createExpenseAPI(payload)
        setExpenses(prev => [r.data.expense, ...prev])
        setSuccess("Expense added")
      }
      await refetchStats()
      setShowForm(false); setForm(EMPTY_FORM); setEditId(null)
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed")
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteExpenseAPI(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
      await refetchStats()
      setSuccess("Expense deleted"); setDeleteId(null)
    } catch { setError("Delete failed"); setDeleteId(null) }
  }

  const filtered = useMemo(() => {
    let list = expenses
    if (filterCat)  list = list.filter(e => e.category === filterCat)
    if (filterFrom) list = list.filter(e => e.date >= filterFrom)
    if (filterTo)   list = list.filter(e => e.date <= filterTo)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [expenses, filterCat, filterFrom, filterTo, search])

  const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered])

  function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  function fmtAmount(n) {
    return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })
  }

  // Top categories for mini bar chart
  const topCats = useMemo(() => {
    if (!stats?.by_category) return []
    const sorted = Object.entries(stats.by_category).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const max = sorted[0]?.[1] || 1
    return sorted.map(([cat, amt]) => ({ cat, amt, pct: Math.round((amt / max) * 100) }))
  }, [stats])

  // Recent months for trend
  const monthTrend = useMemo(() => {
    if (!stats?.by_month) return []
    const entries = Object.entries(stats.by_month).slice(-6)
    const max = Math.max(...entries.map(([, v]) => v), 1)
    return entries.map(([month, amt]) => ({
      label: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      amt, pct: Math.round((amt / max) * 100)
    }))
  }, [stats])

  const uniqueCats = useMemo(() => [...new Set(expenses.map(e => e.category))].sort(), [expenses])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 pt-20 md:pt-6 space-y-5 overflow-x-hidden">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
            <p className="text-sm text-gray-400">Track and manage institute expenditure</p>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Add Expense</button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{fmtAmount(stats.total)}</p>
              <p className="text-xs text-gray-400 mt-1">Total Expenses</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.count}</p>
              <p className="text-xs text-gray-400 mt-1">Total Entries</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{Object.keys(stats.by_category || {}).length}</p>
              <p className="text-xs text-gray-400 mt-1">Categories</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.count > 0 ? fmtAmount(Math.round(stats.total / stats.count)) : "₹0"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg per Entry</p>
            </div>
          </div>
        )}

        {/* Charts row */}
        {(topCats.length > 0 || monthTrend.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* By category */}
            {topCats.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Categories</h3>
                <div className="space-y-3">
                  {topCats.map(({ cat, amt, pct }) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${catColor(cat)}`}>{cat}</span>
                        <span className="font-semibold">{fmtAmount(amt)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly trend */}
            {monthTrend.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend</h3>
                <div className="flex items-end gap-2 h-32">
                  {monthTrend.map(({ label, amt, pct }) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-500 font-semibold">{fmtAmount(amt)}</span>
                      <div className="w-full bg-gray-100 rounded-t-sm overflow-hidden" style={{ height: "80px" }}>
                        <div className="w-full bg-indigo-500 rounded-t-sm transition-all"
                          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error   && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-red-600 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-green-600 text-sm">{success}</div>}

        {/* Add / Edit form */}
        {showForm && (
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{editId ? "Edit Expense" : "Add Expense"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Title *</label>
                <input className="inp" placeholder="e.g. Electricity Bill - August" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Category *</label>
                <select className="inp" value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">— Select Category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input type="number" min="0" step="0.01" className="inp" placeholder="e.g. 5000" value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Date *</label>
                <input type="date" className="inp" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input className="inp" placeholder="Optional notes…" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                  {submitting ? "Saving…" : editId ? "Update" : "Add Expense"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError("") }} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <input className="inp flex-1 min-w-[160px]" placeholder="Search title, category, description…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="inp w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>From</span>
            <input type="date" className="inp w-auto" value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>To</span>
            <input type="date" className="inp w-auto" value={filterTo}
              onChange={e => setFilterTo(e.target.value)} />
          </div>
          {(search || filterCat || filterFrom || filterTo) && (
            <button onClick={() => { setSearch(""); setFilterCat(""); setFilterFrom(""); setFilterTo("") }}
              className="btn-ghost text-sm">Clear</button>
          )}
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {filtered.length} entries · <span className="font-semibold">{fmtAmount(filteredTotal)}</span>
          </span>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading expenses…</div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center">
              <p className="text-4xl mb-2">💰</p>
              <p className="text-gray-400">No expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-gray-800 text-white text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 w-28">Date</th>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3 w-32">Category</th>
                    <th className="text-right px-4 py-3 w-28">Amount</th>
                    <th className="text-left px-4 py-3 w-28">Added By</th>
                    <th className="text-center px-4 py-3 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exp => (
                    <tr key={exp.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(exp.date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{exp.title}</p>
                        {exp.description && <p className="text-xs text-gray-400 mt-0.5">{exp.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catColor(exp.category)}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmtAmount(exp.amount)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{exp.added_by}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(exp)} className="text-blue-400 hover:text-blue-600 text-sm">✏️</button>
                          {deleteId === exp.id ? (
                            <span className="flex gap-1">
                              <button onClick={() => handleDelete(exp.id)} className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">Yes</button>
                              <button onClick={() => setDeleteId(null)} className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">No</button>
                            </span>
                          ) : (
                            <button onClick={() => setDeleteId(exp.id)} className="text-gray-300 hover:text-red-500 text-sm">🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">
                      {filtered.length !== expenses.length ? "Filtered Total" : "Grand Total"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtAmount(filteredTotal)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
