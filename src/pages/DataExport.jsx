import { useState } from "react"
import Sidebar from "../components/Sidebar"
import * as XLSX from "xlsx"
import { exportStudentsAPI, exportFeesAPI, exportAttendanceAPI, exportPaymentsAPI } from "../api"

function ExportCard({ title, description, icon, color, onExport, loading }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl mb-2">{icon}</div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={onExport}
        disabled={loading}
        className={`mt-4 w-full py-2 rounded-lg text-sm font-medium text-white transition
          ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
      >
        {loading ? "⏳ Exporting..." : "⬇ Export Excel"}
      </button>
    </div>
  )
}

function downloadExcel(data, filename) {
  const ws = XLSX.utils.json_to_sheet(data)
  // Auto column widths
  const cols = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 12) }))
  ws["!cols"] = cols
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
  XLSX.writeFile(wb, filename)
}

export default function DataExport() {
  const [loading, setLoading] = useState({})

  function setLoad(key, val) { setLoading(prev => ({ ...prev, [key]: val })) }

  async function exportStudents() {
    setLoad("students", true)
    try {
      const res = await exportStudentsAPI()
      const data = res.data.students
      if (!data.length) { alert("No student data to export"); return }
      downloadExcel(data, `Students_Export_${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch { alert("Export failed") }
    finally { setLoad("students", false) }
  }

  async function exportFees() {
    setLoad("fees", true)
    try {
      const res = await exportFeesAPI()
      const data = res.data.fees
      if (!data.length) { alert("No fee data to export"); return }
      downloadExcel(data, `Fees_Export_${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch { alert("Export failed") }
    finally { setLoad("fees", false) }
  }

  async function exportAttendance() {
    setLoad("attendance", true)
    try {
      const res = await exportAttendanceAPI()
      const data = res.data.attendance
      if (!data.length) { alert("No attendance data to export"); return }
      downloadExcel(data, `Attendance_Export_${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch { alert("Export failed") }
    finally { setLoad("attendance", false) }
  }

  async function exportPayments() {
    setLoad("payments", true)
    try {
      const res = await exportPaymentsAPI()
      const data = res.data.payments
      if (!data.length) { alert("No payment data to export"); return }
      downloadExcel(data, `Payments_Export_${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch { alert("Export failed") }
    finally { setLoad("payments", false) }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Data Export</h2>
          <p className="text-gray-500 text-sm mt-1">Export your ERP data to Excel spreadsheets</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <ExportCard
            title="Students"
            description="All student records including contact details, course, and fees"
            icon="🎓"
            color="border-blue-500"
            onExport={exportStudents}
            loading={loading.students}
          />
          <ExportCard
            title="Fee Records"
            description="All fee records with paid/pending amounts and due dates"
            icon="💰"
            color="border-yellow-500"
            onExport={exportFees}
            loading={loading.fees}
          />
          <ExportCard
            title="Attendance"
            description="Last 10,000 attendance records with student details"
            icon="📋"
            color="border-green-500"
            onExport={exportAttendance}
            loading={loading.attendance}
          />
          <ExportCard
            title="Payment History"
            description="All fee payment transactions with modes and dates"
            icon="🧾"
            color="border-purple-500"
            onExport={exportPayments}
            loading={loading.payments}
          />
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            💡 <strong>Tip:</strong> Exported files open in Microsoft Excel or Google Sheets.
            Attendance export is limited to the last 10,000 records for performance.
          </p>
        </div>
      </main>
    </div>
  )
}
