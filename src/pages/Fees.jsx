import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getFeesAPI, addFeesAPI, payFeesAPI, feesSummaryAPI } from "../api"

// ─── Format currency ─────────────────────────────────────────
function formatCurrency(amount) {
  return `₹${parseFloat(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

// ─── Student Fees View ───────────────────────────────────────
function StudentFees({ studentId }) {
  const [fees, setFees] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    // ✅ Guard against null studentId
    if (!studentId) {
      setError("Student ID not found. Please login again.")
      setLoading(false)
      return
    }
    fetchFees()
  }, [studentId])

  async function fetchFees() {
    try {
      const [feesRes, summaryRes] = await Promise.all([
        getFeesAPI(studentId),
        feesSummaryAPI(studentId)
      ])
      setFees(feesRes.data.fees)
      setSummary(summaryRes.data)
    } catch (err) {
      setError("Failed to load fees")
    } finally {
      setLoading(false)
    }
  }

  const pendingFees = fees.filter((f) => f.paid < f.amount)
  const paidFees = fees.filter((f) => f.paid >= f.amount)
  const displayFees = activeTab === "all" ? fees
    : activeTab === "pending" ? pendingFees
    : paidFees

  if (loading) return (
    <div className="flex items-center gap-3 text-gray-500">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      Loading fees...
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
      {error}
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">💰 My Fees</h2>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Total Fees</p>
            <p className="text-3xl font-bold text-gray-800">{formatCurrency(summary.total_fees)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.paid)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.pending)}</p>
          </div>
        </div>
      )}

      {/* ✅ Payment progress bar */}
      {summary && summary.total_fees > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Payment Progress</span>
            <span>{((summary.paid / summary.total_fees) * 100).toFixed(1)}% paid</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min((summary.paid / summary.total_fees) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Pending Alert */}
      {pendingFees.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700">
              You have {pendingFees.length} pending payment{pendingFees.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-red-500">Please contact admin to clear your dues</p>
          </div>
        </div>
      )}

      {/* No fees yet */}
      {fees.length === 0 && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-400">No fee records assigned yet.</p>
          <p className="text-gray-400 text-sm mt-1">Contact your admin for more info.</p>
        </div>
      )}

      {/* Tabs */}
      {fees.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="flex border-b">
            {[
              { key: "all", label: `All (${fees.length})` },
              { key: "pending", label: `Pending (${pendingFees.length})` },
              { key: "paid", label: `Paid (${paidFees.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium transition border-b-2
                  ${activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {displayFees.length === 0 ? (
            <p className="p-6 text-gray-400">No records in this category.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">Description</th>
                  <th className="text-left px-6 py-3">Total</th>
                  <th className="text-left px-6 py-3">Paid</th>
                  <th className="text-left px-6 py-3">Pending</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayFees.map((f) => {
                  const pending = f.amount - f.paid
                  const isFullyPaid = pending <= 0.001 // handle floating point
                  return (
                    <tr key={f.id} className={`border-t transition
                      ${!isFullyPaid ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}>
                      <td className="px-6 py-3 font-medium">{f.description || "—"}</td>
                      <td className="px-6 py-3">{formatCurrency(f.amount)}</td>
                      <td className="px-6 py-3 text-green-600 font-medium">{formatCurrency(f.paid)}</td>
                      <td className="px-6 py-3 text-red-600 font-medium">{formatCurrency(pending)}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${isFullyPaid
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"}`}>
                          {isFullyPaid ? "✅ Paid" : "⏳ Pending"}
                        </span>
                      </td>
                    </tr>
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

// ─── Admin Fees View ─────────────────────────────────────────
function AdminFees() {
  const [fees, setFees] = useState([])
  const [filtered, setFiltered] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState({ student_id: "", amount: "", description: "" })
  const [payAmounts, setPayAmounts] = useState({})
  const [payingId, setPayingId] = useState(null)
  const [viewId, setViewId] = useState("")

  // ✅ Auto clear success after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (statusFilter === "all") setFiltered(fees)
    else if (statusFilter === "paid") setFiltered(fees.filter((f) => f.paid >= f.amount))
    else setFiltered(fees.filter((f) => f.paid < f.amount))
  }, [fees, statusFilter])

  async function fetchFees(id) {
    if (!id) return
    setLoading(true)
    setError("")
    try {
      const [feesRes, summaryRes] = await Promise.all([
        getFeesAPI(id),
        feesSummaryAPI(id)
      ])
      setFees(feesRes.data.fees)
      setSummary(summaryRes.data)
    } catch (err) {
      setError("Failed to load fees — check the student ID")
    } finally {
      setLoading(false)
    }
  }

  async function handleAddFees(e) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!form.student_id || !form.amount) {
      setError("Student ID and amount are required")
      return
    }

    // ✅ Validate amount > 0
    if (parseFloat(form.amount) <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    setSubmitting(true)
    try {
      await addFeesAPI({
        student_id: parseInt(form.student_id),
        amount: parseFloat(form.amount),
        description: form.description || null
      })
      setSuccess("✅ Fees added successfully!")
      setForm({ student_id: "", amount: "", description: "" })
      // Refresh if viewing same student
      if (viewId === form.student_id) fetchFees(viewId)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add fees")
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePay(feeId) {
    const payAmount = parseFloat(payAmounts[feeId])
    if (!payAmount || payAmount <= 0) {
      setError("Enter a valid payment amount")
      return
    }
    setError("")
    setSuccess("")
    setPayingId(feeId)
    try {
      await payFeesAPI(feeId, { pay_amount: payAmount })
      setSuccess(`✅ ${formatCurrency(payAmount)} payment recorded!`)
      setPayAmounts({ ...payAmounts, [feeId]: "" })
      fetchFees(viewId)
    } catch (err) {
      setError(err.response?.data?.detail || "Payment failed")
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">💰 Fees</h2>

      {/* Add Fees */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Fees</h3>
        <form onSubmit={handleAddFees} className="flex flex-wrap gap-3">
          <input type="number" placeholder="Student ID" value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })} min="1"
            className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Total Amount" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} min="1"
            className="border border-gray-300 rounded-lg px-4 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Description (e.g. Term 1 Fees)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {submitting ? "Adding..." : "Add Fees"}
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

      {/* Search */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">View Student Fees</h3>
        <form onSubmit={(e) => { e.preventDefault(); fetchFees(viewId) }} className="flex gap-3">
          <input type="number" placeholder="Student ID" value={viewId}
            onChange={(e) => setViewId(e.target.value)} min="1"
            className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
            {loading ? "Loading..." : "Load Fees"}
          </button>
        </form>
      </div>

      {/* Filters */}
      {fees.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All</option>
              <option value="paid">Fully Paid</option>
              <option value="unpaid">Has Pending</option>
            </select>
            <button onClick={() => setStatusFilter("all")}
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition">
              Clear
            </button>
            <p className="text-sm text-gray-400 ml-auto">
              Showing {filtered.length} of {fees.length} records
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Total Fees</p>
            <p className="text-3xl font-bold text-gray-800">{formatCurrency(summary.total_fees)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.paid)}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(summary.pending)}</p>
          </div>
        </div>
      )}

      {/* Fees Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading fees...
          </div>
        ) : filtered.length === 0 && fees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-400">Enter a student ID to load fees.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-400">No fee records match the filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-6 py-3">Description</th>
                <th className="text-left px-6 py-3">Total</th>
                <th className="text-left px-6 py-3">Paid</th>
                <th className="text-left px-6 py-3">Pending</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Pay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const pending = f.amount - f.paid
                const isFullyPaid = pending <= 0.001
                return (
                  <tr key={f.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-3">{f.description || "—"}</td>
                    <td className="px-6 py-3">{formatCurrency(f.amount)}</td>
                    <td className="px-6 py-3 text-green-600">{formatCurrency(f.paid)}</td>
                    <td className="px-6 py-3 text-red-600">{formatCurrency(pending)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${isFullyPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {isFullyPaid ? "✅ Paid" : "⏳ Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {!isFullyPaid ? (
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="Amount"
                            value={payAmounts[f.id] || ""}
                            onChange={(e) => setPayAmounts({ ...payAmounts, [f.id]: e.target.value })}
                            min="1"
                            className="border border-gray-300 rounded-lg px-2 py-1 w-24 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button
                            onClick={() => handlePay(f.id)}
                            disabled={payingId === f.id}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs transition disabled:opacity-50">
                            {payingId === f.id ? "..." : "Pay"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs font-medium">✅ Fully Paid</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Main Fees Page ──────────────────────────────────────────
export default function Fees() {
  const { user, isAdmin } = useAuth()

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        {isAdmin
          ? <AdminFees />
          : <StudentFees studentId={user?.student_id} />
        }
      </main>
    </div>
  )
}