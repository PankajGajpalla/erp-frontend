import { useEffect, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getFeesAPI, addFeesAPI, payFeesAPI, feesSummaryAPI, getFeePaymentsAPI, getStudentAPI, searchStudentsAPI } from "../api"
import jsPDF from "jspdf"

function generateReceipt(payment, fee, studentName, studentCode) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageW, 35, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT RECEIPT", pageW / 2, 18, { align: "center" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("ERP System", pageW / 2, 28, { align: "center" })

  // Reset color
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(11)

  const left = 20
  let y = 50

  // Receipt info
  doc.setFont("helvetica", "bold")
  doc.text(`Receipt No: RCP-${String(payment.id).padStart(5, "0")}`, left, y)
  doc.setFont("helvetica", "normal")
  doc.text(`Date: ${new Date(payment.paid_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pageW - left, y, { align: "right" })
  y += 15

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(left, y, pageW - left, y)
  y += 10

  // Student info
  doc.setFont("helvetica", "bold")
  doc.text("Student Details", left, y); y += 8
  doc.setFont("helvetica", "normal")
  doc.text(`Name: ${studentName || "—"}`, left, y); y += 7
  if (studentCode) { doc.text(`Student ID: ${studentCode}`, left, y); y += 7 }
  y += 5

  // Fee info
  doc.setFont("helvetica", "bold")
  doc.text("Payment Details", left, y); y += 8
  doc.setFont("helvetica", "normal")
  doc.text(`Description: ${fee.description || "Fee Payment"}`, left, y); y += 7
  if (fee.due_date) { doc.text(`Due Date: ${new Date(fee.due_date).toLocaleDateString("en-IN")}`, left, y); y += 7 }
  y += 5

  // Amount box
  doc.setFillColor(240, 249, 255)
  doc.setDrawColor(37, 99, 235)
  doc.roundedRect(left, y, pageW - left * 2, 30, 3, 3, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(37, 99, 235)
  doc.text("Amount Paid", left + 8, y + 11)
  doc.setFontSize(18)
  doc.text(`₹${parseFloat(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, pageW - left - 8, y + 14, { align: "right" })
  if (payment.note) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Note: ${payment.note}`, left + 8, y + 23)
  }
  y += 40

  // Footer
  doc.setDrawColor(200, 200, 200)
  doc.line(left, y, pageW - left, y)
  y += 8
  doc.setFont("helvetica", "italic")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("This is a computer-generated receipt. No signature required.", pageW / 2, y, { align: "center" })

  doc.save(`Receipt_RCP${String(payment.id).padStart(5,"0")}.pdf`)
}

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
function PaymentHistory({ feeId, fee, studentName, studentCode }) {
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
          <th className="px-4 py-1"></th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p, i) => (
          <tr key={p.id} className="border-b last:border-0">
            <td className="px-4 py-1 text-gray-400">{i + 1}</td>
            <td className="px-4 py-1 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
            <td className="px-4 py-1 text-gray-600">{formatDate(p.paid_date)}</td>
            <td className="px-4 py-1 text-gray-500">{p.note || "—"}</td>
            <td className="px-4 py-1">
              <button onClick={() => generateReceipt(p, fee, studentName, studentCode)}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded text-xs font-medium transition">
                🧾 Receipt
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Student View ─────────────────────────────────────────────
function StudentFees({ studentId, studentName, studentCode }) {
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
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
            <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
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
                            <PaymentHistory feeId={f.id} fee={f} studentName={studentName} studentCode={studentCode} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Student Search Box (shared by Add Fees + View Fees) ──────
function StudentSearchBox({ label, onSelect, selectedStudent, onClear }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const dropRef = useRef(null)
  const debounceRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchStudentsAPI(val.trim())
        setResults(res.data.students || [])
        setShowDrop(true)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  function handleSelect(student) {
    setQuery("")
    setResults([])
    setShowDrop(false)
    onSelect(student)
  }

  function handleClear() {
    setQuery("")
    setResults([])
    setShowDrop(false)
    onClear()
  }

  return (
    <div className="relative" ref={dropRef}>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}

      {selectedStudent ? (
        /* Selected student chip */
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800 truncate">{selectedStudent.name}</p>
            <p className="text-xs text-blue-500">
              {selectedStudent.student_code && <span className="font-mono mr-2">{selectedStudent.student_code}</span>}
              {selectedStudent.phone && <span>📞 {selectedStudent.phone}</span>}
              {selectedStudent.course && <span className="ml-2">· {selectedStudent.course}</span>}
            </p>
          </div>
          <button onClick={handleClear} title="Change student"
            className="text-blue-400 hover:text-red-500 transition text-lg font-bold leading-none flex-shrink-0">×</button>
        </div>
      ) : (
        /* Search input */
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setShowDrop(true)}
            placeholder="🔍 Search by name, phone or student ID..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
          />
          {searching && (
            <div className="absolute right-2 top-2.5 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Dropdown results */}
      {showDrop && results.length > 0 && !selectedStudent && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 overflow-hidden max-h-64 overflow-y-auto">
          {results.map((s) => (
            <button key={s.id} onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {s.student_code && <span className="font-mono mr-2">{s.student_code}</span>}
                    {s.phone && <span>📞 {s.phone}</span>}
                    {s.course && <span className="ml-2">· {s.course}</span>}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDrop && results.length === 0 && query.trim() && !searching && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 px-4 py-3 text-sm text-gray-400">
          No students found for "{query}"
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

  // Add Fees: selected student + form fields
  const [addStudent, setAddStudent] = useState(null)   // selected student object
  const [addForm, setAddForm] = useState({ amount: "", description: "", due_date: "" })

  // View Fees: selected student
  const [viewStudent, setViewStudent] = useState(null)  // { id, name, student_code, ... }

  const [payForms, setPayForms] = useState({})
  const [payingId, setPayingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [historyKey, setHistoryKey] = useState(0)

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t) }
  }, [success])

  useEffect(() => {
    if (statusFilter === "all") setFiltered(fees)
    else if (statusFilter === "paid") setFiltered(fees.filter((f) => f.paid >= f.amount))
    else setFiltered(fees.filter((f) => f.paid < f.amount))
  }, [fees, statusFilter])

  async function fetchFees(studentId) {
    if (!studentId) return
    setLoading(true); setError("")
    try {
      const [feesRes, summaryRes] = await Promise.all([
        getFeesAPI(studentId),
        feesSummaryAPI(studentId),
      ])
      setFees(feesRes.data.fees)
      setSummary(summaryRes.data)
      setExpandedId(null)
    } catch { setError("Failed to load fees for this student.") }
    finally { setLoading(false) }
  }

  // When a student is selected in the View section
  function handleSelectViewStudent(student) {
    setViewStudent(student)
    fetchFees(student.id)
  }

  function handleClearView() {
    setViewStudent(null)
    setFees([])
    setSummary(null)
    setError("")
  }

  async function handleAddFees(e) {
    e.preventDefault(); setError(""); setSuccess("")
    if (!addStudent) { setError("Please select a student first"); return }
    if (!addForm.amount) { setError("Amount is required"); return }
    if (parseFloat(addForm.amount) <= 0) { setError("Amount must be greater than 0"); return }
    setSubmitting(true)
    try {
      await addFeesAPI({
        student_id: addStudent.id,
        amount: parseFloat(addForm.amount),
        description: addForm.description || null,
        due_date: addForm.due_date || null,
      })
      setSuccess(`✅ Fee record added for ${addStudent.name}!`)
      setAddForm({ amount: "", description: "", due_date: "" })
      // If viewing the same student, refresh
      if (viewStudent?.id === addStudent.id) fetchFees(viewStudent.id)
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
      setSuccess(`✅ ${formatCurrency(payAmount)} payment recorded!`)
      setPayForms((prev) => ({ ...prev, [feeId]: { amount: "", paid_date: today(), note: "" } }))
      setHistoryKey((k) => k + 1)
      if (viewStudent) fetchFees(viewStudent.id)
    } catch (err) {
      setError(err.response?.data?.detail || "Payment failed")
    } finally { setPayingId(null) }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">💰 Fees</h2>

      {/* ── Add Fees Record ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b">➕ Add Fee Record</h3>
        <form onSubmit={handleAddFees} className="space-y-4">

          {/* Student search */}
          <StudentSearchBox
            label="Student * — search by name, phone or ID"
            selectedStudent={addStudent}
            onSelect={setAddStudent}
            onClear={() => setAddStudent(null)}
          />

          {/* Fee fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹) *</label>
              <input type="number" value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                placeholder="e.g. 12000" min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={addForm.due_date}
                onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input type="text" value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="e.g. Term 1 Fees"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <button type="submit" disabled={submitting || !addStudent}
            className="bg-blue-600 text-white px-7 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium text-sm">
            {submitting ? "Adding..." : "Add Fees"}
          </button>
        </form>

        {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2"><p className="text-red-600 text-sm">{error}</p></div>}
        {success && <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2"><p className="text-green-600 text-sm">{success}</p></div>}
      </div>

      {/* ── View Student Fees ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-base font-semibold text-gray-700 mb-3">🔍 View Student Fees</h3>
        <StudentSearchBox
          selectedStudent={viewStudent}
          onSelect={handleSelectViewStudent}
          onClear={handleClearView}
        />
      </div>

      {/* Summary */}
      {summary && viewStudent && (
        <>
          {/* Student banner */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl p-4 text-white flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold flex-shrink-0">
              {viewStudent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-lg">{viewStudent.name}</p>
              <p className="text-sm text-gray-300">
                {viewStudent.student_code && <span className="font-mono mr-3">{viewStudent.student_code}</span>}
                {viewStudent.phone && <span>📞 {viewStudent.phone}</span>}
                {viewStudent.course && <span className="ml-3">· {viewStudent.course}</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard label="Total Fees" value={formatCurrency(summary.total_fees)} color="blue" />
            <SummaryCard label="Paid" value={formatCurrency(summary.paid)} color="green" />
            <SummaryCard label="Pending" value={formatCurrency(summary.pending)} color="red" />
          </div>
        </>
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
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading fees...
          </div>
        ) : !viewStudent ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-400">Search and select a student above to view their fees.</p>
          </div>
        ) : fees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-gray-400">No fee records for this student yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-400">No records match the filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
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
                            <span className="text-green-600 text-xs font-medium">✅ Fully Paid</span>
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
                            <PaymentHistory key={historyKey} feeId={f.id} fee={f}
                              studentName={viewStudent?.name} studentCode={viewStudent?.student_code} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
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
        {isAdmin ? <AdminFees /> : <StudentFees studentId={user?.student_id} studentName={user?.name} studentCode={user?.student_code} />}
      </main>
    </div>
  )
}
