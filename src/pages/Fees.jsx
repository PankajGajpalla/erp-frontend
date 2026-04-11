import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getFeesAPI, addFeesAPI, payFeesAPI, feesSummaryAPI, getFeePaymentsAPI } from "../api"

function formatCurrency(amount) {
  return `₹${parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function isOverdue(dueDateStr) {
  if (!dueDateStr) return false
  return new Date(dueDateStr) < new Date()
}

// ── Payment history row (shared by admin & student) ──────────
function PaymentHistory({ feeId }) {
  const [payments, setPayments] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeePaymentsAPI(feeId)
      .then((r) => setPayments(r.data.payments))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false))
  }, [feeId])

  if (loading) return <p className="text-xs text-gray-400 py-2 px-4">Loading history...</p>
  if (!payments || payments.length === 0)
    return <p className="text-xs text-gray-400 py-2 px-4">No payments recorded yet.</p>

  return (
    <table className="w-full text-xs mt-1">
      <thead>
        <tr className="text-gray-500 border-b">
          <th className="text-left px-4 py-1 font-medium">#</th>
          <th className="text-left px-4 py-1 font-medium">Amount Paid</th>
          <th className="text-left px-4 py-1 font-medium">Date</th>
          <th className="text-left px-4 py-1 font-medium">Note</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p, i) => (
          <tr key={p.id} className="border-b last:border-0">
            <td className="px-4 py-1 text-gray-400">{i + 1}</td>
            <td className="px-4 py-1 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
            <td className="px-4 py-1 text-gray-600">{formatDate(p.paid_date)}</td>
            <td className="px-4 py-1 text-gray-500">{p.note || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Student View ─────────────────────────────────────────────
function StudentFees({ studentId }) {
  const [fees, setFees] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (!studentId) { setError("Student ID not found. Please login again."); setLoading(false); return }
    fetchFees()
  }, [studentId])

  async function fetchFees() {
    try {
      const [feesRes, summaryRes] = await Promise.all([getFeesAPI(studentId), feesSummaryAPI(studentId)])
      setFees(feesRes.data.fees)
      setSummary(summaryRes.data)
    } catch { setError("Failed to load fees") }
    finally { setLoading(false) }
  }

  const pendingFees = fees.filter((f) => f.paid < f.amount)
  const paidFees = fees.filter((f) => f.paid >= f.amount)
  const displayFees = activeTab === "all" ? fees : activeTab === "pending" ? pendingFees : paidFees

  if (loading) return <div className="flex items-center gap-3 text-gray-500"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading fees...</div>
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">{error}</div>

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">My Fees</h2>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Total Fees" value={formatCurrency(summary.total_fees)} color="blue" />
          <SummaryCard label="Paid" value={formatCurrency(summary.paid)} color="green" />
          <SummaryCard label="Pending" value={formatCurrency(summary.pending)} color="red" />
        </div>
      )}

      {/* Progress bar */}
      {summary && summary.total_fees > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Payment Progress</span>
            <span>{((summary.paid / summary.total_fees) * 100).toFixed(1)}% paid</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min((summary.paid / summary.total_fees) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {fees.some((f) => f.paid < f.amount && isOverdue(f.due_date)) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700">You have overdue payments!</p>
            <p className="text-sm text-red-500">Please contact admin to clear your dues immediately.</p>
          </div>
        </div>
      )}

      {fees.length === 0 && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-400">No fee records assigned yet.</p>
        </div>
      )}

      {fees.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            {[
              { key: "all", label: `All (${fees.length})` },
              { key: "pending", label: `Pending (${pendingFees.length})` },
              { key: "paid", label: `Paid (${paidFees.length})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition border-b-2
                  ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {displayFees.length === 0 ? (
            <p className="p-6 text-gray-400">No records in this category.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-xs uppercase">
                  <th className="text-left px-5 py-3">Description</th>
                  <th className="text-left px-5 py-3">Due Date</th>
                  <th className="text-left px-5 py-3">Total</th>
                  <th className="text-left px-5 py-3">Paid</th>
                  <th className="text-left px-5 py-3">Pending</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">History</th>
                </tr>
              </thead>
              <tbody>
                {displayFees.map((f) => {
                  const pending = f.amount - f.paid
                  const isFullyPaid = pending <= 0.001
                  const overdue = !isFullyPaid && isOverdue(f.due_date)
                  const expanded = expandedId === f.id
                  return (
                    <>
                      <tr key={f.id} className={`border-t transition ${overdue ? "bg-red-50" : isFullyPaid ? "" : "bg-yellow-50"} hover:bg-opacity-80`}>
                        <td className="px-5 py-3 font-medium">{f.description || "—"}</td>
                        <td className="px-5 py-3">
                          {f.due_date ? (
                            <span className={`text-xs font-medium ${overdue ? "text-red-600" : "text-gray-600"}`}>
                              {overdue && "⚠️ "}{formatDate(f.due_date)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3">{formatCurrency(f.amount)}</td>
                        <td className="px-5 py-3 text-green-600 font-medium">{formatCurrency(f.paid)}</td>
                        <td className="px-5 py-3 text-red-600 font-medium">{formatCurrency(pending)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isFullyPaid ? "bg-green-100 text-green-700" : overdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {isFullyPaid ? "Paid" : overdue ? "Overdue" : "Pending"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={() => setExpandedId(expanded ? null : f.id)}
                            className="text-blue-600 text-xs underline hover:text-blue-800">
                            {expanded ? "Hide" : "View History"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`hist-${f.id}`} className="bg-blue-50 border-t">
                          <td colSpan={7} className="px-2 py-2">
                            <p className="text-xs font-semibold text-gray-500 px-4 pb-1">Payment History</p>
                            <PaymentHistory feeId={f.id} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Admin View ───────────────────────────────────────────────
function AdminFees() {
  const [fees, setFees] = useState([])
  const [filtered, setFiltered] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState({ student_id: "", amount: "", description: "", due_date: "" })
  const [payForms, setPayForms] = useState({})   // { feeId: { amount, paid_date, note } }
  const [payingId, setPayingId] = useState(null)
  const [viewId, setViewId] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [historyKey, setHistoryKey] = useState(0) // force re-fetch history after payment

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  useEffect(() => {
    if (statusFilter === "all") setFiltered(fees)
    else if (statusFilter === "paid") setFiltered(fees.filter((f) => f.paid >= f.amount))
    else setFiltered(fees.filter((f) => f.paid < f.amount))
  }, [fees, statusFilter])

  async function fetchFees(id) {
    if (!id) return
    setLoading(true); setError("")
    try {
      const [feesRes, summaryRes] = await Promise.all([getFeesAPI(id), feesSummaryAPI(id)])
      setFees(feesRes.data.fees)
      setSummary(summaryRes.data)
      setExpandedId(null)
    } catch { setError("Failed to load fees — check the student ID") }
    finally { setLoading(false) }
  }

  async function handleAddFees(e) {
    e.preventDefault(); setError(""); setSuccess("")
    if (!form.student_id || !form.amount) { setError("Student ID and amount are required"); return }
    if (parseFloat(form.amount) <= 0) { setError("Amount must be greater than 0"); return }
    setSubmitting(true)
    try {
      await addFeesAPI({
        student_id: parseInt(form.student_id),
        amount: parseFloat(form.amount),
        description: form.description || null,
        due_date: form.due_date || null,
      })
      setSuccess("Fees added successfully!")
      setForm({ student_id: "", amount: "", description: "", due_date: "" })
      if (viewId === form.student_id) fetchFees(viewId)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add fees")
    } finally { setSubmitting(false) }
  }

  function getPayForm(feeId) {
    return payForms[feeId] || { amount: "", paid_date: today(), note: "" }
  }

  function setPayForm(feeId, patch) {
    setPayForms((prev) => ({ ...prev, [feeId]: { ...getPayForm(feeId), ...patch } }))
  }

  async function handlePay(feeId) {
    const pf = getPayForm(feeId)
    const payAmount = parseFloat(pf.amount)
    if (!payAmount || payAmount <= 0) { setError("Enter a valid payment amount"); return }
    setError(""); setSuccess(""); setPayingId(feeId)
    try {
      await payFeesAPI(feeId, {
        pay_amount: payAmount,
        paid_date: pf.paid_date || today(),
        note: pf.note || null,
      })
      setSuccess(`${formatCurrency(payAmount)} payment recorded!`)
      setPayForms((prev) => ({ ...prev, [feeId]: { amount: "", paid_date: today(), note: "" } }))
      setHistoryKey((k) => k + 1)
      fetchFees(viewId)
    } catch (err) {
      setError(err.response?.data?.detail || "Payment failed")
    } finally { setPayingId(null) }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Fees</h2>

      {/* Add Fees */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">Add Fees Record</h3>
        <form onSubmit={handleAddFees}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Student ID *</label>
              <input type="number" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                placeholder="e.g. 5" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 12000" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Term 1 Fees"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium">
            {submitting ? "Adding..." : "Add Fees"}
          </button>
        </form>

        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
        {success && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
      </div>

      {/* Search student */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-base font-semibold text-gray-700 mb-3">View Student Fees</h3>
        <form onSubmit={(e) => { e.preventDefault(); fetchFees(viewId) }} className="flex gap-3">
          <input type="number" placeholder="Student ID" value={viewId}
            onChange={(e) => setViewId(e.target.value)} min="1"
            className="border border-gray-300 rounded-lg px-4 py-2 w-36 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm">
            {loading ? "Loading..." : "Load Fees"}
          </button>
        </form>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Total Fees" value={formatCurrency(summary.total_fees)} color="blue" />
          <SummaryCard label="Paid" value={formatCurrency(summary.paid)} color="green" />
          <SummaryCard label="Pending" value={formatCurrency(summary.pending)} color="red" />
        </div>
      )}

      {/* Filter */}
      {fees.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-gray-600">Filter:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All</option>
            <option value="paid">Fully Paid</option>
            <option value="unpaid">Has Pending</option>
          </select>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} of {fees.length} records</span>
        </div>
      )}

      {/* Fees Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Loading...
          </div>
        ) : fees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-400">Enter a student ID above to load fees.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-400">No fee records match the filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs uppercase">
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-left px-5 py-3">Due Date</th>
                <th className="text-left px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Paid</th>
                <th className="text-left px-5 py-3">Pending</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Record Payment</th>
                <th className="text-left px-5 py-3">History</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const pending = f.amount - f.paid
                const isFullyPaid = pending <= 0.001
                const overdue = !isFullyPaid && isOverdue(f.due_date)
                const expanded = expandedId === f.id
                const pf = getPayForm(f.id)
                return (
                  <>
                    <tr key={f.id} className={`border-t transition ${overdue ? "bg-red-50" : ""} hover:bg-gray-50`}>
                      <td className="px-5 py-3 font-medium">{f.description || "—"}</td>
                      <td className="px-5 py-3">
                        {f.due_date ? (
                          <span className={`text-xs font-medium ${overdue ? "text-red-600" : "text-gray-600"}`}>
                            {overdue && "⚠️ "}{formatDate(f.due_date)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3">{formatCurrency(f.amount)}</td>
                      <td className="px-5 py-3 text-green-600 font-medium">{formatCurrency(f.paid)}</td>
                      <td className="px-5 py-3 text-red-600 font-medium">{formatCurrency(pending)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isFullyPaid ? "bg-green-100 text-green-700" : overdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {isFullyPaid ? "Paid" : overdue ? "Overdue" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {!isFullyPaid ? (
                          <div className="flex flex-col gap-1 min-w-[220px]">
                            <div className="flex gap-1">
                              <input type="number" placeholder="₹ Amount" value={pf.amount}
                                onChange={(e) => setPayForm(f.id, { amount: e.target.value })}
                                min="1" className="border border-gray-300 rounded px-2 py-1 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="date" value={pf.paid_date}
                                onChange={(e) => setPayForm(f.id, { paid_date: e.target.value })}
                                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div className="flex gap-1">
                              <input type="text" placeholder="Note (optional)" value={pf.note}
                                onChange={(e) => setPayForm(f.id, { note: e.target.value })}
                                className="border border-gray-300 rounded px-2 py-1 flex-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <button onClick={() => handlePay(f.id)} disabled={payingId === f.id}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition disabled:opacity-50">
                                {payingId === f.id ? "..." : "Pay"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">Fully Paid</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => setExpandedId(expanded ? null : f.id)}
                          className="text-blue-600 text-xs underline hover:text-blue-800">
                          {expanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`hist-${f.id}`} className="bg-blue-50 border-t">
                        <td colSpan={8} className="px-2 py-2">
                          <p className="text-xs font-semibold text-gray-500 px-4 pb-1">Payment History</p>
                          <PaymentHistory key={historyKey} feeId={f.id} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Shared summary card ──────────────────────────────────────
function SummaryCard({ label, value, color }) {
  const border = { blue: "border-blue-500", green: "border-green-500", red: "border-red-500" }[color]
  const text = { blue: "text-gray-800", green: "text-green-600", red: "text-red-600" }[color]
  return (
    <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${border}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
    </div>
  )
}

function today() {
  return new Date().toISOString().split("T")[0]
}

// ── Main ─────────────────────────────────────────────────────
export default function Fees() {
  const { user, isAdmin } = useAuth()
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        {isAdmin ? <AdminFees /> : <StudentFees studentId={user?.student_id} />}
      </main>
    </div>
  )
}
