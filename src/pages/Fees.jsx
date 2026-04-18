import { useEffect, useState, useRef } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import { getFeesAPI, addFeesAPI, payFeesAPI, updateFeeRecordAPI, deleteFeeRecordAPI, feesSummaryAPI, getFeePaymentsAPI, getStudentAPI, searchStudentsAPI, getCoursesAPI, getStudentsByCourseAPI } from "../api"
import jsPDF from "jspdf"

function generateReceipt(payment, fee, studentName, studentCode, course, parentPhone) {
  const doc   = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  const left  = 18
  const right = pageW - left

  // ── Header bar ───────────────────────────────────────────────
  doc.setFillColor(30, 64, 175)           // deep blue
  doc.rect(0, 0, pageW, 38, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT RECEIPT", pageW / 2, 16, { align: "center" })
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("ABS Foundation", pageW / 2, 26, { align: "center" })
  doc.setFontSize(8)
  doc.text("Computer-generated receipt — no signature required", pageW / 2, 33, { align: "center" })

  // ── Receipt meta row ─────────────────────────────────────────
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(10)
  let y = 50
  doc.setFont("helvetica", "bold")
  doc.text(`Receipt No:  RCP-${String(payment.id).padStart(5, "0")}`, left, y)
  doc.setFont("helvetica", "normal")
  const dateStr = payment.paid_date
    ? new Date(payment.paid_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—"
  doc.text(`Date: ${dateStr}`, right, y, { align: "right" })

  // ── Divider ───────────────────────────────────────────────────
  y += 8
  doc.setDrawColor(210, 210, 210)
  doc.line(left, y, right, y)
  y += 10

  // ── Student Details ───────────────────────────────────────────
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(left, y - 4, right - left, course && parentPhone ? 38 : course || parentPhone ? 32 : 26, 2, 2, "F")

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 120)
  doc.text("STUDENT DETAILS", left + 4, y + 2)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)

  // Two-column layout: left = label, right = value
  function row(label, value, yPos) {
    doc.setFont("helvetica", "bold");   doc.text(label, left + 4, yPos)
    doc.setFont("helvetica", "normal"); doc.text(String(value || "—"), left + 38, yPos)
  }

  row("Name :", studentName || "—", y); y += 7
  if (studentCode)  { row("Student ID :", studentCode, y); y += 7 }
  if (course)       { row("Course :", course, y);          y += 7 }
  if (parentPhone)  { row("Parent No. :", parentPhone, y); y += 7 }

  y += 6

  // ── Payment Details ───────────────────────────────────────────
  doc.setFillColor(245, 247, 250)
  const payBoxH = fee.due_date ? 26 : 19
  doc.roundedRect(left, y - 4, right - left, payBoxH, 2, 2, "F")

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 120)
  doc.text("PAYMENT DETAILS", left + 4, y + 2)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  row("Description :", fee.description || "Fee Payment", y); y += 7
  if (fee.due_date) {
    row("Due Date :", new Date(fee.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), y)
    y += 7
  }
  y += 8

  // ── Amount Box ────────────────────────────────────────────────
  const boxH = payment.note ? 36 : 28
  doc.setFillColor(239, 246, 255)
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.6)
  doc.roundedRect(left, y, right - left, boxH, 3, 3, "FD")
  doc.setLineWidth(0.2)

  // Label
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 64, 175)
  doc.text("AMOUNT PAID", left + 6, y + 9)

  // Amount — on same line, right-aligned but capped so it never overflows
  const amountStr = `Rs. ${parseFloat(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 100, 50)
  doc.text(amountStr, right - 6, y + 10, { align: "right" })

  // Note (if any) — smaller, inside box below amount
  if (payment.note) {
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(100, 100, 100)
    const noteLines = doc.splitTextToSize(`Note: ${payment.note}`, right - left - 12)
    doc.text(noteLines, left + 6, y + 20)
  }

  y += boxH + 10

  // ── Summary row ───────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  const totalFee  = `Total Fee: Rs. ${parseFloat(fee.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
  const totalPaid = `Total Paid: Rs. ${parseFloat(fee.paid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
  const pending   = fee.amount - fee.paid
  const pendingStr = `Balance: Rs. ${parseFloat(pending).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
  doc.text(totalFee,  left, y)
  doc.text(totalPaid, pageW / 2, y, { align: "center" })
  doc.text(pendingStr, right, y, { align: "right" })
  y += 10

  // ── Footer ────────────────────────────────────────────────────
  doc.setDrawColor(210, 210, 210)
  doc.line(left, y, right, y)
  y += 7
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 160)
  doc.text("Thank you for your payment. Please retain this receipt for your records.", pageW / 2, y, { align: "center" })

  doc.save(`Receipt_RCP${String(payment.id).padStart(5, "0")}.pdf`)
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
function PaymentHistory({ feeId, fee, studentName, studentCode, course, parentPhone }) {
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
              <button onClick={() => generateReceipt(p, fee, studentName, studentCode, course, parentPhone)}
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
function StudentFees({ studentId, studentName, studentCode, course, parentPhone }) {
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
                            <PaymentHistory feeId={f.id} fee={f} studentName={studentName} studentCode={studentCode} course={course} parentPhone={parentPhone} />
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

  // View Fees: browse by course
  const [viewMode, setViewMode]           = useState("search")  // "search" | "course"
  const [courses, setCourses]             = useState([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [courseStudents, setCourseStudents] = useState([])
  const [courseLoading, setCourseLoading] = useState(false)

  const [payForms, setPayForms] = useState({})
  const [payingId, setPayingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [historyKey, setHistoryKey] = useState(0)

  // Edit / delete fee record
  const [editingFee, setEditingFee]   = useState(null)   // fee object being edited
  const [editForm, setEditForm]       = useState({ amount: "", description: "", due_date: "" })
  const [saving, setSaving]           = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t) }
  }, [success])

  useEffect(() => {
    if (statusFilter === "all") setFiltered(fees)
    else if (statusFilter === "paid") setFiltered(fees.filter((f) => f.paid >= f.amount))
    else setFiltered(fees.filter((f) => f.paid < f.amount))
  }, [fees, statusFilter])

  // Load courses once for Browse-by-Course mode
  useEffect(() => {
    getCoursesAPI().then((r) => setCourses(r.data.courses || [])).catch(() => {})
  }, [])

  // When course changes, load its students
  useEffect(() => {
    if (!selectedCourse) { setCourseStudents([]); return }
    setCourseLoading(true)
    getStudentsByCourseAPI(selectedCourse)
      .then((r) => setCourseStudents(r.data.students || r.data || []))
      .catch(() => setCourseStudents([]))
      .finally(() => setCourseLoading(false))
  }, [selectedCourse])

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
    setSelectedCourse("")
    setCourseStudents([])
  }

  function openEditFee(fee) {
    setEditingFee(fee)
    setEditForm({
      amount:      String(fee.amount),
      description: fee.description || "",
      due_date:    fee.due_date || "",
    })
    setDeleteConfirmId(null)
  }

  async function handleUpdateFee(e) {
    e.preventDefault(); setError(""); setSuccess("")
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) { setError("Amount must be greater than 0"); return }
    setSaving(true)
    try {
      await updateFeeRecordAPI(editingFee.id, {
        amount:      parseFloat(editForm.amount),
        description: editForm.description || null,
        due_date:    editForm.due_date    || null,
      })
      setSuccess("✅ Fee record updated!")
      setEditingFee(null)
      if (viewStudent) fetchFees(viewStudent.id)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update fee record")
    } finally { setSaving(false) }
  }

  async function handleDeleteFee(feeId) {
    setDeleting(true); setError("")
    try {
      await deleteFeeRecordAPI(feeId)
      setSuccess("✅ Fee record deleted!")
      setDeleteConfirmId(null)
      setEditingFee(null)
      if (viewStudent) fetchFees(viewStudent.id)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete fee record")
    } finally { setDeleting(false) }
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
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header + mode tabs */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <h3 className="text-base font-semibold text-gray-700">🔍 View Student Fees</h3>
          <div className="flex border rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => { setViewMode("search"); setSelectedCourse(""); setCourseStudents([]) }}
              className={`px-4 py-1.5 font-medium transition ${viewMode === "search" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
              Search
            </button>
            <button
              onClick={() => { setViewMode("course"); setViewStudent(null); setFees([]); setSummary(null) }}
              className={`px-4 py-1.5 font-medium transition ${viewMode === "course" ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
              Browse by Course
            </button>
          </div>
        </div>

        <div className="p-5">
          {viewMode === "search" ? (
            /* ── Search mode ── */
            <StudentSearchBox
              selectedStudent={viewStudent}
              onSelect={handleSelectViewStudent}
              onClear={handleClearView}
            />
          ) : (
            /* ── Browse by course mode ── */
            <div className="space-y-3">
              {/* Course selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => { setSelectedCourse(e.target.value); setViewStudent(null); setFees([]); setSummary(null) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Choose a course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Student grid */}
              {courseLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Loading students…
                </div>
              ) : selectedCourse && courseStudents.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No students found in this course.</p>
              ) : courseStudents.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400">{courseStudents.length} student{courseStudents.length !== 1 ? "s" : ""} — click to view fees</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                    {courseStudents.map((s) => (
                      <button key={s.id}
                        onClick={() => handleSelectViewStudent(s)}
                        className={`text-left rounded-lg border px-3 py-2.5 transition hover:shadow-md hover:border-blue-400 hover:bg-blue-50
                          ${viewStudent?.id === s.id ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 bg-white"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-mono text-xs text-gray-400">{s.student_code || `#${s.id}`}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{s.name}</p>
                        {s.phone && <p className="text-xs text-gray-400 truncate mt-0.5">{s.phone}</p>}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
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
          {/* ── Edit Fee Modal ── */}
          {editingFee && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setEditingFee(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">Edit Fee Record</h3>
                  <button onClick={() => setEditingFee(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>
                <form onSubmit={handleUpdateFee} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (Rs.) *</label>
                    <input type="number" value={editForm.amount} min="0.01" step="0.01"
                      onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {editingFee.paid > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">Already paid: {formatCurrency(editingFee.paid)} — amount cannot go below this</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input type="text" value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Term 1 Fees"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                    <input type="date" value={editForm.due_date}
                      onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    {deleteConfirmId === editingFee.id ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => handleDeleteFee(editingFee.id)} disabled={deleting}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          {deleting ? "…" : "Confirm Delete"}
                        </button>
                        <button type="button" onClick={() => setDeleteConfirmId(null)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm transition">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirmId(editingFee.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition">
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

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
                  <th className="px-5 py-3"></th>
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
                                <input type="number" placeholder="Rs. Amount" value={pf.amount}
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
                        <td className="px-5 py-3">
                          <button onClick={() => openEditFee(f)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1 rounded text-xs font-medium transition">
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`hist-${f.id}`} className="bg-blue-50 border-t">
                          <td colSpan={9} className="px-2 py-2">
                            <p className="text-xs font-semibold text-gray-500 px-4 pb-1">Payment History</p>
                            <PaymentHistory key={historyKey} feeId={f.id} fee={f}
                              studentName={viewStudent?.name} studentCode={viewStudent?.student_code}
                              course={viewStudent?.course} parentPhone={viewStudent?.parent_phone} />
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
        {isAdmin ? <AdminFees /> : <StudentFees studentId={user?.student_id} studentName={user?.name} studentCode={user?.student_code} course={user?.course} parentPhone={user?.parent_phone} />}
      </main>
    </div>
  )
}
