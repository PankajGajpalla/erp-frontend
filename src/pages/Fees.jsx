import { useEffect, useState } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getFeesAPI, addFeesAPI, payFeesAPI, feesSummaryAPI } from "../api"

export default function Fees() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [fees, setFees] = useState([])
  const [filtered, setFiltered] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filters
  const [statusFilter, setStatusFilter] = useState("all")

  // Add fees form
  const [form, setForm] = useState({ student_id: "", amount: "", description: "" })

  // Pay amount input per fee row
  const [payAmounts, setPayAmounts] = useState({})

  // View fees by student id
  const [viewId, setViewId] = useState("")

  useEffect(() => {
    if (!isAdmin) fetchFees(user.student_id)
  }, [])

  useEffect(() => {
    if (statusFilter === "all") {
      setFiltered(fees)
    } else if (statusFilter === "paid") {
      setFiltered(fees.filter((f) => f.paid >= f.amount))
    } else {
      setFiltered(fees.filter((f) => f.paid < f.amount))
    }
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
      setError("Failed to load fees")
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

    try {
      await addFeesAPI({
        student_id: parseInt(form.student_id),
        amount: parseFloat(form.amount),
        description: form.description || null
      })
      setSuccess("Fees added successfully!")
      setForm({ student_id: "", amount: "", description: "" })
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add fees")
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

    try {
      await payFeesAPI(feeId, { pay_amount: payAmount })
      setSuccess(`₹${payAmount} payment recorded!`)
      setPayAmounts({ ...payAmounts, [feeId]: "" })
      fetchFees(viewId || user.student_id)
    } catch (err) {
      setError(err.response?.data?.detail || "Payment failed")
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!viewId) {
      setError("Enter a student ID")
      return
    }
    fetchFees(viewId)
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <h2 className="text-2xl font-bold text-gray-800 mb-6">💰 Fees</h2>

        {/* Admin: Add Fees */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Fees</h3>
            <form onSubmit={handleAddFees} className="flex flex-wrap gap-3">
              <input
                type="number"
                placeholder="Student ID"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Total Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Description (e.g. Term 1 Fees)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Add Fees
              </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            {success && <p className="text-green-500 text-sm mt-3">{success}</p>}
          </div>
        )}

        {/* Admin: Search */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">View Student Fees</h3>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="number"
                placeholder="Student ID"
                value={viewId}
                onChange={(e) => setViewId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Load Fees
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        {fees.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm font-medium text-gray-600">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="paid">Fully Paid</option>
                <option value="unpaid">Has Pending</option>
              </select>
              <button
                onClick={() => setStatusFilter("all")}
                className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition"
              >
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Fees</p>
              <p className="text-3xl font-bold text-gray-800">₹{summary.total_fees}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-3xl font-bold text-green-600">₹{summary.paid}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-red-600">₹{summary.pending}</p>
            </div>
          </div>
        )}

        {/* Fees Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading fees...</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-gray-400">No fee records found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-6 py-3">Description</th>
                  <th className="text-left px-6 py-3">Total</th>
                  <th className="text-left px-6 py-3">Paid</th>
                  <th className="text-left px-6 py-3">Pending</th>
                  <th className="text-left px-6 py-3">Status</th>
                  {isAdmin && <th className="text-left px-6 py-3">Pay</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const pending = f.amount - f.paid
                  const isFullyPaid = pending <= 0
                  return (
                    <tr key={f.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-6 py-3">{f.description || "—"}</td>
                      <td className="px-6 py-3">₹{f.amount}</td>
                      <td className="px-6 py-3 text-green-600">₹{f.paid}</td>
                      <td className="px-6 py-3 text-red-600">₹{pending.toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${isFullyPaid
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"}`}>
                          {isFullyPaid ? "Paid" : "Pending"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-3">
                          {!isFullyPaid ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                placeholder="Amount"
                                value={payAmounts[f.id] || ""}
                                onChange={(e) =>
                                  setPayAmounts({ ...payAmounts, [f.id]: e.target.value })
                                }
                                className="border border-gray-300 rounded-lg px-2 py-1 w-24 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handlePay(f.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs transition"
                              >
                                Pay
                              </button>
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs font-medium">✅ Fully Paid</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  )
}